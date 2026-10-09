import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Download, Printer, FileSpreadsheet, FileText, CheckCircle, XCircle, AlertTriangle, Loader2, Trophy, Users, GraduationCap, Calendar, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { exportToExcel } from '../../utils/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useData } from '../../contexts/DataContext';

const FullClassResultModal = ({ isOpen, onClose, classObj, exam, students = [], subjects = [], results = [], attendance = [] }) => {
    const { currentUser, mentors } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pass' | 'fail'
    const [fetchedAttendance, setFetchedAttendance] = useState(null);
    const [isLoadingAtt, setIsLoadingAtt] = useState(false);

    // Resolve Mentor Name for this class
    const mentorName = useMemo(() => {
        if (currentUser?.role === 'mentor' && (currentUser?.assignedClassIds?.includes(classObj?.id) || currentUser?.classId === classObj?.id)) {
            return currentUser.name || 'Mentor';
        }
        const assignedMentor = (mentors || []).find(m => 
            m.assignedClassIds?.includes(classObj?.id) || m.classId === classObj?.id
        );
        return assignedMentor?.name || currentUser?.name || 'N/A';
    }, [currentUser, mentors, classObj]);

    // Fetch full attendance for this class up to date from Firestore to ensure exact counts
    useEffect(() => {
        if (!isOpen || !classObj?.id) return;
        let isMounted = true;
        
        const fetchFullClassAttendance = async () => {
            setIsLoadingAtt(true);
            try {
                const q = query(collection(db, 'attendance'), where('classId', '==', classObj.id));
                const snap = await getDocs(q);
                const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                if (isMounted) setFetchedAttendance(docs);
            } catch (err) {
                console.error("Error fetching complete class attendance:", err);
            } finally {
                if (isMounted) setIsLoadingAtt(false);
            }
        };

        fetchFullClassAttendance();
        return () => { isMounted = false; };
    }, [isOpen, classObj?.id]);

    // Use fetched attendance if available, otherwise fall back to passed attendance prop
    const effectiveAttendance = fetchedAttendance !== null ? fetchedAttendance : (attendance || []);

    // Filter active students for this class who were admitted on or before the exam cutoff date
    const classStudents = useMemo(() => {
        if (!classObj?.id) return [];
        return (students || []).filter(s => {
            if (s.classId !== classObj.id || s.status !== 'Active') return false;
            if (s.admissionDate && cutoffIso) {
                if (s.admissionDate > cutoffIso) return false;
            }
            return true;
        });
    }, [students, classObj, cutoffIso]);

    // Determine exam subjects for this class
    const examSubjects = useMemo(() => {
        if (!classObj?.id) return [];
        return (subjects || []).filter(s => 
            s.classId === classObj.id && 
            s.isExamSubject !== false && 
            !exam?.excludedSubjectNames?.includes(s.name)
        );
    }, [subjects, classObj, exam]);

    // Cutoff date for exam attendance
    const examCutoffDateStr = exam?.endDate || exam?.date || '';
    const cutoffIso = useMemo(() => {
        if (!examCutoffDateStr) return '';
        try {
            return new Date(examCutoffDateStr).toISOString().slice(0, 10);
        } catch (e) {
            return examCutoffDateStr.slice(0, 10);
        }
    }, [examCutoffDateStr]);

    // Attendance records strictly up to exam cutoff date
    const attendanceUpToExam = useMemo(() => {
        if (!effectiveAttendance || effectiveAttendance.length === 0) return [];
        return effectiveAttendance.filter(r => {
            if (r.classId !== classObj?.id) return false;
            if (!cutoffIso) return true;
            const recDate = r.date ? r.date.slice(0, 10) : '';
            return recDate <= cutoffIso;
        });
    }, [effectiveAttendance, classObj, cutoffIso]);

    // Count unique class attendance dates held up to exam date
    const totalClassTakenCount = useMemo(() => {
        const uniqueDates = new Set();
        attendanceUpToExam.forEach(r => {
            const d = r.date ? r.date.slice(0, 10) : '';
            if (d) uniqueDates.add(d);
        });
        return uniqueDates.size;
    }, [attendanceUpToExam]);

    // Calculate detailed performances for all class students
    const studentPerformances = useMemo(() => {
        if (!exam || !classStudents.length) return [];

        const examResults = (results || []).filter(r => r.examId === exam.id);

        const list = classStudents.map(student => {
            const studentRes = examResults.filter(r => r.studentId === student.id);
            let obtained = 0;
            let max = 0;
            let clearedCount = 0;

            const subjectDetails = examSubjects.map(sub => {
                const res = studentRes.find(r => r.subjectId === sub.id);
                const marks = res ? Number(res.marks) : 0;
                const maxMarks = Number(sub.maxMarks);
                obtained += marks;
                max += maxMarks;

                const passThreshold = sub.passMarks ? (sub.passMarks / sub.maxMarks) * 100 : 40;
                const isPassed = (marks / maxMarks) * 100 >= passThreshold;
                const isAbsent = !res;

                if (isPassed && !isAbsent) clearedCount++;

                return {
                    subjectId: sub.id,
                    subjectName: sub.name,
                    marks,
                    maxMarks,
                    isPassed,
                    isAbsent
                };
            });

            const pct = max > 0 ? (obtained / max) * 100 : 0;
            const isPassed = examSubjects.length > 0 && clearedCount === examSubjects.length;

            // Attendance calculation up to exam date
            const studentAttRecords = attendanceUpToExam.filter(r => r.studentId === student.id);
            const presentCount = studentAttRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
            const classesTakenForStudent = Math.max(totalClassTakenCount, studentAttRecords.length);
            const attPct = classesTakenForStudent > 0 ? (presentCount / classesTakenForStudent) * 100 : 0;

            return {
                student,
                subjectDetails,
                obtained,
                max,
                pct,
                isPassed,
                presentCount,
                classesTakenForStudent,
                attPct
            };
        });

        // Sort by percentage descending
        list.sort((a, b) => b.pct - a.pct);

        // Assign rank handling ties
        let currentRank = 1;
        for (let i = 0; i < list.length; i++) {
            if (i > 0 && list[i].pct !== list[i - 1].pct) {
                currentRank = i + 1;
            }
            list[i].rank = currentRank;
        }

        return list;
    }, [exam, classStudents, examSubjects, results, attendanceUpToExam, totalClassTakenCount]);

    // Filtered list based on Search & Status
    const filteredPerformances = useMemo(() => {
        return studentPerformances.filter(perf => {
            if (statusFilter === 'pass' && !perf.isPassed) return false;
            if (statusFilter === 'fail' && perf.isPassed) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const name = (perf.student.name || '').toLowerCase();
                const reg = (perf.student.registerNo || '').toLowerCase();
                return name.includes(term) || reg.includes(term);
            }

            return true;
        });
    }, [studentPerformances, statusFilter, searchTerm]);

    // Summary metrics
    const statsSummary = useMemo(() => {
        const total = studentPerformances.length;
        if (total === 0) return { total: 0, passCount: 0, failCount: 0, passPct: 0, classAvg: 0 };

        const passCount = studentPerformances.filter(p => p.isPassed).length;
        const failCount = total - passCount;
        const passPct = ((passCount / total) * 100).toFixed(1);
        const classAvg = (studentPerformances.reduce((acc, p) => acc + p.pct, 0) / total).toFixed(1);

        return { total, passCount, failCount, passPct, classAvg };
    }, [studentPerformances]);

    if (!isOpen || !classObj || !exam) return null;

    // Excel Export Handler
    const handleExportExcel = () => {
        const data = studentPerformances.map(perf => {
            const row = {
                'Rank': perf.rank,
                'Register No': perf.student.registerNo || 'N/A',
                'Student Name': perf.student.name,
            };

            examSubjects.forEach(sub => {
                const subDetail = perf.subjectDetails.find(s => s.subjectId === sub.id);
                row[`${sub.name} (out of ${sub.maxMarks})`] = subDetail?.isAbsent 
                    ? 'AB' 
                    : `${subDetail?.marks} / ${sub.maxMarks}`;
            });

            row['Total Marks'] = `${perf.obtained} / ${perf.max}`;
            row['Percentage (%)'] = `${perf.pct.toFixed(1)}%`;
            row['Status'] = perf.isPassed ? 'PASS' : 'FAIL';
            row['Classes Held (Up to Exam Date)'] = perf.classesTakenForStudent;
            row['Total Attendance (Days Present)'] = perf.presentCount;
            row['Attendance (%)'] = `${perf.attPct.toFixed(1)}%`;

            return row;
        });

        const filename = `Full_Result_${classObj.name}_${classObj.division}_${exam.name}`.replace(/\s+/g, '_');
        exportToExcel(data, filename, 'Full Class Result');
    };

    // PDF Export Handler
    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header Banner
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(0, 0, pageWidth, 26, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`FULL CLASS EXAMINATION RESULT`, 14, 12);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const cutoffLabel = cutoffIso ? `Attendance counted up to: ${cutoffIso}` : 'Attendance: All records';
        doc.text(`Class: ${classObj.name} ${classObj.division}  |  Mentor: ${mentorName}  |  Exam: ${exam.name}  |  ${cutoffLabel}`, 14, 19);

        // Calculate Total Max Score
        const totalMaxScore = examSubjects.reduce((sum, s) => sum + Number(s.maxMarks), 0);

        // Header Table Columns - Subject Max marks placed in the header row
        const subjectHeaders = examSubjects.map(s => `${s.name}\n(${s.maxMarks})`);
        const headers = ['Rank', 'Reg No', 'Student Name', ...subjectHeaders, `Total\n(${totalMaxScore})`, '%', 'Status', 'Classes Taken', 'Attendance', 'Att %'];

        // Rows - Obtained marks only in subject and total cells for compact page fitting
        const body = studentPerformances.map(perf => {
            const subjectCells = examSubjects.map(sub => {
                const subDetail = perf.subjectDetails.find(s => s.subjectId === sub.id);
                return subDetail?.isAbsent ? 'AB' : `${subDetail?.marks}`;
            });

            return [
                perf.rank,
                perf.student.registerNo || '-',
                perf.student.name,
                ...subjectCells,
                perf.obtained,
                `${perf.pct.toFixed(1)}%`,
                perf.isPassed ? 'PASS' : 'FAIL',
                perf.classesTakenForStudent,
                perf.presentCount,
                `${perf.attPct.toFixed(1)}%`
            ];
        });

        autoTable(doc, {
            startY: 30,
            head: [headers],
            body: body,
            styles: {
                fontSize: 7.5,
                cellPadding: 1.5,
                font: 'helvetica',
                textColor: [31, 41, 55],
                overflow: 'linebreak',
                halign: 'center'
            },
            columnStyles: {
                2: { halign: 'left' } // Student Name left-aligned
            },
            headStyles: {
                fillColor: [79, 70, 229], // Indigo-600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251]
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === (3 + examSubjects.length + 2)) {
                    // Status column
                    if (data.cell.raw === 'PASS') {
                        data.cell.styles.textColor = [16, 185, 129];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    if (data.cell.raw === 'FAIL') {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            margin: { top: 8, right: 6, bottom: 12, left: 6 },
            tableWidth: 'auto'
        });

        // Footers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(156, 163, 175);
            doc.text(
                `Generated on ${format(new Date(), 'PPP p')} • Page ${i} of ${pageCount}`,
                pageWidth - 14,
                pageHeight - 6,
                { align: 'right' }
            );
        }

        const filename = `Full_Result_${classObj.name}_${classObj.division}_${exam.name}`.replace(/\s+/g, '_');
        doc.save(`${filename}.pdf`);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-white tracking-wide">Class Full Result Sheet</h3>
                                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    {classObj.name} - {classObj.division}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                                <span>Mentor: <strong className="text-slate-200">{mentorName}</strong></span>
                                <span>•</span>
                                <span>Exam: <strong className="text-slate-200">{exam.name}</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-amber-300">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Attendance Cutoff: <strong className="text-amber-200">{cutoffIso || 'All Date Records'}</strong>
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Summary Banner */}
                <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center shrink-0">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Students</p>
                        <p className="text-lg font-black text-slate-800">{statsSummary.total}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Class Average</p>
                        <p className="text-lg font-black text-indigo-600">{statsSummary.classAvg}%</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pass Rate</p>
                        <p className="text-lg font-black text-emerald-600">{statsSummary.passPct}% ({statsSummary.passCount})</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Failed Students</p>
                        <p className="text-lg font-black text-rose-600">{statsSummary.failCount}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                            Total Classes Held
                            {isLoadingAtt && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                        </p>
                        <p className="text-lg font-black text-amber-700">{totalClassTakenCount} Days</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search student or reg no..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none",
                                    statusFilter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                All ({studentPerformances.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('pass')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none",
                                    statusFilter === 'pass' ? "bg-emerald-500 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-100/50"
                                )}
                            >
                                Passed ({statsSummary.passCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter('fail')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none",
                                    statusFilter === 'fail' ? "bg-rose-500 text-white shadow-sm" : "text-rose-700 hover:bg-rose-100/50"
                                )}
                            >
                                Failed ({statsSummary.failCount})
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <Button
                            onClick={handleExportExcel}
                            variant="secondary"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Export Excel</span>
                        </Button>
                        <Button
                            onClick={handleExportPDF}
                            variant="primary"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-sm transition-all"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download Full PDF</span>
                        </Button>
                    </div>
                </div>

                {/* Result Table Container */}
                <div className="flex-1 overflow-auto p-4 bg-slate-50">
                    {filteredPerformances.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="font-semibold text-slate-600">No student results found matching filter criteria.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-full">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                                            <th className="py-3.5 px-3 text-center w-12 sticky left-0 bg-slate-900 z-10">Rank</th>
                                            <th className="py-3.5 px-3 w-28">Reg No</th>
                                            <th className="py-3.5 px-4 min-w-[160px]">Student Name</th>
                                            
                                            {/* Dynamic Subject Columns */}
                                            {examSubjects.map(sub => (
                                                <th key={sub.id} className="py-3.5 px-3 text-center min-w-[80px] border-l border-slate-800 bg-slate-900">
                                                    <div className="truncate max-w-[120px]" title={sub.name}>{sub.name}</div>
                                                    <div className="text-[9px] text-indigo-300 font-semibold normal-case">Max: {sub.maxMarks}</div>
                                                </th>
                                            ))}

                                            <th className="py-3.5 px-3 text-center min-w-[90px] border-l border-slate-800">
                                                <div>Total</div>
                                                <div className="text-[9px] text-indigo-300 font-semibold normal-case">Max: {examSubjects.reduce((sum, s) => sum + Number(s.maxMarks), 0)}</div>
                                            </th>
                                            <th className="py-3.5 px-3 text-center min-w-[85px]">Percentage</th>
                                            <th className="py-3.5 px-3 text-center min-w-[85px]">Status</th>
                                            <th className="py-3.5 px-3 text-center min-w-[95px] border-l border-slate-800 bg-amber-950/40 text-amber-200">
                                                Classes Taken
                                                <div className="text-[9px] text-amber-300/80 font-normal normal-case">Upto Exam Date</div>
                                            </th>
                                            <th className="py-3.5 px-3 text-center min-w-[100px] bg-amber-950/40 text-amber-200">
                                                Total Attendance
                                                <div className="text-[9px] text-amber-300/80 font-normal normal-case">Days Present</div>
                                            </th>
                                            <th className="py-3.5 px-3 text-center min-w-[80px] bg-amber-950/40 text-amber-200">Att. %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {filteredPerformances.map((perf, index) => (
                                            <tr 
                                                key={perf.student.id}
                                                className={clsx(
                                                    "hover:bg-indigo-50/40 transition-colors",
                                                    index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                                                )}
                                            >
                                                {/* Rank */}
                                                <td className="py-3 px-3 text-center font-bold sticky left-0 bg-inherit z-10 border-r border-slate-100">
                                                    <span className={clsx(
                                                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px]",
                                                        perf.rank === 1 ? "bg-amber-100 text-amber-800 border border-amber-300 font-extrabold" :
                                                        perf.rank === 2 ? "bg-slate-200 text-slate-800 border border-slate-300 font-bold" :
                                                        perf.rank === 3 ? "bg-orange-100 text-orange-800 border border-orange-300 font-bold" :
                                                        "text-slate-600 font-medium"
                                                    )}>
                                                        {perf.rank}
                                                    </span>
                                                </td>

                                                {/* Reg No */}
                                                <td className="py-3 px-3 font-mono text-slate-500 font-semibold">{perf.student.registerNo || '-'}</td>

                                                {/* Name */}
                                                <td className="py-3 px-4 font-bold text-slate-900">{perf.student.name}</td>

                                                {/* Subject Marks */}
                                                {examSubjects.map(sub => {
                                                    const subDetail = perf.subjectDetails.find(s => s.subjectId === sub.id);
                                                    return (
                                                        <td key={sub.id} className="py-3 px-3 text-center font-semibold border-l border-slate-100">
                                                            {subDetail?.isAbsent ? (
                                                                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-extrabold">AB</span>
                                                            ) : (
                                                                <span className={clsx(
                                                                    subDetail?.isPassed ? "text-slate-800 font-bold" : "text-rose-600 font-bold"
                                                                )}>
                                                                    {subDetail?.marks}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Total Marks */}
                                                <td className="py-3 px-3 text-center font-extrabold text-slate-900 border-l border-slate-100 bg-slate-50/50">
                                                    {perf.obtained}
                                                </td>

                                                {/* Percentage */}
                                                <td className="py-3 px-3 text-center font-black text-indigo-700">
                                                    {perf.pct.toFixed(1)}%
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-3 text-center">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase shadow-2xs",
                                                        perf.isPassed ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
                                                    )}>
                                                        {perf.isPassed ? 'PASS' : 'FAIL'}
                                                    </span>
                                                </td>

                                                {/* Total Class Taken Upto Exam Date */}
                                                <td className="py-3 px-3 text-center font-bold text-slate-700 border-l border-amber-100 bg-amber-50/30">
                                                    {perf.classesTakenForStudent}
                                                </td>

                                                {/* Total Attendance Upto Exam Date */}
                                                <td className="py-3 px-3 text-center font-extrabold text-amber-900 bg-amber-50/30">
                                                    {perf.presentCount} <span className="text-[10px] text-slate-400 font-normal">days</span>
                                                </td>

                                                {/* Attendance % */}
                                                <td className="py-3 px-3 text-center bg-amber-50/30">
                                                    <span className={clsx(
                                                        "font-bold text-xs px-2 py-0.5 rounded",
                                                        perf.attPct >= 75 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50 font-black"
                                                    )}>
                                                        {perf.attPct.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                    <p className="text-xs text-slate-500 font-medium">
                        Showing <strong className="text-slate-800">{filteredPerformances.length}</strong> of {studentPerformances.length} students
                    </p>
                    <Button onClick={onClose} variant="secondary" className="px-5 text-xs font-bold">
                        Close Sheet
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default FullClassResultModal;
