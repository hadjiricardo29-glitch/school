import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ToastProvider } from "@/components/ui/Toast";
import { RequireAuth, RequireRole, RequireStaff } from "@/components/shared/RouteGuards";

import { PublicLayout } from "@/layouts/PublicLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

import { LandingPage } from "@/pages/public/LandingPage";
import { LoginPage } from "@/pages/public/LoginPage";
import { RegisterPage } from "@/pages/public/RegisterPage";
import { ForgotPasswordPage } from "@/pages/public/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/public/ResetPasswordPage";
import { TermsPage } from "@/pages/public/TermsPage";
import { PrivacyPage } from "@/pages/public/PrivacyPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";

import { DashboardPage } from "@/pages/user/DashboardPage";
import { TasksPage } from "@/pages/user/TasksPage";
import { TaskDetailPage } from "@/pages/user/TaskDetailPage";
import { MyTasksPage } from "@/pages/user/MyTasksPage";
import { WalletPage } from "@/pages/user/WalletPage";
import { DepositPage } from "@/pages/user/DepositPage";
import { WithdrawPage } from "@/pages/user/WithdrawPage";
import { TransactionsPage } from "@/pages/user/TransactionsPage";
import { ReferralsPage } from "@/pages/user/ReferralsPage";
import { TeamPage } from "@/pages/user/TeamPage";
import { LeaderboardPage } from "@/pages/user/LeaderboardPage";
import { SpinPage } from "@/pages/user/SpinPage";
import { AnalyticsPage } from "@/pages/user/AnalyticsPage";
import { ProfilePage } from "@/pages/user/ProfilePage";
import { SettingsPage } from "@/pages/user/SettingsPage";
import { NotificationsPage } from "@/pages/user/NotificationsPage";

import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminTasksPage } from "@/pages/admin/AdminTasksPage";
import { AdminSubmissionsPage } from "@/pages/admin/AdminSubmissionsPage";
import { AdminDepositsPage } from "@/pages/admin/AdminDepositsPage";
import { AdminWithdrawalsPage } from "@/pages/admin/AdminWithdrawalsPage";
import { AdminReferralsPage } from "@/pages/admin/AdminReferralsPage";
import { AdminFraudPage } from "@/pages/admin/AdminFraudPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminAuditLogsPage } from "@/pages/admin/AdminAuditLogsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider />
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* User app */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
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
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
