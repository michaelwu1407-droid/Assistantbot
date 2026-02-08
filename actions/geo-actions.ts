"use server";

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface GeocodedDeal {
  id: string;
  title: string;
  contactName: string;
  value: number;
  stage: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

// ─── Geocoding ──────────────────────────────────────────────────────

/**
 * Geocode an address string to lat/lng coordinates.
 * Uses the Nominatim (OpenStreetMap) free geocoding API.
 * For production, swap to Google Maps or Mapbox geocoding API.
 */
async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: { "User-Agent": "PjBuddy/1.0" },
        next: { revalidate: 86400 }, // cache for 24h
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.length === 0) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      formattedAddress: data[0].display_name,
    };
  } catch {
    return null;
  }
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Set or geocode a deal's address.
 * If latitude/longitude are provided, uses them directly.
 * Otherwise, geocodes the address string.
 */
export async function geocodeDeal(
  dealId: string,
  address: string,
  coords?: { latitude: number; longitude: number }
): Promise<{ success: boolean; error?: string }> {
  let latitude = coords?.latitude;
  let longitude = coords?.longitude;

  if (!latitude || !longitude) {
    const result = await geocodeAddress(address);
    if (!result) {
      // Store address even if geocoding fails — can retry later
      await db.deal.update({
        where: { id: dealId },
        data: { address },
      });
      return { success: false, error: "Could not geocode address. Address saved for retry." };
    }
    latitude = result.latitude;
    longitude = result.longitude;
    address = result.formattedAddress;
  }

  await db.deal.update({
    where: { id: dealId },
    data: { address, latitude, longitude },
  });

  return { success: true };
}

/**
 * Get all deals with location data for map display.
 * Only returns deals that have been geocoded (have lat/lng).
 */
export async function getDealsWithLocation(
  workspaceId: string
): Promise<GeocodedDeal[]> {
  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      latitude: { not: null },
      longitude: { not: null },
    },
    include: { contact: true },
  });

  return deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value ? d.value.toNumber() : 0,
    stage: d.stage,
    address: d.address ?? "",
    latitude: d.latitude!,
    longitude: d.longitude!,
    contactName: d.contact.name,
  }));
}

/**
 * Batch geocode all deals that have an address but no coordinates.
 * Useful for backfilling existing deals.
 */
export async function batchGeocode(workspaceId: string): Promise<{
  success: boolean;
  geocoded: number;
  failed: number;
}> {
  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      address: { not: null },
      latitude: null,
    },
  });

  let geocoded = 0;
  let failed = 0;

  for (const deal of deals) {
    if (!deal.address) continue;

    const result = await geocodeAddress(deal.address);
    if (result) {
      await db.deal.update({
        where: { id: deal.id },
        data: {
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.formattedAddress,
        },
      });
      geocoded++;
    } else {
      failed++;
    }

    // Rate limit: Nominatim requires 1 req/sec
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  return { success: true, geocoded, failed };
}
