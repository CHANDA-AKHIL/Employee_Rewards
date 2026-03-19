import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { cn } from '../../utils/cn';

interface Kpi {
    id: string;
    title: string;
    description?: string | null;
    pointValue: number;
    status: 'PENDING' | 'COMPLETE' | 'APPROVED' | 'REJECTED';
    rejectReason?: string | null;
    submittedAt?: string | null;
    approvedAt?: string | null;
    createdAt: string;
    employee?: { id: string; name: string; email: string };
}

interface Employee {
    id: string;
    name: string;
    email: string;
    department?: string | null;
}

const STATUS_CONFIG = {
    PENDING: { label: 'Assigned', color: '#f7b731', bg: 'bg-[#f7b731]/10' },
    COMPLETE: { label: 'Awaiting Approval', color: '#06b6d4', bg: 'bg-[#06b6d4]/10' },
    APPROVED: { label: 'Approved', color: '#43e97b', bg: 'bg-[#43e97b]/10' },
    REJECTED: { label: 'Rejected', color: '#ff6584', bg: 'bg-[#ff6584]/10' },
};

export const AdminKpis: React.FC = () => {
    const [kpis, setKpis] = useState<Kpi[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETE' | 'APPROVED' | 'REJECTED'>('ALL');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    // ── Fetch KPIs + employees ────────────────────────────────────────────────
    // GET /kpis → sendPaginated → admin gets ALL KPIs
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [kpiPayload, empPayload] = await Promise.allSettled([
                api.get('/kpis'),
                api.get('/employees'),
            ]);

            if (kpiPayload.status === 'fulfilled') {
                const p = kpiPayload.value as any;
                setKpis(Array.isArray(p?.data) ? p.data : []);
            }
            if (empPayload.status === 'fulfilled') {
                const p = empPayload.value as any;
                const list: Employee[] = Array.isArray(p?.data) ? p.data : [];
                setEmployees(list.filter((e: any) => !e.isDeleted && e.role === 'EMPLOYEE'));
            }
        } catch {
            setError('Failed to load KPI data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Create KPI ────────────────────────────────────────────────────────────
    const onSubmitKpi = async (data: any) => {
        try {
            setError('');
            await api.post('/kpis', {
                title: data.title,
                description: data.description,
                pointValue: parseInt(data.pointValue, 10),
                assignedTo: data.assignedTo,
            });
            setIsCreateOpen(false);
            reset();
            setSuccessMsg(`KPI assigned to employee. They'll be notified immediately.`);
            setTimeout(() => setSuccessMsg(''), 5000);
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create KPI.');
        }
    };

    // ── Approve KPI ───────────────────────────────────────────────────────────
    // POST /kpis/:id/approve
    // Backend now handles PENDING → COMPLETE → APPROVED automatically
    const handleApprove = async (kpi: Kpi) => {
        try {
            setActionLoading(kpi.id);
            setError('');
            await api.post(`/kpis/${kpi.id}/approve`, {});
            setSuccessMsg(`✅ "${kpi.title}" approved! ${kpi.pointValue} pts awarded to ${kpi.employee?.name ?? 'employee'}.`);
            setTimeout(() => setSuccessMsg(''), 5000);
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to approve KPI.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Reject KPI ────────────────────────────────────────────────────────────
    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectId || !rejectReason.trim()) return;
        try {
            setActionLoading(rejectId);
            await api.post(`/kpis/${rejectId}/reject`, { reason: rejectReason });
            setRejectId(null);
            setRejectReason('');
            setSuccessMsg('KPI rejected. Employee has been notified.');
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reject KPI.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = kpis.filter(k => {
        const q = search.toLowerCase();
        const matchesSearch =
            k.title.toLowerCase().includes(q) ||
            (k.employee?.name ?? '').toLowerCase().includes(q) ||
            (k.employee?.email ?? '').toLowerCase().includes(q);
        const matchesFilter = filter === 'ALL' || k.status === filter;
        return matchesSearch && matchesFilter;
    });

    const counts = {
        ALL: kpis.length,
        PENDING: kpis.filter(k => k.status === 'PENDING').length,
        COMPLETE: kpis.filter(k => k.status === 'COMPLETE').length,
        APPROVED: kpis.filter(k => k.status === 'APPROVED').length,
        REJECTED: kpis.filter(k => k.status === 'REJECTED').length,
    };

    // KPIs that need action = PENDING + COMPLETE
    const actionableCount = counts.PENDING + counts.COMPLETE;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">KPI Management</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Assign KPIs to employees and approve their submissions.
                        {actionableCount > 0 && (
                            <span className="ml-2 text-[#f7b731] font-bold">{actionableCount} need action.</span>
                        )}
                    </p>
                </div>
                <Button variant="primary" className="bg-[#6c63ff] hover:bg-[#5b54d6] shadow-lg shadow-[#6c63ff]/20"
                    onClick={() => { setIsCreateOpen(true); setError(''); reset(); }}>
                    <i className="fa-solid fa-plus-circle mr-2"></i> Assign New KPI
                </Button>
            </div>

            {/* ── How it works ── */}
            <div className="p-4 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20 flex gap-3 text-xs text-gray-400">
                <i className="fa-solid fa-circle-info text-[#6c63ff] flex-shrink-0 mt-0.5"></i>
                <div className="leading-relaxed">
                    <span className="text-[#e8eaf6] font-bold">Flow: </span>
                    You assign a KPI
                    <span className="text-[#f7b731] font-bold"> → Assigned</span> →
                    Employee marks it done
                    <span className="text-[#06b6d4] font-bold"> → Awaiting Approval</span> →
                    You approve here
                    <span className="text-[#43e97b] font-bold"> → Approved + Points Awarded</span>.
                    You can also approve directly without waiting for employee submission.
                </div>
            </div>

            {/* ── Banners ── */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm">
                    <i className="fa-solid fa-circle-check"></i>{successMsg}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={() => setError('')} className="ml-auto text-xs underline">Dismiss</button>
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                    {([
                        { key: 'ALL', label: 'All', count: counts.ALL },
                        { key: 'PENDING', label: 'Assigned', count: counts.PENDING },
                        { key: 'COMPLETE', label: 'Awaiting Review', count: counts.COMPLETE },
                        { key: 'APPROVED', label: 'Approved', count: counts.APPROVED },
                        { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
                    ] as const).map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                                filter === f.key ? 'bg-[#6c63ff] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                            )}>
                            {f.label}
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px]',
                                filter === f.key ? 'bg-white/20' : 'bg-[#1f2540] text-gray-500')}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full lg:w-72 group">
                    <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6c63ff]"></i>
                    <input type="text" placeholder="Search KPIs or employees…"
                        className="w-full bg-[#111420] border border-[#1f2540] rounded-xl py-2 pl-10 pr-4 text-sm text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] transition-all"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#171b2e] border-b border-[#1f2540]">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">KPI</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Assigned To</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Points</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2540]">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}><td colSpan={6} className="px-6 py-4">
                                        <div className="h-10 bg-[#1f2540] rounded-xl animate-pulse" />
                                    </td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                                    <i className="fa-solid fa-bullseye text-2xl mb-3 block opacity-30"></i>
                                    {filter === 'ALL' ? 'No KPIs yet. Assign one to get started.' : `No ${filter.toLowerCase()} KPIs.`}
                                </td></tr>
                            ) : filtered.map(kpi => {
                                const cfg = STATUS_CONFIG[kpi.status];
                                const canAction = kpi.status === 'PENDING' || kpi.status === 'COMPLETE';
                                return (
                                    <tr key={kpi.id} className="hover:bg-[#171b2e]/50 transition-colors group">
                                        <td className="px-6 py-4 w-1/3">
                                            <div className="font-bold text-[#e8eaf6] group-hover:text-[#6c63ff] transition-colors text-sm">
                                                {kpi.title}
                                            </div>
                                            <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                                                {kpi.description || 'No description'}
                                            </div>
                                            {kpi.status === 'REJECTED' && kpi.rejectReason && (
                                                <div className="text-[10px] text-[#ff6584] mt-1">
                                                    Reason: {kpi.rejectReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                                    {(kpi.employee?.name ?? 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-[#e8eaf6]">{kpi.employee?.name ?? 'Unassigned'}</div>
                                                    <div className="text-[10px] text-gray-600">{kpi.employee?.email ?? ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                            {new Date(kpi.submittedAt ?? kpi.createdAt).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-syne font-bold text-[#6c63ff]">+{kpi.pointValue}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-bold uppercase', cfg.bg)}
                                                style={{ color: cfg.color }}>
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {canAction ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => { setRejectId(kpi.id); setRejectReason(''); }}
                                                        disabled={actionLoading === kpi.id}
                                                        className="w-8 h-8 rounded-lg bg-[#ff6584]/10 text-[#ff6584] hover:bg-[#ff6584] hover:text-white transition-all flex items-center justify-center disabled:opacity-40"
                                                        title="Reject">
                                                        <i className="fa-solid fa-xmark text-sm"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(kpi)}
                                                        disabled={actionLoading === kpi.id}
                                                        className="w-8 h-8 rounded-lg bg-[#43e97b]/10 text-[#43e97b] hover:bg-[#43e97b] hover:text-white transition-all flex items-center justify-center disabled:opacity-40"
                                                        title="Approve & Award Points">
                                                        {actionLoading === kpi.id
                                                            ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                            : <i className="fa-solid fa-check text-sm"></i>
                                                        }
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">
                                                    {kpi.status === 'APPROVED' ? '✓ Done' : '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Create KPI Modal ── */}
            <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setError(''); reset(); }} title="Assign New KPI">
                <form onSubmit={handleSubmit(onSubmitKpi)} className="space-y-4 p-2">
                    {error && (
                        <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">{error}</div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">KPI Title</label>
                        <input type="text" {...register('title', { required: true })}
                            className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                            placeholder="e.g. Close 5 new deals this month" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                        <textarea {...register('description')}
                            className="w-full h-20 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none resize-none"
                            placeholder="What does the employee need to do to complete this KPI?" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Points Reward</label>
                            <input type="number" min={1} {...register('pointValue', { required: true, min: 1 })}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                                placeholder="100" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Assign To</label>
                            <select {...register('assignedTo', { required: true })}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none appearance-none">
                                <option value="">Select employee…</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.name}{e.department ? ` (${e.department})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" type="button" onClick={() => { setIsCreateOpen(false); setError(''); reset(); }}>Cancel</Button>
                        <Button variant="primary" type="submit" isLoading={isSubmitting} className="bg-[#6c63ff] hover:bg-[#5b54d6]">
                            <i className="fa-solid fa-paper-plane mr-2"></i>Assign KPI
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Reject Modal ── */}
            <Modal isOpen={!!rejectId} onClose={() => { setRejectId(null); setRejectReason(''); }} title="Reject KPI">
                <form onSubmit={handleReject} className="space-y-4 p-2">
                    <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/20 text-xs text-gray-400">
                        <i className="fa-solid fa-circle-exclamation text-[#ff6584] mr-2"></i>
                        Employee will be notified. No points will be awarded.
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Reason <span className="text-[#ff6584]">*</span>
                        </label>
                        <textarea required value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            className="w-full h-28 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#ff6584] outline-none resize-none"
                            placeholder="e.g. Missing proof, incomplete submission…" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" type="button" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</Button>
                        <Button variant="primary" type="submit" className="bg-[#ff6584] hover:bg-[#e44d6d]">Confirm Rejection</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};