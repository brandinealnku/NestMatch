import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { context, cors, json, objectBody } from "../_shared/http.ts";

export interface ListingSearchRequest {
  groupId: string;
  location: { type: "city"; city: string; state: string } | { type: "zip"; zipCode: string };
  criteria?: { minPrice?: number; maxPrice?: number; minBedrooms?: number; minBathrooms?: number; propertyTypes?: string[] };
  refresh?: boolean;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const locks = new Map<string, number>();
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const optionalNumber = (value: unknown, max: number) => value === undefined || (finite(value) && value >= 0 && value <= max);
const safeText = (value: unknown, max = 5000) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : undefined;
const safeUrl = (value: unknown) => { const text = safeText(value, 2048); if (!text) return undefined; try { const url = new URL(text); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined; } catch { return undefined; } };

export function validateRequest(value: Record<string, unknown>): ListingSearchRequest | undefined {
  if (Object.keys(value).some((key) => !["groupId", "location", "criteria", "refresh"].includes(key))) return undefined;
  if (typeof value.groupId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.groupId)) return undefined;
  if (!object(value.location) || (value.location.type !== "city" && value.location.type !== "zip")) return undefined;
  let location: ListingSearchRequest["location"];
  if (value.location.type === "city") {
    const city = safeText(value.location.city, 80);
    if (!city || !/^[A-Z]{2}$/.test(String(value.location.state ?? ""))) return undefined;
    location = { type: "city", city, state: String(value.location.state) };
  } else {
    if (!/^\d{5}$/.test(String(value.location.zipCode ?? ""))) return undefined;
    location = { type: "zip", zipCode: String(value.location.zipCode) };
  }
  if (value.criteria !== undefined && !object(value.criteria)) return undefined;
  const input = (value.criteria ?? {}) as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["minPrice", "maxPrice", "minBedrooms", "minBathrooms", "propertyTypes"].includes(key))) return undefined;
  if (!optionalNumber(input.minPrice, 100_000_000) || !optionalNumber(input.maxPrice, 100_000_000) || !optionalNumber(input.minBedrooms, 20) || !optionalNumber(input.minBathrooms, 20)) return undefined;
  if (finite(input.minPrice) && finite(input.maxPrice) && input.minPrice > input.maxPrice) return undefined;
  if (input.propertyTypes !== undefined && (!Array.isArray(input.propertyTypes) || input.propertyTypes.length > 10 || input.propertyTypes.some((item) => !safeText(item, 50)))) return undefined;
  const criteria = { minPrice: input.minPrice as number | undefined, maxPrice: input.maxPrice as number | undefined, minBedrooms: input.minBedrooms as number | undefined, minBathrooms: input.minBathrooms as number | undefined, propertyTypes: input.propertyTypes as string[] | undefined };
  return { groupId: value.groupId, location, criteria, refresh: value.refresh === true };
}

