// GET /api/governance/regions
// Public endpoint — no auth required.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("regions")
      .select("id, name, code")
      .order("name");

    if (error) {
      return NextResponse.json(
        apiError("DB_ERROR", "Failed to fetch regions"),
        { status: 500 }
      );
    }

    return NextResponse.json(apiSuccess(data), {
      headers: {
        // Cache governance data aggressively — it changes rarely
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      apiError("SERVER_ERROR", "An unexpected error occurred"),
      { status: 500 }
    );
  }
}
