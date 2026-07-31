export interface RentCastCriteria {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  propertyTypes?: string[];
}

export type RentCastLocation =
  | { type: "city"; city: string; state: string }
  | { type: "zip"; zipCode: string };

export const rentCastPropertyTypes = {
  "Single-family": "Single Family",
  Condo: "Condo",
  Townhouse: "Townhouse",
  "Multi-family": "Multi-Family",
  Manufactured: "Manufactured",
} as const;

const nestMatchPropertyTypes: Record<string, string> = {
  "Single Family": "Single-family",
  Condo: "Condo",
  Townhouse: "Townhouse",
  "Multi-Family": "Multi-family",
  Manufactured: "Manufactured",
};

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const safeText = (value: unknown, max = 5000) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : undefined;
const safeUrl = (value: unknown) => {
  const text = safeText(value, 2048);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

export function toRentCastPriceRange(minPrice?: number, maxPrice?: number): string | undefined {
  if (minPrice === undefined && maxPrice === undefined) return undefined;
  return `${minPrice ?? "*"}:${maxPrice ?? "*"}`;
}

export function toRentCastMinimumRange(minimum?: number): string | undefined {
  return minimum === undefined ? undefined : `${minimum}:*`;
}

export function buildRentCastQuery(
  location: RentCastLocation,
  criteria: RentCastCriteria | undefined,
  limit: number,
): URLSearchParams {
  const query = new URLSearchParams({ status: "Active", limit: String(limit) });
  if (location.type === "city") {
    query.set("city", location.city);
    query.set("state", location.state);
  } else {
    query.set("zipCode", location.zipCode);
  }

  const price = toRentCastPriceRange(criteria?.minPrice, criteria?.maxPrice);
  if (price) query.set("price", price);
  const bedrooms = toRentCastMinimumRange(criteria?.minBedrooms);
  if (bedrooms) query.set("bedrooms", bedrooms);
  const bathrooms = toRentCastMinimumRange(criteria?.minBathrooms);
  if (bathrooms) query.set("bathrooms", bathrooms);
  const propertyTypes = criteria?.propertyTypes
    ?.flatMap((type) => type in rentCastPropertyTypes
      ? [rentCastPropertyTypes[type as keyof typeof rentCastPropertyTypes]]
      : []);
  if (propertyTypes?.length) query.set("propertyType", propertyTypes.join("|"));
  return query;
}

export function normalizeRentCast(value: unknown, fetchedAt: string) {
  if (!object(value)) return undefined;
  const providerListingId = safeText(value.id, 200);
  const formattedAddress = safeText(value.formattedAddress, 300) ?? safeText(value.addressLine1, 200);
  if (!providerListingId || !formattedAddress || !finite(value.price) || value.price < 0) return undefined;
  const optional = (key: string, max = Number.MAX_SAFE_INTEGER) =>
    finite(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= max
      ? value[key] as number
      : undefined;
  const agent = object(value.listingAgent) ? safeText(value.listingAgent.name, 150) : undefined;
  const office = object(value.listingOffice) ? safeText(value.listingOffice.name, 150) : undefined;
  const providerType = safeText(value.propertyType, 100);
  const propertyType = providerType ? nestMatchPropertyTypes[providerType] ?? "Other" : undefined;
  return {
    id: `rentcast:${providerListingId}`, provider: "rentcast" as const, providerListingId, source: "rentcast" as const, sourceLabel: "RentCast", isDemo: false,
    status: "active" as const, formattedAddress, addressLine1: safeText(value.addressLine1, 200) ?? formattedAddress, addressLine2: safeText(value.addressLine2, 100), city: safeText(value.city, 100) ?? "", state: safeText(value.state, 2) ?? "", zipCode: safeText(value.zipCode, 10) ?? "",
    price: value.price, bedrooms: optional("bedrooms", 100), bathrooms: optional("bathrooms", 100), squareFeet: optional("squareFootage"), lotSize: optional("lotSize"), lotSquareFeet: optional("lotSize"), yearBuilt: optional("yearBuilt", 3000), propertyType,
    latitude: finite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 ? value.latitude : undefined, longitude: finite(value.longitude) && value.longitude >= -180 && value.longitude <= 180 ? value.longitude : undefined,
    listedDate: safeText(value.listedDate, 40), daysOnMarket: optional("daysOnMarket", 100000), description: safeText(value.description), imageUrls: [] as string[], photoUrls: [] as string[], listingUrl: safeUrl(value.listingUrl), providerUrl: safeUrl(value.listingUrl), fetchedAt,
    attribution: agent || office ? { agentName: agent, officeName: office } : undefined, listingAgentName: agent, listingOfficeName: office,
  };
}

export function normalizeRentCastPayload(payload: unknown[], fetchedAt: string, limit: number) {
  const listings = payload.slice(0, limit).flatMap((item) => {
    const listing = normalizeRentCast(item, fetchedAt);
    return listing ? [listing] : [];
  });
  return {
    providerCount: payload.length,
    listings,
    status: payload.length > 0 && listings.length === 0 ? 502 as const : 200 as const,
    error: payload.length > 0 && listings.length === 0
      ? "Listing provider records could not be processed"
      : undefined,
  };
}
