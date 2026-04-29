// ─────────────────────────────────────────────────────────────────────────────
// Anonymization Engine — People of Ghana
//
// All identity and privacy logic. No phone hashing — auth uses email via
// Supabase Auth which handles credentials. We handle GPS, pseudonyms, EXIF.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnonymityLevel, GpsCoordinates, User } from "@/types";
import { ANONYMITY_CONFIGS } from "@/types";

// ── GPS precision ─────────────────────────────────────────────────────────────

/**
 * Round GPS coordinates based on anonymity level.
 * All levels currently round to 3dp (~111m). Exact GPS is NEVER persisted.
 */
export function anonymizeGps(
  coords: GpsCoordinates,
  level: AnonymityLevel
): GpsCoordinates {
  const precision = ANONYMITY_CONFIGS[level].gps_precision;
  const factor = Math.pow(10, precision);
  return {
    latitude:  Math.round(coords.latitude  * factor) / factor,
    longitude: Math.round(coords.longitude * factor) / factor,
  };
}

// ── Pseudonym generation ──────────────────────────────────────────────────────

const ADJECTIVES = [
  "Red", "Gold", "Green", "Bold", "Swift", "Bright", "Strong",
  "Keen", "Proud", "Free", "Brave", "Calm", "Clear", "Deep", "Fair",
  "Firm", "Wise", "True", "Pure", "Sharp",
];

const NOUNS = [
  "Eagle", "River", "Star", "Lion", "Palm", "Drum", "Kente",
  "Baobab", "Cocoa", "Volta", "Adoma", "Akoma", "Ananse", "Okyeame",
  "Sankofa", "Asante", "Fante", "Ewe", "Akan", "Dagbon",
];

/** Generate a stable pseudonym for L2 users. Format: AdjectiveNoun_NN */
export function generatePseudonym(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 90) + 10; // 10–99
  return `${adj}${noun}_${num}`;
}

// ── Public name resolution ────────────────────────────────────────────────────

/** Derive display name from anonymity level. Mirrors the DB trigger. */
export function resolvePublicName(
  user: Pick<User, "anonymity_level" | "display_name" | "pseudonym">
): string {
  switch (user.anonymity_level) {
    case "L3": return user.display_name ?? "Citizen";
    case "L2": return user.pseudonym    ?? "Anonymous Citizen";
    default:   return "Anonymous Citizen";
  }
}

// ── Report attribution ────────────────────────────────────────────────────────

/** What to show as the reporter in feed cards */
export function getReporterAttribution(
  publicName: string,
  level: AnonymityLevel,
  districtName?: string
): string {
  if (level === "L1") return districtName ? `Citizen from ${districtName}` : "Anonymous Citizen";
  return publicName;
}

// ── Consent ───────────────────────────────────────────────────────────────────

export const CURRENT_CONSENT_VERSION = 1;
export const ERASED_PUBLIC_NAME = "Deleted Citizen";

// ── EXIF stripping ────────────────────────────────────────────────────────────

/**
 * Strip EXIF metadata from an image buffer using Sharp.
 * SERVER-SIDE ONLY. Removes GPS, device model, timestamp, camera settings.
 * Returns a clean JPEG buffer.
 */
export async function stripExifAndResize(
  buffer: Buffer,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { maxWidth = 1200, maxHeight = 1200, quality = 80 } = options;

  return sharp(buffer)
    .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality })
    // NOT calling .withMetadata() — this is how Sharp strips EXIF
    .toBuffer();
}
