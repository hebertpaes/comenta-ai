export type Plan = "free" | "pro" | "enterprise";
export type CommentStatus = "pending" | "approved" | "rejected" | "spam";
export type AiLabel = "safe" | "spam" | "toxic" | "off-topic" | "low-quality";

export interface User {
  id: string;
  email: string;
  name: string;
  api_key: string;
  plan: Plan;
  created_at: string;
}

export interface Site {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  auto_approve_threshold: number;
  auto_reject_threshold: number;
  created_at: string;
  comment_count?: number;
}

export interface Comment {
  id: string;
  site_id: string;
  page_url: string;
  author_name: string;
  author_email?: string;
  content: string;
  status: CommentStatus;
  ai_score?: number;
  ai_label?: AiLabel;
  ai_reason?: string;
  ip_address?: string;
  created_at: string;
}

export interface AiModerationResult {
  score: number;
  label: AiLabel;
  reason: string;
  decision: "approve" | "reject" | "review";
}

export interface DashboardStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  spam: number;
  approval_rate: number;
  spam_rate: number;
}
