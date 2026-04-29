// GET /api/governance/electoral-areas?district_id=
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET(req: NextRequest) {
  const district_id = req.nextUrl.searchParams.get("district_id");

  if (!district_id) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "district_id is required"),
      { status: 400 }
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("electoral_areas")
    .select("id, name, district_id")
    .eq("district_id", district_id)
    .order("name");

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", "Failed to fetch electoral areas"), { status: 500 });
  }

  return NextResponse.json(apiSuccess(data), {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
