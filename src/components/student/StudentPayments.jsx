import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    CreditCard, 
    Wallet, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Calendar, 
    Receipt, 
    FileText, 
    Printer, 
    Bell, 
    ShieldCheck, 
    ArrowRight,
    Sparkles,
    ChevronRight,
    TrendingUp,
    Download,
    PhoneCall,
    MessageSquare,
    HelpCircle,
    Building2,
    Send,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudentPayments = ({ onMarkNoticesSeen }) => {
    const { currentUser, feeStructures, feePayments, notifications, institutionSettings, classes } = useData();
    const navigate = useNavigate();
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [expandedInstallments, setExpandedInstallments] = useState({});

    const toggleInstallmentExpand = (key) => {
        setExpandedInstallments(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const officePhone = institutionSettings?.phone || institutionSettings?.contactNo || institutionSettings?.whatsappNumber || '+918590518541';

    // Resolve human-readable class name
    const resolvedClassName = useMemo(() => {
        if (!currentUser) return 'N/A';
        if (currentUser.className) return currentUser.className;
        const cls = (classes || []).find(c => c.id === currentUser.classId);
        return cls?.name || currentUser.classId || 'N/A';
    }, [currentUser, classes]);

    // Trigger onMarkNoticesSeen once when user visits this page
    useEffect(() => {
        if (onMarkNoticesSeen) {
            onMarkNoticesSeen();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 1. Resolve student fee structure (Per-Student > Class > Default)
    const activeFeeStructure = useMemo(() => {
        if (!currentUser) return null;
        
        // Per-student fee structure
        const studentStruct = (feeStructures || []).find(f => f.targetId === currentUser.id || f.id === currentUser.id);
        if (studentStruct) return studentStruct;

        // Class fee structure
        if (currentUser.classId) {
            const classStruct = (feeStructures || []).find(f => f.targetId === currentUser.classId || f.id === currentUser.classId);
            if (classStruct) return classStruct;
        }

        // Default structure fallback
        return {
            totalAmount: 12700,
            installments: {
                inst1: { amount: 4233, name: 'Installment 1 (Admission)', dueDate: '2026-05-30' },
                inst2: { amount: 4233, name: 'Installment 2 (Mid-Term)', dueDate: '2026-09-30' },
                inst3: { amount: 4234, name: 'Installment 3 (Final Term)', dueDate: '2027-01-30' }
            }
        };
    }, [currentUser, feeStructures]);

    // 2. Filter payments recorded for current student
    const studentPayments = useMemo(() => {
        if (!currentUser?.id) return [];
        return (feePayments || [])
            .filter(p => p.studentId === currentUser.id)
            .sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0));
    }, [currentUser, feePayments]);

    // 3. Compute overall financial totals & installment breakdown
    const financialStats = useMemo(() => {
        const totalFee = (activeFeeStructure && activeFeeStructure.totalAmount !== undefined && activeFeeStructure.totalAmount !== null) ? Number(activeFeeStructure.totalAmount) : 12700;
        const totalPaid = studentPayments.reduce((acc, p) => acc + Number(p.amountPaid || 0), 0);
        const remainingBalance = Math.max(0, totalFee - totalPaid);

        const isFullyPaid = remainingBalance <= 0;
        const isPartiallyPaid = totalPaid > 0 && remainingBalance > 0;

        // Calculate paid amounts per installment
        const instConfig = activeFeeStructure?.installments || {};
        const installmentKeys = Object.keys(instConfig).sort();

        let completedInstallmentsCount = 0;
        let pendingInstallmentsCount = 0;

        const breakdown = installmentKeys.map(key => {
            const inst = instConfig[key];
            const targetAmount = Number(inst.amount || 0);
            
            // Sum all payments tagged with this installment key
            const paidForInst = studentPayments
                .filter(p => p.installmentKey === key)
                .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

            const remainingForInst = Math.max(0, targetAmount - paidForInst);
            const isCompleted = paidForInst >= targetAmount;

            if (isCompleted) {
                completedInstallmentsCount++;
            } else {
                pendingInstallmentsCount++;
            }

            return {
                key,
                name: inst.name || `Installment ${key.replace('inst', '')}`,
                dueDate: inst.dueDate || '',
                targetAmount,
                paidForInst,
                remainingForInst,
                isCompleted,
                isPartial: paidForInst > 0 && paidForInst < targetAmount,
                percent: targetAmount > 0 ? Math.min(100, Math.round((paidForInst / targetAmount) * 100)) : 0
            };
        });

        return {
            totalFee,
            totalPaid,
            remainingBalance,
            isFullyPaid,
            isPartiallyPaid,
            completedInstallmentsCount,
            totalInstallmentsCount: breakdown.length,
            pendingInstallmentsCount,
            breakdown
        };
    }, [activeFeeStructure, studentPayments]);

    // 4. Fee-related notices & notifications (including acknowledged popups)
    const feeNotices = useMemo(() => {
        if (!currentUser?.id) return [];
        return (notifications || []).filter(n => {
            const isFeeRelated = n.type === 'fee_notice_popup' || n.type === 'fee_notice' || n.type === 'fee' || n.isPopup || (n.title || '').toLowerCase().includes('fee');
            const isTargeted = n.audience === 'all' || n.audience === 'students' || (n.audience === 'specific_class' && n.classId === currentUser.classId) || (n.audience === 'specific_student' && n.targetId === currentUser.id);
            return isFeeRelated && isTargeted;
        }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [currentUser, notifications]);

    // PDF Receipt Generator
    const handleDownloadReceipt = (payment) => {
        const doc = new jsPDF();

        // Header Banner
        doc.setFillColor(16, 185, 129); // Emerald primary
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text("SAMASTHA E-LEARNING", 15, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("Official Fee Payment Receipt", 15, 26);

        doc.setFontSize(9);
        doc.text(`Receipt #: ${payment.receiptNo || 'REC-' + payment.id?.substring(0, 6)}`, 140, 18);
        doc.text(`Date: ${payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}`, 140, 26);

        // Student Info Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 45, 180, 35, 3, 3, 'F');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("STUDENT DETAILS", 20, 54);

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${currentUser.name || 'N/A'}`, 20, 63);
        doc.text(`Register No: ${currentUser.registerNo || 'N/A'}`, 20, 71);
        doc.text(`Course / Class: ${resolvedClassName}`, 110, 63);
        doc.text(`Academic Year: ${(payment.academicYear || '2026-2027') + ((payment.academicYear || '2026-2027') === '2026-2027' ? ' (Current)' : ' (Arrears)')}`, 110, 71);

        // Table
        autoTable(doc, {
            startY: 88,
            head: [['Description / Particulars', 'Installment', 'Amount Paid']],
            body: [
                [
                    payment.remarks || 'Tuition Fee Payment',
                    `${payment.installmentName || payment.installmentKey || 'Installment'} (${payment.academicYear || '2026-2027'})`,
                    `INR ${Number(payment.amountPaid || 0).toLocaleString()}`
                ]
            ],
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { fontSize: 10 },
            foot: [['Total Amount Paid', '', `INR ${Number(payment.amountPaid || 0).toLocaleString()}`]],
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
        });

        const finalY = doc.lastAutoTable.finalY + 15;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        doc.text("This is a computer-generated receipt issued by Samastha E-Learning Accounts Office.", 15, finalY);

        doc.save(`Receipt_${payment.receiptNo || 'Fee'}_${currentUser.registerNo || 'Student'}.pdf`);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-8 -translate-y-6 pointer-events-none">
                    <Wallet className="w-56 h-56" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-emerald-100 border border-white/20 mb-3">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                            Official Accounts & Fee Portal
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tuition Fee Details</h1>
                        <p className="text-emerald-100 text-sm mt-1 max-w-xl">
                            Track your overall tuition fee status, installment breakdown, payment receipts, and fee notices.
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 shrink-0">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <CreditCard className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-100 uppercase font-bold">Overall Status</p>
                            <span className={`inline-block text-sm font-black mt-0.5 px-2.5 py-0.5 rounded-full ${
                                financialStats.isFullyPaid 
                                    ? 'bg-emerald-400/30 text-white border border-emerald-300/40'
                                    : financialStats.isPartiallyPaid
                                        ? 'bg-amber-400/30 text-amber-100 border border-amber-300/40'
                                        : 'bg-rose-400/30 text-rose-100 border border-rose-300/40'
                            }`}>
                                {financialStats.isFullyPaid ? '✓ Fully Paid' : financialStats.isPartiallyPaid ? '⚡ Partially Paid' : '⚠️ Payment Pending'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Summary Cards - Responsive 2 per line on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
                <Card className="p-3 sm:p-5 border-l-4 border-l-indigo-500 shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Total Fee</span>
                        <div className="p-1.5 sm:p-2.5 bg-indigo-50 rounded-lg sm:rounded-xl text-indigo-600">
                            <Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <h3 className="text-base sm:text-2xl font-black text-gray-900 font-mono">
                        ₹{financialStats.totalFee.toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium truncate">Academic Year Total</p>
                </Card>

                <Card className="p-3 sm:p-5 border-l-4 border-l-emerald-500 shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Amount Paid</span>
                        <div className="p-1.5 sm:p-2.5 bg-emerald-50 rounded-lg sm:rounded-xl text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <h3 className="text-base sm:text-2xl font-black text-emerald-600 font-mono">
                        ₹{financialStats.totalPaid.toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5 sm:mt-1 font-medium truncate">Recorded Payments</p>
                </Card>

                <Card className="p-3 sm:p-5 border-l-4 border-l-rose-500 shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Remaining Dues</span>
                        <div className="p-1.5 sm:p-2.5 bg-rose-50 rounded-lg sm:rounded-xl text-rose-600">
                            <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <h3 className="text-base sm:text-2xl font-black text-rose-600 font-mono">
                        ₹{financialStats.remainingBalance.toLocaleString()}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium truncate">Pending to Clear</p>
                </Card>

                <Card className="p-3 sm:p-5 border-l-4 border-l-amber-500 shadow-xs hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Installments</span>
                        <div className="p-1.5 sm:p-2.5 bg-amber-50 rounded-lg sm:rounded-xl text-amber-600">
                            <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <h3 className="text-base sm:text-2xl font-black text-gray-900">
                        {financialStats.completedInstallmentsCount} <span className="text-xs sm:text-sm font-bold text-gray-400">/ {financialStats.totalInstallmentsCount}</span>
                    </h3>
                    <p className="text-[10px] sm:text-xs text-amber-700 font-bold mt-0.5 sm:mt-1 truncate">
                        {financialStats.pendingInstallmentsCount === 0 
                            ? 'All Completed!' 
                            : `${financialStats.pendingInstallmentsCount} Remaining`}
                    </p>
                </Card>
            </div>

            {/* Installments Breakdown Section */}
            <Card className="p-4 sm:p-8 space-y-4 sm:space-y-6 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 sm:pb-4">
                    <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                            Installment Breakdown
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Status and schedule of your fee payment installments.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-800">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{financialStats.completedInstallmentsCount} of {financialStats.totalInstallmentsCount} Completed</span>
                        </div>

                        {/* Mobile Expand / Collapse All Toggle Button */}
                        <button
                            type="button"
                            onClick={() => {
                                const anyExpanded = financialStats.breakdown.some(inst => expandedInstallments[inst.key]);
                                if (anyExpanded) {
                                    setExpandedInstallments({});
                                } else {
                                    const allExp = {};
                                    financialStats.breakdown.forEach(inst => { allExp[inst.key] = true; });
                                    setExpandedInstallments(allExp);
                                }
                            }}
                            className="md:hidden inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all border border-gray-200"
                        >
                            {financialStats.breakdown.some(inst => expandedInstallments[inst.key]) ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    <span>Collapse All</span>
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    <span>Expand All</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
                    {financialStats.breakdown.map((inst, index) => {
                        const isExpanded = expandedInstallments[inst.key] === true;
                        return (
                            <div 
                                key={inst.key}
                                className={`rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                                    inst.isCompleted
                                        ? 'bg-emerald-50/50 border-emerald-200/80 shadow-xs'
                                        : inst.isPartial
                                            ? 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                                            : 'bg-white border-gray-200 shadow-xs hover:border-gray-300'
                                }`}
                            >
                                {/* Clickable Header for Mobile Accordion / Desktop Display */}
                                <div 
                                    onClick={() => toggleInstallmentExpand(inst.key)}
                                    className="p-4 sm:p-5 cursor-pointer md:cursor-default select-none"
                                >
                                    {/* Top Badges */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                            Term {index + 1}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                                                inst.isCompleted
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                    : inst.isPartial
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                                {inst.isCompleted ? '✓ Completed' : inst.isPartial ? '⚡ Partially Paid' : '⏳ Pending'}
                                            </span>
                                            {/* Mobile Chevron Toggle Indicator */}
                                            <div className="md:hidden p-1 bg-gray-100 rounded-lg text-gray-600">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Title & Amount */}
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-gray-900 text-sm">{inst.name}</h3>
                                        {inst.dueDate && (
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                Due Date: <span className="font-semibold text-gray-700">{inst.dueDate}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Compact summary on mobile when collapsed */}
                                    <div className={`mt-3 pt-2 border-t border-gray-100/80 md:hidden ${isExpanded ? 'hidden' : 'block'}`}>
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="text-gray-500 font-medium">Balance Dues:</span>
                                            <span className={`font-black font-mono ${inst.remainingForInst > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₹{inst.remainingForInst.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${inst.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                style={{ width: `${inst.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Details (Always shown on desktop md:, collapsible on mobile) */}
                                <div className={`px-4 pb-4 sm:px-5 sm:pb-5 pt-0 ${isExpanded ? 'block' : 'hidden md:block'}`}>
                                    <div className="space-y-3 bg-white/70 p-3 rounded-xl border border-gray-100">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500 font-medium">Installment Amount:</span>
                                            <span className="font-bold text-gray-900 font-mono">₹{inst.targetAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500 font-medium">Amount Paid:</span>
                                            <span className="font-bold text-emerald-600 font-mono">₹{inst.paidForInst.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                                            <span className="text-gray-700 font-bold">Balance Dues:</span>
                                            <span className={`font-black font-mono ${inst.remainingForInst > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₹{inst.remainingForInst.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-1 pt-1">
                                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 rounded-full ${
                                                        inst.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${inst.percent}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <span className="text-[10px] font-bold text-gray-500">{inst.percent}% Paid</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Payment Notifications & Notices Section */}
            {feeNotices.length > 0 && (
                <Card className="p-6 sm:p-8 space-y-4 border border-rose-100 bg-gradient-to-br from-rose-50/30 via-white to-amber-50/20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                            <Bell className="w-5 h-5 animate-bounce" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Payment Notifications & Fee Notices</h2>
                            <p className="text-xs text-gray-500">Official fee communications issued by administration.</p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        {feeNotices.map((notice) => {
                            const isDismissed = (notice.dismissedBy || []).includes(currentUser?.id);
                            return (
                                <div key={notice.id} className="p-4 bg-white border border-rose-200/80 rounded-2xl shadow-xs space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md border border-rose-200">
                                                Official Fee Notice
                                            </span>
                                            <h4 className="text-sm font-bold text-gray-900 mt-1">
                                                {notice.title || 'Fee Payment Notice'}
                                            </h4>
                                        </div>
                                        {isDismissed && (
                                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed">{notice.body || notice.message}</p>
                                    {notice.remainingDues > 0 && (
                                        <p className="text-xs font-bold text-rose-700">
                                            Dues Amount Mentioned: <span className="font-mono text-sm">₹{Number(notice.remainingDues).toLocaleString()}</span>
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-400 pt-1">
                                        Issued on: {notice.createdAt ? format(new Date(notice.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Contact Office & Payment Assistance Section */}
            <Card className="p-6 sm:p-8 space-y-6 shadow-sm border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-emerald-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900">Contact Office for Payment Queries</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Have questions about your installments, concessions, or need assistance completing a payment?
                            </p>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-black border border-emerald-200 self-start md:self-auto">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        Accounts & Logistics Desk
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: WhatsApp Support */}
                    <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">WhatsApp Accounts Support</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Chat directly with the office accounts desk regarding your fee dues or installments.
                            </p>
                        </div>
                        <a
                            href={`https://wa.me/${(officePhone || '918590518541').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Assalamu Alaikum, I am ${currentUser?.name || 'Student'} (Register No: ${currentUser?.registerNo || 'N/A'}), inquiring regarding my Tuition Fee payment & installment status.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                        >
                            <MessageSquare className="w-4 h-4" />
                            WhatsApp Office (+91 85905 18541)
                        </a>
                    </div>

                    {/* Option 2: Direct Phone Line */}
                    <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 hover:border-indigo-400 hover:shadow-xs transition-all flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                <PhoneCall className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">Direct Office Helpline</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Call the accounts desk directly during office hours to complete installments.
                            </p>
                        </div>
                        <a
                            href={`tel:${officePhone || '+918590518541'}`}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                        >
                            <PhoneCall className="w-4 h-4" />
                            Call Office (+91 85905 18541)
                        </a>
                    </div>
                </div>

            </Card>

            {/* Payment History & Digital Receipts Timeline */}
            <Card className="p-6 sm:p-8 space-y-6 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                            <Receipt className="w-6 h-6 text-emerald-600" />
                            Payment History & Digital Receipts
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            All fee payments recorded by the accounts office.
                        </p>
                    </div>
                </div>

                {studentPayments.length === 0 ? (
                    <div className="py-12 text-center space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                        <p className="text-sm font-bold text-gray-600">No Payment Receipts Recorded Yet</p>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            When you make a tuition fee payment at the office, official printable receipts will appear here automatically.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile View: Clean stacked cards (No horizontal scrolling required!) */}
                        <div className="md:hidden space-y-3">
                            {studentPayments.map((p) => (
                                <div key={p.id} className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
                                    {/* Header: Receipt No & Amount */}
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                        <div>
                                            <span className="font-mono font-bold text-indigo-700 text-sm block">
                                                {p.receiptNo || `REC-${p.id?.substring(0, 6)}`}
                                            </span>
                                            <span className="text-[11px] text-gray-500 font-medium">
                                                {p.paymentDate ? format(new Date(p.paymentDate), 'dd MMM yyyy') : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Amount Paid</span>
                                            <span className="font-mono font-black text-emerald-600 text-lg">
                                                ₹{Number(p.amountPaid || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Installment</span>
                                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-md border border-emerald-200 text-[11px]">
                                                {p.installmentName || p.installmentKey || 'Fee Payment'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Mode</span>
                                            <span className="font-semibold text-gray-700 text-xs">
                                                {p.paymentMode || 'Cash'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Year badge & View Receipt Button */}
                                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                            (p.academicYear || '2026-2027') === '2026-2027'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {(p.academicYear || '2026-2027') === '2026-2027' ? '🟢 2026-2027' : `🟠 ${p.academicYear}`}
                                        </span>

                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setSelectedReceipt(p)}
                                            className="px-3.5 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 flex items-center gap-1.5 shrink-0"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            View Receipt
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View: Full 7-column table */}
                        <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase font-bold border-b border-gray-200">
                                        <th className="p-4">Receipt No</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Academic Year</th>
                                        <th className="p-4">Installment</th>
                                        <th className="p-4">Payment Mode</th>
                                        <th className="p-4">Amount Paid</th>
                                        <th className="p-4 text-center">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {studentPayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4 font-mono font-bold text-indigo-700">
                                                {p.receiptNo || `REC-${p.id?.substring(0, 6)}`}
                                            </td>
                                            <td className="p-4 text-gray-700 font-medium">
                                                {p.paymentDate ? format(new Date(p.paymentDate), 'dd MMM yyyy') : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                                    (p.academicYear || '2026-2027') === '2026-2027'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {(p.academicYear || '2026-2027') === '2026-2027' ? '🟢 2026-2027 (Current)' : `🟠 ${p.academicYear} (Arrears)`}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                                                    {p.installmentName || p.installmentKey || 'Fee Payment'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-semibold text-gray-700">
                                                {p.paymentMode || 'Cash'}
                                            </td>
                                            <td className="p-4 font-mono font-black text-emerald-600 text-sm">
                                                ₹{Number(p.amountPaid || 0).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setSelectedReceipt(p)}
                                                    className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5 mx-auto"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    View Receipt
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {/* Receipt Modal */}
            {selectedReceipt && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
                        {/* Receipt Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                                    Official Digital Receipt
                                </span>
                                <h3 className="text-xl font-black mt-1">Samastha E-Learning</h3>
                                <p className="text-xs text-emerald-100">Accounts & Logistics Desk</p>
                            </div>
                            <div className="text-right font-mono">
                                <p className="text-xs text-emerald-200">Receipt No</p>
                                <p className="text-sm font-bold text-white">
                                    {selectedReceipt.receiptNo || `REC-${selectedReceipt.id?.substring(0, 6)}`}
                                </p>
                            </div>
                        </div>

                        {/* Receipt Body */}
                        <div className="p-6 space-y-4 text-xs">
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                                <div className="flex justify-between border-b border-gray-200/70 pb-1.5">
                                    <span className="text-gray-500 font-bold uppercase">Student Name:</span>
                                    <span className="font-bold text-gray-900">{currentUser.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200/70 pb-1.5">
                                    <span className="text-gray-500 font-bold uppercase">Register Number:</span>
                                    <span className="font-mono font-bold text-indigo-600">{currentUser.registerNo}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200/70 pb-1.5">
                                    <span className="text-gray-500 font-bold uppercase">Payment Date:</span>
                                    <span className="font-bold text-gray-800">
                                        {selectedReceipt.paymentDate ? format(new Date(selectedReceipt.paymentDate), 'dd MMMM yyyy') : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200/70 pb-1.5">
                                    <span className="text-gray-500 font-bold uppercase">Payment Mode:</span>
                                    <span className="font-bold text-gray-800">{selectedReceipt.paymentMode || 'Cash'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200/70 pb-1.5">
                                    <span className="text-gray-500 font-bold uppercase">Academic Year:</span>
                                    <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] border ${
                                        (selectedReceipt.academicYear || '2026-2027') === '2026-2027'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        {(selectedReceipt.academicYear || '2026-2027') === '2026-2027' ? '🟢 2026-2027 (Current Year)' : `🟠 ${selectedReceipt.academicYear} (Previous Year Arrears)`}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-gray-500 font-bold uppercase">Installment:</span>
                                    <span className="font-bold text-emerald-700">
                                        {selectedReceipt.installmentName || selectedReceipt.installmentKey}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                                <span className="font-extrabold text-emerald-900 text-sm">Amount Paid:</span>
                                <span className="text-2xl font-black text-emerald-700 font-mono">
                                    ₹{Number(selectedReceipt.amountPaid || 0).toLocaleString()}
                                </span>
                            </div>

                            {selectedReceipt.remarks && (
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <span className="font-bold text-gray-500 block mb-0.5">Remarks:</span>
                                    <p className="text-gray-700">{selectedReceipt.remarks}</p>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex items-center gap-3 pt-4">
                                <Button
                                    type="button"
                                    onClick={() => handleDownloadReceipt(selectedReceipt)}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF Receipt
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setSelectedReceipt(null)}
                                    className="px-5 py-3 font-bold rounded-xl"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentPayments;
