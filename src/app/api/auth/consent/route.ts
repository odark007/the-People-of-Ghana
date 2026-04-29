// POST /api/auth/consent
// Records the user's chosen anonymity level.
// Uses Supabase Auth session — no custom JWT needed.

import { NextRequest, NextResponse } from "next/server";
import { consentSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { CURRENT_CONSENT_VERSION } from "@/lib/anonymization";
import { apiError, apiSuccess } from "@/types";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Authentication required."),
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = consentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid consent data", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { anonymity_level, display_name } = parsed.data;

  if (anonymity_level === "L3" && !display_name) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "A display name is required for Level 3."),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: updatedUser, error } = await supabase
    .from("users")
    .update({
      anonymity_level,
      display_name: anonymity_level === "L3" ? display_name : null,
      consent_given_at: new Date().toISOString(),
      consent_version: CURRENT_CONSENT_VERSION,
    })
    .eq("id", user.id)
    .select("id, anonymity_level, public_name")
    .single();

  if (error || !updatedUser) {
    console.error("[consent]", error?.message);
    return NextResponse.json(
      apiError("SERVER_ERROR", "Failed to save. Please try again."),
      { status: 500 }
    );
  }

  return NextResponse.json(
    apiSuccess({
      anonymity_level: updatedUser.anonymity_level,
      public_name: updatedUser.public_name,
    }),
    { status: 200 }
  );
}