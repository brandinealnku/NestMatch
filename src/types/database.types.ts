import type { Criteria, DecisionKind, Listing } from "./models";
import type { Tables } from "./supabase-database.types";

export type { Json } from "./supabase-database.types";
export type ProfileRow = Tables<"profiles">;
export type SearchGroupRow = Tables<"search_groups">;
export type GroupMemberRow = Tables<"group_members">;
export type GroupListingRow = Tables<"group_listings">;
export type SwipeRow = Tables<"swipes">;
export type MatchRow = Tables<"matches">;
export type NotificationRow = Tables<"notifications">;
export type InvitationRow = Tables<"invitations">;

// Application-facing contracts returned by authenticated operations.
export interface AuthUser { id: string; email?: string }
export interface Profile { id: string; displayName: string; avatarColor?: string; browserNotificationsEnabled: boolean; createdAt: string; updatedAt: string }
export interface ProfileInput { displayName: string; avatarColor?: string; browserNotificationsEnabled: boolean }
export interface DatabaseSearchGroup { id: string; ownerId: string; name: string; criteria: Criteria; status: "active" | "archived"; maxMembers: 2; createdAt: string; updatedAt: string }
export interface DatabaseGroupMember { groupId: string; userId: string; role: "owner" | "member"; status: "active" | "left" | "removed"; joinedAt: string; leftAt?: string }
export interface DatabaseGroupListing { groupId: string; listingId: string; listingSnapshot: Listing; source: string; fetchedAt: string }
export interface DatabaseSwipe { groupId: string; listingId: string; userId: string; decision: DecisionKind; createdAt: string; updatedAt: string }
export interface DatabaseHouseMatch { id: string; groupId: string; listingId: string; matchType: "love_love"; status: "active" | "archived"; createdAt: string }
export interface DatabaseNotification { id: string; userId: string; groupId: string; matchId?: string; type: "house_match"; readAt?: string; createdAt: string }
export type InvitationErrorCode = "expired" | "revoked" | "already_accepted" | "owner_self_invite" | "group_full" | "invalid_token" | "network_error";
export interface InvitationResponse { groupId: string }
export interface CreateInvitationResponse { token: string; expiresAt: string }
export interface EdgeFunctionError { error: string; code?: InvitationErrorCode }
