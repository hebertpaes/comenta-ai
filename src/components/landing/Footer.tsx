import Link from "next/link";
import { MessageSquareCode } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <MessageSquareCode className="w-4 h-4 text-white" />
            </div>
            <span className="gradient-text">Comenta.AI</span>
          </Link>

          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacidade</Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">Termos</Link>
            <Link href="/docs" className="hover:text-white/70 transition-colors">Documentação</Link>
            <Link href="mailto:suporte@comenta.ai" className="hover:text-white/70 transition-colors">Suporte</Link>
          </div>

          <p className="text-sm text-white/25">
            © 2025 Comenta.AI. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