export function normalizeRentCast(value: unknown, fetchedAt: string) {
  if (!object(value)) return undefined;
  const providerListingId = safeText(value.id, 200), formattedAddress = safeText(value.formattedAddress, 300) ?? safeText(value.addressLine1, 200);
  if (!providerListingId || !formattedAddress || !finite(value.price) || value.price < 0) return undefined;
  const optional = (key: string, max = Number.MAX_SAFE_INTEGER) => finite(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= max ? value[key] as number : undefined;
  const agent = object(value.listingAgent) ? safeText(value.listingAgent.name, 150) : undefined;
  const office = object(value.listingOffice) ? safeText(value.listingOffice.name, 150) : undefined;
  const providerType = safeText(value.propertyType, 100);
  const propertyType = ["Single-family", "Condo", "Townhouse", "Multi-family", "Manufactured", "Other"].includes(providerType ?? "") ? providerType : providerType ? "Other" : undefined;
  return {
    id: `rentcast:${providerListingId}`, provider: "rentcast" as const, providerListingId, source: "rentcast" as const, sourceLabel: "RentCast", isDemo: false,
    status: "active" as const, formattedAddress, addressLine1: safeText(value.addressLine1, 200) ?? formattedAddress, addressLine2: safeText(value.addressLine2, 100), city: safeText(value.city, 100) ?? "", state: safeText(value.state, 2) ?? "", zipCode: safeText(value.zipCode, 10) ?? "",
    price: value.price, bedrooms: optional("bedrooms", 100), bathrooms: optional("bathrooms", 100), squareFeet: optional("squareFootage"), lotSize: optional("lotSize"), lotSquareFeet: optional("lotSize"), yearBuilt: optional("yearBuilt", 3000), propertyType,
    latitude: finite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 ? value.latitude : undefined, longitude: finite(value.longitude) && value.longitude >= -180 && value.longitude <= 180 ? value.longitude : undefined,
    listedDate: safeText(value.listedDate, 40), daysOnMarket: optional("daysOnMarket", 100000), description: safeText(value.description), imageUrls: [] as string[], photoUrls: [] as string[], listingUrl: safeUrl(value.listingUrl), providerUrl: safeUrl(value.listingUrl), fetchedAt,
    attribution: agent || office ? { agentName: agent, officeName: office } : undefined, listingAgentName: agent, listingOfficeName: office,
  };
}

const errorResponse = (message: string, status: number, origin: string | null) => json({ error: message }, status, origin);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);
  let auth;
  try { auth = await context(req); } catch (error) {
    const code = error instanceof Error ? error.message : "request";
    return errorResponse(code === "origin" ? "Origin not allowed" : code === "auth" ? "Authentication required" : "Service unavailable", code === "origin" ? 403 : code === "auth" ? 401 : 503, origin);
  }
  let body: Record<string, unknown>;
  try { body = await objectBody(req); } catch { return errorResponse("Malformed JSON", 400, origin); }
  const input = validateRequest(body);
  if (!input) return errorResponse("Invalid search request", 400, origin);
  const { data: group } = await auth.admin.from("search_groups").select("id,owner_id,criteria,status").eq("id", input.groupId).maybeSingle();
  if (!group || group.status !== "active") return errorResponse("Search group not found", 404, origin);
  const { data: membership } = await auth.admin.from("group_members").select("role,status").eq("group_id", input.groupId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || membership.status !== "active") return errorResponse("Search group not found", 404, origin);
  if (group.owner_id !== auth.user.id) return errorResponse("Only the group owner can refresh listings", 403, origin);
  if (locks.get(input.groupId) && locks.get(input.groupId)! > Date.now()) return errorResponse("A listing refresh is already in progress", 409, origin);
  const key = Deno.env.get("RENTCAST_API_KEY");
  if (!key) return errorResponse("Listing provider is not configured", 503, origin);
  locks.set(input.groupId, Date.now() + 15_000);
  try {
    const saved = object(group.criteria) ? group.criteria : {};
    const criteria = { ...saved, ...input.criteria, mode: input.location.type, ...(input.location.type === "city" ? { city: input.location.city, state: input.location.state, zipCode: "" } : { city: "", state: "", zipCode: input.location.zipCode }) };
    const { error: criteriaError } = await auth.admin.from("search_groups").update({ criteria }).eq("id", input.groupId);
    if (criteriaError) return errorResponse("Unable to save search criteria", 500, origin);
    const query = new URLSearchParams({ status: "Active", limit: String(Math.min(DEFAULT_LIMIT, MAX_LIMIT)) });
    if (input.location.type === "city") { query.set("city", input.location.city); query.set("state", input.location.state); } else query.set("zipCode", input.location.zipCode);
    if (input.criteria?.minPrice !== undefined) query.set("minPrice", String(input.criteria.minPrice));
    if (input.criteria?.maxPrice !== undefined) query.set("maxPrice", String(input.criteria.maxPrice));
    if (input.criteria?.minBedrooms !== undefined) query.set("bedrooms", String(input.criteria.minBedrooms));
    if (input.criteria?.minBathrooms !== undefined) query.set("bathrooms", String(input.criteria.minBathrooms));
    if (input.criteria?.propertyTypes?.length) query.set("propertyType", input.criteria.propertyTypes.join(","));
    const provider = await fetch(`https://api.rentcast.io/v1/listings/sale?${query}`, { headers: { Accept: "application/json", "X-Api-Key": key } });
    if (!provider.ok) return errorResponse(provider.status === 429 ? "Listing provider rate limit reached" : provider.status === 401 ? "Listing provider authentication failed" : "Listing provider unavailable", provider.status === 429 ? 429 : provider.status === 401 ? 502 : 502, origin);
    let payload: unknown;
    try { payload = await provider.json(); } catch { return errorResponse("Listing provider returned an invalid response", 502, origin); }
    if (!Array.isArray(payload)) return errorResponse("Listing provider returned an invalid response", 502, origin);
    const fetchedAt = new Date().toISOString();
    const listings = payload.slice(0, MAX_LIMIT).flatMap((item) => { const listing = normalizeRentCast(item, fetchedAt); return listing ? [listing] : []; });
    if (listings.length) {
      const rows = listings.map((listing) => ({ group_id: input.groupId, listing_id: listing.id, listing_snapshot: listing, source: "rentcast", fetched_at: fetchedAt }));
      const { error } = await auth.admin.from("group_listings").upsert(rows, { onConflict: "group_id,listing_id" });
      if (error) return errorResponse("Unable to save listings", 500, origin);
    }
    return json({ listings, total: listings.length, fetchedAt, source: "rentcast" }, 200, origin);
  } catch { return errorResponse("Unable to refresh listings", 502, origin); }
  finally { locks.delete(input.groupId); }
});
