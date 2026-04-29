// PUT    /api/admin/users/[id]  — update role (RBAC)
// DELETE /api/admin/users/[id]  — soft delete (erasure)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { ERASED_PUBLIC_NAME } from "@/lib/anonymization";
import { apiError, apiSuccess } from "@/types";

type Params = { params: { id: string } };

async function requireSuperAdmin() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()]);
  if (!user || !profile || profile.role !== "superadmin") return null;
  return { user, profile };
}

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Superadmin access required"),
      { status: 403 }
    );
  }

  // Prevent self-demotion
  if (params.id === admin.user.id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "You cannot change your own role."),
      { status: 403 }
    );
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = z.object({
    role: z.enum(["user", "admin", "superadmin"]),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Invalid role"),
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", error.message), { status: 500 });
  }

  return NextResponse.json(apiSuccess({ updated: true, role: parsed.data.role }));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Superadmin access required"),
      { status: 403 }
    );
  }

  // Prevent self-deletion
  if (params.id === admin.user.id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "You cannot delete your own account."),
      { status: 403 }
    );
  }

  const supabase = createAdminClient();

  // Soft delete — anonymize in place, never hard delete
  // Reports remain as civic records attributed to "Deleted Citizen"
  const { error } = await supabase
    .from("users")
    .update({
      deleted_at:       new Date().toISOString(),
      public_name:      ERASED_PUBLIC_NAME,
      display_name:     null,
      pseudonym:        null,
      role:             "user",
      consent_given_at: null,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(apiError("DB_ERROR", error.message), { status: 500 });
  }

  // Disable the auth account (prevents re-login)
  await supabase.auth.admin.updateUserById(params.id, {
    ban_duration: "876600h",
  });

  return NextResponse.json(apiSuccess({ deleted: true }));
}