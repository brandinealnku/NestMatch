import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListingImage } from "../components/ListingImage";
import { validateLocation } from "../pages/GroupSearchPage";
import type { Listing } from "../types/models";

const connected: Listing = { id: "rentcast:stable", source: "rentcast", sourceLabel: "RentCast", isDemo: false, addressLine1: "1 Main Street", city: "Cincinnati", state: "OH", zipCode: "45202", price: 350000, photoUrls: [] };

describe("Phase 3A listing search", () => {
  it("validates editable city/state and ZIP locations", () => {
    expect(validateLocation("city", "Cincinnati", "OH", "")).toBe(true);
    expect(validateLocation("city", "Cincinnati", "Ohio", "")).toBe(false);
    expect(validateLocation("zip", "", "", "45245")).toBe(true);
    expect(validateLocation("zip", "", "", "4524")).toBe(false);
  });

  it("shows a branded placeholder when no provider image exists", () => {
    render(<ListingImage listing={connected} />);
    expect(screen.getByRole("img", { name: /property placeholder for 1 Main Street/i })).toBeInTheDocument();
  });

  it("recovers when a normalized image URL expires", () => {
    render(<ListingImage listing={{ ...connected, photoUrls: ["https://example.test/home.jpg"] }} />);
    fireEvent.error(screen.getByRole("img", { name: /property photo 1/i }));
    expect(screen.getByRole("img", { name: /property placeholder/i })).toBeInTheDocument();
  });
});
