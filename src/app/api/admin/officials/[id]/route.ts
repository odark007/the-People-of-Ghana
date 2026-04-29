// GET    /api/admin/officials/[id]
// PUT    /api/admin/officials/[id]
// DELETE /api/admin/officials/[id]

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

const updateSchema = z.object({
  full_name:           z.string().trim().min(3).max(120).optional(),
  role:                z.enum(["regional_minister","mp","mmdce","assembly_member"]).optional(),
  verification_status: z.enum(["verified","unverified","pending"]).optional(),
  region_id:           z.string().uuid().nullable().optional(),
  constituency_id:     z.string().uuid().nullable().optional(),
  district_id:         z.string().uuid().nullable().optional(),
  electoral_area_id:   z.string().uuid().nullable().optional(),
  phone:               z.string().optional(),
  email:               z.string().email().optional().or(z.literal("")),
  office_address:      z.string().max(300).optional(),
  photo_url:           z.string().url().optional().or(z.literal("")),
  term_start:          z.string().optional(),
  term_end:            z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("officials")
    .select(`
      id, full_name, role, verification_status, photo_url,
      phone, email, office_address, term_start, term_end, created_at,
      region:regions(id,name),
      constituency:constituencies(id,name),
      district:districts(id,name),
      electoral_area:electoral_areas(id,name)
    `)
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json(apiError("NOT_FOUND", "Official not found"), { status: 404 });
  }

  return NextResponse.json(apiSuccess(data));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("officials")
    .update(parsed.data)
    .eq("id", params.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("DB_ERROR", error?.message ?? "Update failed"),
      { status: 500 }
    );
  }

  return NextResponse.json(apiSuccess({ updated: true }));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const supabase = createAdminClient();

  // Get photo_url before deleting
  const { data: official } = await supabase
    .from("officials")
    .select("photo_url")
    .eq("id", params.id)
    .single();

  const { error } = await supabase
    .from("officials")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", error.message), { status: 500 });
  }

  // Purge photo from storage if stored internally
  if (official?.photo_url?.includes("supabase.co")) {
    try {
      const url      = new URL(official.photo_url);
      const segments = url.pathname.split("/report-images/");
      if (segments[1]) await deleteReportImage(segments[1]);
    } catch (err) {
      console.error("[admin/officials DELETE] photo purge failed:", err);
    }
  }

  return NextResponse.json(apiSuccess({ deleted: true }));
}