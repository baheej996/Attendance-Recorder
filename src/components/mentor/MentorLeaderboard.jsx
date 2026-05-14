import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Trophy, Medal, Crown, Download, Zap, CheckCircle, Circle, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Helper: generate "Month YYYY" label
const getMonthLabel = (d) => d.toLocaleString('default', { month: 'long', year: 'numeric' });
const currentMonthLabel = getMonthLabel(new Date());

// ── Performance Leaderboard (mentor-facing view) ────────────────────────────
const PerformanceLeaderboard = () => {
    const { currentUser, mentors, leaderboardRules, leaderboardCompletions } = useData();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel);

    const monthOptions = useMemo(() => {
        const opts = [];
        const d = new Date();
        d.setMonth(d.getMonth() - 5);
        for (let i = 0; i < 7; i++) { opts.push(getMonthLabel(new Date(d))); d.setMonth(d.getMonth() + 1); }
        return opts;
    }, []);

    const monthRules = useMemo(() =>
        leaderboardRules.filter(r => r.month === selectedMonth).sort((a, b) => b.points - a.points),
        [leaderboardRules, selectedMonth]);

    const completionSet = useMemo(() => {
        const s = new Set();
        leaderboardCompletions.filter(c => c.month === selectedMonth).forEach(c => s.add(`${c.mentorId}::${c.ruleId}`));
        return s;
    }, [leaderboardCompletions, selectedMonth]);

    const rankedBoard = useMemo(() => {
        const board = mentors.map(m => {
            const pts = monthRules.filter(r => completionSet.has(`${m.id}::${r.id}`)).reduce((s, r) => s + (r.points || 0), 0);
            const done = monthRules.filter(r => completionSet.has(`${m.id}::${r.id}`)).length;
            return { ...m, totalPoints: pts, completedCount: done };
        }).sort((a, b) => b.totalPoints - a.totalPoints || b.completedCount - a.completedCount);
        let rank = 1;
        return board.map((m, i) => {
            if (i > 0 && m.totalPoints < board[i - 1].totalPoints) rank = i + 1;
            return { ...m, rank };
        });
    }, [mentors, monthRules, completionSet]);

    const myEntry = rankedBoard.find(m => m.id === currentUser?.id);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="font-bold text-gray-900">Performance Rankings</h3>
                    <p className="text-sm text-gray-500">Points earned by completing admin-set criteria</p>
                </div>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm focus:ring-2 focus:ring-amber-500">
                    {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            {/* My Card */}
            {myEntry && (
                <Card className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                                {currentUser?.name?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Your Standing</p>
                                <p className="font-black text-gray-900 text-lg">{currentUser?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center"><p className="text-3xl font-black text-amber-600">{myEntry.totalPoints}</p><p className="text-xs text-gray-500 font-bold">points</p></div>
                            <div className="text-center"><p className="text-3xl font-black text-gray-700">#{myEntry.rank}</p><p className="text-xs text-gray-500 font-bold">rank</p></div>
                            <div className="text-center"><p className="text-3xl font-black text-green-600">{myEntry.completedCount}</p><p className="text-xs text-gray-500 font-bold">/{monthRules.length} done</p></div>
                        </div>
                    </div>
                    {monthRules.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {monthRules.map(rule => {
                                const done = completionSet.has(`${currentUser?.id}::${rule.id}`);
                                return (
                                    <div key={rule.id} className={clsx('flex items-center gap-2.5 px-3 py-2 rounded-xl border', done ? 'bg-green-50 border-green-200' : 'bg-white/60 border-gray-100')}>
                                        {done ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                                        <span className={clsx('text-sm flex-1 truncate', done ? 'text-green-800 font-semibold' : 'text-gray-600')}>{rule.name}</span>
                                        <span className="text-xs font-black text-amber-600 shrink-0">{rule.points}pts</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}

            {rankedBoard.every(m => m.totalPoints === 0) && monthRules.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="font-bold text-gray-700">No rules set for {selectedMonth}</p>
                    <p className="text-sm text-gray-400 mt-1">The admin hasn't added performance criteria yet.</p>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase w-16">Rank</th>
                                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mentor</th>
                                <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Progress</th>
                                <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rankedBoard.map((mentor) => {
                                const isMe = mentor.id === currentUser?.id;
                                return (
                                    <tr key={mentor.id} className={clsx('transition-colors', isMe ? 'bg-amber-50/60' : 'hover:bg-gray-50/80', mentor.totalPoints === 0 ? 'opacity-50' : '')}>
                                        <td className="px-5 py-3">
                                            {mentor.rank === 1 ? <Trophy className="w-5 h-5 text-yellow-500" /> : mentor.rank === 2 ? <Medal className="w-5 h-5 text-gray-400" /> : mentor.rank === 3 ? <Medal className="w-5 h-5 text-amber-600" /> : <span className="text-sm font-bold text-gray-400">#{mentor.rank}</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0', isMe ? 'bg-amber-400 text-white' : 'bg-indigo-50 text-indigo-700')}>{mentor.name.charAt(0)}</div>
                                                <div>
                                                    <span className={clsx('font-semibold', isMe ? 'text-amber-700' : 'text-gray-800')}>{mentor.name}</span>
                                                    {isMe && <span className="ml-1.5 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">You</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 hidden sm:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex gap-0.5">
                                                    {monthRules.map(r => <div key={r.id} className={clsx('w-2 h-2 rounded-sm', completionSet.has(`${mentor.id}::${r.id}`) ? 'bg-green-500' : 'bg-gray-200')} />)}
                                                </div>
                                                <span className="text-xs text-gray-400">{mentor.completedCount}/{monthRules.length}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Zap className={clsx('w-3.5 h-3.5', mentor.totalPoints > 0 ? 'text-amber-500' : 'text-gray-300')} />
                                                <span className={clsx('font-black text-lg', mentor.totalPoints > 0 ? 'text-amber-600' : 'text-gray-300')}>{mentor.totalPoints}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
};

// ── Main MentorLeaderboard ──────────────────────────────────────────────────
const MentorLeaderboard = () => {
    const { currentUser, exams, subjects, results, students, classes, leaderboardSettings, requireFeature } = useData();
    const [activeTab, setActiveTab] = useState('exam');
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [viewMode, setViewMode] = useState('class');
    const [showConfetti, setShowConfetti] = useState(true);

    React.useEffect(() => {
        return requireFeature('results');
    }, [requireFeature]);

    const performanceEnabled = leaderboardSettings?.isVisibleToMentors;

    const availableClasses = useMemo(() =>
        (currentUser?.assignedClassIds) ? classes.filter(c => currentUser.assignedClassIds.includes(c.id)) : classes,
        [classes, currentUser]);

    useEffect(() => { if (exams.length > 0 && !selectedExamId) setSelectedExamId(exams[exams.length - 1].id); }, [exams]);
    useEffect(() => { if (availableClasses.length > 0 && !selectedClassId) setSelectedClassId(availableClasses[0].id); }, [availableClasses]);
    useEffect(() => { setShowConfetti(true); const t = setTimeout(() => setShowConfetti(false), 2000); return () => clearTimeout(t); }, []);

    const getAggregatedScores = (studentList) => {
        const sorted = studentList.map(student => {
            const studentResults = results.filter(r => r.studentId === student.id && r.examId === selectedExamId);
            const totalMarks = studentResults.reduce((sum, r) => sum + Number(r.marks), 0);
            const totalMaxMarks = studentResults.reduce((sum, r) => { const sub = subjects.find(s => s.id === r.subjectId); return sum + (sub ? Number(sub.maxMarks) : 0); }, 0);
            return { ...student, totalMarks, totalMaxMarks, marksMissed: totalMaxMarks - totalMarks, resultCount: studentResults.length };
        }).filter(s => s.resultCount > 0).sort((a, b) => a.marksMissed !== b.marksMissed ? a.marksMissed - b.marksMissed : b.totalMarks - a.totalMarks);
        let rank = 1;
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && (sorted[i].marksMissed !== sorted[i-1].marksMissed || sorted[i].totalMarks !== sorted[i-1].totalMarks)) rank++;
            sorted[i].rank = rank;
        }
        return sorted;
    };

    const leaderboardData = useMemo(() => {
        if (!selectedExamId) return [];
        let fs = [];
        if (viewMode === 'class') { if (!selectedClassId) return []; fs = students.filter(s => s.classId === selectedClassId && s.status === 'Active'); }
        else if (viewMode === 'batch') { if (!selectedClassId) return []; const sel = classes.find(c => c.id === selectedClassId); const ids = classes.filter(c => c.name === sel?.name).map(c => c.id); fs = students.filter(s => ids.includes(s.classId) && s.status === 'Active'); }
        else if (viewMode === 'assigned') { fs = students.filter(s => (currentUser?.assignedClassIds || []).includes(s.classId) && s.status === 'Active'); }
        else { fs = students.filter(s => s.status === 'Active'); }
        return getAggregatedScores(fs);
    }, [selectedExamId, selectedClassId, viewMode, students, results, currentUser, classes]);

    const generatePDF = () => {
        if (!selectedExamId || leaderboardData.length === 0) return;
        const exam = exams.find(e => e.id === selectedExamId);
        const doc = new jsPDF();
        doc.setFontSize(18); doc.setTextColor(79, 70, 229); doc.text(`Exam Leaderboard - ${exam?.name || 'Report'}`, 14, 20);
        doc.setFontSize(12); doc.setTextColor(107, 114, 128); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
        autoTable(doc, { startY: 40, head: [['Rank','Reg No','Name','Class','Missed','Total']], body: leaderboardData.map(s => { const cls = classes.find(c => c.id === s.classId); return [s.rank, s.registerNo, s.name, cls ? `${cls.name} ${cls.division}` : 'N/A', `-${s.marksMissed}`, `${s.totalMarks}/${s.totalMaxMarks}`]; }), theme: 'striped', headStyles: { fillColor: [79, 70, 229] } });
        doc.save(`Leaderboard_${exam?.name || 'Export'}_${Date.now()}.pdf`);
    };

    const getRankDisplay = (rank) => {
        if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-bold text-gray-500">{rank}</span>;
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fadeIn">
            {showConfetti && <ConfettiExplosion />}

            <div className="flex items-center gap-4">
                <Trophy className="w-10 h-10 text-yellow-500" />
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Leaderboard</h2>
                    <p className="text-gray-500">Rankings and performance tracking</p>
                </div>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                <button onClick={() => setActiveTab('exam')} className={clsx('px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2', activeTab === 'exam' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700')}>
                    <Trophy className="w-4 h-4" /> Exam Rankings
                </button>
                {performanceEnabled && (
                    <button onClick={() => setActiveTab('performance')} className={clsx('px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2', activeTab === 'performance' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500 hover:text-gray-700')}>
                        <Zap className="w-4 h-4" /> Performance Points
                    </button>
                )}
            </div>

            {activeTab === 'performance' && performanceEnabled && <PerformanceLeaderboard />}

            {activeTab === 'exam' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="flex-1 bg-white border border-gray-200 text-sm rounded-xl p-3.5 shadow-sm font-medium focus:ring-purple-500">
                            <option value="">Select Exam to view</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.name}{e.status === 'Draft' ? ' (Draft)' : ''}</option>)}
                        </select>
                        <div className="hidden sm:flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            {['class','batch','assigned','global'].map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)} className={clsx('px-4 py-2.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap', viewMode === mode ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
                                    {mode === 'class' ? 'This Class' : mode === 'batch' ? 'This Batch' : mode === 'assigned' ? 'My Classes' : 'This School'}
                                </button>
                            ))}
                        </div>
                        <select className="sm:hidden w-full bg-white border border-gray-200 text-sm rounded-xl p-3.5 shadow-sm font-medium" value={viewMode} onChange={e => setViewMode(e.target.value)}>
                            <option value="class">This Class</option><option value="batch">This Batch</option><option value="assigned">My Classes</option><option value="global">This School</option>
                        </select>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                        {(viewMode === 'class' || viewMode === 'batch') ? (
                            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="bg-white border border-gray-200 text-sm rounded-xl p-3.5 shadow-sm font-medium min-w-[220px] focus:ring-purple-500">
                                <option value="">Select Class</option>
                                {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.division}</option>)}
                            </select>
                        ) : <div />}
                        <Button onClick={generatePDF} disabled={!selectedExamId || leaderboardData.length === 0} className="flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export PDF
                        </Button>
                    </div>

                    <Card className="border border-gray-100 shadow-sm overflow-hidden">
                        {!selectedExamId ? (
                            <div className="p-16 text-center"><Crown className="w-16 h-16 mx-auto mb-4 text-gray-200" /><h3 className="text-xl font-bold text-gray-900 mb-2">No Exam Selected</h3><p className="text-gray-500">Select an exam to view rankings.</p></div>
                        ) : leaderboardData.length === 0 ? (
                            <div className="p-16 text-center"><Trophy className="w-10 h-10 text-gray-200 mx-auto mb-4" /><h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3><p className="text-gray-500">No results published for this exam in the current view.</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[650px] text-left border-collapse">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="p-5 w-24 text-center">Rank</th>
                                            <th className="p-5">Student</th>
                                            <th className="p-5 hidden sm:table-cell">Class</th>
                                            <th className="p-5 text-right">Missed</th>
                                            <th className="p-5 text-right">Total Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100/60 text-sm">
                                        {leaderboardData.map((student, index) => {
                                            const cls = classes.find(c => c.id === student.classId);
                                            return (
                                                <tr key={student.id} className={clsx('hover:bg-purple-50/50 transition-colors', index < 3 ? 'bg-amber-50/10' : 'bg-white')}>
                                                    <td className="p-5 text-center"><div className="flex justify-center items-center">{getRankDisplay(student.rank)}</div></td>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center font-bold text-purple-700 border border-purple-200/50">{student.name.charAt(0)}</div>
                                                            <div><div className="font-bold text-gray-900">{student.name}</div><div className="text-xs text-gray-500 font-mono">{student.registerNo}</div></div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 hidden sm:table-cell"><span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">{cls ? `${cls.name} - ${cls.division}` : 'Unknown'}</span></td>
                                                    <td className="p-5 text-right"><span className="text-lg font-bold text-red-500">-{student.marksMissed}</span></td>
                                                    <td className="p-5 text-right"><span className="text-xl font-extrabold text-gray-900">{student.totalMarks}</span><span className="text-sm font-medium text-gray-400"> / {student.totalMaxMarks}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default MentorLeaderboard;