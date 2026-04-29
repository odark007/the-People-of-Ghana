// POST /api/auth/signout
// Signs out via Supabase Auth — clears session cookies.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { apiSuccess } from "@/types";

export async function POST() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.json(apiSuccess({ message: "Signed out" }), { status: 200 });
}
