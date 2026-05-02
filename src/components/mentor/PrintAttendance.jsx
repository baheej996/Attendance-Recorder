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

    // Filter classes for Mentors
    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = [2024, 2025, 2026, 2027];

    const handlePrint = () => {
        window.print();
    };

    // --- Sub-component for individual class register ---
    const AttendanceRegister = ({ classId }) => {
        const selectedClass = classes.find(c => c.id === classId);
        if (!selectedClass) return null;

        const classMentor = mentors.find(m => m.assignedClassIds?.includes(classId));
        
        const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
        const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const classStudents = students.filter(s => s.classId === classId && s.status === 'Active')
            .sort((a, b) => {
                if ((a.gender || 'Male') === (b.gender || 'Male')) {
                    return a.registerNo.localeCompare(b.registerNo, undefined, { numeric: true, sensitivity: 'base' });
                }
                return (a.gender || 'Male') === 'Male' ? -1 : 1;
            });

        const processAttendance = (studentId) => {
            const studentRecords = attendance.filter(r => r.studentId === studentId);
            const currentMonthStats = { days: {}, total: 0 };
            let previousTotal = 0;

            studentRecords.forEach(record => {
                if (!record.date) return;
                const parts = record.date.split('-');
                if (parts.length !== 3) return;
                const rYear = parseInt(parts[0], 10);
                const rMonth = parseInt(parts[1], 10) - 1;
                const rDay = parseInt(parts[2], 10);
                const isPresent = record.status === 'Present';

                if (rMonth === selectedMonth && rYear === selectedYear) {
                    currentMonthStats.days[rDay] = isPresent ? 'X' : 'A';
                    if (isPresent) currentMonthStats.total++;
                } else if (rYear < selectedYear || (rYear === selectedYear && rMonth < selectedMonth)) {
                    if (isPresent) previousTotal++;
                }
            });

            return {
                currentMonth: currentMonthStats,
                previousTotal,
                total: currentMonthStats.total + previousTotal
            };
        };

        const getDayLetter = (day) => {
            const date = new Date(selectedYear, selectedMonth, day);
            const dayIndex = date.getDay();
            const daysList = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            return { letter: daysList[dayIndex], dayIndex, isWeekend: dayIndex === 0 || dayIndex === 6, isSunday: dayIndex === 0 };
        };

        const workingDays = (() => {
            if (!classStudents.length) return { thisMonth: 0, previous: 0, total: 0 };
            const studentIds = new Set(classStudents.map(s => s.id));
            const classRecords = attendance.filter(r => studentIds.has(r.studentId));
            const uniqueDates = [...new Set(classRecords.map(r => r.date))];
            let thisMonth = 0, previous = 0;

            uniqueDates.forEach(dateStr => {
                if (!dateStr) return;
                const parts = dateStr.split('-');
                if (parts.length !== 3) return;
                const rYear = parseInt(parts[0], 10);
                const rMonth = parseInt(parts[1], 10) - 1;
                if (rMonth === selectedMonth && rYear === selectedYear) thisMonth++;
                else if (rYear < selectedYear || (rYear === selectedYear && rMonth < selectedMonth)) previous++;
            });
            return { thisMonth, previous, total: thisMonth + previous };
        })();

        const previousMonthIndex = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const previousMonthName = months[previousMonthIndex];

        return (
            <div className="bg-white p-4 mx-auto min-w-[1000px] print:w-full print:min-w-0 print-break-after-page mb-8 print:mb-0">
                {/* Title Header */}
                <div className="text-center mb-2">
                    <h1 className="text-xl font-black text-black font-serif tracking-wider transform scale-x-110">SAMASTHA ONLINE GLOBAL MADRASA (10666)</h1>
                    <h2 className="text-xs font-bold text-black mt-1">Student Attendance Register- {selectedYear}</h2>
                </div>

                <div className="print-container">
                    <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                            <tr>
                                <th colSpan="2" className="border border-black px-2 py-1 text-left whitespace-nowrap font-bold w-16 text-[9px]">Class & Division:</th>
                                <th colSpan="2" className="border border-black px-2 py-1 text-left font-bold text-[9px]">{selectedClass.name} {selectedClass.division}</th>
                                <th colSpan={Math.max(1, daysInMonth - 4)} className="border border-black px-2 py-1 text-right font-bold align-middle text-[9px]">Month:</th>
                                <th colSpan="4" className="border border-black bg-green-200 uppercase font-bold px-2 py-1 text-center align-middle text-[9px]">{months[selectedMonth]}</th>
                                <th colSpan="3" className="border border-black px-1 py-1 text-center font-bold text-[9px]">Attendance</th>
                                <th rowSpan="3" className="border border-black px-1 py-1 text-center font-bold text-[9px]">Remarks</th>
                            </tr>
                            <tr className="h-28">
                                <th rowSpan="2" className="border border-black px-1 py-1 w-8 text-center font-bold text-[8px] align-bottom uppercase">SI/NO</th>
                                <th rowSpan="2" className="border border-black px-1 py-1 w-14 text-center font-bold text-[8px] align-bottom uppercase">REG NO</th>
                                <th rowSpan="2" className="border border-black px-1 py-1 w-14 text-center font-bold text-[8px] align-bottom uppercase">UID NO</th>
                                <th rowSpan="2" className="border border-black px-1 py-1 text-center font-bold min-w-[150px] text-[8px] align-bottom uppercase text-left pl-2">NAME</th>
                                {daysArray.map(day => {
                                    const { dayIndex, isSunday } = getDayLetter(day);
                                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                    return (
                                        <th key={`day-${day}`} className={clsx("border border-black w-6 min-w-[1.2rem] relative align-bottom p-0", isSunday ? "text-red-600 border-b-0" : "border-b-0")}>
                                            <div className="flex items-end justify-center h-full pb-1">
                                                <span className="block [writing-mode:vertical-lr] rotate-180 text-[8px] font-normal leading-none whitespace-nowrap">{dayNames[dayIndex]}</span>
                                            </div>
                                        </th>
                                    )
                                })}
                                <th className="border border-black relative align-bottom p-0 w-8">
                                    <div className="flex items-end justify-center h-full pb-1"><span className="block [writing-mode:vertical-lr] rotate-180 whitespace-nowrap text-[8px] font-bold">In the month</span></div>
                                </th>
                                <th className="border border-black relative align-bottom p-0 w-8">
                                    <div className="flex items-end justify-center h-full pb-1"><span className="block [writing-mode:vertical-lr] rotate-180 whitespace-nowrap text-[8px] font-bold uppercase">Previous</span></div>
                                </th>
                                <th className="border border-black relative align-bottom p-0 w-8">
                                    <div className="flex items-end justify-center h-full pb-1"><span className="block [writing-mode:vertical-lr] rotate-180 whitespace-nowrap text-[8px] font-bold uppercase">Total</span></div>
                                </th>
                            </tr>
                            <tr>
                                {daysArray.map(day => {
                                    const { isSunday } = getDayLetter(day);
                                    return <th key={`num-${day}`} className={clsx("border border-black px-0.5 py-1 text-center font-bold text-[9px]", isSunday ? "text-red-600" : "")}>{day}</th>
                                })}
                                <th className="border border-black bg-white"></th>
                                <th className="border border-black bg-green-200 text-[8px] font-bold px-0.5 py-1 text-center uppercase min-w-[24px]"><div className="truncate">{previousMonthName}</div></th>
                                <th className="border border-black bg-white"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {classStudents.length === 0 ? (
                                <tr><td colSpan={daysInMonth + 9} className="border border-black px-4 py-8 text-center text-gray-400 italic">No active students found.</td></tr>
                            ) : (
                                classStudents.map((student, index) => {
                                    const stats = processAttendance(student.id);
                                    return (
                                        <tr key={student.id} className="h-7">
                                            <td className="border border-black text-center text-[9px]">{index + 1}</td>
                                            <td className="border border-black px-1 text-center font-mono text-[9px]">{student.registerNo}</td>
                                            <td className="border border-black px-1 text-center font-mono text-[8px]">{student.uid || ''}</td>
                                            <td className={clsx("border border-black px-2 font-normal uppercase truncate max-w-[180px] text-left text-[9px]", student.gender === 'Female' ? "text-red-600" : "text-black")}>{student.name}</td>
                                            {daysArray.map(day => {
                                                const status = stats.currentMonth.days[day];
                                                const { isSunday } = getDayLetter(day);
                                                return <td key={day} className={clsx("border border-black text-center font-bold text-[9px]", status === 'X' ? "text-black" : status === 'A' ? "text-red-500" : "", isSunday ? "bg-red-50/10" : "")}>{status || ''}</td>;
                                            })}
                                            <td className="border border-black text-center font-bold text-[9px]">{stats.currentMonth.total}</td>
                                            <td className="border border-black text-center text-gray-600 text-[9px]">{stats.previousTotal}</td>
                                            <td className="border border-black text-center font-bold bg-gray-50 text-[9px]">{stats.total}</td>
                                            <td className="border border-black text-center"></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <div className="mt-8 flex justify-between items-end text-[10px] px-4 pb-4">
                    <div className="border border-black text-[11px]">
                        <div className="flex border-b border-black">
                            <div className="px-3 py-1 font-bold border-r border-black w-32 whitespace-nowrap">This month</div>
                            <div className="px-3 py-1 text-center w-16 bg-white font-mono">{workingDays.thisMonth}</div>
                        </div>
                        <div className="flex border-b border-black">
                            <div className="px-3 py-1 font-bold border-r border-black w-32 whitespace-nowrap uppercase">Previous month</div>
                            <div className="px-3 py-1 text-center w-16 bg-white font-mono">{workingDays.previous}</div>
                        </div>
                        <div className="flex">
                            <div className="px-3 py-1 font-bold border-r border-black w-32 whitespace-nowrap uppercase">Total</div>
                            <div className="px-3 py-1 text-center w-16 bg-white font-mono">{workingDays.total}</div>
                        </div>
                    </div>

                    <div className="flex gap-12 font-semibold items-end uppercase">
                        <div className="text-center">
                            <div className="relative">
                                {classMentor?.signature && (
                                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-32 h-12 flex items-center justify-center">
                                        <img 
                                            src={classMentor.signature} 
                                            alt="Mentor Signature" 
                                            className="max-h-full max-w-full object-contain mix-blend-multiply" 
                                        />
                                    </div>
                                )}
                                <div className="min-w-[140px] h-5 border-b border-black mb-1 px-2 pb-0.5 text-[11px] font-bold">{classMentor?.name || ""}</div>
                            </div>
                            <p className="text-[9px]">Mentor name and sign</p>
                        </div>
                        <div className="text-center">
                            <div className="min-w-[140px] h-5 border-b border-black mb-1 px-2 pb-0.5 text-[11px] font-bold">{institutionSettings.chiefMentor || ""}</div>
                            <p className="text-[9px]">Chief Mentor name and sign</p>
                        </div>
                        <div className="text-center">
                            <div className="min-w-[140px] h-5 border-b border-black mb-1 px-2 pb-0.5"></div>
                            <p className="text-[9px]">Mufathish name and sign</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            <style>{`
                @media print {
                    @page { 
                        size: A4 landscape; 
                        margin: 5mm; 
                    }
                    /* Reset container heights for printing */
                    html, body, #root, .flex.h-screen, [class*="h-screen"], [class*="h-full"] {
                        height: auto !important;
                        overflow: visible !important;
                        min-height: 0 !important;
                    }
                    /* Expand all scrollable areas */
                    [class*="overflow-auto"], [class*="overflow-y-auto"] {
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                        position: static !important;
                    }
                    /* Hide scrollbars specifically */
                    ::-webkit-scrollbar {
                        display: none !important;
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        background: white !important;
                        color: black !important;
                    }
                    .print-container { 
                        width: 100%; 
                    }
                    /* Ensure every class register starts on its own page */
                    .print-break-after-page {
                        break-after: page !important;
                        page-break-after: always !important;
                        margin-bottom: 0 !important;
                    }
                }
            `}</style>

            {/* Controls */}
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
                        <label className="text-xs font-semibold text-gray-500 uppercase">Class Selector</label>
                        <Select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-48"
                        >
                            <option value="">Select Class</option>
                            {availableClasses.length > 1 && <option value="all">All Allotted Classes</option>}
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
                        Print {selectedClassId === 'all' ? `(${availableClasses.length} Classes)` : 'Register'}
                    </Button>
                </div>
            </div>

            {/* Print Preview Area */}
            {!selectedClassId ? (
                <Card className="p-12 text-center text-gray-400 bg-gray-50 border-dashed print:hidden">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Please select a class or "All Classes" to view the register preview.</p>
                </Card>
            ) : (
                <div className="overflow-auto bg-gray-100 p-4 rounded-xl print:p-0 print:bg-white print:overflow-visible">
                    {selectedClassId === 'all' ? (
                        <div className="space-y-8 print:space-y-0">
                            {availableClasses.map(c => (
                                <AttendanceRegister key={c.id} classId={c.id} />
                            ))}
                        </div>
                    ) : (
                        <AttendanceRegister classId={selectedClassId} />
                    )}
                </div>
            )}
        </div>
    );
};

export default PrintAttendance;
