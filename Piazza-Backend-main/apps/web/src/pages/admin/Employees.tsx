import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { cn } from '../../utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'EMPLOYEE';
    department?: string | null;
    level: number;
    totalPoints: number;
    streakCount: number;
    isDeleted: boolean;
    createdAt: string;
}

interface EmployeeStats {
    totalPoints: number;
    level: number;
    streakCount: number;
    badgesEarned: number;
    kpisCompleted: number;
    rank: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// api.ts interceptor strips axios → payload = raw JSON body
// sendPaginated → { success, data: [], pagination }
// sendSuccess   → { success, data: T }
function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AdminEmployees: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [selectedStats, setSelectedStats] = useState<EmployeeStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [addError, setAddError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    // ── Fetch employees ───────────────────────────────────────────────────────
    // GET /employees → sendPaginated → { success, data: Employee[], pagination }
    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const payload = await api.get('/employees') as any;
            // sendPaginated: payload.data = array
            const list: Employee[] = Array.isArray(payload?.data) ? payload.data : [];
            setEmployees(list);
        } catch (err: any) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    // ── View profile + stats ──────────────────────────────────────────────────
    const openProfile = async (emp: Employee) => {
        setSelectedEmp(emp);
        setSelectedStats(null);
        setStatsLoading(true);
        try {
            // GET /employees/:id/stats → sendSuccess → { success, data: { totalPoints, level, streakCount, badgesEarned, kpisCompleted, rank } }
            const payload = await api.get(`/employees/${emp.id}/stats`) as any;
            const stats: EmployeeStats = payload?.data ?? {
                totalPoints: emp.totalPoints, level: emp.level,
                streakCount: emp.streakCount, badgesEarned: 0,
                kpisCompleted: 0, rank: 0,
            };
            setSelectedStats(stats);
        } catch {
            setSelectedStats({
                totalPoints: emp.totalPoints, level: emp.level,
                streakCount: emp.streakCount, badgesEarned: 0,
                kpisCompleted: 0, rank: 0,
            });
        } finally {
            setStatsLoading(false);
        }
    };

    // ── Add employee ──────────────────────────────────────────────────────────
    const onSubmitAdd = async (data: any) => {
        try {
            setAddError('');
            // POST /auth/register
            await api.post('/auth/register', {
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role || 'EMPLOYEE',
                department: data.department,
            });
            setIsAddOpen(false);
            reset();
            setSuccessMsg(`Employee ${data.name} added successfully!`);
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchEmployees();
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Failed to add employee.';
            setAddError(msg);
        }
    };

