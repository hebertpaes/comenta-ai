"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Globe, MessageSquare, Settings,
  MessageSquareCode, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Visão geral" },
  { href: "/dashboard/sites", icon: Globe, label: "Sites" },
  { href: "/dashboard/comments", icon: MessageSquare, label: "Comentários" },
  { href: "/dashboard/settings", icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-white/5 bg-[#0d0d0d] flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <MessageSquareCode className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="gradient-text">Comenta.AI</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                active
                  ? "bg-brand-600/15 text-brand-300 font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-brand-400" : "")} />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-brand-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
