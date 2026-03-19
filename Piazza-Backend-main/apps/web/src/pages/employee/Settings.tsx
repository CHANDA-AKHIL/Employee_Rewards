import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance', 'Operations', 'Design'];

export const EmployeeSettings: React.FC = () => {
    const user = useAuthStore(s => s.user);
    const setAuth = useAuthStore(s => s.setAuth);
    const token = useAuthStore(s => s.token);

    const [name, setName] = useState(user?.name ?? '');
    const [department, setDepartment] = useState((user as any)?.department ?? '');
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');

    const [profileLoading, setProfileLoading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');
    const [pwMsg, setPwMsg] = useState('');
    const [profileErr, setProfileErr] = useState('');
    const [pwErr, setPwErr] = useState('');

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setProfileErr('Name cannot be empty.'); return; }
        try {
            setProfileLoading(true);
            setProfileErr('');
            setProfileMsg('');
            const payload = await api.put('/employees/me', { name: name.trim(), department: department.trim() }) as any;
            const updated = payload?.data;
            if (updated && token) setAuth({ ...user!, ...updated }, token);
            setProfileMsg('Profile updated successfully!');
            setTimeout(() => setProfileMsg(''), 4000);
        } catch (err: any) {
            setProfileErr(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPw) { setPwErr('Enter your current password.'); return; }
        if (newPw.length < 6) { setPwErr('New password must be at least 6 characters.'); return; }
        if (newPw !== confirmPw) { setPwErr('Passwords do not match.'); return; }
        try {
            setPwLoading(true);
            setPwErr('');
            setPwMsg('');
            await api.put('/employees/me', { currentPassword: currentPw, newPassword: newPw });
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setPwMsg('Password changed successfully!');
            setTimeout(() => setPwMsg(''), 4000);
        } catch (err: any) {
            setPwErr(err.response?.data?.error || 'Failed to change password.');
        } finally {
            setPwLoading(false);
        }
    };

    // ── Shared input style ────────────────────────────────────────────────────
    const inputClass = "w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-sm text-[#e8eaf6] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/20 outline-none transition-all";
    const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your account details and security.</p>
            </div>

            {/* ── Profile section ── */}
            <div className="glass-panel overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f2540] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6c63ff]/10 flex items-center justify-center">
                        <i className="fa-solid fa-user text-[#6c63ff] text-sm"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6]">Profile Information</h3>
                </div>
                <form onSubmit={handleProfileSave} className="p-6">
                    {profileMsg && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm mb-5">
                            <i className="fa-solid fa-circle-check flex-shrink-0"></i>{profileMsg}
                        </div>
                    )}
                    {profileErr && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm mb-5">
                            <i className="fa-solid fa-circle-exclamation flex-shrink-0"></i>{profileErr}
                        </div>
                    )}
                    <div className="space-y-5">
                        <div>
                            <label className={labelClass}>Full Name</label>
                            <input type="text" value={name} onChange={e => { setName(e.target.value); setProfileErr(''); }}
                                className={inputClass} placeholder="Your full name" />
                        </div>
                        <div>
                            <label className={labelClass}>Email Address</label>
                            <input type="email" value={user?.email ?? ''} disabled
                                className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-sm text-gray-600 cursor-not-allowed" />
                            <p className="text-[11px] text-gray-600 mt-1.5">Email cannot be changed. Contact your admin.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Department</label>
                            <div className="relative">
                                <select value={department} onChange={e => setDepartment(e.target.value)}
                                    className={inputClass + ' appearance-none pr-10'}>
                                    <option value="">Select department</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none"></i>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="submit" disabled={profileLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#6c63ff]/20">
                                {profileLoading
                                    ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : <i className="fa-solid fa-floppy-disk text-sm"></i>
                                }
                                Save Profile
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ── Password section ── */}
            <div className="glass-panel overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f2540] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ff6584]/10 flex items-center justify-center">
                        <i className="fa-solid fa-lock text-[#ff6584] text-sm"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6]">Change Password</h3>
                </div>
                <form onSubmit={handlePasswordSave} className="p-6">
                    {pwMsg && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm mb-5">
                            <i className="fa-solid fa-circle-check flex-shrink-0"></i>{pwMsg}
                        </div>
                    )}
                    {pwErr && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm mb-5">
                            <i className="fa-solid fa-circle-exclamation flex-shrink-0"></i>{pwErr}
                        </div>
                    )}
                    <div className="space-y-5">
                        {[
                            { label: 'Current Password', value: currentPw, setter: setCurrentPw, focus: '#ff6584' },
                            { label: 'New Password', value: newPw, setter: setNewPw, focus: '#6c63ff' },
                            { label: 'Confirm New Password', value: confirmPw, setter: setConfirmPw, focus: '#6c63ff' },
                        ].map(({ label, value, setter, focus }) => (
                            <div key={label}>
                                <label className={labelClass}>{label}</label>
                                <input type="password" value={value}
                                    onChange={e => { setter(e.target.value); setPwErr(''); }}
                                    className={`w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-sm text-[#e8eaf6] focus:border-[${focus}] focus:ring-1 focus:ring-[${focus}]/20 outline-none transition-all`}
                                    placeholder="••••••••" />
                            </div>
                        ))}

                        <div className="p-4 rounded-xl bg-[#171b2e] border border-[#1f2540] space-y-2">
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-[#6c63ff] flex-shrink-0"></i>
                                Password must be at least 6 characters.
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-[#6c63ff] flex-shrink-0"></i>
                                You'll stay logged in after changing your password.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" disabled={pwLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#ff6584] hover:bg-[#e44d6d] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all">
                                {pwLoading
                                    ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : <i className="fa-solid fa-key text-sm"></i>
                                }
                                Change Password
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ── Account info ── */}
            <div className="glass-panel overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f2540] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#43e97b]/10 flex items-center justify-center">
                        <i className="fa-solid fa-circle-info text-[#43e97b] text-sm"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6]">Account Details</h3>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: 'Account Role', value: user?.role, icon: 'fa-shield', color: '#6c63ff' },
                        { label: 'Email', value: user?.email, icon: 'fa-envelope', color: '#43e97b' },
                        { label: 'Department', value: (user as any)?.department || '—', icon: 'fa-building', color: '#f7b731' },
                        { label: 'Display Name', value: user?.name, icon: 'fa-id-card', color: '#ff6584' },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className="flex items-center gap-3 p-4 bg-[#0a0c14] rounded-xl border border-[#1f2540]">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${color}15` }}>
                                <i className={`fa-solid ${icon} text-sm`} style={{ color }}></i>
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{label}</div>
                                <div className="text-sm font-bold text-[#e8eaf6] truncate">{value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};