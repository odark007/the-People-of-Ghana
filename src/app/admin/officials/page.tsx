import type { Metadata } from "next";
import AdminOfficialsClient from "@/components/admin/AdminOfficialsClient";

export const metadata: Metadata = { title: "Officials — Admin" };

export default function AdminOfficialsPage() {
  return <AdminOfficialsClient />;
}