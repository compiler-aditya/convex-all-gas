import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { maskInbox } from "./lib/mask";

/**
 * AgentMail provisioning.
 *
 * Uses plain `fetch` against the REST API rather than the `agentmail` SDK so
 * everything stays on the default Convex runtime. Both create calls take a
 * `client_id`, which AgentMail treats as an idempotency key — re-running these
 * is safe and returns the existing resource instead of duplicating it.
 */

const API_BASE = "https://api.agentmail.to/v0";

async function agentMailFetch(
  path: string,
  init: { method: string; body?: unknown },
): Promise<unknown> {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("AGENTMAIL_API_KEY is not set on this deployment");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await response.text();
  if (!response.ok) {
    // Surface status and body, but never echo the Authorization header.
    throw new Error(
      `AgentMail ${init.method} ${path} failed: ${response.status} ${text.slice(0, 500)}`,
    );
  }
  return text.length > 0 ? (JSON.parse(text) as unknown) : null;
}

function readString(source: unknown, ...keys: string[]): string | undefined {
  if (typeof source !== "object" || source === null) return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Probe what the configured credential is actually allowed to do.
 *
 * Reports HTTP status per endpoint so a scope problem can be told apart from a
 * bad key or an org-state problem. Never returns the key or any message content.
 */
export const diagnose = internalAction({
  args: {},
  returns: v.array(
    v.object({
      probe: v.string(),
      status: v.number(),
      detail: v.string(),
    }),
  ),
  handler: async () => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not set");

    const probes: Array<{ probe: string; method: string; path: string }> = [
      { probe: "list inboxes", method: "GET", path: "/inboxes" },
      { probe: "list webhooks", method: "GET", path: "/webhooks" },
    ];

    const results: Array<{ probe: string; status: number; detail: string }> = [];
    for (const p of probes) {
      try {
        const response = await fetch(`${API_BASE}${p.path}`, {
          method: p.method,
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const text = await response.text();
        let detail: string;
        if (response.ok) {
          // Summarise shape only — never echo addresses or message bodies.
          const parsed: unknown = text.length > 0 ? JSON.parse(text) : null;
          const list =
            Array.isArray(parsed)
              ? parsed
              : typeof parsed === "object" && parsed !== null
                ? ((parsed as Record<string, unknown>).inboxes ??
                   (parsed as Record<string, unknown>).webhooks ??
                   (parsed as Record<string, unknown>).data)
                : null;
          detail = Array.isArray(list) ? `${list.length} item(s)` : "ok";
        } else {
          const code =
            /"code"\s*:\s*"([^"]+)"/.exec(text)?.[1] ?? "unknown_error";
          detail = code;
        }
        results.push({ probe: p.probe, status: response.status, detail });
      } catch (error) {
        results.push({
          probe: p.probe,
          status: 0,
          detail: error instanceof Error ? error.message.slice(0, 120) : "failed",
        });
      }
    }
    return results;
  },
});

/**
 * List registered webhooks with their id, url and scope.
 *
 * Ids and urls are ours, not secrets. Deliberately never reads or returns the
 * signing secret.
 */
export const listWebhooks = internalAction({
  args: {},
  returns: v.array(
    v.object({
      webhookId: v.string(),
      url: v.string(),
      eventTypes: v.string(),
      scope: v.string(),
    }),
  ),
  handler: async () => {
    const result = await agentMailFetch("/webhooks", { method: "GET" });
    const container = result as Record<string, unknown> | null;
    const rawList = Array.isArray(result)
      ? result
      : container === null
        ? []
        : ((container.webhooks ?? container.data ?? []) as unknown);
    const list = Array.isArray(rawList) ? rawList : [];

    return list.map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      const events = record.event_types ?? record.eventTypes;
      const inboxIds = record.inbox_ids ?? record.inboxIds;
      const podIds = record.pod_ids ?? record.podIds;
      const scope = Array.isArray(inboxIds) && inboxIds.length > 0
        ? `inbox-scoped (${inboxIds.length})`
        : Array.isArray(podIds) && podIds.length > 0
          ? `pod-scoped (${podIds.length})`
          : "organization-wide";
      return {
        webhookId: readString(record, "webhook_id", "webhookId", "id") ?? "?",
        url: readString(record, "url") ?? "?",
        eventTypes: Array.isArray(events) ? events.join(",") : "?",
        scope,
      };
    });
  },
});

/**
 * Adopt inboxes that already exist on the account into the pool.
 *
 * Needed when the credential can read inboxes but not create them. Stores the
 * full address in the pool table and returns only masked forms, so a real
 * address never lands in a transcript or a log line.
 */
