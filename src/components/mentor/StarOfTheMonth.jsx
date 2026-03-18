import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';
import { Star, Calendar, Settings, MessageSquare, Trophy, Award, CheckCircle, XCircle, Users, Unlock, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, getDaysInMonth, startOfMonth, endOfMonth, isSameMonth, isSameYear, parseISO, isAfter } from 'date-fns';

const StarOfTheMonth = () => {
    const { currentUser, students, attendance, activities, activitySubmissions, prayerRecords, specialPrayers, ramadanLogs, quranProgress, classes, institutionSettings, updateInstitutionSettings, starDeclarations, saveStarDeclaration, deleteStarDeclaration, starConfigs, updateStarConfig } = useData();
    const navigate = useNavigate();

    // State for selectors
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [selectedClassId, setSelectedClassId] = useState('All'); // New: Class Filter

    // Config State - Dynamic based on class selection
    const globalConfig = institutionSettings?.starConfig || {
        attendance: true, activities: true, prayer: true,
        specialPrayer: true, fasting: true, quran: true,
    };

    const config = useMemo(() => {
        if (selectedClassId === 'All') return globalConfig;
        const custom = starConfigs?.find(c => c.classId === selectedClassId)?.config;
        return custom || globalConfig;
    }, [selectedClassId, globalConfig, starConfigs]);

    const setConfig = async (newConfig) => {
        const updated = typeof newConfig === 'function' ? newConfig(config) : newConfig;
        if (selectedClassId === 'All') {
            await updateInstitutionSettings({ starConfig: updated });
        } else {
            await updateStarConfig(selectedClassId, updated);
        }
    };

    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Available Years (current - 1 to current)
    const years = [new Date().getFullYear() - 1, new Date().getFullYear()];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const mentorClassIds = currentUser?.assignedClassIds || [];

    // --- Calculation Logic ---
    const results = useMemo(() => {
        if (!mentorClassIds.length) return [];

        // Check if there's a custom config for this specific class
        return calculateStudentStarScores({
            students, attendance, activities, activitySubmissions,
            prayerRecords, specialPrayers, ramadanLogs, quranProgress,
            classes, selectedClassId, mentorClassIds,
            selectedMonth, selectedYear, config,
            isMentorView: true
        });

    }, [
        students, attendance, activities, activitySubmissions, prayerRecords, specialPrayers,
        ramadanLogs, quranProgress, selectedClassId,
        mentorClassIds, selectedMonth, selectedYear, config, classes
    ]);

    // Identification of Winners (Handle Ties)
    const maxScore = results.length > 0 ? results[0].finalScore : 0;
    const winners = results.filter(r => r.finalScore === maxScore && r.finalScore > 0);
    const others = results.filter(r => r.finalScore < maxScore || r.finalScore === 0);

    // Declaration Logic
    const isMonthCompleted = isAfter(new Date(), endOfMonth(new Date(selectedYear, selectedMonth)));

    // Check declaration status for the SELECTED class (if specific class selected)
    const getDeclarationStatus = () => {
        if (selectedClassId === 'All') return null;
        const decl = starDeclarations.find(d =>
            d.classId === selectedClassId &&
            d.month === selectedMonth &&
            d.year === selectedYear
        );
        // If month is completed, it's auto-declared unless explicitly hidden? 
        // Requirement: "website will declare it automatically when a month completes"
        // But mentor needs to declare manually BEFORE finishing.

        const isManuallyDeclared = decl?.status === 'Declared';
        const isVisible = isMonthCompleted || isManuallyDeclared;

        return { isManuallyDeclared, isVisible, isMonthCompleted };
    };

    const statusInfo = getDeclarationStatus();

    const handleDeclaration = async () => {
        if (selectedClassId === 'All') return;
        try {
            await saveStarDeclaration({ classId: selectedClassId, month: selectedMonth, year: selectedYear, status: 'Declared' });
        } catch (error) {
            console.error("Failed to declare results", error);
            alert("Database quota exceeded or network error. Please try again later.");
        }
    };

    const handleUndoDeclaration = async () => {
        if (selectedClassId === 'All') return;
        const decl = starDeclarations.find(d => d.classId === selectedClassId && d.month === selectedMonth && d.year === selectedYear);
        if (decl) {
            try {
                await deleteStarDeclaration(decl.id);
            } catch (error) {
                console.error("Failed to undo declaration", error);
                alert("Database quota exceeded or network error. Please try again later.");
            }
        }
    };

    const handleEncourage = (student) => {
        // Construct Star Data to be shared
        const starData = {
            studentName: student.name,
            className: student.className,
            scores: {
                attendance: student.scores.attendance,
                activities: student.scores.activities,
                prayer: student.scores.prayer,
                specialPrayer: student.scores.specialPrayer,
                fasting: student.scores.fasting,
                quran: student.scores.quran
            },
            month: months[selectedMonth],
            year: selectedYear
        };

        // Navigate to chat with state
        navigate('/mentor/chat', {
            state: {
                selectedStudentId: student.id,
                initialMessage: `Congratulations ${student.name}! You are the Star of the Month for ${months[selectedMonth]}! 🌟 Keep it up!`,
                starData: starData
            }
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                        Star of the Month
                    </h1>
                    <p className="text-gray-500">Celebrate your top performing students</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    {/* Class Filter */}
                    <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm w-full md:w-auto">
                        <div className="flex items-center px-2 text-gray-500 border-r border-gray-200">
                            <Users className="w-4 h-4" />
                        </div>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="p-2 text-sm font-medium text-gray-900 bg-transparent border-none focus:ring-0 cursor-pointer w-full md:min-w-[150px]"
                        >
                            <option value="All">All Classes</option>
                            {mentorClassIds.map(cid => {
                                const cls = classes.find(c => c.id === cid);
                                return cls ? <option key={cid} value={cid}>{cls.name} - {cls.division}</option> : null;
                            })}
                        </select>
                    </div>

                    <div className="flex gap-3">
                        {/* Month/Year Selector */}
                        <div className="flex flex-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="p-2 text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer flex-1"
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

                        {/* Settings Button */}
                        <button
                            onClick={() => setIsConfigOpen(!isConfigOpen)}
                            className={`p-2 rounded-lg border transition-colors flex items-center justify-center aspect-square ${isConfigOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Configuration Panel */}
            {isConfigOpen && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Calculating Criteria
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                            <span className="font-medium text-gray-700">Attendance</span>
                            <input
                                type="checkbox"
                                checked={config.attendance !== false}
                                onChange={(e) => setConfig(prev => ({ ...prev, attendance: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                            <span className="font-medium text-gray-700">Activities</span>
                            <input
                                type="checkbox"
                                checked={config.activities !== false}
                                onChange={(e) => setConfig(prev => ({ ...prev, activities: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                            <span className="font-medium text-gray-700">Prayer Chart</span>
                            <input
                                type="checkbox"
                                checked={config.prayer !== false}
                                onChange={(e) => setConfig(prev => ({ ...prev, prayer: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                            <span className="font-medium text-gray-700">Special Prayers</span>
                            <input
                                type="checkbox"
                                checked={config.specialPrayer !== false}
                                onChange={(e) => setConfig(prev => ({ ...prev, specialPrayer: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                            <span className="font-medium text-gray-700">Fasting</span>
                            <input
                                type="checkbox"
                                checked={config.fasting !== false}
                                onChange={(e) => setConfig(prev => ({ ...prev, fasting: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                            <span className="font-medium text-gray-700">Quran Recitation</span>
                            <input
                                type="checkbox"
                                checked={config.quran !== false}
                                onChange={(e) => setConfig(prev => ({ ...prev, quran: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* Declaration Controls - Only show if a specific class is selected */}
            {selectedClassId !== 'All' && statusInfo && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${statusInfo.isVisible ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {statusInfo.isVisible ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">
                                {statusInfo.isVisible ? 'Results are Visible' : 'Results are Hidden'}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {statusInfo.isMonthCompleted
                                    ? "This month has ended, so results are automatically visible."
                                    : statusInfo.isManuallyDeclared
                                        ? "You have manually declared these results."
                                        : "Students cannot see these results yet."}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!statusInfo.isMonthCompleted && (
                            <>
                                {!statusInfo.isManuallyDeclared ? (
                                    <button
                                        onClick={handleDeclaration}
                                        className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Declare Results
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleUndoDeclaration}
                                        className="px-4 py-2 bg-white text-red-600 border border-red-200 font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" /> Undo Declaration
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Winners Section */}
            {winners.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {winners.map(winner => (
                        <div key={winner.id} className="relative bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white text-center shadow-xl overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
                            {/* Decorative Background */}
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                                <Star className="absolute top-4 right-4 w-24 h-24 rotate-12" />
                                <Star className="absolute bottom-4 left-4 w-16 h-16 -rotate-12" />
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-white/20 p-1 mb-4 backdrop-blur-sm">
                                    <div className="w-full h-full rounded-full bg-white text-indigo-600 flex items-center justify-center text-3xl font-bold border-4 border-yellow-400">
                                        {winner.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/90 text-yellow-900 text-xs font-bold mb-2 shadow-sm">
                                    <Trophy className="w-3 h-3" /> STAR OF THE MONTH
                                </div>
                                <h2 className="text-2xl font-bold mb-1">{winner.name}</h2>
                                <p className="text-indigo-100 text-sm mb-1">Class {winner.className}</p>
                                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-4">{months[selectedMonth]} {selectedYear}</p>

                                <div className="flex flex-wrap justify-center gap-2 w-full mb-6">
                                    {config.attendance !== false && (
                                        <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm flex-1 min-w-[50px]">
                                            <div className="text-[16px] md:text-xl font-bold">{Math.round(winner.scores.attendance)}%</div>
                                            <div className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-75">Attd.</div>
                                        </div>
                                    )}
                                    {config.activities !== false && (
                                        <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm flex-1 min-w-[50px]">
                                            <div className="text-[16px] md:text-xl font-bold">{Math.round(winner.scores.activities)}%</div>
                                            <div className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-75">Act.</div>
                                        </div>
                                    )}
                                    {config.prayer !== false && (
                                        <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm flex-1 min-w-[50px]">
                                            <div className="text-[16px] md:text-xl font-bold">{Math.round(winner.scores.prayer)}%</div>
                                            <div className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-75">Daily Pray</div>
                                        </div>
                                    )}
                                    {config.specialPrayer !== false && (
                                        <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm flex-1 min-w-[50px]">
                                            <div className="text-[16px] md:text-xl font-bold">{Math.round(winner.scores.specialPrayer)}%</div>
                                            <div className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-75">Spc. Pray</div>
                                        </div>
                                    )}
                                    {config.fasting !== false && (
                                        <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm flex-1 min-w-[50px]">
                                            <div className="text-[16px] md:text-xl font-bold">{Math.round(winner.scores.fasting)}%</div>
                                            <div className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-75">Fast</div>
                                        </div>
                                    )}
                                    {config.quran !== false && (
                                        <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm flex-1 min-w-[50px]">
                                            <div className="text-[16px] md:text-xl font-bold">{Math.round(winner.scores.quran)}%</div>
                                            <div className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-75">Quran</div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleEncourage(winner)}
                                    className="w-full py-2.5 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Encourage
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No Data Available</p>
                    <p className="text-sm">There is no sufficient data to calculate the star for this month yet.</p>
                </div>
            )}

            {/* Leaderboard */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <Award className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-900">Leaderboard</h3>
                    <span className="text-xs text-gray-500 font-normal ml-auto">Top 20 Students</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Rank</th>
                                <th className="px-6 py-3">Student</th>
                                {config.attendance !== false && <th className="px-6 py-3 text-center">Attendance</th>}
                                {config.activities !== false && <th className="px-6 py-3 text-center">Activities</th>}
                                {config.prayer !== false && <th className="px-6 py-3 text-center">Daily Pray</th>}
                                {config.specialPrayer !== false && <th className="px-6 py-3 text-center">Spec. Pray</th>}
                                {config.fasting !== false && <th className="px-6 py-3 text-center">Fasting</th>}
                                {config.quran !== false && <th className="px-6 py-3 text-center">Quran</th>}
                                <th className="px-6 py-3 text-center">Overall Score</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {[...winners, ...others].slice(0, 20).map((student, index) => (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-gray-100 text-gray-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'text-gray-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{student.name}</div>
                                        <div className="text-xs text-gray-500">Class {student.className}</div>
                                    </td>
                                    {config.attendance !== false && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-medium">{Math.round(student.scores.attendance)}%</div>
                                            <div className="text-xs text-gray-400">{student.scores.present} Days</div>
                                        </td>
                                    )}
                                    {config.activities !== false && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-medium">{Math.round(student.scores.activities)}%</div>
                                            <div className="text-xs text-gray-400">{student.scores.activitiesCompleted} Done</div>
                                        </td>
                                    )}
                                    {config.prayer !== false && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-medium">{Math.round(student.scores.prayer)}%</div>
                                            <div className="text-xs text-gray-400">{student.scores.prayersPerformed} Prayers</div>
                                        </td>
                                    )}
                                    {config.specialPrayer !== false && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-medium">{Math.round(student.scores.specialPrayer)}%</div>
                                            <div className="text-xs text-gray-400">{student.scores.specialPrayersPerformed} Spc. Prayers</div>
                                        </td>
                                    )}
                                    {config.fasting !== false && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-medium">{Math.round(student.scores.fasting)}%</div>
                                            <div className="text-xs text-gray-400">{student.scores.fastsCompleted} Days</div>
                                        </td>
                                    )}
                                    {config.quran !== false && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-medium">{Math.round(student.scores.quran)}%</div>
                                            <div className="text-xs text-gray-400">{student.scores.quranPages} Pages</div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                            {student.finalScore.toFixed(1)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEncourage(student)}
                                            className="text-indigo-600 hover:text-indigo-700 font-medium text-xs hover:underline"
                                        >
                                            Message
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default StarOfTheMonth;