    // ── Toggle block/unblock ──────────────────────────────────────────────────
    const toggleBlock = async (id: string) => {
        try {
            setActionLoading(id);
            // PATCH /employees/:id/block → sendSuccess
            await api.patch(`/employees/${id}/block`);
            await fetchEmployees();
        } catch (err: any) {
            console.error('Failed to toggle block:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = employees.filter(e => {
        const q = search.toLowerCase();
        const matchesSearch = e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
        const matchesFilter =
            filter === 'ALL' ? true :
                filter === 'INACTIVE' ? e.isDeleted :
                    !e.isDeleted;
        return matchesSearch && matchesFilter;
    });

    const activeCount = employees.filter(e => !e.isDeleted).length;
    const inactiveCount = employees.filter(e => e.isDeleted).length;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Employees</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage team members — {activeCount} active, {inactiveCount} inactive.
                    </p>
                </div>
                <Button
                    variant="primary"
                    className="bg-[#6c63ff] hover:bg-[#5b54d6] shadow-lg shadow-[#6c63ff]/20"
                    onClick={() => { setIsAddOpen(true); setAddError(''); reset(); }}
                >
                    <i className="fa-solid fa-user-plus mr-2"></i> Add Employee
                </Button>
            </div>

            {/* ── Banners ── */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm">
                    <i className="fa-solid fa-circle-check"></i>{successMsg}
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                    {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                                filter === f ? 'bg-[#6c63ff] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                            )}
                        >
                            {f[0] + f.slice(1).toLowerCase()}
                            {f !== 'ALL' && (
                                <span className="ml-1.5 text-[10px] opacity-70">
                                    ({f === 'ACTIVE' ? activeCount : inactiveCount})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="relative w-full lg:w-80 group">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6c63ff] transition-colors"></i>
                    <input
                        type="text"
                        placeholder="Search by name or email…"
                        className="w-full bg-[#111420] border border-[#1f2540] rounded-xl py-2 pl-10 pr-4 text-sm text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#171b2e] border-b border-[#1f2540]">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Department</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Level</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Points</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2540]">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-10 bg-[#1f2540] rounded-xl animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                                        <i className="fa-solid fa-users-slash text-2xl mb-3 block opacity-30"></i>
                                        No employees found.
                                    </td>
                                </tr>
                            ) : filtered.map(emp => (
                                <tr key={emp.id} className="hover:bg-[#171b2e]/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                                {initials(emp.name)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[#e8eaf6] group-hover:text-[#6c63ff] transition-colors">
                                                    {emp.name}
                                                    {emp.role === 'ADMIN' && (
                                                        <span className="ml-2 text-[10px] bg-[#6c63ff]/10 text-[#6c63ff] px-1.5 py-0.5 rounded-full">Admin</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">{emp.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs text-gray-400">{emp.department || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[#f7b731]/10 text-[#f7b731]">
                                            Lv. {emp.level}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {/* totalPoints is the correct field from your Prisma schema */}
                                        <span className="text-sm font-syne font-bold text-[#43e97b]">
                                            {(emp.totalPoints ?? 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={cn(
                                            'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase',
                                            emp.isDeleted
                                                ? 'bg-[#ff6584]/10 text-[#ff6584]'
                                                : 'bg-[#43e97b]/10 text-[#43e97b]'
                                        )}>
                                            {emp.isDeleted ? 'Inactive' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openProfile(emp)}
                                                className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-[#6c63ff] bg-[#171b2e] hover:bg-[#6c63ff]/10 rounded-lg transition-all border border-[#1f2540]"
                                            >
                                                <i className="fa-solid fa-eye mr-1.5"></i>View
                                            </button>
                                            <button
                                                onClick={() => toggleBlock(emp.id)}
                                                disabled={actionLoading === emp.id}
                                                className={cn(
                                                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all border',
                                                    emp.isDeleted
                                                        ? 'text-[#43e97b] bg-[#43e97b]/10 border-[#43e97b]/20 hover:bg-[#43e97b] hover:text-white'
                                                        : 'text-[#ff6584] bg-[#ff6584]/10 border-[#ff6584]/20 hover:bg-[#ff6584] hover:text-white',
                                                    actionLoading === emp.id && 'opacity-50 cursor-not-allowed'
                                                )}
                                            >
                                                {actionLoading === emp.id ? (
                                                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                                                ) : (
                                                    <i className={`fa-solid ${emp.isDeleted ? 'fa-circle-check' : 'fa-ban'} mr-1.5`}></i>
                                                )}
                                                {emp.isDeleted ? 'Activate' : 'Block'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Add Employee Modal ── */}
            <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setAddError(''); reset(); }} title="Add New Employee">
                <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4 p-2">
                    {addError && (
                        <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                            {addError}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
                            <input
                                type="text"
                                {...register('name', { required: true })}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
                            <input
                                type="email"
                                {...register('email', { required: true })}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                                placeholder="john@company.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Password</label>
                        <input
                            type="password"
                            {...register('password', { required: true, minLength: 6 })}
                            className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                            placeholder="Min. 6 characters"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Department</label>
                            <select
                                {...register('department')}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none appearance-none"
                            >
                                <option value="Engineering">Engineering</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Sales">Sales</option>
                                <option value="Human Resources">Human Resources</option>
                                <option value="Finance">Finance</option>
                                <option value="Operations">Operations</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Role</label>
                            <select
                                {...register('role')}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none appearance-none"
                            >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" type="button" onClick={() => { setIsAddOpen(false); setAddError(''); reset(); }}>Cancel</Button>
                        <Button variant="primary" type="submit" isLoading={isSubmitting} className="bg-[#6c63ff] hover:bg-[#5b54d6]">
                            Create Account
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Profile Modal ── */}
            <Modal isOpen={!!selectedEmp} onClose={() => { setSelectedEmp(null); setSelectedStats(null); }} title="Employee Profile">
                {selectedEmp && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-5 p-5 bg-[#171b2e] rounded-2xl border border-[#1f2540]">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                                {initials(selectedEmp.name)}
                            </div>
                            <div>
                                <h3 className="text-xl font-syne font-bold text-[#e8eaf6]">{selectedEmp.name}</h3>
                                <p className="text-gray-500 text-sm">{selectedEmp.email}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#6c63ff]/10 text-[#6c63ff]">
                                        {selectedEmp.role}
                                    </span>
                                    {selectedEmp.department && (
                                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#43e97b]/10 text-[#43e97b]">
                                            {selectedEmp.department}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {statsLoading ? (
                            <div className="grid grid-cols-3 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-20 bg-[#1f2540] rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : selectedStats && (
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Total Points', value: selectedStats.totalPoints.toLocaleString(), color: '#43e97b' },
                                    { label: 'Level', value: `Lv. ${selectedStats.level}`, color: '#f7b731' },
                                    { label: 'Streak', value: `${selectedStats.streakCount}d`, color: '#6c63ff' },
                                    { label: 'KPIs Done', value: selectedStats.kpisCompleted, color: '#06b6d4' },
                                    { label: 'Badges', value: selectedStats.badgesEarned, color: '#f59e0b' },
                                    { label: 'Rank', value: selectedStats.rank > 0 ? `#${selectedStats.rank}` : '—', color: '#ff6584' },
                                ].map((s, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-[#0a0c14] border border-[#1f2540] text-center">
                                        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">{s.label}</div>
                                        <div className="text-xl font-syne font-bold" style={{ color: s.color }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => toggleBlock(selectedEmp.id)}
                                className={cn(
                                    'px-4 py-2 text-sm font-bold rounded-xl border transition-all',
                                    selectedEmp.isDeleted
                                        ? 'text-[#43e97b] border-[#43e97b]/30 hover:bg-[#43e97b] hover:text-white'
                                        : 'text-[#ff6584] border-[#ff6584]/30 hover:bg-[#ff6584] hover:text-white'
                                )}
                            >
                                {selectedEmp.isDeleted ? 'Activate Account' : 'Block Account'}
                            </button>
                            <Button variant="ghost" onClick={() => { setSelectedEmp(null); setSelectedStats(null); }}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};