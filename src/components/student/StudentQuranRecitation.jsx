import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { BookOpen, Calendar, Trophy, CheckCircle, Clock, Award } from 'lucide-react';
import { clsx } from 'clsx';

const StudentQuranRecitation = () => {
    const { currentUser, quranRecitations = [], students = [], requireFeature } = useData();
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'leaderboard'
    const [rankingTimeframe, setRankingTimeframe] = useState('current-month'); // 'current-month' | 'all-time'

    React.useEffect(() => {
        if (requireFeature) return requireFeature('quran');
    }, [requireFeature]);


    // Status logic for Today
    const todayStr = new Date().toISOString().split('T')[0];
    const isCompletedToday = useMemo(() => {
        return quranRecitations.some(
            qr => qr.studentId === currentUser?.id && 
            qr.date === todayStr && 
            qr.status === 'Completed'
        );
    }, [quranRecitations, currentUser, todayStr]);

    // Calendar Heatmap Data
    const heatmapData = useMemo(() => {
        if (!currentUser) return [];
        return quranRecitations
            .filter(qr => qr.studentId === currentUser.id && qr.status === 'Completed')
            .map(qr => ({ date: qr.date, count: 1 }));
    }, [quranRecitations, currentUser]);

    // Leaderboard Logic
    const classStudents = useMemo(() => {
        if (!currentUser?.classId) return [];
        return students.filter(s => s.classId === currentUser.classId && s.status === 'Active');
    }, [students, currentUser]);

    const rankings = useMemo(() => {
        if (!classStudents.length) return [];

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
            if (a.id === currentUser?.id) return -1;
            if (b.id === currentUser?.id) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [classStudents, quranRecitations, rankingTimeframe]);

    // Get current student's rank mapping
    const myRankData = useMemo(() => {
        if (!currentUser || rankings.length === 0) return { rank: 0, total: 0 };
        const myIndex = rankings.findIndex(r => r.id === currentUser.id);
        if (myIndex === -1) return { rank: 0, total: 0 };
        
        // Handle ties correctly based on totalRecitations
        const myTotal = rankings[myIndex].totalRecitations;
        const tieIndex = rankings.findIndex(r => r.totalRecitations === myTotal);
        return {
            rank: tieIndex + 1,
            total: myTotal
        };
    }, [rankings, currentUser]);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-indigo-600" />
                    Daily Quran Recitation
                </h1>
                <p className="text-gray-500 mt-2">Track your daily progress and compare with your classmates.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <nav className="-mb-px flex space-x-6 sm:space-x-8 min-w-max pb-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'overview'
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Calendar className="w-5 h-5" /> My Progress
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'leaderboard'
                                ? "border-amber-500 text-amber-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Trophy className="w-5 h-5" /> Leaderboard
                    </button>
                </nav>
            </div>

            {/* --- OVERVIEW TAB --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Today's Hero Card */}
                    <Card className="overflow-hidden border-0 shadow-lg relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 sm:p-12">
                        {/* Abstract Background Vectors */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl"></div>
                        
                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold opacity-90 mb-2">Today's Recitation Status</h2>
                                {isCompletedToday ? (
                                    <div className="flex items-center gap-3 text-4xl sm:text-5xl font-black text-emerald-300 drop-shadow-md">
                                        <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12" /> Completed
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-4xl sm:text-5xl font-black text-amber-300 drop-shadow-md">
                                        <Clock className="w-10 h-10 sm:w-12 sm:h-12" /> Pending...
                                    </div>
                                )}
                                <p className="text-sm font-medium opacity-80 mt-4 max-w-sm leading-relaxed">
                                    {isCompletedToday 
                                        ? "Mashallah! Your mentor has verified your recitation for today. Keep up the consistency."
                                        : "You haven't been marked for today. Recite your portion to your mentor so they can update your status."}
                                </p>
                            </div>
                            
                            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[200px]">
                                <Trophy className="w-10 h-10 text-yellow-300 mb-2" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Your Rank</span>
                                <div className="text-3xl font-black">{myRankData.rank > 0 ? `#${myRankData.rank}` : '-'}</div>
                                <span className="text-[10px] font-medium opacity-70 mt-1">in your class</span>
                            </div>
                        </div>
                    </Card>

                    {/* Heatmap Card */}
                    <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" /> Consistency Map
                        </h3>
                        <div className="pb-4">
                            <div className="text-sm">
                                <div className="flex flex-wrap gap-2">
                                    {[...Array(30)].map((_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - (29 - i));
                                        const dStr = d.toISOString().split('T')[0];
                                        const didComplete = heatmapData.some(h => h.date === dStr);
                                        return (
                                            <div 
                                                key={i} 
                                                title={dStr}
                                                className={clsx(
                                                    "w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center text-[10px] font-bold border transition-all cursor-crosshair",
                                                    didComplete ? "bg-emerald-500 border-emerald-600 text-white shadow-sm hover:scale-110" : "bg-gray-50 border-gray-100 text-gray-300 hover:bg-gray-100"
                                                )}
                                            >
                                                {d.getDate()}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- LEADERBOARD TAB --- */}
            {activeTab === 'leaderboard' && (
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
                                        <th className="px-4 py-4 font-bold whitespace-nowrap min-w-[200px]">Classmate</th>
                                        <th className="px-4 py-4 font-bold text-center whitespace-nowrap">Total Recitations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rankings.length > 0 ? (
                                        rankings.map((student, index, arr) => {
                                            const rank = index === 0 ? 1 :
                                                (student.totalRecitations === arr[index - 1].totalRecitations ?
                                                    arr.findIndex(st => st.totalRecitations === student.totalRecitations) + 1 :
                                                    index + 1);
                                                    
                                            const isMe = student.id === currentUser?.id;

                                            return (
                                                <tr key={student.id} className={clsx(
                                                    "transition-colors",
                                                    isMe ? "bg-indigo-50/50" : "hover:bg-gray-50/50"
                                                )}>
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
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={clsx(
                                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase",
                                                                isMe ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                                                            )}>
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <span className={clsx(
                                                                "font-bold whitespace-nowrap",
                                                                isMe ? "text-indigo-700" : "text-gray-900"
                                                            )}>
                                                                {student.name} {isMe && "(You)"}
                                                            </span>
                                                        </div>
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
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                                                No classmates found.
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

export default StudentQuranRecitation;
