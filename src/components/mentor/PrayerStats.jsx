import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Trophy, Calendar, Users, Filter, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const PrayerStats = () => {
    const { classes, students, prayerRecords } = useData();
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [timeRange, setTimeRange] = useState('week'); // 'week' or 'month'

    // Filter students by class
    const classStudents = useMemo(() =>
        students.filter(s => s.classId === selectedClassId),
        [students, selectedClassId]
    );

    // Calculate Stats
    const stats = useMemo(() => {
        if (!selectedClassId) return null;

        const studentIds = classStudents.map(s => s.id);
        const filteredRecords = prayerRecords.filter(r => studentIds.includes(r.studentId));

        // 1. Top Performers (Total Prayers Offered)
        const leaderboard = classStudents.map(student => {
            const studentRecords = filteredRecords.filter(r => r.studentId === student.id);
            const totalPrayers = studentRecords.reduce((sum, r) => {
                return sum + Object.values(r.prayers || {}).filter(Boolean).length;
            }, 0);
            return { ...student, totalPrayers };
        }).sort((a, b) => b.totalPrayers - a.totalPrayers);

        // 2. Daily Class Average (Last 7 Days)
        const last7Days = eachDayOfInterval({
            start: subDays(new Date(), 6),
            end: new Date()
        });

        const dailyTrends = last7Days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayRecords = filteredRecords.filter(r => r.date === dateStr);
            const totalPossible = classStudents.length * 5;
            const totalOffered = dayRecords.reduce((sum, r) => sum + Object.values(r.prayers || {}).filter(Boolean).length, 0);

            return {
                date: format(day, 'MMM d'),
                percentage: totalPossible > 0 ? Math.round((totalOffered / totalPossible) * 100) : 0
            };
        });

        return { leaderboard, dailyTrends };
    }, [selectedClassId, classStudents, prayerRecords]);

    if (classes.length === 0) return <div className="p-8 text-center text-gray-500">No classes found.</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prayer Statistics</h1>
                    <p className="text-gray-500">Monitor class performance and spiritual habits</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white px-3 py-2 border border-gray-200 rounded-lg flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-medium text-gray-700"
                        >
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <Card className="lg:col-span-2 p-6">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-indigo-600" />
                        Class Performance (Last 7 Days)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.dailyTrends || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    unit="%"
                                />
                                <Tooltip
                                    cursor={{ fill: '#EEF2FF' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar
                                    dataKey="percentage"
                                    fill="#6366F1"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Top Performers */}
                <Card className="p-0 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                        <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-600" />
                            Top Performers
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {stats?.leaderboard.slice(0, 10).map((student, index) => (
                            <div key={student.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                                            index === 1 ? "bg-gray-100 text-gray-700" :
                                                index === 2 ? "bg-orange-100 text-orange-700" :
                                                    "bg-white border border-gray-200 text-gray-500"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                        <p className="text-xs text-gray-500">{student.registerNo}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-indigo-600">{student.totalPrayers}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">Prayers</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Detailed Student List */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" />
                        Student Details
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">Student</th>
                                <th className="p-4 font-medium text-center">Total Prayers</th>
                                <th className="p-4 font-medium text-center">Avg. Daily</th>
                                <th className="p-4 font-medium text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {stats?.leaderboard.map((student) => {
                                // Calculate detailed stats per student
                                // Just simple mocking for "Avg Daily" based on total prayers / days with records or total tracked days
                                // For now, let's keep it simple.
                                const avg = (student.totalPrayers / 35).toFixed(1); // Assuming 7 days * 5 prayers = 35 max for a week view context, but this is total history. 
                                // Let's just show total for now.
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 group">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{student.name}</p>
                                                <p className="text-xs text-gray-500">{student.registerNo}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-medium text-indigo-600">
                                            {student.totalPrayers}
                                        </td>
                                        <td className="p-4 text-center text-gray-600">
                                            -
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={clsx(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                student.totalPrayers > 20 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                            )}>
                                                {student.totalPrayers > 20 ? "Consistent" : "Needs Imp."}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default PrayerStats;
