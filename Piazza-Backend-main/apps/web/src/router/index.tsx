import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// Layouts
import { AuthLayout } from "../layouts/AuthLayout";
import { AppLayout } from "../layouts/AppLayout";

// Auth
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";

// ── Admin pages ──────────────────────────────────────────────────────────────
import { AdminDashboard } from "../pages/admin/Dashboard";
import { AdminEmployees } from "../pages/admin/Employees";
import { AdminKpis } from "../pages/admin/Kpis";
import { AdminApprovals } from "../pages/admin/Approvals";
import { AdminRewards } from "../pages/admin/Rewards";
import { AdminBadges } from "../pages/admin/Badges";
import { AdminChallenges } from "../pages/admin/Challenges";
import { AdminAnalytics } from "../pages/admin/Analytics";
import { AdminLeaderboard } from "../pages/admin/Leaderboard";
import { AdminAuditLogs } from "../pages/admin/AuditLogs";
import { AdminNotifications } from "../pages/admin/Notifications";

// ── Employee pages ────────────────────────────────────────────────────────────
import { EmployeeDashboard } from "../pages/employee/Dashboard";
import { EmployeeKpis } from "../pages/employee/Kpis";
import { EmployeeBadges } from "../pages/employee/Badges";
import { EmployeeLeaderboard } from "../pages/employee/Leaderboard";
import { EmployeeChallenges } from "../pages/employee/Challenges";
import { EmployeeRewards } from "../pages/employee/Rewards";
import { EmployeeProfile } from "../pages/employee/Profile";
import { EmployeeAnalytics } from "../pages/employee/Analytics";
import { EmployeeSettings } from "../pages/employee/Settings";
import { EmployeeRecognition } from "../pages/employee/Recognition";

// Shared
import { Notifications } from "../pages/shared/Notifications";

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
interface ProtectedRouteProps {
    children: React.ReactNode;
    role: "ADMIN" | "EMPLOYEE";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
    const { user, token, _hasHydrated } = useAuthStore();

    // 1. Still reading localStorage — don't redirect, show spinner
    if (!_hasHydrated) {
        return (
            <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#6c63ff] border-t-transparent animate-spin" />
            </div>
        );
    }

    // 2. Not authenticated
    if (!token || !user) return <Navigate to="/login" replace />;

    // 3. Wrong role
    if (user.role !== role) {
        return <Navigate to={user.role === "ADMIN" ? "/admin/dashboard" : "/employee/dashboard"} replace />;
    }

    return <>{children}</>;
};

// ─── AppRouter ────────────────────────────────────────────────────────────────
export const AppRouter: React.FC = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Route>

            {/* ── Admin ── */}
            <Route path="/admin" element={
                <ProtectedRoute role="ADMIN"><AppLayout /></ProtectedRoute>
            }>
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* Overview */}
                <Route path="dashboard" element={<AdminDashboard />} />

                {/* Management */}
                <Route path="employees" element={<AdminEmployees />} />
                <Route path="kpis" element={<AdminKpis />} />
                <Route path="approvals" element={<AdminApprovals />} />
                <Route path="rewards" element={<AdminRewards />} />

                {/* Engagement */}
                <Route path="leaderboard" element={<AdminLeaderboard />} />
                <Route path="badges" element={<AdminBadges />} />
                <Route path="challenges" element={<AdminChallenges />} />

                {/* Insights */}
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="audit" element={<AdminAuditLogs />} />
            </Route>

            {/* ── Employee ── */}
            <Route path="/employee" element={
                <ProtectedRoute role="EMPLOYEE"><AppLayout /></ProtectedRoute>
            }>
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* Main */}
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="kpis" element={<EmployeeKpis />} />
                <Route path="challenges" element={<EmployeeChallenges />} />
                <Route path="leaderboard" element={<EmployeeLeaderboard />} />

                {/* Rewards */}
                <Route path="rewards" element={<EmployeeRewards />} />
                <Route path="recognition" element={<EmployeeRecognition />} />

                {/* Account */}
                <Route path="achievements" element={<EmployeeBadges />} />
                <Route path="badges" element={<EmployeeBadges />} />
                <Route path="profile" element={<EmployeeProfile />} />
                <Route path="analytics" element={<EmployeeAnalytics />} />
                <Route path="settings" element={<EmployeeSettings />} />
                <Route path="notifications" element={<Notifications />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    </BrowserRouter>
);