// POST /api/posts
// Creates a community post. Goes into moderation queue before appearing in feed.

import { NextRequest, NextResponse } from "next/server";
import { createPostSchema } from "@/lib/validation";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

export async function POST(req: NextRequest) {
  const user    = await getAuthUser();
  const profile = await getProfile();

  if (!user || !profile) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Authentication required"), { status: 401 });
  }
  if (!profile.consent_given_at) {
    return NextResponse.json(apiError("CONSENT_REQUIRED", "Complete setup first"), { status: 403 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid post data", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      user_id:               user.id,
      content:               parsed.data.content,
      region_id:             parsed.data.region_id ?? null,
      district_id:           parsed.data.district_id ?? null,
      poster_anonymity_level: profile.anonymity_level,
      poster_public_name:    profile.public_name,
      status:                "pending",
    })
    .select("id")
    .single();

  if (error || !post) {
    return NextResponse.json(apiError("DB_ERROR", "Failed to create post"), { status: 500 });
  }

  await supabase.from("moderation_queue").insert({
    content_type: "post",
    content_id:   post.id,
  });

  return NextResponse.json(
    apiSuccess({ id: post.id, message: "Post submitted for review." }),
    { status: 201 }
  );
}
