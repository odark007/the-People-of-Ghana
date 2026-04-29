import type { Metadata } from "next";
import AdminStorageClient from "@/components/admin/AdminStorageClient";

export const metadata: Metadata = { title: "Storage — Admin" };

export default function AdminStoragePage() {
  return <AdminStorageClient />;
}