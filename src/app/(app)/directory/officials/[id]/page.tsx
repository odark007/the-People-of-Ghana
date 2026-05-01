import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import { OFFICIAL_ROLE_LABELS } from "@/types";
import type { OfficialRole } from "@/types";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("officials")
    .select("full_name, role")
    .eq("id", params.id)
    .single();
  return { title: data ? `${data.full_name} — ${OFFICIAL_ROLE_LABELS[data.role as OfficialRole]}` : "Official" };
}

async function getOfficialWithReports(id: string) {
  const supabase = await createServerClient();

  const [officialRes, reportsRes] = await Promise.all([
    supabase
      .from("officials")
      .select(`
        id, full_name, role, photo_url, phone, email, office_address,
        verification_status, term_start, term_end,
        region:regions(id, name),
        constituency:constituencies(id, name),
        district:districts(id, name),
        electoral_area:electoral_areas(id, name)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("reports")
      .select("id, title, category, status, created_at")
      .or(`district_id.eq.${id},electoral_area_id.eq.${id}`)
      .in("status", ["published", "in_progress", "resolved"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return { official: officialRes.data, reports: reportsRes.data ?? [] };
}

const STATUS_COLORS: Record<string, string> = {
  verified: "badge-green",
  pending: "badge-gold",
  unverified: "badge-gray",
};

const CATEGORY_EMOJI: Record<string, string> = {
  road: "🛣️", water: "💧", sanitation: "🗑️", electricity: "⚡",
  health: "🏥", education: "📚", security: "🛡️", environment: "🌿", other: "📌",
};

export default async function OfficialPage({ params }: Props) {
  const { official, reports } = await getOfficialWithReports(params.id);
  if (!official) notFound();

  const isVerified = official.verification_status === "verified";
  const o = official as any;
  const jurisdiction =
    o.electoral_area?.name ??
    o.district?.name ??
    o.constituency?.name ??
    o.region?.name;

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="px-4 pt-4">
        <Link href="/directory" className="btn-ghost text-sm px-0 gap-1">
          ← Back to Directory
        </Link>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-2 pb-6">
        <div className="card p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] border-2 border-[var(--border)]
                            flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
              {official.photo_url ? (
                <img src={official.photo_url} alt={official.full_name} className="w-full h-full object-cover" />
              ) : "👤"}
            </div>

            <div className="flex-1 min-w-0">
              {/* Verification */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`badge text-xs ${STATUS_COLORS[official.verification_status]}`}>
                  {official.verification_status === "verified" ? "✓ Verified" :
                    official.verification_status === "pending" ? "⏳ Pending" : "❓ Not Verified"}
                </span>
              </div>

              <h1 className="font-bold text-lg leading-tight">{official.full_name}</h1>
              <p className="text-ghana-green text-xs font-semibold uppercase tracking-wide mt-0.5">
                {OFFICIAL_ROLE_LABELS[official.role as OfficialRole]}
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-1">📍 {jurisdiction}</p>
            </div>
          </div>

          {/* Contact — only for verified officials */}
          {isVerified ? (
            <div className="mt-5 pt-5 border-t border-[var(--border)] flex flex-col gap-3">
              {official.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">📞</span>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider">Phone</p>
                    <a href={`tel:${official.phone}`} className="text-sm font-medium text-ghana-green hover:underline">
                      {official.phone}
                    </a>
                  </div>
                </div>
              )}
              {official.email && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">✉️</span>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider">Email</p>
                    <a href={`mailto:${official.email}`} className="text-sm font-medium text-ghana-green hover:underline truncate">
                      {official.email}
                    </a>
                  </div>
                </div>
              )}
              {official.office_address && (
                <div className="flex items-start gap-3">
                  <span className="text-lg w-7 text-center">🏢</span>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider">Office</p>
                    <p className="text-sm font-medium">{official.office_address}</p>
                  </div>
                </div>
              )}
              {(official.term_start || official.term_end) && (
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">📅</span>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider">Term</p>
                    <p className="text-sm font-medium">
                      {official.term_start ?? "?"} → {official.term_end ?? "Present"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 px-4 py-3 bg-[var(--surface-2)] rounded-xl">
              <p className="text-sm text-[var(--text-muted)]">
                Contact details will appear once this official's information has been verified.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reports in jurisdiction */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">Reports in Jurisdiction</h2>
          <span className="badge badge-gray">{reports.length}</span>
        </div>

        {reports.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-[var(--text-muted)]">No reports yet for this area</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r: any) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="card-hover flex items-center gap-3 p-4">
                <span className="text-xl">{CATEGORY_EMOJI[r.category] ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                    {new Date(r.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className="text-sm">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
