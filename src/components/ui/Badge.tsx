import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-brand-500/20 text-brand-300 border-brand-500/30",
  success: "bg-green-500/20 text-green-300 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  danger: "bg-red-500/20 text-red-300 border-red-500/30",
  info: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  muted: "bg-white/10 text-white/50 border-white/10",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
