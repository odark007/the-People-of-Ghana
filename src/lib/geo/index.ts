// ─────────────────────────────────────────────────────────────────────────────
// Geo Library — People of Ghana
//
// Resolves GPS coordinates to the governance hierarchy:
//   GPS → Electoral Area → District → Constituency → Region
//
// MVP approach: we store a lat/lng bounding box per district in a
// district_boundaries table (added in migration 002). For MVP without
// boundaries data, we fall back to asking the user to select their area
// manually from the hierarchy picker.
//
// The anonymizeGps() call MUST happen before any DB write — coordinates
// are rounded here before jurisdicition lookup.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/client";
import { anonymizeGps } from "@/lib/anonymization";
import type { AnonymityLevel, GpsCoordinates, JurisdictionBreadcrumb } from "@/types";

export interface ResolvedJurisdiction extends JurisdictionBreadcrumb {
  /** Rounded coordinates — safe to store */
  latitude: number;
  longitude: number;
}

/**
 * Resolve GPS coordinates to governance jurisdiction.
 *
 * Phase 2 MVP: Uses a simple point-in-bounding-box query.
 * Phase 4+: Replace with PostGIS ST_Contains for accurate boundaries.
 *
 * Always anonymizes GPS before returning — coordinates in the result
 * are already rounded and safe to write to the DB.
 */
export async function resolveJurisdiction(
  rawCoords: GpsCoordinates,
  anonymityLevel: AnonymityLevel
): Promise<ResolvedJurisdiction> {
  // Step 1: Anonymize first — never work with exact GPS after this point
  const coords = anonymizeGps(rawCoords, anonymityLevel);

  const supabase = createAdminClient();

  // Step 2: Find district by bounding box (requires district_boundaries table from migration 002)
  // Falls back gracefully to null if table doesn't exist yet
  const { data: boundary } = await supabase
    .from("district_boundaries")
    .select(`
      district_id,
      district:districts(
        id, name, type,
        constituency:constituencies(
          id, name,
          region:regions(id, name, code)
        )
      )
    `)
    .lte("min_lat", coords.latitude)
    .gte("max_lat", coords.latitude)
    .lte("min_lng", coords.longitude)
    .gte("max_lng", coords.longitude)
    .limit(1)
    .maybeSingle();

  if (boundary?.district) {
    const d = boundary.district as any;
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      district: d,
      constituency: d.constituency,
      region: d.constituency?.region,
    };
  }

  // No boundary match — return rounded coords with no jurisdiction
  // UI will show manual jurisdiction picker
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

/**
 * Build a human-readable location string from a jurisdiction.
 * Used in report cards and feed.
 */
export function formatJurisdiction(jurisdiction: Partial<JurisdictionBreadcrumb>): string {
  const parts: string[] = [];
  if (jurisdiction.electoral_area?.name) parts.push(jurisdiction.electoral_area.name);
  if (jurisdiction.district?.name) parts.push(jurisdiction.district.name);
  if (jurisdiction.region?.name) parts.push(jurisdiction.region.name);
  return parts.join(", ") || "Ghana";
}
