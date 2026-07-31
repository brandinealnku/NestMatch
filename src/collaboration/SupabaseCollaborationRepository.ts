import type { NestMatchSupabaseClient } from "../lib/supabase";
import type {
  CreateInvitationResponse,
  InvitationResponse,
} from "../types/database.types";
import type { Json, Tables } from "../types/supabase-database.types";
import type { Criteria, DecisionKind, Listing, PropertyType } from "../types/models";
import type { CollaborationRepository, CreateGroupInput, HouseMatch, MatchNote, SearchGroup, SearchGroupDetail, SwipeResult, UserNotification, UserSwipe } from "./types";
import type { CachedListingInventory, ListingSearchRequest, ListingSearchResponse } from "../listings/listingTypes";

type MatchRow = Tables<"matches">;
type NotificationRow = Tables<"notifications">;
type SearchGroupRow = Tables<"search_groups">;
type SwipeRow = Tables<"swipes">;

const safeObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isOptionalNumber = (value: unknown) => value === undefined || isNumber(value);
const propertyTypes: readonly PropertyType[] = ["Single-family", "Condo", "Townhouse", "Multi-family", "Manufactured", "Other"];
const isPropertyType = (value: unknown): value is PropertyType => isString(value) && propertyTypes.includes(value as PropertyType);

export function isCriteria(value: Json): value is Json & Criteria {
  if (!safeObject(value)) return false;
  return (value.mode === "city" || value.mode === "zip")
    && [value.city, value.state, value.zipCode].every(isString)
    && isNumber(value.radius)
    && [value.idealPrice, value.minPrice, value.maxPrice, value.minBedrooms, value.minBathrooms, value.minSquareFeet, value.preferredSquareFeet, value.maxHoa, value.minYearBuilt, value.maxDaysOnMarket].every(isOptionalNumber)
    && Array.isArray(value.propertyTypes) && value.propertyTypes.every(isPropertyType)
    && Array.isArray(value.preferredTypes) && value.preferredTypes.every(isPropertyType)
    && [value.hoaEssential, value.yearEssential, value.daysEssential, value.includeMissing].every((item) => typeof item === "boolean");
}

export function isListing(value: Json): value is Json & Listing {
  if (!safeObject(value)) return false;
  return isString(value.id)
    && (value.source === "demo" || value.source === "rentcast")
    && isString(value.sourceLabel)
    && typeof value.isDemo === "boolean"
    && [value.addressLine1, value.city, value.state, value.zipCode].every(isString)
    && isNumber(value.price)
    && (value.propertyType === undefined || isPropertyType(value.propertyType))
    && Array.isArray(value.photoUrls) && value.photoUrls.every(isString);
}

function toJson(value: unknown): Json {
  if (value === null || isString(value) || typeof value === "boolean" || isNumber(value)) return value;
  if (Array.isArray(value)) return value.map(toJson);
  if (safeObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === undefined ? undefined : toJson(item)]));
  throw new Error("Search details contain unsupported values.");
}

export type CollaborationErrorCode = "database_setup" | "invalid" | "session" | "owner" | "not_configured" | "unavailable";
export class CollaborationError extends Error {
  constructor(public readonly code: CollaborationErrorCode) { super(code); }
}

