// GET  /api/admin/officials — all officials
// POST /api/admin/officials — create official

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

async function requireAdmin() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user || !profile || !["admin", "superadmin"].includes(profile.role)) return null;
  return { user, profile };
}

const officialSchema = z.object({
  full_name:           z.string().trim().min(3).max(120),
  role:                z.enum(["regional_minister","mp","mmdce","assembly_member"]),
  verification_status: z.enum(["verified","unverified","pending"]).default("pending"),
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

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const page   = Number(req.nextUrl.searchParams.get("page")  ?? 1);
  const limit  = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const q      = req.nextUrl.searchParams.get("q")  ?? "";
  const role   = req.nextUrl.searchParams.get("role") ?? "";
  const vs     = req.nextUrl.searchParams.get("verification_status") ?? "";
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("officials")
    .select(
      `id, full_name, role, verification_status, photo_url, phone, email,
       office_address, term_start, term_end, created_at,
       region:regions(id,name),
       constituency:constituencies(id,name),
       district:districts(id,name),
       electoral_area:electoral_areas(id,name)`,
      { count: "exact" }
    )
    .order("full_name");

  if (q)    query = query.ilike("full_name", `%${q}%`);
  if (role) query = query.eq("role", role);
  if (vs)   query = query.eq("verification_status", vs);

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", error.message), { status: 500 });
  }

  return NextResponse.json(
    apiSuccess({
      officials: data,
      total:     count ?? 0,
      page,
      limit,
      pages:     Math.ceil((count ?? 0) / limit),
    })
  );
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = officialSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("officials")
    .insert({ ...parsed.data, created_by: admin.user.id })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("DB_ERROR", error?.message ?? "Failed to create"),
      { status: 500 }
    );
  }

  return NextResponse.json(apiSuccess({ id: data.id }), { status: 201 });
}