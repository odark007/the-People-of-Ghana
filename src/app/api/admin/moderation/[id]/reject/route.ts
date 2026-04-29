// POST /api/admin/moderation/[id]/reject
// Rejects content. If a report, also deletes its image from Supabase Storage.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { deleteReportImage } from "@/lib/storage";
import { apiError, apiSuccess } from "@/types";

const rejectSchema = z.object({
  notes: z.string().min(1, "Rejection reason is required").max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user || !profile || !["admin","superadmin"].includes(profile.role)) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Admin access required"),
      { status: 403 }
    );
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Rejection reason required", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Get queue item
  const { data: item, error: fetchError } = await supabase
    .from("moderation_queue")
    .select("content_type, content_id")
    .eq("id", params.id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Queue item not found"),
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  if (item.content_type === "report") {
    // Fetch image_url before updating status
    const { data: report } = await supabase
      .from("reports")
      .select("image_url")
      .eq("id", item.content_id)
      .single();

    // Mark report as rejected
    await supabase
      .from("reports")
      .update({ status: "rejected" })
      .eq("id", item.content_id);

    // Delete image from Supabase Storage
    if (report?.image_url) {
      try {
        // Extract storage path from public URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/report-images/reports/userId/uuid.jpg
        const url      = new URL(report.image_url);
        const segments = url.pathname.split("/report-images/");
        if (segments[1]) {
          await deleteReportImage(segments[1]);
        }
      } catch (err) {
        // Log but don't fail the rejection if image delete fails
        console.error("[reject] Failed to delete image from storage:", err);
      }
    }
  } else if (item.content_type === "post") {
    await supabase
      .from("posts")
      .update({ status: "rejected" })
      .eq("id", item.content_id);
  }

  // Update moderation queue entry
  await supabase
    .from("moderation_queue")
    .update({
      status:       "rejected",
      reviewed_by:  user.id,
      reviewed_at:  now,
      review_notes: parsed.data.notes,
    })
    .eq("id", params.id);

  return NextResponse.json(apiSuccess({ rejected: true }));
}