export const toSearchGroup = (row: Pick<SearchGroupRow, "id" | "name"> & Partial<Pick<SearchGroupRow, "description">>): SearchGroup => ({
  id: row.id,
  name: row.name,
  ...(row.description ? { description: row.description } : {}),
  partnerName: "Partner",
});
export const toUserSwipe = (row: Pick<SwipeRow, "listing_id" | "decision" | "updated_at">): UserSwipe => ({
  listingId: row.listing_id,
  decision: row.decision,
  savedAt: row.updated_at,
});
export const toHouseMatch = (row: Pick<MatchRow, "id" | "group_id" | "listing_id" | "created_at" | "status">): HouseMatch => ({
  id: row.id,
  groupId: row.group_id,
  listingId: row.listing_id,
  createdAt: row.created_at,
  archived: row.status === "archived",
});
export const toUserNotification = (
  row: Pick<NotificationRow, "id" | "group_id" | "match_id" | "created_at" | "read_at">,
  listingByMatchId: ReadonlyMap<string, string>,
): UserNotification | undefined => {
  if (!row.match_id) return undefined;
  const listingId = listingByMatchId.get(row.match_id);
  if (!listingId) return undefined;
  return {
    id: row.id,
    groupId: row.group_id,
    matchId: row.match_id,
    listingId,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
  };
};

const databaseFailure = (error?: { code?: string; message?: string } | null) => {
  if (import.meta.env.DEV && error) console.error("NestMatch collaboration database error", error.code, error.message);
  const missing = error?.code === "42P01" || error?.code === "42703" || error?.code === "PGRST205";
  return new CollaborationError(missing ? "database_setup" : "unavailable");
};
async function listingFailure(error: { context?: unknown } | null): Promise<CollaborationError> {
  const response = error?.context instanceof Response ? error.context : undefined;
  const status = response?.status;
  let providerMessage = "";
  try { providerMessage = String((await response?.clone().json() as { error?: unknown } | undefined)?.error ?? ""); } catch { /* response details are optional */ }
  if (status === 400) return new CollaborationError("invalid");
  if (status === 401) return new CollaborationError("session");
  if (status === 403 || /owner/i.test(providerMessage)) return new CollaborationError("owner");
  if (/not configured/i.test(providerMessage)) return new CollaborationError("not_configured");
  return new CollaborationError("unavailable");
}
async function invoke(client: NestMatchSupabaseClient, name: string, body: Record<string, string>) {
  const { data, error } = await client.functions.invoke(name, { body });
  if (error || !safeObject(data)) throw new Error("The secure request could not be completed.");
  return data;
}

export class SupabaseCollaborationRepository implements CollaborationRepository {
  constructor(private readonly client: NestMatchSupabaseClient, private readonly userId: string) {}

  async listGroups(): Promise<SearchGroup[]> {
    const { data, error } = await this.client.from("search_groups").select("id,name,description").eq("status", "active");
    if (error) throw databaseFailure(error);
    return (data ?? []).map(toSearchGroup);
  }

  async createGroup(input: CreateGroupInput): Promise<SearchGroup> {
    const criteria = toJson(input.criteria);
    if (!isCriteria(criteria)) throw new Error("Search details are invalid.");
    const name = input.name?.trim();
    if (!name || name.length > 100) throw new CollaborationError("invalid");
    const description = input.description?.trim() || null;
    const { data, error } = await this.client.from("search_groups").insert({ owner_id: this.userId, name, description, criteria }).select("id,name,description").single();
    if (error) throw databaseFailure(error);
    if (!data?.id) throw new CollaborationError("unavailable");
    return { ...toSearchGroup(data), partnerName: "Waiting for partner" };
  }

  async getGroup(groupId: string): Promise<SearchGroupDetail> {
    const { data, error } = await this.client.from("search_groups").select("id,name,description,criteria,owner_id").eq("id", groupId).single();
    if (error) throw databaseFailure();
    if (!isCriteria(data.criteria)) throw new Error("Search details are unavailable.");
    const { data: members, error: memberError } = await this.client.from("group_members").select("user_id").eq("group_id", groupId).eq("status", "active");
    if (memberError) throw databaseFailure();
    const ids = (members ?? []).map(item => item.user_id);
    const { data: profiles, error: profileError } = ids.length ? await this.client.from("profiles").select("id,display_name").in("id", ids) : { data: [], error: null };
    if (profileError) throw databaseFailure();
    const names = new Map((profiles ?? []).map(item => [item.id, item.display_name || "NestMatch member"]));
    const partnerId = ids.find(id => id !== this.userId);
    return { id: data.id, name: data.name, description: data.description ?? undefined, ownerId: data.owner_id, memberCount: ids.length, currentUserName: names.get(this.userId) ?? "You", currentUserRole: data.owner_id === this.userId ? "owner" : "member", partnerName: partnerId ? names.get(partnerId) ?? "Your person" : "Invitation pending", criteria: data.criteria };
  }

