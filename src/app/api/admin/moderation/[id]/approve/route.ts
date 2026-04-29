// POST /api/admin/moderation/[id]/approve
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user || !profile || !["admin", "superadmin"].includes(profile.role)) {
    return NextResponse.json(apiError("FORBIDDEN", "Admin access required"), { status: 403 });
  }

  const supabase = createAdminClient();

  // Get the queue item
  const { data: item, error: fetchError } = await supabase
    .from("moderation_queue")
    .select("content_type, content_id")
    .eq("id", params.id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json(apiError("NOT_FOUND", "Queue item not found"), { status: 404 });
  }

  const now = new Date().toISOString();

  // Update the content item status
  if (item.content_type === "report") {
    await supabase.from("reports").update({ status: "published" }).eq("id", item.content_id);
  } else if (item.content_type === "post") {
    await supabase.from("posts").update({ status: "published" }).eq("id", item.content_id);
  } else if (item.content_type === "official") {
    await supabase.from("officials").update({ verification_status: "verified" }).eq("id", item.content_id);
  }

  // Mark queue item as approved
  await supabase
    .from("moderation_queue")
    .update({ status: "published", reviewed_by: user.id, reviewed_at: now })
    .eq("id", params.id);

  return NextResponse.json(apiSuccess({ approved: true }));
}
