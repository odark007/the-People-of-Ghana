// GET /api/admin/reports — all reports, all statuses, admin only

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

const schema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
  status:   z.enum(["pending","published","in_progress","resolved","rejected","all"]).default("all"),
  category: z.string().optional(),
  q:        z.string().optional(),
});

export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Invalid params"), { status: 400 });
  }

  const { page, limit, status, category, q } = parsed.data;
  const offset   = (page - 1) * limit;
  const supabase = createAdminClient();

  let query = supabase
    .from("reports")
    .select(
      `id, title, description, category, status, image_url,
       latitude, longitude, reporter_public_name, reporter_anonymity_level,
       created_at, updated_at,
       region:regions(id,name),
       district:districts(id,name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (category)         query = query.eq("category", category);
  if (q)                query = query.ilike("title", `%${q}%`);

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", error.message), { status: 500 });
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