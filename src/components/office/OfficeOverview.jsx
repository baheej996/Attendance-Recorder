import React, { useState, useMemo } from 'react';
import { 
    DollarSign, 
    Wallet, 
    TrendingUp, 
    AlertCircle, 
    CheckCircle, 
    CreditCard, 
    Receipt, 
    PieChart as PieChartIcon, 
    BarChart3, 
    ArrowUpRight, 
    Download, 
    Users, 
    Calendar,
    ChevronRight,
    Sparkles,
    Layers
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    BarChart, 
    Bar, 
    PieChart, 
    Pie, 
    Cell, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Legend, 
    CartesianGrid 
} from 'recharts';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { ExportButtons } from '../ui/ExportButtons';
import { exportMultiSheetExcel } from '../../utils/exportUtils';

const OfficeOverview = ({ onTabChange }) => {
    const { 
        allStudents, 
        students, 
        classes, 
        feeStructures, 
        feePayments 
    } = useData();

    const { showAlert } = useUI();

    const [activeChartTab, setActiveChartTab] = useState('trend'); // 'trend' | 'classBar' | 'studentStatus'
    const [trendView, setTrendView] = useState('daily'); // 'daily' | 'monthly'
    const [rightChartTab, setRightChartTab] = useState('mode'); // 'mode' | 'status'

    // Active Student Pool
    const studentPool = useMemo(() => {
        const list = (allStudents && allStudents.length > 0) ? allStudents : (students || []);
        return list.filter(s => s.status === 'Active' || s.status === 'active' || s.status === 'Payment Pending');
    }, [allStudents, students]);

    // 1. Map of Student ID -> Class ID for O(1) lookups
    const studentClassMap = useMemo(() => {
        const map = new Map();
        studentPool.forEach(s => {
            if (s.id) map.set(s.id, s.classId);
        });
        return map;
    }, [studentPool]);

    // 2. Fast Map of Target ID -> Fee Structure
    const feeStructureMap = useMemo(() => {
        const map = new Map();
        (feeStructures || []).forEach(f => {
            if (f.targetId) map.set(f.targetId, f);
            if (f.id) map.set(f.id, f);
        });
        return map;
    }, [feeStructures]);

    // O(1) Helper: Get student fee structure amount (returns null if fee is not set/configured)
    const getStudentFeeAmount = (student) => {
        if (!student) return null;
        const sStruct = feeStructureMap.get(student.id);
        if (sStruct && sStruct.totalAmount !== undefined && sStruct.totalAmount !== null) return Number(sStruct.totalAmount);

        if (student.classId) {
            const cStruct = feeStructureMap.get(student.classId);
            if (cStruct && cStruct.totalAmount !== undefined && cStruct.totalAmount !== null) return Number(cStruct.totalAmount);
        }

        return null;
    };

    // Strictly filter payments for the current academic year (2026-2027)
    const currentYearPayments = useMemo(() => {
        return (feePayments || []).filter(p => (p.academicYear || '2026-2027') === '2026-2027');
    }, [feePayments]);

    // Calculate High Level Financial Metrics (O(N) single pass)
    const financialKPIs = useMemo(() => {
        let totalExpectedRevenue = 0;
        let unconfiguredCount = 0;

        studentPool.forEach(s => {
            const fee = getStudentFeeAmount(s);
            if (fee !== null) {
                totalExpectedRevenue += fee;
            } else {
                unconfiguredCount += 1;
            }
        });

        const totalCollectedRevenue = currentYearPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        const totalPendingRevenue = Math.max(0, totalExpectedRevenue - totalCollectedRevenue);
        const collectionRate = totalExpectedRevenue > 0 ? Math.round((totalCollectedRevenue / totalExpectedRevenue) * 100) : 0;
        
        const totalReceiptsCount = currentYearPayments.length;
        const avgPaymentAmount = totalReceiptsCount > 0 ? Math.round(totalCollectedRevenue / totalReceiptsCount) : 0;

        return {
            totalExpectedRevenue,
            totalCollectedRevenue,
            totalPendingRevenue,
            collectionRate,
            totalReceiptsCount,
            avgPaymentAmount,
            unconfiguredCount
        };
    }, [studentPool, feeStructureMap, currentYearPayments]);

    // Daily Collection Trend Chart Data
    const dailyTrendChartData = useMemo(() => {
        const datesMap = {};
        currentYearPayments.forEach(p => {
            const d = new Date(p.paymentDate || p.createdAt || Date.now());
            const dKey = format(d, 'dd MMM');
            if (!datesMap[dKey]) datesMap[dKey] = { name: dKey, amount: 0, count: 0, time: d.getTime() };
            datesMap[dKey].amount += Number(p.amountPaid || 0);
            datesMap[dKey].count += 1;
        });
        const list = Object.values(datesMap).sort((a, b) => a.time - b.time);
        return list.length > 0 ? list : [{ name: format(new Date(), 'dd MMM'), amount: financialKPIs.totalCollectedRevenue, count: financialKPIs.totalReceiptsCount }];
    }, [currentYearPayments, financialKPIs]);

    // Monthly Collection Trend Chart Data
    const monthlyTrendChartData = useMemo(() => {
        const monthsMap = {};
        currentYearPayments.forEach(p => {
            const d = new Date(p.paymentDate || p.createdAt || Date.now());
            const mKey = format(d, 'MMM yyyy');
            if (!monthsMap[mKey]) monthsMap[mKey] = { name: mKey, amount: 0, count: 0 };
            monthsMap[mKey].amount += Number(p.amountPaid || 0);
            monthsMap[mKey].count += 1;
        });
        const list = Object.values(monthsMap);
        return list.length > 0 ? list : [{ name: 'Current Month', amount: financialKPIs.totalCollectedRevenue, count: financialKPIs.totalReceiptsCount }];
    }, [currentYearPayments, financialKPIs]);

    // Payment Mode Distribution Pie Chart Data
    const paymentModeChartData = useMemo(() => {
        const modeCounts = {
            'Cash': 0,
            'UPI': 0,
            'Bank Transfer': 0,
            'Cheque': 0
        };

        currentYearPayments.forEach(p => {
            const m = (p.paymentMode || 'Cash').trim();
            if (modeCounts[m] !== undefined) {
                modeCounts[m] += Number(p.amountPaid || 0);
            } else {
                modeCounts['Cash'] += Number(p.amountPaid || 0);
            }
        });

        const COLORS = {
            'Cash': '#10B981',
            'UPI': '#4F46E5',
            'Bank Transfer': '#F59E0B',
            'Cheque': '#EC4899'
        };

        return Object.entries(modeCounts)
            .filter(([_, val]) => val > 0)
            .map(([name, value]) => ({
                name,
                value,
                color: COLORS[name] || '#6B7280'
            }));
    }, [currentYearPayments]);

    // Class Collection Progress List (Optimized single-pass O(N + P))
    const classCollectionProgress = useMemo(() => {
        const classStatsMap = new Map();
        const classNameToIdMap = new Map();

        // 1. Initialize stats for each class
        (classes || []).forEach(cls => {
            const classKey = `${cls.name}-${cls.division}`;
            classStatsMap.set(cls.id, {
                id: cls.id,
                className: cls.name,
                division: cls.division,
                name: `Class ${classKey}`,
                studentCount: 0,
                expectedFee: 0,
                collectedFee: 0,
            });
            classNameToIdMap.set(classKey, cls.id);
        });

        // 2. Pass over studentPool to aggregate studentCount & expectedFee per class
        studentPool.forEach(s => {
            if (s.classId && classStatsMap.has(s.classId)) {
                const stat = classStatsMap.get(s.classId);
                stat.studentCount += 1;
                stat.expectedFee += getStudentFeeAmount(s);
            }
        });

        // 3. Pass over currentYearPayments to aggregate collected fee per class
        currentYearPayments.forEach(p => {
            const amount = Number(p.amountPaid || 0);
            if (amount <= 0) return;

            let targetClassId = studentClassMap.get(p.studentId);
            if (!targetClassId && p.className) {
                for (const [classKey, clsId] of classNameToIdMap.entries()) {
                    if (p.className.includes(classKey)) {
                        targetClassId = clsId;
                        break;
                    }
                }
            }

            if (targetClassId && classStatsMap.has(targetClassId)) {
                classStatsMap.get(targetClassId).collectedFee += amount;
            }
        });

        const list = Array.from(classStatsMap.values()).map(cls => {
            const rate = cls.expectedFee > 0 ? Math.min(100, Math.round((cls.collectedFee / cls.expectedFee) * 100)) : 0;
            return {
                ...cls,
                pendingFee: Math.max(0, cls.expectedFee - cls.collectedFee),
                rate
            };
        });

        return list.sort((a, b) => b.collectedFee - a.collectedFee);
    }, [classes, studentPool, feeStructureMap, currentYearPayments, studentClassMap]);

    // Top Classes Collected vs Pending Bar Chart Data
    const classComparisonBarData = useMemo(() => {
        return (classCollectionProgress || []).slice(0, 8).map(cls => ({
            name: `${cls.className}-${cls.division}`,
            fullName: cls.name,
            'Collected Fee': cls.collectedFee,
            'Pending Dues': cls.pendingFee,
        }));
    }, [classCollectionProgress]);

    // Student Fee Status Distribution Chart Data
    const studentStatusChartData = useMemo(() => {
        let fullyPaid = 0;
        let partialPaid = 0;
        let unpaid = 0;

        const studentPaidMap = new Map();
        currentYearPayments.forEach(p => {
            const prev = studentPaidMap.get(p.studentId) || 0;
            studentPaidMap.set(p.studentId, prev + Number(p.amountPaid || 0));
        });

        studentPool.forEach(s => {
            const expected = getStudentFeeAmount(s);
            if (expected === null || expected === 0) return;
            const paid = studentPaidMap.get(s.id) || 0;

            if (paid >= expected) {
                fullyPaid += 1;
            } else if (paid > 0) {
                partialPaid += 1;
            } else {
                unpaid += 1;
            }
        });

        return [
            { name: 'Fully Paid Students', value: fullyPaid, color: '#10B981' },
            { name: 'Partial Payment', value: partialPaid, color: '#F59E0B' },
            { name: 'Pending / Unpaid', value: unpaid, color: '#F43F5E' }
        ].filter(item => item.value > 0);
    }, [studentPool, currentYearPayments, feeStructureMap]);

    // Recent 5 Transactions Stream
    const recentTransactions = useMemo(() => {
        return currentYearPayments.slice(0, 6);
    }, [currentYearPayments]);

    // Excel Report Generator
    const exportOverviewExcel = () => {
        const kpiData = [
            { Metric: 'Total Expected Revenue', Value: financialKPIs.totalExpectedRevenue },
            { Metric: 'Total Collected Revenue', Value: financialKPIs.totalCollectedRevenue },
            { Metric: 'Collection Rate (%)', Value: `${financialKPIs.collectionRate}%` },
            { Metric: 'Total Pending Outstandings', Value: financialKPIs.totalPendingRevenue },
            { Metric: 'Total Receipts Issued', Value: financialKPIs.totalReceiptsCount },
            { Metric: 'Average Payment Amount', Value: financialKPIs.avgPaymentAmount }
        ];

        const classData = classCollectionProgress.map(cls => ({
            'Class Name': cls.name,
            'Student Count': cls.studentCount,
            'Expected Revenue (INR)': cls.expectedFee,
            'Collected Revenue (INR)': cls.collectedFee,
            'Pending Dues (INR)': cls.pendingFee,
            'Collection Rate (%)': `${cls.rate}%`
        }));

        const transactionData = currentYearPayments.map(p => ({
            'Receipt ID': p.receiptId,
            'Student Name': p.studentName,
            'Class': p.className,
            'Payment Date': format(new Date(p.paymentDate || p.createdAt || Date.now()), 'dd/MM/yyyy HH:mm'),
            'Amount Paid (INR)': p.amountPaid,
            'Payment Mode': p.paymentMode
        }));

        exportMultiSheetExcel([
            { data: kpiData, sheetName: 'KPI Overview' },
            { data: classData, sheetName: 'Class Revenue' },
            { data: transactionData, sheetName: 'Payment Stream' }
        ], `Office_Financial_Overview_${format(new Date(), 'yyyy-MM-dd')}`);

        showAlert('Excel Downloaded', 'Office financial overview report exported as Excel spreadsheet.', 'success');
    };

    // PDF Executive Summary Generator
    const exportOverviewPDF = () => {
        const doc = new jsPDF();
        
        doc.setFillColor(79, 70, 229); // Indigo banner
        doc.rect(0, 0, 210, 28, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('OFFICE FINANCIAL & REVENUE EXECUTIVE REPORT', 14, 18);
        doc.setFontSize(9);
        doc.text(`Academic Year: 2026-2027 • Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 24);

        // Summary Table
        autoTable(doc, {
            startY: 34,
            head: [['Financial Metric', 'Value']],
            body: [
                ['Total Expected Revenue', `INR ${financialKPIs.totalExpectedRevenue.toLocaleString()}`],
                ['Total Revenue Collected', `INR ${financialKPIs.totalCollectedRevenue.toLocaleString()}`],
                ['Overall Collection Rate', `${financialKPIs.collectionRate}%`],
                ['Total Pending Outstandings', `INR ${financialKPIs.totalPendingRevenue.toLocaleString()}`],
                ['Total Fee Receipts Issued', `${financialKPIs.totalReceiptsCount}`],
                ['Average Receipt Amount', `INR ${financialKPIs.avgPaymentAmount.toLocaleString()}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' }
        });

        // Top Class Revenue Table
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text('Top Revenue Classes Summary', 14, doc.lastAutoTable.finalY + 10);

        const classRows = classCollectionProgress.slice(0, 10).map(c => [
            c.name,
            c.studentCount,
            `INR ${c.expectedFee.toLocaleString()}`,
            `INR ${c.collectedFee.toLocaleString()}`,
            `INR ${c.pendingFee.toLocaleString()}`,
            `${c.rate}%`
        ]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 14,
            head: [['Class Name', 'Students', 'Expected', 'Collected', 'Pending', 'Rate']],
            body: classRows,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] }
        });

        doc.save(`Office_Executive_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        showAlert('PDF Downloaded', 'Office executive financial summary report exported as PDF.', 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Export Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border border-gray-100 shadow-sm rounded-2xl">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Wallet className="w-7 h-7 text-indigo-600" />
                        Office Financial Overview & Revenue Analytics
                    </h1>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                        Real-time revenue collections, class progress leaderboard, and payment transaction logs for Academic Year 2026-2027.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <ExportButtons 
                        onExportExcel={exportOverviewExcel} 
                        onExportPDF={exportOverviewPDF}
                        size="md" 
                    />
                </div>
            </div>

            {/* Warning Banner for Unconfigured Fee Students */}
            {financialKPIs.unconfiguredCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Unconfigured Fee Alert</h4>
                            <p className="text-xs font-medium text-amber-700 mt-0.5">
                                <strong className="font-extrabold text-amber-900">{financialKPIs.unconfiguredCount} active students</strong> do not have a fee structure assigned. Expected revenue estimates exclude unconfigured students.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onTabChange && onTabChange('fees')}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                    >
                        Configure Fees
                    </button>
                </div>
            )}

            {/* Financial KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Expected Revenue */}
                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl hover:border-indigo-100 transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Total Expected Fee</span>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 tracking-tight">₹{financialKPIs.totalExpectedRevenue.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-gray-500 mt-1">Across active registered students</p>
                </Card>

                {/* Collected Revenue */}
                <Card className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-extrabold text-emerald-100 uppercase tracking-wider">Total Revenue Collected</span>
                        <div className="p-2 bg-white/20 text-white rounded-xl">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black tracking-tight">₹{financialKPIs.totalCollectedRevenue.toLocaleString()}</div>
                    <div className="mt-2 flex items-center justify-between text-xs font-medium text-emerald-100">
                        <span>Collection Rate:</span>
                        <span className="font-extrabold text-white text-sm bg-white/20 px-2 py-0.5 rounded-lg">{financialKPIs.collectionRate}%</span>
                    </div>
                </Card>

                {/* Pending Dues */}
                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl hover:border-rose-100 transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Pending Outstandings</span>
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600 tracking-tight">₹{financialKPIs.totalPendingRevenue.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-gray-500 mt-1">Uncollected pending dues</p>
                </Card>

                {/* Total Receipts */}
                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl hover:border-blue-100 transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Receipts Issued</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Receipt className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-black text-gray-900 tracking-tight">{financialKPIs.totalReceiptsCount}</div>
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" /> 2026-2027
                        </span>
                    </div>
                    <div className="mt-3 text-xs font-semibold text-gray-500">
                        <span>Avg Payment: </span>
                        <span className="font-extrabold text-gray-900 font-mono">₹{financialKPIs.avgPaymentAmount.toLocaleString()}</span>
                    </div>
                </Card>
            </div>

            {/* Graphs Grid Row 1: Interactive Revenue Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Graph Card with Interactive Tabs */}
                <Card className="lg:col-span-8 p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                {activeChartTab === 'trend' && <TrendingUp className="w-5 h-5 text-indigo-600" />}
                                {activeChartTab === 'classBar' && <BarChart3 className="w-5 h-5 text-emerald-600" />}
                                {activeChartTab === 'studentStatus' && <PieChartIcon className="w-5 h-5 text-amber-600" />}
                                {activeChartTab === 'trend' && 'Revenue Collection Trend Over Time'}
                                {activeChartTab === 'classBar' && 'Class Revenue vs Pending Dues Comparison'}
                                {activeChartTab === 'studentStatus' && 'Student Fee Payment Status Breakdown'}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {activeChartTab === 'trend' && (trendView === 'daily' ? 'Daily collection curve for Academic Year 2026-2027' : 'Monthly breakdown of fee payments collected')}
                                {activeChartTab === 'classBar' && 'Top classes comparing collected revenue vs remaining pending dues'}
                                {activeChartTab === 'studentStatus' && 'Proportion of fully paid, partial payment, and unpaid students'}
                            </p>
                        </div>

                        {/* Chart View Selector Tabs */}
                        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl shrink-0">
                            <button
                                onClick={() => setActiveChartTab('trend')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    activeChartTab === 'trend' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <TrendingUp className="w-3.5 h-3.5" /> Trend
                            </button>
                            <button
                                onClick={() => setActiveChartTab('classBar')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    activeChartTab === 'classBar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5" /> Class Comparison
                            </button>
                            <button
                                onClick={() => setActiveChartTab('studentStatus')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    activeChartTab === 'studentStatus' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <PieChartIcon className="w-3.5 h-3.5" /> Fee Status
                            </button>
                        </div>
                    </div>

                    {/* Sub-toggle for Trend (Daily vs Monthly) */}
                    {activeChartTab === 'trend' && (
                        <div className="flex justify-end items-center gap-2 -mt-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Granularity:</span>
                            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                                <button
                                    onClick={() => setTrendView('daily')}
                                    className={`px-2.5 py-0.5 rounded-md transition-all ${trendView === 'daily' ? 'bg-white text-indigo-600 shadow-2xs font-extrabold' : 'text-gray-500'}`}
                                >
                                    Daily Curve
                                </button>
                                <button
                                    onClick={() => setTrendView('monthly')}
                                    className={`px-2.5 py-0.5 rounded-md transition-all ${trendView === 'monthly' ? 'bg-white text-indigo-600 shadow-2xs font-extrabold' : 'text-gray-500'}`}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Chart 1: Revenue Collection Curve (Area Chart) */}
                    {activeChartTab === 'trend' && (
                        <div className="w-full h-72 min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <AreaChart 
                                    data={trendView === 'daily' ? dailyTrendChartData : monthlyTrendChartData} 
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="officeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35}/>
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', fontWeight: 'bold', borderColor: '#E5E7EB' }} 
                                        formatter={(val) => [`INR ${val.toLocaleString()}`, 'Collection']} 
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#officeRevenueGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Chart 2: Top Class Revenue Comparison (Bar Chart) */}
                    {activeChartTab === 'classBar' && (
                        <div className="w-full h-72 min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={classComparisonBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#374151', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} 
                                        formatter={(val) => [`INR ${val.toLocaleString()}`]} 
                                    />
                                    <Legend formatter={(val) => <span className="text-xs font-bold text-gray-700">{val}</span>} />
                                    <Bar dataKey="Collected Fee" fill="#10B981" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="Pending Dues" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Chart 3: Student Payment Status Donut */}
                    {activeChartTab === 'studentStatus' && (
                        <div className="w-full h-72 min-w-0 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={studentStatusChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {studentStatusChartData.map((entry, index) => (
                                            <Cell key={`status-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val) => [`${val} Students`]} 
                                        contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} 
                                    />
                                    <Legend formatter={(val) => <span className="text-xs font-bold text-gray-700">{val}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Right Card: Payment Mode & Status Split */}
                <Card className="lg:col-span-4 p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4 flex flex-col justify-between">
                    <div className="border-b pb-3 flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-emerald-600" />
                                {rightChartTab === 'mode' ? 'Payment Mode Split' : 'Payment Status Split'}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {rightChartTab === 'mode' ? 'Cash, UPI, Bank Transfer & Cheque' : 'Paid vs Pending Student Proportion'}
                            </p>
                        </div>

                        {/* Toggle Right Card Mode */}
                        <button
                            onClick={() => setRightChartTab(prev => prev === 'mode' ? 'status' : 'mode')}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                            title="Switch Chart View"
                        >
                            <Layers className="w-4 h-4 text-indigo-600" />
                        </button>
                    </div>

                    {rightChartTab === 'mode' ? (
                        paymentModeChartData.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs italic">
                                No payment transactions recorded yet.
                            </div>
                        ) : (
                            <div className="w-full h-56 min-w-0">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <PieChart>
                                        <Pie
                                            data={paymentModeChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {paymentModeChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(val) => [`INR ${val.toLocaleString()}`, 'Amount']} 
                                            contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} 
                                        />
                                        <Legend 
                                            formatter={(value) => <span className="text-xs font-bold text-gray-700">{value}</span>} 
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    ) : (
                        <div className="w-full h-56 min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={studentStatusChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {studentStatusChartData.map((entry, index) => (
                                            <Cell key={`right-status-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val) => [`${val} Students`]} 
                                        contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} 
                                    />
                                    <Legend 
                                        formatter={(value) => <span className="text-xs font-bold text-gray-700">{value}</span>} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                        <span>{rightChartTab === 'mode' ? 'Total Tracked Modes:' : 'Enrolled Students:'}</span>
                        <span className="font-extrabold text-gray-900">
                            {rightChartTab === 'mode' ? `${paymentModeChartData.length} Modes` : `${studentPool.length} Students`}
                        </span>
                    </div>
                </Card>
            </div>

            {/* Graphs Grid Row 2: Top Classes & Recent Payment Receipts (50% / 50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Class Collection Progress List */}
                <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="border-b pb-3 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" /> Highest Revenue Classes
                                </h3>
                                <p className="text-xs text-gray-400">Collection progress by class</p>
                            </div>
                            <button
                                onClick={() => onTabChange && onTabChange('class-revenue')}
                                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                Full List <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="space-y-3 mt-3">
                            {classCollectionProgress.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-4 text-center">No class collection data available.</p>
                            ) : (
                                classCollectionProgress.slice(0, 6).map(cls => (
                                    <div key={cls.id} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className="text-gray-900">{cls.name} <span className="text-gray-400 font-normal">({cls.studentCount} Students)</span></span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-emerald-600">₹{cls.collectedFee.toLocaleString()}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                    cls.rate >= 80 ? 'bg-emerald-50 text-emerald-700' : cls.rate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                                }`}>
                                                    {cls.rate}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    cls.rate >= 80 ? 'bg-emerald-500' : cls.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}
                                                style={{ width: `${cls.rate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>

                {/* Recent Payments Stream */}
                <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-indigo-600" /> Recent Payment Receipts Stream
                                </h3>
                                <p className="text-xs text-gray-400">Latest fee transactions recorded in system</p>
                            </div>
                            <button
                                onClick={() => onTabChange && onTabChange('fees')}
                                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                Manage All Receipts <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="divide-y divide-gray-100 mt-1">
                            {recentTransactions.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-6 text-center">No fee payments recorded yet.</p>
                            ) : (
                                recentTransactions.map(p => (
                                    <div key={p.id} className="py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-gray-50/80 px-2 rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-mono text-xs font-bold">
                                                #{p.receiptId}
                                            </div>
                                            <div>
                                                <p className="text-sm font-extrabold text-gray-900">{p.studentName}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>Reg: {p.registerNo || 'N/A'}</span>
                                                    <span>•</span>
                                                    <span>{p.className || 'N/A'}</span>
                                                    <span>•</span>
                                                    <span className="text-[11px]">{format(new Date(p.paymentDate || p.createdAt || Date.now()), 'dd MMM yyyy, p')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                p.paymentMode === 'UPI' ? 'bg-indigo-50 text-indigo-700' :
                                                p.paymentMode === 'Bank Transfer' ? 'bg-amber-50 text-amber-700' :
                                                'bg-emerald-50 text-emerald-700'
                                            }`}>
                                                {p.paymentMode || 'Cash'}
                                            </span>
                                            <span className="font-mono font-black text-emerald-600 text-sm">
                                                +₹{Number(p.amountPaid || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default OfficeOverview;
