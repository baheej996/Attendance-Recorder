import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { X, User, BookOpen, Activity, Calendar as CalendarIcon, Award, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const StudentProfileModal = ({ studentId, isOpen, onClose }) => {
    const {
        students,
        classes,
        results,
        exams,
        subjects,
        activitySubmissions,
        activities,
        prayerRecords,
        attendance,
        institutionSettings
    } = useData();

    const [activeTab, setActiveTab] = useState('overview');

    const student = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);
    const studentClass = useMemo(() => classes.find(c => c.id === student?.classId), [classes, student]);

    // --- Data Helpers ---

    // Exam Data
    const examData = useMemo(() => {
        if (!student) return [];
        // Filter results for this student
        const studentResults = results.filter(r => r.studentId === studentId);

        // Group by Exam
        return exams.map(exam => {
            const examResults = studentResults.filter(r => r.examId === exam.id);
            if (examResults.length === 0 && exam.status !== 'Published') return null;

            const totalMarks = examResults.reduce((sum, r) => sum + Number(r.marks), 0);

            // Get subjects for this class to calculate total possible marks
            // Assuming all subjects in class are part of the exam if not specific
            const classSubjects = subjects.filter(s => s.classId === student.classId && s.isExamSubject);
            const maxPossible = classSubjects.reduce((sum, s) => sum + Number(s.maxMarks || 100), 0);

            // Calculate Rank
            let rank = '-';
            if (examResults.length > 0) {
                const classStudentIds = students.filter(s => s.classId === student.classId).map(s => s.id);
                const classResults = results.filter(r => r.examId === exam.id && classStudentIds.includes(r.studentId));

                const studentTotals = {};
                classResults.forEach(r => {
                    if (!studentTotals[r.studentId]) studentTotals[r.studentId] = 0;
                    studentTotals[r.studentId] += Number(r.marks);
                });

                const uniqueScores = [...new Set(Object.values(studentTotals))].sort((a, b) => b - a);
                const studentTotal = studentTotals[studentId] || 0;
                const calculatedRank = uniqueScores.indexOf(studentTotal) + 1;
                rank = calculatedRank > 0 ? calculatedRank : '-';
            }

            return {
                id: exam.id,
                name: exam.name,
                date: exam.date,
                score: totalMarks,
                max: maxPossible,
                rank: rank,
                results: examResults.map(r => {
                    const subject = subjects.find(s => s.id === r.subjectId);
                    return {
                        subjectName: subject?.name || 'Unknown Subject',
                        marks: r.marks,
                        maxMarks: subject?.maxMarks || 100,
                        passMarks: subject?.passMarks || 40
                    };
                })
            };
        }).filter(Boolean);
    }, [exams, results, subjects, studentId, student, students]);

    // Activity Data
    const activityData = useMemo(() => {
        if (!student) return [];
        // Get all activities for student's class
        const classActivities = activities.filter(a => a.classId === student.classId && a.status === 'Active');

        return classActivities.map(activity => {
            const submission = activitySubmissions.find(s => s.activityId === activity.id && s.studentId === studentId);
            return {
                ...activity,
                isCompleted: submission?.status === 'Completed',
                points: submission?.points || 0,
                completedAt: submission?.timestamp
            };
        });
    }, [activities, activitySubmissions, student, studentId]);

    // Prayer Data (Weekly)
    const prayerData = useMemo(() => {
        if (!student) return [];
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const end = endOfWeek(today, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        const studentRecords = prayerRecords.filter(r => r.studentId === studentId);

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = studentRecords.find(r => r.date === dateStr);
            let count = 0;
            if (record && record.prayers) {
                count = Object.values(record.prayers).filter(Boolean).length;
            }
            return { date: day, count };
        });
    }, [prayerRecords, studentId]);

    // Attendance Data
    const attendanceStats = useMemo(() => {
        if (!student) return { present: 0, absent: 0, total: 0, percentage: 0, records: [] };
        const studentAttendance = attendance.filter(a => a.studentId === studentId);
        const present = studentAttendance.filter(a => a.status === 'Present').length;
        const absent = studentAttendance.filter(a => a.status === 'Absent').length;
        const total = studentAttendance.length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

        return { present, absent, total, percentage, records: studentAttendance };
    }, [attendance, studentId]);

    const downloadExamPDF = (exam) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text(institutionSettings?.name || "Attendance Recorder", 105, 15, { align: "center" });
        doc.setFontSize(14);
        doc.text(institutionSettings?.tagline || "Track Smart, Act Fast", 105, 22, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);

        // Exam & Student Details
        doc.setFontSize(12);
        doc.text(`Exam Report: ${exam.name}`, 20, 35);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 35);

        doc.text(`Student Name: ${student.name}`, 20, 45);
        doc.text(`Register No: ${student.registerNo}`, 20, 52);
        doc.text(`Rank: ${exam.rank}`, 150, 45);

        // Table
        const tableColumn = ["Subject", "Max Marks", "Pass Marks", "Obtained", "Grade", "Result"];
        const tableRows = [];

        exam.results.forEach(r => {
            const max = Number(r.maxMarks || 100);
            const pass = Number(r.passMarks || 40);
            const marks = Number(r.marks);
            const pct = max > 0 ? (marks / max) * 100 : 0;

            let grade = 'F';
            if (pct >= 90) grade = 'A+';
            else if (pct >= 80) grade = 'A';
            else if (pct >= 70) grade = 'B';
            else if (pct >= 60) grade = 'C';
            else if (pct >= 50) grade = 'D';

            const status = marks >= pass ? "PASS" : "FAIL";

            tableRows.push([
                r.subjectName,
                max,
                pass,
                marks,
                grade,
                status
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] } // Indigo-600
        });

        // Summary
        const percentage = exam.max > 0 ? ((exam.score / exam.max) * 100).toFixed(1) : 0;
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Marks: ${exam.score} / ${exam.max}`, 20, finalY);
        doc.text(`Percentage: ${percentage}%`, 20, finalY + 7);
        doc.text(`Class Rank: ${exam.rank}`, 20, finalY + 14);

        // Footer signature placeholder
        const hasSignature = institutionSettings?.signatureImage;

        if (hasSignature) {
            try {
                doc.addImage(institutionSettings.signatureImage, 'PNG', 140, finalY + 15, 40, 15);
            } catch (err) {
                console.error("Error adding signature image:", err);
            }
        }

        doc.text("Principal's Signature:", 140, finalY + 35);
        doc.line(140, finalY + 33, 190, finalY + 33);

        doc.save(`${student.registerNo}_${exam.name.replace(/\s+/g, '_')}.pdf`);
    };

    if (!student || !isOpen) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'exams', label: 'Exams', icon: BookOpen },
        { id: 'activities', label: 'Activities', icon: Activity },
        { id: 'prayer', label: 'Prayer Chart', icon: CalendarIcon },
        { id: 'attendance', label: 'Attendance', icon: Clock },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold border-4 border-white shadow-sm">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                            <p className="text-gray-500">
                                Class {studentClass?.name}-{studentClass?.division} • {student.registerNo}
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Status: {student.status}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Gender: {student.gender}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/30 flex flex-row md:flex-col p-2 md:p-4 gap-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto shrink-0 scrollbar-hide">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                >
                                    <Icon className={clsx("w-4 h-4 md:w-5 md:h-5", activeTab === tab.id ? "text-white" : "text-gray-400")} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
                                        <div className="flex items-center gap-3 mb-2 opacity-90">
                                            <CalendarIcon className="w-5 h-5" />
                                            <h3 className="font-semibold">Attendance</h3>
                                        </div>
                                        <p className="text-3xl font-bold">{attendanceStats.percentage}%</p>
                                        <p className="text-sm opacity-80 mt-1">Present Days: {attendanceStats.present}/{attendanceStats.total}</p>
                                    </Card>
                                    <Card className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
                                        <div className="flex items-center gap-3 mb-2 opacity-90">
                                            <Award className="w-5 h-5" />
                                            <h3 className="font-semibold">Activities</h3>
                                        </div>
                                        <p className="text-3xl font-bold">
                                            {activityData.filter(a => a.isCompleted).length}/{activityData.length}
                                        </p>
                                        <p className="text-sm opacity-80 mt-1">Completed Tasks</p>
                                    </Card>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Exams</h3>
                                    {examData.length > 0 ? (
                                        <div className="space-y-3">
                                            {examData.slice(0, 3).map(exam => (
                                                <div key={exam.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{exam.name}</h4>
                                                        <p className="text-sm text-gray-500">{format(new Date(exam.date), 'MMM d, yyyy')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-xl font-bold text-indigo-600">
                                                            {exam.score} / {exam.max}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No recent exams.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Exams Tab */}
                        {activeTab === 'exams' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-900">Exam Results</h3>
                                {examData.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">No exam data found.</div>
                                ) : (
                                    examData.map(exam => (
                                        <Card key={exam.id} className="overflow-hidden">
                                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{exam.name}</h4>
                                                    <p className="text-xs text-gray-500">{format(new Date(exam.date), 'MMMM d, yyyy')}</p>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</div>
                                                        <div className="text-xl font-bold text-gray-900">#{exam.rank}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Score</div>
                                                        <div className="text-xl font-bold text-indigo-600">{exam.score} / {exam.max}</div>
                                                    </div>
                                                    {exam.results.length > 0 && (
                                                        <button
                                                            onClick={() => downloadExamPDF(exam)}
                                                            className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors border border-indigo-100 flex items-center justify-center shrink-0"
                                                            title="Download Report Card"
                                                        >
                                                            <BookOpen className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="divide-y divide-gray-100">
                                                {exam.results.length > 0 ? (
                                                    exam.results.map((r, i) => (
                                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                                            <span className="font-medium text-gray-700">{r.subjectName}</span>
                                                            <span className="font-mono font-semibold text-gray-900">{r.marks} / {r.maxMarks}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-sm text-gray-500">No results recorded yet.</div>
                                                )}
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Activities Tab */}
                        {activeTab === 'activities' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-900">Activity Log</h3>
                                {activityData.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">No activities assigned.</div>
                                ) : (
                                    <div className="grid gap-4">
                                        {activityData.map(activity => (
                                            <div key={activity.id} className={clsx(
                                                "p-4 rounded-xl border flex items-center justify-between",
                                                activity.isCompleted ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                                            )}>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{activity.title}</h4>
                                                    <p className="text-sm text-gray-500">{activity.description}</p>
                                                    {activity.isCompleted && (
                                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                            <Award className="w-3 h-3" />
                                                            Completed on {format(new Date(activity.completedAt), 'MMM d')} • {activity.points} points
                                                        </p>
                                                    )}
                                                </div>
                                                <div className={clsx(
                                                    "px-3 py-1 rounded-full text-xs font-bold",
                                                    activity.isCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                                )}>
                                                    {activity.isCompleted ? 'Completed' : 'Pending'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Prayer Tab */}
                        {activeTab === 'prayer' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-900">Prayer Consistency (This Week)</h3>

                                <Card className="p-6">
                                    <div className="space-y-4">
                                        {prayerData.map((day) => {
                                            const isToday = isSameDay(day.date, new Date());
                                            return (
                                                <div
                                                    key={day.date.toString()}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                                            day.count === 5 ? "bg-green-100 text-green-700" :
                                                                day.count > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                                                        )}>
                                                            {format(day.date, 'EE').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className={clsx("text-sm font-medium", isToday ? "text-indigo-600" : "text-gray-900")}>
                                                                {format(day.date, 'EEEE')}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{format(day.date, 'MMM d')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={clsx(
                                                                    "w-2 h-6 rounded-full",
                                                                    i < day.count ? "bg-green-400" : "bg-gray-200"
                                                                )}
                                                                title={i < day.count ? "Completed" : "Missed"}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Attendance Tab */}
                        {activeTab === 'attendance' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-900">Attendance History</h3>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="p-4 bg-green-50 rounded-xl text-center border border-green-100">
                                        <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                                        <div className="text-xs text-green-800 uppercase font-semibold tracking-wider">Present</div>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                                        <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                                        <div className="text-xs text-red-800 uppercase font-semibold tracking-wider">Absent</div>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                        <div className="text-2xl font-bold text-blue-600">{attendanceStats.percentage}%</div>
                                        <div className="text-xs text-blue-800 uppercase font-semibold tracking-wider">Rate</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {attendanceStats.records.sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => (
                                        <div key={record.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border-b border-gray-50">
                                            <span className="text-sm font-medium text-gray-700">{format(new Date(record.date), 'MMMM d, yyyy')}</span>
                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-xs font-bold",
                                                record.status === 'Present' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {record.status}
                                            </span>
                                        </div>
                                    ))}
                                    {attendanceStats.records.length === 0 && (
                                        <div className="text-center text-gray-400 py-8">No attendance records found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
