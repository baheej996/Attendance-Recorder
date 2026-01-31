import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';
import { Star, Calendar, Trophy, Award, Download, Share2, PartyPopper, X, Lock, Clock } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, endOfMonth, isSameMonth, isSameYear, isAfter } from 'date-fns';
import { toPng } from 'html-to-image';

const StudentStarView = () => {
    const { currentUser, students, attendance, activities, activitySubmissions, prayerRecords, classes, institutionSettings, starDeclarations, mentors } = useData();

    // State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [showCelebration, setShowCelebration] = useState(false);
    const [showPoster, setShowPoster] = useState(false);
    const posterRef = useRef(null);

    // Config
    const config = institutionSettings?.starConfig || {
        attendance: true,
        activities: true,
        prayer: true,
    };

    const years = [new Date().getFullYear() - 1, new Date().getFullYear()];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // --- Calculation Logic (Mirrors Mentor Logic) ---
    const results = useMemo(() => {
        if (!currentUser?.classId) return [];

        // 1. Filter students in MY class only
        const classStudents = students.filter(s => s.classId === currentUser.classId);
        const classId = currentUser.classId;

        // 2. Date Range
        const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
        const daysInMonth = getDaysInMonth(startDate);

        // Class Stats
        const classAttendanceDates = new Set(
            attendance
                .filter(a => {
                    const s = students.find(stu => stu.id === a.studentId);
                    return s && s.classId === classId && isSameMonth(new Date(a.date), startDate) && isSameYear(new Date(a.date), startDate);
                })
                .map(a => a.date)
        );
        const workingDays = classAttendanceDates.size || 1;

        const activeActivities = activities.filter(a =>
            a.classId === classId && a.status === 'Active'
        ).length || 1;

        const processed = classStudents.map(student => {
            let attendanceScore = 0;
            let presentCount = 0;
            if (config.attendance) {
                const studentAttendance = attendance.filter(a =>
                    a.studentId === student.id &&
                    isSameMonth(new Date(a.date), startDate) &&
                    isSameYear(new Date(a.date), startDate)
                );
                presentCount = studentAttendance.filter(a => a.status === 'Present').length;
                attendanceScore = (presentCount / (workingDays || 1)) * 100;
            }

            let activityScore = 0;
            let completedCount = 0;
            if (config.activities) {
                const studentSubmissions = activitySubmissions.filter(s =>
                    s.studentId === student.id &&
                    s.status === 'Completed'
                );
                const monthSubmissions = studentSubmissions.filter(s =>
                    isSameMonth(new Date(s.timestamp), startDate) &&
                    isSameYear(new Date(s.timestamp), startDate)
                );
                completedCount = monthSubmissions.length;
                activityScore = (completedCount / (activeActivities || 1)) * 100;
            }

            let prayerScore = 0;
            let prayersPerformed = 0;
            if (config.prayer) {
                const studentPrayers = prayerRecords.filter(p =>
                    p.studentId === student.id &&
                    isSameMonth(new Date(p.date), startDate) &&
                    isSameYear(new Date(p.date), startDate)
                );
                studentPrayers.forEach(record => {
                    Object.values(record.prayers || {}).forEach(status => {
                        if (status === true) prayersPerformed++;
                    });
                });
                const maxPrayers = daysInMonth * 5;
                prayerScore = (prayersPerformed / maxPrayers) * 100;
            }

            let totalScore = 0;
            let divider = 0;

            if (config.attendance) { totalScore += attendanceScore; divider++; }
            if (config.activities) { totalScore += activityScore; divider++; }
            if (config.prayer) { totalScore += prayerScore; divider++; }

            const finalScore = divider > 0 ? (totalScore / divider) : 0;

            return {
                ...student,
                scores: {
                    attendance: attendanceScore,
                    activities: activityScore,
                    prayer: prayerScore,
                },
                finalScore,
                className: classes.find(c => c.id === classId)?.name || 'Unknown'
            };
        });

        return processed.sort((a, b) => b.finalScore - a.finalScore);

    }, [
        students, attendance, activities, activitySubmissions, prayerRecords,
        currentUser, selectedMonth, selectedYear, config, classes
    ]);

    const maxScore = results.length > 0 ? results[0].finalScore : 0;
    const winners = results.filter(r => r.finalScore === maxScore && r.finalScore > 0);
    const isMeWinner = winners.some(w => w.id === currentUser.id);

    // Visibility Check
    const isVisible = useMemo(() => {
        if (!currentUser?.classId) return false;

        // 1. Check if month is completed (Auto-show)
        const isMonthCompleted = isAfter(new Date(), endOfMonth(new Date(selectedYear, selectedMonth)));
        if (isMonthCompleted) return true;

        // 2. Check if manually declared
        const declaration = starDeclarations?.find(d =>
            d.classId === currentUser.classId &&
            d.month === selectedMonth &&
            d.year === selectedYear
        );

        return declaration?.status === 'Declared';
    }, [currentUser, selectedMonth, selectedYear, starDeclarations]);

    const handleCelebrate = () => {
        setShowCelebration(true);
        // Reset celebration after animation
        setTimeout(() => setShowPoster(true), 2500);
        setTimeout(() => setShowCelebration(false), 3000);
    };

    const downloadPoster = useCallback(() => {
        if (!posterRef.current) return;

        toPng(posterRef.current, {
            cacheBust: true,
            style: { margin: '0' }, // Prevent margin-auto from shifting the image
            pixelRatio: 2, // Higher quality
        })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `Star_Certificate_${currentUser.name}_${months[selectedMonth]}.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error("Failed to generate certificate image", err);
                alert("Could not generate image. Please try again.");
            });
    }, [posterRef, currentUser, selectedMonth, months]);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 relative overflow-hidden min-h-screen">

            {/* Celebration Overlay */}
            {showCelebration && (
                <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/20 animate-in fade-in duration-500"></div>
                    {/* CSS Confetti would go here */}
                    <div className="animate-bounce text-6xl">🎉</div>
                </div>
            )}

            {/* Poster Modal */}
            {showPoster && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative transform transition-all scale-100 flex flex-col items-center">
                        <button
                            onClick={() => setShowPoster(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-50"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Certificate</h2>

                        {/* Certificate Preview Capture Area */}
                        {/* Certificate Preview Capture Area */}
                        <div ref={posterRef} className="relative w-full max-w-sm mx-auto bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white text-center shadow-xl overflow-hidden mb-6">
                            {/* Decorative Background */}
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                                <Star className="absolute top-4 right-4 w-24 h-24 rotate-12" />
                                <Star className="absolute bottom-4 left-4 w-16 h-16 -rotate-12" />
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-white/20 p-1 mb-4">
                                    <div className="w-full h-full rounded-full bg-white text-indigo-600 flex items-center justify-center text-3xl font-bold border-4 border-yellow-400">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/90 text-yellow-900 text-xs font-bold mb-2 shadow-sm">
                                    <Trophy className="w-3 h-3" /> STAR OF THE MONTH
                                </div>
                                <h2 className="text-2xl font-bold mb-1">{currentUser.name}</h2>
                                <p className="text-indigo-100 text-sm mb-4">
                                    Class {classes.find(c => c.id === currentUser.classId)?.name} • {months[selectedMonth]} {selectedYear}
                                </p>

                                <div className="grid grid-cols-3 gap-2 w-full mb-6">
                                    <div className="bg-white/10 rounded-lg p-2">
                                        <div className="text-xl font-bold">{Math.round(isMeWinner ? winners.find(w => w.id === currentUser.id).scores.attendance : 0)}%</div>
                                        <div className="text-[10px] uppercase tracking-wider opacity-75">Attd.</div>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-2">
                                        <div className="text-xl font-bold">{Math.round(isMeWinner ? winners.find(w => w.id === currentUser.id).scores.activities : 0)}%</div>
                                        <div className="text-[10px] uppercase tracking-wider opacity-75">Act.</div>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-2">
                                        <div className="text-xl font-bold">{Math.round(isMeWinner ? winners.find(w => w.id === currentUser.id).scores.prayer : 0)}%</div>
                                        <div className="text-[10px] uppercase tracking-wider opacity-75">Pray</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-indigo-200 uppercase tracking-widest opacity-60">
                                    Samastha E-Learning
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={downloadPoster}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" /> Download Image
                        </button>
                    </div>
                </div>
            )}

            {/* View Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                        Star of the Month
                    </h1>
                    <p className="text-gray-500">View the top performers of your class</p>
                </div>
                <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="p-2 text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="p-2 text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Winner Spotlight */}
            {!isVisible ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="bg-yellow-100 p-4 rounded-full mb-4 animate-pulse">
                        <Lock className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Results are Pending</h2>
                    <p className="text-gray-500 text-center max-w-md">
                        The Star of the Month results have not been declared yet.
                        Your mentor will announce them soon!
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-sm text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                        <Clock className="w-4 h-4" />
                        <span>Check back later</span>
                    </div>
                </div>
            ) : winners.length > 0 ? (
                <div className="space-y-6">
                    {/* Celebration Button for Winner */}
                    {isMeWinner && !showPoster && (
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient rounded-xl p-8 text-center text-white shadow-xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold mb-2">You are the Star! 🌟</h2>
                                <p className="mb-6 text-indigo-100">Congratulations on your outstanding performance this month.</p>
                                <button
                                    onClick={handleCelebrate}
                                    className="px-8 py-3 bg-white text-indigo-600 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                                >
                                    <PartyPopper className="w-5 h-5" /> Celebrate & Get Certificate
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {winners.map(winner => (
                            <div key={winner.id} className={`relative rounded-2xl p-6 text-center shadow-lg overflow-hidden ${winner.id === currentUser.id ? 'bg-indigo-600 text-white ring-4 ring-yellow-400 ring-offset-2' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                <div className="flex flex-col items-center relative z-10">
                                    <div className="w-20 h-20 rounded-full p-1 mb-4 bg-gray-100">
                                        <div className="w-full h-full rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl font-bold border-2 border-white">
                                            {winner.name.charAt(0)}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{winner.name}</h3>
                                    <p className={`text-sm mb-4 ${winner.id === currentUser.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        {winner.id === currentUser.id ? 'You' : `Rank #1`}
                                    </p>

                                    <div className={`px-4 py-1 rounded-full text-sm font-bold ${winner.id === currentUser.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                                        {winner.finalScore.toFixed(1)}% Score
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Simple List for others */}
                    <Card className="max-w-3xl mx-auto">
                        <div className="p-4 border-b border-gray-100 font-bold text-gray-700">Top Performers</div>
                        <div className="divide-y divide-gray-100">
                            {results.slice(0, 10).map((student, idx) => (
                                <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className={student.id === currentUser.id ? 'font-bold text-indigo-600' : 'text-gray-700'}>
                                            {student.name} {student.id === currentUser.id && '(You)'}
                                        </span>
                                    </div>
                                    <span className="font-mono font-medium text-gray-600">{student.finalScore.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No stars calculated for this month yet.</p>
                </div>
            )}
        </div>
    );
};
export default StudentStarView;
