import type {
  Breakdown,
  Criteria,
  Listing,
  MatchReason,
  MatchScore,
} from "../types/models";
import { currency } from "../lib/format";
const weights = {
  Budget: 30,
  Bedrooms: 15,
  Bathrooms: 10,
  "Square footage": 15,
  "Property type": 10,
  HOA: 8,
  "Year built": 7,
  "Days on market": 5,
};
export function calculateMatchScore(l: Listing, c: Criteria): MatchScore {
  const rows: Breakdown[] = [];
  const positiveReasons: MatchReason[] = [];
  const compromises: MatchReason[] = [];
  const unavailableCriteria: MatchReason[] = [];
  const add = (
    name: keyof typeof weights,
    value: number | undefined,
    ratio: number,
    text: string,
    positive = true,
  ) => {
    if (value == null) {
      unavailableCriteria.push({
        criterion: name,
        text: name + " information is unavailable and was not scored",
      });
      return;
    }
    const earned = weights[name] * Math.max(0, Math.min(1, ratio));
    rows.push({ name, earned, available: weights[name], explanation: text });
    (positive ? positiveReasons : compromises).push({ criterion: name, text });
  };
  const ideal = c.idealPrice ?? c.maxPrice;
  const budgetRatio =
    l.price <= ideal
      ? 1
      : 1 - (l.price - ideal) / Math.max(1, c.maxPrice - ideal);
  add(
    "Budget",
    l.price,
    budgetRatio,
    l.price <= ideal
      ? currency(ideal - l.price) + " at or below your ideal price"
      : "Approaches your maximum budget",
    l.price <= ideal,
  );
  const meetsBedroomRequirement =
    l.bedrooms != null && l.bedrooms >= c.minBedrooms;
  const bedroomExplanation = meetsBedroomRequirement
    ? `Meets your ${c.minBedrooms}-bedroom requirement`
    : `Below your ${c.minBedrooms}-bedroom requirement`;
  add(
    "Bedrooms",
    l.bedrooms,
    meetsBedroomRequirement ? 1 : (l.bedrooms ?? 0) / c.minBedrooms,
    bedroomExplanation,
    meetsBedroomRequirement,
  );
  const meetsBathroomRequirement =
    l.bathrooms != null && l.bathrooms >= c.minBathrooms;
  const bathroomExplanation = meetsBathroomRequirement
    ? `Meets your ${c.minBathrooms}-bathroom requirement`
    : `Below your ${c.minBathrooms}-bathroom requirement`;
  add(
    "Bathrooms",
    l.bathrooms,
    meetsBathroomRequirement ? 1 : (l.bathrooms ?? 0) / c.minBathrooms,
    bathroomExplanation,
    meetsBathroomRequirement,
  );
  const sqTarget = c.preferredSquareFeet ?? c.minSquareFeet ?? l.squareFeet;
  add(
    "Square footage",
    l.squareFeet,
    sqTarget ? (l.squareFeet ?? 0) / sqTarget : 1,
    (l.squareFeet ?? 0) >= Number(sqTarget)
      ? "Meets your preferred living space"
      : "Below your preferred square footage",
    (l.squareFeet ?? 0) >= Number(sqTarget),
  );
  add(
    "Property type",
    l.propertyType ? 1 : undefined,
    l.propertyType && c.preferredTypes.includes(l.propertyType) ? 1 : 0.5,
    l.propertyType && c.preferredTypes.includes(l.propertyType)
      ? "A preferred home type"
      : "An accepted, not preferred, home type",
    !!l.propertyType && c.preferredTypes.includes(l.propertyType),
  );
  add(
    "HOA",
    l.hoaFeeMonthly,
    c.maxHoa == null
      ? 1
      : 1 - (l.hoaFeeMonthly ?? 0) / Math.max(1, c.maxHoa * 1.5),
    (l.hoaFeeMonthly ?? 0) <= Number(c.maxHoa ?? Infinity)
      ? "HOA is within your preference"
      : "HOA exceeds your preference",
    (l.hoaFeeMonthly ?? 0) <= Number(c.maxHoa ?? Infinity),
  );
  add(
    "Year built",
    l.yearBuilt,
    c.minYearBuilt ? ((l.yearBuilt ?? 0) >= c.minYearBuilt ? 1 : 0.55) : 1,
    c.minYearBuilt && (l.yearBuilt ?? 0) < c.minYearBuilt
      ? "Built before your preferred year"
      : "Meets your year-built preference",
    !c.minYearBuilt || (l.yearBuilt ?? 0) >= c.minYearBuilt,
  );
  add(
    "Days on market",
    l.daysOnMarket,
    c.maxDaysOnMarket
      ? 1 - (l.daysOnMarket ?? 0) / Math.max(1, c.maxDaysOnMarket * 1.5)
      : 1,
    c.maxDaysOnMarket && (l.daysOnMarket ?? 0) > c.maxDaysOnMarket
      ? "Listed longer than your preference"
      : "Days on market is within your preference",
    !c.maxDaysOnMarket || (l.daysOnMarket ?? 0) <= c.maxDaysOnMarket,
  );
  const possible = rows.reduce((s, r) => s + r.available, 0);
  const total =
    Math.round((rows.reduce((s, r) => s + r.earned, 0) / possible) * 100) || 0;
  const label =
    total >= 90
      ? "Excellent match"
      : total >= 75
        ? "Strong match"
        : total >= 60
          ? "Possible match"
          : "Low match";
  return {
    total,
    label,
    positiveReasons,
    compromises,
    unavailableCriteria,
    breakdown: rows,
  };
}
