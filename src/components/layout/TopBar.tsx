import Link from "next/link";
import type { AnonymityLevel, UserRole } from "@/types";
import AnonymityBadge from "@/components/anonymization/AnonymityBadge";

interface TopBarProps {
  profile: {
    public_name: string;
    anonymity_level: AnonymityLevel;
    role: UserRole;
  };
}

export default function TopBar({ profile }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-ghana-black border-b border-white/5">
      {/* Ghana flag stripe */}
      <div className="flag-stripe h-[3px]" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex flex-col w-7 h-5 rounded overflow-hidden flex-shrink-0">
            <div className="flex-1 bg-ghana-red" />
            <div className="flex-1 bg-ghana-gold" />
            <div className="flex-1 bg-ghana-green" />
          </div>
          <span className="text-white font-serif text-[15px] font-bold tracking-tight">
            People of <span className="text-ghana-gold">Ghana</span>
          </span>
        </Link>

        {/* Right side: identity + profile */}
        <div className="flex items-center gap-2">
          <AnonymityBadge level={profile.anonymity_level} name={profile.public_name} compact />
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm
                       hover:bg-white/20 transition-colors"
            aria-label="Profile"
          >
            {profile.public_name.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
