import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { BookOpen, Search, Trophy, Users, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';

const AdminMentorQuranTracker = () => {
    const { mentors = [], students = [], quranRecitations = [], requireFeature } = useData();
    const [timeframe, setTimeframe] = useState('current-month');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (requireFeature) {
            return requireFeature('quran');
        }
    }, [requireFeature]);

    const rankings = useMemo(() => {
        let currentMonthNum = new Date().getMonth() + 1;
        let currentYear = new Date().getFullYear();

        const data = mentors.map(mentor => {
            // Find all active students in mentor's assigned classes
            const assignedClassIds = mentor.assignedClassIds || [];
            const mentorStudents = students.filter(s => 
                assignedClassIds.includes(s.classId) && s.status === 'Active'
            );
            
            const mentorStudentIds = new Set(mentorStudents.map(s => s.id));
            const totalStudents = mentorStudents.length;

            let totalRecitations = 0;

            quranRecitations.forEach(qr => {
                if (qr.status === 'Completed' && mentorStudentIds.has(qr.studentId)) {
                    if (timeframe === 'current-month') {
                        const [y, m] = qr.date.split('-');
                        if (parseInt(y) === currentYear && parseInt(m) === currentMonthNum) {
                            totalRecitations++;
                        }
                    } else {
                        // all-time
                        totalRecitations++;
                    }
                }
            });

            const averageScore = totalStudents > 0 ? (totalRecitations / totalStudents) : 0;

            return {
                ...mentor,
                totalStudents,
                totalRecitations,
                averageScore
            };
        });

        // Filter and sort
        let filteredData = data;
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredData = data.filter(m => m.name.toLowerCase().includes(lowerSearch));
        }

        return filteredData.sort((a, b) => {
            if (b.averageScore !== a.averageScore) {
                return b.averageScore - a.averageScore;
            }
            if (b.totalRecitations !== a.totalRecitations) {
                return b.totalRecitations - a.totalRecitations;
            }
            return a.name.localeCompare(b.name);
        });

    }, [mentors, students, quranRecitations, timeframe, searchTerm]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Mentor Quran Stats</h1>
                        <p className="text-sm text-gray-500">Rank mentors by their students' Quran recitation participation.</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setTimeframe('current-month')}
                        className={clsx('flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                            timeframe === 'current-month' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700')}
                    >
                        Current Month
                    </button>
                    <button
                        onClick={() => setTimeframe('all-time')}
                        className={clsx('flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                            timeframe === 'all-time' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700')}
                    >
                        All-Time
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search mentor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                </div>
            </div>

            {/* Leaderboard */}
            <Card className="overflow-hidden border border-gray-100 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center whitespace-nowrap">Rank</th>
                                <th className="px-6 py-4 whitespace-nowrap">Mentor</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">Assigned Students</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">Total Recitations</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap bg-indigo-50/50">Avg / Student</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rankings.length > 0 ? (
                                rankings.map((mentor, index, arr) => {
                                    const rank = index === 0 ? 1 : 
                                        (mentor.averageScore === arr[index - 1].averageScore ? 
                                            arr.findIndex(m => m.averageScore === mentor.averageScore) + 1 : 
                                            index + 1);

                                    return (
                                        <tr key={mentor.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                <div className={clsx(
                                                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2",
                                                    rank === 1 ? "bg-amber-100 text-amber-700 border-amber-200 font-black shadow-sm" :
                                                    rank === 2 ? "bg-gray-100 text-gray-700 border-gray-200 font-bold" :
                                                    rank === 3 ? "bg-orange-100 text-orange-700 border-orange-200 font-bold" :
                                                    "border-transparent text-gray-500 bg-transparent font-bold"
                                                )}>
                                                    {rank}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                                        {mentor.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-gray-900">{mentor.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-full font-semibold border border-gray-100">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {mentor.totalStudents}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="font-bold text-gray-700">
                                                    {mentor.totalRecitations}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap bg-indigo-50/30">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <BarChart2 className="w-4 h-4 text-indigo-500" />
                                                    <span className="font-black text-indigo-700 text-lg">
                                                        {mentor.averageScore.toFixed(2)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No mentors found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AdminMentorQuranTracker;
