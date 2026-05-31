import Link from "next/link";
import { ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          Powered by Claude AI
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
          Moderação de comentários{" "}
          <span className="gradient-text">com IA</span>
        </h1>

        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Proteja seu site contra spam, toxicidade e conteúdo inadequado.
          Nossa IA analisa e modera cada comentário automaticamente — em milissegundos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/register" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto justify-center">
            Começar grátis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#how-it-works" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto justify-center">
            Ver como funciona
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
          {[
            { value: "99.2%", label: "Precisão na detecção de spam" },
            { value: "<50ms", label: "Tempo médio de moderação" },
            { value: "24/7", label: "Proteção contínua" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mock dashboard preview */}
      <div className="relative max-w-5xl mx-auto mt-20 animate-slide-up">
        <div className="glass rounded-2xl overflow-hidden shadow-2xl shadow-brand-500/10">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="text-xs text-white/30 ml-2">comenta.ai/dashboard</span>
          </div>
          <div className="p-6 grid grid-cols-4 gap-4">
            {[
              { label: "Total de Comentários", value: "12,847", color: "text-white", trend: "+8%" },
              { label: "Aprovados", value: "10,901", color: "text-green-400", trend: "+5%" },
              { label: "Spam Bloqueado", value: "1,432", color: "text-red-400", trend: "-12%" },
              { label: "Em Revisão", value: "514", color: "text-yellow-400", trend: "+2%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="text-xs text-white/40 mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-white/30 mt-1">{stat.trend} esta semana</div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 space-y-2">
            {[
              { name: "João S.", comment: "Ótimo artigo! Muito informativo.", score: 0.95, label: "safe", status: "approved" },
              { name: "spammer123", comment: "COMPRE AGORA!! www.spam.com promoção 99%off", score: 0.08, label: "spam", status: "rejected" },
              { name: "Maria L.", comment: "Concordo plenamente com os pontos levantados.", score: 0.91, label: "safe", status: "approved" },
              { name: "Usuário", comment: "kkkkk", score: 0.42, label: "low-quality", status: "pending" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-medium text-brand-300 shrink-0">
                  {item.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/80">{item.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                      item.status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      item.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>{item.label}</span>
                  </div>
                  <p className="text-xs text-white/40 truncate">{item.comment}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.score >= 0.8 ? "bg-green-500" : item.score >= 0.4 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${item.score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/30">{Math.round(item.score * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
