"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Shuffle, UserCheck, LogOut, ClipboardList, Landmark, Megaphone, Settings } from "lucide-react";
import { ANONYMITY_CONFIGS } from "@/types";
import type { AnonymityLevel, UserRole } from "@/types";
import AnonymityBadge from "@/components/anonymization/AnonymityBadge";

interface ProfileClientProps {
  userId: string;
  email: string;
  profile: {
    role: UserRole;
    anonymity_level: AnonymityLevel;
    public_name: string;
    consent_given_at: string | null;
    is_verified: boolean;
  };
  stats: { total: number; resolved: number };
}

const TIER_ICONS: Record<AnonymityLevel, React.ReactNode> = {
  L1: <EyeOff   size={28} strokeWidth={1.5} />,
  L2: <Shuffle  size={28} strokeWidth={1.5} />,
  L3: <UserCheck size={28} strokeWidth={1.5} />,
};

const TIER_BORDER: Record<AnonymityLevel, string> = {
  L1: "border-gray-600",
  L2: "border-ghana-gold",
  L3: "border-ghana-green",
};

const TIER_ICON_COLOR: Record<AnonymityLevel, string> = {
  L1: "text-gray-400",
  L2: "text-ghana-gold",
  L3: "text-ghana-green",
};

export default function ProfileClient({ userId, email, profile, stats }: ProfileClientProps) {
  const router = useRouter();

  const [currentLevel,  setCurrentLevel]  = useState<AnonymityLevel>(profile.anonymity_level);
  const [currentName,   setCurrentName]   = useState(profile.public_name);
  const [displayName,   setDisplayName]   = useState(
    profile.anonymity_level === "L3" ? profile.public_name : ""
  );
  const [editingLevel,  setEditingLevel]  = useState<AnonymityLevel | null>(null);
  const [showLevelEdit, setShowLevelEdit] = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [saveSuccess,   setSaveSuccess]   = useState(false);
  const [signingOut,    setSigningOut]    = useState(false);

  async function saveLevel() {
    if (!editingLevel) return;
    if (editingLevel === "L3" && displayName.trim().length < 2) {
      setSaveError("Display name must be at least 2 characters.");
      return;
    }
    setSaveError("");
    setIsSaving(true);
    const res  = await fetch("/api/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        anonymity_level: editingLevel,
        ...(editingLevel === "L3" && { display_name: displayName.trim() }),
      }),
    });
    const data = await res.json();
    setIsSaving(false);
    if (!res.ok) { setSaveError(data.error?.message ?? "Failed to save. Please try again."); return; }
    setCurrentLevel(data.data.anonymity_level);
    setCurrentName(data.data.public_name);
    setShowLevelEdit(false);
    setEditingLevel(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    router.refresh();
  }

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const menuItems = [
    { icon: <ClipboardList size={18} />, label: "My Reports",     href: `/feed?user=${userId}` },
    { icon: <Landmark      size={18} />, label: "Browse Leaders", href: "/directory"            },
    { icon: <Megaphone     size={18} />, label: "Report Issue",   href: "/reports/new"           },
    ...(["admin","superadmin"].includes(profile.role)
      ? [{ icon: <Settings size={18} />, label: "Admin Panel", href: "/admin/dashboard" }]
      : []),
  ];

  return (
    <div className="pb-10">
      {/* Hero */}
      <div className="bg-ghana-black px-5 pt-8 pb-8 text-center">
        <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center
                         border-3 ${TIER_BORDER[currentLevel]}
                         bg-gradient-to-br from-gray-700 to-gray-900
                         ${TIER_ICON_COLOR[currentLevel]}`}>
          {TIER_ICONS[currentLevel]}
        </div>
        <AnonymityBadge level={currentLevel} name={currentName} showLabel />
        <p className="text-gray-600 text-xs mt-2 font-mono">{email}</p>
        {saveSuccess && (
          <div className="mt-3 inline-flex items-center gap-2 bg-ghana-green/20 border border-ghana-green/40
                          rounded-full px-4 py-1.5 text-xs font-semibold text-green-400 animate-fade-in">
            ✓ Privacy level updated
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-[var(--border)] mx-4 mt-5 rounded-2xl overflow-hidden shadow-card">
        {[
          { num: stats.total,    label: "Reports Filed" },
          { num: stats.resolved, label: "Resolved"      },
          { num: ["admin","superadmin"].includes(profile.role) ? "✓" : "—", label: "Admin" },
        ].map((s) => (
          <div key={s.label} className="bg-white py-4 text-center">
            <p className="text-2xl font-black text-ghana-black">{s.num}</p>
            <p className="text-[10px] text-[var(--text-subtle)] font-semibold uppercase tracking-wide mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Privacy level */}
      <div className="mx-4 mt-5">
        <h2 className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-3 px-1">
          Privacy Level
        </h2>
        <div className="card overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <span className={TIER_ICON_COLOR[currentLevel]}>{TIER_ICONS[currentLevel]}</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{ANONYMITY_CONFIGS[currentLevel].label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                {ANONYMITY_CONFIGS[currentLevel].description}
              </p>
            </div>
            <button
              onClick={() => { setShowLevelEdit(true); setEditingLevel(currentLevel); setSaveError(""); }}
              className="text-xs font-semibold text-ghana-green hover:underline flex-shrink-0"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="mx-4 mt-5">
        <h2 className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-3 px-1">
          Account
        </h2>
        <div className="card overflow-hidden divide-y divide-[var(--border)]">
          {menuItems.map(({ icon, label, href }) => (
            <a key={label} href={href}
              className="flex items-center gap-3 px-4 py-4 hover:bg-[var(--surface-2)] transition-colors">
              <span className="text-[var(--text-muted)] w-5">{icon}</span>
              <span className="text-sm font-medium flex-1">{label}</span>
              <span className="text-[var(--text-subtle)] text-sm">›</span>
            </a>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="mx-4 mt-4">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-3.5 rounded-2xl border-2 border-ghana-red/30 text-ghana-red
                     font-semibold text-sm hover:bg-ghana-red/5 transition-colors
                     disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {signingOut ? (
            <><span className="w-4 h-4 border-2 border-ghana-red/40 border-t-ghana-red rounded-full animate-spin" /> Signing out…</>
          ) : (
            <><LogOut size={16} /> Sign Out</>
          )}
        </button>
      </div>

      <p className="text-center text-[10px] text-[var(--text-subtle)] mt-6">
        People of Ghana · v1.0.0 · Phase 3
      </p>

      {/* Change Level Sheet */}
      {showLevelEdit && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm"
          onClick={() => { setShowLevelEdit(false); setSaveError(""); }}
        >
          <div
            className="bg-white w-full max-w-mobile rounded-t-3xl px-5 pt-4 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">Change Privacy Level</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
              This affects how your name appears on all future reports and posts.
              Past reports keep their original attribution.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {(["L1","L2","L3"] as AnonymityLevel[]).map((level) => {
                const cfg      = ANONYMITY_CONFIGS[level];
                const selected = editingLevel === level;
                return (
                  <button
                    key={level} type="button"
                    onClick={() => { setEditingLevel(level); setSaveError(""); }}
                    className={`text-left p-4 rounded-2xl border-2 transition-all
                      ${selected ? "border-ghana-black bg-[var(--surface-2)] scale-[1.01]" : "border-[var(--border)] bg-white"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={TIER_ICON_COLOR[level]}>{TIER_ICONS[level]}</span>
                      <span className="font-bold text-sm">{cfg.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                        {level}
                      </span>
                      {selected && <div className="ml-auto w-5 h-5 rounded-full bg-ghana-black flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed pl-8">{cfg.description}</p>
                  </button>
                );
              })}
            </div>

            {editingLevel === "L3" && (
              <div className="mb-4 animate-slide-up">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Kwame Asante" maxLength={50}
                  className="input" autoFocus
                />
              </div>
            )}

            {saveError && <p className="text-ghana-red text-xs mb-3">{saveError}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setShowLevelEdit(false); setSaveError(""); }}
                className="btn-outline flex-1 py-3">Cancel</button>
              <button
                onClick={saveLevel}
                disabled={isSaving || editingLevel === currentLevel}
                className="btn-secondary flex-1 py-3 disabled:opacity-40">
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
