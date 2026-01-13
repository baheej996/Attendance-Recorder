import React, { useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Printer, FileText } from 'lucide-react';
import { clsx } from 'clsx';

const PrintAttendance = () => {
    const { classes, students, attendance, institutionSettings, currentUser, mentors } = useData();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Simple window print handler
    const handlePrint = () => {
        window.print();
    };

    // Filter classes for Mentors
    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = [2024, 2025, 2026, 2027]; // Expand as needed or make dynamic

    // --- Data Processing ---
    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const classStudents = students.filter(s => s.classId === selectedClassId && s.status === 'Active')
        .sort((a, b) => {
            if ((a.gender || 'Male') === (b.gender || 'Male')) {
                // Secondary sort: Register No
                return a.registerNo.localeCompare(b.registerNo, undefined, { numeric: true, sensitivity: 'base' });
            }
            return (a.gender || 'Male') === 'Male' ? -1 : 1;
        });

    const selectedClass = classes.find(c => c.id === selectedClassId);

    // Find Mentor for this class
    const classMentor = mentors.find(m => m.assignedClassIds?.includes(selectedClassId));

    // Previous Month Name calculation
    const previousMonthIndex = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const previousMonthName = months[previousMonthIndex];

    // Filter attendance for performance
    const processAttendance = (studentId) => {
        const studentRecords = attendance.filter(r => r.studentId === studentId);

        const currentMonthStats = {
            days: {}, // { 1: 'X', 2: 'A', ... }
            total: 0
        };

        let previousTotal = 0;

        studentRecords.forEach(record => {
            const rDate = new Date(record.date);
            const rMonth = rDate.getMonth();
            const rYear = rDate.getFullYear();
            const rDay = rDate.getDate();

            // Check if Present
            const isPresent = record.status === 'Present';

            // Current Month Logic
            if (rMonth === selectedMonth && rYear === selectedYear) {
                currentMonthStats.days[rDay] = isPresent ? 'X' : 'A'; // X for Present, A for Absent
                if (isPresent) currentMonthStats.total++;
            }
            // Previous Logic (Strictly before this month)
            else if (rDate < new Date(selectedYear, selectedMonth, 1)) {
                if (isPresent) previousTotal++;
            }
        });

        return {
            currentMonth: currentMonthStats,
            previousTotal,
            total: currentMonthStats.total + previousTotal
        };
    };

    // Helper to get Day letter (S, M, T, W, T, F, S)
    const getDayLetter = (day) => {
        const date = new Date(selectedYear, selectedMonth, day);
        const dayIndex = date.getDay(); // 0 = Sun
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return { letter: days[dayIndex], isWeekend: dayIndex === 0 || dayIndex === 6, isSunday: dayIndex === 0 };
    };

    // Calculate Working Days
    const calculateWorkingDays = () => {
        if (!classStudents.length) return { thisMonth: 0, previous: 0, total: 0 };

        // Get all student IDs for this class
        const studentIds = new Set(classStudents.map(s => s.id));

        // Filter attendance records for this class
        const classRecords = attendance.filter(r => studentIds.has(r.studentId));

        // Get unique dates
        const uniqueDates = [...new Set(classRecords.map(r => r.date))];

        let thisMonth = 0;
        let previous = 0;

        uniqueDates.forEach(dateStr => {
            const d = new Date(dateStr);
            const rMonth = d.getMonth();
            const rYear = d.getFullYear();

            if (rMonth === selectedMonth && rYear === selectedYear) {
                thisMonth++;
            } else if (d < new Date(selectedYear, selectedMonth, 1)) {
                previous++;
            }
        });

        return { thisMonth, previous, total: thisMonth + previous };
    };

    const workingDays = calculateWorkingDays();

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Controls - Hidden on Print */}
            <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Printer className="w-6 h-6 text-purple-600" />
                        Print Attendance Register
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Generate and print monthly attendance reports.</p>
                </div>

                <div className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Class</label>
                        <Select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-48"
                        >
                            <option value="">Select Class</option>
                            {availableClasses.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Month</label>
                        <Select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="w-32"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Year</label>
                        <Select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-24"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </Select>
                    </div>

                    <Button
                        onClick={handlePrint}
                        disabled={!selectedClassId}
                        className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 h-[42px]"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </Button>
                </div>
            </div>

            {/* Print Preview Area */}
            {!selectedClassId ? (
                <Card className="p-12 text-center text-gray-400 bg-gray-50 border-dashed print:hidden">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Please select a class to view the register.</p>
                </Card>
            ) : (
                <div className="overflow-auto bg-gray-50 p-4 rounded-xl print:p-0 print:bg-white print:overflow-visible">
                    <div
                        className="bg-white p-4 mx-auto min-w-[1000px] print:w-full print:min-w-0"
                    >
                        {/* Title Header */}
                        <div className="text-center mb-2">
                            <h1 className="text-2xl font-black text-black font-serif tracking-wider transform scale-x-110">SAMASTHA ONLINE GLOBAL MADRASA (10666)</h1>
                            <h2 className="text-sm font-bold text-black mt-1">Student Attendance Register- {selectedYear}</h2>
                        </div>

                        {/* Table */}
                        <table className="w-full border-collapse border border-black text-xs">
                            <thead>
                                {/* Row 1: Left Info, Month, Attendance Header */}
                                <tr>
                                    {/* Class & Division Info - Split into Label and Value */}
                                    <th colSpan="2" className="border border-black px-2 py-1 text-left whitespace-nowrap font-bold w-16">
                                        Class & Division:
                                    </th>
                                    <th colSpan="2" className="border border-black px-2 py-1 text-left font-bold">
                                        {selectedClass?.name} {selectedClass?.division}
                                    </th>

                                    {/* Spacer with "Month:" label right aligned */}
                                    <th colSpan={Math.max(1, daysInMonth - 4)} className="border border-black px-2 py-1 text-right font-bold align-middle">
                                        Month:
                                    </th>

                                    {/* Month Name Value */}
                                    <th colSpan="4" className="border border-black bg-green-200 uppercase font-bold px-2 py-1 text-center align-middle">
                                        {months[selectedMonth]}
                                    </th>

                                    {/* Attendance Header */}
                                    <th colSpan="3" className="border border-black px-1 py-1 text-center font-bold">Attendance</th>

                                    {/* Remarks Header */}
                                    <th rowSpan="3" className="border border-black px-1 py-1 text-center font-bold">Remarks</th>
                                </tr>

                                {/* Row 2: Identity Headers (Merged), Vertical Headers for Days and Attendance Stats */}
                                <tr className="h-28"> {/* Reduced height from h-40 to h-28 for tighter layout */}
                                    {/* Identity Headers (Merged vertically to remove blank space) */}
                                    <th rowSpan="2" className="border border-black px-1 py-1 w-10 text-center font-bold text-[10px] align-bottom">SI/NO</th>
                                    <th rowSpan="2" className="border border-black px-1 py-1 w-16 text-center font-bold text-[10px] align-bottom">REG NO</th>
                                    <th rowSpan="2" className="border border-black px-1 py-1 w-16 text-center font-bold text-[10px] align-bottom">UID NO</th>
                                    <th rowSpan="2" className="border border-black px-1 py-1 text-center font-bold min-w-[200px] text-[10px] align-bottom">NAME</th>

                                    {/* Vertical Day Names */}
                                    {daysArray.map(day => {
                                        const { letter, isSunday } = getDayLetter(day);
                                        return (
                                            <th key={`day-${day}`} className={clsx(
                                                "border border-black w-7 min-w-[1.75rem] relative align-bottom p-0", // Reduced to w-7 for page fit // w-8 + min-w for strict width
                                                isSunday ? "text-red-600 border-b-0" : "border-b-0"
                                            )}>
                                                <div className="flex items-end justify-center h-full pb-1">
                                                    <span className="block [writing-mode:vertical-lr] rotate-180 text-[10px] font-normal leading-none whitespace-nowrap">
                                                        {isSunday ? 'Sunday' :
                                                            letter === 'M' ? 'Monday' :
                                                                letter === 'T' ? 'Tuesday' :
                                                                    letter === 'W' ? 'Wednesday' :
                                                                        letter === 'F' ? 'Friday' :
                                                                            letter === 'S' ? 'Saturday' : ''}
                                                    </span>
                                                </div>
                                            </th>
                                        )
                                    })}

                                    {/* Vertical Attendance Headers */}
                                    <th className="border border-black relative align-bottom p-0">
                                        <div className="flex items-end justify-center h-full pb-1">
                                            <span className="block [writing-mode:vertical-lr] rotate-180 whitespace-nowrap text-[10px] font-bold">In the month</span>
                                        </div>
                                    </th>
                                    <th className="border border-black relative align-bottom p-0">
                                        <div className="flex items-end justify-center h-full pb-1">
                                            <span className="block [writing-mode:vertical-lr] rotate-180 whitespace-nowrap text-[10px] font-bold">Previous</span>
                                        </div>
                                    </th>
                                    <th className="border border-black relative align-bottom p-0">
                                        <div className="flex items-end justify-center h-full pb-1">
                                            <span className="block [writing-mode:vertical-lr] rotate-180 whitespace-nowrap text-[10px] font-bold">Total</span>
                                        </div>
                                    </th>
                                </tr>

                                {/* Row 3: Day Numbers + Previous Month Label (Identity headers are now in Row 2 spanning down) */}
                                <tr>
                                    {/* Day Numbers */}
                                    {daysArray.map(day => {
                                        const { isSunday } = getDayLetter(day);
                                        return (
                                            <th key={`num-${day}`} className={clsx(
                                                "border border-black px-1 py-1 text-center font-bold text-[10px]",
                                                isSunday ? "text-red-600" : ""
                                            )}>
                                                {day}
                                            </th>
                                        )
                                    })}

                                    {/* Stats Sub-row (Empty, Previous Month, Empty) */}
                                    <th className="border border-black bg-white"></th>
                                    <th className="border border-black bg-green-200 text-[10px] font-bold px-0.5 py-1 text-center uppercase min-w-[24px]">
                                        <div className="truncate text-[8px] sm:text-[10px]">{previousMonthName}</div>
                                    </th>
                                    <th className="border border-black bg-white"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={daysInMonth + 9} className="border border-black px-4 py-8 text-center text-gray-400 italic">
                                            No students found in this class.
                                        </td>
                                    </tr>
                                ) : (
                                    classStudents.map((student, index) => {
                                        const stats = processAttendance(student.id);
                                        return (
                                            <tr key={student.id} className="h-8">
                                                <td className="border border-black text-center">{index + 1}</td>
                                                <td className="border border-black px-1 text-center font-mono">{student.registerNo}</td>
                                                <td className="border border-black px-1 text-center font-mono">{student.uid || ''}</td>
                                                <td className={clsx(
                                                    "border border-black px-2 font-normal uppercase truncate max-w-[200px] text-left",
                                                    student.gender === 'Female' ? "text-red-600" : "text-black"
                                                )}>
                                                    {student.name}
                                                </td>

                                                {daysArray.map(day => {
                                                    const status = stats.currentMonth.days[day];
                                                    const { isSunday } = getDayLetter(day);
                                                    return (
                                                        <td key={day} className={clsx(
                                                            "border border-black text-center font-bold text-[10px]",
                                                            status === 'X' ? "text-black" :
                                                                status === 'A' ? "text-red-500" : "", // Red 'A'
                                                            isSunday ? "" : "" // Removed bg-red-50 for clean look like image
                                                        )}>
                                                            {status || ''}
                                                        </td>
                                                    );
                                                })}

                                                <td className="border border-black text-center font-bold">{stats.currentMonth.total}</td>
                                                <td className="border border-black text-center text-gray-600">{stats.previousTotal}</td>
                                                <td className="border border-black text-center font-bold bg-gray-50">{stats.total}</td>
                                                <td className="border border-black text-center"></td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Signatures */}
                        {/* Signatures and Working Days Summary */}
                        {/* Signatures and Working Days Summary */}
                        <div className="mt-8 flex justify-between items-end text-xs px-4 pb-4">
                            {/* Working Days Summary Table (Left) */}
                            <div className="border border-black text-sm">
                                <div className="flex border-b border-black">
                                    <div className="px-3 py-1 font-bold border-r border-black w-32">This month</div>
                                    <div className="px-3 py-1 text-center w-16 bg-white font-mono">{workingDays.thisMonth}</div>
                                </div>
                                <div className="flex border-b border-black">
                                    <div className="px-3 py-1 font-bold border-r border-black w-32">Previous month</div>
                                    <div className="px-3 py-1 text-center w-16 bg-white font-mono">{workingDays.previous}</div>
                                </div>
                                <div className="flex">
                                    <div className="px-3 py-1 font-bold border-r border-black w-32">Total</div>
                                    <div className="px-3 py-1 text-center w-16 bg-white font-mono">{workingDays.total}</div>
                                </div>
                            </div>

                            {/* Signatures (Right) */}
                            <div className="flex gap-16 font-semibold">
                                <div className="text-center">
                                    <div className="min-w-[150px] border-b border-black mb-1 px-2 pb-1 text-sm font-bold uppercase">
                                        {classMentor?.name || ""}
                                    </div>
                                    <p>Mentor name and sign</p>
                                </div>
                                <div className="text-center">
                                    <div className="min-w-[150px] border-b border-black mb-1 px-2 pb-1 text-sm font-bold uppercase">
                                        {institutionSettings.chiefMentor || ""}
                                    </div>
                                    <p>Chief Mentor name and sign</p>
                                </div>
                                <div className="text-center">
                                    <div className="min-w-[150px] border-b border-black mb-1 px-2 pb-1"></div>
                                    <p>Mufathish name and sign</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrintAttendance;
