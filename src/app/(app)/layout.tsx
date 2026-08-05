import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasStaleGoogleConnection } from "@/lib/googleAccounts";
import Sidebar from "@/components/Sidebar";
import ToastProvider from "@/components/ToastProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  const stale = await hasStaleGoogleConnection(session.userId);

  return (
    <ToastProvider>
      <Sidebar />
      <div className="md:ml-64 min-h-screen flex flex-col">
        {stale && (
          <div className="bg-error-container text-on-error-container text-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              Google連携の有効期限が近づいています(未対応だとカレンダー・日報が動かなくなります)。
            </span>
            <a href="/settings" className="underline font-bold whitespace-nowrap">
              Settingsで再連携する
            </a>
          </div>
        )}
        {children}
      </div>
    </ToastProvider>
  );
}
