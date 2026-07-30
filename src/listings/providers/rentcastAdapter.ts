import type { Json } from "../../types/supabase-database.types";
import type { Listing } from "../../types/models";
import { isListing } from "../../collaboration/SupabaseCollaborationRepository";

/** Browser-side validation for normalized snapshots only; raw RentCast records stay server-side. */
export const readRentCastSnapshot = (value: Json): Listing | undefined => isListing(value) && value.source === "rentcast" ? value : undefined;
