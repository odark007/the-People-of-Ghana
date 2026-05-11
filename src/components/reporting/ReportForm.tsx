"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Construction, Droplets, Trash2, Zap, HeartPulse,
  BookOpen, Shield, Leaf, MapPin, Camera, Lock,
  Navigation, AlertTriangle, CheckCircle, Megaphone,
} from "lucide-react";
import { REPORT_CATEGORY_LABELS, type ReportCategory } from "@/types";
import { validateImageFile } from "@/lib/validation";

const CATEGORIES = Object.entries(REPORT_CATEGORY_LABELS) as [ReportCategory, string][];

const CATEGORY_ICONS: Record<ReportCategory, React.ReactNode> = {
  road:        <Construction size={20} strokeWidth={2} />,
  water:       <Droplets     size={20} strokeWidth={2} />,
  sanitation:  <Trash2       size={20} strokeWidth={2} />,
  electricity: <Zap          size={20} strokeWidth={2} />,
  health:      <HeartPulse   size={20} strokeWidth={2} />,
  education:   <BookOpen     size={20} strokeWidth={2} />,
  security:    <Shield       size={20} strokeWidth={2} />,
  environment: <Leaf         size={20} strokeWidth={2} />,
  other:       <MapPin       size={20} strokeWidth={2} />,
};

const CATEGORY_ACCENT: Record<ReportCategory, string> = {
  road:        "border-ghana-red   bg-ghana-red/5",
  water:       "border-blue-400    bg-blue-50",
  sanitation:  "border-amber-400   bg-amber-50",
  electricity: "border-yellow-400  bg-yellow-50",
  health:      "border-ghana-green bg-ghana-green/5",
  education:   "border-purple-400  bg-purple-50",
  security:    "border-gray-400    bg-gray-50",
  environment: "border-green-400   bg-green-50",
  other:       "border-ghana-red   bg-ghana-red/5",
};

interface GpsState {
  latitude:  number | null;
  longitude: number | null;
  status:    "idle" | "detecting" | "found" | "error" | "manual";
  label:     string;
}

