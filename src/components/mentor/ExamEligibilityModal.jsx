import React, { useState, useMemo } from 'react';
import { X, Search, UserCheck, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Download, Printer, FileSpreadsheet, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { format } from 'date-fns';

const ExamEligibilityModal = ({ isOpen, onClose, classObj, exam, students = [], attendance = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'eligible' | 'ineligible'

    if (!isOpen || !classObj || !exam) return null;

    const reqPct = Number(exam.minAttendancePercent) || 0;

    // Filter students for this class
    const classStudents = useMemo(() => {
        return (students || []).filter(s => s.classId === classObj.id);
    }, [students, classObj]);

    // Calculate detailed attendance & eligibility for each student
    const studentEligibilityList = useMemo(() => {
        return classStudents.map(student => {
            const studentRecords = (attendance || []).filter(a => a.studentId === student.id);
            const totalDays = studentRecords.length;
            const presentDays = studentRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const pct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
            const isEligible = reqPct === 0 || pct >= reqPct;
            const shortfall = Math.max(0, reqPct - pct);

            return {
                ...student,
                totalDays,
                presentDays,
                pct,
                isEligible,
                shortfall
            };
        });
    }, [classStudents, attendance, reqPct]);

    // Summary Statistics
    const stats = useMemo(() => {
        const total = studentEligibilityList.length;
        const eligible = studentEligibilityList.filter(s => s.isEligible).length;
        const ineligible = total - eligible;
        return { total, eligible, ineligible };
    }, [studentEligibilityList]);

    // Filtered list based on Search & Tabs
    const filteredList = useMemo(() => {
        return studentEligibilityList.filter(s => {
            // Tab filter
            if (filterTab === 'eligible' && !s.isEligible) return false;
            if (filterTab === 'ineligible' && s.isEligible) return false;

            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const name = (s.name || '').toLowerCase();
                const reg = (s.registerNo || '').toLowerCase();
                return name.includes(term) || reg.includes(term);
            }

            return true;
        });
    }, [studentEligibilityList, filterTab, searchTerm]);

    // Export Handlers
    const handleExportExcel = () => {
        const data = studentEligibilityList.map((s, idx) => ({
            'SL No': idx + 1,
            'Register No': s.registerNo || 'N/A',
            'Student Name': s.name,
            'Class': `${classObj.name}-${classObj.division}`,
            'Present Days': s.presentDays,
            'Total Days': s.totalDays,
            'Attendance (%)': `${s.pct}%`,
            'Min Required (%)': `${reqPct}%`,
            'Eligibility Status': s.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE',
            'Shortfall (%)': s.shortfall > 0 ? `-${s.shortfall}%` : 'None'
        }));

        exportToExcel(
            data,
            `Exam_Eligibility_${classObj.name}_${classObj.division}_${exam.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`,
            'Exam Eligibility'
        );
    };

    const handleExportPDF = () => {
        const headers = ['Reg No', 'Student Name', 'Present/Total', 'Attendance %', 'Min Req %', 'Status'];
        const data = studentEligibilityList.map(s => [
            s.registerNo || 'N/A',
            s.name,
            `${s.presentDays} / ${s.totalDays}`,
            `${s.pct}%`,
            `${reqPct}%`,
            s.isEligible ? 'ELIGIBLE' : `NOT ELIGIBLE (-${s.shortfall}%)`
        ]);

        exportToPDF(
            data,
            headers,
            `Exam_Eligibility_${classObj.name}_${classObj.division}_${format(new Date(), 'yyyy-MM-dd')}`,
            `EXAM ELIGIBILITY REPORT - CLASS ${classObj.name}-${classObj.division}`,
            `Exam: ${exam.name} | Min Required Attendance: ${reqPct > 0 ? `${reqPct}%` : 'None'} | Total: ${stats.total}, Eligible: ${stats.eligible}, Not Eligible: ${stats.ineligible}`
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transition-all">
                
                {/* Header */}
                <div className="p-5 sm:p-6 bg-linear-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white flex justify-between items-start shrink-0 relative">
                    <div className="pr-8">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/15 text-indigo-100 border border-white/20">
                                Exam Eligibility Audit
                            </span>
                            {reqPct > 0 ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-amber-300" /> Req: {reqPct}%
                                </span>
                            ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                                    No Min Restriction
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Class {classObj.name}-{classObj.division} Eligibility</h2>
                        <p className="text-xs sm:text-sm text-indigo-200 font-medium mt-0.5">Exam: <span className="font-bold text-white">{exam.name}</span></p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
                        title="Close Modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Container */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/50">

                    {/* Stat Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs text-center">
                            <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">MIN REQUIRED</p>
                            <p className="text-lg sm:text-xl font-black text-gray-900">{reqPct > 0 ? `${reqPct}%` : '0%'}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs text-center">
                            <p className="text-[10px] sm:text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">TOTAL STUDENTS</p>
                            <p className="text-lg sm:text-xl font-black text-indigo-900">{stats.total}</p>
                        </div>
                        <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-100/80 shadow-xs text-center">
                            <p className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> ELIGIBLE
                            </p>
                            <p className="text-lg sm:text-xl font-black text-emerald-700">{stats.eligible}</p>
                        </div>
                        <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-100/80 shadow-xs text-center">
                            <p className="text-[10px] sm:text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> NOT ELIGIBLE
                            </p>
                            <p className="text-lg sm:text-xl font-black text-rose-700">{stats.ineligible}</p>
                        </div>
                    </div>

                    {/* Search & Action Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl shrink-0 self-start sm:self-auto shadow-xs">
                            <button
                                onClick={() => setFilterTab('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    filterTab === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                All ({stats.total})
                            </button>
                            <button
                                onClick={() => setFilterTab('eligible')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    filterTab === 'eligible' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-emerald-700'
                                }`}
                            >
                                Eligible ({stats.eligible})
                            </button>
                            <button
                                onClick={() => setFilterTab('ineligible')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    filterTab === 'ineligible' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:text-rose-700'
                                }`}
                            >
                                Not Eligible ({stats.ineligible})
                            </button>
                        </div>

                        {/* Search Input & Exports */}
                        <div className="flex items-center gap-2 flex-1 sm:justify-end">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search student or Reg No..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <Button onClick={handleExportExcel} variant="secondary" className="text-xs py-1.5 px-3 font-bold gap-1.5 bg-white border border-gray-200 shrink-0">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
                            </Button>
                            <Button onClick={handleExportPDF} variant="secondary" className="text-xs py-1.5 px-3 font-bold gap-1.5 bg-white border border-gray-200 shrink-0">
                                <Printer className="w-4 h-4 text-indigo-600" /> PDF
                            </Button>
                        </div>
                    </div>

                    {/* Student Eligibility List */}
                    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                        {filteredList.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs font-medium">
                                No student records found matching filter.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                <div className="bg-gray-50/80 px-4 py-2.5 grid grid-cols-12 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <span className="col-span-4 sm:col-span-5">Student Info</span>
                                    <span className="col-span-3 sm:col-span-3 text-center">Attendance</span>
                                    <span className="col-span-5 sm:col-span-4 text-right">Eligibility Status</span>
                                </div>
                                {filteredList.map((s, idx) => (
                                    <div key={s.id} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-gray-50/80 transition-colors text-xs">
                                        
                                        {/* Student Info */}
                                        <div className="col-span-4 sm:col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                                            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                                                {s.registerNo ? String(s.registerNo).slice(-2) : idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-gray-900 truncate">{s.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">Reg: {s.registerNo || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Attendance Progress & Stats */}
                                        <div className="col-span-3 sm:col-span-3 text-center px-1">
                                            <span className="font-mono font-bold text-gray-700 text-[11px]">{s.presentDays} / {s.totalDays} Days</span>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1 max-w-[100px] mx-auto">
                                                <div 
                                                    className={`h-full transition-all rounded-full ${
                                                        s.isEligible ? 'bg-emerald-500' : 'bg-rose-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, s.pct)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Eligibility Badge & Shortfall Note */}
                                        <div className="col-span-5 sm:col-span-4 flex flex-col items-end justify-center">
                                            {s.isEligible ? (
                                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/90 flex items-center gap-1.5 shadow-2xs">
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                    Eligible ({s.pct}%)
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200/90 flex items-center gap-1.5 shadow-2xs">
                                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                    Not Eligible ({s.pct}%)
                                                </span>
                                            )}
                                            {s.shortfall > 0 && (
                                                <span className="text-[10px] font-bold text-rose-600 mt-0.5">
                                                    Short by {s.shortfall}% (Req: {reqPct}%)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                        Showing {filteredList.length} of {studentEligibilityList.length} students
                    </p>
                    <Button onClick={onClose} variant="secondary" className="px-5 text-xs font-bold">
                        Close Report
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExamEligibilityModal;
