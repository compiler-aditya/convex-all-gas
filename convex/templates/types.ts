/**
 * The dimension model.
 *
 * A negotiation is not "a freelance contract" — it is a set of typed dimensions
 * with private per-side bounds. Freelance is one template over that engine;
 * sublets, used goods and group trips are others. Keeping this domain-agnostic
 * is what stops the engine from being rewritten per vertical.
 */

export type DimensionType = "money" | "count" | "percent" | "days" | "enum";

export type Dimension = {
  key: string;
  label: string;
  type: DimensionType;
  /**
   * Which side benefits from a *higher* value.
   *
   * Rate: higher favours the freelancer. Revisions: higher favours the client.
   * Encoding it per-dimension rather than per-side is what lets one scoring
   * function serve both sides without special-casing either.
   */
  higherFavors: "a" | "b";
  unit?: string;
  options?: string[];
  /** Shown next to the bounds input so people know what they are committing to. */
  help?: string;
};

export type Template = {
  id: string;
  name: string;
  summary: string;
  /** Role names, used in the UI and in the emails the agents write. */
  sideALabel: string;
  sideBLabel: string;
  dimensions: Dimension[];
};

export function getDimension(
  template: Template,
  key: string,
): Dimension | undefined {
  return template.dimensions.find((d) => d.key === key);
}
