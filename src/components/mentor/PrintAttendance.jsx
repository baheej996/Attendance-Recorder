import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';

const PrintAttendance = () => {
    const { 
        classes, students, attendance, 
        institutionSettings, currentUser, 
        mentors, requireFeature, getCount, attendanceLimit, loadMoreAttendance,
        getHistoricalAttendanceStats 
    } = useData();

    // Data Subscription
    useEffect(() => {
        return requireFeature('attendance');
    }, [requireFeature]);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isExporting, setIsExporting] = useState(false);

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

    const handleExportExcel = async () => {
        if (!selectedClassId) return;
        setIsExporting(true);

        try {
            const workbook = XLSX.utils.book_new();
            const classesToExport = selectedClassId === 'all' ? availableClasses : [classes.find(c => c.id === selectedClassId)].filter(Boolean);

            for (const cls of classesToExport) {
                const classStudents = students.filter(s => s.classId === cls.id && s.status === 'Active')
                    .sort((a, b) => {
                        if ((a.gender || 'Male') === (b.gender || 'Male')) {
                            return a.registerNo.localeCompare(b.registerNo, undefined, { numeric: true, sensitivity: 'base' });
                        }
                        return (a.gender || 'Male') === 'Male' ? -1 : 1;
                    });

                const stats = await getHistoricalAttendanceStats(cls.id, selectedYear, selectedMonth);
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                const classMentor = mentors.find(m => m.assignedClassIds?.includes(cls.id));

                // Initialize Sheet Data with Header
                const aoa = [
                    ["SAMASTHA ONLINE GLOBAL MADRASA (10666)"], // Row 1: Merged Title
                    [`Student Attendance Register- ${selectedYear}`], // Row 2: Subtitle
                    [`Class & Division:`, `${cls.name} ${cls.division}`, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Month:", months[selectedMonth], "", "Attendance"], // Row 3
                    ["SI/NO", "REG NO", "UID NO", "NAME"], // Row 4 (Header start)
                ];

                // Add Day Names (Vertical simulation) to Row 4
                daysArray.forEach(day => {
                    const date = new Date(selectedYear, selectedMonth, day);
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    aoa[3].push(dayNames[date.getDay()]);
                });
                aoa[3].push("In month", "PREVIOUS", "TOTAL", "Remarks");

                // Row 5: Day Numbers
                const row5 = ["", "", "", ""];
                daysArray.forEach(day => row5.push(day));
                row5.push("", months[selectedMonth === 0 ? 11 : selectedMonth - 1], "", "");
                aoa.push(row5);

                // Students Data
                let totalThisMonth = 0;
                classStudents.forEach((student, index) => {
                    const studentRecords = (stats?.currentMonthRecords || []).filter(r => r.studentId === student.id);
                    const currentMonthAttendance = {};
                    let studentThisMonth = 0;

                    studentRecords.forEach(record => {
                        if (!record.date) return;
                        const parts = record.date.split('-');
                        if (parts.length === 3 && 
                            parseInt(parts[0], 10) === selectedYear && 
                            parseInt(parts[1], 10) === selectedMonth + 1) {
                            const day = parseInt(parts[2], 10);
                            if (record.status === 'Present') {
                                currentMonthAttendance[day] = 'X';
                                studentThisMonth++;
                            } else {
                                currentMonthAttendance[day] = 'A';
                            }
                        }
                    });

                    const previousTotal = stats.studentTotals[student.id] || 0;
                    totalThisMonth = Math.max(totalThisMonth, studentThisMonth); // This is not quite right for total working days, but let's use the workingDays logic below

                    const studentRow = [
                        index + 1,
                        student.registerNo,
                        student.uid || "",
                        student.name
                    ];
                    daysArray.forEach(day => studentRow.push(currentMonthAttendance[day] || ''));
                    studentRow.push(studentThisMonth, previousTotal, studentThisMonth + previousTotal, "");
                    aoa.push(studentRow);
                });

                // Calculate Working Days Summary
                const workingDaysSummary = (() => {
                    const studentIds = new Set(classStudents.map(s => s.id));
                    const classRecords = (stats?.currentMonthRecords || []).filter(r => 
                        studentIds.has(r.studentId) && 
                        (r.classId === classId || !r.classId) // STRICT BATCH FILTER FOR WORKING DAYS
                    );
                    const uniqueDates = [...new Set(classRecords.map(r => r.date))];
                    let thisMonthCount = 0;
                    uniqueDates.forEach(dateStr => {
                        if (!dateStr) return;
                        const parts = dateStr.split('-');
                        if (parts.length === 3 && parseInt(parts[0], 10) === selectedYear && parseInt(parts[1], 10) === selectedMonth + 1) thisMonthCount++;
                    });
                    return { thisMonth: thisMonthCount, previous: stats.totalWorkingDays, total: thisMonthCount + stats.totalWorkingDays };
                })();

                // Add Footer (Summary & Signatures)
                aoa.push([]); // Empty row
                aoa.push(["This month", workingDaysSummary.thisMonth, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "KHALID HUDAWI", "", "OP SIRAJ FAIZY"]);
                aoa.push(["PREVIOUS MONTH", workingDaysSummary.previous, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "MENTOR NAME AND SIGN", "", "CHIEF MENTOR AND SIGN", "", "MUFATHISH NAME AND SIGN"]);
                aoa.push(["TOTAL", workingDaysSummary.total]);

                const worksheet = XLSX.utils.aoa_to_sheet(aoa);

                // Merges (A1 notation converted to {r, c})
                const lastCol = 4 + daysInMonth + 3;
                worksheet['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, // Title
                    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }, // Subtitle
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } }, // Class Label
                    { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } }, // Class Name
                    { s: { r: 2, c: 35 }, e: { r: 2, c: 35 } }, // Month Label
                    { s: { r: 2, c: 36 }, e: { r: 2, c: 37 } }, // Month Name
                    { s: { r: 2, c: 38 }, e: { r: 2, c: 40 } }, // Attendance Header
                    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // SI/NO
                    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // REG NO
                    { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } }, // UID NO
                    { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } }, // NAME
                    { s: { r: 3, c: lastCol }, e: { r: 4, c: lastCol } }, // Remarks
                ];

                const sheetName = `${cls.name}-${cls.division}`.substring(0, 31);
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            }

            const fileName = `Attendance_Register_${months[selectedMonth]}_${selectedYear}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        } catch (error) {
            console.error("Excel Export failed:", error);
            alert("Export failed. Please check console for details.");
        } finally {
            setIsExporting(false);
        }
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
                    /* Prevent splitting of the register block */
                    .attendance-register-wrapper {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        display: block !important;
                        width: 100% !important;
                        zoom: 0.9; /* Scale down to ensure everything fits on one A4 Landscape */
                    }
                    .break-inside-avoid {
                        break-before: avoid !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    /* Ensure table doesn't force a break before the footer */
                    .print-container table {
                        width: 100% !important;
                        page-break-after: avoid !important;
                    }
                }
            `}</style>

            {/* Refined Header & Controls */}
            <div className="print:hidden space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                            <div className="p-2.5 bg-purple-600 rounded-xl shadow-lg shadow-purple-200">
                                <Printer className="w-6 h-6 text-white" />
                            </div>
                            Print Attendance Register
                        </h2>
                        <p className="text-gray-500 text-sm font-medium ml-1.5 italic">
                            Generate high-fidelity monthly attendance registers for your records.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleExportExcel}
                            disabled={!selectedClassId || isExporting}
                            className={clsx(
                                "h-12 px-6 rounded-2xl font-bold flex items-center gap-2 transition-all duration-300 border shadow-sm",
                                !selectedClassId || isExporting
                                    ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
                                    : "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200"
                            )}
                        >
                            {isExporting ? (
                                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-5 h-5" />
                            )}
                            {isExporting ? 'Exporting...' : 'Export Excel'}
                        </Button>

                        <Button
                            onClick={handlePrint}
                            disabled={!selectedClassId}
                            className={clsx(
                                "h-12 px-8 rounded-2xl font-bold flex items-center gap-3 transition-all duration-300 shadow-xl",
                                !selectedClassId 
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-[1.03] active:scale-95 shadow-purple-200"
                            )}
                        >
                            <Printer className="w-5 h-5" />
                            Print {selectedClassId === 'all' ? `(${availableClasses.length} Classes)` : 'Now'}
                        </Button>
                    </div>
                </div>

                {/* Control Panel Card */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[2rem] p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Class Configuration</label>
                            <div className="relative group">
                                <Select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="w-full h-14 bg-gray-50/50 border-gray-200/60 rounded-2xl text-gray-900 font-bold px-4 focus:ring-4 focus:ring-purple-100 transition-all cursor-pointer hover:bg-white"
                                >
                                    <option value="">Select Class</option>
                                    {availableClasses.length > 1 && <option value="all">All Allotted Classes</option>}
                                    {availableClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Period: Month</label>
                            <Select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="w-full h-14 bg-gray-50/50 border-gray-200/60 rounded-2xl text-gray-900 font-bold px-4 focus:ring-4 focus:ring-purple-100 transition-all cursor-pointer hover:bg-white"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Period: Year</label>
                            <Select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full h-14 bg-gray-50/50 border-gray-200/60 rounded-2xl text-gray-900 font-bold px-4 focus:ring-4 focus:ring-purple-100 transition-all cursor-pointer hover:bg-white"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    {/* Refined Warning Banner */}
                    <div className="mt-8 p-5 bg-gradient-to-br from-amber-50/80 to-orange-50/80 border border-amber-100/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 transition-all hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/90 rounded-xl text-amber-600 shadow-sm border border-amber-50 shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-black text-amber-900 uppercase tracking-wide">Historical Data Coverage</p>
                                <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                                    Current buffer: <span className="text-amber-900 font-black">{attendanceLimit} records</span>. 
                                    If data for {months[selectedMonth]} {selectedYear} is not appearing, please expand the buffer.
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="secondary" 
                            onClick={loadMoreAttendance}
                            className="bg-white hover:bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-black h-10 px-6 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap transition-all hover:scale-105"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Load More History
                        </Button>
                    </div>
                </div>
            </div>

            {/* Print Preview Area */}
            <div className="relative">
                {!selectedClassId ? (
                    <div className="p-20 text-center bg-white/40 backdrop-blur-sm border-2 border-dashed border-gray-200 rounded-[2.5rem] print:hidden transition-all hover:border-purple-200 group">
                        <div className="inline-flex p-6 bg-gray-50 rounded-full mb-6 group-hover:bg-purple-50 transition-colors">
                            <FileText className="w-16 h-16 text-gray-300 group-hover:text-purple-300 transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Preview</h3>
                        <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">Please select a class from the configuration panel above to generate the attendance register preview.</p>
                    </div>
                ) : (
                    <div className="overflow-auto bg-gray-50/50 backdrop-blur-sm p-6 md:p-10 rounded-[3rem] border border-gray-100 shadow-inner print:p-0 print:bg-white print:overflow-visible print:block print:border-none print:shadow-none animate-in fade-in zoom-in-95 duration-500">
                        <div className="print:hidden mb-6 flex justify-between items-center px-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Live Print Preview</span>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-75" />
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse delay-150" />
                            </div>
                        </div>
                        
                        {selectedClassId === 'all' ? (
                            <div className="space-y-12 print:space-y-0">
                                {availableClasses.map(c => (
                                    <AttendanceRegister key={c.id} classId={c.id} selectedMonth={selectedMonth} selectedYear={selectedYear} months={months} />
                                ))}
                            </div>
                        ) : (
                            <AttendanceRegister classId={selectedClassId} selectedMonth={selectedMonth} selectedYear={selectedYear} months={months} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


export const AttendanceRegister = ({ 
    classId, selectedMonth, selectedYear, months 
}) => {
    const { 
        classes, students, attendance, 
        institutionSettings, mentors,
        getHistoricalAttendanceStats 
    } = useData();

    const [historicalData, setHistoricalData] = useState({ studentTotals: {}, totalWorkingDays: 0, loading: true });

    useEffect(() => {
        const fetchHistory = async () => {
            setHistoricalData(prev => ({ ...prev, loading: true }));
            try {
                const stats = await getHistoricalAttendanceStats(classId, selectedYear, selectedMonth);
                setHistoricalData({ ...stats, loading: false });
            } catch (err) {
                console.error("Error fetching history:", err);
                setHistoricalData(prev => ({ ...prev, loading: false }));
            }
        };
        fetchHistory();
    }, [classId, selectedMonth, selectedYear, getHistoricalAttendanceStats]);

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
        const studentRecords = (historicalData?.currentMonthRecords || []).filter(r => r.studentId === studentId);
        const currentMonthStats = { days: {}, total: 0 };
        
        // Use true historical totals from server instead of client-side buffer
        const previousTotal = historicalData.studentTotals[studentId] || 0;

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
        const classRecords = (historicalData?.currentMonthRecords || []).filter(r => 
            studentIds.has(r.studentId) && 
            (r.classId === classId || !r.classId) // STRICT BATCH FILTER FOR WORKING DAYS
        );
        const uniqueDates = [...new Set(classRecords.map(r => r.date))];
        let thisMonth = 0;

        uniqueDates.forEach(dateStr => {
            if (!dateStr) return;
            const parts = dateStr.split('-');
            if (parts.length !== 3) return;
            const rYear = parseInt(parts[0], 10);
            const rMonth = parseInt(parts[1], 10) - 1;
            if (rMonth === selectedMonth && rYear === selectedYear) thisMonth++;
        });

        // Use true historical totals from server
        const previous = historicalData.totalWorkingDays;

        return { thisMonth, previous, total: thisMonth + previous };
    })();

    const previousMonthIndex = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const previousMonthName = months[previousMonthIndex];

    return (
        <div className="bg-white p-4 mx-auto min-w-[1000px] print:w-full print:min-w-0 print-break-after-page mb-8 print:mb-0 attendance-register-wrapper relative">
            {historicalData.loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center print:hidden">
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" />
                        Calculating True History...
                    </div>
                </div>
            )}
            
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
                        <tr className="h-20">
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
                                    <tr key={student.id} className="h-6">
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
                                        <td className="border border-black text-center text-gray-600 text-[9px] font-bold">{stats.previousTotal}</td>
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
            <div className="mt-4 flex justify-between items-end text-[10px] px-4 pb-4 break-inside-avoid">
                <div className="border border-black text-[11px]">
                    <div className="flex border-b border-black">
                        <div className="px-3 py-1 font-bold border-r border-black w-32 whitespace-nowrap">This month</div>
                        <div className="px-3 py-1 text-center w-16 bg-white font-mono">{workingDays.thisMonth}</div>
                    </div>
                    <div className="flex border-b border-black">
                        <div className="px-3 py-1 font-bold border-r border-black w-32 whitespace-nowrap uppercase">Previous month</div>
                        <div className="px-3 py-1 text-center w-16 bg-white font-mono font-bold">{workingDays.previous}</div>
                    </div>
                    <div className="flex">
                        <div className="px-3 py-1 font-bold border-r border-black w-32 whitespace-nowrap uppercase">Total</div>
                        <div className="px-3 py-1 text-center w-16 bg-white font-mono font-bold">{workingDays.total}</div>
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

export default PrintAttendance;
