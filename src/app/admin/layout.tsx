import { redirect } from "next/navigation";
import { getAuthUser, getProfile } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user    = await getAuthUser();
  const profile = await getProfile();

  if (!user || !profile) redirect("/login");
  if (!["admin", "superadmin"].includes(profile.role)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex flex-col">
      <AdminSidebar role={profile.role} publicName={profile.public_name} />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}