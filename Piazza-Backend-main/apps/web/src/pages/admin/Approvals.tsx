import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

interface KpiApproval {
    id: string;
    title: string;
    description?: string | null;
    pointValue: number;
    status: 'PENDING' | 'COMPLETE' | 'APPROVED' | 'REJECTED';
    submittedAt?: string | null;
    createdAt: string;
    employee?: { id: string; name: string; email: string };
}

interface AdminRequest {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    createdAt: string;
}

export const AdminApprovals: React.FC = () => {
    const user = useAuthStore(s => s.user);

    const [kpiList, setKpiList] = useState<KpiApproval[]>([]);
    const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'kpi' | 'admin'>('kpi');
    const [kpiFilter, setKpiFilter] = useState<'COMPLETE' | 'PENDING' | 'ALL'>('COMPLETE');
    const [loading, setLoading] = useState(true);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');

    // ── Fetch KPIs ────────────────────────────────────────────────────────────
    // GET /kpis?status=COMPLETE → only KPIs awaiting review
    // GET /kpis?status=PENDING  → KPIs assigned but not submitted
    // GET /kpis                 → all KPIs (filtered client-side to actionable)
    // FIX: backend kpiController.list() now correctly reads ?status= query param
    const fetchKpiApprovals = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            // Use status filter — backend now supports this correctly
            const url = kpiFilter === 'ALL' ? '/kpis' : `/kpis?status=${kpiFilter}`;
            const payload = await api.get(url) as any;
            let list: KpiApproval[] = Array.isArray(payload?.data) ? payload.data : [];

            // When ALL: only show actionable (PENDING + COMPLETE), not APPROVED/REJECTED
            if (kpiFilter === 'ALL') {
                list = list.filter(k => k.status === 'PENDING' || k.status === 'COMPLETE');
            }

            // Sort: COMPLETE (awaiting review) first, then PENDING
            list.sort((a, b) => {
                if (a.status === 'COMPLETE' && b.status !== 'COMPLETE') return -1;
                if (a.status !== 'COMPLETE' && b.status === 'COMPLETE') return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            setKpiList(list);
        } catch {
            setError('Failed to load KPI submissions.');
        } finally {
            setLoading(false);
        }
    }, [kpiFilter]);

    const fetchAdminRequests = useCallback(async () => {
        try {
            setLoading(true);
            const payload = await api.get('/admin-approval/pending') as any;
            setAdminRequests(Array.isArray(payload?.data) ? payload.data : []);
        } catch {
            setAdminRequests([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'kpi') fetchKpiApprovals();
        else fetchAdminRequests();
    }, [activeTab, fetchKpiApprovals, fetchAdminRequests]);

    // ── Approve KPI ───────────────────────────────────────────────────────────
    // POST /kpis/:id/approve
    // Backend handles PENDING→COMPLETE→APPROVED in one call automatically
    const handleApproveKpi = async (kpi: KpiApproval) => {
        try {
            setActionLoading(kpi.id);
            setError('');
            await api.post(`/kpis/${kpi.id}/approve`, {});
            setSuccessMsg(`✅ "${kpi.title}" approved! ${kpi.pointValue} pts awarded to ${kpi.employee?.name ?? 'employee'}.`);
            setTimeout(() => setSuccessMsg(''), 5000);
            await fetchKpiApprovals();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to approve KPI.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Reject KPI ────────────────────────────────────────────────────────────
    const handleRejectKpi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectId || !rejectReason.trim()) return;
        try {
            setActionLoading(rejectId);
            await api.post(`/kpis/${rejectId}/reject`, { reason: rejectReason });
            setRejectId(null);
            setRejectReason('');
            setSuccessMsg('KPI rejected. Employee has been notified.');
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchKpiApprovals();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reject KPI.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Admin decision ────────────────────────────────────────────────────────
    const handleAdminDecision = async (id: string, approve: boolean, name: string) => {
        try {
            setActionLoading(id);
            await api.post(`/admin-approval/${id}/approve`, { approve });
            setSuccessMsg(`Admin request for ${name} ${approve ? 'approved' : 'rejected'}.`);
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchAdminRequests();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to process admin request.');
        } finally {
            setActionLoading(null);
        }
    };

    const completeCount = kpiList.filter(k => k.status === 'COMPLETE').length;
    const pendingCount = kpiList.filter(k => k.status === 'PENDING').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Approval Inbox</h1>
                    <p className="text-gray-500 text-sm mt-1">Review and approve employee KPI submissions.</p>
                </div>
                <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                    <button onClick={() => setActiveTab('kpi')}
                        className={cn('px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                            activeTab === 'kpi' ? 'bg-[#6c63ff] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300')}>
                        <i className="fa-solid fa-list-check"></i>
                        KPI Submissions
                        {completeCount > 0 && activeTab !== 'kpi' && (
                            <span className="w-4 h-4 rounded-full bg-[#ff6584] text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                                {completeCount}
                            </span>
                        )}
                    </button>
                    {(user as any)?.isSuperAdmin && (
                        <button onClick={() => setActiveTab('admin')}
                            className={cn('px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                                activeTab === 'admin' ? 'bg-[#6c63ff] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300')}>
                            <i className="fa-solid fa-user-shield"></i>
                            Admin Requests
                            {adminRequests.length > 0 && (
                                <span className="w-4 h-4 rounded-full bg-[#ff6584] text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                                    {adminRequests.length}
                                </span>
                            )}
                        </button>
                    )}
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

            {/* ── KPI Tab ── */}
            {activeTab === 'kpi' && (
                <>
                    {/* Flow explanation */}
                    <div className="p-4 rounded-xl bg-[#f7b731]/5 border border-[#f7b731]/20 flex gap-3 text-xs text-gray-400">
                        <i className="fa-solid fa-circle-info text-[#f7b731] flex-shrink-0 mt-0.5"></i>
                        <div>
                            <span className="text-[#e8eaf6] font-bold">Approval Flow: </span>
                            Employee completes work → clicks <span className="text-[#f7b731] font-bold">"Mark Complete"</span> on their KPI →
                            appears here as <span className="text-[#06b6d4] font-bold">Awaiting Review</span> →
                            you approve → points awarded instantly.
                            You can also approve <span className="text-[#f7b731] font-bold">Assigned</span> KPIs directly if needed.
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {([
                            { key: 'COMPLETE', label: `Awaiting Review (${completeCount})` },
                            { key: 'PENDING', label: `Assigned / Not Submitted (${pendingCount})` },
                            { key: 'ALL', label: `All Actionable (${kpiList.length})` },
                        ] as const).map(f => (
                            <button key={f.key} onClick={() => setKpiFilter(f.key)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${kpiFilter === f.key
                                    ? 'bg-[#6c63ff] text-white'
                                    : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'
                                    }`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-[#111420] animate-pulse border border-[#1f2540]" />)}
                        </div>
                    ) : kpiList.length === 0 ? (
                        <div className="glass-panel py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-[#43e97b]/10 flex items-center justify-center mx-auto mb-4">
                                <i className="fa-solid fa-circle-check text-[#43e97b] text-2xl"></i>
                            </div>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">
                                {kpiFilter === 'COMPLETE' ? 'No KPIs awaiting review' : 'Nothing here'}
                            </h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                                {kpiFilter === 'COMPLETE'
                                    ? 'Employees need to click "Mark Complete" on their KPIs for them to appear here.'
                                    : 'Try a different filter or assign new KPIs from KPI Management.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {kpiList.map(kpi => (
                                <div key={kpi.id} className={cn(
                                    'glass-panel p-6 flex flex-col justify-between transition-all border-l-4',
                                    kpi.status === 'COMPLETE'
                                        ? 'border-l-[#06b6d4] hover:border-l-[#6c63ff]'
                                        : 'border-l-[#f7b731] hover:border-l-[#6c63ff]'
                                )}>
                                    <div>
                                        {/* Employee + points */}
                                        <div className="flex items-start justify-between mb-4 gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                                    {(kpi.employee?.name ?? 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-[#e8eaf6]">{kpi.employee?.name ?? 'Unknown'}</div>
                                                    <div className="text-[10px] text-gray-500">{kpi.employee?.email ?? ''}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                <span className="text-xs font-syne font-bold text-[#6c63ff] bg-[#6c63ff]/10 px-2.5 py-1 rounded-lg">
                                                    +{kpi.pointValue} pts
                                                </span>
                                                <span className={cn(
                                                    'text-[9px] font-bold px-2 py-0.5 rounded-full',
                                                    kpi.status === 'COMPLETE'
                                                        ? 'bg-[#06b6d4]/10 text-[#06b6d4]'
                                                        : 'bg-[#f7b731]/10 text-[#f7b731]'
                                                )}>
                                                    {kpi.status === 'COMPLETE' ? '● Awaiting Review' : '○ Not Submitted Yet'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* KPI details */}
                                        <h3 className="font-syne font-bold text-[#e8eaf6] mb-2">{kpi.title}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-3 bg-[#0a0c14] p-3 rounded-xl border border-[#1f2540] min-h-[60px]">
                                            {kpi.description || 'No description provided.'}
                                        </p>

                                        <div className="text-[10px] text-gray-600 mt-3">
                                            {kpi.submittedAt
                                                ? `Submitted: ${new Date(kpi.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                                : `Assigned: ${new Date(kpi.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                            }
                                        </div>

                                        {kpi.status === 'PENDING' && (
                                            <div className="mt-2 p-2 rounded-lg bg-[#f7b731]/5 border border-[#f7b731]/20 text-[10px] text-[#f7b731]">
                                                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                                Employee hasn't submitted yet. Approving will auto-complete it.
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1f2540] mt-4">
                                        <button
                                            onClick={() => { setRejectId(kpi.id); setRejectReason(''); }}
                                            disabled={actionLoading === kpi.id}
                                            className="py-2.5 rounded-xl bg-[#ff6584]/10 text-[#ff6584] hover:bg-[#ff6584] hover:text-white font-bold text-xs transition-all border border-[#ff6584]/20 disabled:opacity-40">
                                            <i className="fa-solid fa-xmark mr-1.5"></i>Reject
                                        </button>
                                        <button
                                            onClick={() => handleApproveKpi(kpi)}
                                            disabled={actionLoading === kpi.id}
                                            className="py-2.5 rounded-xl bg-[#43e97b]/10 text-[#43e97b] hover:bg-[#43e97b] hover:text-white font-bold text-xs transition-all border border-[#43e97b]/20 disabled:opacity-40 flex items-center justify-center gap-2">
                                            {actionLoading === kpi.id
                                                ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                : <i className="fa-solid fa-check"></i>
                                            }
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Admin Requests Tab ── */}
            {activeTab === 'admin' && (
                loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(2)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-[#111420] animate-pulse border border-[#1f2540]" />)}
                    </div>
                ) : adminRequests.length === 0 ? (
                    <div className="glass-panel py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#43e97b]/10 flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-user-shield text-[#43e97b] text-2xl"></i>
                        </div>
                        <h3 className="font-syne font-bold text-[#e8eaf6]">No pending admin requests</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {adminRequests.map(req => (
                            <div key={req.id} className="glass-panel p-6 flex flex-col justify-between border-l-4 border-l-[#f7b731]">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f7b731] to-[#ff6584] flex items-center justify-center text-xl font-bold text-white">
                                        {req.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#e8eaf6]">{req.name}</div>
                                        <div className="text-xs text-gray-500">{req.email}</div>
                                        {req.department && <div className="text-[10px] text-[#6c63ff] mt-0.5">{req.department}</div>}
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-600 mb-4">
                                    Requested: {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1f2540]">
                                    <button onClick={() => handleAdminDecision(req.id, false, req.name)} disabled={actionLoading === req.id}
                                        className="py-2.5 rounded-xl bg-[#ff6584]/10 text-[#ff6584] hover:bg-[#ff6584] hover:text-white font-bold text-xs transition-all border border-[#ff6584]/20 disabled:opacity-40">
                                        Reject
                                    </button>
                                    <button onClick={() => handleAdminDecision(req.id, true, req.name)} disabled={actionLoading === req.id}
                                        className="py-2.5 rounded-xl bg-[#43e97b]/10 text-[#43e97b] hover:bg-[#43e97b] hover:text-white font-bold text-xs transition-all border border-[#43e97b]/20 disabled:opacity-40 flex items-center justify-center gap-2">
                                        {actionLoading === req.id ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : null}
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── Reject Modal ── */}
            <Modal isOpen={!!rejectId} onClose={() => { setRejectId(null); setRejectReason(''); }} title="Reject KPI">
                <form onSubmit={handleRejectKpi} className="space-y-4 p-2">
                    <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/20 text-xs text-gray-400">
                        <i className="fa-solid fa-circle-exclamation text-[#ff6584] mr-2"></i>
                        No points will be awarded. Employee will be notified.
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Reason <span className="text-[#ff6584]">*</span>
                        </label>
                        <textarea required value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            className="w-full h-28 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#ff6584] outline-none resize-none"
                            placeholder="e.g. Incomplete proof, already submitted before…" />
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