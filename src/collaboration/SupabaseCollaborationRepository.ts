import type { NestMatchSupabaseClient } from "../lib/supabase";
import type {
  CreateInvitationResponse,
  InvitationResponse,
  Json,
  MatchRow,
  NotificationRow,
  SearchGroupRow,
  SwipeRow,
} from "../types/database.types";
import type { Criteria, DecisionKind, Listing, PropertyType } from "../types/models";
import type { CollaborationRepository, CreateGroupInput, HouseMatch, SearchGroup, SearchGroupDetail, SwipeResult, UserNotification, UserSwipe } from "./types";

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
    && [value.radius, value.maxPrice, value.minBedrooms, value.minBathrooms].every(isNumber)
    && [value.idealPrice, value.minPrice, value.minSquareFeet, value.preferredSquareFeet, value.maxHoa, value.minYearBuilt, value.maxDaysOnMarket].every(isOptionalNumber)
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

export const toSearchGroup = (row: Pick<SearchGroupRow, "id" | "name">): SearchGroup => ({
  id: row.id,
  name: row.name,
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

const databaseFailure = () => new Error("The collaboration request could not be completed.");
async function invoke(client: NestMatchSupabaseClient, name: string, body: Record<string, string>) {
  const { data, error } = await client.functions.invoke(name, { body });
  if (error || !safeObject(data)) throw new Error("The secure request could not be completed.");
  return data;
}

export class SupabaseCollaborationRepository implements CollaborationRepository {
  constructor(private readonly client: NestMatchSupabaseClient, private readonly userId: string) {}

  async listGroups(): Promise<SearchGroup[]> {
    const { data, error } = await this.client.from("search_groups").select("id,name").eq("status", "active");
    if (error) throw databaseFailure();
    return (data ?? []).map(toSearchGroup);
  }

  async createGroup(input: CreateGroupInput): Promise<SearchGroup> {
    const criteria = toJson(input.criteria);
    if (!isCriteria(criteria)) throw new Error("Search details are invalid.");
    const { data, error } = await this.client.from("search_groups").insert({ owner_id: this.userId, name: input.name?.trim() || "Our Home Search", criteria }).select("id,name").single();
    if (error) throw databaseFailure();
    return { id: data.id, name: data.name, partnerName: "Waiting for partner" };
  }

  async getGroup(groupId: string): Promise<SearchGroupDetail> {
    const { data, error } = await this.client.from("search_groups").select("id,name,criteria").eq("id", groupId).single();
    if (error) throw databaseFailure();
    if (!isCriteria(data.criteria)) throw new Error("Search details are unavailable.");
    return { id: data.id, name: data.name, partnerName: "Partner", criteria: data.criteria };
  }

  async updateCriteria(groupId: string, criteria: Criteria) {
    const json = toJson(criteria);
    if (!isCriteria(json)) throw new Error("Search details are invalid.");
    const { error } = await this.client.from("search_groups").update({ criteria: json }).eq("id", groupId);
    if (error) throw databaseFailure();
  }

  async getGroupListings(groupId: string): Promise<Listing[]> {
    const { data, error } = await this.client.from("group_listings").select("listing_snapshot").eq("group_id", groupId);
    if (error) throw databaseFailure();
    return (data ?? []).flatMap(({ listing_snapshot }: { listing_snapshot: Json }) => isListing(listing_snapshot) ? [listing_snapshot] : []);
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

  async getMatches(groupId: string): Promise<HouseMatch[]> {
    const { data, error } = await this.client.from("matches").select("id,group_id,listing_id,created_at,status").eq("group_id", groupId).eq("status", "active");
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
