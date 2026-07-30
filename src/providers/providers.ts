import type { Criteria, Listing, ListingSearchResult } from "../types/models";
import { demoListings } from "../data/demo-listings";
import { normalizePropertyType } from "../lib/propertyType";

export interface ListingProvider {
  searchListings(criteria: Criteria): Promise<ListingSearchResult>;
  getListingById(id: string): Promise<Listing | null>;
}

export class DemoListingProvider implements ListingProvider {
  async searchListings(_criteria: Criteria): Promise<ListingSearchResult> {
    void _criteria;
    return {
      listings: demoListings,
      total: demoListings.length,
      source: "demo",
      fetchedAt: new Date().toISOString(),
      isFallback: false,
    };
  }

  async getListingById(id: string): Promise<Listing | null> {
    return demoListings.find((listing) => listing.id === id) ?? null;
  }
}

export function normalizeListing(x: Record<string, unknown>): Listing | null {
  const id = x.id ?? x.listingId,
    price = Number(x.price);
  if (!id || !Number.isFinite(price) || !x.addressLine1) return null;
  const n = (v: unknown) => (v == null ? undefined : Number(v));
  return {
    id: String(id),
    source: "rentcast",
    sourceLabel: "RentCast",
    isDemo: false,
    addressLine1: String(x.addressLine1),
    city: String(x.city ?? ""),
    state: String(x.state ?? ""),
    zipCode: String(x.zipCode ?? ""),
    price,
    bedrooms: n(x.bedrooms),
    bathrooms: n(x.bathrooms),
    squareFeet: n(x.squareFeet),
    lotSquareFeet: n(x.lotSquareFeet),
    propertyType: normalizePropertyType(x.propertyType),
    yearBuilt: n(x.yearBuilt),
    hoaFeeMonthly: n(x.hoaFeeMonthly),
    daysOnMarket: n(x.daysOnMarket),
    status: x.status ? String(x.status) : undefined,
    listedDate: x.listedDate ? String(x.listedDate) : undefined,
    photoUrls: Array.isArray(x.photoUrls)
      ? x.photoUrls.filter(
          (v) => typeof v === "string" && /^https?:\/\//.test(v),
        )
      : [],
    providerUrl:
      typeof x.providerUrl === "string" && /^https?:\/\//.test(x.providerUrl)
        ? x.providerUrl
        : undefined,
    description: x.description ? String(x.description) : undefined,
  };
}

export class LiveListingProvider implements ListingProvider {
  constructor(private base: string) {}

  async searchListings(criteria: Criteria): Promise<ListingSearchResult> {
    const q = new URLSearchParams({
      limit: "50",
      radius: String(criteria.radius),
    });
    if (criteria.mode === "zip") q.set("zipCode", criteria.zipCode);
    else {
      q.set("city", criteria.city);
      q.set("state", criteria.state);
    }
    const res = await fetch(this.base.replace(/\/$/, "") + "?" + q);
    if (!res.ok)
      throw new Error(
        res.status === 401
          ? "Live provider authentication failed"
          : "Live listing search failed",
      );
    const json = (await res.json()) as {
      listings?: Record<string, unknown>[];
      fetchedAt?: string;
    };
    if (!Array.isArray(json.listings))
      throw new Error("Invalid response from listing service");
    return {
      listings: json.listings
        .map(normalizeListing)
        .filter((v): v is Listing => !!v),
      source: "rentcast",
      fetchedAt: json.fetchedAt ?? new Date().toISOString(),
      isFallback: false,
    };
  }

  async getListingById(_id: string): Promise<Listing | null> {
    void _id;
    return null;
  }
}
