import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { BookOpen, Calendar, Search, Trophy, CheckCircle, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const MentorQuranRecitation = () => {
    const { currentUser, classes = [], students = [], quranRecitations = [], requireFeature } = useData();

    // Data Subscription
    React.useEffect(() => {
        return requireFeature('quran');
    }, [requireFeature]);

    // Default to today
    const now = new Date();
    const defaultDate = now.toISOString().split('T')[0];

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'ranking'
    const [rankingTimeframe, setRankingTimeframe] = useState('all-time'); // 'all-time' | 'current-month'

    // Data Filtering
    const myClasses = useMemo(() => {
        if (!currentUser?.assignedClassIds) return [];
        return classes.filter(c => currentUser.assignedClassIds.includes(c.id));
    }, [classes, currentUser]);

    // Auto-select first class when loaded
    React.useEffect(() => {
        if (myClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(myClasses[0].id);
        }
    }, [myClasses, selectedClassId]);

    const classStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId && s.status === 'Active')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, selectedClassId]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return classStudents;
        const lowerSearch = searchTerm.toLowerCase();
        return classStudents.filter(s =>
            s.name.toLowerCase().includes(lowerSearch) ||
            s.registerNo?.toLowerCase().includes(lowerSearch)
        );
    }, [classStudents, searchTerm]);

    // Track Helper
    const isRecitationCompleted = (studentId, date) => {
        return quranRecitations.some(qr => qr.studentId === studentId && qr.date === date && qr.status === 'Completed');
    };

    const toggleRecitation = async (studentId) => {
        const docId = `${studentId}_${selectedDate}_quran`;
        const isCompleted = isRecitationCompleted(studentId, selectedDate);

        try {
            if (isCompleted) {
                // Delete to 'unmark'
                await deleteDoc(doc(db, 'quranRecitations', docId));
            } else {
                // Add mark
                await setDoc(doc(db, 'quranRecitations', docId), {
                    studentId,
                    classId: selectedClassId,
                    date: selectedDate,
                    status: 'Completed',
                    mentorId: currentUser.id,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error toggling recitation:', error);
        }
    };

    // Calculate Ranks
    const rankings = useMemo(() => {
        if (!selectedClassId || !classStudents) return [];

        let currentMonthNum = new Date().getMonth() + 1; // 1-12
        let currentYear = new Date().getFullYear();

        const ranks = classStudents.map(student => {
            let total = 0;
            quranRecitations.forEach(qr => {
                if (qr.studentId === student.id && qr.status === 'Completed') {
                    if (rankingTimeframe === 'current-month') {
                        const [y, m] = qr.date.split('-');
                        if (parseInt(y) === currentYear && parseInt(m) === currentMonthNum) {
                            total++;
                        }
                    } else {
                        // all-time
                        total++;
                    }
                }
            });
            return {
                ...student,
                totalRecitations: total
            };
        });

        return ranks.sort((a, b) => {
            if (b.totalRecitations !== a.totalRecitations) {
                return b.totalRecitations - a.totalRecitations;
            }
            return a.name.localeCompare(b.name);
        });
    }, [classStudents, quranRecitations, rankingTimeframe, selectedClassId]);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                        Daily Quran Recitation
                    </h1>
                    <p className="text-gray-500 mt-2">Track daily recitations and view student leaderboards.</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 w-full sm:w-64 font-medium outline-none transition-colors"
                    >
                        <option value="" disabled>Select a Class</option>
                        {myClasses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} - {c.division}
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 w-full sm:w-auto font-medium outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <nav className="-mb-px flex space-x-6 sm:space-x-8 min-w-max pb-1">
                    <button
                        onClick={() => setActiveTab('tracking')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'tracking'
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Calendar className="w-5 h-5" /> Today's Tracker
                    </button>
                    <button
                        onClick={() => setActiveTab('ranking')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'ranking'
                                ? "border-amber-500 text-amber-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Trophy className="w-5 h-5" /> Leaderboard
                    </button>
                </nav>
            </div>

            {/* Quick Search */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search student by name or register number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 p-3 block w-full sm:w-96 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
            </div>

            {/* --- TRACKING TAB CONTENT --- */}
            {activeTab === 'tracking' && (
                <div className="space-y-6">
                    {/* Students List - Responsive */}
                    <div className="space-y-4">
                        {/* Desktop View: Table */}
                        <Card className="hidden md:block overflow-hidden border border-gray-100 shadow-sm transition-all">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-4 font-medium whitespace-nowrap">Register No</th>
                                            <th className="px-4 py-4 font-medium whitespace-nowrap min-w-[200px]">Student Name</th>
                                            <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Status ({selectedDate})</th>
                                            <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((student) => {
                                                const isCompleted = isRecitationCompleted(student.id, selectedDate);
                                                return (
                                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-4 py-4 font-medium text-gray-600 whitespace-nowrap">
                                                            {student.registerNo || '-'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className="font-bold text-gray-900 leading-none">{student.name}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center whitespace-nowrap">
                                                            {isCompleted ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                    <Circle className="w-3.5 h-3.5" /> Pending
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-center whitespace-nowrap">
                                                            <button 
                                                                onClick={() => toggleRecitation(student.id)}
                                                                className={clsx(
                                                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border",
                                                                    isCompleted 
                                                                        ? "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-red-600"
                                                                        : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:shadow-md"
                                                                )}
                                                            >
                                                                {isCompleted ? 'Unmark' : 'Mark Completed'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                    No students found in this class.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Mobile View: Card List */}
                        <div className="md:hidden space-y-3">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((student) => {
                                    const isCompleted = isRecitationCompleted(student.id, selectedDate);
                                    return (
                                        <Card key={student.id} className="p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{student.registerNo || 'No ID'}</span>
                                                    <span className="text-lg font-black text-gray-900">{student.name}</span>
                                                </div>
                                                <div className="shrink-0">
                                                    {isCompleted ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                                            <CheckCircle className="w-3 h-3" /> Done
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                                                            <Circle className="w-3 h-3" /> Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => toggleRecitation(student.id)}
                                                className={clsx(
                                                    "w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border",
                                                    isCompleted 
                                                        ? "bg-white text-gray-400 border-gray-100"
                                                        : "bg-indigo-600 text-white border-indigo-600 shadow-indigo-100"
                                                )}
                                            >
                                                {isCompleted ? 'Unmark Attendance' : 'Mark as Completed'}
                                            </button>
                                        </Card>
                                    );
                                })
                            ) : (
                                <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    No students found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- RANKING TAB CONTENT --- */}
            {activeTab === 'ranking' && (
                <div className="space-y-6">
                    <div className="flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60 shadow-inner w-full max-w-sm">
                        <button
                            className={clsx(
                                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                rankingTimeframe === 'current-month' ? "bg-white text-indigo-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 border-transparent"
                            )}
                            onClick={() => setRankingTimeframe('current-month')}
                        >
                            Current Month
                        </button>
                        <button
                            className={clsx(
                                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                rankingTimeframe === 'all-time' ? "bg-white text-amber-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 border-transparent"
                            )}
                            onClick={() => setRankingTimeframe('all-time')}
                        >
                            All-Time
                        </button>
                    </div>

                    <Card className="overflow-hidden border border-gray-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className={clsx(
                                    "text-xs uppercase border-b",
                                    rankingTimeframe === 'all-time' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                )}>
                                    <tr>
                                        <th className="px-4 py-4 font-bold w-16 text-center whitespace-nowrap">Rank</th>
                                        <th className="px-4 py-4 font-bold whitespace-nowrap">Register No</th>
                                        <th className="px-4 py-4 font-bold whitespace-nowrap min-w-[200px]">Student Name</th>
                                        <th className="px-4 py-4 font-bold text-center whitespace-nowrap">Total Recitations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rankings.length > 0 ? (
                                        rankings.filter(s => {
                                            if (!searchTerm) return true;
                                            const lowerSearch = searchTerm.toLowerCase();
                                            return s.name.toLowerCase().includes(lowerSearch) || s.registerNo?.toLowerCase().includes(lowerSearch);
                                        }).map((student, index, arr) => {
                                            const rank = index === 0 ? 1 :
                                                (student.totalRecitations === arr[index - 1].totalRecitations ?
                                                    arr.findIndex(st => st.totalRecitations === student.totalRecitations) + 1 :
                                                    index + 1);

                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-4 text-center font-bold whitespace-nowrap">
                                                        <div className={clsx(
                                                            "mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2",
                                                            rank === 1 ? "bg-amber-100 text-amber-700 border-amber-200 font-black shadow-sm" :
                                                                rank === 2 ? "bg-gray-100 text-gray-700 border-gray-200 font-bold" :
                                                                    rank === 3 ? "bg-orange-100 text-orange-700 border-orange-200 font-bold" :
                                                                        "border-transparent text-gray-500 bg-transparent"
                                                        )}>
                                                            {rank}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-medium text-gray-600 whitespace-nowrap">
                                                        {student.registerNo || '-'}
                                                    </td>
                                                    <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                        {student.name}
                                                    </td>
                                                    <td className="px-4 py-4 text-center whitespace-nowrap">
                                                        <span className={clsx(
                                                            "font-bold px-3 py-1 rounded-lg border",
                                                            rankingTimeframe === 'all-time' 
                                                                ? "text-amber-700 bg-amber-50 border-amber-200" 
                                                                : "text-indigo-700 bg-indigo-50 border-indigo-200",
                                                            student.totalRecitations === 0 && "opacity-50"
                                                        )}>
                                                            {student.totalRecitations} Days
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                No students found in this class.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default MentorQuranRecitation;
