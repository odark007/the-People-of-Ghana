import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/client";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin Dashboard" };

async function getStats() {
  const supabase = createAdminClient();
  const [
    totalReports, pendingReports, resolvedReports,
    totalUsers, totalOfficials, verifiedOfficials, pendingModeration,
  ] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("users").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("officials").select("id", { count: "exact", head: true }),
    supabase.from("officials").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("moderation_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    reports:    { total: totalReports.count ?? 0, pending: pendingReports.count ?? 0, resolved: resolvedReports.count ?? 0 },
    users:      { total: totalUsers.count ?? 0 },
    officials:  { total: totalOfficials.count ?? 0, verified: verifiedOfficials.count ?? 0 },
    moderation: { pending: pendingModeration.count ?? 0 },
  };
}

async function getRecentReports() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reports")
    .select("id, title, category, status, created_at, reporter_public_name, reporter_anonymity_level")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

const STATUS_CLASSES: Record<string, string> = {
  pending:     "status-pending",
  published:   "status-published",
  in_progress: "status-progress",
  resolved:    "status-resolved",
  rejected:    "status-rejected",
};

const CATEGORY_EMOJI: Record<string, string> = {
  road: "🛣️", water: "💧", sanitation: "🗑️", electricity: "⚡",
  health: "🏥", education: "📚", security: "🛡️", environment: "🌿", other: "📌",
};

export default async function AdminDashboardPage() {
  const profile = await getProfile();
  const [stats, recentReports] = await Promise.all([getStats(), getRecentReports()]);

  const STAT_CARDS = [
    { label: "Total Reports",    value: stats.reports.total,       sub: `${stats.reports.pending} pending`,     icon: "📋", href: "/admin/reports",    color: "border-l-ghana-red"   },
    { label: "Moderation Queue", value: stats.moderation.pending,  sub: "awaiting review",                      icon: "⚖️", href: "/admin/moderation", color: "border-l-ghana-gold"  },
    { label: "Resolved Reports", value: stats.reports.resolved,    sub: `of ${stats.reports.total} total`,      icon: "✅", href: "/admin/reports",    color: "border-l-ghana-green" },
    { label: "Registered Users", value: stats.users.total,         sub: "active accounts",                      icon: "👥", href: "/admin/users",      color: "border-l-blue-400"    },
    { label: "Officials",        value: stats.officials.total,     sub: `${stats.officials.verified} verified`, icon: "🏛️", href: "/admin/officials",  color: "border-l-purple-400"  },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-1">
          Admin Panel
        </p>
        <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Welcome back,{" "}
          <span className="font-semibold">{profile?.public_name}</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-ghana-gold/20 text-ghana-gold font-bold uppercase">
            {profile?.role}
          </span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`card-hover p-5 border-l-4 ${card.color}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              {card.label === "Moderation Queue" && stats.moderation.pending > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ghana-red text-white">
                  {stats.moderation.pending}
                </span>
              )}
            </div>
            <div className="text-3xl font-black mb-1">{card.value.toLocaleString()}</div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              {card.label}
            </div>
            <div className="text-xs text-[var(--text-subtle)] mt-0.5">{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* Recent reports */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-base">Recent Reports</h2>
          <Link href="/admin/reports" className="text-xs font-semibold text-ghana-green hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {recentReports.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">No reports yet</div>
          ) : (
            recentReports.map((r: any) => (
              <Link
                key={r.id}
                href={`/admin/reports`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface-2)] transition-colors"
              >
                <span className="text-lg flex-shrink-0">{CATEGORY_EMOJI[r.category] ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {r.reporter_public_name} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("en-GH", {
                      day: "numeric", month: "short",
                    })}
                  </p>
                </div>
                <span className={`badge text-[10px] flex-shrink-0 ${STATUS_CLASSES[r.status]}`}>
                  {r.status.replace("_", " ")}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}