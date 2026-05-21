"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { useTheme } from "./theme-provider";

const NAV = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "📊" },
  { href: "/key", label: "คีย์หวย", icon: "✏️" },
  { href: "/results", label: "ออกผล", icon: "🎯" },
  { href: "/reports", label: "รายงาน", icon: "📋" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
  { href: "/guide", label: "วิธีใช้", icon: "📖" },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = [
    ...NAV,
    ...(user.role === "admin"
      ? [{ href: "/users", label: "ผู้ใช้", icon: "👥" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100 print:min-h-0 print:bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-blue-700 bg-blue-700 shadow-md print:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 text-white">
            <p className="truncate text-xs font-semibold uppercase tracking-wider opacity-90">
              🇱🇦 {user.houseName}
            </p>
            <p className="truncate text-sm opacity-80">
              {user.displayName} ·{" "}
              {ROLE_LABELS[user.role as Role] ?? user.role}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white hover:bg-white/25"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-white/15 px-3 py-2 text-xs text-white hover:bg-white/25"
            >
              ออก
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-3">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold sm:text-sm ${
                  active
                    ? "bg-white text-blue-700 shadow dark:bg-amber-500 dark:text-slate-900"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-10 print:mx-0 print:max-w-none print:p-0 print:pb-0">
        {children}
      </main>
    </div>
  );
}