  async updateCriteria(groupId: string, criteria: Criteria) {
    const json = toJson(criteria);
    if (!isCriteria(json)) throw new Error("Search details are invalid.");
    const { error } = await this.client.from("search_groups").update({ criteria: json }).eq("id", groupId);
    if (error) throw databaseFailure();
  }

  async getGroupListings(groupId: string): Promise<Listing[]> {
    return (await this.getCachedInventory(groupId)).listings;
  }

  async getCachedInventory(groupId: string): Promise<CachedListingInventory> {
    const { data, error } = await this.client.from("group_listings").select("listing_snapshot,fetched_at").eq("group_id", groupId).order("listing_id");
    if (error) throw databaseFailure();
    const listings = (data ?? []).flatMap(({ listing_snapshot }: { listing_snapshot: Json }) => isListing(listing_snapshot) ? [listing_snapshot] : []);
    const fetchedAt = (data ?? []).map((row: { fetched_at: string }) => row.fetched_at).sort().at(-1);
    return { listings, fetchedAt };
  }

  async searchListings(input: ListingSearchRequest): Promise<ListingSearchResponse> {
    const { data, error } = await this.client.functions.invoke("search-listings", { body: input });
    if (error) throw await listingFailure(error);
    if (!safeObject(data) || !Array.isArray(data.listings) || !isString(data.fetchedAt)) throw new CollaborationError("unavailable");
    const listings = data.listings.flatMap((item: Json) => isListing(item) ? [item] : []);
    return { listings, total: listings.length, fetchedAt: data.fetchedAt, source: "rentcast" };
  }

  async saveSwipe(groupId: string, listingId: string, decision: DecisionKind): Promise<SwipeResult> {
    const { data, error } = await this.client.from("swipes").upsert({ group_id: groupId, listing_id: listingId, user_id: this.userId, decision }).select("listing_id,decision,updated_at").single();
    if (error) throw databaseFailure();
    return { swipe: toUserSwipe(data) };
  }

  async removeSwipe(groupId: string, listingId: string) {
    const { error } = await this.client.from("swipes").delete().eq("group_id", groupId).eq("listing_id", listingId).eq("user_id", this.userId);
    if (error) throw databaseFailure();
    return true;
  }

  async getMySwipes(groupId: string): Promise<UserSwipe[]> {
    const { data, error } = await this.client.from("swipes").select("listing_id,decision,updated_at").eq("group_id", groupId).eq("user_id", this.userId);
    if (error) throw databaseFailure();
    return (data ?? []).map(toUserSwipe);
  }

  async getMatches(groupId: string, includeArchived = false): Promise<HouseMatch[]> {
    let query = this.client.from("matches").select("id,group_id,listing_id,created_at,status").eq("group_id", groupId);
    if (!includeArchived) query = query.eq("status", "active");
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw databaseFailure();
    return (data ?? []).map(toHouseMatch);
  }

  async getNotifications(): Promise<UserNotification[]> {
    const { data: notificationRows, error } = await this.client.from("notifications").select("id,group_id,match_id,created_at,read_at").eq("user_id", this.userId);
    if (error) throw databaseFailure();
    const matchIds = (notificationRows ?? [])
      .map(({ match_id }: Pick<NotificationRow, "match_id">) => match_id)
      .filter((id: string | null): id is string => Boolean(id));
    let listingByMatchId = new Map<string, string>();
    if (matchIds.length) {
      const { data: matchRows, error: matchError } = await this.client.from("matches").select("id,listing_id").in("id", matchIds);
      if (matchError) throw databaseFailure();
      listingByMatchId = new Map((matchRows ?? []).map((row: Pick<MatchRow, "id" | "listing_id">) => [row.id, row.listing_id]));
    }
    return (notificationRows ?? []).flatMap((row: Pick<NotificationRow, "id" | "group_id" | "match_id" | "created_at" | "read_at">) => {
      const notification = toUserNotification(row, listingByMatchId);
      return notification ? [notification] : [];
    });
  }

