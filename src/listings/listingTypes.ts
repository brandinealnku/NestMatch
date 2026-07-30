import type { Listing } from "../types/models";

export interface ListingSearchRequest {
  groupId: string;
  location: { type: "city"; city: string; state: string } | { type: "zip"; zipCode: string };
  criteria?: { minPrice?: number; maxPrice?: number; minBedrooms?: number; minBathrooms?: number; propertyTypes?: string[] };
  refresh?: boolean;
}

export interface ListingSearchResponse { listings: Listing[]; total: number; fetchedAt: string; source: "rentcast" }
export interface CachedListingInventory { listings: Listing[]; fetchedAt?: string }
