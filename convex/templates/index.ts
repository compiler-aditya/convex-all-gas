import type { Template } from "./types";

/**
 * Freelance contract — the shipped template.
 *
 * Five dimensions on purpose. A single-axis haggle is arithmetic a human does
 * fine on their own; the agents earn their keep by trading *across* axes, which
 * only exists when there is more than one. "Take less money and I'll give you a
 * longer deadline and a bigger deposit" is the move a human never makes because
 * they are fixated on the number.
 */
const freelance: Template = {
  id: "freelance",
  name: "Freelance contract",
  summary:
    "Rate, timeline, scope and payment terms between a freelancer and a client.",
  sideALabel: "Freelancer",
  sideBLabel: "Client",
  dimensions: [
    {
      key: "rate",
      label: "Total fee",
      type: "money",
      higherFavors: "a",
      unit: "₹",
      help: "The whole project fee, not an hourly rate.",
      askMin: "What is the least you would take?",
      askMax: "What is the most you would pay?",
    },
    {
      key: "deliveryDays",
      label: "Delivery window",
      type: "days",
      higherFavors: "a",
      unit: "days",
      help: "Calendar days from start to final delivery.",
      askMin: "What is the least time you need?",
      askMax: "What is the longest you would wait?",
    },
    {
      key: "scopeUnits",
      label: "Scope",
      type: "count",
      higherFavors: "b",
      unit: "screens",
      help: "How much gets built. Dropping scope is often what unblocks a deal.",
      askMin: "What is the least you would accept?",
      askMax: "What is the most you would build?",
    },
    {
      key: "revisions",
      label: "Revision rounds",
      type: "count",
      higherFavors: "b",
      unit: "rounds",
      help: "Included rounds of changes after delivery.",
      askMin: "What is the fewest rounds you would accept?",
      askMax: "What is the most rounds you would include?",
    },
    {
      key: "upfrontPercent",
      label: "Paid upfront",
      type: "percent",
      higherFavors: "a",
      unit: "%",
      help: "Share of the fee paid before work starts.",
      askMin: "What is the least you would take upfront?",
      askMax: "What is the most you would pay upfront?",
    },
  ],
};

export const TEMPLATES: Record<string, Template> = {
  [freelance.id]: freelance,
};

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES[id];
}

export function requireTemplate(id: string): Template {
  const template = getTemplate(id);
  if (template === undefined) {
    throw new Error(`Unknown template: ${id}`);
  }
  return template;
}

export { getDimension } from "./types";
export type { Dimension, Template } from "./types";
