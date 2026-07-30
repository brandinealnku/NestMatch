import { useState } from "react";
import type { Listing } from "../types/models";
import { HouseArt } from "./HouseArt";

export function ListingImage({ listing, index = 0 }: { listing: Listing; index?: number }) {
  const [failed, setFailed] = useState(false);
  const url = listing.photoUrls[index] ?? listing.imageUrls?.[index];
  if (!url || failed) return <div className="listing-placeholder" role="img" aria-label={`NestMatch property placeholder for ${listing.addressLine1}`}><HouseArt variant={Number(listing.id.replace(/\D/g, ""))} /></div>;
  return <img className="listing-photo" src={url} alt={`${listing.addressLine1}, property photo ${index + 1}`} loading="lazy" onError={() => setFailed(true)} />;
}
