import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { App } from "../app/App";

beforeEach(() => { localStorage.clear(); window.location.hash = "#/group/demo"; });
it("shows the simulated partner and private decision notice", async () => { render(<App />); expect(await screen.findByText(/Alex is a simulated partner/)).toBeInTheDocument(); expect(screen.getByText(/Alex’s unmatched decisions and progress are never shown/)).toBeInTheDocument(); });
it("creates an accessible celebration and local notification", async () => { window.location.hash = "#/group/demo/discover"; render(<App />); fireEvent.click(await screen.findByRole("button", { name: /Love/i })); const dialog = await screen.findByRole("dialog", { name: /House Match/i }); expect(dialog).toHaveAttribute("aria-modal", "true"); expect(screen.getByText(/You both loved this home/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: /Keep Swiping/i })); await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument()); });
it("provides a Reset Demo control", async () => { render(<App />); expect(await screen.findByRole("button", { name: "Reset Demo" })).toBeInTheDocument(); });
