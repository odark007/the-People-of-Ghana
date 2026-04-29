// GET /api/auth/callback
// Supabase redirects here after email confirmation link is clicked.
// Exchanges the code for a session, syncs profile, redirects appropriately.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { syncUserProfile } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { needsConsent } = await syncUserProfile(data.user.id);
      return NextResponse.redirect(new URL(needsConsent ? "/consent" : next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", origin));
}
