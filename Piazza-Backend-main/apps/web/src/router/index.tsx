import React from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// Layouts
import { AuthLayout } from "../layouts/AuthLayout";
import { AppLayout } from "../layouts/AppLayout";

// Auth Pages
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";

// ─── Admin Pages ──────────────────────────────────────────────────────────────
import { AdminDashboard } from "../pages/admin/Dashboard";
import { AdminAnalytics } from "../pages/admin/Analytics";
import { AdminKpis } from "../pages/admin/Kpis";
import { AdminEmployees } from "../pages/admin/Employees";
import { AdminApprovals } from "../pages/admin/Approvals";
import { AdminRewards } from "../pages/admin/Rewards";
import { AdminBadges } from "../pages/admin/Badges";
import { AdminChallenges } from "../pages/admin/Challenges";

// Admin pages that exist in the sidebar but had no route registered
// — stub them out so the router matches rather than hitting the catch-all
const AdminLeaderboard = () => <div className="text-white p-8">Leaderboard — coming soon</div>;
const AdminNotifications = () => <div className="text-white p-8">Notifications — coming soon</div>;
const AdminAuditLogs = () => <div className="text-white p-8">Audit Logs — coming soon</div>;

// ─── Employee Pages ───────────────────────────────────────────────────────────
import { EmployeeDashboard } from "../pages/employee/Dashboard";
import { EmployeeKpis } from "../pages/employee/Kpis";
import { EmployeeBadges } from "../pages/employee/Badges";
import { EmployeeLeaderboard } from "../pages/employee/Leaderboard";
import { EmployeeChallenges } from "../pages/employee/Challenges";
import { EmployeeRewards } from "../pages/employee/Rewards";
import { Notifications } from "../pages/shared/Notifications";

// Employee pages that exist in the sidebar but had no route registered
// — stub them out so the router matches rather than hitting the catch-all
const EmployeeAchievements = () => <div className="text-white p-8">Achievements — coming soon</div>;
const EmployeeRecognition = () => <div className="text-white p-8">Give Recognition — coming soon</div>;
const EmployeeProfile = () => <div className="text-white p-8">Profile — coming soon</div>;
const EmployeeAnalytics = () => <div className="text-white p-8">Analytics — coming soon</div>;
const EmployeeSettings = () => <div className="text-white p-8">Settings — coming soon</div>;

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
//
//  1. _hasHydrated false  → still reading localStorage, show spinner
//  2. No token / no user  → not logged in, go to /login
//  3. Wrong role          → logged in but wrong path, redirect to correct dashboard
//  4. Correct role        → render children
//
interface ProtectedRouteProps {
    children: React.ReactNode;
    role: "ADMIN" | "EMPLOYEE";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
    const { user, token, _hasHydrated } = useAuthStore();

    // 1. Zustand hasn't read localStorage yet — don't redirect, just wait
    if (!_hasHydrated) {
        return (
            <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#6c63ff] border-t-transparent animate-spin" />
            </div>
        );
    }

    // 2. Not authenticated
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Wrong role — send to the right dashboard
    if (user.role !== role) {
        const correctPath = user.role === "ADMIN"
            ? "/admin/dashboard"
            : "/employee/dashboard";
        return <Navigate to={correctPath} replace />;
    }

    // 4. All good
    return <>{children}</>;
};

// ─── AppRouter ────────────────────────────────────────────────────────────────
export const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Root */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* ── Auth (public) ── */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>

                {/* ── Admin ── */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute role="ADMIN">
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Default: /admin → /admin/dashboard */}
                    <Route index element={<Navigate to="dashboard" replace />} />

                    {/* Overview */}
                    <Route path="dashboard" element={<AdminDashboard />} />

                    {/* Management */}
                    <Route path="employees" element={<AdminEmployees />} />
                    <Route path="kpis" element={<AdminKpis />} />
                    <Route path="rewards" element={<AdminRewards />} />
                    <Route path="approvals" element={<AdminApprovals />} />

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
                <Route
                    path="/employee"
                    element={
                        <ProtectedRoute role="EMPLOYEE">
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Default: /employee → /employee/dashboard */}
                    <Route index element={<Navigate to="dashboard" replace />} />

                    {/* Main */}
                    <Route path="dashboard" element={<EmployeeDashboard />} />
                    <Route path="challenges" element={<EmployeeChallenges />} />
                    <Route path="achievements" element={<EmployeeAchievements />} />
                    <Route path="leaderboard" element={<EmployeeLeaderboard />} />

                    {/* Rewards */}
                    <Route path="rewards" element={<EmployeeRewards />} />
                    <Route path="recognition" element={<EmployeeRecognition />} />

                    {/* KPIs (linked from sidebar in some layouts) */}
                    <Route path="kpis" element={<EmployeeKpis />} />

                    {/* Account */}
                    <Route path="profile" element={<EmployeeProfile />} />
                    <Route path="analytics" element={<EmployeeAnalytics />} />
                    <Route path="settings" element={<EmployeeSettings />} />
                    <Route path="notifications" element={<Notifications />} />

                    {/* Badges (accessible via direct link even if not in main sidebar) */}
                    <Route path="badges" element={<EmployeeBadges />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
};