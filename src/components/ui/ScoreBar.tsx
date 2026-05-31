import { cn } from "@/lib/utils";

interface ScoreBarProps {
  score: number;
  className?: string;
}

export function ScoreBar({ score, className }: ScoreBarProps) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? "bg-green-500" : score >= 0.4 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/50 w-8 text-right">{pct}%</span>
    </div>
  );
}
