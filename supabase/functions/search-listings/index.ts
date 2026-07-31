import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { context, cors, json, objectBody } from "../_shared/http.ts";
import { buildRentCastQuery, buildSavedCriteria, normalizeRentCastCriteria, normalizeRentCastPayload } from "./rentcast.ts";
export { normalizeRentCast, positiveOptional, toRentCastMinimumRange, toRentCastPriceRange } from "./rentcast.ts";

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
    const normalizedCriteria = normalizeRentCastCriteria(input.criteria);
    const criteria = buildSavedCriteria(saved, normalizedCriteria, input.location);
    const { error: criteriaError } = await auth.admin.from("search_groups").update({ criteria }).eq("id", input.groupId);
    if (criteriaError) return errorResponse("Unable to save search criteria", 500, origin);
    const query = buildRentCastQuery(input.location, normalizedCriteria, Math.min(DEFAULT_LIMIT, MAX_LIMIT));
    const provider = await fetch(`https://api.rentcast.io/v1/listings/sale?${query}`, { headers: { Accept: "application/json", "X-Api-Key": key } });
    if (!provider.ok) return errorResponse(provider.status === 429 ? "Listing provider rate limit reached" : provider.status === 401 ? "Listing provider authentication failed" : "Listing provider unavailable", provider.status === 429 ? 429 : provider.status === 401 ? 502 : 502, origin);
    let payload: unknown;
    try { payload = await provider.json(); } catch { return errorResponse("Listing provider returned an invalid response", 502, origin); }
    if (!Array.isArray(payload)) return errorResponse("Listing provider returned an invalid response", 502, origin);
    const fetchedAt = new Date().toISOString();
    const normalized = normalizeRentCastPayload(payload, fetchedAt, MAX_LIMIT);
    const listings = normalized.listings;
    console.log("RentCast listing search result", {
      providerCount: normalized.providerCount,
      normalizedCount: listings.length,
      locationType: input.location.type,
      appliedFilters: {
        price: Boolean(normalizedCriteria.minPrice || normalizedCriteria.maxPrice),
        bedrooms: Boolean(normalizedCriteria.minBedrooms),
        bathrooms: Boolean(normalizedCriteria.minBathrooms),
        propertyTypes: Boolean(normalizedCriteria.propertyTypes?.length),
      },
    });
    if (normalized.error) return errorResponse(normalized.error, normalized.status, origin);
    if (listings.length) {
      const rows = listings.map((listing) => ({ group_id: input.groupId, listing_id: listing.id, listing_snapshot: listing, source: "rentcast", fetched_at: fetchedAt }));
      const { error } = await auth.admin.from("group_listings").upsert(rows, { onConflict: "group_id,listing_id" });
      if (error) return errorResponse("Unable to save listings", 500, origin);
    }
    return json({ listings, total: listings.length, fetchedAt, source: "rentcast" }, 200, origin);
  } catch { return errorResponse("Unable to refresh listings", 502, origin); }
  finally { locks.delete(input.groupId); }
});
