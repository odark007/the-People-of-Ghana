// GET /api/governance/districts?constituency_id=
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET(req: NextRequest) {
  const constituency_id = req.nextUrl.searchParams.get("constituency_id");

  if (!constituency_id) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "constituency_id is required"),
      { status: 400 }
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("districts")
    .select("id, name, constituency_id, type")
    .eq("constituency_id", constituency_id)
    .order("name");

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", "Failed to fetch districts"), { status: 500 });
  }

  return NextResponse.json(apiSuccess(data), {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
