"use client";
import { useState, useEffect } from "react";
import { Copy, RefreshCw, KeyRound, User } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ name: string; email: string; api_key: string; plan: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json() as Promise<{ user: { name: string; email: string; api_key: string; plan: string } }>)
      .then((d) => setUser(d.user));
  }, []);

  function copyApiKey() {
    if (!user) return;
    navigator.clipboard.writeText(user.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateKey() {
    if (!confirm("Regenerar a API key vai invalidar a chave atual. Confirmar?")) return;
    setRegenerating(true);
    const res = await fetch("/api/me/api-key", { method: "POST" });
    const data = await res.json() as { api_key: string };
    if (res.ok) setUser((prev) => prev ? { ...prev, api_key: data.api_key } : null);
    setRegenerating(false);
  }

  if (!user) {
    return (
      <div className="space-y-6 animate-pulse">
        {[...Array(2)].map((_, i) => <div key={i} className="card h-40 bg-white/3" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-white/40 text-sm mt-1">Gerencie sua conta e integrações</p>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-4 h-4 text-white/40" />
          <h2 className="font-semibold">Perfil</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/50 mb-1">Nome</label>
            <div className="input-field opacity-60 cursor-not-allowed">{user.name}</div>
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1">E-mail</label>
            <div className="input-field opacity-60 cursor-not-allowed">{user.email}</div>
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1">Plano</label>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 text-sm font-medium border border-brand-500/20 capitalize">
                {user.plan}
              </span>
              {user.plan === "free" && (
                <a href="#pricing" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Fazer upgrade →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <KeyRound className="w-4 h-4 text-white/40" />
          <h2 className="font-semibold">API Key</h2>
        </div>

        <p className="text-sm text-white/40 mb-4">
          Use esta chave para autenticar requisições à API do Comenta.AI e para configurar o widget no seu site.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 input-field font-mono text-sm text-white/60 truncate">
            {user.api_key}
          </div>
          <button onClick={copyApiKey} className="btn-secondary shrink-0">
            <Copy className="w-4 h-4" />
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <button onClick={regenerateKey} disabled={regenerating} className="btn-secondary shrink-0">
            <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-xs text-yellow-400/80">
            ⚠️ Nunca compartilhe sua API key. Ela dá acesso total à sua conta.
          </p>
        </div>
      </div>

      {/* Widget snippet */}
      <div className="card">
        <h2 className="font-semibold mb-4">Snippet de integração</h2>
        <p className="text-sm text-white/40 mb-4">
          Cole este código no HTML do seu site onde deseja exibir os comentários:
        </p>
        <pre className="p-4 rounded-lg bg-black/40 text-xs text-green-400/80 font-mono overflow-x-auto border border-white/5">
          {`<!-- Comenta.AI Widget -->
<div id="comenta-ai"></div>
<script
  src="${typeof window !== "undefined" ? window.location.origin : "https://comenta.ai"}/widget.js"
  data-site-id="SEU_SITE_ID">
</script>`}
        </pre>
      </div>
    </div>
  );
}
