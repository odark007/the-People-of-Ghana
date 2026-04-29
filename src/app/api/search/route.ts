// GET /api/search?q=&type=&limit=
// Live search across reports, officials, and governance areas.
// Uses PostgreSQL full-text search (tsvector) for reports,
// and ilike for officials/areas (fast enough at MVP scale).
// No auth required — results are public-only content.

import { NextRequest, NextResponse } from "next/server";
import { searchSchema } from "@/lib/validation";
import { createServerClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = searchSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid search query", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { q, type, limit } = parsed.data;
  const supabase = await createServerClient();

  const results: {
    reports: unknown[];
    officials: unknown[];
    areas: unknown[];
  } = { reports: [], officials: [], areas: [] };

  // Run relevant searches in parallel based on type filter
  const searches: Promise<void>[] = [];

  if (type === "all" || type === "reports") {
    searches.push(
      supabase
        .from("reports")
        .select(`
          id, title, category, status,
          reporter_public_name, reporter_anonymity_level, created_at,
          region:regions(name),
          district:districts(name)
        `)
        .in("status", ["published", "in_progress", "resolved"])
        .textSearch("title || ' ' || description", q, {
          type: "websearch",
          config: "english",
        })
        .limit(limit)
        .then(({ data }) => { results.reports = data ?? []; })
    );
  }

  if (type === "all" || type === "officials") {
    searches.push(
      supabase
        .from("officials")
        .select(`
          id, full_name, role, verification_status, photo_url,
          region:regions(name),
          district:districts(name)
        `)
        .ilike("full_name", `%${q}%`)
        .limit(limit)
        .then(({ data }) => { results.officials = data ?? []; })
    );
  }

  if (type === "all" || type === "areas") {
    // Search across all governance levels simultaneously
    const [regionsRes, districtsRes, electoralRes] = await Promise.all([
      supabase.from("regions").select("id, name, code").ilike("name", `%${q}%`).limit(5),
      supabase.from("districts").select("id, name, type, constituency:constituencies(region:regions(name))").ilike("name", `%${q}%`).limit(5),
      supabase.from("electoral_areas").select("id, name, district:districts(name)").ilike("name", `%${q}%`).limit(5),
    ]);

    searches.push(
      Promise.resolve().then(() => {
        results.areas = [
          ...(regionsRes.data ?? []).map((r) => ({ ...r, _type: "region" })),
          ...(districtsRes.data ?? []).map((d) => ({ ...d, _type: "district" })),
          ...(electoralRes.data ?? []).map((e) => ({ ...e, _type: "electoral_area" })),
        ];
      })
    );
  }

  await Promise.all(searches);

  const total =
    results.reports.length +
    results.officials.length +
    results.areas.length;

  return NextResponse.json(
    apiSuccess({ query: q, total, ...results }),
    {
      headers: {
        // Short cache — search results should feel live
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    }
  );
}
