"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Shuffle, UserCheck, Lock } from "lucide-react";
import { ANONYMITY_CONFIGS } from "@/types";
import type { AnonymityLevel } from "@/types";

const TIER_ICONS: Record<AnonymityLevel, React.ReactNode> = {
  L1: <EyeOff size={22} strokeWidth={2} />,
  L2: <Shuffle size={22} strokeWidth={2} />,
  L3: <UserCheck size={22} strokeWidth={2} />,
};

const TIER_COLORS: Record<AnonymityLevel, { border: string; bg: string; badge: string; icon: string }> = {
  L1: {
    border: "border-gray-600 hover:border-gray-400",
    bg:     "bg-white/5",
    badge:  "bg-gray-700 text-gray-300",
    icon:   "text-gray-300",
  },
  L2: {
    border: "border-yellow-700 hover:border-ghana-gold",
    bg:     "bg-ghana-gold/5",
    badge:  "bg-ghana-gold/20 text-ghana-gold",
    icon:   "text-ghana-gold",
  },
  L3: {
    border: "border-green-800 hover:border-ghana-green",
    bg:     "bg-ghana-green/5",
    badge:  "bg-ghana-green/20 text-green-400",
    icon:   "text-green-400",
  },
};

export default function ConsentForm() {
  const router = useRouter();
  const [selected,     setSelected]     = useState<AnonymityLevel | null>(null);
  const [displayName,  setDisplayName]  = useState("");
  const [error,        setError]        = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError("");

    if (selected === "L3" && displayName.trim().length < 2) {
      setError("Please enter your display name (at least 2 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/consent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          anonymity_level: selected,
          ...(selected === "L3" && { display_name: displayName.trim() }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Tier cards */}
      {(["L1", "L2", "L3"] as AnonymityLevel[]).map((level) => {
        const config     = ANONYMITY_CONFIGS[level];
        const colors     = TIER_COLORS[level];
        const isSelected = selected === level;

        return (
          <button
            key={level}
            type="button"
            onClick={() => { setSelected(level); setError(""); }}
            className={`
              relative text-left p-4 rounded-2xl border-2 transition-all duration-200
              ${colors.border} ${colors.bg}
              ${isSelected ? "ring-2 ring-offset-2 ring-offset-black ring-white/20 scale-[1.01]" : ""}
            `}
          >
            {/* Selected indicator */}
            <div className={`
              absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center
              justify-center transition-all
              ${isSelected ? "border-white bg-white" : "border-gray-600"}
            `}>
              {isSelected && (
                <div className="w-2.5 h-2.5 rounded-full bg-ghana-black" />
              )}
            </div>

            <div className="flex items-start gap-3 pr-8">
              <span className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>
                {TIER_ICONS[level]}
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-base">{config.label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {level}
                  </span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {config.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}

      {/* Display name input for L3 */}
      {selected === "L3" && (
        <div className="animate-slide-up">
          <label
            htmlFor="display-name"
            className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
          >
            Your display name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Kwame Asante"
            maxLength={50}
            className="input text-white bg-white/10 border-white/20 placeholder:text-gray-600 focus:border-ghana-green"
            autoFocus
          />
          <p className="mt-1.5 text-xs text-gray-600">
            This is what people will see on your reports and posts.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm animate-fade-in">{error}</p>
      )}

      {/* Privacy note */}
      <div className="mt-1 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-start gap-2">
          <Lock size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Your email is never displayed. GPS coordinates are rounded to within ~100m.
            You can change your privacy level at any time.
          </p>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!selected || isSubmitting}
        className="btn-primary w-full mt-2 py-4 text-base disabled:opacity-40"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Saving…
          </span>
        ) : selected ? (
          `Continue as ${ANONYMITY_CONFIGS[selected].label} →`
        ) : (
          "Choose a privacy level"
        )}
      </button>
    </form>
  );
}
