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

const Leaderboard = () => {
    const { currentUser, exams, subjects, results, students, classes } = useData();
    const [selectedExamId, setSelectedExamId] = useState('');
    const [viewMode, setViewMode] = useState('class'); // class, batch, global
    const [showConfetti, setShowConfetti] = useState(true);

    const publishedExams = exams.filter(e => e.status === 'Published');

    // Auto-select the last published exam on mount
    useEffect(() => {
        if (publishedExams.length > 0 && !selectedExamId) {
            setSelectedExamId(publishedExams[publishedExams.length - 1].id);
        }
    }, [publishedExams]);

    // Trigger confetti on mount
    useEffect(() => {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 2000); // Remove after animation
        return () => clearTimeout(timer);
    }, []);

    const myStudent = students.find(s => s.id === currentUser?.id);
    const myClass = classes.find(c => c.id === myStudent?.classId);

    const getAggregatedScores = (studentList) => {
        const sortedStudents = studentList.map(student => {
            const studentResults = results.filter(r => r.studentId === student.id && r.examId === selectedExamId);
            const totalMarks = studentResults.reduce((sum, r) => sum + Number(r.marks), 0);
            const totalMaxMarks = studentResults.reduce((sum, r) => {
                const subject = subjects.find(s => s.id === r.subjectId);
                return sum + (subject ? Number(subject.maxMarks) : 0);
            }, 0);
            const marksMissed = totalMaxMarks - totalMarks;

            return {
                ...student,
                totalMarks,
                totalMaxMarks,
                marksMissed,
                resultCount: studentResults.length
            };
        }).filter(s => s.resultCount > 0)
            .sort((a, b) => {
                if (a.marksMissed !== b.marksMissed) return a.marksMissed - b.marksMissed;
                return b.totalMarks - a.totalMarks;
            });

        // Compute dense ranks (handles ties: 1, 2, 2, 3...)
        let currentRank = 1;
        for (let i = 0; i < sortedStudents.length; i++) {
            if (i > 0 &&
                (sortedStudents[i].marksMissed !== sortedStudents[i - 1].marksMissed ||
                    sortedStudents[i].totalMarks !== sortedStudents[i - 1].totalMarks)) {
                currentRank++;
            }
            sortedStudents[i].rank = currentRank;
        }
        return sortedStudents;
    };

    const leaderboardData = useMemo(() => {
        if (!selectedExamId || !myStudent || !myClass) return [];
        let filteredStudents = [];
        if (viewMode === 'class') {
            filteredStudents = students.filter(s => s.classId === myClass.id);
        } else if (viewMode === 'batch') {
            const batchClassIds = classes.filter(c => c.name === myClass.name).map(c => c.id);
            filteredStudents = students.filter(s => batchClassIds.includes(s.classId));
        } else {
            filteredStudents = students;
        }
        return getAggregatedScores(filteredStudents);
    }, [selectedExamId, viewMode, students, results, myClass]);

    // Find my rank
    const myRankData = leaderboardData.find(s => s.id === currentUser.id);

    const getRankDisplay = (rank) => {
        if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-bold text-gray-500 w-5 text-center">{rank}</span>;
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {showConfetti && <ConfettiExplosion />}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
                    <p className="text-gray-500">Compare your performance with peers</p>
                </div>

                <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                    {['class', 'batch', 'global'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={clsx(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                viewMode === mode
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            {mode === 'class' ? 'My Class' : mode === 'batch' ? 'My Batch' : 'All School'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Exam Selector */}
            <div className="relative">
                <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full md:w-64 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                >
                    <option value="">Select Exam</option>
                    {publishedExams.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
            </div>

            {/* My Rank Card */}
            {selectedExamId && myRankData && (
                <Card className="bg-indigo-600 text-white border-none shadow-lg overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                        <Trophy className="w-64 h-64" />
                    </div>
                    <div className="relative z-10 p-6 flex items-center justify-between">
                        <div>
                            <p className="text-indigo-200 text-sm font-medium mb-1">Your Current Rank</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold">#{myRankData.rank}</span>
                                <span className="text-indigo-200">in {viewMode === 'class' ? 'Class' : viewMode === 'batch' ? 'Batch' : 'School'}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-red-100">-{myRankData.marksMissed}</p>
                            <p className="text-indigo-200 text-xs uppercase tracking-wider">Marks Missed</p>
                            <p className="text-indigo-100/70 text-xs mt-1">{myRankData.totalMarks} / {myRankData.totalMaxMarks} Points</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Leaderboard List */}
            <Card className="overflow-hidden border border-gray-100 shadow-sm">
                {!selectedExamId ? (
                    <div className="p-12 text-center text-gray-500">
                        Select an exam to view rankings.
                    </div>
                ) : leaderboardData.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No results found.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4 w-16 text-center">Rank</th>
                                <th className="p-4">Student</th>
                                <th className="p-4 text-right">Missed</th>
                                <th className="p-4 text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {leaderboardData.map((student, index) => {
                                const isMe = student.id === currentUser.id;
                                return (
                                    <tr
                                        key={student.id}
                                        className={clsx(
                                            "hover:bg-gray-50 transition-colors",
                                            isMe && "bg-indigo-50 hover:bg-indigo-100"
                                        )}
                                    >
                                        <td className="p-4 text-center flex justify-center items-center">
                                            {getRankDisplay(student.rank)}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-900">
                                                {student.name}
                                                {isMe && <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full">YOU</span>}
                                            </div>
                                            {viewMode !== 'class' && (
                                                <div className="text-xs text-gray-500">
                                                    {classes.find(c => c.id === student.classId)?.name}-{classes.find(c => c.id === student.classId)?.division}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-bold text-red-500">
                                            -{student.marksMissed}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-medium text-gray-900">{student.totalMarks}</span>
                                            <span className="text-xs text-gray-500 ml-1">/ {student.totalMaxMarks}</span>
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

export default Leaderboard;
