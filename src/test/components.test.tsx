import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { DemoNotice } from "../components/DemoNotice";
import { PropertyCard } from "../components/PropertyCard";
import { demoListings } from "../data/demo-listings";
import { defaultCriteria } from "../lib/defaults";
import { calculateMatchScore } from "../scoring/calculateMatchScore";

it("renders property, match reasons, and missing data safely", () => {
  const listing = { ...demoListings[0], squareFeet: undefined };

  render(
    <MemoryRouter>
      <PropertyCard
        listing={listing}
        score={calculateMatchScore(listing, defaultCriteria)}
        onDecide={() => {}}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText(listing.addressLine1)).toBeInTheDocument();
  expect(screen.getByText(/Why it fits/)).toBeInTheDocument();
  expect(screen.getByText(/Unavailable/)).toBeInTheDocument();
});

it.each([
  ["Pass", "pass"],
  ["Maybe", "maybe"],
  ["Love", "love"],
] as const)("supports %s action", (label, expectedDecision) => {
  const onDecide = vi.fn();
  const { getByRole } = render(
    <MemoryRouter>
      <PropertyCard
        listing={demoListings[0]}
        score={calculateMatchScore(demoListings[0], defaultCriteria)}
        onDecide={onDecide}
      />
    </MemoryRouter>,
  );

  fireEvent.click(
    getByRole("button", {
      name: new RegExp(label, "i"),
    }),
  );

  expect(onDecide).toHaveBeenCalledTimes(1);
  expect(onDecide).toHaveBeenCalledWith(expectedDecision);
});

it("labels demo mode", () => {
  render(<DemoNotice />);
  expect(screen.getByText("Demo Mode")).toBeInTheDocument();
  expect(screen.getByText(/fictional/)).toBeInTheDocument();
});
