// ─────────────────────────────────────────────────────────────────────────────
// Storage Library — People of Ghana
//
// All image uploads flow through this module.
// EXIF metadata stripped before upload via Sharp.
// Full CRUD: upload, get URL, list, delete.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/client";

const BUCKET = "report-images";

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

// ── Strip EXIF + resize ───────────────────────────────────────────────────────
async function processImage(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    // withMetadata() intentionally NOT called — strips all EXIF
    .toBuffer();
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadReportImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  const arrayBuffer = await file.arrayBuffer();
  const rawBuffer   = Buffer.from(arrayBuffer);
  const cleanBuffer = await processImage(rawBuffer);

  // Never use original filename — may contain PII
  const uuid = crypto.randomUUID();
  const path = `reports/${userId}/${uuid}.jpg`;

  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, cleanBuffer, {
      contentType:  "image/jpeg",
      upsert:       false,
      cacheControl: "public, max-age=31536000, immutable",
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return { url: publicUrl, path, size: cleanBuffer.length };
}

// ── Get public URL ────────────────────────────────────────────────────────────

export function getPublicUrl(path: string): string {
  const supabase = createAdminClient();
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);
  return publicUrl;
}

// ── Delete single image ───────────────────────────────────────────────────────

export async function deleteReportImage(path: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

// ── Delete multiple images ────────────────────────────────────────────────────

export async function deleteReportImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(paths);

  if (error) {
    throw new Error(`Failed to delete images: ${error.message}`);
  }
}

// ── List images for a user ────────────────────────────────────────────────────

export async function listUserImages(userId: string): Promise<{
  name: string;
  path: string;
  url: string;
  size: number;
  created_at: string;
}[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`reports/${userId}`, {
      limit:  100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) throw new Error(`Failed to list images: ${error.message}`);

  return (data ?? []).map((file) => {
    const path = `reports/${userId}/${file.name}`;
    return {
      name:       file.name,
      path,
      url:        getPublicUrl(path),
      size:       file.metadata?.size ?? 0,
      created_at: file.created_at ?? "",
    };
  });
}

// ── List ALL images (admin only) ──────────────────────────────────────────────

export async function listAllImages(prefix = "reports/"): Promise<{
  name: string;
  path: string;
  url: string;
  size: number;
  created_at: string;
}[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, {
      limit:  1000,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) throw new Error(`Failed to list all images: ${error.message}`);

  return (data ?? []).map((file) => {
    const path = `${prefix}${file.name}`;
    return {
      name:       file.name,
      path,
      url:        getPublicUrl(path),
      size:       file.metadata?.size ?? 0,
      created_at: file.created_at ?? "",
    };
  });
}