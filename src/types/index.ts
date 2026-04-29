// ─────────────────────────────────────────────────────────────────────────────
// Core domain types — People of Ghana
// These mirror the DB schema and are used across all modules.
// Run `npm run db:generate-types` to regenerate database.ts from Supabase.
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type AnonymityLevel = "L1" | "L2" | "L3";
export type DistrictType = "district" | "municipal" | "metropolitan";
export type OfficialRole = "regional_minister" | "mp" | "mmdce" | "assembly_member";
export type VerificationStatus = "verified" | "unverified" | "pending";
export type ReportCategory =
  | "road" | "water" | "sanitation" | "electricity"
  | "health" | "education" | "security" | "environment" | "other";
export type ContentStatus = "pending" | "published" | "in_progress" | "resolved" | "rejected";
export type ContentType = "report" | "post" | "official";
export type UserRole = "user" | "admin" | "superadmin";

// ── Anonymization ─────────────────────────────────────────────────────────────

export interface AnonymityConfig {
  level: AnonymityLevel;
  /** What is displayed in the UI for this user's level */
  label: string;
  /** Short description shown in the consent modal */
  description: string;
  /** GPS precision: number of decimal places (3 = ~111m, 5 = ~1m) */
  gps_precision: 3 | 5;
  /** Whether location is shown in feed */
  show_location: boolean;
}

export const ANONYMITY_CONFIGS: Record<AnonymityLevel, AnonymityConfig> = {
  L1: {
    level: "L1",
    label: "Fully Anonymous",
    description: "Your reports show only your district. No name or identifier is shown. Location is rounded to ~100m.",
    gps_precision: 3,
    show_location: false,
  },
  L2: {
    level: "L2",
    label: "Pseudonym",
    description: "Your reports show a system-assigned name (e.g. 'RedEagle_42'). Consistent across sessions but not linked to your identity.",
    gps_precision: 3,
    show_location: true,
  },
  L3: {
    level: "L3",
    label: "Display Name",
    description: "Your reports show the name you choose. Your location is shown at district level.",
    gps_precision: 3,
    show_location: true,
  },
};

// ── User ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  anonymity_level: AnonymityLevel;
  pseudonym: string | null;
  display_name: string | null;
  public_name: string;          // computed, use this in UI always
  is_verified: boolean;
  role: UserRole;
  consent_given_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Safe user shape — no PII, safe to pass to client components */
export interface PublicUser {
  id: string;
  public_name: string;
  anonymity_level: AnonymityLevel;
  is_verified: boolean;
  role: UserRole;
}

// ── Governance ────────────────────────────────────────────────────────────────

export interface Region {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Constituency {
  id: string;
  name: string;
  region_id: string;
  region?: Region;
  created_at: string;
}

export interface District {
  id: string;
  name: string;
  constituency_id: string;
  constituency?: Constituency;
  type: DistrictType;
  created_at: string;
}

export interface ElectoralArea {
  id: string;
  name: string;
  district_id: string;
  district?: District;
  created_at: string;
}

/** Full hierarchy breadcrumb, used in directory browsing */
export interface JurisdictionBreadcrumb {
  region?: Region;
  constituency?: Constituency;
  district?: District;
  electoral_area?: ElectoralArea;
}

// ── Officials ─────────────────────────────────────────────────────────────────

export interface Official {
  id: string;
  full_name: string;
  role: OfficialRole;
  region_id: string | null;
  constituency_id: string | null;
  district_id: string | null;
  electoral_area_id: string | null;
  phone: string | null;
  email: string | null;
  office_address: string | null;
  photo_url: string | null;
  verification_status: VerificationStatus;
  term_start: string | null;
  term_end: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  region?: Region;
  constituency?: Constituency;
  district?: District;
  electoral_area?: ElectoralArea;
}

export const OFFICIAL_ROLE_LABELS: Record<OfficialRole, string> = {
  regional_minister: "Regional Minister",
  mp: "Member of Parliament",
  mmdce: "District / Municipal / Metropolitan Chief Executive",
  assembly_member: "Assembly Member",
};

// ── Reports ───────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: ReportCategory;
  image_url: string;
  latitude: number;
  longitude: number;
  region_id: string | null;
  constituency_id: string | null;
  district_id: string | null;
  electoral_area_id: string | null;
  reporter_anonymity_level: AnonymityLevel;
  reporter_public_name: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  // Joined
  region?: Region;
  district?: District;
}

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  road: "Roads & Infrastructure",
  water: "Water",
  sanitation: "Sanitation",
  electricity: "Electricity",
  health: "Healthcare",
  education: "Education",
  security: "Security",
  environment: "Environment",
  other: "Other",
};

// ── Posts ─────────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  region_id: string | null;
  district_id: string | null;
  poster_anonymity_level: AnonymityLevel;
  poster_public_name: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

// ── Moderation ────────────────────────────────────────────────────────────────

export interface ModerationItem {
  id: string;
  content_type: ContentType;
  content_id: string;
  status: ContentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function apiError(
  code: string,
  message: string,
  details?: unknown
): ApiError {
  return { data: null, error: { code, message, details } };
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface SessionPayload {
  sub: string;           // user.id
  role: UserRole;
  anonymity: AnonymityLevel;
  iat: number;
  exp: number;
}

// ── GPS ───────────────────────────────────────────────────────────────────────

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

/** Rounds GPS to the precision appropriate for the user's anonymity level */
export function roundGps(
  coords: GpsCoordinates,
  level: AnonymityLevel
): GpsCoordinates {
  const precision = ANONYMITY_CONFIGS[level].gps_precision;
  const factor = Math.pow(10, precision);
  return {
    latitude: Math.round(coords.latitude * factor) / factor,
    longitude: Math.round(coords.longitude * factor) / factor,
  };
}
