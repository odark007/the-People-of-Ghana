"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Construction, Droplets, Trash2, Zap, HeartPulse,
  BookOpen, Shield, Leaf, MapPin, CheckCircle,
  AlertCircle, Clock, XCircle, RefreshCw,
  Heart, Share2, Pencil, X,
} from "lucide-react";
import { REPORT_CATEGORY_LABELS } from "@/types";
import type { ReportCategory } from "@/types";

type FeedType = "all" | "reports" | "posts";

interface ReportItem {
  _type: "report";
  id: string;
  title: string;
  category: ReportCategory;
  status: string;
  image_url: string;
  reporter_public_name: string;
  reporter_anonymity_level: string;
  created_at: string;
  region?: { name: string };
  district?: { name: string };
}

interface PostItem {
  _type: "post";
  id: string;
  content: string;
  image_url?: string;
  poster_public_name: string;
  poster_anonymity_level: string;
  created_at: string;
  region?: { name: string };
}

type FeedItem = ReportItem | PostItem;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  road:        <Construction size={18} strokeWidth={2} />,
  water:       <Droplets     size={18} strokeWidth={2} />,
  sanitation:  <Trash2       size={18} strokeWidth={2} />,
  electricity: <Zap          size={18} strokeWidth={2} />,
  health:      <HeartPulse   size={18} strokeWidth={2} />,
  education:   <BookOpen     size={18} strokeWidth={2} />,
  security:    <Shield       size={18} strokeWidth={2} />,
  environment: <Leaf         size={18} strokeWidth={2} />,
  other:       <MapPin       size={18} strokeWidth={2} />,
};

const CATEGORY_ACCENT: Record<string, string> = {
  road:        "bg-ghana-red",
  water:       "bg-blue-400",
  sanitation:  "bg-amber-400",
  electricity: "bg-yellow-400",
  health:      "bg-ghana-green",
  education:   "bg-purple-400",
  security:    "bg-gray-400",
  environment: "bg-green-400",
  other:       "bg-ghana-red",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  published:   { label: "Open",        cls: "status-published", icon: <AlertCircle  size={11} /> },
  in_progress: { label: "In Progress", cls: "status-progress",  icon: <RefreshCw    size={11} /> },
  resolved:    { label: "Resolved",    cls: "status-resolved",  icon: <CheckCircle  size={11} /> },
};

const CATEGORY_FILTERS: Array<{ key: ReportCategory | "all"; label: string }> = [
  { key: "all",         label: "All"         },
  { key: "road",        label: "Roads"       },
  { key: "water",       label: "Water"       },
  { key: "electricity", label: "Electricity" },
  { key: "health",      label: "Health"      },
  { key: "education",   label: "Education"   },
  { key: "environment", label: "Environment" },
];

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

export default function FeedClient() {
  const [items,          setItems]          = useState<FeedItem[]>([]);
  const [page,           setPage]           = useState(1);
  const [hasMore,        setHasMore]        = useState(true);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [feedType,       setFeedType]       = useState<FeedType>("all");
  const [category,       setCategory]       = useState<ReportCategory | "all">("all");
  const [showCompose,    setShowCompose]     = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async (p: number, reset = false) => {
    if (p === 1) setIsLoading(true); else setIsFetchingMore(true);
    const params = new URLSearchParams({ page: String(p), limit: "15" });
    if (feedType !== "all") params.set("type", feedType);
    if (category !== "all") params.set("category", category);
    const res  = await fetch(`/api/feed?${params}`);
    const data = await res.json();
    if (res.ok && data.data) {
      setItems((prev) => reset ? data.data.items : [...prev, ...data.data.items]);
      setHasMore(data.data.hasMore);
    }
    setIsLoading(false);
    setIsFetchingMore(false);
  }, [feedType, category]);

  useEffect(() => {
    setPage(1); setItems([]);
    fetchFeed(1, true);
  }, [feedType, category]); // eslint-disable-line

  useEffect(() => {
    if (!observerRef.current || !hasMore || isFetchingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const next = page + 1;
          setPage(next);
          fetchFeed(next);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, page, fetchFeed]);

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border-b border-[var(--border)] sticky top-[57px] z-30">
        <div className="flex gap-2 px-4 pt-3 pb-2">
          {(["all","reports","posts"] as FeedType[]).map((t) => (
            <button key={t} onClick={() => setFeedType(t)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border
                ${feedType === t
                  ? "bg-ghana-black text-ghana-gold border-ghana-black"
                  : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-2)]"}`}>
              {t === "all" ? "All" : t === "reports" ? "Reports" : "Posts"}
            </button>
          ))}
        </div>
        {feedType !== "posts" && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {CATEGORY_FILTERS.map(({ key, label }) => (
              <button key={key} onClick={() => setCategory(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                  ${category === key
                    ? "bg-ghana-red text-white border-ghana-red"
                    : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-2)]"}`}>
                {key !== "all" && <span className={category === key ? "text-white" : "text-[var(--text-subtle)]"}>
                  {CATEGORY_ICONS[key]}
                </span>}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feed list */}
      <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
        {isLoading && (
          <>
            {[1,2,3].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton h-44 w-full" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="skeleton h-3.5 w-1/3 rounded" />
                  <div className="skeleton h-4 w-5/6 rounded" />
                  <div className="skeleton h-3 w-2/4 rounded" />
                </div>
              </div>
            ))}
          </>
        )}

        {!isLoading && items.length === 0 && (
          <div className="card p-12 text-center mt-4">
            <Clock size={40} className="mx-auto text-[var(--text-subtle)] mb-3" strokeWidth={1.5} />
            <p className="font-bold">Nothing here yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {category !== "all" ? "No approved reports in this category." : "Be the first to report an issue."}
            </p>
            <Link href="/reports/new" className="btn-primary inline-flex mt-4 text-sm">
              Report an Issue
            </Link>
          </div>
        )}

        {items.map((item) =>
          item._type === "report" ? (
            <ReportCard key={item.id} item={item} />
          ) : (
            <PostCard key={item.id} item={item} />
          )
        )}

        <div ref={observerRef} className="h-1" />

        {isFetchingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-ghana-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <p className="text-center text-xs text-[var(--text-subtle)] py-4">
            You've seen all {items.length} items
          </p>
        )}
      </div>

      {/* Compose FAB */}
      {showCompose && (
        <ComposePost
          onClose={() => setShowCompose(false)}
          onSubmit={() => { setShowCompose(false); fetchFeed(1, true); }}
        />
      )}

      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-4 w-12 h-12 bg-ghana-green rounded-full shadow-lg
                   flex items-center justify-center text-white z-30
                   hover:bg-green-700 active:scale-95 transition-all"
        aria-label="Write a post"
      >
        <Pencil size={18} />
      </button>
    </div>
  );
}

