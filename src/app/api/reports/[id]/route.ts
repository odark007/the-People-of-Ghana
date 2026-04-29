// GET /api/reports/[id]  — single report (public if approved)
// PUT /api/reports/[id]  — update status (admin only)

import { NextRequest, NextResponse } from "next/server";
import { updateReportStatusSchema } from "@/lib/validation";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createServerClient, createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reports")
    .select(`
      id, title, description, category, status, image_url,
      latitude, longitude,
      reporter_public_name, reporter_anonymity_level, created_at, updated_at,
      region:regions(id, name),
      constituency:constituencies(id, name),
      district:districts(id, name, type),
      electoral_area:electoral_areas(id, name)
    `)
    .eq("id", params.id)
    .in("status", ["published", "in_progress", "resolved"])
    .single();

  if (error || !data) {
    return NextResponse.json(apiError("NOT_FOUND", "Report not found"), { status: 404 });
  }

  return NextResponse.json(apiSuccess(data));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin only
  const user = await getAuthUser();
  const profile = await getProfile();

  if (!user || !profile) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Authentication required"), { status: 401 });
  }
  if (!["admin", "superadmin"].includes(profile.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateReportStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid status", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Update report status
  const { error: reportError } = await supabase
    .from("reports")
    .update({ status: parsed.data.status })
    .eq("id", params.id);

  if (reportError) {
    return NextResponse.json(apiError("DB_ERROR", "Failed to update report"), { status: 500 });
  }

  // Update moderation queue entry
  await supabase
    .from("moderation_queue")
    .update({
      status: parsed.data.status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.notes ?? null,
    })
    .eq("content_id", params.id)
    .eq("content_type", "report");

  return NextResponse.json(apiSuccess({ updated: true }));
}
