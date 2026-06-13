import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';
import { Star, Calendar, Trophy, Award, Download, Share2, PartyPopper, X, Lock, Clock } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, endOfMonth, isSameMonth, isSameYear, isAfter } from 'date-fns';
import { toPng } from 'html-to-image';
import { calculateStudentStarScores } from '../../utils/starCalculations';

const StudentStarView = () => {
    const { currentUser, students, attendance, activities, activitySubmissions, prayerRecords, specialPrayers, ramadanLogs, quranProgress, quranRecitations, classes, institutionSettings, starDeclarations, starConfigs, mentors, requireFeature } = useData();

    // Request heavy datasets On-Demand
    React.useEffect(() => {
        const un1 = requireFeature('attendance');
        const un2 = requireFeature('activities');
        const un3 = requireFeature('prayer');
        const un4 = requireFeature('quran');
        const un5 = requireFeature('ramadan');
        const un6 = requireFeature('star');
        
        return () => {
            un1(); un2(); un3(); un4(); un5(); un6();
        };
    }, [requireFeature]);

    // State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [showCelebration, setShowCelebration] = useState(false);
    const [showPoster, setShowPoster] = useState(false);
    const posterRef = useRef(null);

    // Config
    const globalConfig = institutionSettings?.starConfig || {
        attendance: true,
        activities: true,
        prayer: true,
    };

    const appliedConfig = useMemo(() => {
        let currentConfig = globalConfig;
        if (currentUser?.classId) {
            const customConfig = starConfigs?.find(c => c.classId === currentUser.classId)?.config;
            if (customConfig) {
                currentConfig = customConfig;
            }
        }
        return currentConfig;
    }, [globalConfig, starConfigs, currentUser?.classId]);

    const years = [new Date().getFullYear() - 1, new Date().getFullYear()];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // --- Calculation Logic (Mirrors Mentor Logic) ---
    const results = useMemo(() => {
        if (!currentUser?.classId) return [];

        // Determine if this class has a custom overriding config
        return calculateStudentStarScores({
            students, attendance, activities, activitySubmissions,
            prayerRecords, specialPrayers, ramadanLogs, quranProgress, quranRecitations,
            classes, selectedClassId: currentUser.classId, mentorClassIds: [],
            selectedMonth, selectedYear, config: appliedConfig,
            isMentorView: false
        });

    }, [
        students, attendance, activities, activitySubmissions, prayerRecords, specialPrayers,
        ramadanLogs, quranProgress, quranRecitations, currentUser, selectedMonth, selectedYear, appliedConfig, classes
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

                                {/* Dynamic Stat Boxes */}
                                {(() => {
                                    const winnerScores = isMeWinner ? winners.find(w => w.id === currentUser.id).scores : null;
                                    const stats = [];
                                    if (appliedConfig.attendance) stats.push({ label: 'Attd.', score: winnerScores?.attendance || 0 });
                                    if (appliedConfig.activities) stats.push({ label: 'Act.', score: winnerScores?.activities || 0 });
                                    if (appliedConfig.prayer) stats.push({ label: 'Pray', score: winnerScores?.prayer || 0 });
                                    if (appliedConfig.specialPrayer) stats.push({ label: 'S. Pray', score: winnerScores?.specialPrayer || 0 });
                                    if (appliedConfig.fasting) stats.push({ label: 'Fast', score: winnerScores?.fasting || 0 });
                                    if (appliedConfig.quran) stats.push({ label: 'Quran', score: winnerScores?.quran || 0 });
                                    if (appliedConfig.dailyQuran) stats.push({ label: 'D. Quran', score: winnerScores?.dailyQuran || 0 });

                                    // Dynamic safely mapped tailwind classes avoiding raw string interpolation for prod builds
                                    const gridClassMap = {
                                        1: 'grid-cols-1',
                                        2: 'grid-cols-2',
                                        3: 'grid-cols-3',
                                        4: 'grid-cols-2', // Wrap to two rows of 2
                                        5: 'grid-cols-3', // Wrap to two rows
                                        6: 'grid-cols-3'
                                    };

                                    const gClass = gridClassMap[stats.length] || 'grid-cols-3';

                                    return (
                                        <div className={`grid ${gClass} gap-2 w-full mb-6`}>
                                            {stats.map((stat, idx) => (
                                                <div key={idx} className="bg-white/10 rounded-lg p-2">
                                                    <div className="text-xl font-bold">{Math.round(stat.score)}%</div>
                                                    <div className="text-[10px] uppercase tracking-wider opacity-75">{stat.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
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
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2 md:gap-3">
                        <Star className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 fill-yellow-500" />
                        Class Stars
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium mt-0.5 md:mt-1">Meet the top performers of this month.</p>
                </div>
                <div className="flex bg-gray-50 border border-gray-200 rounded-2xl p-1.5 shadow-sm w-full md:w-auto">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="p-1 px-3 text-xs md:text-sm font-black uppercase tracking-widest text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer flex-1 md:flex-none"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <div className="w-px bg-gray-200 my-1.5"></div>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="p-1 px-3 text-xs md:text-sm font-black uppercase tracking-widest text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer flex-1 md:flex-none"
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
                        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-center text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                <Trophy className="w-48 h-48" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-2xl md:text-4xl font-black mb-2 drop-shadow-lg">You are the Star! 🌟</h2>
                                <p className="mb-6 text-indigo-100 text-sm md:text-base font-medium">Congratulations for your outstanding spiritual progress.</p>
                                <button
                                    onClick={handleCelebrate}
                                    className="px-8 py-3.5 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 mx-auto"
                                >
                                    <PartyPopper className="w-5 h-5" /> Get Your Certificate
                                </button>
                            </div>
                        </div>
                    )}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {winners.map(winner => (
                            <div key={winner.id} className={clsx(
                                "relative rounded-3xl p-6 text-center shadow-lg overflow-hidden transition-all hover:scale-[1.02]",
                                winner.id === currentUser.id 
                                    ? "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white ring-4 ring-yellow-400 ring-offset-4" 
                                    : "bg-white text-gray-800 border border-gray-100"
                            )}>
                                <div className="flex flex-col items-center relative z-10">
                                    <div className="w-20 h-20 rounded-full p-1 mb-4 bg-gray-100 shadow-inner">
                                        <div className="w-full h-full rounded-full bg-white text-indigo-600 flex items-center justify-center text-3xl font-black border-2 border-indigo-50">
                                            {winner.name.charAt(0)}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black mb-1">{winner.name}</h3>
                                    <p className={clsx("text-[10px] font-black uppercase tracking-widest mb-1", winner.id === currentUser.id ? 'text-indigo-200' : 'text-gray-400')}>
                                        {months[selectedMonth]} {selectedYear}
                                    </p>
                                    <p className={clsx("text-sm font-bold mb-4", winner.id === currentUser.id ? 'text-indigo-100' : 'text-gray-500')}>
                                        {winner.id === currentUser.id ? 'Winner (You)' : `Top Rank #1`}
                                    </p>

                                    <div className={clsx("px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider", winner.id === currentUser.id ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-700 shadow-sm')}>
                                        {winner.finalScore.toFixed(0)}% Score
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* My Individual Scores */}
                    {(() => {
                        const myStats = results.find(r => r.id === currentUser.id);
                        if (!myStats) return null;
                        
                        const stats = [];
                        if (appliedConfig.attendance) stats.push({ label: 'Attendance', score: myStats.scores.attendance || 0 });
                        if (appliedConfig.activities) stats.push({ label: 'Activities', score: myStats.scores.activities || 0 });
                        if (appliedConfig.prayer) stats.push({ label: 'Prayer', score: myStats.scores.prayer || 0 });
                        if (appliedConfig.specialPrayer) stats.push({ label: 'Sp. Prayer', score: myStats.scores.specialPrayer || 0 });
                        if (appliedConfig.fasting) stats.push({ label: 'Fasting', score: myStats.scores.fasting || 0 });
                        if (appliedConfig.quran) stats.push({ label: 'Quran Progress', score: myStats.scores.quran || 0 });
                        if (appliedConfig.dailyQuran) stats.push({ label: 'Daily Quran', score: myStats.scores.dailyQuran || 0 });

                        return (
                            <Card className="max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-6 bg-gradient-to-br from-indigo-50 to-white">
                                <div className="p-5 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                                            <Award className="w-5 h-5 text-indigo-500" />
                                            Your Performance This Month
                                        </h3>
                                        <p className="text-xs text-indigo-400 font-medium mt-1">Detailed breakdown of your individual scores</p>
                                    </div>
                                    <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-indigo-50 shrink-0 text-center">
                                        <span className="text-2xl font-black text-indigo-600 block leading-none">{myStats.finalScore.toFixed(1)}%</span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 block leading-none">Overall Score</span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {stats.map((stat, idx) => (
                                            <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-indigo-100 transition-colors">
                                                <div className="text-xl font-black text-gray-800 mb-1">{stat.score.toFixed(1)}%</div>
                                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        );
                    })()}

                    {/* Simple List for others */}
                    <Card className="max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                        <div className="p-5 border-b border-gray-50 font-black text-gray-400 text-[10px] uppercase tracking-widest">Other Top Performers</div>
                        <div className="divide-y divide-gray-50">
                            {results.slice(0, 10).map((student, idx) => {
                                const isMe = student.id === currentUser.id;
                                return (
                                    <div key={student.id} className={clsx("flex items-center justify-between p-4 px-5 transition-colors", isMe ? "bg-indigo-50" : "bg-white hover:bg-gray-50")}>
                                        <div className="flex items-center gap-4">
                                            <span className={clsx(
                                                "w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black",
                                                idx < 3 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400"
                                            )}>
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <span className={clsx("block text-sm font-black", isMe ? "text-indigo-700" : "text-gray-900")}>
                                                    {student.name}
                                                </span>
                                                {isMe && <span className="text-[8px] font-black uppercase tracking-tighter text-indigo-400 leading-none">Your Rank</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-black text-gray-900 leading-none">{student.finalScore.toFixed(0)}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-300">Score</span>
                                        </div>
                                    </div>
                                );
                            })}
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
