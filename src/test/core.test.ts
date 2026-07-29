import { describe, expect, it, beforeEach } from "vitest";
import { currency, date } from "../lib/format";
import { evaluateListing, filterListings } from "../lib/filter";
import { defaultCriteria } from "../lib/defaults";
import { demoListings } from "../data/demo-listings";
import { calculateMatchScore } from "../scoring/calculateMatchScore";
import { normalizePropertyType } from "../lib/propertyType";
import { DemoListingProvider, normalizeListing } from "../providers/providers";
import { storage, undoDecision } from "../storage/repository";
import { sortListings } from "../lib/sort";
describe("formatting", () => {
  it("formats US currency", () => expect(currency(425000)).toBe("$425,000"));
  it("handles bad dates", () => expect(date("bad")).toBe("Not listed"));
});
describe("filtering", () => {
  const eligibleListing = {
    ...demoListings[0],
    price: 400000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1600,
    propertyType: "Single-family" as const,
  };

  it("filters price above the maximum", () => {
    expect(
      evaluateListing({ ...eligibleListing, price: 600000 }, defaultCriteria)
        .eligible,
    ).toBe(false);
  });

  it("filters bedrooms below the minimum", () => {
    expect(
      evaluateListing({ ...eligibleListing, bedrooms: 2 }, defaultCriteria)
        .eligible,
    ).toBe(false);
  });

  it("filters bathrooms below the minimum", () => {
    expect(
      evaluateListing({ ...eligibleListing, bathrooms: 1 }, defaultCriteria)
        .eligible,
    ).toBe(false);
  });

  it("filters square footage below the minimum", () => {
    expect(
      evaluateListing({ ...eligibleListing, squareFeet: 1200 }, defaultCriteria)
        .eligible,
    ).toBe(false);
  });

  it("filters property types that are not allowed", () => {
    expect(
      evaluateListing(
        { ...eligibleListing, propertyType: "Condo" },
        defaultCriteria,
      ).eligible,
    ).toBe(false);
  });

  it("handles missing values when permitted", () => {
    expect(
      evaluateListing(
        { ...eligibleListing, bedrooms: undefined },
        defaultCriteria,
      ).eligible,
    ).toBe(true);
  });

  it("rejects missing when disabled", () => {
    expect(
      evaluateListing(
        { ...eligibleListing, bedrooms: undefined },
        { ...defaultCriteria, includeMissing: false },
      ).eligible,
    ).toBe(false);
  });

  it("returns only eligible", () => {
    const result = filterListings(
      [
        { ...eligibleListing, id: "over-budget", price: 999999 },
        eligibleListing,
      ],
      defaultCriteria,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(eligibleListing.id);
  });
});
describe("normalization", () => {
  it("normalizes provider home types", () =>
    expect(normalizePropertyType("Town Home")).toBe("Townhouse"));
  it("normalizes provider responses", () =>
    expect(
      normalizeListing({
        id: "x",
        price: 2,
        addressLine1: "A",
        propertyType: "Condo",
      })?.source,
    ).toBe("rentcast"));
  it("rejects malformed provider response", () =>
    expect(normalizeListing({ id: "x" })).toBeNull());
});
describe("scoring", () => {
  it("describes a property below the bedroom requirement accurately", () => {
    const score = calculateMatchScore(
      { ...demoListings[0], bedrooms: 2 },
      defaultCriteria,
    );

    expect(
      score.compromises.find((reason) => reason.criterion === "Bedrooms")?.text,
    ).toBe("Below your 3-bedroom requirement");
    expect(score.positiveReasons).not.toContainEqual(
      expect.objectContaining({
        criterion: "Bedrooms",
        text: "Meets your 3-bedroom requirement",
      }),
    );
  });

  it("describes a property meeting the bedroom requirement accurately", () => {
    const score = calculateMatchScore(
      { ...demoListings[0], bedrooms: 3 },
      defaultCriteria,
    );

    expect(
      score.positiveReasons.find((reason) => reason.criterion === "Bedrooms")
        ?.text,
    ).toBe("Meets your 3-bedroom requirement");
  });

  it("reports missing bedroom information as unavailable", () => {
    const score = calculateMatchScore(
      { ...demoListings[0], bedrooms: undefined },
      defaultCriteria,
    );

    expect(score.unavailableCriteria).toContainEqual({
      criterion: "Bedrooms",
      text: "Bedrooms information is unavailable and was not scored",
    });
    expect(score.positiveReasons).not.toContainEqual(
      expect.objectContaining({ criterion: "Bedrooms" }),
    );
    expect(score.compromises).not.toContainEqual(
      expect.objectContaining({ criterion: "Bedrooms" }),
    );
  });

  it("uses equivalent wording and missing handling for bathrooms", () => {
    const below = calculateMatchScore(
      { ...demoListings[0], bathrooms: 1 },
      defaultCriteria,
    );
    const meets = calculateMatchScore(
      { ...demoListings[0], bathrooms: 2 },
      defaultCriteria,
    );
    const missing = calculateMatchScore(
      { ...demoListings[0], bathrooms: undefined },
      defaultCriteria,
    );

    expect(
      below.compromises.find((reason) => reason.criterion === "Bathrooms")
        ?.text,
    ).toBe("Below your 2-bathroom requirement");
    expect(
      meets.positiveReasons.find((reason) => reason.criterion === "Bathrooms")
        ?.text,
    ).toBe("Meets your 2-bathroom requirement");
    expect(missing.unavailableCriteria).toContainEqual({
      criterion: "Bathrooms",
      text: "Bathrooms information is unavailable and was not scored",
    });
  });

  it("keeps boundaries", () => {
    const s = calculateMatchScore(demoListings[0], defaultCriteria);
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
  });
  it("gives ideal budget full budget points", () =>
    expect(
      calculateMatchScore(
        { ...demoListings[0], price: 400000 },
        defaultCriteria,
      ).breakdown[0].earned,
    ).toBe(30));
  it("scores square footage smoothly", () => {
    const s = calculateMatchScore(
      { ...demoListings[0], squareFeet: 1500 },
      defaultCriteria,
    );
    expect(
      s.breakdown.find((x) => x.name === "Square footage")?.earned,
    ).toBeLessThan(15);
  });
  it("does not score missing HOA", () =>
    expect(
      calculateMatchScore(
        { ...demoListings[0], hoaFeeMonthly: undefined },
        defaultCriteria,
      ).unavailableCriteria.some((x) => x.criterion === "HOA"),
    ).toBe(true));
  it("normalizes when fields missing", () =>
    expect(
      calculateMatchScore(
        { ...demoListings[0], hoaFeeMonthly: undefined, yearBuilt: undefined },
        defaultCriteria,
      ).total,
    ).toBeGreaterThan(0));
  it("generates explanations and labels", () => {
    const s = calculateMatchScore(demoListings[1], defaultCriteria);
    expect(s.positiveReasons.length).toBeGreaterThan(0);
    expect(s.label).toMatch(/match/);
  });
});
describe("providers, storage, decisions and sorting", () => {
  beforeEach(() => localStorage.clear());
  it("demo provider returns 24+", async () =>
    expect(
      (await new DemoListingProvider().searchListings(defaultCriteria)).listings
        .length,
    ).toBeGreaterThanOrEqual(24));
  it("recovers corrupted storage", () => {
    localStorage.setItem("nestmatch:v1:criteria", "bad");
    expect(storage.getCriteria()).toBeNull();
  });
  it("undoes latest decision", () =>
    expect(
      undoDecision([
        { listingId: "a", kind: "love", savedAt: "" },
        { listingId: "b", kind: "pass", savedAt: "" },
      ]),
    ).toHaveLength(1));
  it("sorts by low price", () =>
    expect(
      sortListings(
        [demoListings[2], demoListings[0]],
        "price-low",
        new Map(),
        [],
      )[0].price,
    ).toBeLessThanOrEqual(
      sortListings(
        [demoListings[2], demoListings[0]],
        "price-low",
        new Map(),
        [],
      )[1].price,
    ));
});
