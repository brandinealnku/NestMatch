import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultCriteria } from "../lib/defaults";
import { NewGroupPage } from "../pages/NewGroupPage";
import { ConnectedGroupsPage } from "../pages/ConnectedGroupsPage";
import { GroupSearchPage } from "../pages/GroupSearchPage";

let repository: Record<string, ReturnType<typeof vi.fn>>;
vi.mock("../listings/useConnectedRepository", () => ({ useConnectedRepository: () => repository }));

beforeEach(() => {
  repository = {
    createGroup: vi.fn(), listGroups: vi.fn(), getGroup: vi.fn(), getCachedInventory: vi.fn(), searchListings: vi.fn(),
  };
});

describe("authenticated shared-search creation", () => {
  it("requires a name and prevents duplicate submission before routing to criteria", async () => {
    let resolve!: (value: { id: string; name: string; partnerName: string }) => void;
    repository.createGroup.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<MemoryRouter initialEntries={["/groups/new"]}><Routes><Route path="groups/new" element={<NewGroupPage />} /><Route path="groups/:groupId/search" element={<h1>Criteria destination</h1>} /></Routes></MemoryRouter>);
    const name = screen.getByLabelText(/search name/i);
    fireEvent.change(name, { target: { value: "   " } }); fireEvent.click(screen.getByRole("button", { name: /create shared search/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a name"); expect(repository.createGroup).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: " River homes " } }); const button = screen.getByRole("button", { name: /create shared search/i }); fireEvent.click(button); fireEvent.click(button);
    expect(repository.createGroup).toHaveBeenCalledTimes(1); expect(button).toBeDisabled();
    resolve({ id: "group-123", name: "River homes", partnerName: "Waiting" });
    expect(await screen.findByRole("heading", { name: "Criteria destination" })).toBeInTheDocument();
  });

  it("shows the real empty state and summarizes existing groups", async () => {
    repository.listGroups.mockResolvedValueOnce([]);
    const view = render(<MemoryRouter><ConnectedGroupsPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Create your first shared search" })).toBeInTheDocument();
    view.unmount();
    repository.listGroups.mockResolvedValue([{ id: "g1", name: "Downtown", partnerName: "Partner" }]);
    repository.getGroup.mockResolvedValue({ id: "g1", name: "Downtown", partnerName: "Sam", criteria: defaultCriteria, memberCount: 1, currentUserRole: "owner" });
    repository.getCachedInventory.mockResolvedValue({ listings: [], fetchedAt: undefined });
    render(<MemoryRouter><ConnectedGroupsPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Downtown" })).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument(); expect(screen.getByText(/1 of 2 members/i)).toBeInTheDocument();
  });

  it("lets only owners invoke the connected listing-search adapter", async () => {
    repository.getGroup.mockResolvedValue({ id: "g1", name: "Search", partnerName: "Sam", criteria: defaultCriteria, currentUserRole: "member" });
    repository.getCachedInventory.mockResolvedValue({ listings: [] });
    const view = render(<MemoryRouter initialEntries={["/groups/g1/search"]}><Routes><Route path="groups/:groupId/search" element={<GroupSearchPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/only the group owner/i)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: /find active homes/i })).not.toBeInTheDocument();
    view.unmount();
    repository.getGroup.mockResolvedValue({ id: "g1", name: "Search", partnerName: "Sam", criteria: defaultCriteria, currentUserRole: "owner" });
    repository.searchListings.mockResolvedValue({ listings: [{}], total: 1, fetchedAt: "2026-07-31T00:00:00Z", source: "rentcast" });
    render(<MemoryRouter initialEntries={["/groups/g1/search"]}><Routes><Route path="groups/:groupId/search" element={<GroupSearchPage />} /><Route path="groups/:groupId" element={<h1>Dashboard</h1>} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Find active homes" }));
    await waitFor(() => expect(repository.searchListings).toHaveBeenCalledTimes(1));
    expect(repository.searchListings.mock.calls[0][0].location).toEqual({ type: "city", city: "Cincinnati", state: "OH" });
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
