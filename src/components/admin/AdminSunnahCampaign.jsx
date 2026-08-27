import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Search, Users, Activity, BookHeart, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Custom hook for smooth count-up animation
const useCountUp = (endValue, duration = 2200) => {
    const [count, setCount] = useState(0);
    const prevEndRef = React.useRef(0);

    useEffect(() => {
        const startValue = prevEndRef.current;
        const targetValue = endValue || 0;
        prevEndRef.current = targetValue;

        if (startValue === targetValue) {
            setCount(targetValue);
            return;
        }

        let startTime = null;
        let animationFrameId;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out exponential formula for silky smooth deceleration
            const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const currentCount = Math.round(startValue + (targetValue - startValue) * easeOutExpo);

            setCount(currentCount);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [endValue, duration]);

    return count;
};

// Rolling digit counter (bottom-to-top update animation)
const SlidingCounter = ({ value }) => {
    const formatted = value.toLocaleString();
    const chars = formatted.split('');

    return (
        <div className="flex items-baseline text-6xl sm:text-7xl md:text-8xl font-black tracking-tight font-mono text-white drop-shadow-md select-none overflow-hidden py-1">
            {chars.map((char, index) => {
                if (char === ',') {
                    return (
                        <span key={`comma-${index}`} className="text-white/80">
                            ,
                        </span>
                    );
                }
                return (
                    <div
                        key={`col-${index}`}
                        className="relative h-[1.15em] overflow-hidden inline-flex items-center justify-center min-w-[0.58em]"
                    >
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={`digit-${index}-${char}`}
                                initial={{ y: "80%", opacity: 0 }}
                                animate={{ y: "0%", opacity: 1 }}
                                exit={{ y: "-80%", opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="inline-block leading-none"
                            >
                                {char}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};

const AdminSunnahCampaign = ({ isExpanded = false, onToggleExpand }) => {
    const { mentors = [], students = [], sunnahRecitations = [], classes = [], requireFeature } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [topLimit, setTopLimit] = useState(10);

    useEffect(() => {
        if (requireFeature) {
            return requireFeature('sunnah');
        }
    }, [requireFeature]);

    // Calculate total swalath recitations count across all students
    const totalSwalathCount = useMemo(() => {
        return sunnahRecitations.reduce((acc, sr) => acc + (Number(sr.count) || 0), 0);
    }, [sunnahRecitations]);

    // Smooth count-up animated value
    const animatedCount = useCountUp(totalSwalathCount, 2000);

    const rankings = useMemo(() => {
        const data = mentors.map(mentor => {
            const assignedClassIds = mentor.assignedClassIds || (mentor.classId ? [mentor.classId] : []);
            const mentorStudents = students.filter(s => 
                assignedClassIds.includes(s.classId) && 
                s.status === 'Active'
            );
            
            const mentorStudentIds = new Set(mentorStudents.map(s => s.id));
            const totalStudents = mentorStudents.length;

            let totalCount = 0;

            sunnahRecitations.forEach(sr => {
                if (mentorStudentIds.has(sr.studentId)) {
                    totalCount += (Number(sr.count) || 0);
                }
            });

            return {
                ...mentor,
                totalStudents,
                totalCount
            };
        });

        // Filter and sort
        let filteredData = data;
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredData = data.filter(m => m.name.toLowerCase().includes(lowerSearch));
        }

        return filteredData.sort((a, b) => {
            if (b.totalCount !== a.totalCount) {
                return b.totalCount - a.totalCount;
            }
            return a.name.localeCompare(b.name);
        });

    }, [mentors, students, sunnahRecitations, searchTerm]);

    const studentToppers = useMemo(() => {
        const studentStats = students.map(student => {
            let totalCount = 0;
            sunnahRecitations.forEach(sr => {
                if (sr.studentId === student.id) {
                    totalCount += (Number(sr.count) || 0);
                }
            });

            const classObj = classes.find(c => c.id === student.classId);
            const className = classObj ? classObj.name : 'Unknown Class';

            const mentorObj = mentors.find(m => (m.assignedClassIds || (m.classId ? [m.classId] : [])).includes(student.classId));
            const mentorName = mentorObj ? mentorObj.name : 'No Mentor';

            return {
                ...student,
                totalCount,
                className,
                mentorName
            };
        });

        const activeStudents = studentStats.filter(s => s.totalCount > 0 && s.status === 'Active');
        activeStudents.sort((a, b) => b.totalCount - a.totalCount);

        return activeStudents.slice(0, topLimit);
    }, [students, sunnahRecitations, classes, mentors, topLimit]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
                        <BookHeart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Sunnah Campaign Stats</h1>
                        <p className="text-sm text-gray-500">Rank mentors by their students' total Sunnah recitation count.</p>
                        <div className="text-xs text-rose-500 mt-1">
                            Debug Info: {sunnahRecitations.length} recitations, {students.length} students, {mentors.length} mentors loaded.
                        </div>
                    </div>
                </div>

                {onToggleExpand && (
                    <button
                        onClick={onToggleExpand}
                        className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                        title={isExpanded ? "Show Sidebar" : "Hide Sidebar & Expand Page"}
                    >
                        {isExpanded ? (
                            <>
                                <Minimize2 className="w-4 h-4 text-rose-600" />
                                <span>Show Sidebar</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-4 h-4 text-rose-600" />
                                <span>Expand View</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Grand Total Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-pink-600 to-rose-700 p-6 sm:p-8 text-white shadow-xl shadow-rose-500/20">
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -top-12 w-48 h-48 bg-rose-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden sm:block">
                    <BookHeart className="w-64 h-64 text-white" />
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-rose-100 border border-white/20">
                            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                            Overall Sunnah Campaign Recitations
                        </div>

                        <p className="text-sm sm:text-base font-medium text-rose-100">
                            Total Count of Whole Students' Swalath Recitations
                        </p>

                        <div className="flex items-baseline gap-3 pt-1 flex-wrap">
                            <SlidingCounter value={animatedCount} />
                            <span className="text-xl sm:text-2xl font-black text-rose-200 uppercase tracking-widest pb-1 sm:pb-3">
                                Swalaths
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search mentor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 shadow-sm"
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
                                <th className="px-6 py-4 text-center whitespace-nowrap bg-rose-50/50">Total Recitations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rankings.length > 0 ? (
                                rankings.map((mentor, index, arr) => {
                                    const rank = index === 0 ? 1 : 
                                        (mentor.totalCount === arr[index - 1].totalCount ? 
                                            arr.findIndex(m => m.totalCount === mentor.totalCount) + 1 : 
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
                                                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs shrink-0">
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
                                            <td className="px-6 py-4 text-center whitespace-nowrap bg-rose-50/30">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Activity className="w-4 h-4 text-rose-500" />
                                                    <span className="font-black text-rose-700 text-lg">
                                                        {mentor.totalCount.toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        No mentors found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Student Toppers */}
            <div className="flex justify-between items-center mt-12 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Student Toppers</h2>
                <select
                    value={topLimit}
                    onChange={(e) => setTopLimit(Number(e.target.value))}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 shadow-sm"
                >
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={50}>Top 50</option>
                    <option value={100}>Top 100</option>
                </select>
            </div>
            
            <Card className="overflow-hidden border border-gray-100 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center whitespace-nowrap">Rank</th>
                                <th className="px-6 py-4 whitespace-nowrap">Student</th>
                                <th className="px-6 py-4 whitespace-nowrap">Class</th>
                                <th className="px-6 py-4 whitespace-nowrap">Mentor</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap bg-rose-50/50">Total Recitations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {studentToppers.length > 0 ? (
                                studentToppers.map((student, index, arr) => {
                                    const rank = index === 0 ? 1 : 
                                        (student.totalCount === arr[index - 1].totalCount ? 
                                            arr.findIndex(s => s.totalCount === student.totalCount) + 1 : 
                                            index + 1);

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
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
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-gray-900">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {student.className}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {student.mentorName}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap bg-rose-50/30">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Activity className="w-4 h-4 text-rose-500" />
                                                    <span className="font-black text-rose-700 text-lg">
                                                        {student.totalCount.toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No students found.
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

export default AdminSunnahCampaign;
