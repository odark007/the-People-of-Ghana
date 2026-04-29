// POST /api/auth/signin
// Signs in with email + password via Supabase Auth.
// Syncs public.users profile and returns consent requirement.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { syncUserProfile } from "@/lib/auth";
import { apiError, apiSuccess } from "@/types";

const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = signinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Use a generic message — never reveal whether email exists
    return NextResponse.json(
      apiError("INVALID_CREDENTIALS", "Incorrect email or password."),
      { status: 401 }
    );
  }

  if (!data.user || !data.session) {
    return NextResponse.json(
      apiError("SIGNIN_FAILED", "Sign in failed. Please try again."),
      { status: 500 }
    );
  }

  // Sync public.users profile (no-op for existing users, creates on first sign-in)
  const { needsConsent } = await syncUserProfile(data.user.id);

  return NextResponse.json(
    apiSuccess({ needs_consent: needsConsent }),
    { status: 200 }
  );
}
