import type { Template } from "../templates";
import { chatCompletion } from "../lib/model";
import {
  slackByDimension,
  validateAgainstOwnBounds,
  type Bound,
  type Proposal,
  type Side,
} from "./scoring";

/**
 * Proposal generation.
 *
 * The model proposes; the server decides. Everything the model returns is
 * treated as a suggestion that must survive validation before it can become a
 * round, an email, or an agreement.
 *
 * The prompt is built from one side's private limits only. The counterparty's
 * bounds are never placed in the context, so a leaky rationale cannot reveal
 * something the model was never told.
 */

export type GroundingRef = {
  id: string;
  kind: string;
  title?: string;
  sourceUrl: string;
  snippet?: string;
};

export type PriorRound = {
  index: number;
  bySide: Side;
  proposal: Proposal;
  rationale: string;
};

export type GeneratedProposal = {
  proposal: Proposal;
  rationale: string;
  citedGroundingIds: string[];
  /** Set when the model's first attempt broke its own limits and was repaired. */
  repaired: boolean;
};

function describeDimensions(template: Template, side: Side): string {
  return template.dimensions
    .map((d) => {
      const direction =
        d.higherFavors === side ? "higher is better for you" : "lower is better for you";
      return `- ${d.key} (${d.label}${d.unit ? `, ${d.unit}` : ""}) — ${direction}`;
    })
    .join("\n");
}

function describeOwnBounds(template: Template, side: Side, bounds: Bound[]): string {
  if (bounds.length === 0) return "(you set no limits)";
  const byKey = new Map(bounds.map((b) => [b.dimensionKey, b]));
  return template.dimensions
    .map((d) => {
      const bound = byKey.get(d.key);
      if (bound === undefined) return null;
      const favoursMe = d.higherFavors === side;
      const limit = favoursMe ? bound.min : bound.max;
      if (limit === undefined) return null;
      const kind = favoursMe ? "never go below" : "never go above";
      const hard = bound.isHard ? " (HARD — cannot move)" : "";
      return `- ${d.key}: ${kind} ${limit}. Priority ${bound.weight}${hard}`;
    })
    .filter((line): line is string => line !== null)
    .join("\n");
}

function describeGrounding(grounding: GroundingRef[]): string {
  if (grounding.length === 0) return "(no evidence gathered)";
  return grounding
    .map(
      (g) =>
        `[${g.id}] (${g.kind}) ${g.title ?? g.sourceUrl}\n    ${(g.snippet ?? "").slice(0, 280)}`,
    )
    .join("\n");
}

function describeHistory(history: PriorRound[]): string {
  if (history.length === 0) return "(no offers yet — you are opening)";
  return history
    .map(
      (r) =>
        `Round ${r.index} by side ${r.bySide}: ${JSON.stringify(r.proposal)}\n    "${r.rationale}"`,
    )
    .join("\n");
}

/**
 * Where this side can afford to give, cheapest first.
 *
 * Computed from the standing offer rather than left to the model's judgement.
 * Without it the model concedes on every axis at once, which is caving, not
 * negotiating — observed on the first real run, where one side's utility fell
 * from 0.69 to 0.26 in a single round.
 */
function describeRoom(args: {
  template: Template;
  side: Side;
  ownBounds: Bound[];
  history: PriorRound[];
}): string {
  const mine = [...args.history].reverse().find((r) => r.bySide === args.side);
  if (mine === undefined) return "";

  const slack = slackByDimension({
    template: args.template,
    side: args.side,
    proposal: mine.proposal,
    ownBounds: args.ownBounds,
  });

  const canGive = slack
    .slice(0, 3)
    .map((s) => `- ${s.dimensionKey}: you have room, and it is low priority for you`)
    .join("\n");

  const mustHold = args.ownBounds
    .filter((b) => b.isHard || b.weight >= 0.8)
    .map((b) => `- ${b.dimensionKey}: hold this`)
    .join("\n");

  return [
    "",
    "WHERE TO GIVE (concede here first, in this order)",
    canGive.length > 0 ? canGive : "- nowhere cheap left; hold your position",
    "",
    "WHERE TO HOLD",
    mustHold.length > 0 ? mustHold : "- nothing is critical",
    "",
    "Do not concede on every dimension at once. Give on the cheap ones to buy",
    "the ones you are holding.",
  ].join("\n");
}

