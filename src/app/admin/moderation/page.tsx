import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import ModerationQueue from "@/components/admin/ModerationQueue";

export const metadata: Metadata = { title: "Moderation Queue — Admin" };

export default async function ModerationPage() {
  const profile = await getProfile();

  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="bg-ghana-black px-5 pt-6 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-ghana-gold uppercase tracking-wider">Admin</span>
        </div>
        <h1 className="text-white font-serif text-2xl font-bold">Moderation Queue</h1>
        <p className="text-gray-400 text-sm mt-1">Review and approve community submissions</p>
      </div>
      <ModerationQueue />
    </div>
  );
}
