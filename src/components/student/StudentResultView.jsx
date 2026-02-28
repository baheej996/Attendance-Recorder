import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Trophy, FileText, Calendar, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { ReportCardPDFTemplate } from '../ui/ReportCardPDFTemplate';

const StudentResultView = () => {
    const { currentUser, exams, subjects, results, students, institutionSettings } = useData();
    const [selectedExamId, setSelectedExamId] = useState('');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const pdfRef = useRef(null);

    // Filter published exams only
    const publishedExams = exams.filter(e => e.status === 'Published');

    // Get results for current student for selected exam
    const myResults = results.filter(r =>
        r.studentId === currentUser?.id && r.examId === selectedExamId
    );

    const getSubjectName = (id) => {
        const s = subjects.find(sub => sub.id === id);
        return s ? s.name : 'Unknown Subject';
    };

    const getMaxMarks = (id) => {
        const s = subjects.find(sub => sub.id === id);
        return s ? s.maxMarks : 100;
    };

    const getPassMarks = (id) => {
        const s = subjects.find(sub => sub.id === id);
        return s && s.passMarks ? s.passMarks : 40;
    }

    const totalMarks = myResults.reduce((sum, r) => sum + Number(r.marks), 0);
    const totalMax = myResults.reduce((sum, r) => sum + getMaxMarks(r.subjectId), 0);
    const percentage = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 0;

    // Calculate Rank
    const getStudentRank = () => {
        if (!selectedExamId || myResults.length === 0) return null;

        const classStudentIds = students.filter(s => s.classId === currentUser.classId).map(s => s.id);
        const classResults = results.filter(r => r.examId === selectedExamId && classStudentIds.includes(r.studentId));

        const studentTotals = {};
        classResults.forEach(r => {
            if (!studentTotals[r.studentId]) studentTotals[r.studentId] = 0;
            studentTotals[r.studentId] += Number(r.marks);
        });

        const uniqueScores = [...new Set(Object.values(studentTotals))].sort((a, b) => b - a);
        const myTotal = studentTotals[currentUser.id] || 0;

        const rank = uniqueScores.indexOf(myTotal) + 1;
        return rank > 0 ? rank : '-';
    };

    const studentRank = getStudentRank();

    const stats = useMemo(() => {
        let passedCount = 0;
        const subjectBreakdown = myResults.map(r => {
            const subject = subjects.find(s => s.id === r.subjectId);
            const maxMarks = Number(subject?.maxMarks || 100);
            const passMarks = Number(subject?.passMarks || 40);
            const marks = Number(r.marks);
            const isPassed = marks >= passMarks;
            if (isPassed) passedCount++;

            return {
                id: r.id,
                name: subject?.name || 'Unknown',
                marks,
                maxMarks,
                isPassed,
                isAbsent: false
            };
        });

        const isOverallPassed = myResults.length > 0 && passedCount === myResults.length;

        return {
            totalObtained: totalMarks,
            totalMax: totalMax,
            overallPercentage: Number(percentage),
            isOverallPassed,
            subjectBreakdown
        };
    }, [myResults, subjects, totalMarks, totalMax, percentage]);

    const activeExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);

    const downloadPDF = () => {
        setIsGeneratingPDF(true);
        setTimeout(async () => {
            if (!pdfRef.current) {
                setIsGeneratingPDF(false);
                return;
            }
            try {
                const { toPng } = await import('html-to-image');
                const imgData = await toPng(pdfRef.current, {
                    cacheBust: true,
                    backgroundColor: '#ffffff',
                    pixelRatio: 2
                });

                // Standard A4: 210 x 297 mm
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${currentUser.registerNo}_${activeExam ? activeExam.name.replace(/\s+/g, '_') : 'ReportCard'}.pdf`);
            } catch (error) {
                console.error("Error generating PDF:", error);
                alert("Could not generate high-fidelity PDF. Please try again or check console.");
            } finally {
                setIsGeneratingPDF(false);
            }
        }, 150); // slight delay to ensure UI ref mounts fully
    };

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    My Report Card
                </h2>

                <div className="mb-6 flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                        <select
                            value={selectedExamId}
                            onChange={e => setSelectedExamId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                        >
                            <option value="">-- Choose Exam --</option>
                            {publishedExams.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({new Date(e.date).toLocaleDateString()})</option>
                            ))}
                        </select>
                    </div>

                    {selectedExamId && myResults.length > 0 && (
                        <button
                            onClick={downloadPDF}
                            disabled={isGeneratingPDF}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium disabled:opacity-75"
                        >
                            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {isGeneratingPDF ? 'Preparing...' : 'Download Report'}
                        </button>
                    )}
                </div>

                {selectedExamId && (
                    <div className="animate-fadeIn space-y-6">
                        {myResults.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                                Result not available for this exam yet.
                            </div>
                        ) : (
                            <>
                                {/* Score Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-md">
                                        <p className="text-indigo-100 text-sm font-medium mb-1">Total Marks</p>
                                        <p className="text-3xl font-bold">{totalMarks} <span className="text-lg text-indigo-200">/ {totalMax}</span></p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
                                        <p className="text-purple-100 text-sm font-medium mb-1">Percentage</p>
                                        <p className="text-3xl font-bold">{percentage}%</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
                                        <p className="text-blue-100 text-sm font-medium mb-1">Class Rank</p>
                                        <p className="text-3xl font-bold">#{studentRank}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-md flex flex-col justify-center items-center">
                                        <Trophy className="w-8 h-8 mb-2 opacity-80" />
                                        <p className="font-bold text-lg">Good Effort!</p>
                                    </div>
                                </div>

                                {/* Detailed Table */}
                                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks Obtained</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Marks</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {myResults.map(r => {
                                                const max = getMaxMarks(r.subjectId);
                                                const percent = (r.marks / max) * 100;
                                                let grade = 'F';
                                                if (percent >= 90) grade = 'A+';
                                                else if (percent >= 80) grade = 'A';
                                                else if (percent >= 70) grade = 'B';
                                                else if (percent >= 60) grade = 'C';
                                                else if (percent >= 50) grade = 'D';

                                                return (
                                                    <tr key={r.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getSubjectName(r.subjectId)}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{r.marks}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{max}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                                                                grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                                                    grade === 'F' ? 'bg-red-100 text-red-700' :
                                                                        'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {grade}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Hidden High-Fidelity PDF Template injected into DOM */}
                {selectedExamId && myResults.length > 0 && (
                    <ReportCardPDFTemplate
                        ref={pdfRef}
                        student={{
                            ...currentUser,
                            classDetails: students.find(s => s.id === currentUser.id)?.classId
                                ? `${students.find(s => s.id === currentUser.id).classDetails?.name || ''} ${students.find(s => s.id === currentUser.id).classDetails?.division || ''}`
                                : ''
                        }}
                        exam={activeExam}
                        rank={studentRank}
                        stats={stats}
                    />
                )}
            </Card>
        </div>
    );
};

export default StudentResultView;
