import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BookOpen, Moon, Calendar, Trophy, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getQuranProgressStats, TOTAL_QURAN_PAGES, TOTAL_JUZ } from '../../utils/quranUtils';
import { clsx } from 'clsx';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Ramadan 30-day constant
const RAMADAN_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

const StudentRamadan = () => {
    const { currentUser, quranProgress, updateQuranProgress, ramadanLogs, addRamadanLog, updateRamadanLog, deleteRamadanLog } = useData();

    // --- State: Quran Tracker ---
    const [pageInput, setPageInput] = useState('');
    const [currentQuranData, setCurrentQuranData] = useState(null);

    // --- State: Fasting Tracker ---
    const [selectedDay, setSelectedDay] = useState(null);
    const [fastingStatus, setFastingStatus] = useState(''); // 'Fasting', 'Not Fasting', 'Excused'

    // Load Data
    useEffect(() => {
        if (currentUser) {
            // Load Quran Progress
            const studentQuran = quranProgress.find(q => q.studentId === currentUser.id);
            if (studentQuran) {
                setCurrentQuranData(studentQuran);
                setPageInput(studentQuran.lastPage || '');
            } else {
                setCurrentQuranData({ lastPage: 0, completedKhatms: 0, juz: 1 });
            }
        }
    }, [currentUser, quranProgress]);

    // Handle Fasting Submission
    const handleFastingSubmit = async (day, status) => {
        if (!currentUser) return;

        const dateStr = new Date().toISOString().split('T')[0]; // Current date as record date
        const existingLog = ramadanLogs.find(log => log.studentId === currentUser.id && parseInt(log.dayNumber) === parseInt(day));

        if (status === 'Clear') {
            if (existingLog) {
                await deleteRamadanLog(existingLog.id);
            }
            setSelectedDay(null);
            return;
        }

        if (existingLog) {
            await updateRamadanLog(existingLog.id, { status, date: dateStr });
        } else {
            await addRamadanLog({
                studentId: currentUser.id,
                dayNumber: day,
                date: dateStr,
                status
            });
        }
        setSelectedDay(null);
    };

    // Get Log for a specific day
    const getLogForDay = (day) => {
        return ramadanLogs.find(log => log.studentId === currentUser?.id && parseInt(log.dayNumber) === parseInt(day));
    };

    // Handle Quran Page Update
    const handlePageSubmit = async () => {
        if (!currentUser || !pageInput) return;
        const newPage = parseInt(pageInput, 10);

        if (newPage < 1 || newPage > TOTAL_QURAN_PAGES) {
            alert(`Please enter a valid page number (1-${TOTAL_QURAN_PAGES})`);
            return;
        }

        const stats = getQuranProgressStats(newPage);

        let khatms = currentQuranData?.completedKhatms || 0;

        // If they wrap around (e.g. going from 600 back to 5) assume Khatm completed
        // Provide manual Khatm increment later if needed, but this is a simple auto-check
        if (currentQuranData && currentQuranData.lastPage > 550 && newPage < 50) {
            khatms += 1;
        }

        await updateQuranProgress(currentUser.id, {
            lastPage: newPage,
            juz: stats.currentJuz,
            completedKhatms: khatms
        });
    };

    const handleManualKhatm = async () => {
        if (!currentUser) return;
        if (window.confirm("Mark a full Khatm (Recitation of entire Quran) as complete?")) {
            await updateQuranProgress(currentUser.id, {
                lastPage: 1,
                juz: 1,
                completedKhatms: (currentQuranData?.completedKhatms || 0) + 1
            });
            setPageInput(1);
        }
    };

    if (!currentUser || !currentQuranData) return null;

    const stats = getQuranProgressStats(currentQuranData.lastPage || 1);
    const ringData = [
        { name: 'Completed', value: stats.globalProgressPercentage },
        { name: 'Remaining', value: 100 - stats.globalProgressPercentage }
    ];

    // Fasting Summary Stats
    const myLogs = ramadanLogs.filter(l => l.studentId === currentUser.id);
    const fastingCount = myLogs.filter(l => l.status === 'Fasting').length;
    const notFastingCount = myLogs.filter(l => l.status === 'Not Fasting').length;
    const excusedCount = myLogs.filter(l => l.status === 'Excused').length;

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Moon className="w-8 h-8 text-indigo-600" />
                Ramadan Tracker
            </h1>

            {/* --- Fasting Tracker Section --- */}
            <Card className="p-6 bg-white overflow-hidden shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-indigo-500" />
                            Daily Fasting Tracker
                        </h2>
                        <p className="text-gray-500">Mark your fasting status for all 30 days of Ramadan.</p>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 md:mt-0 text-[15px] font-bold">
                        <div className="relative flex items-center justify-center px-5 py-2.5 bg-[#FCFCFC] border-2 border-[#10B981] text-[#10B981] rounded-[14px] shadow-[0_4px_12px_0_rgba(16,185,129,0.3)]">
                            <span>Fasting</span>
                            <span className="absolute -top-3 -right-3 bg-white border-2 border-[#10B981] text-[#10B981] text-[13px] px-1.5 min-w-[26px] h-[26px] rounded-full flex items-center justify-center shadow-sm">
                                {fastingCount}
                            </span>
                        </div>
                        <div className="relative flex items-center justify-center px-5 py-2.5 bg-[#FCFCFC] border-2 border-[#EF4444] text-[#EF4444] rounded-[14px] shadow-[0_4px_12px_0_rgba(239,68,68,0.3)]">
                            <span>Not Fasting</span>
                            <span className="absolute -top-3 -right-3 bg-white border-2 border-[#EF4444] text-[#EF4444] text-[13px] px-1.5 min-w-[26px] h-[26px] rounded-full flex items-center justify-center shadow-sm">
                                {notFastingCount}
                            </span>
                        </div>
                        <div className="relative flex items-center justify-center px-5 py-2.5 bg-[#FCFCFC] border-2 border-[#D97706] text-[#D97706] rounded-[14px] shadow-[0_4px_12px_0_rgba(217,119,6,0.3)]">
                            <span>Excused</span>
                            <span className="absolute -top-3 -right-3 bg-white border-2 border-[#D97706] text-[#D97706] text-[13px] px-1.5 min-w-[26px] h-[26px] rounded-full flex items-center justify-center shadow-sm">
                                {excusedCount}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-5 md:grid-cols-10 gap-2 sm:gap-4 mt-6">
                    {RAMADAN_DAYS.map(day => {
                        const log = getLogForDay(day);
                        let bgClass = "bg-gray-50 hover:bg-indigo-50 border-gray-200 text-gray-600";
                        if (log?.status === 'Fasting') bgClass = "bg-green-100 border-green-300 text-green-800 font-bold shadow-sm";
                        if (log?.status === 'Not Fasting') bgClass = "bg-red-100 border-red-300 text-red-800 font-bold shadow-sm";
                        if (log?.status === 'Excused') bgClass = "bg-yellow-100 border-yellow-300 text-yellow-800 font-bold shadow-sm";

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(parseInt(day))}
                                className={clsx(
                                    "aspect-square flex flex-col items-center justify-center rounded-xl border transition-all duration-200",
                                    bgClass
                                )}
                            >
                                <span className="text-xs sm:text-sm font-medium opacity-80 mb-1">Day</span>
                                <span className="text-lg sm:text-xl">{day}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Day Selection Action Panel */}
                {selectedDay && (
                    <>
                        {/* Mobile Backdrop - NO BLUR */}
                        <div
                            className="fixed inset-0 bg-black/40 z-40 animate-fadeIn"
                            onClick={() => setSelectedDay(null)}
                        />

                        <div className="fixed inset-x-4 bottom-6 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-white rounded-3xl p-5 shadow-2xl animate-slideUp max-w-[340px] mx-auto border border-gray-100">
                            <h3 className="font-bold text-[17px] text-gray-800 mb-5 flex items-center justify-between px-1">
                                <span>Update status for Day {selectedDay}</span>
                                <button className="p-1.5 bg-gray-200 text-gray-600 hover:bg-gray-300 rounded-full transition-colors" onClick={() => setSelectedDay(null)}>
                                    <X className="w-5 h-5" />
                                </button>
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleFastingSubmit(selectedDay, 'Fasting')}
                                    className="py-3 px-2 bg-[#fdfdfd] border-2 border-[#10B981] text-[#10B981] font-semibold text-sm rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.25)] active:scale-95 transition-all outline-none"
                                >
                                    I'm Fasting
                                </button>
                                <button
                                    onClick={() => handleFastingSubmit(selectedDay, 'Not Fasting')}
                                    className="py-3 px-2 bg-[#fdfdfd] border-2 border-[#EF4444] text-[#EF4444] font-semibold text-sm rounded-xl shadow-[0_4px_14px_0_rgba(239,68,68,0.25)] active:scale-95 transition-all outline-none"
                                >
                                    Not Fasting
                                </button>
                                <button
                                    onClick={() => handleFastingSubmit(selectedDay, 'Excused')}
                                    className="py-3 px-2 bg-[#fdfdfd] border-2 border-[#F59E0B] text-[#F59E0B] font-semibold text-sm rounded-xl shadow-[0_4px_14px_0_rgba(245,158,11,0.25)] active:scale-95 transition-all outline-none"
                                >
                                    Excused
                                </button>
                                <button
                                    onClick={() => handleFastingSubmit(selectedDay, 'Clear')}
                                    className="py-3 px-2 bg-[#fdfdfd] border-2 border-[#6B7280] text-[#4B5563] font-semibold text-sm rounded-xl shadow-[0_4px_14px_0_rgba(107,114,128,0.25)] active:scale-95 transition-all outline-none"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Card>

            {/* --- Quran Tracker Section --- */}
            <div className="grid md:grid-cols-3 gap-6">

                {/* Visual Progress Card */}
                <Card className="p-6 md:col-span-1 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
                    <h2 className="text-xl font-bold mb-2 z-10 text-center">Current Khatm Progress</h2>
                    <div className="h-48 w-48 relative z-10 my-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ringData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill="#10B981" /> {/* Completed: Green */}
                                    <Cell fill="rgba(255,255,255,0.2)" /> {/* Remaining: Transparent white */}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">{Math.round(stats.globalProgressPercentage)}%</span>
                        </div>
                    </div>
                    {/* Background decorations */}
                    <BookOpen className="w-64 h-64 absolute -bottom-16 -right-16 text-white opacity-5 transform -rotate-12" />
                </Card>

                {/* Tracking Input Card */}
                <Card className="p-6 md:col-span-2 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-purple-600" />
                                Quran Recitation
                            </h2>
                            <div className="text-right">
                                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                                    {currentQuranData.completedKhatms}
                                </span>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Khatms</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <p className="text-sm text-purple-600 font-semibold mb-1">Current Page</p>
                                <p className="text-3xl font-bold text-purple-900">{stats.currentPage} <span className="text-lg font-medium text-purple-400">/ 604</span></p>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <p className="text-sm text-indigo-600 font-semibold mb-1">Current Juz / Para</p>
                                <p className="text-3xl font-bold text-indigo-900">{stats.currentJuz} <span className="text-lg font-medium text-indigo-400">/ 30</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Update Recitation Progress</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    placeholder="Enter current page number (1-604)"
                                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-purple-500 focus:border-purple-500 block p-3 pr-10 shadow-sm"
                                    min="1"
                                    max="604"
                                />
                                <span className="absolute right-3 top-3.5 text-gray-400 font-medium text-sm">/ 604</span>
                            </div>
                            <button
                                onClick={handlePageSubmit}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm transition-colors"
                            >
                                Save Page
                            </button>
                        </div>

                        <div className="mt-6 flex justify-between items-center border-t border-gray-200 pt-5">
                            <p className="text-sm text-gray-500 font-medium w-2/3">
                                Finished reciting the entire Quran? Mark a new Khatm to restart tracking from page 1.
                            </p>
                            <button
                                onClick={handleManualKhatm}
                                className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold rounded-lg border border-emerald-200 flex items-center gap-2 transition-colors shrink-0"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Mark Complete Khatm
                            </button>
                        </div>
                    </div>
                </Card>
            </div>

        </div>
    );
};

export default StudentRamadan;
