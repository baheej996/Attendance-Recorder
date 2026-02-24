import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Copy, ChevronDown } from 'lucide-react';

const MentorPrayerStats = () => {
    const { students, prayerRecords, specialPrayers, currentUser, classes } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);

    // Filter classes for mentor
    const availableClasses = useMemo(() => {
        return (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
            ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
            : classes;
    }, [classes, currentUser]);

    const [selectedClassId, setSelectedClassId] = useState('');

    // Set default class selection
    React.useEffect(() => {
        if (availableClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    const activeStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.status === 'Active' && s.classId === selectedClassId);
    }, [students, selectedClassId]);

    const activeSpecialPrayers = useMemo(() => {
        // Show special prayers created by this mentor, or all if admin
        return specialPrayers.filter(p =>
            currentUser?.role === 'admin' || p.mentorId === currentUser?.id
        );
    }, [specialPrayers, currentUser]);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const stats = useMemo(() => {
        return activeStudents.map(student => {
            const record = prayerRecords.find(r => r.studentId === student.id && r.date === dateStr);
            const prayersDone = record && record.prayers ? record.prayers : {};

            return {
                ...student,
                prayersDone
            };
        });
    }, [activeStudents, prayerRecords, dateStr]);

    const generateSpecialPrayerReport = async (type) => {
        if (!selectedClassId || activeSpecialPrayers.length === 0) {
            alert("No class selected or no special prayers available.");
            return;
        }

        const assignedClass = classes.find(c => c.id === selectedClassId);
        const className = assignedClass ? `${assignedClass.name} - ${assignedClass.division}` : '';

        // Sort boys first, then girls, then alphabetically
        const sortedStudents = [...activeStudents].sort((a, b) => {
            if (a.gender === 'Boy' && b.gender !== 'Boy') return -1;
            if (a.gender !== 'Boy' && b.gender === 'Boy') return 1;
            return a.name.localeCompare(b.name);
        });

        const studentIds = sortedStudents.map(s => s.id);
        const baseDate = new Date(selectedDate); // Re-use the existing selectedDate state

        let startDate, endDate, titlePrefix, displayDate;
        let isInterval = false;

        if (type === 'daily') {
            titlePrefix = 'Daily';
            displayDate = format(baseDate, 'dd MMM yyyy');
        } else if (type === 'weekly') {
            startDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start
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
            relevantRecords = prayerRecords.filter(r => studentIds.includes(r.studentId) && r.date === dateStr);
        }

        const formatStudentList = () => {
            return sortedStudents.map(student => {
                let statusText = '';

                if (!isInterval) {
                    // Daily View - Match the current date
                    const record = relevantRecords.find(r => r.studentId === student.id);
                    const prayersDone = record && record.prayers ? record.prayers : {};
                    const completedSpecial = activeSpecialPrayers.filter(p => prayersDone[p.id]);

                    if (completedSpecial.length === activeSpecialPrayers.length) {
                        statusText = `${activeSpecialPrayers.length}/${activeSpecialPrayers.length} ✅`;
                    } else if (completedSpecial.length === 0) {
                        statusText = 'None ❌';
                    } else {
                        statusText = `(${completedSpecial.map(p => p.name).join(', ')})`;
                    }
                } else {
                    // Weekly/Monthly Aggregation
                    const studentRecords = relevantRecords.filter(r => r.studentId === student.id);

                    // Sum up only active special prayers
                    const totalSpecialPrayers = studentRecords.reduce((sum, r) => {
                        const prayersDone = r.prayers || {};
                        const completedCount = activeSpecialPrayers.filter(p => prayersDone[p.id]).length;
                        return sum + completedCount;
                    }, 0);

                    const totalPossible = (type === 'weekly' ? 7 : eachDayOfInterval({ start: startDate, end: endDate }).length) * activeSpecialPrayers.length;
                    statusText = `${totalSpecialPrayers}/${totalPossible} ✅`;
                }

                return `• ${student.name} - ${statusText}`;
            }).join('\n');
        };

        const reportText = `*${titlePrefix} Special Prayer Report: Class ${className}*\n*Date:* ${displayDate}\n\n${formatStudentList()}`;

        try {
            await navigator.clipboard.writeText(reportText);
            alert(`${titlePrefix} Special Report copied to clipboard!`);
        } catch (err) {
            console.error('Failed to copy report:', err);
            alert('Failed to copy report to clipboard.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Special Prayer Stats</h2>
                    <p className="text-sm text-gray-500">Track daily special prayer performance</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableClasses.map(cls => (
                            <option key={cls.id} value={cls.id}>Class {cls.name} - {cls.division}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 w-full sm:w-auto">
                        <button
                            onClick={() => setSelectedDate(curr => new Date(curr.setDate(curr.getDate() - 1)))}
                            className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 px-4 font-medium text-gray-900 min-w-[140px] justify-center">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
                        </div>
                        <button
                            onClick={() => setSelectedDate(curr => new Date(curr.setDate(curr.getDate() + 1)))}
                            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 disabled:opacity-50"
                            disabled={isSameDay(selectedDate, new Date())}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative shrink-0 flex">
                        <button
                            onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-indigo-100 w-full sm:w-auto justify-center"
                        >
                            Report <ChevronDown className="w-4 h-4" />
                        </button>

                        {isReportDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsReportDropdownOpen(false)}
                                ></div>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 flex flex-col">
                                    <button
                                        onClick={() => { generateSpecialPrayerReport('daily'); setIsReportDropdownOpen(false); }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 text-left flex items-center gap-3"
                                    >
                                        <Calendar className="w-4 h-4 text-gray-400" /> Daily
                                    </button>
                                    <button
                                        onClick={() => { generateSpecialPrayerReport('weekly'); setIsReportDropdownOpen(false); }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 text-left flex items-center gap-3"
                                    >
                                        <Calendar className="w-4 h-4 text-gray-400" /> Weekly
                                    </button>
                                    <button
                                        onClick={() => { generateSpecialPrayerReport('monthly'); setIsReportDropdownOpen(false); }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 text-left flex items-center gap-3"
                                    >
                                        <Copy className="w-4 h-4 text-gray-400" /> Monthly
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-bold">Student</th>
                                {activeSpecialPrayers.map(p => (
                                    <th key={p.id} className="px-6 py-4 text-center whitespace-nowrap">
                                        {p.name}
                                        {!p.isEnabled && <span className="ml-1 text-[10px] text-red-500">(Disabled)</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {stats.length === 0 ? (
                                <tr>
                                    <td colSpan={activeSpecialPrayers.length + 1} className="px-6 py-8 text-center text-gray-500">
                                        No students found.
                                    </td>
                                </tr>
                            ) : (
                                stats.map(student => (
                                    <tr key={student.id} className="bg-white hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {student.name}
                                            <div className="text-xs text-gray-500 font-normal">{student.registerNo}</div>
                                        </td>
                                        {activeSpecialPrayers.map(p => {
                                            const isDone = !!student.prayersDone[p.id];
                                            return (
                                                <td key={p.id} className="px-6 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {isDone ? (
                                                            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-6 h-6 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center">
                                                                <X className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card >
        </div >
    );
};

export default MentorPrayerStats;
