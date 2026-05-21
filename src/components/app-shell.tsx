"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "คีย์หวย", icon: "✏️" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
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
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-widest text-amber-400/90">
              🇱🇦 {user.houseName}
            </p>
            <p className="truncate text-xs text-slate-400">
              {user.displayName} · {user.role === "admin" ? "เจ้ามือ" : "ลูกมือ"}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-400 hover:bg-white/5"
          >
            ออก
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-4">{children}</main>
    </div>
  );
}
