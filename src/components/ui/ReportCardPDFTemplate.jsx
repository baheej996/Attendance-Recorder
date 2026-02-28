import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

/**
 * High-fidelity, exact replica of the requested Report Card design for PDF Export.
 * This component is rendered off-screen and strictly dimensioned to A4 size mapping.
 */
export const ReportCardPDFTemplate = forwardRef(({ student, exam, rank, stats }, ref) => {
    if (!student || !exam || !stats) return null;

    // A4 dimensions at 96 DPI: 794 x 1123, we'll use 800 x 1131 for clean rounding
    return (
        <div
            id="report-card-pdf-template"
            ref={ref}
            className="bg-white text-gray-900"
            style={{ width: '800px', height: '1131px', fontFamily: '"Inter", sans-serif', boxSizing: 'border-box' }}
        >
            <div className="relative h-full w-full bg-white p-12 flex flex-col pt-8">

                {/* 1. Header Title */}
                <div className="text-center mt-6 mb-6">
                    <h1 className="text-4xl font-black text-gray-800 tracking-tight leading-none mb-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                        ANNUAL EXAMINATION
                    </h1>
                    <h2 className="text-4xl font-bold text-gray-600 tracking-tight leading-none">
                        MARKLIST <span className="font-light text-gray-500">({new Date(exam.date).getFullYear()}-{String(new Date(exam.date).getFullYear() + 1).slice(-2)})</span>
                    </h2>
                </div>

                {/* 2. Student Info Box */}
                <div className="bg-[#f8f9fc] rounded-xl p-6 mb-6 flex flex-row items-center justify-between border-0">
                    <div>
                        <h3 className="text-2xl font-bold text-[#1e293b] mb-1">{student.name}</h3>
                        <p className="text-[#64748b] text-sm">SKIMVB Annual Examination {new Date(exam.date).getFullYear()}-{String(new Date(exam.date).getFullYear() + 1).slice(-2)} • Result Details</p>
                        {student.registerNo && <p className="text-[#64748b] text-sm mt-1 font-mono">Reg No: {student.registerNo}</p>}
                    </div>
                    {student.classDetails && (
                        <div className="text-right">
                            <span className="text-2xl font-bold text-[#1e293b]">Class: {student.classDetails}</span>
                        </div>
                    )}
                </div>

                {/* 3. Stat Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {/* Result */}
                    <div className={clsx("rounded-xl p-4 border", stats.isOverallPassed ? "bg-[#f0fdf4] border-[#dcfce7]" : "bg-[#fef2f2] border-[#fee2e2]")}>
                        <p className={clsx("text-xs font-bold mb-1", stats.isOverallPassed ? "text-[#166534]" : "text-[#991b1b]")}>Result</p>
                        <p className={clsx("text-2xl font-black", stats.isOverallPassed ? "text-[#14532d]" : "text-[#7f1d1d]")}>
                            {stats.isOverallPassed ? "PASS" : "FAIL"}
                        </p>
                    </div>
                    {/* Percentage */}
                    <div className="rounded-xl p-4 bg-[#eff6ff] border border-[#dbeafe]">
                        <p className="text-xs font-bold text-[#1d4ed8] mb-1">Percentage</p>
                        <p className="text-2xl font-black text-[#1e3a8a]">{stats.overallPercentage.toFixed(1)}%</p>
                    </div>
                    {/* Rank */}
                    <div className="rounded-xl p-4 bg-[#faf5ff] border border-[#f3e8ff]">
                        <p className="text-xs font-bold text-[#7e22ce] mb-1">Class Rank</p>
                        <p className="text-2xl font-black text-[#581c87]">#{rank}</p>
                    </div>
                    {/* Total Marks */}
                    <div className="rounded-xl p-4 bg-[#eef2ff] border border-[#e0e7ff]">
                        <p className="text-xs font-bold text-[#4338ca] mb-1">Total Marks</p>
                        <p className="text-2xl font-black text-[#312e81]">
                            {stats.totalObtained} <span className="text-sm font-medium text-[#6366f1]">/ {stats.totalMax}</span>
                        </p>
                    </div>
                </div>

                {/* 4. Table Area (With Watermark) */}
                <div className="relative border border-[#e2e8f0] rounded-xl overflow-hidden flex-grow mb-8">
                    {/* Watermark Logo */}
                    <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <img src="/skimvb-logo.jpg" alt="Watermark" className="w-80 object-contain grayscale" />
                    </div>

                    {/* Table Data */}
                    <table className="w-full relative z-10">
                        <thead>
                            <tr className="border-b border-[#e2e8f0]">
                                <th className="text-left py-3 px-6 text-xs font-bold text-[#64748b] tracking-wider uppercase">Subject</th>
                                <th className="text-center py-3 px-6 text-xs font-bold text-[#64748b] tracking-wider uppercase">Marks</th>
                                <th className="text-right py-3 px-6 text-xs font-bold text-[#64748b] tracking-wider uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0]">
                            {stats.subjectBreakdown.map((sub, idx) => (
                                <tr key={sub.id || idx}>
                                    <td className="py-3 px-6 text-sm font-bold text-[#334155]">{sub.name}</td>
                                    <td className="py-3 px-6 text-sm font-medium text-[#64748b] text-center">
                                        {sub.isAbsent ? <span className="text-red-500 font-bold">AB</span> : `${sub.marks} / ${sub.maxMarks}`}
                                    </td>
                                    <td className="py-3 px-6 text-right">
                                        <span className={clsx(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide uppercase",
                                            sub.isPassed ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fee2e2] text-[#991b1b]"
                                        )}>
                                            {sub.isPassed ? 'Pass' : 'Fail'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 5. Signatures */}
                <div className="flex justify-between items-end px-12 mb-8">
                    <div>
                        <p className="text-[#64748b] text-sm mb-1">Published Date:</p>
                        <p className="text-[#334155] font-medium">{format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[#334155] text-sm mb-1">Sd/-</p>
                        <p className="text-[#334155] text-sm">OP Siraj Faizy, Chief Mentor</p>
                    </div>
                </div>

                {/* 6. Absolute Footer */}
                <div className="mt-auto border-t border-[#e2e8f0] pt-6 flex flex-row items-center gap-5">
                    <img src="/samastha-logo.jpg" alt="Samastha Logo" className="h-[4.5rem] object-contain shrink-0" />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-black text-[22px] tracking-tight mb-1" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                            Samastha E-Learning Online Global Madrasa
                        </h4>
                        <p className="text-black text-[11.5px] leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                            Global Education Centre, Samastha Central Office, Francis Road, Calicut - 03, Ph: +91 8590518541<br />
                            Pin code: 673003, Website: www.samasthaelearning.com, E-mail: samasthaelearning@gmail.com
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});

ReportCardPDFTemplate.displayName = 'ReportCardPDFTemplate';
