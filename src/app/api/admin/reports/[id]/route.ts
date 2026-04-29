// GET    /api/admin/reports/[id]  — full report detail
// PUT    /api/admin/reports/[id]  — update status
// DELETE /api/admin/reports/[id]  — hard delete + purge image from storage

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { deleteReportImage } from "@/lib/storage";
import { apiError, apiSuccess } from "@/types";

type Params = { params: { id: string } };

async function requireAdmin() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user || !profile || !["admin", "superadmin"].includes(profile.role)) return null;
  return { user, profile };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select(`
      id, title, description, category, status, image_url,
      latitude, longitude, reporter_public_name, reporter_anonymity_level,
      created_at, updated_at, user_id,
      region:regions(id,name),
      constituency:constituencies(id,name),
      district:districts(id,name,type),
      electoral_area:electoral_areas(id,name)
    `)
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json(apiError("NOT_FOUND", "Report not found"), { status: 404 });
  }

  return NextResponse.json(apiSuccess(data));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = z.object({
    status: z.enum(["pending","published","in_progress","resolved","rejected"]),
    notes:  z.string().max(500).optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Invalid status"), { status: 400 });
  }

  const supabase = createAdminClient();

  await supabase
    .from("reports")
    .update({ status: parsed.data.status })
    .eq("id", params.id);

  // Sync moderation queue
  await supabase
    .from("moderation_queue")
    .update({
      status:       parsed.data.status,
      reviewed_by:  admin.user.id,
      reviewed_at:  new Date().toISOString(),
      review_notes: parsed.data.notes ?? null,
    })
    .eq("content_id", params.id)
    .eq("content_type", "report");

  return NextResponse.json(apiSuccess({ updated: true }));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const supabase = createAdminClient();

  // Fetch image_url before deleting
  const { data: report } = await supabase
    .from("reports")
    .select("image_url")
    .eq("id", params.id)
    .single();

  // Delete from moderation queue first (FK constraint)
  await supabase
    .from("moderation_queue")
    .delete()
    .eq("content_id", params.id)
    .eq("content_type", "report");

  // Delete report row
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", error.message), { status: 500 });
  }

  // Purge image from Supabase Storage
  if (report?.image_url) {
    try {
      const url      = new URL(report.image_url);
      const segments = url.pathname.split("/report-images/");
      if (segments[1]) await deleteReportImage(segments[1]);
    } catch (err) {
      console.error("[admin/reports DELETE] image purge failed:", err);
    }
  }

  return NextResponse.json(apiSuccess({ deleted: true }));
}