import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Trophy, Calendar, Users, Filter, BarChart2, Trash2, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import SpecialPrayerManager from './SpecialPrayerManager';
import MentorPrayerStats from './MentorPrayerStats';

const PrayerStats = () => {
    const { classes, students, prayerRecords, currentUser, updateClass, deletePrayerRecordsForStudents, classFeatureFlags, updateClassFeatureFlags, studentFeatureFlags } = useData();

    // Filter classes if mentor
    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    // Filter for Stats View (only enabled classes)
    const isPrayerGloballyEnabled = studentFeatureFlags?.prayer !== false;
    const enabledClasses = availableClasses.filter(c => {
        const classFlag = classFeatureFlags?.find(f => f.classId === c.id);
        const isLocallyEnabled = classFlag ? classFlag.prayer !== false : true;
        return isPrayerGloballyEnabled && isLocallyEnabled;
    });

    const [selectedClassId, setSelectedClassId] = useState(enabledClasses[0]?.id || '');
    const [timeRange, setTimeRange] = useState('week'); // 'week' or 'month'
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'special' | 'settings'

    // Add state for delete confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Effect to ensure valid selection when switching tabs or changing settings
    useEffect(() => {
        if (activeTab === 'daily') {
            // If current selection is not in enabled list, switch to first enabled
            if (enabledClasses.length > 0 && !enabledClasses.find(c => c.id === selectedClassId)) {
                setSelectedClassId(enabledClasses[0].id);
            }
        }
    }, [activeTab, enabledClasses, selectedClassId]);

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

    const handleToggleFeature = async (classId, currentStatus) => {
        const newStatus = !currentStatus;
        await updateClassFeatureFlags(classId, { prayer: newStatus });
    };

    const handleClearData = async () => {
        setIsDeleting(true);
        try {
            const studentIds = classStudents.map(s => s.id);
            await deletePrayerRecordsForStudents(studentIds);
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Failed to delete records:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (availableClasses.length === 0) return <div className="p-8 text-center text-gray-500">No classes assigned to you.</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prayer Statistics</h1>
                    <p className="text-gray-500">Monitor class performance and spiritual habits</p>
                </div>

                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                            activeTab === 'daily' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <BarChart2 className="w-4 h-4" /> Daily
                    </button>
                    <button
                        onClick={() => setActiveTab('special')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                            activeTab === 'special' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <BookOpen className="w-4 h-4" /> Special
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                            activeTab === 'settings' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Users className="w-4 h-4" /> Settings
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleClearData}
                title="Clear Prayer Data"
                message={`Are you sure you want to delete all prayer records for the ${classStudents.length} students in this class? This action cannot be undone.`}
                confirmText={isDeleting ? "Deleting..." : "Delete All Data"}
                isDanger={true}
            />

            {activeTab === 'daily' && (
                <>
                    {enabledClasses.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Prayer Chart is disabled</h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">None of your assigned classes have the Prayer Chart feature enabled.</p>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className="text-indigo-600 font-medium hover:text-indigo-700 underline"
                            >
                                Go to Settings to enable it
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap justify-end gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear Class Data
                                </button>
                                <div className="bg-white px-3 py-2 border border-gray-200 rounded-lg flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm font-medium text-gray-700"
                                    >
                                        {enabledClasses.map(c => (
                                            <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                                        ))}
                                    </select>
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
                                                    <p className="text--[10px] text-gray-400 uppercase">Prayers</p>
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
                                                const avg = (student.totalPrayers / 35).toFixed(1);
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
                        </>
                    )}
                </>
            )}

            {activeTab === 'special' && (
                <MentorPrayerStats />
            )}

            {activeTab === 'settings' && (

                <div className="max-w-4xl mx-auto space-y-8">
                    {/* General Configuration */}
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Prayer Chart Configuration
                        </h3>
                        <p className="text-sm text-gray-500 mb-8 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            Enable or disable the Prayer Chart feature for your classes. When enabled, students in that class will see the Prayer Chart option in their dashboard and can log their daily prayers.
                        </p>

                        <div className="space-y-4">
                            {availableClasses.map(cls => {
                                const classFlag = classFeatureFlags?.find(f => f.classId === cls.id);
                                const isLocallyEnabled = classFlag ? classFlag.prayer !== false : true;
                                const isGloballyEnabled = studentFeatureFlags?.prayer !== false;
                                const safeEnabled = isLocallyEnabled && isGloballyEnabled;

                                return (
                                    <div key={cls.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${!isGloballyEnabled ? 'bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <div>
                                            <h4 className={`font-bold ${!isGloballyEnabled ? 'text-gray-500' : 'text-gray-800'}`}>Class {cls.name} - {cls.division}</h4>
                                            <p className="text-xs text-gray-500">
                                                {!isGloballyEnabled
                                                    ? 'Prayer Chart is disabled globally by Administrator'
                                                    : (safeEnabled ? 'Students can access Prayer Chart' : 'Prayer Chart hidden from students')}
                                            </p>
                                        </div>
                                        <button
                                            disabled={!isGloballyEnabled}
                                            onClick={() => handleToggleFeature(cls.id, isLocallyEnabled)}
                                            className={clsx(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                                safeEnabled ? "bg-indigo-600" : "bg-gray-200",
                                                !isGloballyEnabled && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <span
                                                className={clsx(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    safeEnabled ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Special Prayers Manager */}
                    <SpecialPrayerManager />
                </div>
            )}

        </div >
    );
};

export default PrayerStats;