function ReportCard({ item }: { item: ReportItem }) {
  const statusCfg = STATUS_CONFIG[item.status] ?? { label: item.status, cls: "badge-gray", icon: null };
  const location  = item.district?.name ?? item.region?.name ?? "Ghana";
  const accent    = CATEGORY_ACCENT[item.category] ?? "bg-ghana-red";

  return (
    <Link href={`/reports/${item.id}`} className="card-hover overflow-hidden block">
      <div className={`h-1 w-full ${accent}`} />
      {item.image_url && (
        <div className="relative h-44 bg-[var(--surface-2)] overflow-hidden">
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute top-3 left-3">
            <span className={`badge text-[10px] flex items-center gap-1 ${statusCfg.cls}`}>
              {statusCfg.icon}{statusCfg.label}
            </span>
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[var(--text-subtle)]">{CATEGORY_ICONS[item.category]}</span>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            {REPORT_CATEGORY_LABELS[item.category]}
          </span>
          {!item.image_url && (
            <span className={`badge text-[10px] ml-auto flex items-center gap-1 ${statusCfg.cls}`}>
              {statusCfg.icon}{statusCfg.label}
            </span>
          )}
        </div>
        <h3 className="font-bold text-[15px] leading-snug mb-2 line-clamp-2">{item.title}</h3>
        <div className="flex items-center justify-between text-xs text-[var(--text-subtle)]">
          <span className="flex items-center gap-1">
            <MapPin size={11} />{location}
          </span>
          <span>{relativeTime(item.created_at)}</span>
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2 border-t border-[var(--border)]">
        <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs flex-shrink-0">
          {item.reporter_public_name.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs text-[var(--text-muted)] truncate">{item.reporter_public_name}</span>
        <span className="text-[10px] text-[var(--text-subtle)] ml-auto opacity-60">
          {item.reporter_anonymity_level}
        </span>
      </div>
    </Link>
  );
}

function PostCard({ item }: { item: PostItem }) {
  const [liked, setLiked] = useState(false);
  return (
    <div className="card overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-ghana-green/10 flex items-center justify-center
                          font-bold text-ghana-green text-sm flex-shrink-0">
            {item.poster_public_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{item.poster_public_name}</p>
            <p className="text-[10px] text-[var(--text-subtle)]">{relativeTime(item.created_at)}</p>
          </div>
          <span className="ml-auto text-[10px] badge badge-gray">{item.poster_anonymity_level}</span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--gh-black)]">{item.content}</p>
        {item.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden">
            <img src={item.image_url} alt="" className="w-full object-cover max-h-52" loading="lazy" />
          </div>
        )}
      </div>
      <div className="flex border-t border-[var(--border)]">
        <button
          onClick={() => setLiked((p) => !p)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
                      transition-colors hover:bg-[var(--surface-2)]
                      ${liked ? "text-ghana-red" : "text-[var(--text-muted)]"}`}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} /> Helpful
        </button>
        <div className="w-px bg-[var(--border)]" />
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
                           text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
          <Share2 size={14} /> Share
        </button>
      </div>
    </div>
  );
}

function ComposePost({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [content,      setContent]     = useState("");
  const [isSubmitting, setSubmitting]  = useState(false);
  const [error,        setError]       = useState("");

  async function submit() {
    if (content.trim().length < 10) { setError("Post must be at least 10 characters."); return; }
    setSubmitting(true);
    const res  = await fetch("/api/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error?.message ?? "Failed to post."); setSubmitting(false); return; }
    onSubmit();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white w-full max-w-mobile rounded-t-3xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Write a Post</h3>
          <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-black">
            <X size={20} />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setError(""); }}
          placeholder="Share civic news, updates, or community information…"
          className="input min-h-[120px] resize-none mb-1"
          maxLength={1000} autoFocus
        />
        <p className="text-right text-xs text-[var(--text-subtle)] mb-3">{content.length}/1000</p>
        {error && <p className="text-ghana-red text-xs mb-3">{error}</p>}
        <div className="bg-ghana-green/5 border border-ghana-green/20 rounded-xl px-3 py-2 mb-4">
          <p className="text-xs text-[var(--text-muted)]">
            Your post will appear under your chosen anonymity name and requires approval before going live.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline flex-1 py-3">Cancel</button>
          <button
            onClick={submit}
            disabled={isSubmitting || content.trim().length < 10}
            className="btn-green flex-1 py-3 disabled:opacity-40"
          >
            {isSubmitting ? "Submitting…" : "Submit Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
