// GET /api/admin/stats
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function GET() {
  const profile = await getProfile();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const supabase = createAdminClient();

  const [
    totalReports, pendingReports, resolvedReports, publishedReports,
    totalUsers, totalOfficials, verifiedOfficials, pendingModeration,
  ] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("users").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("officials").select("id", { count: "exact", head: true }),
    supabase.from("officials").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("moderation_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return NextResponse.json(apiSuccess({
    reports: {
      total:     totalReports.count     ?? 0,
      pending:   pendingReports.count   ?? 0,
      resolved:  resolvedReports.count  ?? 0,
      published: publishedReports.count ?? 0,
    },
    users: {
      total: totalUsers.count ?? 0,
    },
    officials: {
      total:    totalOfficials.count    ?? 0,
      verified: verifiedOfficials.count ?? 0,
    },
    moderation: {
      pending: pendingModeration.count ?? 0,
    },
  }));
}