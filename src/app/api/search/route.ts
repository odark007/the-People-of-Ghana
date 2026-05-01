// GET /api/search?q=&type=&limit=
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
    reports:   unknown[];
    officials: unknown[];
    areas:     unknown[];
  } = { reports: [], officials: [], areas: [] };

  const promises: Promise<void>[] = [];

  if (type === "all" || type === "reports") {
    const p = supabase
      .from("reports")
      .select(`
        id, title, category, status,
        reporter_public_name, reporter_anonymity_level, created_at,
        region:regions(name),
        district:districts(name)
      `)
      .in("status", ["published", "in_progress", "resolved"])
      .ilike("title", `%${q}%`)
      .limit(limit)
      .then(({ data }) => {
        results.reports = data ?? [];
      });
    promises.push(Promise.resolve(p).then(() => {}));
  }

  if (type === "all" || type === "officials") {
    const p = supabase
      .from("officials")
      .select(`
        id, full_name, role, verification_status, photo_url,
        region:regions(name),
        district:districts(name)
      `)
      .ilike("full_name", `%${q}%`)
      .limit(limit)
      .then(({ data }) => {
        results.officials = data ?? [];
      });
    promises.push(Promise.resolve(p).then(() => {}));
  }

  if (type === "all" || type === "areas") {
    const p = Promise.all([
      supabase.from("regions").select("id, name, code").ilike("name", `%${q}%`).limit(5),
      supabase.from("districts").select("id, name, type").ilike("name", `%${q}%`).limit(5),
      supabase.from("electoral_areas").select("id, name").ilike("name", `%${q}%`).limit(5),
    ]).then(([regionsRes, districtsRes, electoralRes]) => {
      results.areas = [
        ...(regionsRes.data ?? []).map((r) => ({ ...r, _type: "region" })),
        ...(districtsRes.data ?? []).map((d) => ({ ...d, _type: "district" })),
        ...(electoralRes.data ?? []).map((e) => ({ ...e, _type: "electoral_area" })),
      ];
    });
    promises.push(p);
  }

  await Promise.all(promises);

  const total =
    results.reports.length +
    results.officials.length +
    results.areas.length;

  return NextResponse.json(
    apiSuccess({ query: q, total, ...results }),
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    }
  );
}