export const adoptExistingInboxes = internalAction({
  args: { limit: v.number() },
  returns: v.object({
    adopted: v.array(v.object({ masked: v.string(), created: v.boolean() })),
  }),
  handler: async (ctx, args) => {
    const result = await agentMailFetch("/inboxes", { method: "GET" });

    const container = result as Record<string, unknown> | null;
    const rawList = Array.isArray(result)
      ? result
      : container === null
        ? []
        : ((container.inboxes ?? container.data ?? []) as unknown);
    const list = Array.isArray(rawList) ? rawList : [];

    const adopted: Array<{ masked: string; created: boolean }> = [];
    for (const entry of list.slice(0, args.limit)) {
      const inboxId = readString(entry, "inbox_id", "inboxId", "address");
      if (!inboxId) continue;
      const { created } = await ctx.runMutation(
        internal.inboxPool.upsertPoolInbox,
        { inboxId, label: `pool-${adopted.length + 1}` },
      );
      adopted.push({ masked: maskInbox(inboxId), created });
      console.log(`[agentmail] adopted inbox ${maskInbox(inboxId)}`);
    }
    return { adopted };
  },
});

/**
 * Send a message from one of the pool inboxes.
 *
 * `idempotencyKey` maps to AgentMail's `Idempotency-Key` header so a retried
 * send cannot produce a duplicate email. Returns ids only — never the body.
 */
export const sendMessage = internalAction({
  args: {
    fromInboxId: v.string(),
    to: v.array(v.string()),
    subject: v.string(),
    text: v.string(),
    idempotencyKey: v.optional(v.string()),
  },
  returns: v.object({
    messageId: v.string(),
    threadId: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not set");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (args.idempotencyKey !== undefined) {
      headers["Idempotency-Key"] = args.idempotencyKey;
    }

    const response = await fetch(
      `${API_BASE}/inboxes/${encodeURIComponent(args.fromInboxId)}/messages/send`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: args.to,
          subject: args.subject,
          text: args.text,
        }),
      },
    );

    const body = await response.text();
    if (!response.ok) {
      throw new Error(
        `AgentMail send failed: ${response.status} ${body.slice(0, 400)}`,
      );
    }
    const parsed: unknown = body.length > 0 ? JSON.parse(body) : null;
    const messageId = readString(parsed, "message_id", "messageId");
    if (!messageId) throw new Error("AgentMail returned no message_id");

    console.log(
      `[agentmail] sent from ${maskInbox(args.fromInboxId)} message=${messageId}`,
    );
    return {
      messageId,
      threadId: readString(parsed, "thread_id", "threadId"),
    };
  },
});

/**
 * Remove a webhook endpoint.
 *
 * Needed when replacing a narrowly-scoped endpoint with a wider one: leaving
 * both registered delivers each message twice under different `event_id`s,
 * which the idempotency gate keys on and therefore would not catch.
 */
export const deleteWebhook = internalAction({
  args: { webhookId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await agentMailFetch(`/webhooks/${args.webhookId}`, { method: "DELETE" });
    console.log(`[agentmail] deleted webhook ${args.webhookId}`);
    return null;
  },
});

/** Create (or re-fetch) one agent inbox for the shared pool. */
export const provisionInbox = internalAction({
  args: {
    username: v.string(),
    clientId: v.string(),
  },
  returns: v.object({ inboxId: v.string() }),
  handler: async (_ctx, args) => {
    const result = await agentMailFetch("/inboxes", {
      method: "POST",
      body: { username: args.username, client_id: args.clientId },
    });

    const inboxId = readString(result, "inbox_id", "inboxId");
    if (!inboxId) {
      throw new Error("AgentMail returned no inbox_id");
    }
    console.log(`[agentmail] inbox ready: ${inboxId}`);
    return { inboxId };
  },
});

/**
 * Point a `message.received` webhook at this deployment.
 *
 * Deliberately does NOT return or log the signing secret. AgentMail returns it
 * once on create; copy it from the AgentMail dashboard and set it with
 * `npx convex env set AGENTMAIL_WEBHOOK_SECRET whsec_...` so the value never
 * transits a transcript or a log line.
 */
export const registerWebhook = internalAction({
  args: {
    url: v.string(),
    clientId: v.string(),
    inboxIds: v.optional(v.array(v.string())),
  },
  returns: v.object({
    webhookId: v.string(),
    secretReturned: v.boolean(),
    secretPrefix: v.string(),
  }),
  handler: async (_ctx, args) => {
    const body: Record<string, unknown> = {
      url: args.url,
      event_types: ["message.received"],
      client_id: args.clientId,
    };
    if (args.inboxIds !== undefined) body.inbox_ids = args.inboxIds;

    const result = await agentMailFetch("/webhooks", {
      method: "POST",
      body,
    });

    const webhookId = readString(result, "webhook_id", "webhookId");
    if (!webhookId) {
      throw new Error("AgentMail returned no webhook_id");
    }
    const secret = readString(result, "secret");

    console.log(
      `[agentmail] webhook ${webhookId} -> ${args.url} (secret ${secret ? "returned" : "NOT returned"})`,
    );
    return {
      webhookId,
      secretReturned: secret !== undefined,
      // First 6 chars only ("whsec_"), enough to confirm shape, useless as a key.
      secretPrefix: secret ? secret.slice(0, 6) : "",
    };
  },
});
