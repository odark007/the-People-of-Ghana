// POST /api/auth/signup
// Creates a new account with email + password via Supabase Auth.
// On success, syncs public.users profile and returns consent requirement.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { syncUserProfile } from "@/lib/auth";
import { apiError, apiSuccess } from "@/types";

const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // After email confirmation, redirect back to our callback handler
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    // Supabase returns a generic message for existing accounts to prevent enumeration
    if (error.message.toLowerCase().includes("already registered")) {
      return NextResponse.json(
        apiError("EMAIL_IN_USE", "An account with this email already exists."),
        { status: 409 }
      );
    }
    console.error("[signup]", error.message);
    return NextResponse.json(
      apiError("SIGNUP_FAILED", "Could not create account. Please try again."),
      { status: 500 }
    );
  }

  // If email confirmation is disabled in Supabase dashboard,
  // data.user is already confirmed and we can sync the profile immediately.
  // If confirmation is enabled, profile sync happens in /api/auth/callback.
  if (data.user && data.session) {
    const { needsConsent } = await syncUserProfile(data.user.id);
    return NextResponse.json(
      apiSuccess({ confirmed: true, needs_consent: needsConsent }),
      { status: 201 }
    );
  }

  // Email confirmation required — user needs to check their inbox
  return NextResponse.json(
    apiSuccess({ confirmed: false, message: "Check your email to confirm your account." }),
    { status: 201 }
  );
}
