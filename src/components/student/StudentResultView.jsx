import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Trophy, FileText, Calendar, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudentResultView = () => {
    const { currentUser, exams, subjects, results, institutionSettings } = useData();
    const [selectedExamId, setSelectedExamId] = useState('');

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

    const downloadPDF = () => {
        const doc = new jsPDF();
        const exam = exams.find(e => e.id === selectedExamId);

        // Header
        doc.setFontSize(20);
        doc.text(institutionSettings?.name || "Attendance Recorder", 105, 15, { align: "center" });
        doc.setFontSize(14);
        doc.text(institutionSettings?.tagline || "Track Smart, Act Fast", 105, 22, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);

        // Exam & Student Details
        doc.setFontSize(12);
        doc.text(`Exam Report: ${exam ? exam.name : 'N/A'}`, 20, 35);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 35);

        doc.text(`Student Name: ${currentUser.name}`, 20, 45);
        doc.text(`Register No: ${currentUser.registerNo}`, 20, 52);

        // Table
        const tableColumn = ["Subject", "Max Marks", "Pass Marks", "Obtained", "Grade", "Result"];
        const tableRows = [];

        myResults.forEach(r => {
            const subject = subjects.find(s => s.id === r.subjectId);
            const max = Number(subject?.maxMarks || 100);
            const pass = Number(subject?.passMarks || 40);
            const marks = Number(r.marks);
            const pct = (marks / max) * 100;

            let grade = 'F';
            if (pct >= 90) grade = 'A+';
            else if (pct >= 80) grade = 'A';
            else if (pct >= 70) grade = 'B';
            else if (pct >= 60) grade = 'C';
            else if (pct >= 50) grade = 'D';

            const status = marks >= pass ? "PASS" : "FAIL";

            tableRows.push([
                subject?.name || 'Unknown',
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
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Marks: ${totalMarks} / ${totalMax}`, 20, finalY);
        doc.text(`Percentage: ${percentage}%`, 20, finalY + 7);

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

        doc.save(`${currentUser.registerNo}_${exam ? exam.name.replace(/\s+/g, '_') : 'Report'}.pdf`);
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
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Download Report
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
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-md">
                                        <p className="text-indigo-100 text-sm font-medium mb-1">Total Marks</p>
                                        <p className="text-3xl font-bold">{totalMarks} <span className="text-lg text-indigo-200">/ {totalMax}</span></p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
                                        <p className="text-purple-100 text-sm font-medium mb-1">Percentage</p>
                                        <p className="text-3xl font-bold">{percentage}%</p>
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
            </Card>
        </div>
    );
};

export default StudentResultView;
