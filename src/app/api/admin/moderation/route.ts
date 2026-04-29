// GET  /api/admin/moderation         — pending queue
// POST /api/admin/moderation/[id]/approve
// POST /api/admin/moderation/[id]/reject

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

async function requireAdminProfile() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user || !profile || !["admin", "superadmin"].includes(profile.role)) {
    return null;
  }
  return { user, profile };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminProfile();
  if (!admin) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type"); // "report" | "post" | "official"
  const supabase = createAdminClient();

  let query = supabase
    .from("moderation_queue")
    .select("id, content_type, content_id, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (type) query = query.eq("content_type", type);

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", "Failed to fetch queue"), { status: 500 });
  }

  // Enrich each queue item with content preview
  const enriched = await Promise.all(
    (data ?? []).map(async (item) => {
      let preview: Record<string, unknown> = {};

      if (item.content_type === "report") {
        const { data: r } = await supabase
          .from("reports")
          .select("title, category, reporter_public_name, reporter_anonymity_level, created_at, image_url")
          .eq("id", item.content_id)
          .single();
        preview = r ?? {};
      } else if (item.content_type === "post") {
        const { data: p } = await supabase
          .from("posts")
          .select("content, poster_public_name, poster_anonymity_level, created_at")
          .eq("id", item.content_id)
          .single();
        preview = p ?? {};
      } else if (item.content_type === "official") {
        const { data: o } = await supabase
          .from("officials")
          .select("full_name, role, verification_status")
          .eq("id", item.content_id)
          .single();
        preview = o ?? {};
      }

      return { ...item, preview };
    })
  );

  return NextResponse.json(apiSuccess(enriched));
}
