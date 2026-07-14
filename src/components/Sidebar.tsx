"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/calendar", label: "Calendar", icon: "calendar_today" },
  { href: "/daily-report", label: "Daily Report", icon: "summarize" },
  { href: "/review", label: "Review", icon: "analytics" },
  { href: "/minutes", label: "Minutes", icon: "edit_note" },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-surface shadow-[20px_0_20px_rgba(134,78,90,0.04)] hidden md:flex flex-col p-base border-r border-outline-variant/20 z-50">
      <div className="px-container-padding py-base flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
          <span className="material-symbols-outlined font-bold">task_alt</span>
        </div>
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
        <div className="px-container-padding py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-[14px] font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span className="font-label-sm text-label-sm text-on-surface truncate">{userEmail}</span>
        </div>
      </div>
    </nav>
  );
}
