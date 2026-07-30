export type SocialProvider = "apple" | "google";

interface OAuthAuthClient {
  signInWithOAuth(input: { provider: SocialProvider; options: { redirectTo: string } }): Promise<{ error: unknown }>;
}

export const oauthRedirectUrl = (location: Pick<Location, "origin">, baseUrl: string) =>
  new URL(baseUrl, `${location.origin}/`).toString();

export async function startOAuth(auth: OAuthAuthClient, provider: SocialProvider, redirectTo: string) {
  const { error } = await auth.signInWithOAuth({ provider, options: { redirectTo } });
  if (error) throw new Error("We could not start that sign-in. Please try another method.");
}

export const safeProviderName = (value: SocialProvider) => value === "apple" ? "Apple" : "Google";
