import { redirect } from "next/navigation";
import { getAuthUser, getProfile } from "@/lib/auth";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile?.consent_given_at) redirect("/consent");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <TopBar profile={profile} />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
