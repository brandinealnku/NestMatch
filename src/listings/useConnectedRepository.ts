import { useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { SupabaseCollaborationRepository } from "../collaboration/SupabaseCollaborationRepository";

export function useConnectedRepository() {
  const { user } = useAuth();
  return useMemo(() => user && supabase ? new SupabaseCollaborationRepository(supabase, user.id) : null, [user]);
}
