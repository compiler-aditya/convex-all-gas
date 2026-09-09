import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { activeProviderName, listModels } from "./lib/model";

/** Which provider is live and what it serves. Verification, not app code. */
export const models = internalAction({
  args: { filter: v.optional(v.string()) },
  returns: v.object({ provider: v.string(), models: v.array(v.string()) }),
  handler: async (_ctx, args) => {
    const provider = await activeProviderName();
    const all = await listModels();
    const needle = args.filter?.toLowerCase();
    return {
      provider,
      models:
        needle === undefined
          ? all
          : all.filter((m) => m.toLowerCase().includes(needle)),
    };
  },
});
