import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { verifySvixSignature } from "./lib/svix";

/**
 * App HTTP routes.
 *
 * These are registered at their exact paths and take precedence over the static
 * catch-all added at the bottom of this file. The AgentMail webhook keeps the
 * `/api/webhooks/agentmail` URL it was registered with on day one, so pointing
 * AgentMail at it was a one-time act.
 */
const http = httpRouter();

http.route({
  path: "/api/webhooks/agentmail",
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

/**
 * Auth's JWKS and OpenID discovery documents, plus OAuth callbacks.
 *
 * Registered before the static catch-all so `/.well-known/*` resolves to real
 * documents rather than the SPA shell.
 */
auth.addHttpRoutes(http);

/**
 * Serve the built SPA for everything not claimed above.
 *
 * Must come last: exact routes win, so auth's `/.well-known/*` documents and the
 * webhook are matched before this catch-all ever sees the request.
 */
registerStaticRoutes(http, components.staticHosting, { spaFallback: true });

export default http;
