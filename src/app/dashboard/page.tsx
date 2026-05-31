import { headers } from "next/headers";
import { dbQuery, dbFirst } from "@/lib/db";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatRelative } from "@/lib/utils";
import { MessageSquare, CheckCircle, XCircle, Clock, Globe, ShieldAlert } from "lucide-react";
import type { Comment, Site, DashboardStats } from "@/types";

export const runtime = "edge";

async function getStats(userId: string): Promise<DashboardStats> {
  const rows = await dbQuery<{ status: string; count: number }>(
    `SELECT c.status, COUNT(*) as count
     FROM comments c
     JOIN sites s ON c.site_id = s.id
     WHERE s.user_id = ?
     GROUP BY c.status`,
    [userId]
  );

  const map = Object.fromEntries(rows.map((r) => [r.status, r.count]));
  const total = rows.reduce((s, r) => s + r.count, 0);
  const approved = map.approved ?? 0;
  const pending = map.pending ?? 0;
  const rejected = map.rejected ?? 0;
  const spam = map.spam ?? 0;

  return {
    total,
    approved,
    pending,
    rejected,
    spam,
    approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
    spam_rate: total > 0 ? Math.round((spam / total) * 100) : 0,
  };
}

export default async function DashboardPage() {
  const userId = (await headers()).get("x-user-id")!;

  const [stats, recentComments, sitesCount] = await Promise.all([
    getStats(userId),
    dbQuery<Comment>(
      `SELECT c.* FROM comments c
       JOIN sites s ON c.site_id = s.id
       WHERE s.user_id = ?
       ORDER BY c.created_at DESC LIMIT 8`,
      [userId]
    ),
    dbFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM sites WHERE user_id = ?",
      [userId]
    ),
  ]);

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "success" | "warning" | "danger" | "muted"; label: string }> = {
      approved: { variant: "success", label: "Aprovado" },
      pending: { variant: "warning", label: "Pendente" },
      rejected: { variant: "danger", label: "Rejeitado" },
      spam: { variant: "danger", label: "Spam" },
    };
    const s = map[status] ?? { variant: "muted", label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <p className="text-white/40 text-sm mt-1">Resumo da atividade dos seus sites</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total de comentários" value={stats.total} icon={MessageSquare} color="text-brand-400" />
        <StatsCard label="Aprovados" value={stats.approved} icon={CheckCircle} color="text-green-400" />
        <StatsCard label="Pendentes" value={stats.pending} icon={Clock} color="text-yellow-400" />
        <StatsCard label="Spam bloqueado" value={stats.spam} icon={ShieldAlert} color="text-red-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-white/50 mb-1">Taxa de aprovação</div>
          <div className="text-3xl font-bold text-green-400">{stats.approval_rate}%</div>
          <ScoreBar score={stats.approval_rate / 100} className="mt-3" />
        </div>
        <div className="card">
          <div className="text-sm text-white/50 mb-1">Taxa de spam</div>
          <div className="text-3xl font-bold text-red-400">{stats.spam_rate}%</div>
          <ScoreBar score={stats.spam_rate / 100} className="mt-3" />
        </div>
        <div className="card flex items-center justify-between">
          <div>
            <div className="text-sm text-white/50 mb-1">Sites ativos</div>
            <div className="text-3xl font-bold">{sitesCount?.count ?? 0}</div>
          </div>
          <Globe className="w-12 h-12 text-white/10" />
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold mb-4">Comentários recentes</h2>
        {recentComments.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum comentário ainda.</p>
            <p className="text-xs mt-1">Integre o widget no seu site para começar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentComments.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-medium text-brand-300 shrink-0">
                  {c.author_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{c.author_name}</span>
                    {statusBadge(c.status)}
                    <span className="text-xs text-white/25 ml-auto">{formatRelative(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-white/50 truncate">{c.content}</p>
                  {c.ai_score !== null && c.ai_score !== undefined && (
                    <div className="mt-1.5">
                      <ScoreBar score={c.ai_score} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
