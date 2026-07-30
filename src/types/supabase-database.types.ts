// Generated-style database contract derived from the Phase 2 migration.
// Regenerate this file after schema changes; do not add application models here.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; avatar_color: string | null; browser_notifications_enabled: boolean; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string; avatar_color?: string | null; browser_notifications_enabled?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; display_name?: string; avatar_color?: string | null; browser_notifications_enabled?: boolean; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "profiles_id_fkey"; columns: ["id"]; isOneToOne: true; referencedRelation: "users"; referencedColumns: ["id"] }];
      };
      search_groups: {
        Row: { id: string; owner_id: string; name: string; criteria: Json; status: Database["public"]["Enums"]["group_status"]; max_members: number; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; name: string; criteria: Json; status?: Database["public"]["Enums"]["group_status"]; max_members?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; owner_id?: string; name?: string; criteria?: Json; status?: Database["public"]["Enums"]["group_status"]; max_members?: number; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "search_groups_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }];
      };
      group_members: {
        Row: { group_id: string; user_id: string; role: Database["public"]["Enums"]["member_role"]; status: Database["public"]["Enums"]["member_status"]; joined_at: string; left_at: string | null };
        Insert: { group_id: string; user_id: string; role: Database["public"]["Enums"]["member_role"]; status?: Database["public"]["Enums"]["member_status"]; joined_at?: string; left_at?: string | null };
        Update: { group_id?: string; user_id?: string; role?: Database["public"]["Enums"]["member_role"]; status?: Database["public"]["Enums"]["member_status"]; joined_at?: string; left_at?: string | null };
        Relationships: [
          { foreignKeyName: "group_members_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "search_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "group_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      group_listings: {
        Row: { group_id: string; listing_id: string; listing_snapshot: Json; source: string; fetched_at: string; created_at: string; updated_at: string };
        Insert: { group_id: string; listing_id: string; listing_snapshot: Json; source: string; fetched_at?: string; created_at?: string; updated_at?: string };
        Update: { group_id?: string; listing_id?: string; listing_snapshot?: Json; source?: string; fetched_at?: string; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "group_listings_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "search_groups"; referencedColumns: ["id"] }];
      };
      swipes: {
        Row: { group_id: string; listing_id: string; user_id: string; decision: Database["public"]["Enums"]["swipe_decision"]; created_at: string; updated_at: string };
        Insert: { group_id: string; listing_id: string; user_id: string; decision: Database["public"]["Enums"]["swipe_decision"]; created_at?: string; updated_at?: string };
        Update: { group_id?: string; listing_id?: string; user_id?: string; decision?: Database["public"]["Enums"]["swipe_decision"]; created_at?: string; updated_at?: string };
        Relationships: [
          { foreignKeyName: "swipes_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "search_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "swipes_group_id_listing_id_fkey"; columns: ["group_id", "listing_id"]; isOneToOne: false; referencedRelation: "group_listings"; referencedColumns: ["group_id", "listing_id"] },
          { foreignKeyName: "swipes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      matches: {
        Row: { id: string; group_id: string; listing_id: string; match_type: "love_love"; status: Database["public"]["Enums"]["match_status"]; created_at: string };
        Insert: { id?: string; group_id: string; listing_id: string; match_type?: "love_love"; status?: Database["public"]["Enums"]["match_status"]; created_at?: string };
        Update: { id?: string; group_id?: string; listing_id?: string; match_type?: "love_love"; status?: Database["public"]["Enums"]["match_status"]; created_at?: string };
        Relationships: [
          { foreignKeyName: "matches_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "search_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "matches_group_id_listing_id_fkey"; columns: ["group_id", "listing_id"]; isOneToOne: true; referencedRelation: "group_listings"; referencedColumns: ["group_id", "listing_id"] },
        ];
      };
      notifications: {
        Row: { id: string; user_id: string; group_id: string; match_id: string | null; type: "house_match"; read_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; group_id: string; match_id?: string | null; type: "house_match"; read_at?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; group_id?: string; match_id?: string | null; type?: "house_match"; read_at?: string | null; created_at?: string };
        Relationships: [
          { foreignKeyName: "notifications_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "search_groups"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_match_id_fkey"; columns: ["match_id"]; isOneToOne: false; referencedRelation: "matches"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      match_notes: {
        Row: { id: string; match_id: string; group_id: string; author_id: string; body: string; created_at: string; updated_at: string };
        Insert: { id?: string; match_id: string; group_id: string; author_id: string; body: string; created_at?: string; updated_at?: string };
        Update: { id?: string; match_id?: string; group_id?: string; author_id?: string; body?: string; created_at?: string; updated_at?: string };
        Relationships: [
          { foreignKeyName: "match_notes_match_group_fkey"; columns: ["match_id", "group_id"]; isOneToOne: false; referencedRelation: "matches"; referencedColumns: ["id", "group_id"] },
          { foreignKeyName: "match_notes_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      invitations: {
        Row: { id: string; group_id: string; created_by: string; token_hash: string; expires_at: string; accepted_by: string | null; accepted_at: string | null; revoked_at: string | null; created_at: string };
        Insert: { id?: string; group_id: string; created_by: string; token_hash: string; expires_at?: string; accepted_by?: string | null; accepted_at?: string | null; revoked_at?: string | null; created_at?: string };
        Update: { id?: string; group_id?: string; created_by?: string; token_hash?: string; expires_at?: string; accepted_by?: string | null; accepted_at?: string | null; revoked_at?: string | null; created_at?: string };
        Relationships: [
          { foreignKeyName: "invitations_accepted_by_fkey"; columns: ["accepted_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
          { foreignKeyName: "invitations_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
          { foreignKeyName: "invitations_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "search_groups"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { accept_invite_service: { Args: { hash: string; accepting_user: string }; Returns: string } };
    Enums: { group_status: "active" | "archived"; member_role: "owner" | "member"; member_status: "active" | "left" | "removed"; swipe_decision: "pass" | "maybe" | "love"; match_status: "active" | "archived" };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
