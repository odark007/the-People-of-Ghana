// GET /api/admin/storage — list all files in bucket, superadmin only

import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import { apiError, apiSuccess } from "@/types";

const BUCKET = "report-images";

export async function GET() {
  const profile = await getProfile();
  if (!profile || profile.role !== "superadmin") {
    return NextResponse.json(
      apiError("FORBIDDEN", "Superadmin access required"),
      { status: 403 }
    );
  }

  const supabase = createAdminClient();

  // List top-level folders (user IDs) inside reports/
  const { data: folders, error: folderError } = await supabase.storage
    .from(BUCKET)
    .list("reports", {
      limit:  1000,
      sortBy: { column: "name", order: "asc" },
    });

  if (folderError) {
    return NextResponse.json(
      apiError("STORAGE_ERROR", folderError.message),
      { status: 500 }
    );
  }

  // List files inside each user folder
  const allFiles: any[] = [];

  for (const folder of folders ?? []) {
    if (!folder.id) continue; // skip if it's a file not a folder

    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(`reports/${folder.name}`, {
        limit:  100,
        sortBy: { column: "created_at", order: "desc" },
      });

    for (const file of files ?? []) {
      const path = `reports/${folder.name}/${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      allFiles.push({
        name:        file.name,
        path,
        url:         publicUrl,
        size:        file.metadata?.size ?? 0,
        created_at:  file.created_at ?? "",
        user_folder: folder.name,
      });
    }
  }

  return NextResponse.json(
    apiSuccess({ files: allFiles, total: allFiles.length })
  );
}