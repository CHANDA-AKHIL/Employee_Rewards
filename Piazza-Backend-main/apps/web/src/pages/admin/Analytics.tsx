import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card } from '../../components/ui/Card';

export const AdminAnalytics: React.FC = () => {
    const [kpiTrends, setKpiTrends] = useState<any[]>([]);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);
    const [redemptions, setRedemptions] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, these would hit /analytics endpoints
        // Mocking for UI demonstration based on standard structures
        setTimeout(() => {
            setKpiTrends([
                { week: 'W1', points: 1200 },
                { week: 'W2', points: 2100 },
                { week: 'W3', points: 1800 },
                { week: 'W4', points: 3200 },
                { week: 'W5', points: 2900 },
                { week: 'W6', points: 4100 },
                { week: 'W7', points: 3800 },
                { week: 'W8', points: 5000 },
            ]);

            setTopPerformers([
                { name: 'Sarah J.', points: 1450 },
                { name: 'Mike T.', points: 1200 },
                { name: 'Elena R.', points: 1100 },
                { name: 'David B.', points: 950 },
                { name: 'Lisa M.', points: 800 },
            ]);

            setRedemptions([
                { name: 'Gift Cards', value: 45 },
                { name: 'Swag', value: 30 },
                { name: 'Experiences', value: 15 },
                { name: 'Charity', value: 10 },
            ]);

            setDepartments([
                { name: 'Engineering', points: 15400 },
                { name: 'Sales', points: 12200 },
                { name: 'Support', points: 8900 },
                { name: 'Marketing', points: 6400 },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b'];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0a0a0f] border border-white/10 p-3 rounded-lg shadow-xl">
                    <p className="text-gray-300 font-medium mb-1">{label}</p>
                    <p className="text-[#06b6d4] font-bold">
                        {payload[0].value} pts
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 w-48 rounded mb-6"></div>
            <div className="grid grid-cols-2 gap-6">
                <div className="h-64 bg-white/5 rounded-2xl"></div>
                <div className="h-64 bg-white/5 rounded-2xl"></div>
            </div>
        </div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white mb-2">Analytics Overview</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* KPI Trends */}
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-6">KPI Points Trend (8 Weeks)</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={kpiTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="week" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="points" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Top Performers */}
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-6">Top 5 Performers</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topPerformers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fill: '#f1f5f9', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="points" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Redemption Stats */}
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-6">Reward Redemptions</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={redemptions}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {redemptions.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px', color: '#f1f5f9' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Department Stats */}
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-6">Points by Department</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departments} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="points" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};
