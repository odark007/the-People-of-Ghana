"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, MapPin, Landmark } from "lucide-react";
import {
  Construction, Droplets, Trash2, Zap, HeartPulse,
  BookOpen, Shield, Leaf,
} from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { REPORT_CATEGORY_LABELS, OFFICIAL_ROLE_LABELS } from "@/types";
import type { ReportCategory, OfficialRole } from "@/types";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  road:        <Construction size={15} strokeWidth={2} />,
  water:       <Droplets     size={15} strokeWidth={2} />,
  sanitation:  <Trash2       size={15} strokeWidth={2} />,
  electricity: <Zap          size={15} strokeWidth={2} />,
  health:      <HeartPulse   size={15} strokeWidth={2} />,
  education:   <BookOpen     size={15} strokeWidth={2} />,
  security:    <Shield       size={15} strokeWidth={2} />,
  environment: <Leaf         size={15} strokeWidth={2} />,
  other:       <MapPin       size={15} strokeWidth={2} />,
};

const AREA_TYPE_LABEL: Record<string, string> = {
  region:        "Region",
  district:      "District",
  municipal:     "Municipality",
  metropolitan:  "Metro",
  electoral_area:"Electoral Area",
};

interface SearchBarProps {
  variant?: "hero" | "page";
  autoFocus?: boolean;
  onResultClick?: () => void;
}

export default function SearchBar({
  variant = "hero",
  autoFocus = false,
  onResultClick,
}: SearchBarProps) {
  const router       = useRouter();
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const { query, setQuery, results, status, clear, isLoading, hasResults, isEmpty } = useSearch("all");

  useEffect(() => { setOpen(query.trim().length >= 2); }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleResultClick() {
    setOpen(false);
    onResultClick?.();
  }

  function navigateTo(path: string) {
    handleResultClick();
    router.push(path);
  }

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className={`
        flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200
        ${isHero
          ? "bg-white/10 border border-white/15 hover:border-white/30 focus-within:border-ghana-gold/60"
          : "bg-white border-2 border-[var(--border)] focus-within:border-ghana-red"}
      `}>
        {isLoading
          ? <Loader2 size={16} className={`flex-shrink-0 animate-spin ${isHero ? "text-gray-400" : "text-gray-300"}`} />
          : <Search  size={16} className={`flex-shrink-0 ${isHero ? "text-gray-400" : "text-gray-300"}`} />
        }
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search leaders, reports, areas…"
          autoFocus={autoFocus}
          className={`flex-1 bg-transparent text-sm outline-none min-w-0
            ${isHero ? "text-white placeholder:text-gray-500" : "text-[var(--gh-black)] placeholder:text-gray-400"}`}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => { clear(); inputRef.current?.focus(); }}
            className={`flex-shrink-0 transition-colors
              ${isHero ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50
                        bg-white rounded-2xl shadow-xl border border-[var(--border)]
                        max-h-[70vh] overflow-y-auto animate-slide-up">

          {/* Loading skeleton */}
          {isLoading && (
            <div className="p-3 flex flex-col gap-2">
              {[1,2,3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="skeleton h-3.5 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {isEmpty && !isLoading && (
            <div className="p-8 text-center">
              <Search size={32} className="mx-auto text-[var(--text-subtle)] mb-2" strokeWidth={1.5} />
              <p className="font-semibold text-sm">No results for "{query}"</p>
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                Try a different term or browse the directory
              </p>
            </div>
          )}

          {/* Results */}
          {hasResults && !isLoading && results && (
            <div className="py-2">
              {/* Reports */}
              {results.reports.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest">
                      Reports
                    </span>
                  </div>
                  {results.reports.map((r: any) => (
                    <button key={r.id} onClick={() => navigateTo(`/reports/${r.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left">
                      <span className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)]">
                        {CATEGORY_ICONS[r.category] ?? <MapPin size={15} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{r.title}</p>
                        <p className="text-xs text-[var(--text-subtle)] truncate">
                          {REPORT_CATEGORY_LABELS[r.category as ReportCategory]} ·{" "}
                          {r.district?.name ?? r.region?.name ?? "Ghana"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Officials */}
              {results.officials.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest">
                      Leaders
                    </span>
                  </div>
                  {results.officials.map((o: any) => (
                    <button key={o.id} onClick={() => navigateTo(`/directory/officials/${o.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left">
                      <div className="w-8 h-8 rounded-lg bg-ghana-green/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--border)]">
                        {o.photo_url
                          ? <img src={o.photo_url} alt="" className="w-full h-full object-cover" />
                          : <Landmark size={15} className="text-ghana-green" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{o.full_name}</p>
                        <p className="text-xs text-[var(--text-subtle)] truncate">
                          {OFFICIAL_ROLE_LABELS[o.role as OfficialRole]} ·{" "}
                          {o.region?.name ?? ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Areas */}
              {results.areas.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest">
                      Areas
                    </span>
                  </div>
                  {results.areas.map((a: any) => (
                    <button key={`${a._type}-${a.id}`} onClick={() => navigateTo("/directory")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left">
                      <div className="w-8 h-8 rounded-lg bg-ghana-gold/15 flex items-center justify-center flex-shrink-0">
                        <MapPin size={15} className="text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{a.name}</p>
                        <p className="text-xs text-[var(--text-subtle)]">
                          {AREA_TYPE_LABEL[a.type ?? a._type] ?? a._type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* View all */}
              <div className="px-4 pt-2 pb-3 border-t border-[var(--border)] mt-2">
                <button onClick={() => navigateTo(`/search?q=${encodeURIComponent(query)}`)}
                  className="text-xs text-ghana-green font-semibold hover:underline">
                  View all results for "{query}" →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
