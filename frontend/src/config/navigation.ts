import {
  LayoutDashboard,
  ListChecks,
  Wallet,
  Receipt,
  Users,
  BarChart3,
  Bell,
  Settings,
  Home,
  UserCircle,
  ShieldAlert,
  ClipboardList,
  Landmark,
  ArrowDownToLine,
  ArrowUpFromLine,
  Share2,
  FileClock,
  Trophy,
  Sparkles,
  GraduationCap,
  Radio,
  LifeBuoy,
  Video,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { translations } from "@/i18n/translations";

type NavLabelKey = keyof typeof translations.en.nav;

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Affiché en retrait, comme sous-item du lien juste au-dessus. */
  indent?: boolean;
  /** Clé dans translations.<lang>.nav — si absente, `label` (FR) est utilisé tel quel. */
  labelKey?: NavLabelKey;
}

export const USER_SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { label: "Tâches journalières", to: "/tasks", icon: ListChecks, labelKey: "tasks" },
  { label: "Réseaux sociaux", to: "/tasks/social", icon: Video, indent: true, labelKey: "socialTasks" },
  { label: "Quiz", to: "/tasks/quiz", icon: HelpCircle, indent: true, labelKey: "quizTasks" },
  { label: "Formations", to: "/courses", icon: GraduationCap, labelKey: "courses" },
  { label: "Portefeuille", to: "/wallet", icon: Wallet, labelKey: "wallet" },
  { label: "Retrait", to: "/wallet?tab=withdrawals", icon: ArrowUpFromLine, indent: true, labelKey: "withdraw" },
  { label: "Transactions", to: "/transactions", icon: Receipt, labelKey: "transactions" },
  { label: "Équipe", to: "/team", icon: Users, labelKey: "team" },
  { label: "Canal de diffusion", to: "/channels", icon: Radio, labelKey: "channels" },
  { label: "Classement", to: "/leaderboard", icon: Trophy, labelKey: "leaderboard" },
  { label: "Roue de la chance", to: "/spin", icon: Sparkles, labelKey: "spin" },
  { label: "Statistiques", to: "/analytics", icon: BarChart3, labelKey: "analytics" },
  { label: "Notifications", to: "/notifications", icon: Bell, labelKey: "notifications" },
  { label: "Support", to: "/support", icon: LifeBuoy, labelKey: "support" },
  { label: "Paramètres", to: "/settings", icon: Settings, labelKey: "settings" },
];

export const USER_BOTTOM_NAV: NavItem[] = [
  { label: "Accueil", to: "/dashboard", icon: Home, labelKey: "bottomHome" },
  { label: "Tâches", to: "/tasks", icon: ListChecks, labelKey: "bottomTasks" },
  { label: "Formations", to: "/courses", icon: GraduationCap, labelKey: "bottomCourses" },
  { label: "Wallet", to: "/wallet", icon: Wallet, labelKey: "bottomWallet" },
  { label: "Équipe", to: "/team", icon: Users, labelKey: "bottomTeam" },
  { label: "Profil", to: "/profile", icon: UserCircle, labelKey: "bottomProfile" },
];

export const ADMIN_SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Utilisateurs", to: "/admin/users", icon: Users },
  { label: "Tâches journalières", to: "/admin/tasks", icon: ClipboardList },
  { label: "Réseaux sociaux", to: "/admin/tasks?social=1", icon: Video, indent: true },
  { label: "Formations", to: "/admin/courses", icon: GraduationCap },
  { label: "Frais d'activation", to: "/admin/deposits", icon: ArrowDownToLine },
  { label: "Retraits", to: "/admin/withdrawals", icon: ArrowUpFromLine },
  { label: "Parrainage", to: "/admin/referrals", icon: Share2 },
  { label: "Anti-fraude", to: "/admin/fraud", icon: ShieldAlert },
  { label: "Support", to: "/admin/support", icon: LifeBuoy },
  { label: "Paramètres", to: "/admin/settings", icon: Landmark },
  { label: "Journal d'audit", to: "/admin/audit-logs", icon: FileClock },
];
