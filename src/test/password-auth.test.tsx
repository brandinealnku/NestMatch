import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "../auth/AuthProvider";
import { AuthChoices } from "../components/auth/AuthChoices";
import { SettingsPage } from "../pages/SettingsPage";

const { auth } = vi.hoisted(() => ({ auth: {} as AuthContextValue }));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => auth }));

const createMockAuth = (): AuthContextValue => ({
  isConfigured: true,
  enabledProviders: { apple: false, google: false },
  isLoading: false,
  activeAction: null,
  authError: "",
  user: null,
  profile: null,
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
  signInWithApple: vi.fn().mockResolvedValue(undefined),
  signInWithMagicLink: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  signUpWithPassword: vi.fn().mockResolvedValue({ requiresEmailConfirmation: false }),
  updatePassword: vi.fn().mockResolvedValue(undefined),
  clearAuthError: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
  saveProfile: vi.fn().mockResolvedValue(undefined),
});

describe("password authentication fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    Object.assign(auth, createMockAuth());
  });

  it("signs an existing user in with a password without sending email", async () => {
    const user = userEvent.setup();
    render(<AuthChoices />);

    await user.type(screen.getByLabelText(/^email$/i), " User@Example.COM ");
    await user.type(screen.getByLabelText(/^password$/i), "safe-pass-123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(auth.signInWithPassword).toHaveBeenCalledWith(" User@Example.COM ", "safe-pass-123");
    expect(auth.signInWithMagicLink).not.toHaveBeenCalled();
  });

  it("shows a sanitized invalid-credential message", async () => {
    const user = userEvent.setup();
    vi.mocked(auth.signInWithPassword).mockRejectedValue(
      new Error("We could not sign you in. Check your email and password."),
    );
    render(<AuthChoices />);

    await user.type(screen.getByLabelText(/^email$/i), "User@Example.COM");
    await user.type(screen.getByLabelText(/^password$/i), "safe-pass-123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Check your email and password");
    expect(screen.getByRole("alert")).not.toHaveTextContent("supabase.co");
  });

  it("blocks a mismatched confirmation and reports required email confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(auth.signUpWithPassword).mockResolvedValue({ requiresEmailConfirmation: true });
    render(<AuthChoices />);

    await user.click(screen.getByRole("tab", { name: /^create account$/i }));
    await user.type(screen.getByLabelText(/^email$/i), "User@Example.COM");
    await user.type(screen.getByLabelText(/^password$/i), "safe-pass-123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "different-pass");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords must match");
    expect(auth.signUpWithPassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^confirm password$/i));
    await user.type(screen.getByLabelText(/^confirm password$/i), "safe-pass-123");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Check your email to confirm");
    expect(auth.signUpWithPassword).toHaveBeenCalledWith("User@Example.COM", "safe-pass-123");
  });

  it("allows immediate-session sign-up and keeps Magic Link available", async () => {
    const user = userEvent.setup();
    render(<AuthChoices />);

    expect(screen.getByRole("button", { name: /^email me a magic link instead$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /^create account$/i }));
    await user.type(screen.getByLabelText(/^email$/i), "User@Example.COM");
    await user.type(screen.getByLabelText(/^password$/i), "safe-pass-123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "safe-pass-123");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(auth.signUpWithPassword).toHaveBeenCalledWith("User@Example.COM", "safe-pass-123");
    expect(screen.queryByText(/Check your email to confirm/i)).not.toBeInTheDocument();
  });

  it("does not let a Magic Link delivery failure block password sign-in", async () => {
    const user = userEvent.setup();
    vi.mocked(auth.signInWithMagicLink).mockRejectedValue(
      new Error("Email delivery is temporarily limited. You can still sign in with your password."),
    );
    render(<AuthChoices />);

    await user.click(screen.getByRole("button", { name: /^email me a magic link instead$/i }));
    await user.type(screen.getByLabelText(/^email$/i), "User@Example.COM");
    await user.click(screen.getByRole("button", { name: /^email me a magic link$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("temporarily limited");

    await user.click(screen.getByRole("button", { name: /^use email and password instead$/i }));
    await user.type(screen.getByLabelText(/^password$/i), "safe-pass-123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(auth.signInWithPassword).toHaveBeenCalledWith("User@Example.COM", "safe-pass-123");
  });

  it("controls OAuth with flags and preserves a pending invitation", async () => {
    const user = userEvent.setup();
    auth.enabledProviders = { apple: false, google: true };
    render(<AuthChoices pendingInvite="private_invite" />);

    expect(screen.getByRole("button", { name: /^continue with google$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^continue with apple$/i })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^email$/i), "User@Example.COM");
    await user.type(screen.getByLabelText(/^password$/i), "safe-pass-123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(sessionStorage.length).toBe(1));
    expect(localStorage.length).toBe(0);
  });

  it("lets an authenticated user change a confirmed password without persisting or logging it", async () => {
    const user = userEvent.setup();
    auth.user = { id: "user-1", email: "user@example.com" };
    const log = vi.spyOn(console, "log");
    render(<SettingsPage />);

    await user.type(screen.getByLabelText(/^new password$/i), "new-safe-pass");
    await user.type(screen.getByLabelText(/^confirm new password$/i), "new-safe-pass");
    await user.click(screen.getByRole("button", { name: /^update password$/i }));

    expect(auth.updatePassword).toHaveBeenCalledWith("new-safe-pass");
    expect(await screen.findByRole("status")).toHaveTextContent("updated");
    expect(JSON.stringify(localStorage)).not.toContain("new-safe-pass");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
