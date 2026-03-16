import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

export const AdminApprovals: React.FC = () => {
    const [approvals, setApprovals] = useState<any[]>([]);
    const [adminRequests, setAdminRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'kpi' | 'admin'>('kpi');
    const [loading, setLoading] = useState(true);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (activeTab === 'kpi') {
            fetchApprovals();
        } else {
            fetchAdminRequests();
        }
    }, [activeTab]);

    const fetchApprovals = async () => {
        try {
            setLoading(true);
            const res = await api.get('/kpis?status=COMPLETE');
            setApprovals(res.data || []);
        } catch (err) {
            console.error('Failed to fetch KPI approvals:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin-approval/pending');
            setAdminRequests(res.data || []);
        } catch (err) {
            console.error('Failed to fetch admin requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAdmin = async (id: string, approve: boolean) => {
        try {
            await api.post(`/admin-approval/${id}/approve`, { approve });
            fetchAdminRequests();
        } catch (err) {
            console.error('Failed to process admin request:', err);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await api.post(`/kpis/${id}/approve`);
            fetchApprovals();
        } catch (err) {
            console.error('Failed to approve KPI:', err);
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectId) return;
        try {
            await api.post(`/kpis/${rejectId}/reject`, { reason: rejectReason });
            setRejectId(null);
            setRejectReason('');
            fetchApprovals();
        } catch (err) {
            console.error('Failed to reject KPI:', err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Approval Inbox</h1>
                    <p className="text-gray-500 text-sm mt-1">Review pending requests and system access permissions.</p>
                </div>

                <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                    <button
                        onClick={() => setActiveTab('kpi')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                            activeTab === 'kpi' ? "bg-[#6c63ff] text-white shadow-lg shadow-[#6c63ff]/20" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <i className="fa-solid fa-list-check"></i>
                        KPI Submissions
                    </button>
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={() => setActiveTab('admin')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative",
                                activeTab === 'admin' ? "bg-[#6c63ff] text-white shadow-lg shadow-[#6c63ff]/20" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <i className="fa-solid fa-user-shield"></i>
                            Admin Requests
                            {adminRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff6584] text-[8px] flex items-center justify-center border-2 border-[#0a0c14] animate-pulse">
                                    {adminRequests.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-2xl bg-[#111420] animate-pulse border border-[#1f2540]"></div>
                    ))}
                </div>
            ) : activeTab === 'admin' ? (
                adminRequests.length === 0 ? (
                    <div className="glass-panel py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#171b2e] flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-circle-check text-[#43e97b] text-2xl"></i>
                        </div>
                        <h3 className="text-[#e8eaf6] font-bold">Inbox Clean!</h3>
                        <p className="text-gray-500 text-sm mt-1">No pending administrator registration requests.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {adminRequests.map((req) => (
                            <div key={req.id} className="glass-panel p-6 border-[#1f2540] hover:border-[#6c63ff]/30 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#43e97b] flex items-center justify-center text-lg font-syne font-bold text-white shadow-lg shadow-[#6c63ff]/20">
                                            {req.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#e8eaf6] text-base">{req.name}</div>
                                            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{req.email}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Department</span>
                                            <span className="text-gray-300 font-bold">{req.department || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Requested</span>
                                            <span className="text-gray-300">{new Date(req.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1f2540]">
                                    <Button variant="ghost" className="border-[#1f2540] hover:bg-[#ff6584]/10 hover:text-[#ff6584] text-xs py-2" onClick={() => handleApproveAdmin(req.id, false)}>
                                        Reject
                                    </Button>
                                    <Button variant="primary" className="bg-[#43e97b] hover:bg-[#3cd16e] text-xs py-2 shadow-lg shadow-[#43e97b]/10" onClick={() => handleApproveAdmin(req.id, true)}>
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                approvals.length === 0 ? (
                    <div className="glass-panel py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#171b2e] flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-cloud-sun text-gray-600 text-2xl"></i>
                        </div>
                        <h3 className="text-[#e8eaf6] font-bold">Nothing to review</h3>
                        <p className="text-gray-500 text-sm mt-1">Great job! All performance entries have been processed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {approvals.map((kpi) => (
                            <div key={kpi.id} className="glass-panel p-6 border-[#1f2540] hover:border-[#6c63ff]/30 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#171b2e] flex items-center justify-center text-xs font-bold text-[#6c63ff] border border-[#1f2540]">
                                                {kpi.assignee?.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-[#e8eaf6]">{kpi.assignee?.name}</div>
                                                <div className="text-[10px] text-gray-500 font-medium">Employee</div>
                                            </div>
                                        </div>
                                        <div className="bg-[#6c63ff]/10 text-[#6c63ff] px-2 py-0.5 rounded text-[10px] font-syne font-bold">
                                            +{kpi.pointsValue} Pts
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-[#e8eaf6] mb-2">{kpi.title}</h3>
                                    <p className="text-[11px] text-gray-500 line-clamp-3 mb-6 bg-[#0d0f1a] p-3 rounded-xl border border-[#1f2540]">
                                        {kpi.description || 'No description provided.'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1f2540]">
                                    <Button variant="ghost" className="border-[#1f2540] hover:bg-[#ff6584]/10 hover:text-[#ff6584] text-xs py-2" onClick={() => setRejectId(kpi.id)}>
                                        Reject
                                    </Button>
                                    <Button variant="primary" className="bg-[#6c63ff] hover:bg-[#5b54d6] text-xs py-2 shadow-lg shadow-[#6c63ff]/20" onClick={() => handleApprove(kpi.id)}>
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Reject Modal */}
            <Modal isOpen={!!rejectId} onClose={() => setRejectId(null)} title="Revise Performance Entry">
                <form onSubmit={handleReject} className="space-y-5 p-2">
                    <div>
                        <p className="text-xs text-gray-400 mb-4 bg-[#ff6584]/10 p-3 rounded-lg border border-[#ff6584]/20">
                            <i className="fa-solid fa-circle-exclamation mr-2"></i>
                            Rejecting this entry will not award points. Please state why.
                        </p>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Reason for Rejection</label>
                        <textarea
                            required
                            placeholder="e.g. Incomplete proof, duplicate entry, etc."
                            className="w-full h-32 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#ff6584] outline-none transition-all resize-none"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="ghost" type="button" onClick={() => setRejectId(null)}>Cancel</Button>
                        <Button variant="primary" type="submit" className="bg-[#ff6584] hover:bg-[#e44d6d] px-8 py-2.5 shadow-lg shadow-[#ff6584]/20">
                            Confirm Rejection
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

