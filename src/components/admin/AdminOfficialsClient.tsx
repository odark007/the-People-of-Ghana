"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { OFFICIAL_ROLE_LABELS } from "@/types";
import type { OfficialRole } from "@/types";

const VERIFICATION_BADGE: Record<string, { label: string; cls: string }> = {
  verified:   { label: "✓ Verified",   cls: "badge-green" },
  pending:    { label: "⏳ Pending",    cls: "badge-gold"  },
  unverified: { label: "❓ Unverified", cls: "badge-gray"  },
};

const ROLE_OPTIONS = Object.entries(OFFICIAL_ROLE_LABELS) as [OfficialRole, string][];

const EMPTY_FORM = {
  full_name:           "",
  role:                "assembly_member" as OfficialRole,
  verification_status: "pending",
  region_id:           "",
  constituency_id:     "",
  district_id:         "",
  electoral_area_id:   "",
  phone:               "",
  email:               "",
  office_address:      "",
  term_start:          "",
  term_end:            "",
  photo_url:           "",
};

export default function AdminOfficialsClient() {
  const [officials,    setOfficials]    = useState<any[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [isLoading,    setIsLoading]    = useState(true);
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [vs,           setVs]           = useState("");
  const [panelMode,    setPanelMode]    = useState<"create" | "edit" | null>(null);
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [isSaving,     setIsSaving]     = useState(false);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [formError,    setFormError]    = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPh,setIsUploadingPh]= useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [regions,        setRegions]        = useState<any[]>([]);
  const [constituencies, setConstituencies] = useState<any[]>([]);
  const [districts,      setDistricts]      = useState<any[]>([]);
  const [electoralAreas, setElectoralAreas] = useState<any[]>([]);

  const LIMIT = 20;

  const fetchOfficials = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page:  String(page),
      limit: String(LIMIT),
    });
    if (search) params.set("q", search);
    if (vs)     params.set("verification_status", vs);
    const res  = await fetch(`/api/admin/officials?${params}`);
    const data = await res.json();
    setOfficials(data.data?.officials ?? []);
    setTotal(data.data?.total ?? 0);
    setIsLoading(false);
  }, [page, search, vs]);

  useEffect(() => { fetchOfficials(); }, [fetchOfficials]);

  useEffect(() => {
    fetch("/api/governance/regions")
      .then((r) => r.json())
      .then((d) => setRegions(d.data ?? []));
  }, []);

  async function onRegionChange(id: string) {
    setForm((p) => ({ ...p, region_id: id, constituency_id: "", district_id: "", electoral_area_id: "" }));
    setConstituencies([]); setDistricts([]); setElectoralAreas([]);
    if (!id) return;
    const res  = await fetch(`/api/governance/constituencies?region_id=${id}`);
    const data = await res.json();
    setConstituencies(data.data ?? []);
  }

  async function onConstituencyChange(id: string) {
    setForm((p) => ({ ...p, constituency_id: id, district_id: "", electoral_area_id: "" }));
    setDistricts([]); setElectoralAreas([]);
    if (!id) return;
    const res  = await fetch(`/api/governance/districts?constituency_id=${id}`);
    const data = await res.json();
    setDistricts(data.data ?? []);
  }

  async function onDistrictChange(id: string) {
    setForm((p) => ({ ...p, district_id: id, electoral_area_id: "" }));
    setElectoralAreas([]);
    if (!id) return;
    const res  = await fetch(`/api/governance/electoral-areas?district_id=${id}`);
    const data = await res.json();
    setElectoralAreas(data.data ?? []);
  }

  async function handlePhotoSelect(file: File) {
    setIsUploadingPh(true);
    setPhotoPreview(URL.createObjectURL(file));
    const form2 = new FormData();
    form2.append("image", file);
    const res  = await fetch("/api/upload", { method: "POST", body: form2 });
    const data = await res.json();
    if (res.ok) setForm((p) => ({ ...p, photo_url: data.data.url }));
    setIsUploadingPh(false);
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setPhotoPreview(null);
    setEditId(null);
    setFormError("");
    setConstituencies([]); setDistricts([]); setElectoralAreas([]);
    setPanelMode("create");
  }

  async function openEdit(official: any) {
    setFormError("");
    setEditId(official.id);
    setPhotoPreview(official.photo_url ?? null);
    setForm({
      full_name:           official.full_name           ?? "",
      role:                official.role,
      verification_status: official.verification_status,
      region_id:           official.region?.id          ?? "",
      constituency_id:     official.constituency?.id    ?? "",
      district_id:         official.district?.id        ?? "",
      electoral_area_id:   official.electoral_area?.id  ?? "",
      phone:               official.phone               ?? "",
      email:               official.email               ?? "",
      office_address:      official.office_address      ?? "",
      term_start:          official.term_start           ?? "",
      term_end:            official.term_end             ?? "",
      photo_url:           official.photo_url            ?? "",
    });

    if (official.region?.id) {
      const res  = await fetch(`/api/governance/constituencies?region_id=${official.region.id}`);
      const data = await res.json();
      setConstituencies(data.data ?? []);
    }
    if (official.constituency?.id) {
      const res  = await fetch(`/api/governance/districts?constituency_id=${official.constituency.id}`);
      const data = await res.json();
      setDistricts(data.data ?? []);
    }
    if (official.district?.id) {
      const res  = await fetch(`/api/governance/electoral-areas?district_id=${official.district.id}`);
      const data = await res.json();
      setElectoralAreas(data.data ?? []);
    }

    setPanelMode("edit");
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setFormError("Full name is required."); return; }
    setFormError("");
    setIsSaving(true);

    const payload = {
      ...form,
      region_id:         form.region_id         || null,
      constituency_id:   form.constituency_id   || null,
      district_id:       form.district_id       || null,
      electoral_area_id: form.electoral_area_id || null,
      photo_url:         form.photo_url         || null,
      email:             form.email             || null,
      phone:             form.phone             || null,
      office_address:    form.office_address    || null,
      term_start:        form.term_start        || null,
      term_end:          form.term_end          || null,
    };

    const url    = panelMode === "edit"
      ? `/api/admin/officials/${editId}`
      : "/api/admin/officials";
    const method = panelMode === "edit" ? "PUT" : "POST";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    setIsSaving(false);
    if (!res.ok) { setFormError(data.error?.message ?? "Save failed."); return; }

    setPanelMode(null);
    fetchOfficials();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this official? This cannot be undone.")) return;
    setIsDeleting(true);
    await fetch(`/api/admin/officials/${id}`, { method: "DELETE" });
    setIsDeleting(false);
    setPanelMode(null);
    fetchOfficials();
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Officials</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {total.toLocaleString()} total
          </p>
        </div>
        <button onClick={openCreate} className="btn-secondary py-2 px-5 text-sm">
          + Add Official
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setSearch(searchInput); setPage(1); }
          }}
          className="input flex-1 min-w-[180px] py-2"
        />
        <button
          onClick={() => { setSearch(searchInput); setPage(1); }}
          className="btn-secondary py-2 px-4 text-sm"
        >
          Search
        </button>
        <select
          value={vs}
          onChange={(e) => { setVs(e.target.value); setPage(1); }}
          className="input w-auto py-2"
        >
          <option value="">All verification</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-ghana-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : officials.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-3xl mb-2">🏛️</p>
            <p className="text-sm text-[var(--text-muted)]">No officials found</p>
            <button onClick={openCreate} className="btn-secondary mt-4 text-sm py-2 px-4">
              Add First Official
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {officials.map((o) => {
              const badge = VERIFICATION_BADGE[o.verification_status];
              const area  = o.electoral_area?.name ?? o.district?.name
                         ?? o.constituency?.name   ?? o.region?.name ?? "—";
              return (
                <div
                  key={o.id}
                  onClick={() => openEdit(o)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface-2)]
                             cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]
                                  flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                    {o.photo_url
                      ? <img src={o.photo_url} alt="" className="w-full h-full object-cover" />
                      : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{o.full_name}</p>
                    <p className="text-xs text-[var(--text-subtle)]">
                      {OFFICIAL_ROLE_LABELS[o.role as OfficialRole]} · {area}
                    </p>
                  </div>
                  <span className={`badge text-[10px] flex-shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Create / Edit panel */}
      {panelMode && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center
                     justify-center backdrop-blur-sm"
          onClick={() => setPanelMode(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-2xl
                       max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="sticky top-0 bg-white border-b border-[var(--border)]
                            px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">
                {panelMode === "create" ? "Add Official" : "Edit Official"}
              </h2>
              <button
                onClick={() => setPanelMode(null)}
                className="text-[var(--text-subtle)] hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Photo */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)]
                                 uppercase tracking-wider mb-2">
                  Photo
                </label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handlePhotoSelect(e.target.files[0]);
                  }}
                />
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border)]
                               flex items-center justify-center cursor-pointer
                               hover:border-ghana-green overflow-hidden bg-[var(--surface-2)]
                               transition-colors flex-shrink-0"
                  >
                    {isUploadingPh ? (
                      <div className="w-5 h-5 border-2 border-ghana-green border-t-transparent
                                      rounded-full animate-spin" />
                    ) : photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-sm font-semibold text-ghana-green hover:underline"
                    >
                      {photoPreview ? "Change photo" : "Upload photo"}
                    </button>
                    <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                      EXIF stripped automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Full name */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)]
                                 uppercase tracking-wider mb-2">
                  Full Name <span className="text-ghana-red">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Hon. Kwame Mensah"
                  className="input"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)]
                                 uppercase tracking-wider mb-2">
                  Role <span className="text-ghana-red">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as OfficialRole }))}
                  className="input"
                >
                  {ROLE_OPTIONS.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Verification status */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)]
                                 uppercase tracking-wider mb-2">
                  Verification Status
                </label>
                <select
                  value={form.verification_status}
                  onChange={(e) => setForm((p) => ({ ...p, verification_status: e.target.value }))}
                  className="input"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>

              {/* Jurisdiction */}
              <div className="bg-[var(--surface-2)] rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Jurisdiction
                </p>
                <select
                  value={form.region_id}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="input"
                >
                  <option value="">Select region…</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {constituencies.length > 0 && (
                  <select
                    value={form.constituency_id}
                    onChange={(e) => onConstituencyChange(e.target.value)}
                    className="input"
                  >
                    <option value="">Select constituency…</option>
                    {constituencies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                {districts.length > 0 && (
                  <select
                    value={form.district_id}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    className="input"
                  >
                    <option value="">Select district…</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
                {electoralAreas.length > 0 && (
                  <select
                    value={form.electoral_area_id}
                    onChange={(e) => setForm((p) => ({ ...p, electoral_area_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Select electoral area…</option>
                    {electoralAreas.map((ea) => (
                      <option key={ea.id} value={ea.id}>{ea.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Contact */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Contact
                </p>
                {[
                  { key: "phone",          label: "Phone",          placeholder: "+233 24 000 0000" },
                  { key: "email",          label: "Email",          placeholder: "official@gov.gh"  },
                  { key: "office_address", label: "Office Address", placeholder: "Office location"  },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-[var(--text-subtle)] mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={(form as any)[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="input"
                    />
                  </div>
                ))}
              </div>

              {/* Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-subtle)] mb-1">
                    Term Start
                  </label>
                  <input
                    type="date"
                    value={form.term_start}
                    onChange={(e) => setForm((p) => ({ ...p, term_start: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-subtle)] mb-1">
                    Term End
                  </label>
                  <input
                    type="date"
                    value={form.term_end}
                    onChange={(e) => setForm((p) => ({ ...p, term_end: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-ghana-red text-sm">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {panelMode === "edit" && (
                  <button
                    onClick={() => handleDelete(editId!)}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl border-2 border-ghana-red/30 text-ghana-red
                               text-sm font-semibold hover:bg-ghana-red/5 transition-colors
                               disabled:opacity-40"
                  >
                    {isDeleting ? "Deleting…" : "🗑️ Delete"}
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving || isUploadingPh}
                  className="btn-secondary flex-1 py-3 disabled:opacity-40"
                >
                  {isSaving
                    ? "Saving…"
                    : panelMode === "create" ? "Add Official" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}