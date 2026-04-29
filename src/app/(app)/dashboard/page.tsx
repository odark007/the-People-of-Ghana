import type { Metadata } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/client";
import SearchBar from "@/components/ui/SearchBar";

export const metadata: Metadata = { title: "Home" };

async function getStats() {
  const supabase = await createServerClient();
  const [reportsRes, resolvedRes] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved"),
  ]);
  return {
    total: reportsRes.count ?? 0,
    resolved: resolvedRes.count ?? 0,
  };
}

async function getRecentReports() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("reports")
    .select(`
      id, title, category, status, reporter_public_name,
      reporter_anonymity_level, created_at,
      region:regions(name),
      district:districts(name)
    `)
    .in("status", ["published", "in_progress", "resolved"])
    .order("created_at", { ascending: false })
    .limit(3);
  return data ?? [];
}

const CATEGORY_EMOJI: Record<string, string> = {
  road: "🛣️", water: "💧", sanitation: "🗑️", electricity: "⚡",
  health: "🏥", education: "📚", security: "🛡️", environment: "🌿", other: "📌",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "status-pending",
  published: "status-published",
  in_progress: "status-progress",
  resolved: "status-resolved",
  rejected: "status-rejected",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", published: "Published",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};

export default async function DashboardPage() {
  const [profile, stats, recentReports] = await Promise.all([
    getProfile(),
    getStats(),
    getRecentReports(),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      {/* Hero */}
      <section className="bg-ghana-black px-5 pt-6 pb-7 relative overflow-hidden">
        {/* Subtle radial highlight */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10
                        bg-radial-gradient bg-ghana-gold blur-3xl pointer-events-none" />
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">
          {greeting}
        </p>
        <h1 className="text-white font-serif text-3xl font-black leading-tight mb-1">
          {profile?.public_name === "Anonymous Citizen"
            ? "Welcome, Citizen"
            : `Welcome, ${profile?.public_name}`}
        </h1>
        <p className="text-gray-500 text-sm">
          Ghana's civic voice, one report at a time.
        </p>

        {/* Live search */}
        <div className="mt-5">
          <SearchBar variant="hero" />
        </div>

        {/* Stats strip */}
        <div className="flex gap-3 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { dot: "bg-ghana-red",   value: stats.total,   label: "Reports Filed" },
            { dot: "bg-ghana-green", value: stats.resolved, label: "Resolved" },
            { dot: "bg-ghana-gold",  value: 16,            label: "Regions" },
          ].map((s) => (
            <div key={s.label}
              className="flex-shrink-0 flex items-center gap-2 bg-white/8 border border-white/10
                         rounded-full px-4 py-2">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-white font-bold text-sm">{s.value.toLocaleString()}</span>
              <span className="text-gray-500 text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-4 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/reports/new", icon: "📢", label: "Report Issue",    color: "bg-ghana-red/10 text-ghana-red" },
            { href: "/directory",   icon: "🏛️", label: "Find Leaders",   color: "bg-ghana-gold/15 text-amber-700" },
            { href: "/feed",        icon: "📋", label: "View Reports",   color: "bg-ghana-green/10 text-ghana-green" },
          ].map((a) => (
            <Link key={a.href} href={a.href}
              className="card-hover flex flex-col items-center gap-2.5 p-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${a.color}`}>
                {a.icon}
              </div>
              <span className="text-xs font-semibold text-center text-[var(--text-muted)] leading-tight">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent reports */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">Recent Reports</h2>
          <Link href="/feed" className="text-xs font-semibold text-ghana-green">
            See all →
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-semibold text-[var(--gh-black)]">No reports yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Be the first to report an issue</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentReports.map((r: any) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="card-hover overflow-hidden">
                {/* Category color bar */}
                <div className={`h-1 w-full ${r.category === "road" || r.category === "electricity" ? "bg-ghana-red" : r.category === "water" || r.category === "health" ? "bg-ghana-green" : "bg-ghana-gold"}`} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5">
                      {CATEGORY_EMOJI[r.category] ?? "📌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={STATUS_CLASSES[r.status]}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </div>
                      <p className="font-bold text-sm leading-tight line-clamp-2">
                        {r.title}
                      </p>
                      <p className="text-xs text-[var(--text-subtle)] mt-1.5">
                        📍 {r.district?.name ?? r.region?.name ?? "Ghana"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3 flex items-center justify-between text-xs text-[var(--text-subtle)]">
                  <span>{r.reporter_public_name}</span>
                  <span>{new Date(r.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bottom padding */}
      <div className="h-6" />
    </div>
  );
}
