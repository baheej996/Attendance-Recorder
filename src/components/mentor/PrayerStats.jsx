import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import {
    Trophy,
    Calendar,
    Users,
    Filter,
    BarChart2,
    Trash2,
    BookOpen,
    Copy,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Check,
    CheckCheck,
    Pencil,
    Sparkles,
    Loader2,
    RotateCcw
} from 'lucide-react';
import { clsx } from 'clsx';
import {
    format,
    subDays,
    addDays,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    startOfMonth,
    endOfMonth,
    isAfter,
    startOfToday
} from 'date-fns';
import html2canvas from 'html2canvas';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Toast } from '../ui/Toast';
import SpecialPrayerManager from './SpecialPrayerManager';
import MentorPrayerStats from './MentorPrayerStats';
import { EditPrayerModal } from './EditPrayerModal';

const PrayerStats = () => {
    const {
        classes,
        students,
        prayerRecords,
        currentUser,
        updateClass,
        addPrayerRecord,
        batchAddPrayerRecords,
        specialPrayers,
        deletePrayerRecordsForStudents,
        classFeatureFlags,
        updateClassFeatureFlags,
        studentFeatureFlags,
        requireFeature
    } = useData();

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
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'special' | 'settings'
    const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
    const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);

    // Edit modal state
    const [editingStudent, setEditingStudent] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [savingPrayerKey, setSavingPrayerKey] = useState(null);
    const [toast, setToast] = useState(null);

    // Bulk action confirmation modal state
    const [bulkModalConfig, setBulkModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        isDanger: false,
        onConfirm: () => {}
    });

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

    // Subscribe to prayer records on mount
    useEffect(() => {
        return requireFeature('prayer');
    }, [requireFeature]);

    // Filter students by class
    const classStudents = useMemo(() =>
        students.filter(s => s.classId === selectedClassId && s.status === 'Active'),
        [students, selectedClassId]
    );

    const standardPrayers = [
        { id: 'fajr', label: 'Fajr', arabic: 'الفجر' },
        { id: 'dhuhr', label: 'Dhuhr', arabic: 'الظهر' },
        { id: 'asr', label: 'Asr', arabic: 'العصر' },
        { id: 'maghrib', label: 'Maghrib', arabic: 'المغرب' },
        { id: 'isha', label: 'Isha', arabic: 'العشاء' }
    ];

    const today = startOfToday();
    const currentDateObj = new Date(reportDate);
    const isToday = isSameDay(currentDateObj, today);
    const isFutureDate = isAfter(currentDateObj, today);

    // Calculate Stats
    const stats = useMemo(() => {
        if (!selectedClassId) return null;

        const studentIds = classStudents.map(s => s.id);
        const filteredRecords = prayerRecords.filter(r => studentIds.includes(r.studentId));

        // 1. Top Performers (Total Prayers Offered)
        const sortedStudents = classStudents.map(student => {
            const studentRecords = filteredRecords.filter(r => r.studentId === student.id);
            const totalPrayers = studentRecords.reduce((sum, r) => {
                return sum + Object.values(r.prayers || {}).filter(Boolean).length;
            }, 0);
            return { ...student, totalPrayers };
        }).sort((a, b) => b.totalPrayers - a.totalPrayers);

        // Compute dense ranks (handles ties: 1, 2, 2, 3...)
        let currentRank = 1;
        for (let i = 0; i < sortedStudents.length; i++) {
            if (i > 0 && sortedStudents[i].totalPrayers !== sortedStudents[i - 1].totalPrayers) {
                currentRank++;
            }
            sortedStudents[i].rank = currentRank;
        }

        return { leaderboard: sortedStudents };
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
                const allAvailableClassIds = availableClasses.map(c => c.id);
                studentIds = students.filter(s => allAvailableClassIds.includes(s.classId) && s.status === 'Active').map(s => s.id);
            } else {
                studentIds = students.filter(s => s.classId === deleteClassSelection && s.status === 'Active').map(s => s.id);
            }

            if (studentIds.length > 0) {
                await deletePrayerRecordsForStudents(studentIds);
            }
            setIsDeleteModalOpen(false);
            setDeleteClassSelection('all');
            setToast({ message: 'Prayer records cleared successfully', type: 'success' });
        } catch (error) {
            console.error("Failed to delete records:", error);
            setToast({ message: 'Failed to delete records', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    // Date Step Helper
    const handleStepDate = (delta) => {
        const next = delta > 0 ? addDays(currentDateObj, 1) : subDays(currentDateObj, 1);
        setReportDate(format(next, 'yyyy-MM-dd'));
    };

    // Quick toggle prayer for a student directly from the table
    const handleToggleStudentPrayer = async (student, prayerId) => {
        if (isFutureDate) {
            setToast({ message: 'Cannot mark prayers for future dates', type: 'error' });
            return;
        }

        const existingRecord = prayerRecords.find(r => r.studentId === student.id && r.date === reportDate);
        const currentPrayers = { ...(existingRecord?.prayers || {}) };

        // Handle both full id ('fajr') and single letter ('f') for backwards compatibility
        const currentVal = !!(currentPrayers[prayerId] || currentPrayers[prayerId[0]]);
        const nextVal = !currentVal;

        currentPrayers[prayerId] = nextVal;
        if (currentPrayers[prayerId[0]] !== undefined) {
            currentPrayers[prayerId[0]] = nextVal;
        }

        const key = `${student.id}_${prayerId}`;
        setSavingPrayerKey(key);

        try {
            await addPrayerRecord({
                studentId: student.id,
                classId: student.classId,
                date: reportDate,
                prayers: currentPrayers,
                updatedBy: currentUser?.id,
                updatedByRole: currentUser?.role || 'mentor'
            });
        } catch (err) {
            console.error("Failed to toggle prayer:", err);
            setToast({ message: 'Failed to update prayer record', type: 'error' });
        } finally {
            setSavingPrayerKey(null);
        }
    };

    // Quick mark all 5 prayers or clear for a single student
    const handleQuickMarkStudentAll = async (student, shouldMarkAll = true) => {
        if (isFutureDate) {
            setToast({ message: 'Cannot mark prayers for future dates', type: 'error' });
            return;
        }

        const existingRecord = prayerRecords.find(r => r.studentId === student.id && r.date === reportDate);
        const currentPrayers = { ...(existingRecord?.prayers || {}) };

        standardPrayers.forEach(p => {
            currentPrayers[p.id] = shouldMarkAll;
            if (currentPrayers[p.id[0]] !== undefined) {
                currentPrayers[p.id[0]] = shouldMarkAll;
            }
        });

        const key = `${student.id}_all`;
        setSavingPrayerKey(key);

        try {
            await addPrayerRecord({
                studentId: student.id,
                classId: student.classId,
                date: reportDate,
                prayers: currentPrayers,
                updatedBy: currentUser?.id,
                updatedByRole: currentUser?.role || 'mentor'
            });
            setToast({
                message: shouldMarkAll
                    ? `Marked 5/5 for ${student.name}`
                    : `Cleared prayers for ${student.name}`,
                type: 'success'
            });
        } catch (err) {
            console.error("Failed to quick mark student:", err);
            setToast({ message: 'Failed to update prayers', type: 'error' });
        } finally {
            setSavingPrayerKey(null);
        }
    };

    // Open Edit modal for a student
    const handleOpenEditModal = (student) => {
        setEditingStudent(student);
        setIsEditModalOpen(true);
    };

    // Save from Edit Modal
    const handleSaveEditModal = async (recordData) => {
        await addPrayerRecord({
            ...recordData,
            updatedBy: currentUser?.id,
            updatedByRole: currentUser?.role || 'mentor'
        });
        setToast({
            message: `Prayer entry updated for ${editingStudent?.name}`,
            type: 'success'
        });
    };

    // Bulk class-wide actions
    const triggerBulkAction = (actionType) => {
        setIsBulkDropdownOpen(false);

        if (isFutureDate) {
            setToast({ message: 'Cannot mark prayers for future dates', type: 'error' });
            return;
        }

        const currentClass = enabledClasses.find(c => c.id === selectedClassId);
        const classLabel = currentClass ? `Class ${currentClass.name} - ${currentClass.division}` : 'selected class';
        const displayDate = format(new Date(reportDate), 'dd MMM yyyy');

        if (actionType === 'all_5') {
            setBulkModalConfig({
                isOpen: true,
                title: 'Mark All Students 5/5',
                message: `Are you sure you want to mark all 5 daily prayers as recited for ALL active students in ${classLabel} on ${displayDate}?`,
                confirmText: 'Mark 5/5 for All',
                isDanger: false,
                onConfirm: async () => {
                    const recordsList = classStudents.map(student => {
                        const existing = prayerRecords.find(r => r.studentId === student.id && r.date === reportDate);
                        const prayers = { ...(existing?.prayers || {}) };
                        standardPrayers.forEach(p => {
                            prayers[p.id] = true;
                            if (prayers[p.id[0]] !== undefined) prayers[p.id[0]] = true;
                        });
                        return {
                            studentId: student.id,
                            classId: student.classId,
                            date: reportDate,
                            prayers,
                            updatedBy: currentUser?.id,
                            updatedByRole: currentUser?.role || 'mentor'
                        };
                    });

                    await batchAddPrayerRecords(recordsList);
                    setToast({
                        message: `Marked 5/5 for all ${classStudents.length} students!`,
                        type: 'success'
                    });
                }
            });
        } else if (actionType === 'dhuhr_all') {
            setBulkModalConfig({
                isOpen: true,
                title: 'Mark Dhuhr for All Students',
                message: `Mark Dhuhr prayer as completed for all students in ${classLabel} on ${displayDate}? (Useful when students prayed in congregation)`,
                confirmText: 'Mark Dhuhr',
                isDanger: false,
                onConfirm: async () => {
                    const recordsList = classStudents.map(student => {
                        const existing = prayerRecords.find(r => r.studentId === student.id && r.date === reportDate);
                        const prayers = { ...(existing?.prayers || {}) };
                        prayers.dhuhr = true;
                        if (prayers.d !== undefined) prayers.d = true;

                        return {
                            studentId: student.id,
                            classId: student.classId,
                            date: reportDate,
                            prayers,
                            updatedBy: currentUser?.id,
                            updatedByRole: currentUser?.role || 'mentor'
                        };
                    });

                    await batchAddPrayerRecords(recordsList);
                    setToast({
                        message: `Marked Dhuhr for all students!`,
                        type: 'success'
                    });
                }
            });
        } else if (actionType === 'clear_all') {
            setBulkModalConfig({
                isOpen: true,
                title: 'Clear Daily Records for Class',
                message: `Are you sure you want to clear daily prayer entries for all students in ${classLabel} on ${displayDate}?`,
                confirmText: 'Clear Records',
                isDanger: true,
                onConfirm: async () => {
                    const recordsList = classStudents.map(student => {
                        const existing = prayerRecords.find(r => r.studentId === student.id && r.date === reportDate);
                        const prayers = { ...(existing?.prayers || {}) };
                        standardPrayers.forEach(p => {
                            prayers[p.id] = false;
                            if (prayers[p.id[0]] !== undefined) prayers[p.id[0]] = false;
                        });
                        return {
                            studentId: student.id,
                            classId: student.classId,
                            date: reportDate,
                            prayers,
                            updatedBy: currentUser?.id,
                            updatedByRole: currentUser?.role || 'mentor'
                        };
                    });

                    await batchAddPrayerRecords(recordsList);
                    setToast({
                        message: `Cleared prayers for this date.`,
                        type: 'info'
                    });
                }
            });
        }
    };

    const generatePrayerReport = async (type) => {
        if (!selectedClassId) return;

        const currentClass = enabledClasses.find(c => c.id === selectedClassId);
        const className = currentClass ? `${currentClass.name} - ${currentClass.division}` : '';

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
            startDate = startOfWeek(baseDate, { weekStartsOn: 1 });
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
                    const record = relevantRecords.find(r => r.studentId === student.id);
                    const prayersDone = record && record.prayers ? record.prayers : {};
                    const completedStandard = standardPrayers.filter(p => prayersDone[p.id] || prayersDone[p.id[0]]);

                    if (completedStandard.length === 5) statusText = '5/5 ✅';
                    else if (completedStandard.length === 0) statusText = 'Not Submitted ❌';
                    else statusText = `(${completedStandard.map(p => p.label).join(', ')})`;
                } else {
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
            setToast({ message: `${titlePrefix} Report copied to clipboard!`, type: 'success' });
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
                setToast({ message: 'Table image copied to clipboard!', type: 'success' });
            } catch (clipboardError) {
                console.error('Clipboard error:', clipboardError);
                alert('Browser prevented direct clipboard access. Please use Chrome/Edge.');
            }
        } catch (error) {
            console.error('Error copying image:', error);
            alert(`Could not copy table as image:\n\n${error?.message || error}`);
        }
    };

    if (availableClasses.length === 0) {
        return <div className="p-8 text-center text-gray-500 font-medium">No classes assigned to you.</div>;
    }

    // Get strictly sorted students for table render
    const displaySortedStudents = [...classStudents].sort((a, b) => {
        if (a.gender === 'Boy' && b.gender !== 'Boy') return -1;
        if (a.gender !== 'Boy' && b.gender === 'Boy') return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-200">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Calendar className="w-7 h-7 text-indigo-600" />
                        Prayer Chart
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Record, monitor and edit student daily prayers and spiritual consistency
                    </p>
                </div>

                <div className="flex items-center bg-gray-100 p-1 rounded-xl shadow-inner">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={clsx(
                            "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                            activeTab === 'daily' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <BarChart2 className="w-4 h-4" /> Daily Register
                    </button>
                    <button
                        onClick={() => setActiveTab('special')}
                        className={clsx(
                            "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                            activeTab === 'special' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <BookOpen className="w-4 h-4" /> Special Prayers
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={clsx(
                            "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                            activeTab === 'settings' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Users className="w-4 h-4" /> Settings
                    </button>
                </div>
            </div>

            {/* Bulk Action Confirmation Modal */}
            <ConfirmationModal
                isOpen={bulkModalConfig.isOpen}
                onClose={() => setBulkModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={bulkModalConfig.onConfirm}
                title={bulkModalConfig.title}
                message={bulkModalConfig.message}
                confirmText={bulkModalConfig.confirmText}
                isDanger={bulkModalConfig.isDanger}
            />

            {/* Delete All Data Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleClearData}
                title="Clear Prayer Data"
                message={`Are you sure you want to delete all prayer records for ${deleteClassSelection === 'all' ? 'ALL assigned classes' : `Class ${availableClasses.find(c => c.id === deleteClassSelection)?.name || 'selected'}`}? This action cannot be undone.`}
                confirmText={isDeleting ? "Deleting..." : "Delete All Data"}
                isDanger={true}
            />

            {/* Edit Prayer Modal for Selected Student */}
            {isEditModalOpen && editingStudent && (
                <EditPrayerModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingStudent(null);
                    }}
                    student={editingStudent}
                    date={reportDate}
                    onDateChange={(newDate) => setReportDate(newDate)}
                    prayerRecords={prayerRecords}
                    specialPrayers={specialPrayers}
                    classes={classes}
                    onSave={handleSaveEditModal}
                />
            )}

            {/* DAILY TAB */}
            {activeTab === 'daily' && (
                <>
                    {enabledClasses.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900">Prayer Chart is disabled</h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
                                None of your assigned classes have the Prayer Chart feature enabled.
                            </p>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className="px-5 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-colors"
                            >
                                Go to Settings to enable it
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 md:space-y-6">
                            {/* Control Bar: Class Filter, Date Nav, Bulk Actions, Report */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm">
                                
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {/* Class Selector */}
                                    <div className="flex bg-gray-100 px-3 py-2 rounded-xl items-center gap-2 flex-1 min-w-[140px] max-w-xs">
                                        <Filter className="w-4 h-4 text-gray-500 shrink-0 hidden sm:block" />
                                        <select
                                            value={selectedClassId}
                                            onChange={(e) => setSelectedClassId(e.target.value)}
                                            className="bg-transparent border-none outline-none text-xs sm:text-sm font-bold text-gray-800 w-full truncate cursor-pointer p-0"
                                        >
                                            {enabledClasses.map(c => (
                                                <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date Controls with Prev / Next / Today */}
                                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shrink-0 shadow-xs">
                                        <button
                                            type="button"
                                            onClick={() => handleStepDate(-1)}
                                            className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
                                            title="Previous Day"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>

                                        <div className="flex items-center gap-1.5 px-2">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-600 hidden sm:block" />
                                            <input
                                                type="date"
                                                value={reportDate}
                                                onChange={(e) => setReportDate(e.target.value)}
                                                className="bg-transparent border-none outline-none text-xs sm:text-sm font-bold text-gray-800 cursor-pointer p-0 w-[110px] sm:w-[125px]"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleStepDate(1)}
                                            disabled={isToday}
                                            className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={isToday ? "Cannot select future dates" : "Next Day"}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>

                                        {!isToday && (
                                            <button
                                                type="button"
                                                onClick={() => setReportDate(format(new Date(), 'yyyy-MM-dd'))}
                                                className="ml-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                                            >
                                                Today
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side Actions: Class Actions & Reports */}
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    
                                    {/* Class-Wide Bulk Quick Actions */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                                            disabled={isFutureDate}
                                            className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors border border-emerald-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <Sparkles className="w-4 h-4 text-emerald-600" />
                                            <span>Class Actions</span>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>

                                        {isBulkDropdownOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setIsBulkDropdownOpen(false)}
                                                ></div>
                                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                                                    <div className="px-3.5 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                                        Bulk Mark for Class
                                                    </div>
                                                    <button
                                                        onClick={() => triggerBulkAction('all_5')}
                                                        className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 text-left flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                                                        Mark All Students 5/5
                                                    </button>
                                                    <button
                                                        onClick={() => triggerBulkAction('dhuhr_all')}
                                                        className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-800 text-left flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <Check className="w-4 h-4 text-amber-500" />
                                                        Mark Dhuhr for All
                                                    </button>
                                                    <div className="my-1 border-t border-gray-100"></div>
                                                    <button
                                                        onClick={() => triggerBulkAction('clear_all')}
                                                        className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                                                        Clear Class for This Date
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Report Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors border border-indigo-100 cursor-pointer"
                                        >
                                            <Copy className="w-4 h-4 text-indigo-600" />
                                            <span>Report</span>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>

                                        {isReportDropdownOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setIsReportDropdownOpen(false)}
                                                ></div>
                                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                                                    <div className="px-3.5 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                                        WhatsApp Text Reports
                                                    </div>
                                                    <button
                                                        onClick={() => { generatePrayerReport('daily'); setIsReportDropdownOpen(false); }}
                                                        className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 text-left flex items-center gap-2.5"
                                                    >
                                                        <Calendar className="w-4 h-4 text-indigo-500" /> Daily Text Report
                                                    </button>
                                                    <button
                                                        onClick={() => { generatePrayerReport('weekly'); setIsReportDropdownOpen(false); }}
                                                        className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 text-left flex items-center gap-2.5"
                                                    >
                                                        <Calendar className="w-4 h-4 text-indigo-500" /> Weekly Text Report
                                                    </button>
                                                    <button
                                                        onClick={() => { generatePrayerReport('monthly'); setIsReportDropdownOpen(false); }}
                                                        className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 text-left flex items-center gap-2.5"
                                                    >
                                                        <Copy className="w-4 h-4 text-indigo-500" /> Monthly Text Report
                                                    </button>
                                                    <div className="my-1 border-t border-gray-100"></div>
                                                    <button
                                                        onClick={() => { copyTableAsImage(); setIsReportDropdownOpen(false); }}
                                                        className="px-4 py-2.5 text-xs font-bold text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 text-left flex items-center gap-2.5"
                                                    >
                                                        <Copy className="w-4 h-4 text-emerald-600" /> Copy Table Image
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Grid: Table + Leaderboard */}
                            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6 items-start">
                                
                                {/* Main Daily Table Card */}
                                <Card className="xl:col-span-3 overflow-hidden flex flex-col shadow-sm rounded-2xl border-gray-100">
                                    <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-indigo-50/30">
                                        <div>
                                            <h3 className="font-black text-gray-900 flex items-center gap-2 text-base">
                                                <Calendar className="w-5 h-5 text-indigo-600" />
                                                Daily Prayer Register
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {format(new Date(reportDate), 'EEEE, dd MMMM yyyy')} • Click any prayer to mark/unmark
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-xs">
                                                {classStudents.length} Students
                                            </span>
                                        </div>
                                    </div>

                                    {/* Table View */}
                                    <div className="overflow-x-auto" ref={tableRef}>
                                        <div className="min-w-[640px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-100">
                                                        <th className="p-3.5 font-bold w-12 text-center">No</th>
                                                        <th className="p-3.5 font-bold">Student Name</th>
                                                        {standardPrayers.map((prayer) => (
                                                            <th key={prayer.id} className="p-3.5 font-bold text-center w-14">
                                                                <div className="flex flex-col items-center">
                                                                    <span>{prayer.label}</span>
                                                                    <span className="text-[9px] text-gray-400 font-normal">{prayer.arabic}</span>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="p-3.5 font-bold text-center w-28">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 text-sm">
                                                    {displaySortedStudents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                                                                No active students enrolled in this class.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        displaySortedStudents.map((student, idx) => {
                                                            const record = prayerRecords.find(r => r.studentId === student.id && r.date === reportDate);
                                                            const prayersDone = record && record.prayers ? record.prayers : {};
                                                            const isSavingAll = savingPrayerKey === `${student.id}_all`;

                                                            // Count completed prayers
                                                            const completedCount = standardPrayers.filter(p => !!(prayersDone[p.id] || prayersDone[p.id[0]])).length;

                                                            return (
                                                                <tr
                                                                    key={student.id}
                                                                    className="hover:bg-indigo-50/30 group transition-colors select-none"
                                                                >
                                                                    {/* Number */}
                                                                    <td className="p-3 text-center align-middle">
                                                                        <div className="mx-auto w-7 h-7 rounded-full bg-gray-50 text-gray-500 border border-gray-200 flex items-center justify-center font-black text-xs">
                                                                            {idx + 1}
                                                                        </div>
                                                                    </td>

                                                                    {/* Student Name */}
                                                                    <td
                                                                        className="p-3 cursor-pointer"
                                                                        onClick={() => handleOpenEditModal(student)}
                                                                        title="Click to edit student prayer entry"
                                                                    >
                                                                        <div className="group/item flex items-center gap-2">
                                                                            <div>
                                                                                <p className="font-bold text-gray-900 group-hover/item:text-indigo-600 transition-colors flex items-center gap-1.5 leading-tight">
                                                                                    {student.name}
                                                                                    <Pencil className="w-3 h-3 text-gray-300 group-hover/item:text-indigo-500 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                                                                                </p>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                                                        {student.registerNo}
                                                                                    </span>
                                                                                    <span className={clsx(
                                                                                        "text-[9px] font-black px-1.5 py-0.2 rounded-full",
                                                                                        completedCount === 5 ? "bg-emerald-100 text-emerald-800" :
                                                                                        completedCount > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                                                                                    )}>
                                                                                        {completedCount}/5
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {/* 5 Daily Prayers Checkboxes / Buttons */}
                                                                    {standardPrayers.map((prayer) => {
                                                                        const isDone = !!(prayersDone[prayer.id] || prayersDone[prayer.id[0]]);
                                                                        const isThisSaving = savingPrayerKey === `${student.id}_${prayer.id}`;

                                                                        return (
                                                                            <td key={prayer.id} className="p-2.5 text-center align-middle">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isFutureDate || isThisSaving || isSavingAll}
                                                                                    onClick={() => handleToggleStudentPrayer(student, prayer.id)}
                                                                                    title={
                                                                                        isFutureDate
                                                                                            ? "Cannot mark prayers for future dates"
                                                                                            : `${isDone ? 'Mark as pending' : 'Mark as recited'}: ${prayer.label} for ${student.name}`
                                                                                    }
                                                                                    className={clsx(
                                                                                        "w-8 h-8 rounded-xl font-bold text-xs inline-flex items-center justify-center transition-all duration-150 transform active:scale-90 cursor-pointer group/btn shadow-xs",
                                                                                        isDone
                                                                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 ring-2 ring-emerald-500/20"
                                                                                            : "bg-gray-100 hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300",
                                                                                        (isFutureDate || isSavingAll) && "opacity-40 cursor-not-allowed hover:bg-gray-100 hover:text-gray-400 hover:border-gray-200"
                                                                                    )}
                                                                                >
                                                                                    {isThisSaving ? (
                                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                                    ) : isDone ? (
                                                                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="group-hover/btn:hidden text-gray-300">-</span>
                                                                                            <Check className="w-3.5 h-3.5 hidden group-hover/btn:inline text-emerald-600 stroke-[2.5]" />
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            </td>
                                                                        );
                                                                    })}

                                                                    {/* Actions: 5/5 Quick Button & Edit Modal Button */}
                                                                    <td className="p-2.5 text-center align-middle whitespace-nowrap">
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                disabled={isFutureDate || isSavingAll}
                                                                                onClick={() => handleQuickMarkStudentAll(student, true)}
                                                                                title={`Quick mark all 5 prayers as recited for ${student.name}`}
                                                                                className="px-2 py-1 text-[11px] font-black rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                                            >
                                                                                {isSavingAll ? (
                                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                                ) : (
                                                                                    <CheckCheck className="w-3.5 h-3.5" />
                                                                                )}
                                                                                <span>5/5</span>
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenEditModal(student)}
                                                                                title={`Edit full prayer entry for ${student.name}`}
                                                                                className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                                                            >
                                                                                <Pencil className="w-3.5 h-3.5" />
                                                                                <span className="hidden sm:inline">Edit</span>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </Card>

                                {/* Monthly Leaderboard Card */}
                                <Card className="overflow-hidden xl:col-span-2 flex flex-col shadow-sm rounded-2xl border-gray-100">
                                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                                        <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-base">
                                            <Trophy className="w-5 h-5 text-indigo-600" />
                                            Monthly Leaderboard
                                        </h3>
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-white px-2 py-0.5 rounded-full text-indigo-700 border border-indigo-100 shadow-xs">
                                            Live Ranks
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto flex-1 max-h-[550px] overflow-y-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-white shadow-xs z-10">
                                                <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-100">
                                                    <th className="p-3.5 font-bold w-14 text-center">Rank</th>
                                                    <th className="p-3.5 font-bold">Student</th>
                                                    <th className="p-3.5 font-bold text-center">Prayers</th>
                                                    <th className="p-3.5 font-bold text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 text-sm">
                                                {stats?.leaderboard.map((student) => {
                                                    const rank = student.rank;
                                                    return (
                                                        <tr
                                                            key={student.id}
                                                            className="hover:bg-gray-50 group transition-colors cursor-pointer"
                                                            onClick={() => handleOpenEditModal(student)}
                                                            title="Click to view/edit student prayers"
                                                        >
                                                            <td className="p-3.5 text-center align-middle">
                                                                <div className={clsx(
                                                                    "mx-auto w-7 h-7 rounded-full flex items-center justify-center font-black text-xs",
                                                                    rank === 1 ? "bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400 ring-offset-1" :
                                                                    rank === 2 ? "bg-gray-100 text-gray-700 ring-2 ring-gray-300 ring-offset-1" :
                                                                    rank === 3 ? "bg-orange-100 text-orange-800 ring-2 ring-orange-300 ring-offset-1" :
                                                                    "bg-gray-50 text-gray-500 font-bold"
                                                                )}>
                                                                    {rank}
                                                                </div>
                                                            </td>
                                                            <td className="p-3.5">
                                                                <div>
                                                                    <p className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                                                        {student.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400">{student.registerNo}</p>
                                                                </div>
                                                            </td>
                                                            <td className="p-3.5 text-center font-black text-indigo-600 text-sm">
                                                                {student.totalPrayers}
                                                            </td>
                                                            <td className="p-3.5 text-right">
                                                                <span className={clsx(
                                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap",
                                                                    student.totalPrayers >= 20 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                                )}>
                                                                    {student.totalPrayers >= 20 ? "Consistent" : "Growing"}
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
                        </div>
                    )}
                </>
            )}

            {/* SPECIAL PRAYER TAB */}
            {activeTab === 'special' && (
                <MentorPrayerStats />
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
                    {/* General Configuration */}
                    <Card className="p-6 rounded-2xl shadow-sm border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Prayer Chart Configuration
                        </h3>
                        <p className="text-sm text-gray-500 mb-8 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            Enable or disable the Prayer Chart feature for your classes. When enabled, students in that class will see the Prayer Chart option in their dashboard and can log their daily prayers.
                        </p>

                        <div className="space-y-4">
                            {availableClasses.map(cls => {
                                const classFlag = classFeatureFlags?.find(f => f.classId === cls.id);
                                const isLocallyEnabled = classFlag ? classFlag.prayer !== false : true;
                                const isGloballyEnabled = studentFeatureFlags?.prayer !== false;
                                const safeEnabled = isLocallyEnabled && isGloballyEnabled;

                                return (
                                    <div key={cls.id} className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${!isGloballyEnabled ? 'bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <div>
                                            <h4 className={`font-bold ${!isGloballyEnabled ? 'text-gray-500' : 'text-gray-800'}`}>Class {cls.name} - {cls.division}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {!isGloballyEnabled
                                                    ? 'Prayer Chart is disabled globally by Administrator'
                                                    : (safeEnabled ? 'Students can access Prayer Chart' : 'Prayer Chart hidden from students')}
                                            </p>
                                        </div>
                                        <button
                                            disabled={!isGloballyEnabled}
                                            onClick={() => handleToggleFeature(cls.id, isLocallyEnabled)}
                                            className={clsx(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer",
                                                safeEnabled ? "bg-indigo-600" : "bg-gray-200",
                                                !isGloballyEnabled && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <span
                                                className={clsx(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs",
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

                    {/* Data Management */}
                    <Card className="p-6 border border-red-100 rounded-2xl shadow-sm">
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
                                className="w-full sm:w-auto px-4 py-2 border border-red-200 bg-white rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-red-500 cursor-pointer"
                            >
                                <option value="all">All Assigned Classes</option>
                                {availableClasses.map(c => (
                                    <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
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
