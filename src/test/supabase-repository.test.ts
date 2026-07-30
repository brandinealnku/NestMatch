import { describe, expect, it } from "vitest";
import {
  isCriteria,
  isListing,
  toHouseMatch,
  toSearchGroup,
  toUserNotification,
  toUserSwipe,
} from "../collaboration/SupabaseCollaborationRepository";
import type { Json } from "../types/database.types";

describe("typed Supabase row mapping", () => {
  it("maps a selected search-group row to the domain contract", () => {
    expect(toSearchGroup({ id: "group-1", name: "Our Home Search" })).toEqual({
      id: "group-1",
      name: "Our Home Search",
      partnerName: "Partner",
    });
  });

  it.each(["pass", "maybe", "love"] as const)("maps the %s swipe decision", (decision) => {
    expect(toUserSwipe({ listing_id: "home-1", decision, updated_at: "2026-07-30T00:00:00Z" })).toEqual({
      listingId: "home-1",
      decision,
      savedAt: "2026-07-30T00:00:00Z",
    });
  });

  it.each([["active", false], ["archived", true]] as const)("maps %s match status", (status, archived) => {
    expect(toHouseMatch({ id: "match-1", group_id: "group-1", listing_id: "home-1", created_at: "now", status }).archived).toBe(archived);
  });

  it("maps notifications through their typed match relationship", () => {
    const notification = toUserNotification(
      { id: "notice-1", group_id: "group-1", match_id: "match-1", created_at: "now", read_at: null },
      new Map([["match-1", "home-1"]]),
    );
    expect(notification).toEqual({ id: "notice-1", groupId: "group-1", matchId: "match-1", listingId: "home-1", createdAt: "now", readAt: undefined });
  });

  it("does not invent relationship IDs for malformed notifications", () => {
    expect(toUserNotification(
      { id: "notice-1", group_id: "group-1", match_id: null, created_at: "now", read_at: null },
      new Map(),
    )).toBeUndefined();
  });
});

describe("database JSON validation", () => {
  it("rejects malformed criteria", () => {
    const malformed: Json = { mode: "spaceship", maxPrice: "a lot" };
    expect(isCriteria(malformed)).toBe(false);
  });

  it("rejects malformed listing snapshots", () => {
    const malformed: Json = {
      id: "home-1",
      source: "demo",
      sourceLabel: "Demo",
      isDemo: true,
      addressLine1: "1 Main St",
      city: "Cincinnati",
      state: "OH",
      zipCode: "45202",
      price: 300000,
      propertyType: "Castle",
      photoUrls: [],
    };
    expect(isListing(malformed)).toBe(false);
  });
});
