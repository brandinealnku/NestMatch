import type { Criteria, DecisionKind, Listing } from "./models";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ProfileRow { id: string; display_name: string; avatar_color: string | null; browser_notifications_enabled: boolean; created_at: string; updated_at: string }
export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type ProfileUpdate = Partial<ProfileInsert>;
export interface SearchGroupRow { id: string; owner_id: string; name: string; criteria: Json; status: "active" | "archived"; max_members: number; created_at: string; updated_at: string }
export type SearchGroupInsert = Omit<SearchGroupRow, "id" | "status" | "max_members" | "created_at" | "updated_at"> & { id?: string; status?: SearchGroupRow["status"]; max_members?: number; created_at?: string; updated_at?: string };
export type SearchGroupUpdate = Partial<SearchGroupInsert>;
export interface GroupMemberRow { group_id: string; user_id: string; role: "owner" | "member"; status: "active" | "left" | "removed"; joined_at: string; left_at: string | null }
export type GroupMemberInsert = Omit<GroupMemberRow, "status" | "joined_at" | "left_at"> & { status?: GroupMemberRow["status"]; joined_at?: string; left_at?: string | null };
export type GroupMemberUpdate = Partial<GroupMemberInsert>;
export interface GroupListingRow { group_id: string; listing_id: string; listing_snapshot: Json; source: string; fetched_at: string; created_at: string; updated_at: string }
export type GroupListingInsert = Omit<GroupListingRow, "fetched_at" | "created_at" | "updated_at"> & { fetched_at?: string; created_at?: string; updated_at?: string };
export type GroupListingUpdate = Partial<GroupListingInsert>;
export interface SwipeRow { group_id: string; listing_id: string; user_id: string; decision: "pass" | "maybe" | "love"; created_at: string; updated_at: string }
export type SwipeInsert = Omit<SwipeRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type SwipeUpdate = Partial<SwipeInsert>;
export interface MatchRow { id: string; group_id: string; listing_id: string; match_type: "love_love"; status: "active" | "archived"; created_at: string }
export type MatchInsert = Omit<MatchRow, "id" | "match_type" | "status" | "created_at"> & { id?: string; match_type?: "love_love"; status?: MatchRow["status"]; created_at?: string };
export type MatchUpdate = Partial<MatchInsert>;
export interface NotificationRow { id: string; user_id: string; group_id: string; match_id: string | null; type: "house_match"; read_at: string | null; created_at: string }
export type NotificationInsert = Omit<NotificationRow, "id" | "read_at" | "created_at"> & { id?: string; read_at?: string | null; created_at?: string };
export type NotificationUpdate = Partial<NotificationInsert>;
export interface InvitationRow { id: string; group_id: string; created_by: string; token_hash: string; expires_at: string; accepted_by: string | null; accepted_at: string | null; revoked_at: string | null; created_at: string }
export type InvitationInsert = Omit<InvitationRow, "id" | "expires_at" | "accepted_by" | "accepted_at" | "revoked_at" | "created_at"> & { id?: string; expires_at?: string; accepted_by?: string | null; accepted_at?: string | null; revoked_at?: string | null; created_at?: string };
export type InvitationUpdate = Partial<InvitationInsert>;

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [] };
      search_groups: { Row: SearchGroupRow; Insert: SearchGroupInsert; Update: SearchGroupUpdate; Relationships: [] };
      group_members: { Row: GroupMemberRow; Insert: GroupMemberInsert; Update: GroupMemberUpdate; Relationships: [] };
      group_listings: { Row: GroupListingRow; Insert: GroupListingInsert; Update: GroupListingUpdate; Relationships: [] };
      swipes: { Row: SwipeRow; Insert: SwipeInsert; Update: SwipeUpdate; Relationships: [] };
      matches: { Row: MatchRow; Insert: MatchInsert; Update: MatchUpdate; Relationships: [] };
      notifications: { Row: NotificationRow; Insert: NotificationInsert; Update: NotificationUpdate; Relationships: [] };
      invitations: { Row: InvitationRow; Insert: InvitationInsert; Update: InvitationUpdate; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

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
