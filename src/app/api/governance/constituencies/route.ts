// GET /api/governance/constituencies?region_id=
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET(req: NextRequest) {
  const region_id = req.nextUrl.searchParams.get("region_id");

  if (!region_id) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "region_id is required"),
      { status: 400 }
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("constituencies")
    .select("id, name, region_id")
    .eq("region_id", region_id)
    .order("name");

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", "Failed to fetch constituencies"), { status: 500 });
  }

  return NextResponse.json(apiSuccess(data), {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
