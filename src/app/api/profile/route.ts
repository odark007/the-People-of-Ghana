// PATCH /api/profile
// Updates the user's anonymity level and/or display name.
// Re-syncs public_name via the DB trigger.

import { NextRequest, NextResponse } from "next/server";
import { consentSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Authentication required"), { status: 401 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { anonymity_level, display_name } = parsed.data;

  if (anonymity_level === "L3" && !display_name) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Display name is required for Level 3."),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .update({
      anonymity_level,
      display_name: anonymity_level === "L3" ? display_name : null,
      // public_name updated automatically by the DB trigger
    })
    .eq("id", user.id)
    .select("id, anonymity_level, public_name, display_name, pseudonym")
    .single();

  if (error || !data) {
    return NextResponse.json(apiError("DB_ERROR", "Failed to update profile"), { status: 500 });
  }

  return NextResponse.json(apiSuccess(data));
}
