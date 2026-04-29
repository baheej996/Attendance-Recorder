import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Layers, CheckCircle, Clock, Trophy, Target } from 'lucide-react';

const StudentActivities = () => {
    const { currentUser, activities, activitySubmissions, students, subjects, markActivityAsDone } = useData();

    if (!currentUser) return null;

    // 1. Get Activities for My Class
    const myActivities = useMemo(() => {
        return activities.filter(a => a.classId === currentUser.classId && a.status === 'Active');
    }, [activities, currentUser]);

    // 2. Identify Pending vs Completed
    const { pending, completed } = useMemo(() => {
        const p = [];
        const c = [];
        myActivities.forEach(activity => {
            const submission = activitySubmissions.find(s => s.activityId === activity.id && s.studentId === currentUser.id && s.status === 'Completed');
            if (submission) {
                c.push({ ...activity, submission });
            } else {
                p.push(activity);
            }
        });
        return { pending: p, completed: c };
    }, [myActivities, activitySubmissions, currentUser]);

    // 3. Calculate Stats (Rank, Points, Class Summary)
    const stats = useMemo(() => {
        // Calculate points for all students in my class
        const classStudents = students.filter(s => s.classId === currentUser.classId);

        // Create a Set of active activity IDs for fast lookup
        // We only want to count points for activities that currently exist and are Active
        const activeActivityIds = new Set(myActivities.map(a => a.id));

        const studentScores = classStudents.map(student => {
            const points = activitySubmissions
                .filter(s =>
                    s.studentId === student.id &&
                    s.status === 'Completed' &&
                    activeActivityIds.has(s.activityId) // Only count if activity is invalid/active
                )
                .reduce((sum, s) => sum + (Number(s.points) || 0), 0);
            return { ...student, points };
        });

        // Sort by points desc
        studentScores.sort((a, b) => b.points - a.points);

        // Compute dense ranks (handles ties: 1, 2, 2, 3...)
        let currentRank = 1;
        for (let i = 0; i < studentScores.length; i++) {
            if (i > 0 && studentScores[i].points !== studentScores[i - 1].points) {
                currentRank++;
            }
            studentScores[i].rank = currentRank;
        }

        const myStudentData = studentScores.find(s => s.id === currentUser.id);
        const myRank = myStudentData ? myStudentData.rank : 0;
        const myPoints = myStudentData ? myStudentData.points : 0;

        // Calculate completion percentage compared to total possible points (or total activities)
        // Let's use total active activities count as base
        const completionPercentage = myActivities.length > 0
            ? Math.round((completed.length / myActivities.length) * 100)
            : 0;

        return {
            rank: myRank,
            points: myPoints,
            percentage: completionPercentage,
            leaderboard: studentScores
        };

    }, [students, activitySubmissions, currentUser, myActivities, completed.length]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Stats */}
            {/* Header / Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-6">
                <Card className="p-2 md:p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/2 -translate-y-1/2">
                        <Trophy className="w-16 h-16" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center justify-center md:items-start md:justify-start gap-1 md:gap-4 text-center md:text-left">
                        <div className="p-1.5 md:p-3 bg-white/20 rounded-xl hidden md:block">
                            <Trophy className="w-4 h-4 md:w-8 md:h-8 text-yellow-300" />
                        </div>
                        <div>
                            <p className="text-indigo-100 text-[8px] md:text-base font-black uppercase tracking-widest leading-none mb-1">Rank</p>
                            <h2 className="text-base md:text-3xl font-black leading-tight">#{stats.rank}</h2>
                        </div>
                    </div>
                </Card>
                <Card className="p-2 md:p-6 bg-white border-l-4 border-l-green-500 shadow-sm relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center justify-center md:items-start md:justify-start gap-1 md:gap-4 text-center md:text-left">
                        <div className="p-1.5 md:p-3 bg-green-50 rounded-xl text-green-600 hidden md:block">
                            <Target className="w-4 h-4 md:w-8 md:h-8" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-[8px] md:text-base font-black uppercase tracking-widest leading-none mb-1">Points</p>
                            <h2 className="text-base md:text-3xl font-black text-gray-900 leading-tight">{stats.points}</h2>
                        </div>
                    </div>
                </Card>
                <Card className="p-2 md:p-6 bg-white border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center justify-center md:items-start md:justify-start gap-1 md:gap-4 text-center md:text-left">
                        <div className="p-1.5 md:p-3 bg-blue-50 rounded-xl text-blue-600 hidden md:block">
                            <CheckCircle className="w-4 h-4 md:w-8 md:h-8" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-[8px] md:text-base font-black uppercase tracking-widest leading-none mb-1">Done</p>
                            <h2 className="text-base md:text-3xl font-black text-gray-900 leading-tight">{stats.percentage}%</h2>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activities List */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-500" /> Pending Activities
                        </h3>
                        <div className="space-y-4">
                            {pending.length === 0 ? (
                                <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center">No pending activities! 🎉</p>
                            ) : (
                                pending.map(activity => (
                                    <Card key={activity.id} className="p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all rounded-3xl group">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="font-black text-gray-900 leading-tight">{activity.title}</h4>
                                                        {activity.subjectId && subjects.find(s => s.id === activity.subjectId) && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full uppercase tracking-tighter">
                                                                {subjects.find(s => s.id === activity.subjectId).name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 md:line-clamp-none group-hover:line-clamp-none transition-all">{activity.description}</p>
                                                </div>
                                                <div className="shrink-0 flex flex-col items-end gap-1">
                                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[9px] font-black rounded-lg uppercase tracking-widest animate-pulse">Pending</span>
                                                    <div className="text-[10px] font-black text-gray-400">{activity.maxPoints} PTS</div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3 text-[10px] md:text-xs">
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100/50">
                                                    <p className="text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Due Date</p>
                                                    <p className="text-gray-700 font-black">{activity.dueDate || 'Open'}</p>
                                                </div>
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100/50">
                                                    <p className="text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Reference</p>
                                                    <p className="text-gray-700 font-black truncate">#{activity.id.slice(-6)}</p>
                                                </div>
                                            </div>

                                            {activity.studentCanMarkDone && (
                                                <button
                                                    onClick={() => markActivityAsDone(activity.id, currentUser.id, activity.maxPoints)}
                                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    COMPLETE NOW
                                                </button>
                                            )}
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" /> Completed
                        </h3>
                        <div className="space-y-4">
                            {completed.length === 0 ? (
                                <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center">No completed activities yet.</p>
                            ) : (
                                completed.map(activity => (
                                    <Card key={activity.id} className="p-4 border-l-4 border-l-green-400 bg-gray-50/50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-gray-700 line-through">{activity.title}</h4>
                                                    {activity.subjectId && subjects.find(s => s.id === activity.subjectId) && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                                            {subjects.find(s => s.id === activity.subjectId).name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 text-sm mt-1">{activity.description}</p>
                                                <div className="flex gap-4 mt-3 text-xs text-gray-400 font-medium">
                                                    <span>Points Earned: {activity.submission.points}/{activity.maxPoints}</span>
                                                    <span>Completed: {new Date(activity.submission.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Done</span>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Class Leaderboard Simplified */}
                <div className="space-y-6">
                    <Card className="p-0 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" /> Class Leaderboard
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                            {stats.leaderboard.map((s) => (
                                <div key={s.id} className={`p-4 flex items-center justify-between ${s.id === currentUser.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${s.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                            s.rank === 2 ? 'bg-gray-200 text-gray-700' :
                                                s.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                                    'text-gray-400'
                                            }`}>
                                            {s.rank}
                                        </span>
                                        <p className={`text-sm font-medium ${s.id === currentUser.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                                            {s.name}
                                            {s.id === currentUser.id && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">YOU</span>}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{s.points} pts</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentActivities;
