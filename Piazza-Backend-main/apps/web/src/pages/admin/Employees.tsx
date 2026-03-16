import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { cn } from '../../utils/cn';

export const AdminEmployees: React.FC = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get('/employees');
            setEmployees(res.data || []);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoading(false);
        }
    };

    const onSubmitAdd = async (data: any) => {
        try {
            await api.post('/auth/register', data);
            setIsAddOpen(false);
            reset();
            fetchEmployees();
        } catch (err) {
            console.error('Failed to add employee:', err);
        }
    };

    const toggleBlock = async (id: string) => {
        try {
            await api.patch(`/employees/${id}/block`);
            fetchEmployees();
        } catch (err) {
            console.error('Failed to toggle block:', err);
        }
    };

    const filtered = employees.filter(e => {
        const matchesSearch = e.name?.toLowerCase().includes(search.toLowerCase()) ||
            e.email?.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'ALL' ||
            (filter === 'INACTIVE' ? e.isDeleted : !e.isDeleted);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Employees</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your team members and their point balances.</p>
                </div>
                <Button variant="primary" className="bg-[#6c63ff] hover:bg-[#5b54d6]" onClick={() => setIsAddOpen(true)}>
                    <i className="fa-solid fa-user-plus mr-2"></i> Add New Employee
                </Button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                    {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                filter === f ? "bg-[#6c63ff] text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                <div className="relative w-full lg:w-80 group">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6c63ff] transition-colors"></i>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
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
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Department</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Rank</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Points</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2540]">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading employees...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No employees found.</td></tr>
                            ) : (
                                filtered.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-[#171b2e]/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1f2540] to-[#0a0c14] border border-[#1f2540] flex items-center justify-center text-sm font-bold text-[#e8eaf6]">
                                                    {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-[#e8eaf6] group-hover:text-[#6c63ff] transition-colors">{emp.name}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase mt-0.5">{emp.email} <span className="text-[#6c63ff] ml-2">{emp.role === 'ADMIN' && '(Admin)'}</span></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs text-gray-400 font-medium">{emp.department || 'General'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <i className="fa-solid fa-ranking-star text-[#f7b731] text-[10px]"></i>
                                                <span className="text-xs text-[#f7b731] font-bold">Top {Math.floor(Math.random() * 10) + 1}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-syne font-bold text-[#43e97b]">{emp.pointsBalance?.toLocaleString() || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                                emp.isDeleted ? "bg-[#ff6584]/10 text-[#ff6584]" : "bg-[#43e97b]/10 text-[#43e97b]"
                                            )}>
                                                {emp.isDeleted ? 'Inactive' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="relative inline-block group/menu">
                                                <button className="p-2 text-gray-600 hover:text-[#e8eaf6] rounded-lg hover:bg-[#1f2540] transition-all">
                                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                                </button>
                                                <div className="absolute right-0 top-full mt-2 w-40 bg-[#111420] border border-[#1f2540] rounded-xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all -translate-y-2 group-hover/menu:translate-y-0 z-50 overflow-hidden">
                                                    <button onClick={() => setSelectedEmployee(emp)} className="w-full px-4 py-2 text-left text-xs text-gray-400 hover:bg-[#1f2540] hover:text-[#e8eaf6] transition-colors flex items-center gap-2">
                                                        <i className="fa-solid fa-eye"></i> View Profile
                                                    </button>
                                                    <button onClick={() => toggleBlock(emp.id)} className={cn(
                                                        "w-full px-4 py-2 text-left text-xs transition-colors flex items-center gap-2 hover:bg-[#1f2540]",
                                                        emp.isDeleted ? "text-[#43e97b]" : "text-[#ff6584]"
                                                    )}>
                                                        <i className={cn("fa-solid", emp.isDeleted ? "fa-circle-check" : "fa-ban")}></i>
                                                        {emp.isDeleted ? 'Activate' : 'Block'}
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Employee">
                <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4 p-2">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Full Name</label>
                                <input type="text" {...register('name', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Email Address</label>
                                <input type="email" {...register('email', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="john@company.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Initial Password</label>
                            <input type="password" {...register('password', { required: true })} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" placeholder="••••••••" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Department</label>
                                <select {...register('department')} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all appearance-none">
                                    <option value="Engineering">Engineering</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Human Resources">Human Resources</option>
                                    <option value="Finance">Finance</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Role Type</label>
                                <select {...register('role')} className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all appearance-none">
                                    <option value="EMPLOYEE">Standard Employee</option>
                                    <option value="ADMIN">System Admin</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)} type="button">Cancel</Button>
                        <Button variant="primary" type="submit" className="bg-[#6c63ff] hover:bg-[#5b54d6] px-8 py-2.5">
                            Create Account
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} title="Employee Profile">
                {selectedEmployee && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-6 p-6 bg-[#171b2e] rounded-2xl border border-[#1f2540]">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-[#6c63ff]/10">
                                {selectedEmployee.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[#e8eaf6]">{selectedEmployee.name}</h3>
                                <p className="text-gray-500 font-medium">{selectedEmployee.email}</p>
                                <div className="mt-3 flex gap-2">
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20">{selectedEmployee.role}</span>
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-[#43e97b]/10 text-[#43e97b] border border-[#43e97b]/20">{selectedEmployee.department || 'General'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl bg-[#0a0c14] border border-[#1f2540] flex flex-col items-center">
                                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Total Points</div>
                                <div className="text-3xl font-syne font-extrabold text-[#43e97b]">{selectedEmployee.pointsBalance?.toLocaleString() || 0}</div>
                            </div>
                            <div className="p-5 rounded-2xl bg-[#0a0c14] border border-[#1f2540] flex flex-col items-center">
                                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Employee Level</div>
                                <div className="text-3xl font-syne font-extrabold text-[#f7b731]">Lv. {selectedEmployee.level || 1}</div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button variant="ghost" className="text-gray-500" onClick={() => setSelectedEmployee(null)}>Close Profile</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
