"use client";
import { useState, useEffect } from "react";
import { Globe, Plus, Copy, Trash2, ExternalLink, Code2 } from "lucide-react";
import type { Site } from "@/types";

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json() as Promise<{ sites?: Site[] }>)
      .then((d) => {
        setSites(d.sites ?? []);
        setLoading(false);
      });
  }, []);

  async function createSite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain }),
    });
    const data = await res.json() as { site: Site };
    if (res.ok) {
      setSites((prev) => [data.site, ...prev]);
      setName("");
      setDomain("");
      setShowForm(false);
    }
    setSaving(false);
  }

  async function deleteSite(id: string) {
    if (!confirm("Tem certeza? Todos os comentários do site serão excluídos.")) return;
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    setSites((prev) => prev.filter((s) => s.id !== id));
  }

  function copySnippet(siteId: string) {
    const snippet = `<script src="${window.location.origin}/widget.js"
  data-site-id="${siteId}"
  data-api-key="SUA_API_KEY">
</script>`;
    navigator.clipboard.writeText(snippet);
    setCopied(siteId);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-white/40 text-sm mt-1">Gerencie os sites integrados ao Comenta.AI</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo site
        </button>
      </div>

      {showForm && (
        <div className="card border-brand-500/30">
          <h2 className="font-semibold mb-4">Adicionar novo site</h2>
          <form onSubmit={createSite} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Nome do site</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Meu Blog"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Domínio</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="input-field"
                placeholder="meublog.com.br"
                required
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Salvando..." : "Adicionar site"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-white/3" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="card text-center py-16">
          <Globe className="w-10 h-10 mx-auto mb-4 text-white/20" />
          <p className="text-white/50">Nenhum site adicionado ainda.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 mx-auto">
            <Plus className="w-4 h-4" />
            Adicionar primeiro site
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <div key={site.id} className="card hover:border-white/20 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{site.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm text-white/40">{site.domain}</span>
                      <ExternalLink className="w-3 h-3 text-white/20" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copySnippet(site.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white transition-all border border-white/10"
                  >
                    {copied === site.id ? (
                      <span className="text-green-400">Copiado!</span>
                    ) : (
                      <>
                        <Code2 className="w-3.5 h-3.5" />
                        Snippet
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => deleteSite(site.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-6 text-xs text-white/30">
                <span>{site.comment_count ?? 0} comentários</span>
                <span>Auto-aprovar: ≥ {Math.round(site.auto_approve_threshold * 100)}%</span>
                <span>Auto-rejeitar: &lt; {Math.round(site.auto_reject_threshold * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
