import React, { useState, useMemo } from 'react';
import { 
    ArrowLeft, 
    CheckCircle, 
    Trophy, 
    TrendingUp, 
    DollarSign, 
    Search, 
    Users, 
    Award, 
    Sparkles, 
    School, 
    Filter,
    Percent,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ExportButtons } from '../ui/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const ClassRevenueLeaderboard = ({ onBack, onTabChange }) => {
    const { 
        allStudents, 
        students, 
        classes, 
        feeStructures, 
        feePayments 
    } = useData();

    const { showAlert } = useUI();

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('revenue'); // 'revenue' | 'rate' | 'students' | 'pending'

    // Student Pool (All registered students across system)
    const studentPool = useMemo(() => {
        return (allStudents && allStudents.length > 0) ? allStudents : (students || []);
    }, [allStudents, students]);

    // O(1) Map of Student ID -> Class ID
    const studentClassMap = useMemo(() => {
        const map = new Map();
        studentPool.forEach(s => {
            if (s.id) map.set(s.id, s.classId);
        });
        return map;
    }, [studentPool]);

    // O(1) Map of Target ID -> Fee Structure
    const feeStructureMap = useMemo(() => {
        const map = new Map();
        (feeStructures || []).forEach(f => {
            if (f.targetId) map.set(f.targetId, f);
            if (f.id) map.set(f.id, f);
        });
        return map;
    }, [feeStructures]);

    // Helper: Get student fee structure total amount
    const getStudentFeeAmount = (student) => {
        if (!student) return null;
        const sStruct = feeStructureMap.get(student.id);
        if (sStruct && sStruct.totalAmount !== undefined && sStruct.totalAmount !== null) return Number(sStruct.totalAmount);

        if (student.classId) {
            const cStruct = feeStructureMap.get(student.classId);
            if (cStruct && cStruct.totalAmount !== undefined && cStruct.totalAmount !== null) return Number(cStruct.totalAmount);
        }

        return 12700; // Default base fee fallback for analytics estimation
    };

    // Filter payments for current academic year (2026-2027)
    const currentYearPayments = useMemo(() => {
        return (feePayments || []).filter(p => (p.academicYear || '2026-2027') === '2026-2027');
    }, [feePayments]);

    // Aggregate Class Revenue & Stats
    const allClassStats = useMemo(() => {
        const classStatsMap = new Map();
        const classNameToIdMap = new Map();

        (classes || []).forEach(c => {
            const displayName = `Class ${c.name}-${c.division}`;
            classStatsMap.set(c.id, {
                id: c.id,
                name: displayName,
                className: c.name,
                division: c.division,
                mentorName: c.mentorName || 'Unassigned',
                studentCount: 0,
                expectedFee: 0,
                collectedFee: 0
            });
            classNameToIdMap.set(displayName.toLowerCase(), c.id);
            classNameToIdMap.set(`${c.name}-${c.division}`.toLowerCase(), c.id);
        });

        // 1. Accumulate student counts & expected fee
        studentPool.forEach(s => {
            if (s.classId && classStatsMap.has(s.classId)) {
                const stat = classStatsMap.get(s.classId);
                stat.studentCount += 1;
                stat.expectedFee += getStudentFeeAmount(s);
            }
        });

        // 2. Accumulate collected payments per class
        currentYearPayments.forEach(p => {
            const amount = Number(p.amountPaid || 0);
            if (amount <= 0) return;

            let targetClassId = studentClassMap.get(p.studentId);
            if (!targetClassId && p.className) {
                for (const [classKey, clsId] of classNameToIdMap.entries()) {
                    if (p.className.toLowerCase().includes(classKey)) {
                        targetClassId = clsId;
                        break;
                    }
                }
            }

            if (targetClassId && classStatsMap.has(targetClassId)) {
                classStatsMap.get(targetClassId).collectedFee += amount;
            }
        });

        // Calculate pending fee & rate
        return Array.from(classStatsMap.values()).map(cls => {
            const rate = cls.expectedFee > 0 ? Math.min(100, Math.round((cls.collectedFee / cls.expectedFee) * 100)) : 0;
            return {
                ...cls,
                pendingFee: Math.max(0, cls.expectedFee - cls.collectedFee),
                rate
            };
        });
    }, [classes, studentPool, feeStructureMap, currentYearPayments, studentClassMap]);

    // High Level KPIs across all classes
    const kpis = useMemo(() => {
        const totalClasses = allClassStats.length;
        const totalCollected = allClassStats.reduce((acc, c) => acc + c.collectedFee, 0);
        const totalExpected = allClassStats.reduce((acc, c) => acc + c.expectedFee, 0);
        const overallRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

        const sortedByRev = [...allClassStats].sort((a, b) => b.collectedFee - a.collectedFee);
        const topClass = sortedByRev.length > 0 ? sortedByRev[0] : null;

        return {
            totalClasses,
            totalCollected,
            totalExpected,
            overallRate,
            topClass
        };
    }, [allClassStats]);

    // Filtered & Sorted Class List
    const processedClasses = useMemo(() => {
        let list = [...allClassStats];

        // Search Filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            list = list.filter(c => 
                c.name.toLowerCase().includes(term) || 
                c.mentorName.toLowerCase().includes(term) ||
                `${c.className}`.toLowerCase().includes(term)
            );
        }

        // Sorting
        list.sort((a, b) => {
            if (sortBy === 'revenue') return b.collectedFee - a.collectedFee;
            if (sortBy === 'rate') return b.rate - a.rate;
            if (sortBy === 'students') return b.studentCount - a.studentCount;
            if (sortBy === 'pending') return b.pendingFee - a.pendingFee;
            return 0;
        });

        return list;
    }, [allClassStats, searchTerm, sortBy]);

    // Excel Export
    const handleExportExcel = () => {
        const data = processedClasses.map((c, index) => ({
            'Rank': index + 1,
            'Class Name': c.name,
            'Mentor': c.mentorName,
            'Enrolled Students': c.studentCount,
            'Total Expected Revenue (INR)': c.expectedFee,
            'Collected Revenue (INR)': c.collectedFee,
            'Pending Dues (INR)': c.pendingFee,
            'Collection Rate (%)': `${c.rate}%`
        }));
        exportToExcel(data, `Class_Revenue_Leaderboard_${format(new Date(), 'yyyy-MM-dd')}`, 'Class Revenue');
        showAlert('Excel Downloaded', 'Class Revenue Leaderboard exported as Excel spreadsheet.', 'success');
    };

    // PDF Export
    const handleExportPDF = () => {
        const headers = ['Rank', 'Class Name', 'Mentor', 'Students', 'Collected (INR)', 'Pending (INR)', 'Rate (%)'];
        const data = processedClasses.map((c, index) => [
            `#${index + 1}`,
            c.name,
            c.mentorName,
            c.studentCount,
            `INR ${c.collectedFee.toLocaleString()}`,
            `INR ${c.pendingFee.toLocaleString()}`,
            `${c.rate}%`
        ]);
        exportToPDF(
            data, 
            headers, 
            `Class_Revenue_Leaderboard_${format(new Date(), 'yyyy-MM-dd')}`, 
            'HIGHEST REVENUE CLASSES & COLLECTION LEADERBOARD',
            `Total Classes: ${processedClasses.length} • Total Collected: INR ${kpis.totalCollected.toLocaleString()}`
        );
        showAlert('PDF Downloaded', 'Class Revenue Leaderboard exported as PDF report.', 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Back Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-gray-100 shadow-sm rounded-2xl">
                <div>
                    <button
                        onClick={onBack}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mb-2 group transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Overview
                    </button>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Trophy className="w-7 h-7 text-amber-500" />
                        Highest Revenue Classes & Collection Leaderboard
                    </h1>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                        Comprehensive revenue breakdown, student enrollment, and collection progress per class.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <ExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        size="md"
                    />
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Total Revenue Collected</span>
                        <div className="p-2 bg-white/20 rounded-xl">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div className="text-2xl font-black tracking-tight">₹{kpis.totalCollected.toLocaleString()}</div>
                    <p className="text-xs text-emerald-100 mt-1 font-medium">Overall Collection Rate: <strong className="text-white">{kpis.overallRate}%</strong></p>
                </Card>

                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Revenue Class</span>
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <Award className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-xl font-extrabold text-gray-900 truncate">
                        {kpis.topClass ? kpis.topClass.name : 'N/A'}
                    </div>
                    <p className="text-xs text-emerald-600 mt-1 font-bold">
                        ₹{kpis.topClass ? kpis.topClass.collectedFee.toLocaleString() : 0} ({kpis.topClass ? kpis.topClass.rate : 0}%)
                    </p>
                </Card>

                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expected Revenue</span>
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-xl font-extrabold text-gray-900">₹{kpis.totalExpected.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Across <strong className="text-gray-900">{kpis.totalClasses}</strong> Classes</p>
                </Card>

                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average Collection</span>
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                            <Percent className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-gray-900">{kpis.overallRate}%</div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Target Collection Benchmark</p>
                </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search class name, division, or mentor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 text-sm font-medium bg-gray-50 border-gray-200"
                        />
                    </div>

                    {/* Sort Options */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-indigo-600" /> Sort By:
                        </span>
                        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setSortBy('revenue')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    sortBy === 'revenue' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Highest Revenue
                            </button>
                            <button
                                onClick={() => setSortBy('rate')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    sortBy === 'rate' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Collection Rate (%)
                            </button>
                            <button
                                onClick={() => setSortBy('students')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    sortBy === 'students' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Most Students
                            </button>
                            <button
                                onClick={() => setSortBy('pending')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    sortBy === 'pending' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Pending Dues
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Leaderboard Table */}
            <Card className="overflow-hidden border border-gray-200/80 shadow-xs rounded-2xl bg-white">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                        Class Revenue Ranking List ({processedClasses.length} Classes)
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                        Showing all classes sorted by <strong className="text-indigo-600 uppercase font-bold">{sortBy}</strong>
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-gray-900 text-white text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-4 py-3.5 text-center w-16">Rank</th>
                                <th className="px-4 py-3.5">Class & Division</th>
                                <th className="px-4 py-3.5">Mentor</th>
                                <th className="px-4 py-3.5 text-center">Enrolled Students</th>
                                <th className="px-4 py-3.5 text-right">Expected Revenue</th>
                                <th className="px-4 py-3.5 text-right">Collected Revenue</th>
                                <th className="px-4 py-3.5 text-right">Pending Dues</th>
                                <th className="px-4 py-3.5 w-48 text-center">Collection Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedClasses.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-400 italic">
                                        No classes match the search filter.
                                    </td>
                                </tr>
                            ) : (
                                processedClasses.map((cls, idx) => {
                                    const rank = idx + 1;
                                    const isTop1 = rank === 1;
                                    const isTop2 = rank === 2;
                                    const isTop3 = rank === 3;

                                    return (
                                        <tr key={cls.id} className={`hover:bg-gray-50/80 transition-colors ${isTop1 ? 'bg-amber-50/20' : ''}`}>
                                            <td className="px-4 py-4 text-center">
                                                {isTop1 ? (
                                                    <span className="w-8 h-8 mx-auto rounded-full bg-amber-500 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shadow-amber-500/30">
                                                        🥇 1
                                                    </span>
                                                ) : isTop2 ? (
                                                    <span className="w-8 h-8 mx-auto rounded-full bg-slate-400 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                                                        🥈 2
                                                    </span>
                                                ) : isTop3 ? (
                                                    <span className="w-8 h-8 mx-auto rounded-full bg-amber-700 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                                                        🥉 3
                                                    </span>
                                                ) : (
                                                    <span className="font-extrabold text-xs text-gray-400 font-mono">
                                                        #{rank}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 font-bold text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <School className="w-4 h-4 text-indigo-600 shrink-0" />
                                                    <span className="text-base font-extrabold">{cls.name}</span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-xs font-semibold text-gray-600">
                                                {cls.mentorName}
                                            </td>

                                            <td className="px-4 py-4 text-center font-bold text-gray-800">
                                                <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-extrabold text-gray-700">
                                                    {cls.studentCount} Students
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold text-gray-600">
                                                ₹{cls.expectedFee.toLocaleString()}
                                            </td>

                                            <td className="px-4 py-4 text-right font-mono text-sm font-extrabold text-emerald-600">
                                                ₹{cls.collectedFee.toLocaleString()}
                                            </td>

                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold text-rose-600">
                                                ₹{cls.pendingFee.toLocaleString()}
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs font-extrabold">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                            cls.rate >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : cls.rate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            {cls.rate}%
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 font-normal">Target: 100%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                cls.rate >= 80 ? 'bg-emerald-500' : cls.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${cls.rate}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ClassRevenueLeaderboard;
