import { Sidebar } from "@/components/dashboard/Sidebar";
import { headers } from "next/headers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const userName = headersList.get("x-user-name") ?? "Usuário";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#0d0d0d]/50 backdrop-blur-sm shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">
              {userName[0].toUpperCase()}
            </div>
            <span className="text-sm text-white/60">{userName}</span>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
