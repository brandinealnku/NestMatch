import type { Criteria, DecisionKind, Listing } from "../types/models";
import type { CachedListingInventory, ListingSearchRequest, ListingSearchResponse } from "../listings/listingTypes";

export interface SearchGroup { id: string; name: string; partnerName: string }
export interface SearchGroupDetail extends SearchGroup { criteria: Criteria }
export interface CreateGroupInput { name?: string; criteria: Criteria }
export interface UserSwipe { listingId: string; decision: DecisionKind; savedAt: string }
export interface HouseMatch { id: string; groupId: string; listingId: string; createdAt: string; archived: boolean }
export interface UserNotification { id: string; groupId: string; matchId: string; listingId: string; createdAt: string; readAt?: string }
export interface SwipeResult { swipe: UserSwipe; match?: HouseMatch; notification?: UserNotification }

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
  getMatches(groupId: string): Promise<HouseMatch[]>;
  getNotifications(): Promise<UserNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  archiveMatch(matchId: string): Promise<void>;
  reset(): Promise<void>;
}
