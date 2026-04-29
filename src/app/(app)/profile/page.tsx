import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser, getProfile } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/client";
import ProfileClient from "@/components/profile/ProfileClient";

export const metadata: Metadata = { title: "My Profile" };

async function getUserStats(userId: string) {
  const supabase = await createServerClient();
  const [totalRes, resolvedRes] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("reports").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "resolved"),
  ]);
  return { total: totalRes.count ?? 0, resolved: resolvedRes.count ?? 0 };
}

export default async function ProfilePage() {
  const user    = await getAuthUser();
  const profile = await getProfile();

  if (!user || !profile) redirect("/login");

  const stats = await getUserStats(user.id);

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ""}
      profile={profile}
      stats={stats}
    />
  );
}
