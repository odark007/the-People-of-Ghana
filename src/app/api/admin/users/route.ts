// GET /api/admin/users — all users, superadmin only

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

async function requireSuperAdmin() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user || !profile || profile.role !== "superadmin") return null;
  return { user, profile };
}

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Superadmin access required"),
      { status: 403 }
    );
  }

  const page   = Number(req.nextUrl.searchParams.get("page")  ?? 1);
  const limit  = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const role   = req.nextUrl.searchParams.get("role") ?? "";
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select(
      `id, role, anonymity_level, public_name, pseudonym, display_name,
       is_verified, consent_given_at, created_at, deleted_at`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (role) query = query.eq("role", role);

  const { data: users, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", error.message), { status: 500 });
  }

  // Fetch emails from auth.users via service role (superadmin only)
  const { data: authData } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authData?.users ?? []).map((u: any) => [u.id, u.email])
  );

  const enriched = (users ?? []).map((u: any) => ({
    ...u,
    email: emailMap.get(u.id) ?? "—",
  }));

  return NextResponse.json(
    apiSuccess({
      users:  enriched,
      total:  count ?? 0,
      page,
      limit,
      pages:  Math.ceil((count ?? 0) / limit),
    })
  );
}