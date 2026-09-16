import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { 
    DollarSign, 
    CreditCard, 
    Calendar, 
    CheckCircle, 
    AlertCircle, 
    Search, 
    Filter, 
    Download, 
    Printer, 
    Send, 
    MessageSquare, 
    Bell, 
    TrendingUp, 
    PieChart as PieIcon, 
    Clock, 
    FileText, 
    Check, 
    Plus, 
    Trash2, 
    User, 
    Users, 
    School, 
    Sparkles,
    Shield,
    Receipt
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const OfficeFeeManagement = () => {
    const { 
        classes, 
        mentors, 
        allStudents, 
        students, 
        feeStructures, 
        feePayments, 
        saveFeeStructure, 
        recordFeePayment, 
        deleteFeePayment, 
        sendStudentFeeNotification 
    } = useData();

    const { showAlert, showConfirm } = useUI();

    // Main Active Sub-Tab: 'payments' | 'configurator' | 'dues' | 'reports'
    const [activeTab, setActiveTab] = useState('payments');

    // Student Pool (Active students across system)
    const studentPool = useMemo(() => {
        const list = (allStudents && allStudents.length > 0) ? allStudents : (students || []);
        return list.filter(s => s.status === 'Active' || s.status === 'active' || s.status === 'Payment Pending');
    }, [allStudents, students]);

    // -------------------------------------------------------------
    // TAB 1: FEE STRUCTURE CONFIGURATOR (CLASS & PER-STUDENT)
    // -------------------------------------------------------------
    const [configTargetType, setConfigTargetType] = useState('class'); // 'class' | 'student'
    const [selectedConfigTargetId, setSelectedConfigTargetId] = useState('');
    const [totalFeeAmount, setTotalFeeAmount] = useState(12700);
    const [installmentConfig, setInstallmentConfig] = useState({
        inst1: { amount: 4233, name: 'Installment 1 (Admission)', dueDate: '2026-05-30' },
        inst2: { amount: 4233, name: 'Installment 2 (Mid-Term)', dueDate: '2026-09-30' },
        inst3: { amount: 4234, name: 'Installment 3 (Final Term)', dueDate: '2027-01-30' }
    });
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMessage, setConfigMessage] = useState('');

    // Search & Filter States for Fee Configurator
    const [configSearchTerm, setConfigSearchTerm] = useState('');
    const [configMentorFilter, setConfigMentorFilter] = useState('all');
    const [configClassFilter, setConfigClassFilter] = useState('all');

    // Cascading Classes based on selected Mentor for Configurator
    const availableClassesForConfig = useMemo(() => {
        if (configMentorFilter === 'all') return classes || [];
        const targetMentor = (mentors || []).find(m => m.id === configMentorFilter);
        return (classes || []).filter(c => 
            (targetMentor?.assignedClassIds || []).includes(c.id) || 
            c.mentorId === configMentorFilter || 
            c.mentorName === targetMentor?.name
        );
    }, [classes, mentors, configMentorFilter]);

    // Reset Config Class filter if selected class is no longer allotted to selected Mentor
    useEffect(() => {
        if (configClassFilter !== 'all') {
            const isValid = availableClassesForConfig.some(c => c.id === configClassFilter);
            if (!isValid) setConfigClassFilter('all');
        }
    }, [availableClassesForConfig, configClassFilter]);

    // Filtered Student List for Configurator Selection
    const filteredConfigStudents = useMemo(() => {
        return studentPool.filter(s => {
            const cls = (classes || []).find(c => c.id === s.classId);

            // Mentor Filter
            if (configMentorFilter !== 'all') {
                const targetMentor = (mentors || []).find(m => m.id === configMentorFilter);
                const isAssigned = (targetMentor?.assignedClassIds || []).includes(s.classId) || 
                                   cls?.mentorId === configMentorFilter || 
                                   cls?.mentorName === targetMentor?.name;
                if (!isAssigned) return false;
            }

            // Class & Division Filter
            if (configClassFilter !== 'all' && s.classId !== configClassFilter) {
                return false;
            }

            // Keyword Search (Name or Register Number)
            if (configSearchTerm.trim()) {
                const term = configSearchTerm.toLowerCase().trim();
                const name = (s.name || '').toLowerCase();
                const reg = (s.registerNo || '').toLowerCase();
                return name.includes(term) || reg.includes(term);
            }

            return true;
        });
    }, [studentPool, classes, mentors, configMentorFilter, configClassFilter, configSearchTerm]);

    // Auto-populate existing Fee Structure when Target Student or Class is selected
    useEffect(() => {
        if (!selectedConfigTargetId) return;
        const existingStruct = (feeStructures || []).find(f => f.targetId === selectedConfigTargetId || f.id === selectedConfigTargetId);
        if (existingStruct) {
            setTotalFeeAmount(existingStruct.totalAmount || 12700);
            if (existingStruct.installments) {
                setInstallmentConfig(existingStruct.installments);
            }
        } else {
            setTotalFeeAmount(12700);
            setInstallmentConfig({
                inst1: { amount: 4233, name: 'Installment 1 (Admission)', dueDate: '2026-05-30' },
                inst2: { amount: 4233, name: 'Installment 2 (Mid-Term)', dueDate: '2026-09-30' },
                inst3: { amount: 4234, name: 'Installment 3 (Final Term)', dueDate: '2027-01-30' }
            });
        }
    }, [selectedConfigTargetId, feeStructures]);


    const handleAutoSplit = (total) => {
        const val = Number(total) || 0;
        const part = Math.floor(val / 3);
        const remainder = val - (part * 2);
        setInstallmentConfig(prev => ({
            inst1: { ...prev.inst1, amount: part },
            inst2: { ...prev.inst2, amount: part },
            inst3: { ...prev.inst3, amount: remainder }
        }));
    };

    const handleTotalFeeChange = (val) => {
        const num = Number(val) || 0;
        setTotalFeeAmount(num);
        handleAutoSplit(num);
    };

    // Apply Concession / Discount Preset (e.g. 20% for 2nd/3rd Sibling from ₹12,700)
    const applyConcessionPreset = (discountPercent) => {
        const base = 12700;
        const discountAmount = Math.round((base * discountPercent) / 100);
        const finalFee = Math.max(0, base - discountAmount);
        setTotalFeeAmount(finalFee);
        handleAutoSplit(finalFee);
        showAlert(
            'Concession Applied',
            `${discountPercent}% Sibling Concession applied! New Total Fee: ₹${finalFee.toLocaleString()} (Saving ₹${discountAmount.toLocaleString()})`,
            'success'
        );
    };

    // Detect Sibling Household by Parent Phone
    const detectedSiblings = useMemo(() => {
        if (configTargetType !== 'student' || !selectedConfigTargetId) return [];
        const targetStudent = studentPool.find(s => s.id === selectedConfigTargetId);
        if (!targetStudent) return [];

        const parentPhone = targetStudent.parentPhone || targetStudent.phone || '';
        const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 5) return [];

        return studentPool.filter(s => {
            const sPhone = (s.parentPhone || s.phone || '').replace(/[^0-9]/g, '');
            return sPhone && sPhone === cleanPhone;
        });
    }, [configTargetType, selectedConfigTargetId, studentPool]);

    const handleSaveFeeStructure = async (e) => {
        e.preventDefault();
        if (!selectedConfigTargetId) {
            showAlert('Selection Required', 'Please select a Class or Student to configure fee structure.', 'warning');
            return;
        }
        setSavingConfig(true);
        setConfigMessage('');

        const sumInstallments = Number(installmentConfig.inst1.amount) + Number(installmentConfig.inst2.amount) + Number(installmentConfig.inst3.amount);

        const payload = {
            targetType: configTargetType,
            targetId: selectedConfigTargetId,
            totalAmount: Number(totalFeeAmount),
            sumInstallments,
            installments: installmentConfig,
            updatedAt: new Date().toISOString()
        };

        try {
            await saveFeeStructure(selectedConfigTargetId, payload);
            setConfigMessage('Fee Structure saved successfully!');
            showAlert('Success', 'Fee Structure saved successfully!', 'success');
            setTimeout(() => setConfigMessage(''), 4000);
        } catch (err) {
            console.error('Error saving fee structure:', err);
            showAlert('Error', 'Failed to save fee structure.', 'error');
        } finally {
            setSavingConfig(false);
        }
    };

    // Helper: Resolve effective fee structure for a student (per-student override if exists, else class structure, else default)
    const getStudentFeeStructure = (student) => {
        if (!student) return { totalAmount: 12700, installments: installmentConfig };
        
        // 1. Direct per-student structure
        const studentStruct = (feeStructures || []).find(f => f.targetId === student.id || f.id === student.id);
        if (studentStruct) return studentStruct;

        // 2. Class fee structure
        if (student.classId) {
            const classStruct = (feeStructures || []).find(f => f.targetId === student.classId || f.id === student.classId);
            if (classStruct) return classStruct;
        }

        // 3. Fallback default
        return {
            totalAmount: 12700,
            installments: {
                inst1: { amount: 4233, name: 'Installment 1 (Admission)', dueDate: '2026-05-30' },
                inst2: { amount: 4233, name: 'Installment 2 (Mid-Term)', dueDate: '2026-09-30' },
                inst3: { amount: 4234, name: 'Installment 3 (Final Term)', dueDate: '2027-01-30' }
            }
        };
    };

    // -------------------------------------------------------------
    // TAB 2: PAYMENT COLLECTION & DIGITAL PRINTABLE RECEIPTS
    // -------------------------------------------------------------
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedInstallmentKey, setSelectedInstallmentKey] = useState('inst1');
    const [customPayAmount, setCustomPayAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'
    const [remarks, setRemarks] = useState('');
    const [submittingPay, setSubmittingPay] = useState(false);
    const [lastIssuedReceipt, setLastIssuedReceipt] = useState(null);

    // Search & Filter States for Payment Collection
    const [paySearchTerm, setPaySearchTerm] = useState('');
    const [payMentorFilter, setPayMentorFilter] = useState('all');
    const [payClassFilter, setPayClassFilter] = useState('all');

    // Cascading Classes based on selected Mentor for Payment Collection
    const availableClassesForPay = useMemo(() => {
        if (payMentorFilter === 'all') return classes || [];
        const targetMentor = (mentors || []).find(m => m.id === payMentorFilter);
        return (classes || []).filter(c => 
            (targetMentor?.assignedClassIds || []).includes(c.id) || 
            c.mentorId === payMentorFilter || 
            c.mentorName === targetMentor?.name
        );
    }, [classes, mentors, payMentorFilter]);

    // Reset Class filter if selected class is no longer allotted to selected Mentor
    useEffect(() => {
        if (payClassFilter !== 'all') {
            const isValid = availableClassesForPay.some(c => c.id === payClassFilter);
            if (!isValid) setPayClassFilter('all');
        }
    }, [availableClassesForPay, payClassFilter]);

    // Filtered Student List for Payment Selection
    const filteredPaymentStudents = useMemo(() => {
        return studentPool.filter(s => {
            const cls = (classes || []).find(c => c.id === s.classId);

            // Mentor Filter
            if (payMentorFilter !== 'all') {
                const targetMentor = (mentors || []).find(m => m.id === payMentorFilter);
                const isAssigned = (targetMentor?.assignedClassIds || []).includes(s.classId) || 
                                   cls?.mentorId === payMentorFilter || 
                                   cls?.mentorName === targetMentor?.name;
                if (!isAssigned) return false;
            }

            // Class & Division Filter
            if (payClassFilter !== 'all' && s.classId !== payClassFilter) {
                return false;
            }

            // Keyword Search (Name or Register Number)
            if (paySearchTerm.trim()) {
                const term = paySearchTerm.toLowerCase().trim();
                const name = (s.name || '').toLowerCase();
                const reg = (s.registerNo || '').toLowerCase();
                return name.includes(term) || reg.includes(term);
            }

            return true;
        });
    }, [studentPool, classes, mentors, payMentorFilter, payClassFilter, paySearchTerm]);

    const selectedStudent = useMemo(() => {
        return studentPool.find(s => s.id === selectedStudentId);
    }, [studentPool, selectedStudentId]);

    const activeFeeStruct = useMemo(() => {
        return getStudentFeeStructure(selectedStudent);
    }, [selectedStudent, feeStructures]);

    const studentTotals = useMemo(() => {
        if (!selectedStudent) return { totalFee: 15000, totalPaid: 0, remainingBalance: 15000, isFullyPaid: false };
        const studentPayments = (feePayments || []).filter(p => p.studentId === selectedStudent.id);
        const totalPaid = studentPayments.reduce((acc, p) => acc + Number(p.amountPaid || 0), 0);
        const totalFee = Number(activeFeeStruct.totalAmount || 15000);
        const remainingBalance = Math.max(0, totalFee - totalPaid);

        const inst1Paid = studentPayments.filter(p => p.installmentKey === 'inst1').reduce((s, p) => s + Number(p.amountPaid || 0), 0);
        const inst2Paid = studentPayments.filter(p => p.installmentKey === 'inst2').reduce((s, p) => s + Number(p.amountPaid || 0), 0);
        const inst3Paid = studentPayments.filter(p => p.installmentKey === 'inst3').reduce((s, p) => s + Number(p.amountPaid || 0), 0);

        return {
            totalFee,
            totalPaid,
            remainingBalance,
            isFullyPaid: remainingBalance <= 0,
            inst1Paid,
            inst2Paid,
            inst3Paid
        };
    }, [selectedStudent, feePayments, activeFeeStruct]);

    const handleRecordPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStudent) {
            showAlert('Student Required', 'Please select a student first.', 'warning');
            return;
        }

        const instData = activeFeeStruct.installments?.[selectedInstallmentKey] || { amount: 5000, name: 'Installment' };
        const payAmount = Number(customPayAmount) || Number(instData.amount) || 5000;

        if (payAmount <= 0) {
            showAlert('Invalid Amount', 'Payment amount must be greater than zero.', 'warning');
            return;
        }

        setSubmittingPay(true);

        const studentClassObj = (classes || []).find(c => c.id === selectedStudent.classId);

        const payload = {
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            registerNo: selectedStudent.registerNo || 'N/A',
            classId: selectedStudent.classId || '',
            className: studentClassObj ? `${studentClassObj.name}-${studentClassObj.division}` : (selectedStudent.className || 'N/A'),
            installmentKey: selectedInstallmentKey,
            installmentName: instData.name || selectedInstallmentKey,
            amountPaid: payAmount,
            paymentMode,
            remarks,
            receivedBy: 'Office Accountant'
        };

        try {
            const receipt = await recordFeePayment(payload);
            setLastIssuedReceipt({ ...receipt, totalFee: studentTotals.totalFee, remainingAfterPay: Math.max(0, studentTotals.remainingBalance - payAmount) });
            setCustomPayAmount('');
            setRemarks('');
            showAlert('Payment Recorded', `Payment recorded successfully! Receipt ID: #${receipt.receiptId}`, 'success');
        } catch (err) {
            console.error('Error recording payment:', err);
            showAlert('Error', 'Failed to record payment.', 'error');
        } finally {
            setSubmittingPay(false);
        }
    };

    // Delete Fee Payment Transaction (Using Web Theme Confirmation Modal)
    const handleDeletePayment = (paymentId, receiptId) => {
        if (!paymentId) return;
        showConfirm(
            'Delete Payment Receipt',
            `Are you sure you want to delete payment receipt #${receiptId || paymentId}? This action will revert the fee balance for the student.`,
            async () => {
                try {
                    await deleteFeePayment(paymentId);
                    if (lastIssuedReceipt?.id === paymentId) {
                        setLastIssuedReceipt(null);
                    }
                    showAlert('Deleted', 'Fee transaction deleted successfully.', 'success');
                } catch (err) {
                    console.error('Failed to delete fee transaction:', err);
                    showAlert('Error', 'Failed to delete transaction.', 'error');
                }
            }
        );
    };

    // PDF Receipt Generator
    const generatePrintablePDFReceipt = (receiptObj) => {
        if (!receiptObj) return;

        const doc = new jsPDF();
        
        // Outer Header Box
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, 210, 38, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('SAMASTHA E-LEARNING', 14, 16);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('OFFICIAL FEE PAYMENT RECEIPT', 14, 24);
        doc.text('Realizing the real path', 14, 30);

        // Receipt ID Tag
        doc.setFillColor(245, 158, 11); // Amber 500
        doc.rect(130, 10, 66, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`RECEIPT #: ${receiptObj.receiptId || 'N/A'}`, 134, 22);

        // Metadata Table
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('STUDENT & PAYMENT DETAILS', 14, 48);

        const paymentDateStr = format(new Date(receiptObj.paymentDate || receiptObj.createdAt || Date.now()), 'PPP p');

        autoTable(doc, {
            startY: 52,
            head: [['Field', 'Information']],
            body: [
                ['Student Name', receiptObj.studentName || 'N/A'],
                ['Register Number', receiptObj.registerNo || 'N/A'],
                ['Class / Division', receiptObj.className || 'N/A'],
                ['Installment Paid', receiptObj.installmentName || 'Installment Payment'],
                ['Payment Mode', receiptObj.paymentMode || 'Cash'],
                ['Date & Time', paymentDateStr],
                ['Received By', receiptObj.receivedBy || 'Office Accountant']
            ],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        // Payment Summary Box
        const finalY = doc.lastAutoTable.finalY + 12;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('FINANCIAL BREAKDOWN', 14, finalY);

        autoTable(doc, {
            startY: finalY + 4,
            head: [['Description', 'Amount (INR)']],
            body: [
                ['Total Academic Fee', `INR ${Number(receiptObj.totalFee || 15000).toLocaleString()}`],
                ['AMOUNT PAID THIS RECEIPT', `INR ${Number(receiptObj.amountPaid || 0).toLocaleString()}`],
                ['Remaining Fee Dues', `INR ${Number(receiptObj.remainingAfterPay || 0).toLocaleString()}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 11, cellPadding: 4, fontStyle: 'bold' }
        });

        const sealY = doc.lastAutoTable.finalY + 25;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, sealY, 80, sealY);
        doc.line(130, sealY, 196, sealY);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Payer Signature', 30, sealY + 6);
        doc.text('Authorized Office Stamp / Sign', 135, sealY + 6);

        doc.save(`Fee_Receipt_${receiptObj.receiptId}_${receiptObj.registerNo}.pdf`);
    };

    // -------------------------------------------------------------
    // TAB 3: DUES & DEFAULTERS TRACKER (WITH WEBSITE NOTIFICATIONS)
    // -------------------------------------------------------------
    const [duesSearchTerm, setDuesSearchTerm] = useState('');
    const [duesStatusFilter, setDuesStatusFilter] = useState('pending'); // 'pending' | 'paid' | 'all'
    const [selectedDuesMentorId, setSelectedDuesMentorId] = useState('all');
    const [selectedDuesClassId, setSelectedDuesClassId] = useState('all');

    // Cascading Classes based on selected Mentor for Dues Tracker
    const availableClassesForDues = useMemo(() => {
        if (selectedDuesMentorId === 'all') return classes || [];
        const targetMentor = (mentors || []).find(m => m.id === selectedDuesMentorId);
        return (classes || []).filter(c => 
            (targetMentor?.assignedClassIds || []).includes(c.id) || 
            c.mentorId === selectedDuesMentorId || 
            c.mentorName === targetMentor?.name
        );
    }, [classes, mentors, selectedDuesMentorId]);

    // Reset Dues Class filter if selected class is no longer allotted to selected Mentor
    useEffect(() => {
        if (selectedDuesClassId !== 'all') {
            const isValid = availableClassesForDues.some(c => c.id === selectedDuesClassId);
            if (!isValid) setSelectedDuesClassId('all');
        }
    }, [availableClassesForDues, selectedDuesClassId]);

    const duesListData = useMemo(() => {
        return studentPool.map(s => {
            const cls = (classes || []).find(c => c.id === s.classId);
            const struct = getStudentFeeStructure(s);
            const sPayments = (feePayments || []).filter(p => p.studentId === s.id);
            const totalPaid = sPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            const totalFee = Number(struct.totalAmount || 15000);
            const remainingDues = Math.max(0, totalFee - totalPaid);
            const isFullyPaid = remainingDues <= 0;

            return {
                student: s,
                cls,
                totalFee,
                totalPaid,
                remainingDues,
                isFullyPaid,
                status: isFullyPaid ? 'Paid' : 'Payment Pending'
            };
        }).filter(item => {
            // Filter by Mentor
            if (selectedDuesMentorId !== 'all') {
                const targetMentor = (mentors || []).find(m => m.id === selectedDuesMentorId);
                const isAssigned = (targetMentor?.assignedClassIds || []).includes(item.student.classId) || 
                                   item.cls?.mentorId === selectedDuesMentorId || 
                                   item.cls?.mentorName === targetMentor?.name;
                if (!isAssigned) return false;
            }

            // Filter by Class
            if (selectedDuesClassId !== 'all' && item.student.classId !== selectedDuesClassId) return false;

            // Filter by Status
            if (duesStatusFilter === 'pending' && item.isFullyPaid) return false;
            if (duesStatusFilter === 'paid' && !item.isFullyPaid) return false;

            // Search Filter
            if (duesSearchTerm.trim()) {
                const term = duesSearchTerm.toLowerCase();
                const sName = (item.student.name || '').toLowerCase();
                const reg = (item.student.registerNo || '').toLowerCase();
                const clsName = item.cls ? `${item.cls.name} ${item.cls.division}`.toLowerCase() : '';
                return sName.includes(term) || reg.includes(term) || clsName.includes(term);
            }

            return true;
        }).sort((a, b) => b.remainingDues - a.remainingDues);
    }, [studentPool, classes, mentors, feeStructures, feePayments, selectedDuesClassId, selectedDuesMentorId, duesStatusFilter, duesSearchTerm]);

    // Send Reminders Actions
    const handleSendWebsiteNotification = async (item) => {
        const msg = `Dear ${item.student.name}, your fee payment of INR ${item.remainingDues.toLocaleString()} is currently pending. Please arrange payment with the Office.`;
        try {
            await sendStudentFeeNotification(item.student.id, '⚠️ Fee Payment Due Notice', msg);
            showAlert('Notice Dispatched', `Website In-App Fee Notification dispatched to ${item.student.name}!`, 'success');
        } catch (err) {
            console.error('Error sending in-app notification:', err);
            showAlert('Error', 'Failed to send website notification.', 'error');
        }
    };

    const getWhatsAppReminderLink = (item) => {
        const phone = item.student.parentPhone || item.student.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(`Assalamu Alaikum. Dear Parent, fee payment for ${item.student.name} (Reg: ${item.student.registerNo || 'N/A'}) is pending. Outstanding dues: INR ${item.remainingDues.toLocaleString()}. Please complete payment at your earliest convenience.`);
        return `https://wa.me/${cleanPhone}?text=${msg}`;
    };

    // -------------------------------------------------------------
    // TAB 4: FINANCIAL ANALYTICS & AUDIT REPORTS
    // -------------------------------------------------------------
    const overallFinancialKPIs = useMemo(() => {
        const totalExpectedRevenue = studentPool.reduce((sum, s) => {
            const struct = getStudentFeeStructure(s);
            return sum + Number(struct.totalAmount || 15000);
        }, 0);

        const totalCollectedRevenue = (feePayments || []).reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        const totalPendingRevenue = Math.max(0, totalExpectedRevenue - totalCollectedRevenue);
        const collectionRate = totalExpectedRevenue > 0 ? Math.round((totalCollectedRevenue / totalExpectedRevenue) * 100) : 0;

        return {
            totalExpectedRevenue,
            totalCollectedRevenue,
            totalPendingRevenue,
            collectionRate
        };
    }, [studentPool, feeStructures, feePayments]);

    // Monthly Collection Chart Data
    const monthlyTrendChartData = useMemo(() => {
        const monthsMap = {};
        (feePayments || []).forEach(p => {
            const d = new Date(p.paymentDate || p.createdAt || Date.now());
            const mKey = format(d, 'MMM yyyy');
            if (!monthsMap[mKey]) monthsMap[mKey] = { name: mKey, amount: 0 };
            monthsMap[mKey].amount += Number(p.amountPaid || 0);
        });
        const list = Object.values(monthsMap);
        return list.length > 0 ? list : [{ name: 'Current Month', amount: overallFinancialKPIs.totalCollectedRevenue }];
    }, [feePayments, overallFinancialKPIs]);

    const exportFinancialLedgerPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('OFFICIAL FINANCIAL AUDIT LEDGER', 14, 15);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 22);

        const tableBody = (feePayments || []).map(p => [
            p.receiptId || 'N/A',
            p.studentName || 'N/A',
            p.className || 'N/A',
            p.paymentMode || 'Cash',
            `INR ${Number(p.amountPaid || 0).toLocaleString()}`,
            format(new Date(p.paymentDate || p.createdAt || Date.now()), 'yyyy-MM-dd')
        ]);

        autoTable(doc, {
            startY: 28,
            head: [['Receipt ID', 'Student', 'Class', 'Mode', 'Amount', 'Date']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }
        });

        doc.save(`Financial_Ledger_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Navigation Tabs Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Receipt className="w-7 h-7 text-indigo-600" />
                        Fee Collection
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        Real-Time Connected Accounts • Official PDF Receipts & Installment Management
                    </p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                            activeTab === 'payments' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <CreditCard className="w-4 h-4" /> Collect Payment & Receipts
                    </button>
                    <button
                        onClick={() => setActiveTab('configurator')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                            activeTab === 'configurator' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <DollarSign className="w-4 h-4" /> Fee Configurator (3 Installments)
                    </button>
                    <button
                        onClick={() => setActiveTab('dues')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                            activeTab === 'dues' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <AlertCircle className="w-4 h-4 text-rose-500" /> Dues & Defaulters Tracker
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                            activeTab === 'reports' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 text-emerald-600" /> Financial Analytics
                    </button>
                </div>
            </div>

            {/* TAB 1: PAYMENT COLLECTION & DIGITAL PRINTABLE RECEIPTS */}
            {activeTab === 'payments' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Form: Select Student & Record Payment */}
                    <Card className="lg:col-span-7 p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-5">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-600" /> Record Fee Payment
                            </h3>
                            <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                                Real-Time Receipt Entry
                            </span>
                        </div>

                        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-indigo-600" /> Select Student:
                                    </span>
                                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                        {filteredPaymentStudents.length} student{filteredPaymentStudents.length !== 1 ? 's' : ''} match filters
                                    </span>
                                </label>

                                {/* Search & Filter Controls Card */}
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 mb-3">
                                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                        <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <Filter className="w-3.5 h-3.5 text-indigo-600" /> Search & Filter Options
                                        </span>
                                        {(paySearchTerm || payClassFilter !== 'all' || payMentorFilter !== 'all') && (
                                            <button
                                                type="button"
                                                onClick={() => { setPaySearchTerm(''); setPayClassFilter('all'); setPayMentorFilter('all'); }}
                                                className="text-[10px] font-bold text-rose-600 hover:underline"
                                            >
                                                Reset Filters
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {/* 1. Mentor Filter (FIRST) */}
                                        <div>
                                            <select
                                                value={payMentorFilter}
                                                onChange={(e) => setPayMentorFilter(e.target.value)}
                                                className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800"
                                            >
                                                <option value="all">All Mentors</option>
                                                {(mentors || []).map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2. Class & Division Filter (SECOND - Cascading based on Mentor) */}
                                        <div>
                                            <select
                                                value={payClassFilter}
                                                onChange={(e) => setPayClassFilter(e.target.value)}
                                                className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800"
                                            >
                                                <option value="all">
                                                    {payMentorFilter !== 'all' ? `All Allotted Classes (${availableClassesForPay.length})` : 'All Classes & Divisions'}
                                                </option>
                                                {availableClassesForPay.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        Class {c.name}-{c.division}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 3. Keyword Search */}
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                                            <input
                                                type="text"
                                                value={paySearchTerm}
                                                onChange={(e) => setPaySearchTerm(e.target.value)}
                                                placeholder="Name / Reg No..."
                                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Filtered Student Selector */}
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                                    required
                                >
                                    <option value="">-- Choose Student ({filteredPaymentStudents.length} Available) --</option>
                                    {filteredPaymentStudents.map(s => {
                                        const cls = (classes || []).find(c => c.id === s.classId);
                                        const m = (mentors || []).find(men => (men.assignedClassIds || []).includes(s.classId) || cls?.mentorId === men.id);
                                        return (
                                            <option key={s.id} value={s.id}>
                                                {s.name} (Reg: {s.registerNo || 'N/A'}) - {cls ? `${cls.name}-${cls.division}` : 'Class N/A'} {m ? `[Mentor: ${m.name}]` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {selectedStudent && (
                                <>
                                    {/* Financial Overview Card */}
                                    <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white rounded-xl space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-extrabold text-base">{selectedStudent.name}</h4>
                                                <p className="text-xs text-slate-300">Reg: {selectedStudent.registerNo || 'N/A'}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${studentTotals.isFullyPaid ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                {studentTotals.isFullyPaid ? 'FULLY PAID ✅' : 'DUES PENDING ⚠️'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/80">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Fee</p>
                                                <p className="text-sm font-black">₹{studentTotals.totalFee.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-emerald-400 font-bold uppercase">Paid So Far</p>
                                                <p className="text-sm font-black text-emerald-400">₹{studentTotals.totalPaid.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-rose-400 font-bold uppercase">Remaining</p>
                                                <p className="text-sm font-black text-rose-400">₹{studentTotals.remainingBalance.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Installment Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Select Installment / Term:</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { key: 'inst1', name: activeFeeStruct.installments?.inst1?.name || 'Inst 1', paid: studentTotals.inst1Paid, due: activeFeeStruct.installments?.inst1?.amount || 5000 },
                                                { key: 'inst2', name: activeFeeStruct.installments?.inst2?.name || 'Inst 2', paid: studentTotals.inst2Paid, due: activeFeeStruct.installments?.inst2?.amount || 5000 },
                                                { key: 'inst3', name: activeFeeStruct.installments?.inst3?.name || 'Inst 3', paid: studentTotals.inst3Paid, due: activeFeeStruct.installments?.inst3?.amount || 5000 }
                                            ].map(inst => (
                                                <button
                                                    type="button"
                                                    key={inst.key}
                                                    onClick={() => setSelectedInstallmentKey(inst.key)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${
                                                        selectedInstallmentKey === inst.key ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <p className="text-xs font-extrabold text-gray-900 truncate">{inst.name}</p>
                                                    <p className="text-[11px] font-bold text-gray-500 mt-1">Due: ₹{inst.due.toLocaleString()}</p>
                                                    <p className={`text-[10px] font-black ${inst.paid >= inst.due ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        Paid: ₹{inst.paid.toLocaleString()}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Amount to Collect (INR):</label>
                                            <Input
                                                type="number"
                                                value={customPayAmount}
                                                onChange={(e) => setCustomPayAmount(e.target.value)}
                                                placeholder={`e.g. ${activeFeeStruct.installments?.[selectedInstallmentKey]?.amount || 5000}`}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode:</label>
                                            <select
                                                value={paymentMode}
                                                onChange={(e) => setPaymentMode(e.target.value)}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl focus:bg-white outline-none"
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="UPI">UPI / GPay / PhonePe</option>
                                                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                                                <option value="Cheque">Cheque</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Note (Optional):</label>
                                        <Input
                                            type="text"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="e.g. Paid at office counter"
                                        />
                                    </div>

                                    <Button type="submit" variant="primary" className="w-full py-3 text-sm font-bold gap-2" disabled={submittingPay}>
                                        <CheckCircle className="w-4 h-4" />
                                        {submittingPay ? 'Processing Payment...' : 'Record Payment & Generate Official Receipt'}
                                    </Button>
                                </>
                            )}
                        </form>
                    </Card>

                    {/* Right Panel: Recent Receipts & Download */}
                    <Card className="lg:col-span-5 p-6 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex justify-between items-center border-b pb-3 mb-4">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Printer className="w-5 h-5 text-emerald-600" /> Printable PDF Receipts
                                </h3>
                                <span className="text-xs font-bold text-gray-400">Digital Archive</span>
                            </div>

                            {lastIssuedReceipt && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 space-y-2 animate-in fade-in">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-emerald-800">LATEST ISSUED RECEIPT</span>
                                        <span className="text-xs font-mono font-bold text-emerald-700">#{lastIssuedReceipt.receiptId}</span>
                                    </div>
                                    <p className="text-sm font-extrabold text-gray-900">{lastIssuedReceipt.studentName}</p>
                                    <p className="text-xs text-gray-600">Amount: INR {Number(lastIssuedReceipt.amountPaid).toLocaleString()} • {lastIssuedReceipt.paymentMode}</p>
                                    <Button
                                        onClick={() => generatePrintablePDFReceipt(lastIssuedReceipt)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 py-2 mt-2"
                                    >
                                        <Download className="w-4 h-4" /> Download / Print PDF Receipt
                                    </Button>
                                </div>
                            )}

                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Recent Transactions Log</h4>
                            <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                                {(feePayments || []).length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-4 text-center">No fee payments recorded yet.</p>
                                ) : (
                                    (feePayments || []).slice(0, 8).map(p => (
                                        <div key={p.id} className="py-2.5 flex justify-between items-center text-xs group">
                                            <div>
                                                <p className="font-bold text-gray-900">{p.studentName}</p>
                                                <p className="text-[10px] text-gray-400">Receipt #{p.receiptId} • {p.paymentMode}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-2">
                                                <div>
                                                    <p className="font-extrabold text-emerald-600">₹{Number(p.amountPaid || 0).toLocaleString()}</p>
                                                    <button
                                                        onClick={() => generatePrintablePDFReceipt({ ...p, totalFee: 15000, remainingAfterPay: 0 })}
                                                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 justify-end"
                                                    >
                                                        <Download className="w-3 h-3" /> PDF
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePayment(p.id, p.receiptId)}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete this transaction"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 2: FEE STRUCTURE CONFIGURATOR (CLASS & PER-STUDENT) */}
            {activeTab === 'configurator' && (
                <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-6 max-w-4xl mx-auto">
                    <div className="border-b pb-4">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-indigo-600" />
                            3-Installment Fee Structure Configurator
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            Set up annual fee totals and split into 3 custom installments per Class or customize for individual Students.
                        </p>
                    </div>

                    <form onSubmit={handleSaveFeeStructure} className="space-y-6">
                        {/* Target Selection: Class vs Student */}
                        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Configure Fee For:</span>
                            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetType"
                                    value="class"
                                    checked={configTargetType === 'class'}
                                    onChange={() => { setConfigTargetType('class'); setSelectedConfigTargetId(''); }}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <School className="w-4 h-4 text-indigo-600" /> By Class (Default)
                            </label>

                            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetType"
                                    value="student"
                                    checked={configTargetType === 'student'}
                                    onChange={() => { setConfigTargetType('student'); setSelectedConfigTargetId(''); }}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <User className="w-4 h-4 text-emerald-600" /> Per-Student Override (Scholarship/Custom)
                            </label>
                        </div>

                        {/* Search & Filter Controls Card */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                    <Filter className="w-3.5 h-3.5 text-indigo-600" /> Search & Filter Options
                                </span>
                                {(configSearchTerm || configClassFilter !== 'all' || configMentorFilter !== 'all') && (
                                    <button
                                        type="button"
                                        onClick={() => { setConfigSearchTerm(''); setConfigClassFilter('all'); setConfigMentorFilter('all'); }}
                                        className="text-[10px] font-bold text-rose-600 hover:underline"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {/* 1. Mentor Filter (FIRST) */}
                                <div>
                                    <select
                                        value={configMentorFilter}
                                        onChange={(e) => setConfigMentorFilter(e.target.value)}
                                        className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800"
                                    >
                                        <option value="all">All Mentors</option>
                                        {(mentors || []).map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. Class & Division Filter (SECOND - Cascading based on Mentor) */}
                                <div>
                                    <select
                                        value={configClassFilter}
                                        onChange={(e) => setConfigClassFilter(e.target.value)}
                                        className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800"
                                    >
                                        <option value="all">
                                            {configMentorFilter !== 'all' ? `All Allotted Classes (${availableClassesForConfig.length})` : 'All Classes & Divisions'}
                                        </option>
                                        {availableClassesForConfig.map(c => (
                                            <option key={c.id} value={c.id}>
                                                Class {c.name}-{c.division}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. Keyword Search */}
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                                    <input
                                        type="text"
                                        value={configSearchTerm}
                                        onChange={(e) => setConfigSearchTerm(e.target.value)}
                                        placeholder="Name / Reg No..."
                                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dropdown for selected Target */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                                <span>Select {configTargetType === 'class' ? 'Target Class' : 'Target Student'}:</span>
                                {configTargetType === 'student' && (
                                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                        {filteredConfigStudents.length} student{filteredConfigStudents.length !== 1 ? 's' : ''} match filters
                                    </span>
                                )}
                            </label>
                            {configTargetType === 'class' ? (
                                <select
                                    value={selectedConfigTargetId}
                                    onChange={(e) => setSelectedConfigTargetId(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl outline-none"
                                    required
                                >
                                    <option value="">-- Choose Class --</option>
                                    {availableClassesForConfig.map(c => (
                                        <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    value={selectedConfigTargetId}
                                    onChange={(e) => setSelectedConfigTargetId(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl outline-none"
                                    required
                                >
                                    <option value="">-- Choose Student ({filteredConfigStudents.length} Available) --</option>
                                    {filteredConfigStudents.map(s => {
                                        const cls = (classes || []).find(c => c.id === s.classId);
                                        const m = (mentors || []).find(men => (men.assignedClassIds || []).includes(s.classId) || cls?.mentorId === men.id);
                                        return (
                                            <option key={s.id} value={s.id}>
                                                {s.name} (Reg: {s.registerNo || 'N/A'}) - {cls ? `${cls.name}-${cls.division}` : ''} {m ? `[Mentor: ${m.name}]` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>

                        {/* Smart Sibling Detection Alert Banner */}
                        {configTargetType === 'student' && detectedSiblings.length > 1 && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-emerald-800 uppercase flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-emerald-600" /> Sibling Household Detected! ({detectedSiblings.length} Children in Family)
                                    </span>
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                        20% Concession Available
                                    </span>
                                </div>
                                <p className="text-xs text-gray-700">
                                    Family members enrolled: <span className="font-bold">{detectedSiblings.map(s => s.name).join(', ')}</span>
                                </p>
                                <div className="pt-1">
                                    <Button
                                        type="button"
                                        onClick={() => applyConcessionPreset(20)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 gap-1 shadow-sm"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Apply 20% Sibling Concession (₹10,160 Total)
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Total Fee Field & Concession Presets */}
                        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-extrabold text-indigo-900 uppercase">Total Academic Fee Amount (INR):</label>
                                <button
                                    type="button"
                                    onClick={() => handleAutoSplit(totalFeeAmount)}
                                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Auto 3-Equal Split
                                </button>
                            </div>
                            
                            <Input
                                type="number"
                                value={totalFeeAmount}
                                onChange={(e) => handleTotalFeeChange(e.target.value)}
                                className="text-lg font-black text-indigo-900 bg-white"
                                required
                            />

                            {/* Quick Concession Presets */}
                            <div>
                                <p className="text-[11px] font-bold text-gray-600 mb-1.5">Quick Fee & Concession Presets:</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => applyConcessionPreset(0)}
                                        className={`p-2 rounded-lg text-xs font-extrabold border transition-all text-center ${
                                            totalFeeAmount === 12700 ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        Full Fee (₹12,700)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => applyConcessionPreset(20)}
                                        className={`p-2 rounded-lg text-xs font-extrabold border transition-all text-center ${
                                            totalFeeAmount === 10160 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                        }`}
                                    >
                                        20% Sibling (₹10,160)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => applyConcessionPreset(40)}
                                        className={`p-2 rounded-lg text-xs font-extrabold border transition-all text-center ${
                                            totalFeeAmount === 7620 ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                                        }`}
                                    >
                                        40% Sibling (₹7,620)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => applyConcessionPreset(50)}
                                        className={`p-2 rounded-lg text-xs font-extrabold border transition-all text-center ${
                                            totalFeeAmount === 6350 ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                                        }`}
                                    >
                                        50% Half Fee (₹6,350)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 3 Installments Grid */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">3-Installment Schedule Configuration</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { key: 'inst1', label: 'Installment 1' },
                                    { key: 'inst2', label: 'Installment 2' },
                                    { key: 'inst3', label: 'Installment 3' }
                                ].map(inst => (
                                    <Card key={inst.key} className="p-4 border border-gray-200 bg-white space-y-3">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-xs font-black text-gray-900">{inst.label}</span>
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Term</span>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Description Name:</label>
                                            <Input
                                                type="text"
                                                value={installmentConfig[inst.key].name}
                                                onChange={(e) => setInstallmentConfig({
                                                    ...installmentConfig,
                                                    [inst.key]: { ...installmentConfig[inst.key], name: e.target.value }
                                                })}
                                                className="text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Amount (INR):</label>
                                            <Input
                                                type="number"
                                                value={installmentConfig[inst.key].amount}
                                                onChange={(e) => setInstallmentConfig({
                                                    ...installmentConfig,
                                                    [inst.key]: { ...installmentConfig[inst.key], amount: Number(e.target.value) }
                                                })}
                                                className="text-sm font-extrabold text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Due Date:</label>
                                            <Input
                                                type="date"
                                                value={installmentConfig[inst.key].dueDate}
                                                onChange={(e) => setInstallmentConfig({
                                                    ...installmentConfig,
                                                    [inst.key]: { ...installmentConfig[inst.key], dueDate: e.target.value }
                                                })}
                                                className="text-xs font-medium"
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {configMessage && (
                            <p className="text-sm font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center animate-in fade-in">
                                {configMessage}
                            </p>
                        )}

                        <Button type="submit" variant="primary" className="w-full py-3 font-bold gap-2" disabled={savingConfig}>
                            <CheckCircle className="w-4 h-4" />
                            {savingConfig ? 'Saving Structure...' : 'Save Fee Structure'}
                        </Button>
                    </form>
                </Card>
            )}

            {/* TAB 3: DUES & DEFAULTERS TRACKER (WITH WEBSITE NOTIFICATIONS) */}
            {activeTab === 'dues' && (
                <div className="space-y-6">
                    <Card className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search defaulter by student name or reg no..."
                                    value={duesSearchTerm}
                                    onChange={(e) => setDuesSearchTerm(e.target.value)}
                                    className="pl-10 text-sm font-medium bg-gray-50 border-gray-200"
                                />
                            </div>

                            {/* Mentor Selector (FIRST) */}
                            <select
                                value={selectedDuesMentorId}
                                onChange={(e) => setSelectedDuesMentorId(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-2 outline-none text-gray-800"
                            >
                                <option value="all">All Mentors</option>
                                {(mentors || []).map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>

                            {/* Class Selector (SECOND - Cascading based on selected Mentor) */}
                            <select
                                value={selectedDuesClassId}
                                onChange={(e) => setSelectedDuesClassId(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-2 outline-none text-gray-800"
                            >
                                <option value="all">
                                    {selectedDuesMentorId !== 'all' ? `All Allotted Classes (${availableClassesForDues.length})` : 'All Classes & Divisions'}
                                </option>
                                {availableClassesForDues.map(c => (
                                    <option key={c.id} value={c.id}>Class {c.name} - {c.division}</option>
                                ))}
                            </select>

                            {/* Status Filter Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setDuesStatusFilter('pending')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        duesStatusFilter === 'pending' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700'
                                    }`}
                                >
                                    Payment Pending Only
                                </button>
                                <button
                                    onClick={() => setDuesStatusFilter('paid')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        duesStatusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                >
                                    Fully Paid
                                </button>
                                <button
                                    onClick={() => setDuesStatusFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        duesStatusFilter === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    All Students
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* Defaulters Table */}
                    <Card className="overflow-hidden border border-gray-200/80 shadow-xs rounded-2xl bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-gray-900 text-white text-xs uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Student & Reg No</th>
                                        <th className="p-4">Class</th>
                                        <th className="p-4 text-center">Total Fee</th>
                                        <th className="p-4 text-center">Paid So Far</th>
                                        <th className="p-4 text-center">Pending Dues</th>
                                        <th className="p-4 text-right">Send Reminders</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {duesListData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                                                No students matching current filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        duesListData.map((item, idx) => (
                                            <tr key={item.student.id} className={`hover:bg-gray-50 transition-colors ${!item.isFullyPaid ? 'bg-rose-50/10' : ''}`}>
                                                <td className="p-4 text-center font-bold text-gray-400">{idx + 1}</td>
                                                <td className="p-4 font-bold text-gray-900">
                                                    <div>
                                                        <div className="font-extrabold text-gray-900">{item.student.name}</div>
                                                        <div className="text-xs text-gray-400 font-mono">Reg: {item.student.registerNo || 'N/A'}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-gray-700">
                                                    {item.cls ? `${item.cls.name}-${item.cls.division}` : 'N/A'}
                                                </td>
                                                <td className="p-4 text-center font-mono font-bold text-gray-800">
                                                    ₹{item.totalFee.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-center font-mono font-bold text-emerald-600">
                                                    ₹{item.totalPaid.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-center font-mono font-black text-rose-600">
                                                    ₹{item.remainingDues.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {!item.isFullyPaid ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* Website Student Panel In-App Notification */}
                                                            <button
                                                                onClick={() => handleSendWebsiteNotification(item)}
                                                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200 transition-colors"
                                                                title="Send Website In-App Notification directly to Student Panel"
                                                            >
                                                                <Bell className="w-3.5 h-3.5 text-indigo-600" /> Website Notice
                                                            </button>

                                                            {/* WhatsApp Link */}
                                                            <a
                                                                href={getWhatsAppReminderLink(item)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 transition-colors"
                                                            >
                                                                <Send className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-xs inline-flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5" /> Fully Cleared
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 4: FINANCIAL ANALYTICS & AUDIT REPORTS */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    {/* Financial KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-sm">
                            <p className="text-xs font-bold uppercase opacity-80">Total Expected Revenue</p>
                            <h3 className="text-2xl font-black mt-1">₹{overallFinancialKPIs.totalExpectedRevenue.toLocaleString()}</h3>
                            <p className="text-[11px] opacity-80 mt-1">Across all enrolled students</p>
                        </Card>

                        <Card className="p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-sm">
                            <p className="text-xs font-bold uppercase opacity-80">Collected Revenue</p>
                            <h3 className="text-2xl font-black mt-1">₹{overallFinancialKPIs.totalCollectedRevenue.toLocaleString()}</h3>
                            <p className="text-[11px] opacity-80 mt-1">{overallFinancialKPIs.collectionRate}% of total expected</p>
                        </Card>

                        <Card className="p-5 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl shadow-sm">
                            <p className="text-xs font-bold uppercase opacity-80">Pending Outstandings</p>
                            <h3 className="text-2xl font-black mt-1">₹{overallFinancialKPIs.totalPendingRevenue.toLocaleString()}</h3>
                            <p className="text-[11px] opacity-80 mt-1">{100 - overallFinancialKPIs.collectionRate}% uncollected</p>
                        </Card>

                        <Card className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase text-gray-500">Collection Rate</p>
                                <h3 className="text-3xl font-black text-gray-900 mt-1">{overallFinancialKPIs.collectionRate}%</h3>
                            </div>
                            <Button onClick={exportFinancialLedgerPDF} variant="secondary" className="text-xs font-bold gap-1 mt-2">
                                <Download className="w-3.5 h-3.5" /> PDF Ledger Export
                            </Button>
                        </Card>
                    </div>

                    {/* Chart & Audit Ledger Table */}
                    <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-600" /> Revenue Collection Trend Over Time
                            </h3>
                            <span className="text-xs font-bold text-gray-400">Monthly Revenue</span>
                        </div>

                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyTrendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="financialGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35}/>
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} formatter={(val) => [`INR ${val.toLocaleString()}`, 'Collection']} />
                                    <Area type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#financialGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* All Transactions Audit & Deletion Table */}
                    <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-emerald-600" /> Transaction Audit & Management Ledger
                                </h3>
                                <p className="text-xs text-gray-500">View, download receipts, or delete entered fee payment transactions</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                                Total Transactions: {(feePayments || []).length}
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="p-3 text-center">#</th>
                                        <th className="p-3">Receipt ID</th>
                                        <th className="p-3">Student Name</th>
                                        <th className="p-3">Class</th>
                                        <th className="p-3">Installment</th>
                                        <th className="p-3">Payment Mode</th>
                                        <th className="p-3 text-center">Date & Time</th>
                                        <th className="p-3 text-right">Amount (INR)</th>
                                        <th className="p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                                    {(feePayments || []).length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="p-8 text-center text-gray-400 italic">
                                                No fee payment transactions recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        (feePayments || []).map((p, idx) => (
                                            <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="p-3 text-center font-bold text-gray-400">{idx + 1}</td>
                                                <td className="p-3 font-mono font-bold text-indigo-600">#{p.receiptId}</td>
                                                <td className="p-3 font-bold text-gray-900">
                                                    <div>{p.studentName}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">Reg: {p.registerNo || 'N/A'}</div>
                                                </td>
                                                <td className="p-3 font-semibold text-gray-700">{p.className || 'N/A'}</td>
                                                <td className="p-3 font-semibold text-gray-600">{p.installmentName || 'Installment'}</td>
                                                <td className="p-3 font-bold text-emerald-700">{p.paymentMode || 'Cash'}</td>
                                                <td className="p-3 text-center text-gray-500 text-[11px]">
                                                    {format(new Date(p.paymentDate || p.createdAt || Date.now()), 'dd MMM yyyy, p')}
                                                </td>
                                                <td className="p-3 text-right font-black text-emerald-600 font-mono text-sm">
                                                    ₹{Number(p.amountPaid || 0).toLocaleString()}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => generatePrintablePDFReceipt({ ...p, totalFee: 15000, remainingAfterPay: 0 })}
                                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
                                                            title="Download PDF Receipt"
                                                        >
                                                            <Download className="w-3.5 h-3.5" /> PDF
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePayment(p.id, p.receiptId)}
                                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
                                                            title="Delete Transaction"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default OfficeFeeManagement;
