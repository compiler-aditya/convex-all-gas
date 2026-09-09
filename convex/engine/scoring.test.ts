import { describe, expect, test } from "vitest";
import { requireTemplate } from "../templates";
import {
  findBlockingDimension,
  satisfaction,
  slackByDimension,
  utilityFor,
  validateAgainstOwnBounds,
  zoneFor,
  type Bound,
} from "./scoring";

const template = requireTemplate("freelance");
const rate = template.dimensions.find((d) => d.key === "rate")!;

/** Maya: freelancer, side a. Won't go below ₹1,10,000. */
const mayaBounds: Bound[] = [
  { dimensionKey: "rate", min: 110000, weight: 1, isHard: true },
  { dimensionKey: "deliveryDays", min: 28, weight: 0.5, isHard: false },
  { dimensionKey: "upfrontPercent", min: 40, weight: 0.3, isHard: false },
];

/** Devin: client, side b. Ceiling ₹1,45,000 — which he posted as ₹80,000. */
const devinBounds: Bound[] = [
  { dimensionKey: "rate", max: 145000, weight: 1, isHard: true },
  { dimensionKey: "deliveryDays", max: 42, weight: 0.8, isHard: true },
  { dimensionKey: "upfrontPercent", max: 50, weight: 0.2, isHard: false },
];

describe("the zone of possible agreement", () => {
  test("finds the deal that a human conversation would have missed", () => {
    // The whole premise: his real ceiling sits above her floor, but neither
    // would ever say so, so the deal dies in a normal email thread.
    const zone = zoneFor(rate, mayaBounds[0], devinBounds[0]);
    expect(zone).toEqual({ floor: 110000, ceiling: 145000 });
    expect(zone!.floor).toBeLessThanOrEqual(zone!.ceiling);
  });

  test("reports no deal when the ranges genuinely do not meet", () => {
    const greedy: Bound[] = [
      { dimensionKey: "rate", min: 200000, weight: 1, isHard: true },
    ];
    const blocking = findBlockingDimension(template, greedy, devinBounds);
    expect(blocking).not.toBeNull();
    expect(blocking!.dimensionKey).toBe("rate");
  });

  test("no-deal names the dimension and never the numbers", () => {
    const greedy: Bound[] = [
      { dimensionKey: "rate", min: 200000, weight: 1, isHard: true },
    ];
    const blocking = findBlockingDimension(template, greedy, devinBounds)!;
    const serialized = JSON.stringify(blocking);
    expect(serialized).not.toContain("200000");
    expect(serialized).not.toContain("145000");
  });

  test("an unbounded dimension is not a conflict", () => {
    // Maya cares about rate; Devin never mentioned scope. That is freedom, not
    // deadlock, and must not be reported as a blocking dimension.
    const onlyRate: Bound[] = [
      { dimensionKey: "rate", min: 110000, weight: 1, isHard: true },
    ];
    const onlyScope: Bound[] = [
      { dimensionKey: "rate", max: 145000, weight: 1, isHard: true },
    ];
    expect(findBlockingDimension(template, onlyRate, onlyScope)).toBeNull();
  });
});

describe("satisfaction is symmetric between the sides", () => {
  const zone = { floor: 110000, ceiling: 145000 };

  test("the floor delights the buyer and disappoints the seller", () => {
    expect(satisfaction(rate, "a", 110000, zone)).toBe(0);
    expect(satisfaction(rate, "b", 110000, zone)).toBe(1);
  });

  test("the ceiling flips it", () => {
    expect(satisfaction(rate, "a", 145000, zone)).toBe(1);
    expect(satisfaction(rate, "b", 145000, zone)).toBe(0);
  });

  test("the midpoint splits it evenly", () => {
    expect(satisfaction(rate, "a", 127500, zone)).toBeCloseTo(0.5);
    expect(satisfaction(rate, "b", 127500, zone)).toBeCloseTo(0.5);
  });

  test("both sides always sum to one across the zone", () => {
    for (const value of [110000, 120000, 126000, 145000]) {
      const total =
        satisfaction(rate, "a", value, zone) +
        satisfaction(rate, "b", value, zone);
      expect(total).toBeCloseTo(1);
    }
  });
});

