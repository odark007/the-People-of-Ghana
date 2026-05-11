"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Map, Landmark, Building2, MapPin,
  ChevronRight, CheckCircle, Clock, HelpCircle,
} from "lucide-react";
import type { Region, Constituency, District, ElectoralArea, Official } from "@/types";
import { OFFICIAL_ROLE_LABELS } from "@/types";

interface DirectoryBrowserProps {
  regions: Region[];
}

type Level = "region" | "constituency" | "district" | "electoral" | "officials";

interface Breadcrumb {
  label: string;
  level: Level;
}

const ROLE_COLORS: Record<string, string> = {
  regional_minister: "badge-red",
  mp:                "badge-gold",
  mmdce:             "badge-green",
  assembly_member:   "badge-gray",
};

const VERIFICATION_ICON: Record<string, React.ReactNode> = {
  verified:   <CheckCircle size={16} className="text-ghana-green" />,
  pending:    <Clock       size={16} className="text-amber-500"   />,
  unverified: <HelpCircle  size={16} className="text-gray-400"    />,
};

export default function DirectoryBrowser({ regions }: DirectoryBrowserProps) {
  const [level,               setLevel]               = useState<Level>("region");
  const [selectedRegion,      setSelectedRegion]      = useState<Region | null>(null);
  const [selectedConstituency,setSelectedConstituency]= useState<Constituency | null>(null);
  const [selectedDistrict,    setSelectedDistrict]    = useState<District | null>(null);
  const [constituencies,      setConstituencies]      = useState<Constituency[]>([]);
  const [districts,           setDistricts]           = useState<District[]>([]);
  const [electoralAreas,      setElectoralAreas]      = useState<ElectoralArea[]>([]);
  const [officials,           setOfficials]           = useState<Official[]>([]);
  const [isLoading,           setIsLoading]           = useState(false);

  async function fetchConstituencies(regionId: string) {
    setIsLoading(true);
    const res  = await fetch(`/api/governance/constituencies?region_id=${regionId}`);
    const data = await res.json();
    setConstituencies(data.data ?? []);
    setIsLoading(false);
  }

  async function fetchDistricts(constituencyId: string) {
    setIsLoading(true);
    const res  = await fetch(`/api/governance/districts?constituency_id=${constituencyId}`);
    const data = await res.json();
    setDistricts(data.data ?? []);
    setIsLoading(false);
  }

  async function fetchElectoralAndOfficials(districtId: string) {
    setIsLoading(true);
    const [eaRes, offRes] = await Promise.all([
      fetch(`/api/governance/electoral-areas?district_id=${districtId}`),
      fetch(`/api/officials?district_id=${districtId}`),
    ]);
    const [eaData, offData] = await Promise.all([eaRes.json(), offRes.json()]);
    setElectoralAreas(eaData.data ?? []);
    setOfficials(offData.data?.officials ?? []);
    setIsLoading(false);
  }

  async function selectRegion(region: Region) {
    setSelectedRegion(region);
    setSelectedConstituency(null);
    setSelectedDistrict(null);
    await fetchConstituencies(region.id);
    setLevel("constituency");
  }

  async function selectConstituency(c: Constituency) {
    setSelectedConstituency(c);
    setSelectedDistrict(null);
    await fetchDistricts(c.id);
    setLevel("district");
  }

  async function selectDistrict(d: District) {
    setSelectedDistrict(d);
    await fetchElectoralAndOfficials(d.id);
    setLevel("electoral");
  }

  function goBack(toLevel: Level) {
    setLevel(toLevel);
    if (toLevel === "region") {
      setSelectedRegion(null); setSelectedConstituency(null); setSelectedDistrict(null);
    } else if (toLevel === "constituency") {
      setSelectedConstituency(null); setSelectedDistrict(null);
    } else if (toLevel === "district") {
      setSelectedDistrict(null);
    }
  }

  const breadcrumbs: Breadcrumb[] = [{ label: "All Regions", level: "region" }];
  if (selectedRegion)       breadcrumbs.push({ label: selectedRegion.name,       level: "constituency" });
  if (selectedConstituency) breadcrumbs.push({ label: selectedConstituency.name, level: "district"     });
  if (selectedDistrict)     breadcrumbs.push({ label: selectedDistrict.name,     level: "electoral"    });

  return (
    <div>
      {/* Breadcrumb */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide text-xs">
          {breadcrumbs.map((bc, i) => (
            <span key={bc.level} className="flex items-center gap-1.5 flex-shrink-0">
              {i > 0 && <ChevronRight size={12} className="text-[var(--text-subtle)]" />}
              <button
                onClick={() => goBack(bc.level)}
                className={`font-semibold ${i === breadcrumbs.length - 1
                  ? "text-ghana-black"
                  : "text-ghana-green hover:underline"}`}
              >
                {bc.label}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <div className="px-4 pb-8">
          {/* Regions */}
          {level === "region" && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3 mt-3">
                Select a region
              </p>
              <div className="flex flex-col gap-2">
                {regions.map((r) => (
                  <button key={r.id} onClick={() => selectRegion(r)}
                    className="card-hover flex items-center gap-3 p-4 text-left w-full">
                    <div className="w-9 h-9 rounded-xl bg-ghana-green/10 flex items-center justify-center flex-shrink-0">
                      <Map size={16} className="text-ghana-green" />
                    </div>
                    <span className="font-semibold text-sm flex-1">{r.name} Region</span>
                    <ChevronRight size={16} className="text-[var(--text-subtle)]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Constituencies */}
          {level === "constituency" && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3 mt-3">
                Select a constituency
              </p>
              <div className="flex flex-col gap-2">
                {constituencies.map((c) => (
                  <button key={c.id} onClick={() => selectConstituency(c)}
                    className="card-hover flex items-center gap-3 p-4 text-left w-full">
                    <div className="w-9 h-9 rounded-xl bg-ghana-gold/15 flex items-center justify-center flex-shrink-0">
                      <Landmark size={16} className="text-amber-700" />
                    </div>
                    <span className="font-semibold text-sm flex-1">{c.name}</span>
                    <ChevronRight size={16} className="text-[var(--text-subtle)]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Districts */}
          {level === "district" && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3 mt-3">
                Select a district
              </p>
              <div className="flex flex-col gap-2">
                {districts.map((d) => (
                  <button key={d.id} onClick={() => selectDistrict(d)}
                    className="card-hover flex items-center gap-3 p-4 text-left w-full">
                    <div className="w-9 h-9 rounded-xl bg-ghana-red/10 flex items-center justify-center flex-shrink-0">
                      <Building2 size={16} className="text-ghana-red" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{d.name}</p>
                      <p className="text-xs text-[var(--text-subtle)] capitalize">{d.type}</p>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-subtle)]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Electoral Areas + Officials */}
          {level === "electoral" && (
            <div className="flex flex-col gap-6 mt-3">
              {officials.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">
                    District Officials
                  </p>
                  <div className="flex flex-col gap-2">
                    {officials.map((o) => (
                      <Link key={o.id} href={`/directory/officials/${o.id}`}
                        className="card-hover flex items-center gap-3 p-4">
                        <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] flex items-center justify-center
                                        flex-shrink-0 border border-[var(--border)] overflow-hidden">
                          {o.photo_url
                            ? <img src={o.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                            : <Landmark size={20} className="text-[var(--text-subtle)]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`badge text-[10px] ${ROLE_COLORS[o.role] ?? "badge-gray"}`}>
                              {OFFICIAL_ROLE_LABELS[o.role]}
                            </span>
                          </div>
                          <p className="font-bold text-sm leading-tight truncate">{o.full_name}</p>
                        </div>
                        <span className="text-sm flex-shrink-0">
                          {VERIFICATION_ICON[o.verification_status]}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {electoralAreas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">
                    Electoral Areas
                  </p>
                  <div className="flex flex-col gap-2">
                    {electoralAreas.map((ea) => (
                      <div key={ea.id} className="card flex items-center gap-3 p-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
                          <MapPin size={16} className="text-[var(--text-subtle)]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{ea.name}</p>
                          <p className="text-xs text-[var(--text-subtle)]">Electoral Area</p>
                        </div>
                        <HelpCircle size={16} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {officials.length === 0 && electoralAreas.length === 0 && (
                <div className="card p-10 text-center">
                  <Landmark size={40} className="mx-auto text-[var(--text-subtle)] mb-3" strokeWidth={1.5} />
                  <p className="font-semibold text-sm">No data yet</p>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    Officials for this area haven't been verified yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
