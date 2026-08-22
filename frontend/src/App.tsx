import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ToastProvider } from "@/components/ui/Toast";
import { RequireActivation, RequireAuth, RequireRole, RequireStaff } from "@/components/shared/RouteGuards";
import { LoadingState } from "@/components/ui/LoadingState";

import { PublicLayout } from "@/layouts/PublicLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthAwareLayout } from "@/layouts/AuthAwareLayout";

const LandingPage = lazy(() => import("@/pages/public/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@/pages/public/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/public/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/public/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/public/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const TermsPage = lazy(() => import("@/pages/public/TermsPage").then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import("@/pages/public/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

const DashboardPage = lazy(() => import("@/pages/user/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const TasksPage = lazy(() => import("@/pages/user/TasksPage").then((m) => ({ default: m.TasksPage })));
const TaskDetailPage = lazy(() => import("@/pages/user/TaskDetailPage").then((m) => ({ default: m.TaskDetailPage })));
const MyTasksPage = lazy(() => import("@/pages/user/MyTasksPage").then((m) => ({ default: m.MyTasksPage })));
const WalletPage = lazy(() => import("@/pages/user/WalletPage").then((m) => ({ default: m.WalletPage })));
const DepositPage = lazy(() => import("@/pages/user/DepositPage").then((m) => ({ default: m.DepositPage })));
const WithdrawPage = lazy(() => import("@/pages/user/WithdrawPage").then((m) => ({ default: m.WithdrawPage })));
const TransactionsPage = lazy(() => import("@/pages/user/TransactionsPage").then((m) => ({ default: m.TransactionsPage })));
const ReferralsPage = lazy(() => import("@/pages/user/ReferralsPage").then((m) => ({ default: m.ReferralsPage })));
const TeamPage = lazy(() => import("@/pages/user/TeamPage").then((m) => ({ default: m.TeamPage })));
const LeaderboardPage = lazy(() => import("@/pages/user/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const SpinPage = lazy(() => import("@/pages/user/SpinPage").then((m) => ({ default: m.SpinPage })));
const AnalyticsPage = lazy(() => import("@/pages/user/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const ProfilePage = lazy(() => import("@/pages/user/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("@/pages/user/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import("@/pages/user/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const CoursesPage = lazy(() => import("@/pages/user/CoursesPage").then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() => import("@/pages/user/CourseDetailPage").then((m) => ({ default: m.CourseDetailPage })));

const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminTasksPage = lazy(() => import("@/pages/admin/AdminTasksPage").then((m) => ({ default: m.AdminTasksPage })));
const AdminSubmissionsPage = lazy(() => import("@/pages/admin/AdminSubmissionsPage").then((m) => ({ default: m.AdminSubmissionsPage })));
const AdminDepositsPage = lazy(() => import("@/pages/admin/AdminDepositsPage").then((m) => ({ default: m.AdminDepositsPage })));
const AdminWithdrawalsPage = lazy(() => import("@/pages/admin/AdminWithdrawalsPage").then((m) => ({ default: m.AdminWithdrawalsPage })));
const AdminReferralsPage = lazy(() => import("@/pages/admin/AdminReferralsPage").then((m) => ({ default: m.AdminReferralsPage })));
const AdminFraudPage = lazy(() => import("@/pages/admin/AdminFraudPage").then((m) => ({ default: m.AdminFraudPage })));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage").then((m) => ({ default: m.AdminSettingsPage })));
const AdminAuditLogsPage = lazy(() => import("@/pages/admin/AdminAuditLogsPage").then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminCoursesPage = lazy(() => import("@/pages/admin/AdminCoursesPage").then((m) => ({ default: m.AdminCoursesPage })));

function RouteFallback() {
  return <LoadingState className="min-h-dvh" label="Chargement..." />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path="/accueil" element={<LandingPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
            </Route>

            {/* Missions publiques : visitable sans compte (chrome public),
                mais garde le chrome de l'app pour qui est déjà connecté. */}
            <Route element={<AuthAwareLayout />}>
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
            </Route>

            {/* "/" ne montre plus la landing marketing — elle mène directement au
                login pour tout le monde (visiteurs compris) ; la landing reste
                accessible en tapant explicitement /accueil. */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* User app */}
            <Route
              element={
                <RequireAuth>
                  <RequireActivation>
                    <AppLayout />
                  </RequireActivation>
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/wallet/deposit" element={<DepositPage />} />
              <Route path="/wallet/withdraw" element={<WithdrawPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/referrals" element={<ReferralsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/spin" element={<SpinPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <RequireStaff>
                  <AdminLayout />
                </RequireStaff>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="tasks" element={<AdminTasksPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="submissions" element={<AdminSubmissionsPage />} />
              <Route path="deposits" element={<AdminDepositsPage />} />
              <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
              <Route path="referrals" element={<AdminReferralsPage />} />
              <Route path="fraud" element={<AdminFraudPage />} />
              <Route
                path="settings"
                element={
                  <RequireRole roles={["ADMIN"]}>
                    <AdminSettingsPage />
                  </RequireRole>
                }
              />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            </Route>

            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          </Suspense>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
