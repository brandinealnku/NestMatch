import type { NestMatchSupabaseClient } from "../lib/supabase";
import type { ProfileInput } from "./authTypes";

const SAVE_MESSAGE = "We could not save your profile.";

type ProfileSaveFailure = "invalid-session" | "missing-profile" | "rls-denial" | "network" | "database";
type DatabaseError = { code?: string; message?: string };

function reportProfileSaveFailure(kind: ProfileSaveFailure, error?: DatabaseError) {
  if (!import.meta.env.DEV) return;
  console.error("NestMatch profile save failed", {
    kind,
    code: error?.code ?? "unknown",
    message: error?.message ?? "No database message was returned.",
  });
}

function isRlsFailure(error: DatabaseError) {
  return error.code === "42501" || /row.level.security|permission denied/i.test(error.message ?? "");
}

/** Updates the trigger-created row, with a tightly scoped own-row recovery insert. */
export async function saveUserProfile(
  client: NestMatchSupabaseClient,
  userId: string | undefined,
  input: ProfileInput,
) {
  if (!userId) {
    reportProfileSaveFailure("invalid-session");
    throw new Error("Sign in again to save your profile.");
  }

  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("Display name is required.");
  const values = {
    display_name: displayName,
    avatar_color: input.avatarColor || null,
    browser_notifications_enabled: input.browserNotificationsEnabled,
  };

  try {
    const updated = await client
      .from("profiles")
      .update(values)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (updated.error) {
      reportProfileSaveFailure(isRlsFailure(updated.error) ? "rls-denial" : "database", updated.error);
      throw new Error(SAVE_MESSAGE);
    }
    if (updated.data) return;

    reportProfileSaveFailure("missing-profile");
    const recovered = await client.from("profiles").insert({ id: userId, ...values });
    if (recovered.error) {
      reportProfileSaveFailure(isRlsFailure(recovered.error) ? "rls-denial" : "database", recovered.error);
      throw new Error(SAVE_MESSAGE);
    }
  } catch (error) {
    if (error instanceof Error && error.message === SAVE_MESSAGE) throw error;
    reportProfileSaveFailure("network", error instanceof Error ? { message: error.message } : undefined);
    throw new Error(SAVE_MESSAGE);
  }
}
