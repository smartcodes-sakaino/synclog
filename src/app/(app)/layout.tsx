import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  return (
    <>
      <Sidebar />
      <div className="md:ml-64 min-h-screen flex flex-col">{children}</div>
    </>
  );
}
