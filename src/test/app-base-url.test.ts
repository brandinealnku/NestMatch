import { describe, expect, it, vi } from "vitest";
import { appBaseUrl, requestMagicLink } from "../lib/supabase";

describe("appBaseUrl", () => {
  it.each([
    ["GitHub Pages homepage", "https://brandinealnku.github.io/NestMatch/"],
    ["GitHub Pages with query", "https://brandinealnku.github.io/NestMatch/?v=04"],
    ["GitHub Pages HashRouter route", "https://brandinealnku.github.io/NestMatch/#/sign-in"],
    ["GitHub Pages callback", "https://brandinealnku.github.io/NestMatch/?code=test-code#/groups"],
    ["nested application route", "https://brandinealnku.github.io/NestMatch/groups/current?code=test-code#/groups"],
  ])("returns the application root for the %s", (_name, currentUrl) => {
    expect(appBaseUrl("/NestMatch/", currentUrl)).toBe("https://brandinealnku.github.io/NestMatch/");
  });

  it("returns the local development root", () => {
    expect(appBaseUrl("/", "http://localhost:5173/#/sign-in")).toBe("http://localhost:5173/");
  });

  it("resolves a relative base from the current document without retaining callback state", () => {
    expect(appBaseUrl("./", "https://brandinealnku.github.io/NestMatch/?code=test-code#/groups")).toBe("https://brandinealnku.github.io/NestMatch/");
  });
});

it("passes the application root as the Magic Link email redirect", async () => {
  const signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: null });

  await requestMagicLink({ signInWithOtp }, "  person@example.com  ");

  expect(signInWithOtp).toHaveBeenCalledWith({
    email: "person@example.com",
    options: { emailRedirectTo: appBaseUrl() },
  });
});
