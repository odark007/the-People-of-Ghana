// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas — People of Ghana
// All API inputs validated with Zod.
// Auth: email + password only. No phone. No OTP.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const consentSchema = z.object({
  anonymity_level: z.enum(["L1", "L2", "L3"]),
  display_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .optional(),
});

// ── Report ────────────────────────────────────────────────────────────────────

export const createReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Title must be at least 10 characters")
    .max(120, "Title must be at most 120 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
  category: z.enum([
    "road", "water", "sanitation", "electricity",
    "health", "education", "security", "environment", "other",
  ]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  image_url: z.string().url("Invalid image URL"),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(["pending", "published", "in_progress", "resolved", "rejected"]),
  notes: z.string().max(500).optional(),
});

// ── Post ──────────────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(10, "Post must be at least 10 characters")
    .max(1000, "Post must be at most 1000 characters"),
  region_id: z.string().uuid().optional(),
  district_id: z.string().uuid().optional(),
});

// ── Official ──────────────────────────────────────────────────────────────────

export const createOfficialSchema = z.object({
  full_name: z.string().trim().min(3).max(120),
  role: z.enum(["regional_minister", "mp", "mmdce", "assembly_member"]),
  region_id: z.string().uuid().nullable().optional(),
  constituency_id: z.string().uuid().nullable().optional(),
  district_id: z.string().uuid().nullable().optional(),
  electoral_area_id: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  office_address: z.string().max(300).optional(),
  term_start: z.string().date().optional(),
  term_end: z.string().date().optional(),
});

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ── Filters ───────────────────────────────────────────────────────────────────

export const reportFiltersSchema = paginationSchema.extend({
  region_id: z.string().uuid().optional(),
  district_id: z.string().uuid().optional(),
  electoral_area_id: z.string().uuid().optional(),
  category: z.enum([
    "road", "water", "sanitation", "electricity",
    "health", "education", "security", "environment", "other",
  ]).optional(),
  status: z.enum(["pending", "published", "in_progress", "resolved", "rejected"]).optional(),
});

export const officialsFiltersSchema = paginationSchema.extend({
  region_id: z.string().uuid().optional(),
  district_id: z.string().uuid().optional(),
  electoral_area_id: z.string().uuid().optional(),
  role: z.enum(["regional_minister", "mp", "mmdce", "assembly_member"]).optional(),
  verification_status: z.enum(["verified", "unverified", "pending"]).optional(),
});

// ── Search ────────────────────────────────────────────────────────────────────

export const searchSchema = z.object({
  q: z.string().trim().min(2, "Query must be at least 2 characters").max(100),
  type: z.enum(["all", "reports", "officials", "areas"]).default("all"),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

// ── Image ─────────────────────────────────────────────────────────────────────

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Only JPEG, PNG, and WebP images are allowed";
  if (file.size > MAX_IMAGE_SIZE_BYTES) return "Image must be smaller than 10MB";
  return null;
}
