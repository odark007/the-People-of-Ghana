import type { Metadata } from "next";
import SearchPageClient from "@/components/search/SearchPageClient";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <div>
      <div className="bg-ghana-black px-5 pt-6 pb-5">
        <h1 className="text-white font-serif text-3xl font-black mb-4">Search</h1>
        <SearchPageClient initialQuery={searchParams.q ?? ""} />
      </div>
    </div>
  );
}
