import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const user = useAuthStore((state) => state.user);
    const clearAuth = useAuthStore((state) => state.clearAuth);

    if (!user) return null;

    const navGroups = user.role === 'ADMIN' ? [
        {
            label: 'Overview',
            items: [
                { name: 'Dashboard', path: '/admin/dashboard', icon: 'fa-gauge-high' },
            ]
        },
        {
            label: 'Management',
            items: [
                { name: 'Employees', path: '/admin/employees', icon: 'fa-users' },
                { name: 'KPIs', path: '/admin/kpis', icon: 'fa-bullseye' },
                { name: 'Rewards', path: '/admin/rewards', icon: 'fa-gift' },
                { name: 'Approvals', path: '/admin/approvals', icon: 'fa-check-double' },
            ]
        },
        {
            label: 'Engagement',
            items: [
                { name: 'Leaderboard', path: '/admin/leaderboard', icon: 'fa-ranking-star' },
                { name: 'Badges', path: '/admin/badges', icon: 'fa-medal' },
                { name: 'Challenges', path: '/admin/challenges', icon: 'fa-swords' },
            ]
        },
        {
            label: 'Insights',
            items: [
                { name: 'Analytics', path: '/admin/analytics', icon: 'fa-chart-line' },
                { name: 'Notifications', path: '/admin/notifications', icon: 'fa-bell' },
                { name: 'Audit Logs', path: '/admin/audit', icon: 'fa-shield-halved' },
            ]
        },
    ] : [
        {
            label: 'Main',
            items: [
                { name: 'Dashboard', path: '/employee/dashboard', icon: 'fa-shapes' },
                // ── KPIs added here — employee must be able to see assigned KPIs ──
                { name: 'My KPIs', path: '/employee/kpis', icon: 'fa-bullseye' },
                { name: 'Challenges', path: '/employee/challenges', icon: 'fa-swords' },
                { name: 'Achievements', path: '/employee/achievements', icon: 'fa-medal' },
                { name: 'Leaderboard', path: '/employee/leaderboard', icon: 'fa-ranking-star' },
            ]
        },
        {
            label: 'Rewards',
            items: [
                { name: 'Redeem Points', path: '/employee/rewards', icon: 'fa-gift' },
                { name: 'Give Recognition', path: '/employee/recognition', icon: 'fa-heart' },
            ]
        },
        {
            label: 'Account',
            items: [
                { name: 'Profile', path: '/employee/profile', icon: 'fa-user' },
                { name: 'Analytics', path: '/employee/analytics', icon: 'fa-chart-pie' },
                { name: 'Notifications', path: '/employee/notifications', icon: 'fa-bell' },
                { name: 'Settings', path: '/employee/settings', icon: 'fa-gear' },
            ]
        },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside
                id="sidebar"
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-64 bg-[#111420] border-r border-[#1f2540] flex flex-col transform transition-transform duration-300 ease-in-out md:static',
                    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                )}
            >
                {/* Logo */}
                <div className="p-5 flex items-center gap-3 border-b border-[#1f2540]">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#6c63ff] to-[#ff6584] rounded-xl flex items-center justify-center text-white text-lg">
                        🏆
                    </div>
                    <div className="font-syne font-extrabold text-lg tracking-tight text-[#e8eaf6]">
                        Reward<span className="text-[#6c63ff]">IQ</span>
                    </div>
                    <button onClick={onClose} className="md:hidden ml-auto text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
                    {navGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="mb-6">
                            <div className="px-3 py-2 text-[10px] font-bold text-[#6b7280] uppercase tracking-[0.1em]">
                                {group.label}
                            </div>
                            <div className="space-y-0.5 mt-1">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => window.innerWidth < 768 && onClose()}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                                isActive
                                                    ? 'bg-gradient-to-r from-[rgba(108,99,255,0.15)] to-transparent text-[#6c63ff] border-l-2 border-[#6c63ff]'
                                                    : 'text-[#6b7280] hover:bg-[#171b2e] hover:text-[#e8eaf6]'
                                            )
                                        }
                                    >
                                        <i className={cn('fa-solid w-5 text-center', item.icon, 'text-sm')}></i>
                                        <span>{item.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[#1f2540]">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#171b2e] border border-[#1f2540] cursor-pointer transition-colors hover:border-[#6c63ff]/30">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[#e8eaf6] truncate">{user.name}</div>
                            <div className="text-[10px] text-[#6b7280]">{user.role}</div>
                        </div>
                        <button
                            onClick={clearAuth}
                            title="Sign out"
                            className="text-[#6b7280] hover:text-[#ff6584] transition-colors flex-shrink-0"
                        >
                            <i className="fa-solid fa-right-from-bracket text-xs"></i>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};