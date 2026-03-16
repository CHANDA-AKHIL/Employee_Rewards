import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';

export const AdminBadges: React.FC = () => {
    const [badges, setBadges] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        fetchBadges();
    }, []);

    const fetchBadges = async () => {
        try {
            setLoading(true);
            const res = await api.get('/gamification/badges');
            setBadges(res.data || []);
        } catch (err) {
            console.error('Failed to fetch badges:', err);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('description', data.description);
            formData.append('unlockCondition', data.unlockCondition);
            if (data.image?.[0]) {
                formData.append('image', data.image[0]);
            }

            await api.post('/gamification/badges', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setIsCreateModalOpen(false);
            reset();
            fetchBadges();
        } catch (err) {
            console.error('Failed to create badge:', err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Badge Achievements</h1>
                    <p className="text-gray-500 text-sm mt-1">Configure and manage visual milestones for employees.</p>
                </div>
                <Button variant="primary" className="bg-[#f59e0b] hover:bg-[#d97706] shadow-lg shadow-[#f59e0b]/20" onClick={() => setIsCreateModalOpen(true)}>
                    <i className="fa-solid fa-award mr-2"></i> Create New Badge
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-56 rounded-2xl bg-[#111420] animate-pulse border border-[#1f2540]"></div>
                    ))}
                </div>
            ) : badges.length === 0 ? (
                <div className="glass-panel py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#171b2e] flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-shield-halved text-gray-600 text-2xl"></i>
                    </div>
                    <h3 className="text-[#e8eaf6] font-bold">No badges available</h3>
                    <p className="text-gray-500 text-sm mt-1">Create achievement markers for your high-flyers.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {badges.map(b => (
                        <div key={b.id} className="group glass-panel p-6 border-[#1f2540] hover:border-[#f59e0b]/30 transition-all flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-full bg-[#0d0f1a] border border-[#1f2540] p-4 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                                    <img src={b.imageUrl || 'https://via.placeholder.com/150'} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                </div>
                                <div className="absolute inset-0 bg-[#f59e0b] blur-[30px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                            </div>

                            <h3 className="font-bold text-[#e8eaf6] text-sm mb-1 group-hover:text-[#f59e0b] transition-colors">{b.name}</h3>
                            <p className="text-[10px] text-gray-500 line-clamp-2 min-h-[30px] mb-4">{b.description}</p>

                            <div className="mt-auto w-full">
                                <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1.5">Requirement</div>
                                <div className="bg-[#171b2e] border border-[#1f2540] rounded-lg px-2 py-1 text-[9px] text-[#f59e0b] font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                                    {b.unlockCondition}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Design Achievement Badge">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Badge Name</label>
                        <input type="text" {...register('name', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#f59e0b] outline-none transition-all" placeholder="e.g. Sales Supernova" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Achievement Description</label>
                        <textarea {...register('description')} className="w-full h-24 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#f59e0b] outline-none transition-all resize-none" placeholder="Describe how this badge is earned..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Unlock Rule Key</label>
                        <input type="text" {...register('unlockCondition', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#f59e0b] outline-none transition-all" placeholder="e.g. COMPLETE_10_KPIS" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Badge Icon</label>
                        <div className="relative group cursor-pointer group">
                            <input
                                type="file"
                                accept="image/*"
                                {...register('image')}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full bg-[#111420] border border-[#1f2540] border-dashed rounded-xl px-4 py-6 text-center group-hover:border-[#f59e0b]/50 transition-all">
                                <i className="fa-solid fa-cloud-arrow-up text-gray-600 text-xl mb-2"></i>
                                <div className="text-xs text-gray-500">Click or drag to upload transparent PNG</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" className="bg-[#f59e0b] hover:bg-[#d97706] px-8 py-2.5 shadow-lg shadow-[#f59e0b]/20">
                            Forging Badge
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

