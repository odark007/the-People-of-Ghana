"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Landmark, Construction, Droplets, Trash2, Zap, HeartPulse, BookOpen, Shield, Leaf } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import SearchBar from "@/components/ui/SearchBar";
import { REPORT_CATEGORY_LABELS, OFFICIAL_ROLE_LABELS } from "@/types";
import type { ReportCategory, OfficialRole } from "@/types";

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

const AREA_TYPE_ICON: Record<string, React.ReactNode> = {
  region:        <MapPin size={18} strokeWidth={2} />,
  district:      <MapPin size={18} strokeWidth={2} />,
  municipal:     <MapPin size={18} strokeWidth={2} />,
  metropolitan:  <MapPin size={18} strokeWidth={2} />,
  electoral_area:<MapPin size={18} strokeWidth={2} />,
};

interface SearchPageClientProps {
  initialQuery: string;
}

export default function SearchPageClient({ initialQuery }: SearchPageClientProps) {
  const { query, setQuery, results, status, isLoading, hasResults, isEmpty } = useSearch("all");

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  return (
    <div>
      {/* Search input */}
      <div className="pb-2">
        <SearchBar variant="hero" autoFocus={!initialQuery} />
      </div>

      {/* Results */}
      <div className="bg-[var(--surface)] min-h-screen px-4 pt-4 pb-24">

        {/* Idle state */}
        {status === "idle" && (
          <div className="text-center pt-16">
            <Search size={48} className="mx-auto text-[var(--text-subtle)] mb-4" strokeWidth={1.5} />
            <p className="font-bold text-lg">Search People of Ghana</p>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed max-w-xs mx-auto">
              Find leaders, community reports, regions, districts, and electoral areas.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {["Accra","Kumasi","Volta","MP","Water","Roads"].map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-3.5 py-1.5 rounded-full border border-[var(--border)] text-sm
                             font-medium text-[var(--text-muted)] hover:border-ghana-black hover:text-ghana-black
                             bg-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {isEmpty && (
          <div className="text-center pt-12">
            <Search size={40} className="mx-auto text-[var(--text-subtle)] mb-3" strokeWidth={1.5} />
            <p className="font-bold">No results for "{query}"</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Try different keywords or browse the directory.
            </p>
            <Link href="/directory" className="btn-outline inline-flex mt-4 text-sm">
              Browse Directory
            </Link>
          </div>
        )}

        {/* Results */}
        {hasResults && !isLoading && results && (
          <div className="flex flex-col gap-6">
            <p className="text-xs text-[var(--text-subtle)]">
              <span className="font-bold text-[var(--gh-black)]">{results.total}</span> results for "{query}"
            </p>

            {/* Reports */}
            {results.reports.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-3">
                  Reports ({results.reports.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {results.reports.map((r: any) => (
                    <Link key={r.id} href={`/reports/${r.id}`} className="card-hover flex items-start gap-3 p-4">
                      <span className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)]">
                        {CATEGORY_ICONS[r.category] ?? <MapPin size={18} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-snug line-clamp-2">{r.title}</p>
                        <p className="text-xs text-[var(--text-subtle)] mt-1">
                          {REPORT_CATEGORY_LABELS[r.category as ReportCategory]}
                          {r.district?.name ? ` · ${r.district.name}` : r.region?.name ? ` · ${r.region.name}` : ""}
                        </p>
                      </div>
                      <span className="text-[var(--text-subtle)] text-sm flex-shrink-0">›</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Officials */}
            {results.officials.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-3">
                  Leaders ({results.officials.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {results.officials.map((o: any) => (
                    <Link key={o.id} href={`/directory/officials/${o.id}`} className="card-hover flex items-center gap-3 p-4">
                      <div className="w-11 h-11 rounded-xl bg-ghana-green/10 flex items-center justify-center
                                      flex-shrink-0 overflow-hidden border border-[var(--border)]">
                        {o.photo_url
                          ? <img src={o.photo_url} alt="" className="w-full h-full object-cover" />
                          : <Landmark size={18} className="text-ghana-green" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{o.full_name}</p>
                        <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                          {OFFICIAL_ROLE_LABELS[o.role as OfficialRole]}
                          {o.region?.name ? ` · ${o.region.name}` : ""}
                        </p>
                      </div>
                      <span className="text-[var(--text-subtle)] text-sm flex-shrink-0">›</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Areas */}
            {results.areas.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-3">
                  Areas ({results.areas.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {results.areas.map((a: any) => (
                    <Link key={`${a._type}-${a.id}`} href="/directory" className="card-hover flex items-center gap-3 p-4">
                      <div className="w-11 h-11 rounded-xl bg-ghana-gold/10 flex items-center justify-center flex-shrink-0">
                        {AREA_TYPE_ICON[a.type ?? a._type] ?? <MapPin size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{a.name}</p>
                        <p className="text-xs text-[var(--text-subtle)] mt-0.5 capitalize">
                          {(a.type ?? a._type).replace(/_/g, " ")}
                        </p>
                      </div>
                      <span className="text-[var(--text-subtle)] text-sm flex-shrink-0">›</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