export function buildMessages(args: {
  template: Template;
  side: Side;
  ownBounds: Bound[];
  grounding: GroundingRef[];
  history: PriorRound[];
  interventions: string[];
  repairNote?: string;
}) {
  const roleLabel =
    args.side === "a" ? args.template.sideALabel : args.template.sideBLabel;
  const otherLabel =
    args.side === "a" ? args.template.sideBLabel : args.template.sideALabel;

  const system = [
    `You are negotiating on behalf of the ${roleLabel} against the ${otherLabel}.`,
    "",
    "RULES, in order of importance:",
    "1. Never state, hint at, or imply your own numeric limits. You may say a",
    "   constraint is fixed (\"the deadline cannot move\") but never what the",
    "   number behind it is. Revealing it loses your side the negotiation.",
    "2. Never propose terms that break your own limits.",
    "3. Trade across dimensions. Give ground where your priority is low to win",
    "   where it is high. A single-number argument is a bad negotiation.",
    "4. Cite evidence ids for any market claim you make.",
    "",
    "Reply with JSON only:",
    '{"proposal": {"<dimension>": <number>, ...}, "rationale": "<2 sentences to the other side>", "cite": ["<evidence id>"]}',
  ].join("\n");

  const user = [
    `NEGOTIATION: ${args.template.name}`,
    "",
    "DIMENSIONS",
    describeDimensions(args.template, args.side),
    "",
    "YOUR PRIVATE LIMITS (never reveal these numbers)",
    describeOwnBounds(args.template, args.side, args.ownBounds),
    "",
    "EVIDENCE",
    describeGrounding(args.grounding),
    "",
    "OFFERS SO FAR",
    describeHistory(args.history),
    describeRoom(args),
    "",
    args.interventions.length > 0
      ? `INSTRUCTIONS FROM YOUR PRINCIPAL (follow these)\n${args.interventions.map((i) => `- ${i}`).join("\n")}`
      : "",
    args.repairNote !== undefined
      ? `\nYOUR LAST ATTEMPT WAS REJECTED: ${args.repairNote}\nPropose again, within your limits.`
      : "",
    "",
    "Make your next offer.",
  ]
    .filter((block) => block.length > 0)
    .join("\n");

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

function parseReply(raw: string): {
  proposal: Proposal;
  rationale: string;
  cite: string[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Model reply was not JSON: ${raw.slice(0, 200)}`);
  }
  const record = (parsed ?? {}) as Record<string, unknown>;

  const proposalRaw = (record.proposal ?? {}) as Record<string, unknown>;
  const proposal: Proposal = {};
  for (const [key, value] of Object.entries(proposalRaw)) {
    if (typeof value === "number" && Number.isFinite(value)) proposal[key] = value;
  }

  const cite = Array.isArray(record.cite)
    ? record.cite.filter((c): c is string => typeof c === "string")
    : [];

  return {
    proposal,
    rationale:
      typeof record.rationale === "string" ? record.rationale.trim() : "",
    cite,
  };
}

/**
 * Reject a rationale that leaks one of the proposer's own limits.
 *
 * The prompt forbids it, but a prompt is not an enforcement mechanism.
 *
 * Two subtleties, both learned by watching it misfire on a real run:
 *
 * Naming a number you actually proposed is not a leak. Offering 120,000 and
 * writing "120,000" is just stating the offer. The leak is naming a value you
 * did *not* propose — your floor, say — so values present in the proposal are
 * excluded from the check.
 *
 * Small limits are indistinguishable from ordinary prose. A scope limit of 4
 * matches "4 screens", "24 days", and almost any sentence containing digits.
 * Substring matching on those suppressed two of three rationales in testing, so
 * only values of 1000 or more are checked, and only on a whole-number boundary.
 */
export function leaksOwnLimits(
  rationale: string,
  ownBounds: Bound[],
  proposal: Proposal = {},
): boolean {
  const proposed = new Set(Object.values(proposal));
  const normalised = rationale.replace(/,/g, "");

  for (const bound of ownBounds) {
    for (const limit of [bound.min, bound.max]) {
      if (limit === undefined) continue;
      // Stating a number you are actually offering is not a disclosure.
      if (proposed.has(limit)) continue;
      // Below this, the value carries no signal — it collides with ordinary counts.
      if (Math.abs(limit) < 1000) continue;
      if (new RegExp(`(?<!\\d)${limit}(?!\\d)`).test(normalised)) return true;
    }
  }
  return false;
}

/**
 * Clamp a proposal back inside the proposer's own limits.
 *
 * Last resort after a repair attempt fails. Better to send a valid offer the
 * model did not quite intend than to break the guarantee that no proposal ever
 * violates its own side's floor.
 */
function clampToOwnBounds(args: {
  template: Template;
  side: Side;
  proposal: Proposal;
  ownBounds: Bound[];
}): Proposal {
  const byKey = new Map(args.ownBounds.map((b) => [b.dimensionKey, b]));
  const clamped: Proposal = { ...args.proposal };

  for (const dimension of args.template.dimensions) {
    const value = clamped[dimension.key];
    const bound = byKey.get(dimension.key);
    if (typeof value !== "number" || bound === undefined) continue;

    const favoursMe = dimension.higherFavors === args.side;
    if (favoursMe && bound.min !== undefined && value < bound.min) {
      clamped[dimension.key] = bound.min;
    }
    if (!favoursMe && bound.max !== undefined && value > bound.max) {
      clamped[dimension.key] = bound.max;
    }
  }
  return clamped;
}

export async function generateProposal(args: {
  model: string;
  template: Template;
  side: Side;
  ownBounds: Bound[];
  grounding: GroundingRef[];
  history: PriorRound[];
  interventions: string[];
}): Promise<GeneratedProposal> {
  const validIds = new Set(args.grounding.map((g) => g.id));

  const attempt = async (repairNote?: string) => {
    const raw = await chatCompletion({
      model: args.model,
      messages: buildMessages({ ...args, repairNote }),
      jsonObject: true,
      temperature: 0.3,
      maxTokens: 3000,
      reasoningEffort: "low",
    });
    return parseReply(raw);
  };

  let reply = await attempt();
  let repaired = false;

  let violations = validateAgainstOwnBounds({
    template: args.template,
    side: args.side,
    proposal: reply.proposal,
    ownBounds: args.ownBounds,
  });

  if (violations.length > 0) {
    // One repair attempt, telling it what it broke without restating limits.
    repaired = true;
    reply = await attempt(violations.map((v) => v.reason).join("; "));
    violations = validateAgainstOwnBounds({
      template: args.template,
      side: args.side,
      proposal: reply.proposal,
      ownBounds: args.ownBounds,
    });
  }

  const proposal =
    violations.length > 0
      ? clampToOwnBounds({
          template: args.template,
          side: args.side,
          proposal: reply.proposal,
          ownBounds: args.ownBounds,
        })
      : reply.proposal;

  const rationale = leaksOwnLimits(reply.rationale, args.ownBounds, proposal)
    ? "Offer updated. (A draft message was withheld because it referenced a private limit.)"
    : reply.rationale;

  return {
    proposal,
    rationale,
    // Drop hallucinated citations so the UI never links to evidence that does
    // not exist in this room.
    citedGroundingIds: reply.cite.filter((id) => validIds.has(id)),
    repaired,
  };
}

export { slackByDimension };
