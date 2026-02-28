import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { clsx } from 'clsx';
import { X, Download, AlertTriangle, FileText, GraduationCap, CheckCircle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { ReportCardPDFTemplate } from '../../components/ui/ReportCardPDFTemplate';


const COLORS = ['#10B981', '#EF4444']; // Green, Red
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

const StudentStatsModal = ({ student, records, onClose }) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = total - present;

    // Monthly Calc
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthRecords = records.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthTotal = monthRecords.length;
    const monthPresent = monthRecords.filter(r => r.status === 'Present').length;

    const data = [
        { name: 'Present', value: present },
        { name: 'Absent', value: absent },
    ];

    const generateStudentReport = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Student Attendance Report`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Name: ${student.name}`, 14, 30);
        doc.text(`Register No: ${student.registerNo}`, 14, 37);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 44);

        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";
        doc.text(`Total Days: ${total}`, 14, 55);
        doc.text(`Days Present: ${present}`, 80, 55);
        doc.text(`Days Absent: ${absent}`, 140, 55);
        doc.text(`Attendance: ${percentage}%`, 14, 62);

        const tableData = records.map(r => [new Date(r.date).toLocaleDateString(), r.status]);
        autoTable(doc, {
            startY: 70, head: [['Date', 'Status']], body: tableData, theme: 'grid', headStyles: { fillColor: [79, 70, 229] },
        });
        doc.save(`${student.name}_Report.pdf`);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500">{student.registerNo} • Attendance Report</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Overall Performance</h4>
                        <div className="h-64">
                            {total === 0 ? <div className="h-full flex items-center justify-center text-gray-400">No Data</div> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-4 rounded-xl">
                            <p className="text-sm text-indigo-600 font-medium mb-1">Overall Attendance</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-indigo-900">{total > 0 ? ((present / total) * 100).toFixed(1) : 0}%</span>
                                <span className="text-sm text-indigo-700">Present</span>
                            </div>
                            <p className="text-xs text-indigo-400 mt-2">{present} days present out of {total} total</p>
                        </div>
                        <Button onClick={generateStudentReport} className="w-full flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" /> Download Report PDF
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentResultModal = ({ student, exam, rank, subjects, results, onClose }) => {
    const { institutionSettings, classes, students } = useData();
    const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
    const printRef = React.useRef(null);

    // Filter results for this specific student and exam
    const studentResults = results.filter(r => r.examId === exam.id && r.studentId === student.id);

    const stats = useMemo(() => {
        let totalObtained = 0;
        let totalMax = 0;
        let passedCount = 0;

        const subjectBreakdown = subjects.map(sub => {
            const result = studentResults.find(r => r.subjectId === sub.id);
            const marks = result ? Number(result.marks) : 0;
            const max = Number(sub.maxMarks);
            const percentage = (marks / max) * 100;
            const isPassed = percentage >= (sub.passMarks ? (sub.passMarks / sub.maxMarks) * 100 : 40); // Use subject pass marks or default 40%

            totalObtained += marks;
            totalMax += max;
            if (isPassed) passedCount++;

            return { ...sub, marks, percentage, isPassed, isAbsent: !result };
        });

        const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const isOverallPassed = subjects.length > 0 && passedCount === subjects.length;

        return { totalObtained, totalMax, overallPercentage, isOverallPassed, subjectBreakdown };
    }, [studentResults, subjects]);

    const generateResultPDF = () => {
        setIsGeneratingPDF(true);
        setTimeout(async () => {
            if (!printRef.current) {
                setIsGeneratingPDF(false);
                return;
            }
            try {
                const { toPng } = await import('html-to-image');
                const imgData = await toPng(printRef.current, {
                    cacheBust: true,
                    backgroundColor: '#ffffff',
                    pixelRatio: 2
                });

                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${student.registerNo}_${exam.name.replace(/\s+/g, '_')}_Report.pdf`);
            } catch (error) {
                console.error("Error generating PDF:", error);
                alert("Could not generate high-fidelity PDF.");
            } finally {
                setIsGeneratingPDF(false);
            }
        }, 150);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-full animate-in zoom-in-95 duration-200">
                <div className="bg-white">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                            <p className="text-sm text-gray-500">{exam.name} • Result Details</p>
                        </div>
                        {/* Hide the close button when generating PDF */}
                        {!isGeneratingPDF && (
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className={clsx("p-4 rounded-xl border", stats.isOverallPassed ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}>
                                <p className={clsx("text-sm font-semibold mb-1", stats.isOverallPassed ? "text-green-600" : "text-red-600")}>Result</p>
                                <p className={clsx("text-2xl font-bold", stats.isOverallPassed ? "text-green-900" : "text-red-900")}>
                                    {stats.isOverallPassed ? "PASS" : "FAIL"}
                                </p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-sm text-blue-600 font-semibold mb-1">Percentage</p>
                                <p className="text-2xl font-bold text-blue-900">{stats.overallPercentage.toFixed(1)}%</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <p className="text-sm text-purple-600 font-semibold mb-1">Class Rank</p>
                                <p className="text-2xl font-bold text-purple-900">#{rank}</p>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <p className="text-sm text-indigo-600 font-semibold mb-1">Total Marks</p>
                                <p className="text-2xl font-bold text-indigo-900">{stats.totalObtained} <span className="text-sm font-medium text-indigo-400">/ {stats.totalMax}</span></p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Marks</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.subjectBreakdown.map(sub => (
                                        <tr key={sub.id}>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{sub.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                {sub.isAbsent ? <span className="text-red-500 font-bold">AB</span> : `${sub.marks} / ${sub.maxMarks}`}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-xs font-medium",
                                                    sub.isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {sub.isPassed ? 'Pass' : 'Fail'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Include an explicit transparent margin at the bottom of the element being captured */}
                        <div className="h-2"></div>
                    </div>
                </div>

                {!isGeneratingPDF && (
                    <div className="px-6 pb-6 pt-0">
                        {/* PDF Download Action */}
                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={generateResultPDF}
                                disabled={isGeneratingPDF}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {isGeneratingPDF ? 'Generating...' : 'Download Report PDF'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Hidden Output for HTML to Image capture */}
                <div className="absolute -left-[9999px] -top-[9999px]"> {/* Hide off-screen */}
                    <ReportCardPDFTemplate
                        ref={printRef}
                        student={{
                            ...student,
                            classDetails: students.find(s => s.id === student.id)?.classId
                                ? `${classes.find(c => c.id === students.find(s => s.id === student.id).classId)?.name || ''} ${classes.find(c => c.id === students.find(s => s.id === student.id).classId).division || ''}`
                                : ''
                        }}
                        exam={exam}
                        rank={rank}
                        stats={stats}
                    />
                </div>
            </div>
        </div>
    )
}

const MentorStats = () => {
    const { classes, students, attendance, currentUser, results, exams, subjects, institutionSettings } = useData();
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'results'
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null); // For Attendance Modal
    const [resultModalData, setResultModalData] = useState(null); // { student, exam }

    const availableClasses = useMemo(() => (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes, [classes, currentUser]);

    // Derived Data
    const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId && s.status === 'Active'), [students, selectedClassId]);
    const classSubjects = useMemo(() => subjects.filter(s => s.classId === selectedClassId), [subjects, selectedClassId]);

    // --- ATTENDANCE STATS ---
    const getAttendanceStats = (studentId) => {
        const studentRecords = attendance.filter(r => r.studentId === studentId);
        const total = studentRecords.length;
        const present = studentRecords.filter(r => r.status === 'Present').length;
        const percentage = total > 0 ? (present / total) * 100 : 0;
        return { total, present, percentage, records: studentRecords };
    };

    const attendanceStats = useMemo(() => {
        if (!selectedClassId) return null;
        const studentStats = classStudents.map(s => getAttendanceStats(s.id));
        const totalStudents = classStudents.length;
        const avgPct = totalStudents > 0 ? (studentStats.reduce((acc, curr) => acc + curr.percentage, 0) / totalStudents).toFixed(1) : 0;
        const atRisk = classStudents.filter(s => getAttendanceStats(s.id).percentage < 75);
        return { studentStats, totalStudents, avgPct, atRisk };
    }, [classStudents, attendance, selectedClassId]);

    // --- EXAM STATS ---
    const examStats = useMemo(() => {
        if (!selectedClassId || !selectedExamId) return null;

        const effectiveResults = results.filter(r => r.examId === selectedExamId);

        let totalClassPercentage = 0;
        let passCount = 0;
        const studentPerformances = classStudents.map(student => {
            const studentRes = effectiveResults.filter(r => r.studentId === student.id);
            let obtained = 0;
            let max = 0;
            let clearedSubjects = 0;

            classSubjects.forEach(sub => {
                const r = studentRes.find(res => res.subjectId === sub.id);
                const marks = r ? Number(r.marks) : 0;
                const subMax = Number(sub.maxMarks);
                obtained += marks;
                max += subMax;
                // Check pass condition based on subject pass marks
                const passThreshold = sub.passMarks ? (sub.passMarks / sub.maxMarks) * 100 : 40;
                if ((marks / subMax) * 100 >= passThreshold) clearedSubjects++;
            });

            const pct = max > 0 ? (obtained / max) * 100 : 0;
            const isPassed = classSubjects.length > 0 && clearedSubjects === classSubjects.length;

            if (isPassed) passCount++;
            totalClassPercentage += pct;

            return { student, obtained, max, pct, isPassed };
        });

        // Subject-wise Average
        const subjectAverages = classSubjects.map(sub => {
            const subResults = effectiveResults.filter(r => r.subjectId === sub.id);
            if (subResults.length === 0) return { name: sub.name, avg: 0 };
            const totalMarks = subResults.reduce((acc, curr) => acc + Number(curr.marks), 0);
            const avg = totalMarks / subResults.length;
            return { name: sub.name, avg: avg };
        });

        const classAvg = classStudents.length > 0 ? (totalClassPercentage / classStudents.length).toFixed(1) : 0;
        const passPercentage = classStudents.length > 0 ? ((passCount / classStudents.length) * 100).toFixed(1) : 0;

        // Rank Calculation
        const sortedPerformances = [...studentPerformances].sort((a, b) => b.pct - a.pct);
        let currentRank = 1;
        for (let i = 0; i < sortedPerformances.length; i++) {
            if (i > 0 && sortedPerformances[i].pct !== sortedPerformances[i - 1].pct) {
                currentRank++;
            }
            sortedPerformances[i].rank = currentRank;
        }

        const topPerformer = sortedPerformances[0]?.student;

        return { studentPerformances: sortedPerformances, classAvg, topPerformer, passPercentage, subjectAverages };
    }, [selectedClassId, selectedExamId, classStudents, classSubjects, results]);


    const generateAttendanceReport = () => {
        const cls = classes.find(c => c.id === selectedClassId);
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text(`Class Attendance Report - ${cls.name} ${cls.division}`, 14, 20);
        doc.setFontSize(12); doc.text(`Average: ${attendanceStats.avgPct}%`, 14, 30);

        const tableData = classStudents.map(s => {
            const stats = getAttendanceStats(s.id);
            return [s.registerNo, s.name, stats.total, stats.present, `${stats.percentage.toFixed(1)}%`];
        });
        autoTable(doc, { startY: 40, head: [['Reg No', 'Name', 'Total Day', 'Present', '%']], body: tableData });
        autoTable(doc, { startY: 40, head: [['Reg No', 'Name', 'Total Day', 'Present', '%']], body: tableData });
        doc.save(`Attendance_${cls.name}.pdf`);
    };

    const generateExamReport = () => {
        if (!examStats || !selectedClassId || !selectedExamId) return;
        const cls = classes.find(c => c.id === selectedClassId);
        const exam = exams.find(e => e.id === selectedExamId);

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text(`Exam Results Report`, 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        doc.text(`Class: ${cls?.name} ${cls?.division}  |  Exam: ${exam?.name}`, 14, 28);
        doc.text(`Class Average: ${examStats.classAvg}%  |  Pass: ${examStats.passPercentage}%`, 14, 34);

        // Ranks are now pre-computed in examStats.studentPerformances
        const sortedStudents = [...examStats.studentPerformances].sort((a, b) => b.pct - a.pct);

        const tableData = sortedStudents.map((perf) => {
            return [
                perf.rank,
                perf.student.registerNo,
                perf.student.name,
                `${perf.obtained} / ${perf.max}`,
                `${perf.pct.toFixed(1)}%`,
                perf.isPassed ? 'Pass' : 'Fail'
            ];
        });

        autoTable(doc, {
            startY: 42,
            head: [['Rank', 'Reg No', 'Name', 'Marks', 'Percentage', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            didParseCell: function (data) {
                // Color passed and failed tags
                if (data.section === 'body' && data.column.index === 5) {
                    if (data.cell.raw === 'Pass') data.cell.styles.textColor = [16, 185, 129];
                    if (data.cell.raw === 'Fail') data.cell.styles.textColor = [239, 68, 68];
                }
            }
        });

        doc.save(`Results_${cls?.name.replace(' ', '_')}_${exam?.name.replace(' ', '_')}.pdf`);
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900">Statistics & Reports</h2>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                            activeTab === 'attendance' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                            activeTab === 'results' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Exam Results
                    </button>
                </div>
            </div>

            <Card>
                <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-row gap-2 sm:gap-4 items-center justify-between bg-gray-50/50">
                    <div className="flex flex-row gap-2 sm:gap-4 items-center flex-1">
                        <div className="w-full md:w-64">
                            <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="bg-white">
                                <option value="" disabled>Select Class</option>
                                {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.division}</option>)}
                            </Select>
                        </div>

                        {activeTab === 'results' && selectedClassId && (
                            <div className="w-full sm:w-64">
                                <Select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="bg-white">
                                    <option value="" disabled>Select Exam</option>
                                    {exams.map(e => <option key={e.id} value={e.id}>{e.name} {e.status === 'Draft' ? '(Draft)' : ''}</option>)}
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Export Buttons */}
                    {activeTab === 'attendance' && selectedClassId && classStudents.length > 0 && (
                        <Button
                            onClick={generateAttendanceReport}
                            variant="secondary"
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm whitespace-nowrap flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Export PDF
                        </Button>
                    )}
                    {activeTab === 'results' && selectedClassId && selectedExamId && examStats && (
                        <Button
                            onClick={generateExamReport}
                            variant="secondary"
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm whitespace-nowrap flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Export PDF
                        </Button>
                    )}
                </div>

                {!selectedClassId ? (
                    <div className="p-16 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Select a class to view {activeTab} statistics.</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-8">
                        {/* ---------------- ATTENDANCE VIEW ---------------- */}
                        {activeTab === 'attendance' && attendanceStats && (
                            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                                    <div className="bg-indigo-50 p-3 sm:p-6 rounded-2xl border border-indigo-100 flex flex-col justify-center items-center text-center">
                                        <p className="text-[10px] sm:text-sm text-indigo-600 font-bold uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Class Average</p>
                                        <p className="text-xl sm:text-4xl font-extrabold text-indigo-900">{attendanceStats.avgPct}%</p>
                                    </div>
                                    <div className="bg-blue-50 p-3 sm:p-6 rounded-2xl border border-blue-100 flex flex-col justify-center items-center text-center">
                                        <p className="text-[10px] sm:text-sm text-blue-600 font-bold uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Total Students</p>
                                        <p className="text-xl sm:text-4xl font-extrabold text-blue-900">{attendanceStats.totalStudents}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 sm:p-6 rounded-2xl border border-red-100 flex flex-col justify-center lg:col-span-2">
                                        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-3">
                                            <AlertTriangle className="w-3 h-3 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                                            <p className="text-[10px] sm:text-sm text-red-700 font-bold uppercase tracking-wider leading-tight">At Risk ({attendanceStats.atRisk.length})</p>
                                        </div>
                                        {attendanceStats.atRisk.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 sm:gap-2">
                                                {attendanceStats.atRisk.slice(0, 6).map(s => (
                                                    <span key={s.id} className="bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded sm:rounded-lg border border-red-200 text-[10px] sm:text-xs font-bold text-red-700 shadow-sm truncate max-w-full">{s.name}</span>
                                                ))}
                                                {attendanceStats.atRisk.length > 6 && <span className="text-[10px] sm:text-xs text-red-500 font-medium self-center">+{attendanceStats.atRisk.length - 6} more</span>}
                                            </div>
                                        ) : <p className="text-[10px] sm:text-sm text-green-700 font-medium flex items-center gap-1 sm:gap-2"><CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">All students &gt; 75% attendance!</span></p>}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-800">Student Attendance List</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {classStudents.map(student => {
                                            const { total, present, percentage, records } = getAttendanceStats(student.id);
                                            return (
                                                <div key={student.id} onClick={() => setSelectedStudent({ ...student, records })} className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-300 hover:shadow-lg cursor-pointer transition-all group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-lg">{student.name}</h4>
                                                            <p className="text-xs text-gray-500 font-mono">{student.registerNo}</p>
                                                        </div>
                                                        <div className={clsx("text-xs px-2.5 py-1 rounded-full font-bold", percentage >= 75 ? "bg-green-100 text-green-700" : percentage >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                                                            {percentage.toFixed(0)}%
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={clsx("h-full rounded-full", percentage >= 75 ? "bg-green-500" : percentage >= 60 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${percentage}%` }} />
                                                    </div>
                                                    <div className="mt-3 text-xs text-gray-400 flex justify-between font-medium">
                                                        <span>{present} Present</span>
                                                        <span>{total} Total Days</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ---------------- EXAM RESULTS VIEW ---------------- */}
                        {activeTab === 'results' && (
                            !selectedExamId ? (
                                <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border-2 border-dashed">
                                    <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    Please select an exam to view results.
                                </div>
                            ) : !examStats ? (
                                <div className="p-12 text-center text-gray-500">Loading Stats...</div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                                        <div className="bg-purple-50 p-4 sm:p-6 rounded-2xl border border-purple-100 relative overflow-hidden">
                                            <div className="relative z-10">
                                                <p className="text-[10px] sm:text-sm text-purple-600 font-bold uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Class Average</p>
                                                <p className="text-2xl sm:text-4xl font-extrabold text-purple-900">{examStats.classAvg}%</p>
                                            </div>
                                            <GraduationCap className="absolute -bottom-2 -right-2 w-16 h-16 sm:w-24 sm:h-24 text-purple-100 z-0 rotate-12" />
                                        </div>
                                        <div className="bg-green-50 p-4 sm:p-6 rounded-2xl border border-green-100">
                                            <p className="text-[10px] sm:text-sm text-green-600 font-bold uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Pass Pct</p>
                                            <p className="text-2xl sm:text-4xl font-extrabold text-green-900">{examStats.passPercentage}%</p>
                                        </div>
                                        <div className="bg-amber-50 p-4 sm:p-6 rounded-2xl border border-amber-100 col-span-2 md:col-span-1">
                                            <p className="text-[10px] sm:text-sm text-amber-600 font-bold uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Top Performer</p>
                                            <p className="text-lg sm:text-2xl font-bold text-amber-900 truncate max-w-full">{examStats.topPerformer?.name || 'N/A'}</p>
                                            <p className="text-xs sm:text-sm text-amber-700 mt-0.5 sm:mt-1">{examStats.topPerformer ? `${examStats.topPerformer.registerNo}` : '-'}</p>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="h-64 sm:h-80 w-full bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h4 className="text-sm sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">Subject-wise Average Marks</h4>
                                        <div className="h-[180px] sm:h-[calc(100%-2rem)]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={examStats.subjectAverages} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} dy={10} interval={0} angle={-30} textAnchor="end" />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                                                    <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Bar dataKey="avg" radius={[6, 6, 0, 0]} barSize={20} maxBarSize={40}>
                                                        {examStats.subjectAverages.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Student List */}
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-gray-800">Detailed Student Results</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {examStats.studentPerformances.map(({ student, obtained, max, pct, isPassed, rank }) => (
                                                <div
                                                    key={student.id}
                                                    onClick={() => setResultModalData({ student, rank, exam: exams.find(e => e.id === selectedExamId) })}
                                                    className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-purple-300 hover:shadow-lg cursor-pointer transition-all flex justify-between items-center group"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded">#{rank}</span>
                                                            <h4 className="font-bold text-gray-900">{student.name}</h4>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-mono">{student.registerNo}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-gray-900">{pct.toFixed(1)}%</p>
                                                        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                            {isPassed ? 'PASS' : 'FAIL'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </Card>

            {/* Modals */}
            {selectedStudent && (
                <StudentStatsModal student={selectedStudent} records={selectedStudent.records} onClose={() => setSelectedStudent(null)} />
            )}

            {resultModalData && (
                <StudentResultModal
                    student={resultModalData.student}
                    exam={resultModalData.exam}
                    rank={resultModalData.rank}
                    subjects={classSubjects}
                    results={results}
                    onClose={() => setResultModalData(null)}
                />
            )}
        </div>
    );
};

export default MentorStats;
