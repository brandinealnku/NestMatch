import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "../auth/AuthProvider";
import { AuthChoices } from "../components/auth/AuthChoices";
import { SettingsPage } from "../pages/SettingsPage";

const { auth } = vi.hoisted(() => ({ auth: {} as AuthContextValue }));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => auth }));

const fillEmail = (value = " User@Example.COM ") => fireEvent.change(screen.getByLabelText("Email"), { target: { value } });
const fillPassword = (value = "safe-pass-123") => fireEvent.change(screen.getByLabelText("Password"), { target: { value } });

describe("password authentication fallback", () => {
  beforeEach(() => {
    sessionStorage.clear(); localStorage.clear();
    Object.assign(auth, {
      isConfigured: true, enabledProviders: { apple: false, google: false }, isLoading: false, activeAction: null, authError: "", user: null, profile: null,
      signInWithGoogle: vi.fn(), signInWithApple: vi.fn(), signInWithMagicLink: vi.fn(), signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn().mockResolvedValue({ requiresEmailConfirmation: false }), updatePassword: vi.fn(), clearAuthError: vi.fn(), signOut: vi.fn(), refreshProfile: vi.fn(), saveProfile: vi.fn(),
    });
  });
  it("signs an existing user in with a password without sending email", async () => {
    render(<AuthChoices />); fillEmail(); fillPassword(); fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith(" User@Example.COM ", "safe-pass-123"));
    expect(auth.signInWithMagicLink).not.toHaveBeenCalled();
  });
  it("shows a sanitized invalid-credential message", async () => {
    vi.mocked(auth.signInWithPassword).mockRejectedValue(new Error("We could not sign you in. Check your email and password."));
    render(<AuthChoices />); fillEmail(); fillPassword(); fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Check your email and password");
    expect(screen.getByRole("alert")).not.toHaveTextContent("supabase.co");
  });
  it("validates confirmation and reports sign-up confirmation honestly", async () => {
    vi.mocked(auth.signUpWithPassword).mockResolvedValue({ requiresEmailConfirmation: true }); render(<AuthChoices />);
    fireEvent.click(screen.getByRole("tab", { name: "Create account" })); fillEmail(); fillPassword();
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different-pass" } }); fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords must match"); expect(auth.signUpWithPassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "safe-pass-123" } }); fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/Check your email to confirm/)).toBeInTheDocument();
  });
  it("allows immediate-session sign-up and keeps Magic Link available", async () => {
    render(<AuthChoices />); expect(screen.getByRole("button", { name: "Email me a Magic Link instead" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Create account" })); fillEmail(); fillPassword(); fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "safe-pass-123" } }); fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(auth.signUpWithPassword).toHaveBeenCalled()); expect(screen.queryByText(/Check your email to confirm/)).not.toBeInTheDocument();
  });
  it("does not let a Magic Link rate limit block password sign-in", async () => {
    vi.mocked(auth.signInWithMagicLink).mockRejectedValue(new Error("Email delivery is temporarily limited. You can still sign in with your password.")); render(<AuthChoices />);
    fireEvent.click(screen.getByRole("button", { name: "Email me a Magic Link instead" })); fillEmail(); fireEvent.click(screen.getByRole("button", { name: "Email me a Magic Link" })); expect(await screen.findByRole("alert")).toHaveTextContent("temporarily limited");
    fireEvent.click(screen.getByRole("button", { name: "Use email and password instead" })); fillPassword(); fireEvent.click(screen.getByRole("button", { name: "Sign in" })); await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalled());
  });
  it("controls OAuth with flags and preserves a pending invitation", async () => {
    auth.enabledProviders = { apple: false, google: true }; render(<AuthChoices pendingInvite="private_invite" />);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Continue with Apple" })).not.toBeInTheDocument();
    fillEmail(); fillPassword(); fireEvent.click(screen.getByRole("button", { name: "Sign in" })); await waitFor(() => expect(sessionStorage.length).toBe(1)); expect(localStorage.length).toBe(0);
  });
  it("lets an authenticated user change a confirmed password without persisting or logging it", async () => {
    auth.user = { id: "user-1", email: "user@example.com" }; const log = vi.spyOn(console, "log"); render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-safe-pass" } }); fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-safe-pass" } }); fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith("new-safe-pass")); expect(screen.getByRole("status")).toHaveTextContent("updated"); expect(JSON.stringify(localStorage)).not.toContain("new-safe-pass"); expect(log).not.toHaveBeenCalled(); log.mockRestore();
  });
});