describe("utility respects what each side said it cares about", () => {
  test("a better rate raises the freelancer's utility", () => {
    const low = utilityFor({
      template,
      side: "a",
      proposal: { rate: 115000 },
      boundsA: mayaBounds,
      boundsB: devinBounds,
    });
    const high = utilityFor({
      template,
      side: "a",
      proposal: { rate: 140000 },
      boundsA: mayaBounds,
      boundsB: devinBounds,
    });
    expect(high).toBeGreaterThan(low);
  });

  test("the same proposal moves the two sides in opposite directions", () => {
    const proposal = { rate: 140000 };
    const forA = utilityFor({ template, side: "a", proposal, boundsA: mayaBounds, boundsB: devinBounds });
    const forB = utilityFor({ template, side: "b", proposal, boundsA: mayaBounds, boundsB: devinBounds });
    expect(forA).toBeGreaterThan(forB);
  });

  test("dimensions a side gave no weight do not count", () => {
    const indifferent: Bound[] = [
      { dimensionKey: "rate", min: 110000, weight: 1, isHard: true },
      { dimensionKey: "revisions", max: 5, weight: 0, isHard: false },
    ];
    const withRevisions = utilityFor({
      template, side: "a",
      proposal: { rate: 130000, revisions: 5 },
      boundsA: indifferent, boundsB: devinBounds,
    });
    const withoutRevisions = utilityFor({
      template, side: "a",
      proposal: { rate: 130000 },
      boundsA: indifferent, boundsB: devinBounds,
    });
    expect(withRevisions).toBeCloseTo(withoutRevisions);
  });
});

describe("the validation guard", () => {
  test("catches a proposal below the proposer's own floor", () => {
    // The exact failure mode: the model hallucinates past Maya's floor.
    const violations = validateAgainstOwnBounds({
      template,
      side: "a",
      proposal: { rate: 90000 },
      ownBounds: mayaBounds,
    });
    expect(violations).toHaveLength(1);
    expect(violations[0].dimensionKey).toBe("rate");
  });

  test("catches a proposal above the proposer's own ceiling", () => {
    const violations = validateAgainstOwnBounds({
      template,
      side: "b",
      proposal: { rate: 999999 },
      ownBounds: devinBounds,
    });
    expect(violations).toHaveLength(1);
  });

  test("allows proposing something better for yourself", () => {
    // Asking high is negotiating; asking below your own floor is a bug.
    expect(
      validateAgainstOwnBounds({
        template, side: "a",
        proposal: { rate: 500000 },
        ownBounds: mayaBounds,
      }),
    ).toHaveLength(0);
  });

  test("ignores dimensions the proposer never bounded", () => {
    expect(
      validateAgainstOwnBounds({
        template, side: "a",
        proposal: { revisions: 99 },
        ownBounds: mayaBounds,
      }),
    ).toHaveLength(0);
  });
});

describe("multi-axis trading", () => {
  test("offers the cheapest concession first", () => {
    // Maya is at 140k rate (weight 1) and 45% upfront (weight 0.3). She should
    // give on upfront before she gives on rate — the move a human never makes.
    const slack = slackByDimension({
      template,
      side: "a",
      proposal: { rate: 140000, upfrontPercent: 45, deliveryDays: 35 },
      ownBounds: mayaBounds,
    });
    expect(slack.length).toBeGreaterThan(0);
    expect(slack[0].dimensionKey).toBe("upfrontPercent");
  });

  test("never offers to concede on a hard limit", () => {
    const slack = slackByDimension({
      template,
      side: "b",
      proposal: { deliveryDays: 30, upfrontPercent: 45 },
      ownBounds: devinBounds,
    });
    // deliveryDays is Devin's hard deadline; it must not appear as tradeable.
    expect(slack.map((s) => s.dimensionKey)).not.toContain("deliveryDays");
  });

  test("reports no room when already at the limit", () => {
    const slack = slackByDimension({
      template,
      side: "a",
      proposal: { rate: 110000 },
      ownBounds: [{ dimensionKey: "rate", min: 110000, weight: 1, isHard: false }],
    });
    expect(slack).toHaveLength(0);
  });
});
