// GET  /api/officials  — filtered list of officials (public)
// POST /api/officials  — create official (admin only)

import { NextRequest, NextResponse } from "next/server";
import { officialsFiltersSchema, createOfficialSchema } from "@/lib/validation";
import { getSessionFromCookies } from "@/lib/auth";
import { createServerClient, createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams);
    const parsed = officialsFiltersSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "Invalid filters", parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { page, limit, region_id, district_id, electoral_area_id, role, verification_status } =
      parsed.data;
    const offset = (page - 1) * limit;

    const supabase = await createServerClient();

    let query = supabase
      .from("officials")
      .select(
        `id, full_name, role, verification_status, photo_url, term_start, term_end,
         phone, email, office_address,
         region:regions(id, name),
         constituency:constituencies(id, name),
         district:districts(id, name, type),
         electoral_area:electoral_areas(id, name)`,
        { count: "exact" }
      )
      .order("full_name");

    if (region_id) query = query.eq("region_id", region_id);
    if (district_id) query = query.eq("district_id", district_id);
    if (electoral_area_id) query = query.eq("electoral_area_id", electoral_area_id);
    if (role) query = query.eq("role", role);
    if (verification_status) query = query.eq("verification_status", verification_status);

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        apiError("DB_ERROR", "Failed to fetch officials"),
        { status: 500 }
      );
    }

    return NextResponse.json(
      apiSuccess({
        officials: data,
        total: count ?? 0,
        page,
        limit,
        pages: Math.ceil((count ?? 0) / limit),
      }),
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      apiError("SERVER_ERROR", "An unexpected error occurred"),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // ── Admin only ──────────────────────────────────────────────────────────
  const session = await getSessionFromCookies();
  if (!session || !["admin", "superadmin"].includes(session.role)) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Admin access required"),
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createOfficialSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid official data", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // New officials go into moderation queue
  const { data: official, error } = await supabase
    .from("officials")
    .insert({
      ...parsed.data,
      verification_status: "pending",
      created_by: session.sub,
    })
    .select("id")
    .single();

  if (error || !official) {
    return NextResponse.json(
      apiError("DB_ERROR", "Failed to create official"),
      { status: 500 }
    );
  }

  // Add to moderation queue
  await supabase.from("moderation_queue").insert({
    content_type: "official",
    content_id: official.id,
  });

  return NextResponse.json(apiSuccess({ id: official.id }), { status: 201 });
}
