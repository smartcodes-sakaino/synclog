"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/routines", label: "Dashboard", icon: "dashboard" },
  { href: "/", label: "Task", icon: "checklist" },
  { href: "/calendar", label: "Calendar", icon: "calendar_today" },
  { href: "/daily-report", label: "Daily Report", icon: "summarize" },
  { href: "/review", label: "Review", icon: "analytics" },
  { href: "/minutes", label: "Minutes", icon: "edit_note" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-surface shadow-[20px_0_20px_rgba(134,78,90,0.04)] hidden md:flex flex-col p-base border-r border-outline-variant/20 z-50">
      <div className="px-container-padding py-base flex items-center gap-3 mb-8">
        <img src="/icon.png" alt="SyncLog" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        <div>
          <h1 className="font-headline-md text-headline-md font-extrabold text-primary">SyncLog</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant font-normal">Creative Workspace</p>
        </div>
      </div>

      <ul className="flex flex-col gap-2 flex-grow">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-container-padding py-3 rounded-lg transition-colors font-label-sm text-label-sm ${
                  active
                    ? "bg-primary-container text-on-primary-container font-bold border-r-4 border-primary"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-4 border-t border-outline-variant/20">
        <ul className="flex flex-col gap-2 mb-2">
          <li>
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-container-padding py-2 rounded-lg transition-colors font-label-sm text-label-sm ${
                pathname === "/settings"
                  ? "text-primary font-bold"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined">settings</span>
              Settings
            </Link>
          </li>
        </ul>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-container-padding py-3 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors font-label-sm text-label-sm"
        >
          <span className="material-symbols-outlined">logout</span>
          ログアウト
        </button>
      </div>
    </nav>
  );
}
