import { describe, expect, it } from "vitest";
import {
  buildRentCastQuery,
  buildSavedCriteria,
  normalizeRentCast,
  normalizeRentCastCriteria,
  normalizeRentCastPayload,
  toRentCastMinimumRange,
  toRentCastPriceRange,
} from "../../supabase/functions/search-listings/rentcast";

const location = { type: "city", city: "Cincinnati", state: "OH" } as const;

describe("RentCast query adapter", () => {
  it.each([
    [150000, 500000, "150000:500000"],
    [150000, undefined, "150000:*"],
    [undefined, 500000, "*:500000"],
    [undefined, undefined, undefined],
  ])("builds the supported price range", (minimum, maximum, expected) => {
    expect(toRentCastPriceRange(minimum, maximum)).toBe(expected);
    const query = buildRentCastQuery(location, { minPrice: minimum, maxPrice: maximum }, 25);
    expect(query.get("price") ?? undefined).toBe(expected);
    expect(query.has("minPrice")).toBe(false);
    expect(query.has("maxPrice")).toBe(false);
  });

  it("uses open-ended minimum bedroom and bathroom ranges", () => {
    expect(toRentCastMinimumRange(3)).toBe("3:*");
    const query = buildRentCastQuery(location, { minBedrooms: 3, minBathrooms: 2 }, 25);
    expect(query.get("bedrooms")).toBe("3:*");
    expect(query.get("bathrooms")).toBe("2:*");
  });

  it("maps supported property types and separates multiple values with pipes", () => {
    const query = buildRentCastQuery(location, {
      propertyTypes: ["Single-family", "Multi-family", "Unsupported"],
    }, 25);
    expect(query.get("propertyType")).toBe("Single Family|Multi-Family");
  });

  it.each([
    ["minPrice", { minPrice: 0 }],
    ["minBedrooms", { minBedrooms: 0 }],
    ["minBathrooms", { minBathrooms: 0 }],
  ] as const)("treats a zero %s as absent", (key, criteria) => {
    expect(normalizeRentCastCriteria(criteria)[key]).toBeUndefined();
  });

  it("creates a broad ZIP query with no optional provider filters", () => {
    const query = buildRentCastQuery(
      { type: "zip", zipCode: "41042" },
      { minPrice: 0, maxPrice: 0, minBedrooms: 0, minBathrooms: 0, propertyTypes: [] },
      25,
    );
    expect([...query.entries()]).toEqual([
      ["status", "Active"],
      ["limit", "25"],
      ["zipCode", "41042"],
    ]);
  });

  it("replaces every saved provider filter and preserves unrelated preferences", () => {
    const saved = {
      minPrice: 400000,
      maxPrice: 700000,
      minBedrooms: 3,
      minBathrooms: 2,
      propertyTypes: ["Single-family"],
      preferredTypes: ["Townhouse"],
      includeMissing: true,
      mode: "zip",
      zipCode: "41011",
    };
    const updated = buildSavedCriteria(
      saved,
      { minBathrooms: 0, propertyTypes: [] },
      { type: "zip", zipCode: "41042" },
    );

    expect(updated).toMatchObject({
      mode: "zip",
      zipCode: "41042",
      city: "",
      state: "",
      propertyTypes: [],
      preferredTypes: ["Townhouse"],
      includeMissing: true,
    });
    for (const key of ["minPrice", "maxPrice", "minBedrooms", "minBathrooms"]) {
      expect(updated).not.toHaveProperty(key);
    }
    expect(JSON.parse(JSON.stringify(updated))).toEqual(updated);
  });
});

describe("RentCast response adapter", () => {
  const fetchedAt = "2026-07-31T12:00:00.000Z";

  it("retains a valid listing and restores NestMatch property type names", () => {
    const listing = normalizeRentCast({
      id: "provider-1",
      formattedAddress: "1 Main Street, Cincinnati, OH 45202",
      price: 350000,
      propertyType: "Single Family",
    }, fetchedAt);
    expect(listing).toMatchObject({
      id: "rentcast:provider-1",
      formattedAddress: "1 Main Street, Cincinnati, OH 45202",
      price: 350000,
      propertyType: "Single-family",
    });
    expect(normalizeRentCast({ id: "2", formattedAddress: "2 Main", price: 400000, propertyType: "Multi-Family" }, fetchedAt)?.propertyType).toBe("Multi-family");
    expect(normalizeRentCast({ id: "3", formattedAddress: "3 Main", price: 400000, propertyType: "Land" }, fetchedAt)?.propertyType).toBe("Other");
  });

  it("diagnoses provider records when every record fails normalization", () => {
    const result = normalizeRentCastPayload([{ id: "missing-required-fields" }], fetchedAt, 50);
    expect(result).toMatchObject({
      providerCount: 1,
      listings: [],
      status: 502,
      error: "Listing provider records could not be processed",
    });
  });

  it("keeps a genuine empty provider result successful", () => {
    expect(normalizeRentCastPayload([], fetchedAt, 50)).toEqual({
      providerCount: 0,
      listings: [],
      status: 200,
      error: undefined,
    });
  });
});
