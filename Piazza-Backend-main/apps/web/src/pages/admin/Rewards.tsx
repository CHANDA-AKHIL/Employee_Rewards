import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { cn } from '../../utils/cn';

export const AdminRewards: React.FC = () => {
    const [rewards, setRewards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        fetchRewards();
    }, []);

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const res = await api.get('/rewards');
            setRewards(res.data || []);
        } catch (err) {
            console.error('Failed to fetch rewards:', err);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            await api.post('/rewards', {
                name: data.name,
                description: data.description,
                pointCost: parseInt(data.pointCost, 10),
                stock: parseInt(data.stock, 10),
                category: data.category,
                imageUrl: data.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=111420&color=6c63ff&size=512`
            });
            setIsModalOpen(false);
            reset();
            fetchRewards();
        } catch (err) {
            console.error('Failed to create reward:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reward?')) return;
        try {
            await api.delete(`/rewards/${id}`);
            fetchRewards();
        } catch (err) {
            console.error('Failed to delete reward:', err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Reward Catalog</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage the available rewards and stock levels.</p>
                </div>
                <Button variant="primary" className="bg-[#6c63ff] hover:bg-[#5b54d6] shadow-lg shadow-[#6c63ff]/20" onClick={() => setIsModalOpen(true)}>
                    <i className="fa-solid fa-gift mr-2"></i> Add New Reward
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-80 rounded-2xl bg-[#111420] animate-pulse border border-[#1f2540]"></div>
                    ))}
                </div>
            ) : rewards.length === 0 ? (
                <div className="glass-panel py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#171b2e] flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-box-open text-gray-600 text-2xl"></i>
                    </div>
                    <h3 className="text-[#e8eaf6] font-bold">No rewards found</h3>
                    <p className="text-gray-500 text-sm mt-1">Start by adding your first reward item.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {rewards.map((reward) => (
                        <div key={reward.id} className="group relative glass-panel overflow-hidden border-[#1f2540] hover:border-[#6c63ff]/30 transition-all">
                            {/* Image Header */}
                            <div className="h-44 relative overflow-hidden bg-[#0d0f1a]">
                                <img
                                    src={reward.imageUrl}
                                    alt={reward.name}
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#111420] via-transparent to-transparent"></div>

                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button onClick={() => handleDelete(reward.id)} className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-md text-[#ff6584] hover:bg-[#ff6584] hover:text-white transition-all flex items-center justify-center border border-white/10">
                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                </div>

                                <div className="absolute bottom-4 left-4">
                                    <span className="px-2 py-0.5 rounded-md bg-[#6c63ff]/20 text-[#6c63ff] text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border border-[#6c63ff]/30">
                                        {reward.category}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4">
                                <div>
                                    <h3 className="text-[#e8eaf6] font-bold text-base group-hover:text-[#6c63ff] transition-colors">{reward.name}</h3>
                                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 min-h-[32px]">{reward.description}</p>
                                </div>

                                <div className="flex items-end justify-between pt-2 border-t border-[#1f2540]">
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Price</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-syne font-extrabold text-[#6c63ff]">{reward.pointCost}</span>
                                            <span className="text-[10px] text-gray-600 font-bold uppercase">Points</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Stock</div>
                                        <div className={cn(
                                            "text-xs font-bold",
                                            reward.stock <= 5 ? "text-[#f7b731]" : "text-[#43e97b]"
                                        )}>
                                            {reward.stock} Left
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Configure New Reward">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Reward Name</label>
                        <input type="text" {...register('name', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="e.g. Amazon Gift Card" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Item Description</label>
                        <textarea {...register('description')} className="w-full h-24 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all resize-none" placeholder="Explain what the employee gets..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Point Cost</label>
                            <input type="number" {...register('pointCost', { required: true, min: 1 })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="500" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Initial Stock</label>
                            <input type="number" {...register('stock', { required: true, min: 0 })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="10" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Category</label>
                            <input type="text" {...register('category', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="Vouchers, Gadgets, etc." />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Image URL (Optional)</label>
                            <input type="text" {...register('imageUrl')} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="Leave empty for auto-icon" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
                        <Button variant="primary" type="submit" className="bg-[#6c63ff] hover:bg-[#5b54d6] px-8 py-2.5 shadow-lg shadow-[#6c63ff]/20">
                            Create Reward Item
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

