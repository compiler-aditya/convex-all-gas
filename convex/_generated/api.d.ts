/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentmail from "../agentmail.js";
import type * as auth from "../auth.js";
import type * as bounds from "../bounds.js";
import type * as email from "../email.js";
import type * as emailEvents from "../emailEvents.js";
import type * as engine_propose from "../engine/propose.js";
import type * as engine_scoring from "../engine/scoring.js";
import type * as gatewayCheck from "../gatewayCheck.js";
import type * as grounding from "../grounding.js";
import type * as http from "../http.js";
import type * as inboxPool from "../inboxPool.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_mask from "../lib/mask.js";
import type * as lib_model from "../lib/model.js";
import type * as lib_svix from "../lib/svix.js";
import type * as negotiation from "../negotiation.js";
import type * as rooms from "../rooms.js";
import type * as seed from "../seed.js";
import type * as templates_index from "../templates/index.js";
import type * as templates_types from "../templates/types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentmail: typeof agentmail;
  auth: typeof auth;
  bounds: typeof bounds;
  email: typeof email;
  emailEvents: typeof emailEvents;
  "engine/propose": typeof engine_propose;
  "engine/scoring": typeof engine_scoring;
  gatewayCheck: typeof gatewayCheck;
  grounding: typeof grounding;
  http: typeof http;
  inboxPool: typeof inboxPool;
  "lib/access": typeof lib_access;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/mask": typeof lib_mask;
  "lib/model": typeof lib_model;
  "lib/svix": typeof lib_svix;
  negotiation: typeof negotiation;
  rooms: typeof rooms;
  seed: typeof seed;
  "templates/index": typeof templates_index;
  "templates/types": typeof templates_types;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
