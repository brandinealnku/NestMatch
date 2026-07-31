import type { Criteria, DecisionKind, Listing } from "../types/models";
import type { CachedListingInventory, ListingSearchRequest, ListingSearchResponse } from "../listings/listingTypes";

export interface SearchGroup { id: string; name: string; partnerName: string; description?: string }
export interface SearchGroupDetail extends SearchGroup { criteria: Criteria; ownerId?: string; memberCount?: number; currentUserName?: string; currentUserRole?: "owner" | "member" }
export interface CreateGroupInput { name?: string; description?: string; criteria: Criteria }
export interface UserSwipe { listingId: string; decision: DecisionKind; savedAt: string }
export interface HouseMatch { id: string; groupId: string; listingId: string; createdAt: string; archived: boolean }
export interface UserNotification { id: string; groupId: string; matchId: string; listingId: string; createdAt: string; readAt?: string }
export interface SwipeResult { swipe: UserSwipe; match?: HouseMatch; notification?: UserNotification }
export interface MatchNote { id: string; matchId: string; groupId: string; authorId: string; authorName: string; body: string; createdAt: string; updatedAt: string }

export interface CollaborationRepository {
  listGroups(): Promise<SearchGroup[]>;
  createGroup(input: CreateGroupInput): Promise<SearchGroup>;
  getGroup(groupId: string): Promise<SearchGroupDetail>;
  updateCriteria(groupId: string, criteria: Criteria): Promise<void>;
  getGroupListings(groupId: string): Promise<Listing[]>;
  getCachedInventory?(groupId: string): Promise<CachedListingInventory>;
  searchListings?(input: ListingSearchRequest): Promise<ListingSearchResponse>;
  saveSwipe(groupId: string, listingId: string, decision: DecisionKind): Promise<SwipeResult>;
  removeSwipe(groupId: string, listingId: string): Promise<boolean>;
  getMySwipes(groupId: string): Promise<UserSwipe[]>;
  getMatches(groupId: string, includeArchived?: boolean): Promise<HouseMatch[]>;
  getNotifications(): Promise<UserNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  archiveMatch(matchId: string): Promise<void>;
  getMatchNotes?(matchId: string): Promise<MatchNote[]>;
  createMatchNote?(matchId: string, groupId: string, body: string): Promise<MatchNote>;
  updateMatchNote?(noteId: string, body: string): Promise<void>;
  deleteMatchNote?(noteId: string): Promise<void>;
  reset(): Promise<void>;
}
