import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Layers, CheckCircle, Clock, Trophy, Target } from 'lucide-react';

const StudentActivities = () => {
    const { currentUser, activities, activitySubmissions, students, subjects } = useData();

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

        const studentScores = classStudents.map(student => {
            const points = activitySubmissions
                .filter(s => s.studentId === student.id && s.status === 'Completed')
                .reduce((sum, s) => sum + (Number(s.points) || 0), 0);
            return { ...student, points };
        });

        // Sort by points desc
        studentScores.sort((a, b) => b.points - a.points);

        const myRank = studentScores.findIndex(s => s.id === currentUser.id) + 1;
        const myPoints = studentScores.find(s => s.id === currentUser.id)?.points || 0;

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Trophy className="w-8 h-8 text-yellow-300" />
                        </div>
                        <div>
                            <p className="text-indigo-100 font-medium">Class Rank</p>
                            <h2 className="text-3xl font-bold">#{stats.rank}</h2>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-white border-l-4 border-l-green-500 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <Target className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">Activity Points</p>
                            <h2 className="text-3xl font-bold text-gray-900">{stats.points}</h2>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-white border-l-4 border-l-blue-500 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">Completion</p>
                            <h2 className="text-3xl font-bold text-gray-900">{stats.percentage}%</h2>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activities List */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-500" /> Pending Activities
                        </h3>
                        <div className="space-y-4">
                            {pending.length === 0 ? (
                                <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center">No pending activities! 🎉</p>
                            ) : (
                                pending.map(activity => (
                                    <Card key={activity.id} className="p-4 border-l-4 border-l-orange-400">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-gray-900">{activity.title}</h4>
                                                    {activity.subjectId && subjects.find(s => s.id === activity.subjectId) && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                            {subjects.find(s => s.id === activity.subjectId).name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
                                                <div className="flex gap-4 mt-3 text-xs text-gray-500 font-medium">
                                                    <span>Max Points: {activity.maxPoints}</span>
                                                    <span>Due: {activity.dueDate || 'No Date'}</span>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">Pending</span>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
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
                            {stats.leaderboard.map((s, index) => (
                                <div key={s.id} className={`p-4 flex items-center justify-between ${s.id === currentUser.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-gray-200 text-gray-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'text-gray-400'
                                            }`}>
                                            {index + 1}
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
