import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { cn } from '../../utils/cn';

export const AdminKpis: React.FC = () => {
    const [kpis, setKpis] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [kRes, eRes] = await Promise.all([
                api.get('/kpis'),
                api.get('/employees')
            ]);
            setKpis(kRes.data || []);
            setEmployees(eRes.data || []);
        } catch (err) {
            console.error('Failed to fetch KPI data:', err);
        } finally {
            setLoading(false);
        }
    };

    const onSubmitKpi = async (data: any) => {
        try {
            await api.post('/kpis', {
                title: data.title,
                description: data.description,
                pointValue: parseInt(data.pointValue, 10),
                assignedTo: data.assignedTo
            });
            setIsCreateModalOpen(false);
            reset();
            fetchData();
        } catch (err) {
            console.error('Failed to create KPI:', err);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            await api.post(`/kpis/${id}/${action}`);
            fetchData();
        } catch (err) {
            console.error(`Failed to ${action} KPI:`, err);
        }
    };

    const filteredKpis = kpis.filter(k => {
        const matchesSearch = k.title.toLowerCase().includes(search.toLowerCase()) ||
            (k.assignee?.name || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'ALL' || k.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">KPI Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Review performance entries and approve point awards.</p>
                </div>
                <Button variant="primary" className="bg-[#6c63ff] hover:bg-[#5b54d6]" onClick={() => setIsCreateModalOpen(true)}>
                    <i className="fa-solid fa-plus-circle mr-2"></i> Create New KPI Entry
                </Button>
            </div>

            {/* Filters and Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                    {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                filter === f
                                    ? "bg-[#6c63ff] text-white shadow-lg shadow-[#6c63ff]/20"
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                            {f !== 'ALL' && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[9px]",
                                    filter === f ? "bg-white/20 text-white" : "bg-[#1f2540] text-gray-500"
                                )}>
                                    {kpis.filter(k => k.status === f).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full lg:w-80 group">
                    <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6c63ff] transition-colors"></i>
                    <input
                        type="text"
                        placeholder="Search KPIs or employees..."
                        className="w-full bg-[#111420] border border-[#1f2540] rounded-xl py-2 pl-10 pr-4 text-sm text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#171b2e] border-b border-[#1f2540]">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">KPI Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Assigned Employee</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Submitted Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Point Value</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2540]">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Retrieving records...</td></tr>
                            ) : filteredKpis.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No KPIs matching your criteria.</td></tr>
                            ) : (
                                filteredKpis.map((kpi) => (
                                    <tr key={kpi.id} className="hover:bg-[#171b2e]/50 transition-colors group">
                                        <td className="px-6 py-4 w-1/4">
                                            <div className="font-bold text-[#e8eaf6] group-hover:text-[#6c63ff] transition-colors">{kpi.title}</div>
                                            <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{kpi.description || 'No description provided'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-[#1f2540] flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {(kpi.assignee?.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <span className="text-xs text-gray-300">{kpi.assignee?.name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                            {new Date(kpi.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-syne font-bold text-[#6c63ff]">+{kpi.pointsValue}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase",
                                                kpi.status === 'APPROVED' ? "bg-[#43e97b]/10 text-[#43e97b]" :
                                                    kpi.status === 'REJECTED' ? "bg-[#ff6584]/10 text-[#ff6584]" :
                                                        kpi.status === 'PENDING' ? "bg-[#f7b731]/10 text-[#f7b731]" : "bg-gray-800 text-gray-400"
                                            )}>
                                                {kpi.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {kpi.status === 'PENDING' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(kpi.id, 'reject')}
                                                        className="w-8 h-8 rounded-lg bg-[#ff6584]/10 text-[#ff6584] hover:bg-[#ff6584] hover:text-white transition-all flex items-center justify-center"
                                                        title="Reject"
                                                    >
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(kpi.id, 'approve')}
                                                        className="w-8 h-8 rounded-lg bg-[#43e97b]/10 text-[#43e97b] hover:bg-[#43e97b] hover:text-white transition-all flex items-center justify-center"
                                                        title="Approve"
                                                    >
                                                        <i className="fa-solid fa-check"></i>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Processed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Performance Entry">
                <form onSubmit={handleSubmit(onSubmitKpi)} className="space-y-4 p-2">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Performance Title</label>
                        <input type="text" {...register('title', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="Project completion, Sale closed, etc." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Description / Proof</label>
                        <textarea {...register('description')} className="w-full h-24 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all resize-none" placeholder="Provide details about the achievement..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Award Points</label>
                            <input type="number" {...register('pointValue', { required: true, min: 1 })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="100" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Assign to Employee</label>
                            <select {...register('assignedTo', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all appearance-none cursor-pointer">
                                <option value="">Select recipient...</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} type="button">Cancel</Button>
                        <Button variant="primary" type="submit" className="bg-[#6c63ff] hover:bg-[#5b54d6] px-8 py-2.5 shadow-lg shadow-[#6c63ff]/20">
                            Create & Submit Entry
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
