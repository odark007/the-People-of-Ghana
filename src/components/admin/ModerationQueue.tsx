"use client";

import { useState, useEffect, useCallback } from "react";
import { REPORT_CATEGORY_LABELS, OFFICIAL_ROLE_LABELS } from "@/types";

interface QueueItem {
  id: string;
  content_type: "report" | "post" | "official";
  content_id: string;
  created_at: string;
  preview: Record<string, any>;
}

const TYPE_LABELS: Record<string, string> = {
  report: "Report",
  post: "Post",
  official: "Official",
};

const TYPE_COLORS: Record<string, string> = {
  report: "badge-red",
  post: "badge-gold",
  official: "badge-green",
};

const CATEGORY_EMOJI: Record<string, string> = {
  road: "🛣️", water: "💧", sanitation: "🗑️", electricity: "⚡",
  health: "🏥", education: "📚", security: "🛡️", environment: "🌿", other: "📌",
};

export default function ModerationQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "report" | "post" | "official">("all");
  const [actionState, setActionState] = useState<Record<string, "approving" | "rejecting" | "done">>({});
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    const url = filter === "all" ? "/api/admin/moderation" : `/api/admin/moderation?type=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setItems(data.data ?? []);
    setIsLoading(false);
  }, [filter]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function approve(itemId: string) {
    setActionState((p) => ({ ...p, [itemId]: "approving" }));
    await fetch(`/api/admin/moderation/${itemId}/approve`, { method: "POST" });
    setActionState((p) => ({ ...p, [itemId]: "done" }));
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== itemId)), 600);
  }

  async function reject(itemId: string) {
    if (!rejectNote.trim()) return;
    setActionState((p) => ({ ...p, [itemId]: "rejecting" }));
    await fetch(`/api/admin/moderation/${itemId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: rejectNote }),
    });
    setActionState((p) => ({ ...p, [itemId]: "done" }));
    setRejectModal(null);
    setRejectNote("");
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== itemId)), 600);
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.content_type === filter);

  return (
    <div className="px-4 pb-8">
      {/* Filter tabs */}
      <div className="flex gap-2 py-4 overflow-x-auto scrollbar-hide">
        {(["all", "report", "post", "official"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all border
              ${filter === f
                ? "bg-ghana-black text-ghana-gold border-ghana-black"
                : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-2)]"
              }`}
          >
            {f === "all" ? "All" : TYPE_LABELS[f]}
            {f !== "all" && (
              <span className="ml-1.5 opacity-60">
                {items.filter((i) => i.content_type === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center mt-4">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold">Queue is empty</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Nothing pending moderation.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => {
            const state = actionState[item.id];
            const isDone = state === "done";

            return (
              <div
                key={item.id}
                className={`card overflow-hidden transition-all duration-300 ${isDone ? "opacity-30 scale-95 pointer-events-none" : ""}`}
              >
                {/* Item header */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  <span className={`badge text-xs ${TYPE_COLORS[item.content_type]}`}>
                    {TYPE_LABELS[item.content_type]}
                  </span>
                  <span className="text-xs text-[var(--text-subtle)] ml-auto">
                    {new Date(item.created_at).toLocaleString("en-GH", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Preview */}
                <div className="px-4 pb-3">
                  {item.content_type === "report" && (
                    <div className="flex items-start gap-3">
                      {item.preview.image_url && (
                        <img
                          src={item.preview.image_url}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-[var(--border)]"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{CATEGORY_EMOJI[item.preview.category] ?? "📌"}</span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {REPORT_CATEGORY_LABELS[item.preview.category as keyof typeof REPORT_CATEGORY_LABELS]}
                          </span>
                        </div>
                        <p className="font-bold text-sm leading-tight">{item.preview.title}</p>
                        <p className="text-xs text-[var(--text-subtle)] mt-1">
                          By: {item.preview.reporter_public_name}
                          <span className="ml-1 opacity-60">({item.preview.reporter_anonymity_level})</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {item.content_type === "post" && (
                    <div>
                      <p className="text-sm leading-relaxed line-clamp-3">{item.preview.content}</p>
                      <p className="text-xs text-[var(--text-subtle)] mt-2">
                        By: {item.preview.poster_public_name}
                        <span className="ml-1 opacity-60">({item.preview.poster_anonymity_level})</span>
                      </p>
                    </div>
                  )}

                  {item.content_type === "official" && (
                    <div>
                      <p className="font-bold text-sm">{item.preview.full_name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {OFFICIAL_ROLE_LABELS[item.preview.role as keyof typeof OFFICIAL_ROLE_LABELS]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-[var(--border)]">
                  <button
                    onClick={() => { setRejectModal({ id: item.id }); setRejectNote(""); }}
                    disabled={!!state}
                    className="flex-1 py-3 text-sm font-semibold text-ghana-red
                               hover:bg-ghana-red/5 transition-colors border-r border-[var(--border)]
                               disabled:opacity-40"
                  >
                    {state === "rejecting" ? "Rejecting…" : "✕ Reject"}
                  </button>
                  <button
                    onClick={() => approve(item.id)}
                    disabled={!!state}
                    className="flex-1 py-3 text-sm font-semibold text-ghana-green
                               hover:bg-ghana-green/5 transition-colors disabled:opacity-40"
                  >
                    {state === "approving" ? "Approving…" : "✓ Approve"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm"
          onClick={() => setRejectModal(null)}>
          <div className="bg-white w-full max-w-mobile rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-lg mb-1">Reject submission</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Provide a reason. This is logged but not shown to the user.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Duplicate report, personal attack, insufficient evidence…"
              className="input min-h-[80px] resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)}
                className="btn-outline flex-1 py-3">Cancel</button>
              <button
                onClick={() => reject(rejectModal.id)}
                disabled={!rejectNote.trim()}
                className="btn-primary flex-1 py-3 disabled:opacity-40">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
