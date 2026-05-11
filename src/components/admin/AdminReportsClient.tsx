"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Construction, Droplets, Trash2, Zap, HeartPulse,
  BookOpen, Shield, Leaf, MapPin, Trash, X,
} from "lucide-react";
import { REPORT_CATEGORY_LABELS } from "@/types";

const STATUS_OPTIONS = ["all","pending","published","in_progress","resolved","rejected"] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

const STATUS_CLASSES: Record<string, string> = {
  pending:     "status-pending",
  published:   "status-published",
  in_progress: "status-progress",
  resolved:    "status-resolved",
  rejected:    "status-rejected",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  road:        <Construction size={16} strokeWidth={2} />,
  water:       <Droplets     size={16} strokeWidth={2} />,
  sanitation:  <Trash2       size={16} strokeWidth={2} />,
  electricity: <Zap          size={16} strokeWidth={2} />,
  health:      <HeartPulse   size={16} strokeWidth={2} />,
  education:   <BookOpen     size={16} strokeWidth={2} />,
  security:    <Shield       size={16} strokeWidth={2} />,
  environment: <Leaf         size={16} strokeWidth={2} />,
  other:       <MapPin       size={16} strokeWidth={2} />,
};

export default function AdminReportsClient() {
  const [reports,     setReports]     = useState<any[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [isLoading,   setIsLoading]   = useState(true);
  const [status,      setStatus]      = useState<StatusFilter>("all");
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected,    setSelected]    = useState<any | null>(null);
  const [newStatus,   setNewStatus]   = useState("");
  const [isSaving,    setIsSaving]    = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);
  const LIMIT = 15;

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), status });
    if (search) params.set("q", search);
    const res  = await fetch(`/api/admin/reports?${params}`);
    const data = await res.json();
    setReports(data.data?.reports ?? []);
    setTotal(data.data?.total ?? 0);
    setIsLoading(false);
  }, [page, status, search]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function updateStatus() {
    if (!selected || !newStatus) return;
    setIsSaving(true);
    await fetch(`/api/admin/reports/${selected.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setIsSaving(false);
    setSelected(null);
    fetchReports();
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report and purge its image? This cannot be undone.")) return;
    setIsDeleting(true);
    await fetch(`/api/admin/reports/${id}`, { method: "DELETE" });
    setIsDeleting(false);
    setSelected(null);
    fetchReports();
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Reports</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{total.toLocaleString()} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="Search by title…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
          className="input flex-1 min-w-[200px] py-2"
        />
        <button onClick={() => { setSearch(searchInput); setPage(1); }} className="btn-secondary py-2 px-4 text-sm">
          Search
        </button>
        <select value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}
          className="input w-auto py-2">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-ghana-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">No reports found</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {reports.map((r) => (
              <div key={r.id} onClick={() => { setSelected(r); setNewStatus(r.status); }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface-2)] cursor-pointer transition-colors">
                <span className="text-[var(--text-muted)] flex-shrink-0">
                  {CATEGORY_ICONS[r.category] ?? <MapPin size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {r.reporter_public_name} · {REPORT_CATEGORY_LABELS[r.category as keyof typeof REPORT_CATEGORY_LABELS]} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={`badge text-[10px] flex-shrink-0 ${STATUS_CLASSES[r.status]}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-[var(--text-muted)]">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center backdrop-blur-sm"
          onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-2xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-bold text-lg leading-tight flex-1 pr-4">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-[var(--text-subtle)] hover:text-black flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            {selected.image_url && (
              <img src={selected.image_url} alt="" className="w-full h-44 object-cover rounded-xl mb-4 border border-[var(--border)]" />
            )}

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              {[
                { label: "Category",  value: REPORT_CATEGORY_LABELS[selected.category as keyof typeof REPORT_CATEGORY_LABELS] },
                { label: "Reporter",  value: `${selected.reporter_public_name} (${selected.reporter_anonymity_level})` },
                { label: "Location",  value: selected.district?.name ?? selected.region?.name ?? "Unknown" },
                { label: "Submitted", value: new Date(selected.created_at).toLocaleDateString("en-GH") },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[var(--surface-2)] rounded-lg p-3">
                  <p className="text-[var(--text-subtle)] uppercase tracking-wide font-bold text-[10px] mb-0.5">{label}</p>
                  <p className="font-medium text-sm">{value}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5 line-clamp-4">
              {selected.description}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Update Status
              </label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input">
                {["pending","published","in_progress","resolved","rejected"].map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => deleteReport(selected.id)} disabled={isDeleting}
                className="flex-1 py-3 rounded-xl border-2 border-ghana-red/30 text-ghana-red text-sm
                           font-semibold hover:bg-ghana-red/5 transition-colors disabled:opacity-40
                           flex items-center justify-center gap-2">
                <Trash size={15} />
                {isDeleting ? "Deleting…" : "Delete + Purge Image"}
              </button>
              <button onClick={updateStatus} disabled={isSaving || newStatus === selected.status}
                className="btn-secondary flex-1 py-3 disabled:opacity-40">
                {isSaving ? "Saving…" : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
