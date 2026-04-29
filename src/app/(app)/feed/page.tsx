import type { Metadata } from "next";
import FeedClient from "@/components/feed/FeedClient";

export const metadata: Metadata = { title: "Community Feed" };

export default function FeedPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-ghana-black px-5 pt-6 pb-5">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-1">
          Community
        </p>
        <h1 className="text-white font-serif text-3xl font-black leading-tight">
          Live Feed
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Approved reports and posts from across Ghana.
        </p>
      </div>

      <FeedClient />
    </div>
  );
}
