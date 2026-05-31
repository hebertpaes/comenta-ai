"use client";
import Link from "next/link";
import { MessageSquareCode } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <MessageSquareCode className="w-4 h-4 text-white" />
          </div>
          <span className="gradient-text">Comenta.AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">Como funciona</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Preços</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">
            Entrar
          </Link>
          <Link href="/register" className="btn-primary text-sm py-2">
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}
