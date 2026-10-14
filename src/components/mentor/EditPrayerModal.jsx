import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Sunrise,
    Sun,
    Sunset,
    Moon,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Save,
    RotateCcw,
    Loader2,
    Sparkles,
    Check
} from 'lucide-react';
import { format, subDays, addDays, isSameDay, isAfter, startOfToday } from 'date-fns';
import { clsx } from 'clsx';

const STANDARD_PRAYERS = [
    { id: 'fajr', label: 'Fajr', arabic: 'الفجر', icon: Sunrise, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', activeBg: 'bg-gradient-to-r from-orange-500 to-amber-500' },
    { id: 'dhuhr', label: 'Dhuhr', arabic: 'الظهر', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500' },
    { id: 'asr', label: 'Asr', arabic: 'العصر', icon: Sun, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-gradient-to-r from-amber-600 to-orange-500' },
    { id: 'maghrib', label: 'Maghrib', arabic: 'المغرب', icon: Sunset, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200', activeBg: 'bg-gradient-to-r from-indigo-500 to-purple-600' },
    { id: 'isha', label: 'Isha', arabic: 'العشاء', icon: Moon, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', activeBg: 'bg-gradient-to-r from-purple-600 to-indigo-700' }
];

export const EditPrayerModal = ({
    isOpen,
    onClose,
    student,
    date,
    onDateChange,
    prayerRecords = [],
    specialPrayers = [],
    onSave,
    classes = []
}) => {
    const [selectedDate, setSelectedDate] = useState(date || format(new Date(), 'yyyy-MM-dd'));
    const [prayersState, setPrayersState] = useState({});
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Keep internal date in sync with prop if changed from outside
    useEffect(() => {
        if (date) {
            setSelectedDate(date);
        }
    }, [date]);

    // Available special prayers for this student
    const activeSpecialPrayers = useMemo(() => {
        if (!student?.classId || !specialPrayers) return [];
        return specialPrayers.filter(p =>
            p.isEnabled && (p.assignedClassIds?.includes(student.classId) || !p.assignedClassIds || p.assignedClassIds.length === 0)
        );
    }, [student, specialPrayers]);

    // Load existing record whenever student or date changes
    useEffect(() => {
        if (!student || !isOpen) return;

        const record = prayerRecords.find(r => r.studentId === student.id && r.date === selectedDate);
        if (record && record.prayers) {
            // Normalize prayers: check both full id ('fajr') and single letter ('f') for legacy compatibility
            const normalized = { ...record.prayers };
            STANDARD_PRAYERS.forEach(p => {
                if (normalized[p.id[0]] && normalized[p.id] === undefined) {
                    normalized[p.id] = normalized[p.id[0]];
                }
            });
            setPrayersState(normalized);
            setNotes(record.notes || '');
        } else {
            setPrayersState({});
            setNotes('');
        }
    }, [student, selectedDate, prayerRecords, isOpen]);

    if (!isOpen || !student) return null;

    const studentClass = classes.find(c => c.id === student.classId);
    const className = studentClass ? `Class ${studentClass.name} - ${studentClass.division}` : '';

    const today = startOfToday();
    const currentDateObj = new Date(selectedDate);
    const isToday = isSameDay(currentDateObj, today);
    const isFutureDate = isAfter(currentDateObj, today);

    // Count standard prayers completed
    const completedStandardCount = STANDARD_PRAYERS.filter(p => !!prayersState[p.id]).length;
    const progressPercent = Math.round((completedStandardCount / STANDARD_PRAYERS.length) * 100);

    const handleDateStep = (delta) => {
        const next = delta > 0 ? addDays(currentDateObj, 1) : subDays(currentDateObj, 1);
        const nextStr = format(next, 'yyyy-MM-dd');
        setSelectedDate(nextStr);
        if (onDateChange) onDateChange(nextStr);
    };

    const handleDirectDateChange = (e) => {
        const val = e.target.value;
        if (val) {
            setSelectedDate(val);
            if (onDateChange) onDateChange(val);
        }
    };

    const handleTogglePrayer = (prayerId) => {
        setPrayersState(prev => ({
            ...prev,
            [prayerId]: !prev[prayerId]
        }));
    };

    const handleMarkAll = () => {
        setPrayersState(prev => {
            const updated = { ...prev };
            STANDARD_PRAYERS.forEach(p => {
                updated[p.id] = true;
            });
            return updated;
        });
    };

    const handleClearAll = () => {
        setPrayersState(prev => {
            const updated = { ...prev };
            STANDARD_PRAYERS.forEach(p => {
                updated[p.id] = false;
            });
            return updated;
        });
    };

    const handleSave = async () => {
        if (!student) return;
        setIsSaving(true);
        try {
            await onSave({
                studentId: student.id,
                classId: student.classId,
                date: selectedDate,
                prayers: prayersState,
                notes: notes.trim()
            });
            onClose();
        } catch (err) {
            console.error("Failed to save prayer entry:", err);
            alert("Failed to save prayer entry. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-gray-100 my-auto flex flex-col max-h-[92vh]">
                
                {/* Modal Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white relative shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3.5 sm:gap-4 pr-8">
                        <div className={clsx(
                            "w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold shadow-md shrink-0 border-2 border-white/30",
                            student.gender === 'Boy'
                                ? "bg-gradient-to-br from-blue-400 to-indigo-600 text-white"
                                : "bg-gradient-to-br from-pink-400 to-purple-600 text-white"
                        )}>
                            {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg sm:text-xl font-black text-white truncate leading-tight">
                                    {student.name}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider backdrop-blur-sm">
                                    {student.registerNo}
                                </span>
                            </div>
                            <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                                {className} {student.gender ? `• ${student.gender}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Date Navigation Strip */}
                    <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => handleDateStep(-1)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Previous Day"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-sm">
                            <Calendar className="w-4 h-4 text-yellow-300 shrink-0" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={handleDirectDateChange}
                                className="bg-transparent text-white text-xs sm:text-sm font-bold border-none outline-none cursor-pointer p-0 [color-scheme:dark]"
                            />
                            {isToday && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-yellow-950 px-1.5 py-0.5 rounded shadow-sm">
                                    Today
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => handleDateStep(1)}
                            disabled={isToday}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isToday ? "Cannot select future dates" : "Next Day"}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                    
                    {/* Completion Progress & Quick Actions */}
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Daily Completion
                                </span>
                                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                    {completedStandardCount} / {STANDARD_PRAYERS.length} Recited
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-300",
                                        completedStandardCount === 5 ? "bg-emerald-500" :
                                        completedStandardCount >= 3 ? "bg-indigo-600" :
                                        completedStandardCount > 0 ? "bg-amber-500" : "bg-gray-300"
                                    )}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                                type="button"
                                onClick={handleMarkAll}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                All (5/5)
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-colors flex items-center gap-1"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Standard Prayers List */}
                    <div className="space-y-2.5">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider px-1">
                            Standard Daily Prayers
                        </h4>

                        <div className="grid grid-cols-1 gap-2.5">
                            {STANDARD_PRAYERS.map((prayer) => {
                                const Icon = prayer.icon;
                                const isDone = !!prayersState[prayer.id];

                                return (
                                    <div
                                        key={prayer.id}
                                        onClick={() => handleTogglePrayer(prayer.id)}
                                        className={clsx(
                                            "flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none group active:scale-[0.99]",
                                            isDone
                                                ? "border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-50"
                                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                isDone
                                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                                                    : `${prayer.bg} ${prayer.color}`
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                                                        {prayer.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-arabic">
                                                        {prayer.arabic}
                                                    </span>
                                                </div>
                                                <p className={clsx(
                                                    "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                                                    isDone ? "text-emerald-700" : "text-gray-400"
                                                )}>
                                                    {isDone ? 'Recited ✓' : 'Pending / Missed'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Toggle button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleTogglePrayer(prayer.id);
                                            }}
                                            className={clsx(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                                isDone ? "bg-emerald-500" : "bg-gray-300"
                                            )}
                                        >
                                            <span
                                                className={clsx(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                                                    isDone ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Special Prayers Section (if enabled) */}
                    {activeSpecialPrayers.length > 0 && (
                        <div className="space-y-2.5 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    Special Prayers
                                </h4>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                    {activeSpecialPrayers.length} configured
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                                {activeSpecialPrayers.map((prayer) => {
                                    const isDone = !!prayersState[prayer.id];

                                    return (
                                        <div
                                            key={prayer.id}
                                            onClick={() => handleTogglePrayer(prayer.id)}
                                            className={clsx(
                                                "flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none active:scale-[0.99]",
                                                isDone
                                                    ? "border-indigo-500 bg-indigo-50/50 shadow-sm shadow-indigo-50"
                                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                    isDone
                                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                                        : "bg-indigo-50 text-indigo-600"
                                                )}>
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                                                        {prayer.name}
                                                    </span>
                                                    <p className={clsx(
                                                        "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                                                        isDone ? "text-indigo-700" : "text-gray-400"
                                                    )}>
                                                        {isDone ? 'Completed ✓' : 'Not Performed'}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTogglePrayer(prayer.id);
                                                }}
                                                className={clsx(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                                    isDone ? "bg-indigo-600" : "bg-gray-300"
                                                )}
                                            >
                                                <span
                                                    className={clsx(
                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                                                        isDone ? "translate-x-6" : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Remarks / Notes (Optional) */}
                    <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider px-1">
                            Remarks / Notes <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Prayed in congregation at Madrasa, Excused..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
