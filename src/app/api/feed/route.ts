// GET /api/feed?page=&limit=&region_id=&category=
// Returns approved reports and posts merged into a single chronological feed.
// Public endpoint — no auth required.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

const feedSchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(30).default(15),
  region_id: z.string().uuid().optional(),
  category:  z.enum([
    "road","water","sanitation","electricity",
    "health","education","security","environment","other",
  ]).optional(),
  type: z.enum(["all","reports","posts"]).default("all"),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = feedSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid feed params", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { page, limit, region_id, category, type } = parsed.data;
  const offset = (page - 1) * limit;
  const supabase = await createServerClient();

  const fetchReports = type !== "posts";
  const fetchPosts   = type !== "reports" && !category; // posts have no category filter

  const [reportsRes, postsRes] = await Promise.all([
    fetchReports
      ? supabase
          .from("reports")
          .select(`
            id, title, category, status, image_url,
            reporter_public_name, reporter_anonymity_level, created_at,
            region:regions(id,name), district:districts(id,name)
          `)
          .in("status", ["published","in_progress","resolved"])
          .order("created_at", { ascending: false })
          .limit(limit * 2) // fetch extra to merge properly
          .then(({ data }) => (data ?? []).map((r) => ({ ...r, _type: "report" as const })))
      : Promise.resolve([]),

    fetchPosts
      ? supabase
          .from("posts")
          .select(`
            id, content, image_url, status,
            poster_public_name, poster_anonymity_level, created_at,
            region:regions(id,name)
          `)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(limit)
          .then(({ data }) => (data ?? []).map((p) => ({ ...p, _type: "post" as const })))
      : Promise.resolve([]),
  ]);

  // Apply region filter after fetch (avoids complex join in query)
  let reports = reportsRes as any[];
  let posts   = postsRes   as any[];

  if (region_id) {
    reports = reports.filter((r) => r.region?.id === region_id);
    posts   = posts.filter((p) => p.region?.id === region_id);
  }
  if (category) {
    reports = reports.filter((r) => r.category === category);
  }

  // Merge and sort by created_at descending, then paginate
  const merged = [...reports, ...posts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const paginated = merged.slice(offset, offset + limit);
  const total     = merged.length;

  return NextResponse.json(
    apiSuccess({
      items: paginated,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    })
  );
}
