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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const USER_SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Tâches journalières", to: "/tasks", icon: ListChecks },
  { label: "Formations", to: "/courses", icon: GraduationCap },
  { label: "Portefeuille", to: "/wallet", icon: Wallet },
  { label: "Transactions", to: "/transactions", icon: Receipt },
  { label: "Équipe", to: "/team", icon: Users },
  { label: "Canal de diffusion", to: "/channels", icon: Radio },
  { label: "Classement", to: "/leaderboard", icon: Trophy },
  { label: "Roue de la chance", to: "/spin", icon: Sparkles },
  { label: "Statistiques", to: "/analytics", icon: BarChart3 },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Paramètres", to: "/settings", icon: Settings },
];

export const USER_BOTTOM_NAV: NavItem[] = [
  { label: "Accueil", to: "/dashboard", icon: Home },
  { label: "Tâches", to: "/tasks", icon: ListChecks },
  { label: "Formations", to: "/courses", icon: GraduationCap },
  { label: "Wallet", to: "/wallet", icon: Wallet },
  { label: "Équipe", to: "/team", icon: Users },
  { label: "Profil", to: "/profile", icon: UserCircle },
];

export const ADMIN_SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Utilisateurs", to: "/admin/users", icon: Users },
  { label: "Tâches journalières", to: "/admin/tasks", icon: ClipboardList },
  { label: "Formations", to: "/admin/courses", icon: GraduationCap },
  { label: "Soumissions", to: "/admin/submissions", icon: ListChecks },
  { label: "Frais d'activation", to: "/admin/deposits", icon: ArrowDownToLine },
  { label: "Retraits", to: "/admin/withdrawals", icon: ArrowUpFromLine },
  { label: "Parrainage", to: "/admin/referrals", icon: Share2 },
  { label: "Anti-fraude", to: "/admin/fraud", icon: ShieldAlert },
  { label: "Paramètres", to: "/admin/settings", icon: Landmark },
  { label: "Journal d'audit", to: "/admin/audit-logs", icon: FileClock },
];
