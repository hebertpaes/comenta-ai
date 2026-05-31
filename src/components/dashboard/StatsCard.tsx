import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

export function StatsCard({ label, value, icon: Icon, trend, trendUp, color = "text-brand-400" }: StatsCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-white/50">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {trend && (
        <div className={cn("text-xs mt-1.5", trendUp ? "text-green-400" : "text-red-400")}>
          {trendUp ? "↑" : "↓"} {trend} vs. semana passada
        </div>
      )}
    </div>
  );
}
