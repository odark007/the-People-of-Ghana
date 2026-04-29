import type { Metadata } from "next";
import AdminReportsClient from "@/components/admin/AdminReportsClient";

export const metadata: Metadata = { title: "Reports — Admin" };

export default function AdminReportsPage() {
  return <AdminReportsClient />;
}