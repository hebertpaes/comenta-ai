"use client";
import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Check, X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatRelative } from "@/lib/utils";
import type { Comment, CommentStatus } from "@/types";

type FilterStatus = "all" | CommentStatus;

const statusConfig: Record<CommentStatus, { variant: "success" | "warning" | "danger" | "muted"; label: string }> = {
  approved: { variant: "success", label: "Aprovado" },
  pending: { variant: "warning", label: "Pendente" },
  rejected: { variant: "danger", label: "Rejeitado" },
  spam: { variant: "danger", label: "Spam" },
};

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const url = filter === "all" ? "/api/comments" : `/api/comments?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json() as { comments?: Comment[] };
    setComments(data.comments ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function updateStatus(id: string, status: CommentStatus) {
    await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  }

  const aiLabelVariant = (label?: string): "success" | "warning" | "danger" | "muted" => {
    if (!label) return "muted";
    const map: Record<string, "success" | "warning" | "danger" | "muted"> = {
      safe: "success", spam: "danger", toxic: "danger", "off-topic": "warning", "low-quality": "warning",
    };
    return map[label] ?? "muted";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Comentários</h1>
          <p className="text-white/40 text-sm mt-1">Moderação manual e revisão de comentários</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/30" />
          {(["all", "pending", "approved", "rejected", "spam"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s
                  ? "bg-brand-600 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {s === "all" ? "Todos" : statusConfig[s as CommentStatus]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card animate-pulse h-28 bg-white/3" />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="card text-center py-16">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">Nenhum comentário {filter !== "all" ? `com status "${filter}"` : ""} encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="card hover:border-white/20 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center text-sm font-bold text-brand-300 shrink-0">
                  {(c.author_name?.[0] || "?").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-medium text-sm">{c.author_name}</span>
                    {c.author_email && (
                      <span className="text-xs text-white/30">{c.author_email}</span>
                    )}
                    <Badge variant={statusConfig[c.status]?.variant ?? "muted"}>
                      {statusConfig[c.status]?.label ?? c.status}
                    </Badge>
                    {c.ai_label && (
                      <Badge variant={aiLabelVariant(c.ai_label)}>
                        IA: {c.ai_label}
                      </Badge>
                    )}
                    <span className="text-xs text-white/25 ml-auto">{formatRelative(c.created_at)}</span>
                  </div>

                  <p className="text-sm text-white/70 mb-2">{c.content}</p>

                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span className="truncate max-w-[200px]">{c.page_url}</span>
                    {c.ai_score !== null && c.ai_score !== undefined && (
                      <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                        <span className="shrink-0">Score IA:</span>
                        <ScoreBar score={c.ai_score} />
                      </div>
                    )}
                  </div>

                  {c.ai_reason && (
                    <p className="text-xs text-white/30 mt-1 italic">{c.ai_reason}</p>
                  )}
                </div>

                {c.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(c.id, "approved")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/20 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => updateStatus(c.id, "rejected")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
