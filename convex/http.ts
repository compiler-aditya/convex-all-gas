import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { verifySvixSignature } from "./lib/svix";

/**
 * App HTTP routes.
 *
 * `convex/convex.config.ts` sets `httpPrefix: "/api"`, so the static site owns
 * "/" and everything registered here is served under "/api". The AgentMail
 * webhook therefore lives at `/api/webhooks/agentmail` — a URL fixed on day one
 * so it never has to move once AgentMail is pointed at it.
 */
const http = httpRouter();

http.route({
  path: "/webhooks/agentmail",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[webhook] AGENTMAIL_WEBHOOK_SECRET is not set");
      return new Response("webhook not configured", { status: 500 });
    }

    // The raw body is the signed content; read it as text before parsing.
    const body = await request.text();

    const verification = await verifySvixSignature({
      secret,
      headers: {
        id: request.headers.get("svix-id"),
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      body,
      nowMs: Date.now(),
    });

    if (!verification.ok) {
      console.warn(`[webhook] rejected: ${verification.reason}`);
      return new Response("invalid signature", { status: 400 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("malformed json", { status: 400 });
    }
    if (typeof payload !== "object" || payload === null) {
      return new Response("malformed payload", { status: 400 });
    }

    const event = payload as Record<string, unknown>;
    const eventType = event.event_type;
    const eventId = event.event_id;
    if (typeof eventId !== "string") {
      return new Response("missing event_id", { status: 400 });
    }
    if (eventType !== "message.received") {
      // Acknowledge events we do not handle so AgentMail stops retrying them.
      console.log(`[webhook] ignoring event_type=${String(eventType)}`);
      return new Response(null, { status: 204 });
    }

    const message =
      typeof event.message === "object" && event.message !== null
        ? (event.message as Record<string, unknown>)
        : {};
    const messageId =
      typeof message.message_id === "string" ? message.message_id : undefined;
    const threadId =
      typeof message.thread_id === "string" ? message.thread_id : undefined;
    const inboxId =
      typeof message.inbox_id === "string" ? message.inbox_id : undefined;

    const { isDuplicate } = await ctx.runMutation(
      internal.emailEvents.recordInbound,
      { eventId, messageId, threadId },
    );

    if (isDuplicate) {
      console.log(`[webhook] duplicate delivery ignored: ${eventId}`);
      return new Response(null, { status: 204 });
    }

    // Spike scope: prove the signed round trip and land the event. Thread
    // routing to a room, body hydration, and the reply come in the email phase.
    console.log(
      `[webhook] accepted event=${eventId} inbox=${inboxId ?? "?"} thread=${threadId ?? "?"} message=${messageId ?? "?"}`,
    );

    return new Response(null, { status: 204 });
  }),
});

export default http;
