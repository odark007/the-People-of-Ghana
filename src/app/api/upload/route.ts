// POST /api/upload
// Accepts multipart form data with an image file.
// Strips EXIF, resizes, uploads to Supabase Storage.
// Returns the public URL to attach to the report.
// Auth required — must be authenticated to upload.

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { uploadReportImage } from "@/lib/storage";
import { validateImageFile, MAX_IMAGE_SIZE_BYTES } from "@/lib/validation";
import { apiError, apiSuccess } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Authentication required"), { status: 401 });
  }

  // ── Parse multipart form ────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(apiError("INVALID_REQUEST", "Expected multipart form data"), { status: 400 });
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "No image file provided"), { status: 400 });
  }

  // ── Validate ────────────────────────────────────────────────────────────
  const validationError = validateImageFile(file);
  if (validationError) {
    return NextResponse.json(apiError("VALIDATION_ERROR", validationError), { status: 400 });
  }

  // ── Upload (EXIF stripped inside uploadReportImage) ─────────────────────
  try {
    const result = await uploadReportImage(file, user.id);
    return NextResponse.json(apiSuccess({ url: result.url, path: result.path }), { status: 201 });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json(
      apiError("UPLOAD_FAILED", "Image upload failed. Please try again."),
      { status: 500 }
    );
  }
}

// Increase body size limit for image uploads
export const config = {
  api: { bodyParser: false },
};
