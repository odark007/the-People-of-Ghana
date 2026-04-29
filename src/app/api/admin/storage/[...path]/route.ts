// DELETE /api/admin/storage/[...path] — delete a specific file from storage

import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { deleteReportImage } from "@/lib/storage";
import { apiError, apiSuccess } from "@/types";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const profile = await getProfile();
  if (!profile || profile.role !== "superadmin") {
    return NextResponse.json(
      apiError("FORBIDDEN", "Superadmin access required"),
      { status: 403 }
    );
  }

  const filePath = params.path.join("/");

  if (!filePath) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "No path provided"),
      { status: 400 }
    );
  }

  try {
    await deleteReportImage(filePath);
    return NextResponse.json(apiSuccess({ deleted: true, path: filePath }));
  } catch (err: any) {
    return NextResponse.json(
      apiError("STORAGE_ERROR", err.message),
      { status: 500 }
    );
  }
}