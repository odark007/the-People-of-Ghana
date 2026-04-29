import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import { REPORT_CATEGORY_LABELS } from "@/types";
import type { ReportCategory } from "@/types";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerClient();
  const { data } = await supabase.from("reports").select("title").eq("id", params.id).single();
  return { title: data?.title ?? "Report" };
}

const CATEGORY_EMOJI: Record<string, string> = {
  road:"🛣️", water:"💧", sanitation:"🗑️", electricity:"⚡",
  health:"🏥", education:"📚", security:"🛡️", environment:"🌿", other:"📌",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  published:  { label: "Open",        cls: "status-published" },
  in_progress:{ label: "In Progress", cls: "status-progress"  },
  resolved:   { label: "Resolved",    cls: "status-resolved"  },
};

export default async function ReportDetailPage({ params }: Props) {
  const supabase = await createServerClient();

  const { data: report } = await supabase
    .from("reports")
    .select(`
      id, title, description, category, status, image_url,
      latitude, longitude, reporter_public_name, reporter_anonymity_level,
      created_at, updated_at,
      region:regions(id,name),
      constituency:constituencies(id,name),
      district:districts(id,name,type),
      electoral_area:electoral_areas(id,name)
    `)
    .eq("id", params.id)
    .in("status", ["published","in_progress","resolved"])
    .single();

  if (!report) notFound();

  const statusCfg  = STATUS_CONFIG[report.status] ?? { label: report.status, cls: "badge-gray" };
  const locationStr = [
    (report as any).electoral_area?.name,
    (report as any).district?.name,
    (report as any).region?.name,
  ].filter(Boolean).join(", ") || "Ghana";

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="px-4 pt-4">
        <Link href="/feed" className="btn-ghost text-sm px-0 gap-1">← Back to Feed</Link>
      </div>

      {/* Image */}
      {report.image_url && (
        <div className="mt-3 mx-4 rounded-2xl overflow-hidden bg-[var(--surface-2)] h-56">
          <img src={report.image_url} alt={report.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="px-4 mt-4">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span>
          <span className="badge badge-gray">
            {CATEGORY_EMOJI[report.category]} {REPORT_CATEGORY_LABELS[report.category as ReportCategory]}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-2xl font-bold leading-tight mb-4">{report.title}</h1>

        {/* Description */}
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5">{report.description}</p>

        {/* Meta card */}
        <div className="card divide-y divide-[var(--border)]">
          {[
            { icon: "📍", label: "Location",   value: locationStr },
            { icon: "👤", label: "Reported by", value: `${report.reporter_public_name} (${report.reporter_anonymity_level})` },
            { icon: "🕐", label: "Submitted",   value: new Date(report.created_at).toLocaleDateString("en-GH", { weekday:"long", day:"numeric", month:"long", year:"numeric" }) },
            { icon: "🔄", label: "Last update", value: new Date(report.updated_at).toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" }) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 px-4 py-3">
              <span className="text-lg w-6 flex-shrink-0 text-center">{icon}</span>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy notice */}
        <div className="mt-4 px-4 py-3 bg-ghana-green/5 border border-ghana-green/20 rounded-xl">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            🔒 GPS coordinates are rounded to ~100m. Image location data has been removed.
            Reporter identity is protected by the chosen anonymity level.
          </p>
        </div>

        {/* Share */}
        <button
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
          className="btn-outline w-full mt-4 py-3"
        >
          🔗 Share Report
        </button>
      </div>
    </div>
  );
}
