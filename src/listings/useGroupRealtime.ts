import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";

export function useGroupRealtime(groupId: string, refresh: () => void) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(true);
  const stableRefresh = useCallback(refresh, [refresh]);
  useEffect(() => {
    if (!supabase || !user || !groupId) return;
    const channel = supabase.channel(`group-live:${groupId}:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `group_id=eq.${groupId}` }, stableRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, stableRefresh)
      .subscribe(status => setConnected(status === "SUBSCRIBED"));
    const poll = window.setInterval(stableRefresh, 30_000);
    const resume = () => { if (document.visibilityState === "visible") stableRefresh(); };
    document.addEventListener("visibilitychange", resume);
    return () => { window.clearInterval(poll); document.removeEventListener("visibilitychange", resume); void supabase.removeChannel(channel); };
  }, [groupId, stableRefresh, user]);
  return connected;
}
