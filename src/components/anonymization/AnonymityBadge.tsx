import { EyeOff, Shuffle, UserCheck } from "lucide-react";
import type { AnonymityLevel } from "@/types";
import { ANONYMITY_CONFIGS } from "@/types";

interface AnonymityBadgeProps {
  level: AnonymityLevel;
  name: string;
  compact?: boolean;
  showLabel?: boolean;
}

const LEVEL_STYLES: Record<AnonymityLevel, string> = {
  L1: "bg-gray-800 text-gray-300 border border-gray-700",
  L2: "bg-ghana-gold/15 text-ghana-gold border border-ghana-gold/30",
  L3: "bg-ghana-green/15 text-green-400 border border-ghana-green/30",
};

const LEVEL_ICONS: Record<AnonymityLevel, React.ReactNode> = {
  L1: <EyeOff size={12} strokeWidth={2} />,
  L2: <Shuffle size={12} strokeWidth={2} />,
  L3: <UserCheck size={12} strokeWidth={2} />,
};

export default function AnonymityBadge({
  level,
  name,
  compact = false,
  showLabel = false,
}: AnonymityBadgeProps) {
  const config = ANONYMITY_CONFIGS[level];

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${LEVEL_STYLES[level]}`}
        title={config.description}
      >
        {LEVEL_ICONS[level]}
        <span className="max-w-[100px] truncate">{name}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${LEVEL_STYLES[level]}`}>
      {LEVEL_ICONS[level]}
      <span>{name}</span>
      {showLabel && (
        <span className="opacity-60 text-xs">· {config.label}</span>
      )}
    </div>
  );
}
