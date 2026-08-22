// Types métier — reflètent les enums et tables Postgres (voir supabase/migrations).
// NOTE: une fois le projet Supabase connecté, ces types peuvent être recoupés avec
// ceux générés par `supabase gen types typescript` ; en attendant ils sont la
// source de vérité côté frontend.

export type UserRole = "USER" | "ADMIN" | "MODERATOR" | "FINANCE_ADMIN" | "TASK_MANAGER";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";

export type TaskStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "COMPLETED" | "EXPIRED";
export type TaskDifficulty = "EASY" | "MEDIUM" | "HARD";
export type TaskCategory =
  | "SOCIAL_MEDIA"
  | "CONTENT"
  | "SURVEYS"
  | "MARKETING"
  | "APP_TESTING"
  | "DATA"
  | "DIGITAL"
  | "ADS"
  | "VIDEOS"
  | "TIKTOK"
  | "YOUTUBE"
  | "QUIZ"
  | "OTHER";

export type SubmissionStatus = "STARTED" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export type TransactionType =
  | "TASK_REWARD"
  | "REFERRAL_COMMISSION"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "BONUS"
  | "REFUND"
  | "ADJUSTMENT"
  | "COURSE_PURCHASE";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type WithdrawalStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type DepositStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type NotificationType =
  | "TASK_APPROVED"
  | "TASK_REJECTED"
  | "PAYMENT_RECEIVED"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED"
  | "REFERRAL_JOINED"
  | "COMMISSION_RECEIVED"
  | "SYSTEM";

export type FraudSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FraudStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

export interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  phone_code: string | null;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  referral_code: string;
  referred_by: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  total_deposited: number;
  currency: string;
  updated_at: string;
}

export type EarningBucket = "WALLET" | "TIKTOK" | "YOUTUBE" | "VIDEOS" | "ADS" | "SURVEYS";

export interface WalletBalance {
  id: string;
  user_id: string;
  bucket: EarningBucket;
  available_balance: number;
  total_earned: number;
  updated_at: string;
}

export const EARNING_BUCKET_LABELS: Record<EarningBucket, string> = {
  WALLET: "Portefeuille",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  VIDEOS: "Vidéos",
  ADS: "Publicités",
  SURVEYS: "Sondages",
};

/** Classes Tailwind (fond + texte) pour distinguer visuellement chaque bucket de gain. */
export const EARNING_BUCKET_COLORS: Record<EarningBucket, string> = {
  WALLET: "bg-primary/10 text-primary",
  TIKTOK: "bg-[#171717]/10 text-[#171717]",
  YOUTUBE: "bg-error/10 text-error",
  VIDEOS: "bg-accent/10 text-accent",
  ADS: "bg-warning/10 text-warning",
  SURVEYS: "bg-success/10 text-success",
};

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  reward: number;
  currency: string;
  estimated_time: string | null;
  difficulty: TaskDifficulty;
  instructions: string | null;
  requirements: string | null;
  max_completions: number | null;
  completions_count: number;
  single_submission_per_user: boolean;
  deadline: string | null;
  status: TaskStatus;
  video_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  submitted_at: string | null;
  status: SubmissionStatus;
  proof_text: string | null;
  proof_url: string | null;
  proof_file_path: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  task?: Task;
  user?: Profile;
}

export interface CommissionRule {
  id: string;
  level: number;
  percentage: number;
  fixed_amount: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  beneficiary_id: string;
  source_user_id: string;
  source_transaction_id: string | null;
  transaction_id: string | null;
  level: number;
  amount: number;
  created_at: string;
  source_user?: Profile;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  method: string;
  destination: Record<string, unknown>;
  status: WithdrawalStatus;
  processed_by: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  user?: Profile;
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  provider: string;
  reference: string;
  status: DepositStatus;
  metadata: Record<string, unknown>;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  user?: Profile;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: Profile;
}

export interface FraudFlag {
  id: string;
  user_id: string;
  type: string;
  severity: FraudSeverity;
  description: string | null;
  status: FraudStatus;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  user?: Profile;
}

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  price: number;
  thumbnail_url: string | null;
  content_url: string | null;
  duration_minutes: number | null;
  status: CourseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  amount_paid: number;
  purchased_at: string;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  type: string;
  updated_by: string | null;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  total_earned: number;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  SOCIAL_MEDIA: "Réseaux sociaux",
  CONTENT: "Contenu",
  SURVEYS: "Sondages",
  MARKETING: "Marketing",
  APP_TESTING: "Test d'application",
  DATA: "Données",
  DIGITAL: "Digital",
  ADS: "Publicités",
  VIDEOS: "Vidéos",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  QUIZ: "Quiz",
  OTHER: "Autre",
};

export const TASK_DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  EASY: "Facile",
  MEDIUM: "Intermédiaire",
  HARD: "Difficile",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Utilisateur",
  ADMIN: "Administrateur",
  MODERATOR: "Modérateur",
  FINANCE_ADMIN: "Admin finance",
  TASK_MANAGER: "Gestionnaire tâches",
};
