import type { Database } from "./supabase-database.types";

type SearchGroupInsert = Database["public"]["Tables"]["search_groups"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type SwipeInsert = Database["public"]["Tables"]["swipes"]["Insert"];

const validGroupInsert: SearchGroupInsert = { owner_id: "user-id", name: "Our Home Search", criteria: {} };
const validProfileUpdate: ProfileUpdate = { display_name: "Brandi", avatar_color: null, browser_notifications_enabled: false };
const validSwipeInsert: SwipeInsert = { group_id: "group-id", listing_id: "listing-id", user_id: "user-id", decision: "love" };

// @ts-expect-error generated table types reject unknown SQL columns
const unknownColumn: SearchGroupInsert = { owner_id: "user-id", name: "Search", criteria: {}, unknown_column: true };
// @ts-expect-error swipe_decision is constrained by the SQL enum
const invalidDecision: SwipeInsert = { group_id: "group-id", listing_id: "listing-id", user_id: "user-id", decision: "skip" };
// @ts-expect-error owner_id is required by the migration
const missingOwner: SearchGroupInsert = { name: "Search", criteria: {} };
// @ts-expect-error UUID columns are represented as strings
const numericOwner: SearchGroupInsert = { owner_id: 42, name: "Search", criteria: {} };

export const supabaseDatabaseTypeChecks = {
  validGroupInsert,
  validProfileUpdate,
  validSwipeInsert,
  unknownColumn,
  invalidDecision,
  missingOwner,
  numericOwner,
};