  async markNotificationRead(id: string) { const { error } = await this.client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", this.userId); if (error) throw databaseFailure(); }
  async archiveMatch(id: string) { const { error } = await this.client.from("matches").update({ status: "archived" }).eq("id", id); if (error) throw databaseFailure(); }
  async getMatchNotes(matchId: string): Promise<MatchNote[]> {
    const { data, error } = await this.client.from("match_notes").select("id,match_id,group_id,author_id,body,created_at,updated_at").eq("match_id", matchId).order("created_at");
    if (error) throw databaseFailure();
    const authorIds = [...new Set((data ?? []).map(note => note.author_id))];
    const { data: profiles, error: profilesError } = authorIds.length ? await this.client.from("profiles").select("id,display_name").in("id", authorIds) : { data: [], error: null };
    if (profilesError) throw databaseFailure();
    const names = new Map((profiles ?? []).map(profile => [profile.id, profile.display_name || "NestMatch member"]));
    return (data ?? []).map(note => ({ id: note.id, matchId: note.match_id, groupId: note.group_id, authorId: note.author_id, authorName: names.get(note.author_id) ?? "NestMatch member", body: note.body, createdAt: note.created_at, updatedAt: note.updated_at }));
  }
  async createMatchNote(matchId: string, groupId: string, body: string): Promise<MatchNote> {
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 1000) throw new Error("Enter a note of 1,000 characters or fewer.");
    const { data, error } = await this.client.from("match_notes").insert({ match_id: matchId, group_id: groupId, author_id: this.userId, body: trimmed }).select("id,match_id,group_id,author_id,body,created_at,updated_at").single();
    if (error) throw databaseFailure();
    return { id: data.id, matchId: data.match_id, groupId: data.group_id, authorId: data.author_id, authorName: "You", body: data.body, createdAt: data.created_at, updatedAt: data.updated_at };
  }
  async updateMatchNote(noteId: string, body: string) { const trimmed = body.trim(); if (!trimmed || trimmed.length > 1000) throw new Error("Enter a note of 1,000 characters or fewer."); const { error } = await this.client.from("match_notes").update({ body: trimmed }).eq("id", noteId).eq("author_id", this.userId); if (error) throw databaseFailure(); }
  async deleteMatchNote(noteId: string) { const { error } = await this.client.from("match_notes").delete().eq("id", noteId).eq("author_id", this.userId); if (error) throw databaseFailure(); }
  async reset() { /* Connected data is never erased by the demo reset. */ }
  async createInvitation(groupId: string): Promise<CreateInvitationResponse> {
    const data = await invoke(this.client, "create-invite", { groupId });
    if (!isString(data.token) || !isString(data.expiresAt)) throw new Error("The secure request returned an invalid response.");
    return { token: data.token, expiresAt: data.expiresAt };
  }
  async acceptInvitation(token: string): Promise<InvitationResponse> {
    const data = await invoke(this.client, "accept-invite", { token });
    if (!isString(data.groupId)) throw new Error("The secure request returned an invalid response.");
    return { groupId: data.groupId };
  }
  async revokeInvitation(groupId: string): Promise<{ revoked: boolean }> {
    const data = await invoke(this.client, "revoke-invite", { groupId });
    if (typeof data.revoked !== "boolean") throw new Error("The secure request returned an invalid response.");
    return { revoked: data.revoked };
  }
}
