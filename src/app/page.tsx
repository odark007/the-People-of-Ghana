import { redirect } from "next/navigation";
import { getAuthUser, getProfile } from "@/lib/auth";

export default async function RootPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile();

  if (!profile?.consent_given_at) {
    redirect("/consent");
  }

  redirect("/dashboard");
}