export default function ReportForm() {
  const router = useRouter();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState<ReportCategory | "">("");
  const [imagePreview,setImagePreview]= useState<string | null>(null);
  const [imageUrl,    setImageUrl]    = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gps, setGps] = useState<GpsState>({
    latitude: null, longitude: null, status: "idle", label: "",
  });
  const [regions,          setRegions]          = useState<any[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [submitted,    setSubmitted]    = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    const err = validateImageFile(file);
    if (err) { setUploadError(err); return; }
    setUploadError(null);
    setImageUrl(null);
    setImagePreview(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Upload failed");
      setImageUrl(data.data.url);
      clearError("image");
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed. Please try again.");
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  function clearImage() {
    setImagePreview(null); setImageUrl(null); setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function detectGps() {
    if (!navigator.geolocation) {
      setGps({ latitude: null, longitude: null, status: "error", label: "GPS not supported on this device." });
      loadRegions(); return;
    }
    setGps({ latitude: null, longitude: null, status: "detecting", label: "Detecting your location…" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          latitude: pos.coords.latitude, longitude: pos.coords.longitude, status: "found",
          label: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (±${Math.round(pos.coords.accuracy)}m)`,
        });
        clearError("location");
      },
      (err) => {
        setGps({ latitude: null, longitude: null, status: "error",
          label: err.code === 1 ? "Location permission denied. Select your region manually." : "Could not detect GPS." });
        loadRegions();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function loadRegions() {
    if (regions.length > 0) return;
    const res  = await fetch("/api/governance/regions");
    const data = await res.json();
    setRegions(data.data ?? []);
  }

  function clearError(field: string) {
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (title.trim().length < 10)       e.title       = "Title must be at least 10 characters";
    if (description.trim().length < 20) e.description = "Description must be at least 20 characters";
    if (!category)                      e.category    = "Please select a category";
    if (!imageUrl)                      e.image       = isUploading ? "Please wait for the image to finish uploading" : "A photo is required";
    if (gps.latitude === null)          e.location    = "Location is required — tap Detect GPS or select your region";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category, latitude: gps.latitude, longitude: gps.longitude, image_url: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.error?.message ?? "Submission failed." }); return; }
      setSubmitted(true);
      setTimeout(() => router.push("/feed"), 2500);
    } catch {
      setErrors({ submit: "Network error. Please check your connection." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-ghana-green/10 flex items-center justify-center mb-5">
          <CheckCircle size={40} className="text-ghana-green" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-2xl font-bold mb-2">Report Submitted!</h2>
        <p className="text-[var(--text-muted)] text-sm max-w-xs leading-relaxed">
          Your report is awaiting moderation and will appear in the feed once approved.
        </p>
        <p className="text-xs text-[var(--text-subtle)] mt-4">Redirecting to feed…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-8 flex flex-col gap-5 mt-5" noValidate>

      {/* Title */}
      <div>
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Issue Title <span className="text-ghana-red">*</span>
        </label>
        <input
          type="text" value={title}
          onChange={(e) => { setTitle(e.target.value); clearError("title"); }}
          placeholder="e.g. Collapsed bridge on Achimota Road"
          className={`input ${errors.title ? "input-error" : ""}`} maxLength={120}
        />
        {errors.title && <p className="text-ghana-red text-xs mt-1">{errors.title}</p>}
        <p className="text-xs text-[var(--text-subtle)] mt-1 text-right">{title.length}/120</p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Category <span className="text-ghana-red">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(([key, label]) => (
            <button
              key={key} type="button"
              onClick={() => { setCategory(key); clearError("category"); }}
              className={`
                flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center
                ${category === key
                  ? `${CATEGORY_ACCENT[key]} scale-[1.02]`
                  : "border-[var(--border)] bg-white hover:border-[var(--border-2)]"}
              `}
            >
              <span className={category === key ? "opacity-100" : "opacity-50"}>
                {CATEGORY_ICONS[key]}
              </span>
              <span className="text-[10px] font-semibold leading-tight text-[var(--text-muted)]">{label}</span>
            </button>
          ))}
        </div>
        {errors.category && <p className="text-ghana-red text-xs mt-1">{errors.category}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Description <span className="text-ghana-red">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); clearError("description"); }}
          placeholder="Describe the issue. When did it start? How does it affect the community?"
          className={`input min-h-[100px] resize-none ${errors.description ? "input-error" : ""}`}
          maxLength={2000} rows={4}
        />
        {errors.description && <p className="text-ghana-red text-xs mt-1">{errors.description}</p>}
        <p className="text-xs text-[var(--text-subtle)] mt-1 text-right">{description.length}/2000</p>
      </div>

      {/* Photo */}
      <div>
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Photo Evidence <span className="text-ghana-red">*</span>
        </label>
        <input
          ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
        />
        {imagePreview ? (
          <div className="relative rounded-2xl overflow-hidden border-2 border-[var(--border)]">
            <img src={imagePreview} alt="Preview" className="w-full h-52 object-cover" />
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-xs font-semibold">Uploading & stripping metadata…</p>
              </div>
            )}
            {!isUploading && imageUrl && (
              <div className="absolute top-3 right-3 bg-ghana-green text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle size={12} /> Uploaded
              </div>
            )}
            {!isUploading && (
              <button type="button" onClick={clearImage}
                className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full hover:bg-black/80">
                Change
              </button>
            )}
          </div>
        ) : (
          <button
            type="button" onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3
              transition-colors cursor-pointer bg-white
              ${errors.image || uploadError ? "border-ghana-red bg-ghana-red/5" : "border-[var(--border)] hover:border-ghana-red"}`}
          >
            <Camera size={36} className="text-[var(--text-subtle)]" strokeWidth={1.5} />
            <div className="text-center">
              <p className="font-semibold text-sm">Tap to attach photo</p>
              <p className="text-xs text-[var(--text-subtle)] mt-1">JPEG, PNG, WebP · Max 10MB</p>
              <div className="flex items-center justify-center gap-1 mt-1.5">
                <Lock size={11} className="text-ghana-green" />
                <p className="text-xs text-ghana-green font-medium">Location data stripped automatically</p>
              </div>
            </div>
          </button>
        )}
        {uploadError && <p className="text-ghana-red text-xs mt-1">{uploadError}</p>}
        {errors.image && !uploadError && <p className="text-ghana-red text-xs mt-1">{errors.image}</p>}
      </div>

      {/* GPS */}
      <div>
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Location <span className="text-ghana-red">*</span>
        </label>
        {gps.status === "idle" && (
          <button type="button" onClick={detectGps}
            className="w-full border-2 border-dashed border-[var(--border)] rounded-2xl p-5
                       flex flex-col items-center gap-2 bg-white hover:border-ghana-green transition-colors">
            <Navigation size={28} className="text-[var(--text-subtle)]" strokeWidth={1.5} />
            <p className="font-semibold text-sm">Tap to detect GPS</p>
            <p className="text-xs text-[var(--text-subtle)]">Coordinates rounded to ~100m for privacy</p>
          </button>
        )}
        {gps.status === "detecting" && (
          <div className="flex items-center gap-3 p-4 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
            <div className="w-5 h-5 border-2 border-ghana-green border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-[var(--text-muted)]">Detecting location…</p>
          </div>
        )}
        {gps.status === "found" && (
          <div className="flex items-start gap-3 p-4 bg-ghana-green/5 rounded-2xl border border-ghana-green/30">
            <CheckCircle size={20} className="text-ghana-green flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-ghana-green uppercase tracking-wide">GPS Detected</p>
              <p className="text-sm font-medium mt-0.5">{gps.label}</p>
              <button type="button" onClick={detectGps}
                className="text-xs text-[var(--text-subtle)] hover:text-ghana-black mt-1 underline">
                Refresh location
              </button>
            </div>
          </div>
        )}
        {(gps.status === "error" || gps.status === "manual") && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">{gps.label}</p>
                <button type="button" onClick={detectGps} className="text-xs text-ghana-green hover:underline mt-1">
                  Try GPS again
                </button>
              </div>
            </div>
            {regions.length > 0 && (
              <select className="input" value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  const r = regions.find((x: any) => x.id === e.target.value);
                  if (r) {
                    setGps({ latitude: 7.946, longitude: -1.023, status: "manual",
                      label: `${r.name} Region (approximate — GPS unavailable)` });
                    clearError("location");
                  }
                }}>
                <option value="">Select your region…</option>
                {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name} Region</option>)}
              </select>
            )}
          </div>
        )}
        {errors.location && <p className="text-ghana-red text-xs mt-1">{errors.location}</p>}
      </div>

      {/* Privacy note */}
      <div className="px-4 py-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] flex items-start gap-2">
        <Lock size={13} className="text-[var(--text-subtle)] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <strong>Your privacy:</strong> Reports are attributed using your chosen anonymity level.
          GPS rounded to ~100m. Photo metadata removed automatically before upload.
        </p>
      </div>

      {/* Submit error */}
      {errors.submit && (
        <div className="px-4 py-3 bg-ghana-red/10 rounded-xl border border-ghana-red/30">
          <p className="text-sm text-ghana-red">{errors.submit}</p>
        </div>
      )}

      {/* Submit button */}
      <button type="submit" disabled={isSubmitting || isUploading}
        className="btn-primary w-full py-4 text-base disabled:opacity-50">
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Submitting report…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Megaphone size={18} /> Submit Report
          </span>
        )}
      </button>
    </form>
  );
}
