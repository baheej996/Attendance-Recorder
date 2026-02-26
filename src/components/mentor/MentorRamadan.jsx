import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Moon, Calendar, BookOpen, Search, Download } from 'lucide-react';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Button } from '../ui/Button';

// Ramadan 30-day constant
const RAMADAN_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

const MentorRamadan = () => {
    const { currentUser, classes, students, ramadanLogs, quranProgress } = useData();

    // State
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedDay, setSelectedDay] = useState(1); // Default to Day 1
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('fasting'); // 'fasting' | 'quran'

    // Data Filtering
    const myClasses = useMemo(() => {
        if (!currentUser?.assignedClassIds) return [];
        return classes.filter(c => currentUser.assignedClassIds.includes(c.id));
    }, [classes, currentUser]);

    // Auto-select first class when loaded
    React.useEffect(() => {
        if (myClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(myClasses[0].id);
        }
    }, [myClasses, selectedClassId]);

    const classStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId && s.status === 'Active')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, selectedClassId]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return classStudents;
        const lowerSearch = searchTerm.toLowerCase();
        return classStudents.filter(s =>
            s.name.toLowerCase().includes(lowerSearch) ||
            s.registerNo?.toLowerCase().includes(lowerSearch)
        );
    }, [classStudents, searchTerm]);

    // View Helpers
    const getStudentFastingLog = (studentId, day) => {
        return ramadanLogs.find(log => log.studentId === studentId && parseInt(log.dayNumber) === parseInt(day));
    };

    const getStudentQuranProgress = (studentId) => {
        return quranProgress.find(q => q.studentId === studentId) || { lastPage: 0, juz: 1, completedKhatms: 0 };
    };

    // Calculate Fasting Stats for selected class and day
    const fastingStats = useMemo(() => {
        let fasting = 0, notFasting = 0, excused = 0, unrecorded = 0;

        classStudents.forEach(student => {
            const log = getStudentFastingLog(student.id, selectedDay);
            if (!log) unrecorded++;
            else if (log.status === 'Fasting') fasting++;
            else if (log.status === 'Not Fasting') notFasting++;
            else if (log.status === 'Excused') excused++;
        });

        return { fasting, notFasting, excused, unrecorded };
    }, [classStudents, selectedDay, ramadanLogs]);

    // PDF Export function
    const generatePDF = () => {
        if (!selectedClassId) return;
        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (!selectedClass) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229); // Indigo 600
        doc.text("Ramadan Student Report", 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Class: ${selectedClass.name} - ${selectedClass.division}`, 14, 32);

        if (activeTab === 'fasting') {
            doc.text(`Fasting Status for Day ${selectedDay}`, 14, 40);

            const tableData = filteredStudents.map((s, index) => {
                const log = getStudentFastingLog(s.id, selectedDay);
                return [
                    index + 1,
                    s.registerNo || '-',
                    s.name,
                    log ? log.status : 'Not Recorded'
                ];
            });

            doc.autoTable({
                startY: 48,
                head: [['#', 'Reg No', 'Student Name', 'Fasting Status']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] },
            });
        } else {
            doc.text(`Quran Recitation Progress`, 14, 40);

            const tableData = filteredStudents.map((s, index) => {
                const q = getStudentQuranProgress(s.id);
                return [
                    index + 1,
                    s.registerNo || '-',
                    s.name,
                    q.lastPage || 0,
                    q.juz || 1,
                    q.completedKhatms || 0
                ];
            });

            doc.autoTable({
                startY: 48,
                head: [['#', 'Reg No', 'Student Name', 'Current Page', 'Current Juz', 'Total Khatms']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [147, 51, 234] }, // Purple 600
            });
        }

        doc.save(`Ramadan_${activeTab}_Class_${selectedClass.name}.pdf`);
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Moon className="w-8 h-8 text-indigo-600" />
                        Ramadan Overview
                    </h1>
                    <p className="text-gray-500 mt-2">Track fasting and Quran recitation progress for your classes.</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 w-full sm:w-64 shadow-sm font-medium"
                    >
                        <option value="" disabled>Select a Class</option>
                        {myClasses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} - {c.division}
                            </option>
                        ))}
                    </select>

                    <Button onClick={generatePDF} className="flex items-center justify-center gap-2 h-[46px]">
                        <Download className="w-4 h-4" /> Export PDF
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('fasting')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'fasting'
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Calendar className="w-5 h-5" /> Fasting Tracker
                    </button>
                    <button
                        onClick={() => setActiveTab('quran')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'quran'
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <BookOpen className="w-5 h-5" /> Quran Progress
                    </button>
                </nav>
            </div>

            {/* Quick Search */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search student by name or register number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 p-3 block w-full sm:w-96 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* --- FASTING TAB CONTENT --- */}
            {activeTab === 'fasting' && (
                <div className="space-y-6">
                    {/* Day Selector & Stats Summary */}
                    <Card className="p-6 bg-white border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex flex-col lg:flex-row justify-between gap-8">

                            {/* Left: Day Selector */}
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Select Ramadan Day</h3>
                                <div className="flex flex-wrap gap-2">
                                    {RAMADAN_DAYS.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(parseInt(day))}
                                            className={clsx(
                                                "w-10 h-10 rounded-lg font-medium text-sm flex items-center justify-center transition-colors",
                                                selectedDay === day
                                                    ? "bg-indigo-600 text-white shadow-md"
                                                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Stats */}
                            <div className="w-full lg:w-72 shrink-0 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Day {selectedDay} Summary</h3>
                                <div className="space-y-3 font-medium text-sm">
                                    <div className="flex justify-between items-center p-2 bg-green-50 text-green-700 rounded-lg">
                                        <span>Fasting</span>
                                        <span className="font-bold bg-white px-2 py-0.5 rounded-md shadow-sm">{fastingStats.fasting}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-red-50 text-red-700 rounded-lg">
                                        <span>Not Fasting</span>
                                        <span className="font-bold bg-white px-2 py-0.5 rounded-md shadow-sm">{fastingStats.notFasting}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-yellow-50 text-yellow-700 rounded-lg">
                                        <span>Excused</span>
                                        <span className="font-bold bg-white px-2 py-0.5 rounded-md shadow-sm">{fastingStats.excused}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-gray-100 text-gray-600 rounded-lg">
                                        <span>Not Recorded</span>
                                        <span className="font-bold bg-white px-2 py-0.5 rounded-md shadow-sm">{fastingStats.unrecorded}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Card>

                    {/* Students List */}
                    <Card className="overflow-hidden border border-gray-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Register No</th>
                                        <th className="px-6 py-4 font-medium">Student Name</th>
                                        <th className="px-6 py-4 font-medium text-center">Status (Day {selectedDay})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => {
                                            const log = getStudentFastingLog(student.id, selectedDay);
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {student.registerNo || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-medium text-gray-900">{student.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {log ? (
                                                            <span className={clsx(
                                                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                                                                log.status === 'Fasting' ? "bg-green-50 text-green-700 border-green-200" :
                                                                    log.status === 'Not Fasting' ? "bg-red-50 text-red-700 border-red-200" :
                                                                        "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                            )}>
                                                                {log.status}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                                                Not Recorded
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                                                No students found in this class.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}


            {/* --- QURAN TAB CONTENT --- */}
            {activeTab === 'quran' && (
                <div className="space-y-6">
                    <Card className="overflow-hidden border border-gray-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-purple-600 uppercase bg-purple-50 border-b border-purple-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Register No</th>
                                        <th className="px-6 py-4 font-bold">Student Name</th>
                                        <th className="px-6 py-4 font-bold text-center">Total Khatms</th>
                                        <th className="px-6 py-4 font-bold text-center">Current Juz / Para</th>
                                        <th className="px-6 py-4 font-bold text-center">Current Page</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => {
                                            const progress = getStudentQuranProgress(student.id);
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {student.registerNo || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {student.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={clsx(
                                                            "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold",
                                                            progress.completedKhatms > 0 ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-gray-100 text-gray-500"
                                                        )}>
                                                            {progress.completedKhatms || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                                            {progress.juz || 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                                                            P. {progress.lastPage || 0}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                No students found in this class.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default MentorRamadan;
