import staticHosting from "@convex-dev/static-hosting/convex.config";
import { defineApp } from "convex/server";

/**
 * App-owned root routing.
 *
 * The component's HTTP routes stay unmounted; `convex/http.ts` registers the
 * static catch-all itself. This is deliberate: Convex Auth serves its discovery
 * documents at `/.well-known/openid-configuration` and `/.well-known/jwks.json`,
 * and Convex fetches those from the site root. Under component-owned routing the
 * static site owns "/", and since those paths carry no file extension the SPA
 * fallback would answer them with `index.html` and a 200 — auth would fail while
 * looking healthy.
 *
 * Exact routes win over the catch-all, so auth's paths and the AgentMail webhook
 * keep working while everything else still serves the SPA.
 */
const app = defineApp();
app.use(staticHosting);

export default app;
