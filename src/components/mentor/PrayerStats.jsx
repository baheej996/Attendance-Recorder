import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Trophy, Calendar, Users, Filter, BarChart2, Trash2, BookOpen, Copy, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import html2canvas from 'html2canvas';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import SpecialPrayerManager from './SpecialPrayerManager';
import MentorPrayerStats from './MentorPrayerStats';

const PrayerStats = () => {
    const { classes, students, prayerRecords, currentUser, updateClass, deletePrayerRecordsForStudents, classFeatureFlags, updateClassFeatureFlags, studentFeatureFlags } = useData();

    // Filter classes if mentor
    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    const isPrayerGloballyEnabled = studentFeatureFlags?.prayer !== false;
    const enabledClasses = availableClasses.filter(c => {
        const classFlag = classFeatureFlags?.find(f => f.classId === c.id);
        const isLocallyEnabled = classFlag ? classFlag.prayer !== false : true;
        return isPrayerGloballyEnabled && isLocallyEnabled;
    });

    const [selectedClassId, setSelectedClassId] = useState(enabledClasses[0]?.id || '');
    const [timeRange, setTimeRange] = useState('week'); // 'week' or 'month'
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'special' | 'settings'
    const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);

    // Add refs for image export
    const tableRef = React.useRef(null);

    // Add state for delete confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteClassSelection, setDeleteClassSelection] = useState('all');

    // Effect to ensure valid selection when switching tabs or changing settings
    useEffect(() => {
        if (activeTab === 'daily') {
            // If current selection is not in enabled list, switch to first enabled
            if (enabledClasses.length > 0 && !enabledClasses.find(c => c.id === selectedClassId)) {
                setSelectedClassId(enabledClasses[0].id);
            }
        }
    }, [activeTab, enabledClasses, selectedClassId]);

    // Filter students by class
    const classStudents = useMemo(() =>
        students.filter(s => s.classId === selectedClassId),
        [students, selectedClassId]
    );

    // Calculate Stats
    const stats = useMemo(() => {
        if (!selectedClassId) return null;

        const studentIds = classStudents.map(s => s.id);
        const filteredRecords = prayerRecords.filter(r => studentIds.includes(r.studentId));

        // 1. Top Performers (Total Prayers Offered)
        const leaderboard = classStudents.map(student => {
            const studentRecords = filteredRecords.filter(r => r.studentId === student.id);
            const totalPrayers = studentRecords.reduce((sum, r) => {
                return sum + Object.values(r.prayers || {}).filter(Boolean).length;
            }, 0);
            return { ...student, totalPrayers };
        }).sort((a, b) => b.totalPrayers - a.totalPrayers);

        return { leaderboard };
    }, [selectedClassId, classStudents, prayerRecords]);

    const handleToggleFeature = async (classId, currentStatus) => {
        const newStatus = !currentStatus;
        await updateClassFeatureFlags(classId, { prayer: newStatus });
    };

    const handleClearData = async () => {
        setIsDeleting(true);
        try {
            let studentIds = [];
            if (deleteClassSelection === 'all') {
                // Get all students across all available classes for this mentor
                const allAvailableClassIds = availableClasses.map(c => c.id);
                studentIds = students.filter(s => allAvailableClassIds.includes(s.classId)).map(s => s.id);
            } else {
                // Get students for specific selected class
                studentIds = students.filter(s => s.classId === deleteClassSelection).map(s => s.id);
            }

            if (studentIds.length > 0) {
                await deletePrayerRecordsForStudents(studentIds);
            }
            setIsDeleteModalOpen(false);
            setDeleteClassSelection('all'); // Reset selection
        } catch (error) {
            console.error("Failed to delete records:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const generatePrayerReport = async (type) => {
        if (!selectedClassId) return;

        const currentClass = enabledClasses.find(c => c.id === selectedClassId);
        const className = currentClass ? `${currentClass.name} - ${currentClass.division}` : '';
        const standardPrayers = [
            { id: 'fajr', label: 'Fajr' },
            { id: 'dhuhr', label: 'Dhuhr' },
            { id: 'asr', label: 'Asr' },
            { id: 'maghrib', label: 'Maghrib' },
            { id: 'isha', label: 'Isha' }
        ];

        // Sort boys first, then girls, then alphabetically
        const sortedStudents = [...classStudents].sort((a, b) => {
            if (a.gender === 'Boy' && b.gender !== 'Boy') return -1;
            if (a.gender !== 'Boy' && b.gender === 'Boy') return 1;
            return a.name.localeCompare(b.name);
        });

        const studentIds = sortedStudents.map(s => s.id);
        const baseDate = new Date(reportDate);

        let startDate, endDate, titlePrefix, displayDate;
        let isInterval = false;

        if (type === 'daily') {
            titlePrefix = 'Daily';
            displayDate = format(baseDate, 'dd MMM yyyy');
        } else if (type === 'weekly') {
            startDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Assuming Monday start
            endDate = endOfWeek(baseDate, { weekStartsOn: 1 });
            titlePrefix = 'Weekly';
            displayDate = `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM yyyy')}`;
            isInterval = true;
        } else if (type === 'monthly') {
            startDate = startOfMonth(baseDate);
            endDate = endOfMonth(baseDate);
            titlePrefix = 'Monthly';
            displayDate = format(baseDate, 'MMMM yyyy');
            isInterval = true;
        }

        // Filter relevant records
        let relevantRecords = [];
        if (isInterval) {
            const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate }).map(d => format(d, 'yyyy-MM-dd'));
            relevantRecords = prayerRecords.filter(r => studentIds.includes(r.studentId) && daysInInterval.includes(r.date));
        } else {
            relevantRecords = prayerRecords.filter(r => studentIds.includes(r.studentId) && r.date === reportDate);
        }

        const formatStudentList = () => {
            return sortedStudents.map(student => {
                let statusText = '';

                if (!isInterval) {
                    // Daily View
                    const record = relevantRecords.find(r => r.studentId === student.id);
                    const prayersDone = record && record.prayers ? record.prayers : {};
                    const completedStandard = standardPrayers.filter(p => prayersDone[p.id]);

                    if (completedStandard.length === 5) statusText = '5/5 ✅';
                    else if (completedStandard.length === 0) statusText = 'Not Submitted ❌';
                    else statusText = `(${completedStandard.map(p => p.label).join(', ')})`;
                } else {
                    // Weekly/Monthly Aggregation
                    const studentRecords = relevantRecords.filter(r => r.studentId === student.id);
                    const totalPrayers = studentRecords.reduce((sum, r) => sum + Object.values(r.prayers || {}).filter(Boolean).length, 0);
                    const totalPossible = (type === 'weekly' ? 7 : eachDayOfInterval({ start: startDate, end: endDate }).length) * 5;
                    statusText = `${totalPrayers}/${totalPossible} ✅`;
                }

                return `• ${student.name} - ${statusText}`;
            }).join('\n');
        };

        const reportText = `*${titlePrefix} Prayer Report: Class ${className}*\n*Date:* ${displayDate}\n\n${formatStudentList()}`;

        try {
            await navigator.clipboard.writeText(reportText);
            alert(`${titlePrefix} Report copied to clipboard!`);
        } catch (err) {
            console.error('Failed to copy report:', err);
            alert('Failed to copy report to clipboard.');
        }
    };
    const copyTableAsImage = async () => {
        if (!tableRef.current) return;
        try {
            const canvas = await html2canvas(tableRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

            if (!blob) {
                alert('Failed to generate image.');
                return;
            }

            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                alert('Table image copied to clipboard! You can now paste it into WhatsApp.');
            } catch (clipboardError) {
                console.error('Clipboard error:', clipboardError);
                alert('Browser prevented direct clipboard access. Please use Chrome/Edge or right-click to copy.');
            }
        } catch (error) {
            console.error('Error copying image:', error);
            alert(`Could not copy table as image:\n\n${error?.message || error}\n\nPlease try again.`);
        }
    };

    if (availableClasses.length === 0) return <div className="p-8 text-center text-gray-500">No classes assigned to you.</div>;

    const standardPrayers = [
        { id: 'fajr', label: 'Fajr' },
        { id: 'dhuhr', label: 'Dhuhr' },
        { id: 'asr', label: 'Asr' },
        { id: 'maghrib', label: 'Maghrib' },
        { id: 'isha', label: 'Isha' }
    ];

    // Get strictly sorted students for table render
    const displaySortedStudents = classStudents.sort((a, b) => {
        if (a.gender === 'Boy' && b.gender !== 'Boy') return -1;
        if (a.gender !== 'Boy' && b.gender === 'Boy') return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Daily Prayers</h1>
                    <p className="text-gray-500">Monitor class performance and spiritual habits</p>
                </div>

                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                            activeTab === 'daily' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <BarChart2 className="w-4 h-4" /> Daily
                    </button>
                    <button
                        onClick={() => setActiveTab('special')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                            activeTab === 'special' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <BookOpen className="w-4 h-4" /> Special
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                            activeTab === 'settings' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Users className="w-4 h-4" /> Settings
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleClearData}
                title="Clear Prayer Data"
                message={`Are you sure you want to delete all prayer records for ${deleteClassSelection === 'all' ? 'ALL assigned classes' : `Class ${availableClasses.find(c => c.id === deleteClassSelection)?.name || 'selected'}`}? This action cannot be undone.`}
                confirmText={isDeleting ? "Deleting..." : "Delete All Data"}
                isDanger={true}
            />

            {activeTab === 'daily' && (
                <>
                    {enabledClasses.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Prayer Chart is disabled</h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">None of your assigned classes have the Prayer Chart feature enabled.</p>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className="text-indigo-600 font-medium hover:text-indigo-700 underline"
                            >
                                Go to Settings to enable it
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-row items-center justify-between gap-1.5 sm:gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-full">
                                {/* Class Selector */}
                                <div className="flex bg-gray-100 px-2 py-1.5 rounded-lg items-center gap-1.5 flex-1 min-w-0">
                                    <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block" />
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[11px] sm:text-sm font-medium text-gray-700 w-full truncate cursor-pointer p-0"
                                    >
                                        {enabledClasses.map(c => (
                                            <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date Picker */}
                                <div className="flex items-center bg-white px-1 sm:px-2 py-1.5 border border-gray-200 rounded-lg shrink-0">
                                    <input
                                        type="date"
                                        value={reportDate}
                                        onChange={(e) => setReportDate(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[11px] sm:text-sm font-medium text-gray-700 w-[100px] sm:w-[125px] p-0 cursor-pointer"
                                    />
                                </div>

                                {/* Report Dropdown */}
                                <div className="relative shrink-0">
                                    <button
                                        onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                                        className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-sm font-semibold flex items-center gap-1 transition-colors border border-indigo-100 h-full whitespace-nowrap"
                                    >
                                        Report <ChevronDown className="w-3.5 h-3.5" />
                                    </button>

                                    {isReportDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setIsReportDropdownOpen(false)}
                                            ></div>
                                            <div className="absolute right-0 top-full mt-2 w-32 sm:w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 flex flex-col">
                                                <button
                                                    onClick={() => { generatePrayerReport('daily'); setIsReportDropdownOpen(false); }}
                                                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 text-left flex items-center gap-2 sm:gap-3"
                                                >
                                                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" /> Daily
                                                </button>
                                                <button
                                                    onClick={() => { generatePrayerReport('weekly'); setIsReportDropdownOpen(false); }}
                                                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 text-left flex items-center gap-2 sm:gap-3"
                                                >
                                                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" /> Weekly
                                                </button>
                                                <button
                                                    onClick={() => { generatePrayerReport('monthly'); setIsReportDropdownOpen(false); }}
                                                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 text-left flex items-center gap-2 sm:gap-3"
                                                >
                                                    <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" /> Monthly
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                {/* Main Table Area */}
                                <Card className="lg:col-span-2 overflow-hidden flex flex-col">
                                    <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-indigo-600" />
                                            Daily Register - {format(new Date(reportDate), 'dd MMM yyyy')}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => generatePrayerReport('daily')}
                                                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                                            >
                                                <Copy className="w-4 h-4" /> Copy Text
                                            </button>
                                            <button
                                                onClick={copyTableAsImage}
                                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors border border-indigo-200"
                                            >
                                                <Copy className="w-4 h-4" /> Copy Image
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto" ref={tableRef}>
                                        <div className="p-4 bg-white min-w-[600px]"> {/* Add padding inside ref for cleaner image bounds */}
                                            <div className="mb-4 text-center pb-2 border-b border-gray-100">
                                                <h2 className="text-lg font-bold text-gray-900">Prayer Register - Class {enabledClasses.find(c => c.id === selectedClassId)?.name}</h2>
                                                <p className="text-sm text-gray-500">{format(new Date(reportDate), 'EEEE, MMMM do, yyyy')}</p>
                                            </div>
                                            <table className="w-full text-left border-collapse border border-gray-200">
                                                <thead>
                                                    <tr className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                                        <th className="p-3 border border-gray-200 font-semibold w-6 text-center">No</th>
                                                        <th className="p-3 border border-gray-200 font-semibold">Student Name</th>
                                                        {standardPrayers.map((prayer) => (
                                                            <th key={prayer.id} className="p-3 border border-gray-200 font-semibold text-center w-16">{prayer.label}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 text-sm">
                                                    {displaySortedStudents.map((student, idx) => {
                                                        const record = prayerRecords.find(r => r.studentId === student.id && r.date === reportDate);
                                                        const prayersDone = record && record.prayers ? record.prayers : {};

                                                        return (
                                                            <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                                <td className="p-2.5 border border-gray-200 text-center text-gray-500 text-xs">{idx + 1}</td>
                                                                <td className="p-2.5 border border-gray-200 font-medium text-gray-900 border-r">{student.name}</td>
                                                                {standardPrayers.map((prayer) => (
                                                                    <td key={prayer.id} className="p-2.5 border border-gray-200 text-center">
                                                                        {prayersDone[prayer.id] ? (
                                                                            <span className="text-green-600 font-bold block text-center">✓</span>
                                                                        ) : (
                                                                            <span className="text-gray-300 block text-center">-</span>
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </Card>

                                {/* Unified Monthly Leaderboard & Student Details */}
                                <Card className="overflow-hidden lg:col-span-1 flex flex-col">
                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
                                        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-indigo-600" />
                                            Monthly Leaderboard & Details
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                                    <th className="p-4 font-semibold w-16 text-center">Rank</th>
                                                    <th className="p-4 font-semibold">Student</th>
                                                    <th className="p-4 font-semibold text-center hidden xl:table-cell">Total</th>
                                                    <th className="p-4 font-semibold text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 text-sm">
                                                {stats?.leaderboard.map((student, index) => {
                                                    const rank = index + 1;
                                                    return (
                                                        <tr key={student.id} className="hover:bg-gray-50 group transition-colors">
                                                            <td className="p-4 text-center align-middle">
                                                                <div className={clsx(
                                                                    "mx-auto w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                                    rank === 1 ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400 ring-offset-1" :
                                                                        rank === 2 ? "bg-gray-100 text-gray-700 ring-2 ring-gray-300 ring-offset-1" :
                                                                            rank === 3 ? "bg-orange-100 text-orange-700 ring-2 ring-orange-300 ring-offset-1" :
                                                                                "bg-gray-50 text-gray-500 font-medium"
                                                                )}>
                                                                    {rank}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div>
                                                                    <p className="font-bold text-gray-900 line-clamp-1">{student.name}</p>
                                                                    <p className="text-xs text-gray-500">{student.registerNo}</p>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-center font-bold text-indigo-600 text-base hidden xl:table-cell">
                                                                {student.totalPrayers}
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <span className={clsx(
                                                                    "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase whitespace-nowrap",
                                                                    student.totalPrayers >= 20 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                                )}>
                                                                    {student.totalPrayers >= 20 ? "Good" : "Needs Imp."}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        </>
                    )}
                </>
            )}

            {activeTab === 'special' && (
                <MentorPrayerStats />
            )}

            {activeTab === 'settings' && (
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* General Configuration */}
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Prayer Chart Configuration
                        </h3>
                        <p className="text-sm text-gray-500 mb-8 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            Enable or disable the Prayer Chart feature for your classes. When enabled, students in that class will see the Prayer Chart option in their dashboard and can log their daily prayers.
                        </p>

                        <div className="space-y-4">
                            {availableClasses.map(cls => {
                                const classFlag = classFeatureFlags?.find(f => f.classId === cls.id);
                                const isLocallyEnabled = classFlag ? classFlag.prayer !== false : true;
                                const isGloballyEnabled = studentFeatureFlags?.prayer !== false;
                                const safeEnabled = isLocallyEnabled && isGloballyEnabled;

                                return (
                                    <div key={cls.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${!isGloballyEnabled ? 'bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <div>
                                            <h4 className={`font-bold ${!isGloballyEnabled ? 'text-gray-500' : 'text-gray-800'}`}>Class {cls.name} - {cls.division}</h4>
                                            <p className="text-xs text-gray-500">
                                                {!isGloballyEnabled
                                                    ? 'Prayer Chart is disabled globally by Administrator'
                                                    : (safeEnabled ? 'Students can access Prayer Chart' : 'Prayer Chart hidden from students')}
                                            </p>
                                        </div>
                                        <button
                                            disabled={!isGloballyEnabled}
                                            onClick={() => handleToggleFeature(cls.id, isLocallyEnabled)}
                                            className={clsx(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                                safeEnabled ? "bg-indigo-600" : "bg-gray-200",
                                                !isGloballyEnabled && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <span
                                                className={clsx(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    safeEnabled ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Special Prayers Manager */}
                    <SpecialPrayerManager />

                    <Card className="p-6 border border-red-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            Data Management
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Permanently delete all prayer records for the selected classes. This action cannot be undone.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-red-50 p-4 rounded-xl border border-red-100">
                            <select
                                value={deleteClassSelection}
                                onChange={(e) => setDeleteClassSelection(e.target.value)}
                                className="w-full sm:w-auto px-4 py-2 border border-red-200 bg-white rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-red-500"
                            >
                                <option value="all">All Assigned Classes</option>
                                {availableClasses.map(c => (
                                    <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear Records
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PrayerStats;
