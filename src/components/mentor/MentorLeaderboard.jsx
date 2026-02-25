import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Trophy, Medal, Crown, Search, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';

// Simple Confetti Component
const ConfettiExplosion = () => {
    const [pieces, setPieces] = useState([]);

    useEffect(() => {
        const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981'];
        const newPieces = Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            x: 50, // Start center
            y: 50,
            color: colors[Math.floor(Math.random() * colors.length)],
            // Random direction and distances
            angle: Math.random() * 360,
            distance: 20 + Math.random() * 80,
            delay: Math.random() * 0.2
        }));
        setPieces(newPieces);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
            {/* We use inline styles for the explosion positions */}
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className="absolute w-2 h-2 rounded-full animate-explosion op-0"
                    style={{
                        backgroundColor: p.color,
                        '--angle': `${p.angle}deg`,
                        '--distance': `${p.distance}vh`, // Use viewport height for distance
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
            {/* Add custom styles for the explosion animation */}
            <style>{`
                @keyframes explosion {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 1;
                    }
                    80% {
                        opacity: 1;
                    }
                    100% {
                        transform: translate(
                            calc(cos(var(--angle)) * var(--distance)), 
                            calc(sin(var(--angle)) * var(--distance))
                        ) scale(0);
                        opacity: 0;
                    }
                }
                .animate-explosion {
                    animation: explosion 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
            `}</style>
        </div>
    );
};

const MentorLeaderboard = () => {
    const { currentUser, exams, subjects, results, students, classes } = useData();
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [viewMode, setViewMode] = useState('class'); // class, batch, assigned, global
    const [showConfetti, setShowConfetti] = useState(true);

    const availableClasses = useMemo(() => (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes, [classes, currentUser]);

    // Auto-select the last exam on mount
    useEffect(() => {
        if (exams.length > 0 && !selectedExamId) {
            setSelectedExamId(exams[exams.length - 1].id);
        }
    }, [exams]);

    // Auto-select the first available class on mount
    useEffect(() => {
        if (availableClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses]);

    // Trigger confetti on mount
    useEffect(() => {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 2000); // Remove after animation
        return () => clearTimeout(timer);
    }, []);

    const getAggregatedScores = (studentList) => {
        return studentList.map(student => {
            const studentResults = results.filter(r => r.studentId === student.id && r.examId === selectedExamId);
            const totalMarks = studentResults.reduce((sum, r) => sum + Number(r.marks), 0);
            return {
                ...student,
                totalMarks,
                resultCount: studentResults.length
            };
        }).filter(s => s.resultCount > 0)
            .sort((a, b) => b.totalMarks - a.totalMarks);
    };

    const leaderboardData = useMemo(() => {
        if (!selectedExamId) return [];
        let filteredStudents = [];

        if (viewMode === 'class') {
            if (!selectedClassId) return [];
            filteredStudents = students.filter(s => s.classId === selectedClassId);
        } else if (viewMode === 'batch') {
            if (!selectedClassId) return [];
            const selectedClass = classes.find(c => c.id === selectedClassId);
            if (!selectedClass) return [];
            const batchClassIds = classes.filter(c => c.name === selectedClass.name).map(c => c.id);
            filteredStudents = students.filter(s => batchClassIds.includes(s.classId));
        } else if (viewMode === 'assigned') {
            const myClassIds = currentUser?.assignedClassIds || [];
            filteredStudents = students.filter(s => myClassIds.includes(s.classId));
        } else {
            filteredStudents = students;
        }

        return getAggregatedScores(filteredStudents);
    }, [selectedExamId, selectedClassId, viewMode, students, results, currentUser, classes]);

    const getRankDisplay = (index) => {
        const rank = index + 1;
        if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-bold text-gray-500 w-5 text-center">{rank}</span>;
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
            {showConfetti && <ConfettiExplosion />}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <Trophy className="w-10 h-10 text-yellow-500" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Exam Leaderboard</h2>
                        <p className="text-gray-500 mt-1">View top performers and subject rankings</p>
                    </div>
                </div>

                <div className="flex bg-white p-1 rounded-lg border border-gray-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
                    {['class', 'batch', 'assigned', 'global'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={clsx(
                                "px-4 sm:px-6 py-2.5 text-sm font-semibold rounded-md transition-all",
                                viewMode === mode
                                    ? "bg-purple-50 text-purple-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            {mode === 'class' ? 'This Class' :
                                mode === 'batch' ? 'This Batch' :
                                    mode === 'assigned' ? 'My Classes' : 'This School'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selectors */}
            <div className="flex flex-col sm:flex-row gap-4">
                <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full sm:max-w-xs bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-purple-500 focus:border-purple-500 block p-3.5 shadow-sm font-medium"
                >
                    <option value="">Select Exam to view</option>
                    {exams.map(e => (
                        <option key={e.id} value={e.id}>{e.name} {e.status === 'Draft' ? '(Draft)' : ''}</option>
                    ))}
                </select>

                {(viewMode === 'class' || viewMode === 'batch') && (
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full sm:max-w-xs bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-purple-500 focus:border-purple-500 block p-3.5 shadow-sm font-medium"
                    >
                        <option value="">Select Class</option>
                        {availableClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Leaderboard List */}
            <Card className="overflow-hidden border border-gray-100 shadow-sm mt-8">
                {!selectedExamId ? (
                    <div className="p-16 text-center text-gray-500">
                        <Crown className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Exam Selected</h3>
                        <p>Select an exam from the dropdown above to view rankings.</p>
                    </div>
                ) : leaderboardData.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3>
                        <p>There are no results published for this exam in the current view.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-5 w-24 text-center">Rank</th>
                                <th className="p-5">Student</th>
                                <th className="p-5 hidden sm:table-cell">Class</th>
                                <th className="p-5 text-right w-32">Total Marks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/60 text-sm">
                            {leaderboardData.map((student, index) => {
                                const cls = classes.find(c => c.id === student.classId);
                                const isTop3 = index < 3;
                                return (
                                    <tr
                                        key={student.id}
                                        className={clsx(
                                            "hover:bg-purple-50/50 transition-colors cursor-default",
                                            isTop3 ? "bg-amber-50/10" : "bg-white"
                                        )}
                                    >
                                        <td className="p-5 text-center flex justify-center items-center">
                                            {getRankDisplay(index)}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center font-bold text-purple-700 shadow-sm border border-purple-200/50">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-base">
                                                        {student.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono">
                                                        {student.registerNo}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Mobile specific class view */}
                                            <div className="sm:hidden text-xs text-gray-500 mt-2 font-medium bg-gray-50 inline-block px-2 py-1 rounded">
                                                {cls ? `${cls.name} - ${cls.division}` : 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="p-5 hidden sm:table-cell">
                                            <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                                                {cls ? `${cls.name} - ${cls.division}` : 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="inline-flex items-center justify-end gap-2">
                                                <span className="text-xl font-extrabold text-gray-900">{student.totalMarks}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};

export default MentorLeaderboard;
