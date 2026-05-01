import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/client";
import DirectoryBrowser from "@/components/directory/DirectoryBrowser";

export const metadata: Metadata = { title: "Find Your Leaders" };

async function getRegions() {
  const supabase = await createServerClient();
  const { data } = await supabase.from("regions").select("*").order("name");
  return data ?? [];
}

export default async function DirectoryPage() {
  const regions = await getRegions();

  return (
    <div>
      {/* Hero */}
      <div className="bg-ghana-green px-5 pt-6 pb-7">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-2">
          Governance Directory
        </p>
        <h1 className="text-white font-serif text-3xl font-black leading-tight mb-2">
          Find Your Leaders
        </h1>
        <p className="text-green-200 text-sm leading-relaxed">
          Browse Ghana's full governance hierarchy. From Region to Electoral Area.
        </p>
      </div>

      {/* Browser */}
      <DirectoryBrowser regions={regions} />
    </div>
  );
}
