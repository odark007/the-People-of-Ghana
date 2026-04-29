// GET  /api/reports  — public filtered list
// POST /api/reports  — create report (authenticated)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportFiltersSchema } from "@/lib/validation";
import { getAuthUser, getProfile } from "@/lib/auth";
import { resolveJurisdiction } from "@/lib/geo";
import { createServerClient, createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = reportFiltersSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid filters", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { page, limit, region_id, district_id, electoral_area_id, category, status } = parsed.data;
  const offset = (page - 1) * limit;
  const supabase = await createServerClient();

  let query = supabase
    .from("reports")
    .select(
      `id, title, category, status, image_url, latitude, longitude,
       reporter_public_name, reporter_anonymity_level, created_at,
       region:regions(id,name),
       district:districts(id,name,type),
       electoral_area:electoral_areas(id,name)`,
      { count: "exact" }
    )
    .in("status", status ? [status] : ["published","in_progress","resolved"])
    .order("created_at", { ascending: false });

  if (region_id)         query = query.eq("region_id", region_id);
  if (district_id)       query = query.eq("district_id", district_id);
  if (electoral_area_id) query = query.eq("electoral_area_id", electoral_area_id);
  if (category)          query = query.eq("category", category);

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      apiError("DB_ERROR", "Failed to fetch reports"),
      { status: 500 }
    );
  }

  return NextResponse.json(
    apiSuccess({
      reports: data,
      total:   count ?? 0,
      page,
      limit,
      pages:   Math.ceil((count ?? 0) / limit),
    })
  );
}

// ── POST ──────────────────────────────────────────────────────────────────────
const createReportSchema = z.object({
  title:       z.string().trim().min(10, "Title must be at least 10 characters").max(120),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(2000),
  category:    z.enum([
    "road","water","sanitation","electricity",
    "health","education","security","environment","other",
  ]),
  latitude:    z.number().min(-90).max(90),
  longitude:   z.number().min(-180).max(180),
  image_url:   z.string().url("Invalid image URL — upload via /api/upload first"),
});

export async function POST(req: NextRequest) {
  const user    = await getAuthUser();
  const profile = await getProfile();

  if (!user || !profile) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Authentication required"),
      { status: 401 }
    );
  }
  if (!profile.consent_given_at) {
    return NextResponse.json(
      apiError("CONSENT_REQUIRED", "Complete setup first"),
      { status: 403 }
    );
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = createReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid report data", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { title, description, category, latitude, longitude, image_url } = parsed.data;

  // Resolve jurisdiction from GPS (also anonymizes coordinates)
  const jurisdiction = await resolveJurisdiction(
    { latitude, longitude },
    profile.anonymity_level
  );

  const supabase = createAdminClient();

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      user_id:                  user.id,
      title,
      description,
      category,
      image_url,
      latitude:                 jurisdiction.latitude,
      longitude:                jurisdiction.longitude,
      region_id:                (jurisdiction.region as any)?.id        ?? null,
      constituency_id:          (jurisdiction.constituency as any)?.id  ?? null,
      district_id:              (jurisdiction.district as any)?.id      ?? null,
      electoral_area_id:        (jurisdiction.electoral_area as any)?.id ?? null,
      reporter_anonymity_level: profile.anonymity_level,
      reporter_public_name:     profile.public_name,
      status:                   "pending",
    })
    .select("id")
    .single();

  if (error || !report) {
    console.error("[reports POST]", error?.message);
    return NextResponse.json(
      apiError("DB_ERROR", "Failed to create report"),
      { status: 500 }
    );
  }

  // Add to moderation queue
  await supabase.from("moderation_queue").insert({
    content_type: "report",
    content_id:   report.id,
  });

  return NextResponse.json(
    apiSuccess({ id: report.id, message: "Report submitted. Awaiting moderation." }),
    { status: 201 }
  );
}