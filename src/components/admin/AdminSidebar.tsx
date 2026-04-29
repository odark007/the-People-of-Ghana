"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@/types";

interface AdminSidebarProps {
  role: UserRole;
  publicName: string;
}

const NAV_ITEMS = [
  { href: "/admin/dashboard",  icon: "📊", label: "Dashboard",  roles: ["admin","superadmin"] },
  { href: "/admin/moderation", icon: "⚖️", label: "Moderation", roles: ["admin","superadmin"] },
  { href: "/admin/reports",    icon: "📋", label: "Reports",    roles: ["admin","superadmin"] },
  { href: "/admin/officials",  icon: "🏛️", label: "Officials",  roles: ["admin","superadmin"] },
  { href: "/admin/users",      icon: "👥", label: "Users",      roles: ["superadmin"]         },
  { href: "/admin/storage",    icon: "🗄️", label: "Storage",    roles: ["superadmin"]         },
];

export default function AdminSidebar({ role, publicName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const visibleItems = NAV_ITEMS.filter((i) => i.roles.includes(role));

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56
                        bg-ghana-black border-r border-white/5 z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex flex-col w-6 h-4 rounded overflow-hidden flex-shrink-0">
              <div className="flex-1 bg-ghana-red" />
              <div className="flex-1 bg-ghana-gold" />
              <div className="flex-1 bg-ghana-green" />
            </div>
            <span className="text-white font-serif text-sm font-bold">
              People of <span className="text-ghana-gold">Ghana</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                             bg-ghana-gold/20 text-ghana-gold uppercase tracking-wider">
              {role}
            </span>
            <span className="text-gray-500 text-xs truncate">{publicName}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                            transition-colors
                            ${isActive
                              ? "bg-white/10 text-white"
                              : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5 flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="text-base w-5 text-center">←</span>
            Back to App
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-gray-500 hover:text-ghana-red hover:bg-ghana-red/5
                       transition-colors w-full text-left"
          >
            <span className="text-base w-5 text-center">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-ghana-black
                         border-b border-white/5 flex items-center gap-1 px-2 overflow-x-auto">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-3
                          text-[10px] font-semibold transition-colors
                          ${isActive
                            ? "text-ghana-gold"
                            : "text-gray-500 hover:text-gray-300"}`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-3
                     text-[10px] font-semibold text-gray-600 hover:text-gray-400 ml-auto"
        >
          <span className="text-base">←</span>
          App
        </Link>
      </header>
    </>
  );
}