import React, { useMemo } from 'react';
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
    Sparkles
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

        return list.sort((a, b) => b.collectedFee - a.collectedFee).slice(0, 6);
    }, [classes, studentPool, feeStructureMap, currentYearPayments, studentClassMap]);

    // Recent 5 Transactions Stream
    const recentTransactions = useMemo(() => {
        return currentYearPayments.slice(0, 5);
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

        const classData = classCollectionProgress.map(c => ({
            'Class Name': c.name,
            'Enrolled Students': c.studentCount,
            'Expected Fee (INR)': c.expectedFee,
            'Collected Fee (INR)': c.collectedFee,
            'Pending Dues (INR)': c.pendingFee,
            'Collection Rate (%)': `${c.rate}%`
        }));

        const transactionData = (feePayments || []).map(p => ({
            'Receipt ID': p.receiptId || '',
            'Date': format(new Date(p.paymentDate || p.createdAt || Date.now()), 'yyyy-MM-dd HH:mm'),
            'Student Name': p.studentName || '',
            'Register No': p.registerNo || '',
            'Class': p.className || '',
            'Amount Paid (INR)': Number(p.amountPaid || 0),
            'Payment Mode': p.paymentMode || 'Cash',
            'Academic Year': p.academicYear || '2026-2027',
            'Notes': p.notes || ''
        }));

        exportMultiSheetExcel([
            { sheetName: 'Financial Summary', data: kpiData },
            { sheetName: 'Class Progress', data: classData },
            { sheetName: 'Recent Payments', data: transactionData }
        ], `Office_Financial_Overview_${format(new Date(), 'yyyy-MM-dd')}`);

        showAlert('Excel Exported', 'Office Financial Overview spreadsheet downloaded successfully!', 'success');
    };

    // PDF Report Generator
    const exportOverviewPDF = () => {
        const doc = new jsPDF();
        
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 36, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('OFFICE FINANCIAL OVERVIEW REPORT', 14, 16);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Real-Time Payment Summary • Generated on: ${format(new Date(), 'PPP p')}`, 14, 26);

        // KPI Summary Box
        autoTable(doc, {
            startY: 42,
            head: [['Financial KPI Metric', 'Value']],
            body: [
                ['Total Expected Annual Revenue', `INR ${financialKPIs.totalExpectedRevenue.toLocaleString()}`],
                ['Total Collected Revenue So Far', `INR ${financialKPIs.totalCollectedRevenue.toLocaleString()} (${financialKPIs.collectionRate}%)`],
                ['Total Pending Outstandings / Dues', `INR ${financialKPIs.totalPendingRevenue.toLocaleString()}`],
                ['Total Receipt Transactions Issued', `${financialKPIs.totalReceiptsCount} Receipts`],
                ['Average Payment Amount Per Transaction', `INR ${financialKPIs.avgPaymentAmount.toLocaleString()}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        // Class Breakdown Table
        const classTableRows = classCollectionProgress.map(c => [
            c.name,
            `${c.studentCount} Students`,
            `INR ${c.expectedFee.toLocaleString()}`,
            `INR ${c.collectedFee.toLocaleString()}`,
            `INR ${c.pendingFee.toLocaleString()}`,
            `${c.rate}%`
        ]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Class Name', 'Enrolled', 'Expected Fee', 'Collected', 'Pending Dues', 'Rate %']],
            body: classTableRows,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9, cellPadding: 3 }
        });

        doc.save(`Office_Financial_Overview_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        showAlert('PDF Exported', 'Office Financial Overview Report downloaded successfully!', 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Banner Header */}
            <div className="bg-white border border-gray-200/80 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-600" /> Office Accounts Portal
                        </span>
                    </div>
                    <h2 className="text-2xl font-black mt-2 tracking-tight text-gray-900">Financial Overview & Payment Analytics</h2>
                    <p className="text-xs text-gray-500 font-medium mt-1 max-w-2xl">
                        Monitor revenue collection metrics, payment mode distributions, monthly trends, and outstanding dues across all classes.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => onTabChange && onTabChange('fees')}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                        <CreditCard className="w-4 h-4" /> Go to Fee Collection
                    </button>
                    <ExportButtons
                        onExportExcel={exportOverviewExcel}
                        onExportPDF={exportOverviewPDF}
                    />
                </div>
            </div>

            {/* Unconfigured Fee Warning Banner */}
            {financialKPIs.unconfiguredCount > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200/90 text-amber-900 px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                            <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-900">⚠️ {financialKPIs.unconfiguredCount} Active Enrolled Students Do Not Have Fee Amounts Configured</p>
                            <p className="text-[11px] text-amber-800 font-bold mt-0.5">Their fee amounts are missing from the current uploaded data. Click below to configure their fees.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onTabChange && onTabChange('fees')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shrink-0 transition-all shadow-xs cursor-pointer"
                    >
                        Configure Student Fees ➔
                    </button>
                </div>
            )}

            {/* 4 Financial KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Expected Revenue */}
                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl relative overflow-hidden group hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Total Expected Fee</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1 font-mono">
                                ₹{financialKPIs.totalExpectedRevenue.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{studentPool.length} active enrolled students</span>
                    </div>
                </Card>

                {/* 2. Total Collected Revenue */}
                <Card className="p-5 bg-emerald-50/40 border border-emerald-100 shadow-sm rounded-2xl relative overflow-hidden group hover:border-emerald-200 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">Collected Revenue</p>
                            <h3 className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                                ₹{financialKPIs.totalCollectedRevenue.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform">
                            <Wallet className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                            {financialKPIs.collectionRate}% Collected
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <TrendingUp className="w-3.5 h-3.5" /> Real-time
                        </span>
                    </div>
                </Card>

                {/* 3. Pending Dues */}
                <Card className="p-5 bg-rose-50/40 border border-rose-100 shadow-sm rounded-2xl relative overflow-hidden group hover:border-rose-200 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-extrabold uppercase text-rose-800 tracking-wider">Pending Dues</p>
                            <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">
                                ₹{financialKPIs.totalPendingRevenue.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-rose-100 text-rose-700 rounded-xl group-hover:scale-110 transition-transform">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-extrabold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                            {100 - financialKPIs.collectionRate}% Uncollected
                        </span>
                        <button
                            onClick={() => onTabChange && onTabChange('fees')}
                            className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                            View Defaulters <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </Card>

                {/* 4. Total Receipts Issued */}
                <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl relative overflow-hidden group hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Issued Receipts</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1 font-mono">
                                {financialKPIs.totalReceiptsCount} <span className="text-xs text-gray-500 font-sans font-bold">Transactions</span>
                            </h3>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Receipt className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 text-xs font-semibold text-gray-500">
                        <span>Avg Payment: </span>
                        <span className="font-extrabold text-gray-900 font-mono">₹{financialKPIs.avgPaymentAmount.toLocaleString()}</span>
                    </div>
                </Card>
            </div>

            {/* Graphs Grid Row 1: Monthly Trend & Payment Mode Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Monthly Revenue Trend Area Chart */}
                <Card className="lg:col-span-8 p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-600" /> Revenue Collection Trend Over Time
                            </h3>
                            <p className="text-xs text-gray-400">Monthly breakdown of fee payments collected</p>
                        </div>
                        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            Timeline Chart
                        </span>
                    </div>

                    <div className="w-full h-72 min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={monthlyTrendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                </Card>

                {/* Payment Mode Breakdown Pie Chart */}
                <Card className="lg:col-span-4 p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4 flex flex-col justify-between">
                    <div className="border-b pb-3">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-emerald-600" /> Payment Mode Split
                        </h3>
                        <p className="text-xs text-gray-400">Cash, UPI, Bank Transfer & Cheque</p>
                    </div>

                    {paymentModeChartData.length === 0 ? (
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
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                        <span>Total Tracked Modes:</span>
                        <span className="font-extrabold text-gray-900">{paymentModeChartData.length} Modes</span>
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
                                classCollectionProgress.map(cls => (
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
