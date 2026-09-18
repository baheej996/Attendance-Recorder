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
    Receipt,
    ChevronLeft,
    ChevronRight,
    Pencil,
    X,
    Upload,
    FileSpreadsheet,
    Lock,
    Unlock
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { generateCSVTemplate, parseCSV } from '../../utils/csvHelpers';

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
        updateFeePayment, 
        updateStudent,
        sendStudentFeeNotification 
    } = useData();

    const { showAlert, showConfirm } = useUI();

    // Main Active Sub-Tab: 'dues' | 'payments' | 'configurator' | 'reports'
    const [activeTab, setActiveTab] = useState('dues');

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
    const [payAcademicYear, setPayAcademicYear] = useState('2026-2027');
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
            academicYear: payAcademicYear || '2026-2027',
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
    // Edit Fee Payment Transaction Log State & Handlers
    const [editingPayment, setEditingPayment] = useState(null);
    const [editPayAmount, setEditPayAmount] = useState('');
    const [editPayMode, setEditPayMode] = useState('Cash');
    const [editInstallmentKey, setEditInstallmentKey] = useState('inst1');
    const [editAcademicYear, setEditAcademicYear] = useState('2026-2027');
    const [editPaymentDate, setEditPaymentDate] = useState('');
    const [editRemarks, setEditRemarks] = useState('');
    const [submittingEditPay, setSubmittingEditPay] = useState(false);

    const handleOpenEditModal = (p) => {
        if (!p) return;
        setEditingPayment(p);
        setEditPayAmount(p.amountPaid || '');
        setEditPayMode(p.paymentMode || 'Cash');
        setEditInstallmentKey(p.installmentKey || 'inst1');
        setEditAcademicYear(p.academicYear || '2026-2027');
        const rawDate = p.paymentDate || p.createdAt || '';
        setEditPaymentDate(rawDate ? rawDate.split('T')[0] : '');
        setEditRemarks(p.remarks || '');
    };

    const handleCloseEditModal = () => {
        setEditingPayment(null);
        setEditPayAmount('');
        setEditPayMode('Cash');
        setEditInstallmentKey('inst1');
        setEditAcademicYear('2026-2027');
        setEditPaymentDate('');
        setEditRemarks('');
    };

    const handleUpdatePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!editingPayment) return;

        const numAmount = Number(editPayAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            showAlert('Invalid Amount', 'Please enter a valid payment amount greater than zero.', 'warning');
            return;
        }

        setSubmittingEditPay(true);
        const instNames = {
            inst1: 'Installment 1 (Admission)',
            inst2: 'Installment 2 (Mid-Term)',
            inst3: 'Installment 3 (Final Term)'
        };

        const updatedData = {
            amountPaid: numAmount,
            paymentMode: editPayMode,
            installmentKey: editInstallmentKey,
            installmentName: instNames[editInstallmentKey] || editInstallmentKey,
            academicYear: editAcademicYear,
            paymentDate: editPaymentDate ? new Date(editPaymentDate).toISOString() : new Date().toISOString(),
            remarks: editRemarks
        };

        try {
            await updateFeePayment(editingPayment.id, updatedData);
            if (lastIssuedReceipt?.id === editingPayment.id) {
                setLastIssuedReceipt(prev => prev ? { ...prev, ...updatedData } : null);
            }
            showAlert('Transaction Updated', `Receipt #${editingPayment.receiptId || editingPayment.id} updated successfully!`, 'success');
            handleCloseEditModal();
        } catch (err) {
            console.error('Failed to update fee transaction:', err);
            showAlert('Error', 'Failed to update transaction log.', 'error');
        } finally {
            setSubmittingEditPay(false);
        }
    };

    const parseCSVDate = (dateStr) => {
        if (!dateStr) return new Date().toISOString();
        const str = String(dateStr).trim();
        if (!str) return new Date().toISOString();
        const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (ddmmyyyyMatch) {
            const day = parseInt(ddmmyyyyMatch[1], 10);
            const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
            const year = parseInt(ddmmyyyyMatch[3], 10);
            const dateObj = new Date(year, month, day);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toISOString();
            }
        }
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
        return new Date().toISOString();
    };

    // Bulk Fee Payments CSV Upload Handler
    const [uploadingCSV, setUploadingCSV] = useState(false);

    const handleBulkCSVUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset file input so re-selecting the same file works
        e.target.value = '';

        setUploadingCSV(true);
        try {
            const rows = await parseCSV(file, 'fee_payments');
            if (!rows || rows.length === 0) {
                showAlert('CSV Empty', 'The selected CSV file contains no data rows.', 'warning');
                return;
            }

            let successCount = 0;
            let skippedCount = 0;
            const skippedLog = [];

            const instNames = {
                inst1: 'Installment 1 (Admission)',
                inst2: 'Installment 2 (Mid-Term)',
                inst3: 'Installment 3 (Final Term)'
            };

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const regNo = (r.registerno || r.regno || r['register no'] || r['reg no'] || '').trim().toLowerCase();
                const sName = (r.studentname || r.name || r['student name'] || '').trim().toLowerCase();

                if (!regNo && !sName) {
                    skippedCount++;
                    continue;
                }

                // Find matching student by Register No or Name
                const matchedStudent = studentPool.find(s => {
                    const sReg = (s.registerNo || '').trim().toLowerCase();
                    const sN = (s.name || '').trim().toLowerCase();
                    if (regNo && sReg === regNo) return true;
                    if (sName && sN === sName) return true;
                    return false;
                });

                if (!matchedStudent) {
                    skippedCount++;
                    skippedLog.push(`Row ${i + 2}: Student not found (${regNo || sName})`);
                    continue;
                }

                const rawMode = (r.paymentmode || r.mode || r['payment mode'] || 'Cash').trim();
                let paymentMode = 'Cash';
                if (/upi|gpay|phonepe/i.test(rawMode)) paymentMode = 'UPI';
                else if (/bank|neft|imps|transfer/i.test(rawMode)) paymentMode = 'Bank Transfer';
                else if (/cheque|check/i.test(rawMode)) paymentMode = 'Cheque';
                else paymentMode = 'Cash';

                const rawYearStr = String(r.academicyear || r['academic year'] || r.year || '').trim();
                let academicYear = '2026-2027';
                if (rawYearStr.includes('2025-2026') || rawYearStr.includes('2025')) academicYear = '2025-2026';
                else if (rawYearStr.includes('2024-2025') || rawYearStr.includes('2024')) academicYear = '2024-2025';
                else if (rawYearStr.includes('2026-2027') || rawYearStr.includes('2026')) academicYear = '2026-2027';
                else if (rawYearStr) academicYear = rawYearStr;

                const rawDate = r.paymentdate || r['payment date'] || r.date || r.createdat || r['created at'];
                const paymentDate = parseCSVDate(rawDate);
                const remarks = r.remarks || 'Bulk CSV Import';

                const studentClassObj = (classes || []).find(c => c.id === matchedStudent.classId);
                const classNameStr = studentClassObj ? `${studentClassObj.name}-${studentClassObj.division}` : (matchedStudent.className || 'N/A');

                // Check 3 separate installment columns (Installment1, Installment2, Installment3 / Installment 1, Installment 2, Installment 3 / Inst1, Inst2, Inst3)
                const valInst1 = Number(r.installment1 || r['installment 1'] || r['installment_1'] || r.inst1 || r['inst 1'] || 0);
                const valInst2 = Number(r.installment2 || r['installment 2'] || r['installment_2'] || r.inst2 || r['inst 2'] || 0);
                const valInst3 = Number(r.installment3 || r['installment 3'] || r['installment_3'] || r.inst3 || r['inst 3'] || 0);

                const hasMultiInst = (!isNaN(valInst1) && valInst1 > 0) || (!isNaN(valInst2) && valInst2 > 0) || (!isNaN(valInst3) && valInst3 > 0);

                if (hasMultiInst) {
                    const instItems = [
                        { key: 'inst1', amount: valInst1 },
                        { key: 'inst2', amount: valInst2 },
                        { key: 'inst3', amount: valInst3 }
                    ];

                    for (const instItem of instItems) {
                        if (!isNaN(instItem.amount) && instItem.amount > 0) {
                            const payload = {
                                studentId: matchedStudent.id,
                                studentName: matchedStudent.name,
                                registerNo: matchedStudent.registerNo || 'N/A',
                                classId: matchedStudent.classId || '',
                                className: classNameStr,
                                installmentKey: instItem.key,
                                installmentName: instNames[instItem.key] || instItem.key,
                                amountPaid: instItem.amount,
                                paymentMode,
                                academicYear,
                                paymentDate,
                                remarks,
                                receivedBy: 'Office Accountant (CSV)'
                            };

                            try {
                                await recordFeePayment(payload);
                                successCount++;
                            } catch (err) {
                                console.error(`Failed to record ${instItem.key} for row ${i + 2}:`, err);
                                skippedCount++;
                                skippedLog.push(`Row ${i + 2}: Error saving payment for ${instItem.key}`);
                            }
                        }
                    }
                } else {
                    // Fallback for single AmountPaid + InstallmentKey format
                    const rawAmount = r.amountpaid || r.amount || r['amount paid'] || r['amount'];
                    const amount = Number(rawAmount);

                    if (isNaN(amount) || amount <= 0) {
                        skippedCount++;
                        skippedLog.push(`Row ${i + 2}: Invalid amount (${rawAmount})`);
                        continue;
                    }

                    const rawInst = (r.installmentkey || r.installment || r['installment key'] || r['installment'] || 'inst1').trim().toLowerCase();
                    let installmentKey = 'inst1';
                    if (rawInst.includes('2') || rawInst.includes('mid')) installmentKey = 'inst2';
                    else if (rawInst.includes('3') || rawInst.includes('final')) installmentKey = 'inst3';

                    const payload = {
                        studentId: matchedStudent.id,
                        studentName: matchedStudent.name,
                        registerNo: matchedStudent.registerNo || 'N/A',
                        classId: matchedStudent.classId || '',
                        className: classNameStr,
                        installmentKey,
                        installmentName: instNames[installmentKey] || installmentKey,
                        amountPaid: amount,
                        paymentMode,
                        academicYear,
                        paymentDate,
                        remarks,
                        receivedBy: 'Office Accountant (CSV)'
                    };

                    try {
                        await recordFeePayment(payload);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to record row ${i + 2}:`, err);
                        skippedCount++;
                        skippedLog.push(`Row ${i + 2}: System error saving payment`);
                    }
                }
            }

            if (successCount > 0) {
                let msg = `Successfully imported and recorded ${successCount} fee payment(s)!`;
                if (skippedCount > 0) {
                    msg += ` (${skippedCount} item(s) skipped: check reg numbers / amounts)`;
                }
                showAlert('CSV Upload Complete', msg, 'success');
            } else {
                showAlert('CSV Upload Failed', `Could not process payments. ${skippedLog.slice(0, 3).join('; ')}`, 'error');
            }
        } catch (err) {
            console.error('Error parsing CSV file:', err);
            showAlert('CSV Error', 'Failed to parse CSV file: ' + err.message, 'error');
        } finally {
            setUploadingCSV(false);
        }
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
                ['Academic Year', (receiptObj.academicYear || '2026-2027') + ((receiptObj.academicYear || '2026-2027') === '2026-2027' ? ' (Current Year)' : ' (Previous Year Arrears)')],
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
    const [duesAcademicYearFilter, setDuesAcademicYearFilter] = useState('all'); // 'all' | '2026-2027' | 'previous'
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

    const getStudentJoiningYear = (s) => {
        if (s.joiningYear) return Number(s.joiningYear);
        const reg = (s.registerNo || '').trim();
        const match = reg.match(/^(\d{2})/);
        if (match) {
            const yr = parseInt(match[1], 10);
            if (yr >= 20 && yr <= 35) return 2000 + yr;
        }
        return 2026;
    };

    const duesListData = useMemo(() => {
        return studentPool.map(s => {
            const cls = (classes || []).find(c => c.id === s.classId);
            const struct = getStudentFeeStructure(s);

            const sPayments = (feePayments || []).filter(p => p.studentId === s.id);

            // Current Academic Year (2026-2027)
            const currentYearPayments = sPayments.filter(p => (p.academicYear || '2026-2027') === '2026-2027');
            const currentPaid = currentYearPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            const currentFee = Number(struct.totalAmount || 12700);
            const currentDues = Math.max(0, currentFee - currentPaid);
            const isCurrentPaid = currentDues <= 0;

            // Enrollment Batch / Joining Year
            const joiningYear = getStudentJoiningYear(s);
            const isNewAdmission = joiningYear >= 2026;

            // Previous Academic Years / Arrears (2025-2026 and older)
            const previousYearPayments = sPayments.filter(p => (p.academicYear || '2026-2027') !== '2026-2027');
            const previousPaid = previousYearPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            
            let previousDues = 0;
            let prevYearFee = 0;

            if (s.previousYearArrears !== undefined && s.previousYearArrears !== null) {
                previousDues = Math.max(0, Number(s.previousYearArrears) - previousPaid);
                prevYearFee = Number(s.previousYearArrears) + previousPaid;
            } else if (!isNewAdmission) {
                // For continuing students from 2025 or earlier who haven't explicitly set 0 arrears
                prevYearFee = Number(s.previousYearFee || 12700);
                previousDues = Math.max(0, prevYearFee - previousPaid);
            } else {
                previousDues = 0;
                prevYearFee = 0;
            }

            const isPreviousPaid = !isNewAdmission && previousDues <= 0;
            const hasPreviousArrears = !isNewAdmission && previousDues > 0;

            const totalPaid = currentPaid + previousPaid;
            const totalFee = currentFee + prevYearFee;
            const remainingDues = currentDues + previousDues;
            const isFullyPaid = remainingDues <= 0;

            return {
                student: s,
                cls,
                joiningYear,
                isNewAdmission,
                totalFee,
                totalPaid,
                currentFee,
                currentPaid,
                currentDues,
                isCurrentPaid,
                prevYearFee,
                previousPaid,
                previousDues,
                isPreviousPaid,
                hasPreviousArrears,
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

            // Filter by Academic Year Dues Scope
            if (duesAcademicYearFilter === '2026-2027' && item.currentDues <= 0 && duesStatusFilter === 'pending') return false;
            if (duesAcademicYearFilter === 'previous' && item.previousDues <= 0 && duesStatusFilter === 'pending') return false;

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
    }, [studentPool, classes, mentors, feeStructures, feePayments, selectedDuesClassId, selectedDuesMentorId, duesStatusFilter, duesAcademicYearFilter, duesSearchTerm]);

    // Pagination State for Dues & Defaulters Tracker (Max 25 items per page)
    const [duesCurrentPage, setDuesCurrentPage] = useState(1);
    const DUES_ITEMS_PER_PAGE = 25;

    // Reset pagination to Page 1 when search or filters change
    useEffect(() => {
        setDuesCurrentPage(1);
    }, [duesSearchTerm, duesStatusFilter, duesAcademicYearFilter, selectedDuesMentorId, selectedDuesClassId]);

    const totalDuesItems = duesListData.length;
    const totalDuesPages = Math.ceil(totalDuesItems / DUES_ITEMS_PER_PAGE) || 1;

    const paginatedDuesListData = useMemo(() => {
        const start = (duesCurrentPage - 1) * DUES_ITEMS_PER_PAGE;
        return duesListData.slice(start, start + DUES_ITEMS_PER_PAGE);
    }, [duesListData, duesCurrentPage]);

    // Send Reminders Actions
    const handleSendWebsiteNotification = (item) => {
        if (!item?.student) return;

        showConfirm(
            'Send Website Notice Popup',
            `Are you sure you want to send a Fee Payment Due Notice popup to ${item.student.name} (Reg: ${item.student.registerNo || 'N/A'})? This will display as an alert popup when they sign into their Student Panel. Dues: INR ${item.remainingDues.toLocaleString()}`,
            async () => {
                const msg = `Dear ${item.student.name}, your fee payment of INR ${item.remainingDues.toLocaleString()} is currently pending. Please arrange payment with the Office.`;
                try {
                    await sendStudentFeeNotification(item.student.id, '⚠️ Fee Payment Due Notice', msg, item.remainingDues);
                    showAlert('Notice Dispatched', `Website Fee Notice Popup sent to ${item.student.name}! It will pop up when they sign into their student account.`, 'success');
                } catch (err) {
                    console.error('Error sending in-app notification:', err);
                    showAlert('Error', 'Failed to send website notice popup.', 'error');
                }
            }
        );
    };

    const getWhatsAppReminderLink = (item) => {
        const phone = item.student.parentPhone || item.student.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(`Assalamu Alaikum. Dear Parent, fee payment for ${item.student.name} (Reg: ${item.student.registerNo || 'N/A'}) is pending. Outstanding dues: INR ${item.remainingDues.toLocaleString()}. Please complete payment at your earliest convenience.`);
        return `https://wa.me/${cleanPhone}?text=${msg}`;
    };

    // Direct Record Payment for a Student from Dues Tracker
    const handleDirectRecordPayment = (student) => {
        if (!student?.id) return;
        
        // 1. Set selected student for payment collection
        setSelectedStudentId(student.id);
        
        // 2. Determine first unpaid installment and calculate remaining due
        const studentPayments = (feePayments || []).filter(p => p.studentId === student.id);
        const struct = getStudentFeeStructure(student);
        const inst1Paid = studentPayments.filter(p => p.installmentKey === 'inst1').reduce((s, p) => s + Number(p.amountPaid || 0), 0);
        const inst2Paid = studentPayments.filter(p => p.installmentKey === 'inst2').reduce((s, p) => s + Number(p.amountPaid || 0), 0);
        const inst3Paid = studentPayments.filter(p => p.installmentKey === 'inst3').reduce((s, p) => s + Number(p.amountPaid || 0), 0);

        const inst1Due = Math.max(0, (struct.installments?.inst1?.amount || 4233) - inst1Paid);
        const inst2Due = Math.max(0, (struct.installments?.inst2?.amount || 4233) - inst2Paid);
        const inst3Due = Math.max(0, (struct.installments?.inst3?.amount || 4234) - inst3Paid);

        if (inst1Due > 0) {
            setSelectedInstallmentKey('inst1');
            setCustomPayAmount(inst1Due);
        } else if (inst2Due > 0) {
            setSelectedInstallmentKey('inst2');
            setCustomPayAmount(inst2Due);
        } else if (inst3Due > 0) {
            setSelectedInstallmentKey('inst3');
            setCustomPayAmount(inst3Due);
        } else {
            setSelectedInstallmentKey('inst1');
            setCustomPayAmount('');
        }

        // 3. Reset filters to ensure student shows in dropdown
        setPayMentorFilter('all');
        setPayClassFilter('all');
        setPaySearchTerm('');

        // 4. Switch active tab to Payment Collection & Receipts
        setActiveTab('payments');

        showAlert(
            'Student Pre-Filled',
            `Selected ${student.name} (Reg: ${student.registerNo || 'N/A'}). Transferred to Payment Collection.`,
            'info'
        );
    };

    // Manage Previous Year Arrears Modal State & Handler
    const [editingArrearsStudent, setEditingArrearsStudent] = useState(null);
    const [inputArrearsAmount, setInputArrearsAmount] = useState('');
    const [inputJoiningYear, setInputJoiningYear] = useState('2026');

    const handleOpenArrearsModal = (student) => {
        setEditingArrearsStudent(student);
        const joining = getStudentJoiningYear(student);
        setInputArrearsAmount(student.previousYearArrears !== undefined ? student.previousYearArrears : (joining < 2026 ? 12700 : 0));
        setInputJoiningYear(String(joining));
    };

    const handleSaveArrearsSubmit = async (e) => {
        e.preventDefault();
        if (!editingArrearsStudent) return;

        const arrearsVal = Number(inputArrearsAmount) || 0;
        const yearVal = Number(inputJoiningYear) || 2026;

        try {
            await updateStudent(editingArrearsStudent.id, {
                previousYearArrears: arrearsVal,
                joiningYear: yearVal
            });
            showAlert('Arrears Updated', `Updated previous year arrears for ${editingArrearsStudent.name} to INR ${arrearsVal.toLocaleString()}`, 'success');
            setEditingArrearsStudent(null);
        } catch (err) {
            console.error('Failed to update arrears:', err);
            showAlert('Error', 'Failed to update student arrears record.', 'error');
        }
    };

    // Toggle Lock Student Panel to Tuition Fee Page Only
    const handleToggleStudentLock = async (student) => {
        if (!student?.id) return;
        const nextState = !student.isFeeLocked;

        try {
            await updateStudent(student.id, { isFeeLocked: nextState });

            if (nextState) {
                const msg = `Dear ${student.name}, your Student Panel features have been restricted to the Tuition Fee page due to pending dues. Please complete your fee payment to restore full access.`;
                await sendStudentFeeNotification(student.id, '🔒 Student Panel Access Restricted', msg, student.remainingDues || 0);
                showAlert('Panel Access Restricted', `${student.name}'s Student Panel is now locked to the Tuition Fee page only!`, 'warning');
            } else {
                showAlert('Panel Access Restored', `${student.name}'s full Student Panel access has been restored.`, 'success');
            }
        } catch (err) {
            console.error('Error toggling student lock:', err);
            showAlert('Error', 'Failed to update student lock state.', 'error');
        }
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
            {/* Top Navigation Banner Header & Horizontal Sub-Tabs */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
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

                    {/* CSV & Excel Bulk Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => generateCSVTemplate('fee_payments')}
                            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-indigo-200/80 shadow-2xs transition-all cursor-pointer"
                            title="Download Model Template with Payment Mode Dropdown"
                        >
                            <Download className="w-4 h-4 text-indigo-600" /> Download Model Template
                        </button>
                        <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95">
                            <Upload className="w-4 h-4" /> {uploadingCSV ? 'Processing File...' : 'Upload Payments (CSV/Excel)'}
                            <input
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                onChange={handleBulkCSVUpload}
                                disabled={uploadingCSV}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Horizontal Navigation Menu Tabs */}
                <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2.5 px-1">
                        <Filter className="w-3.5 h-3.5 text-indigo-600" /> Navigation Menu
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('dues')}
                            className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                activeTab === 'dues'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-extrabold'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5 truncate">
                                <AlertCircle className={`w-4 h-4 shrink-0 ${activeTab === 'dues' ? 'text-white' : 'text-rose-500'}`} />
                                <span className="truncate">Dues & Defaulters Tracker</span>
                            </span>
                            {activeTab === 'dues' && <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 ml-2" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('payments')}
                            className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                activeTab === 'payments'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-extrabold'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5 truncate">
                                <CreditCard className={`w-4 h-4 shrink-0 ${activeTab === 'payments' ? 'text-white' : 'text-indigo-600'}`} />
                                <span className="truncate">Collect Payment & Receipts</span>
                            </span>
                            {activeTab === 'payments' && <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 ml-2" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('configurator')}
                            className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                activeTab === 'configurator'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-extrabold'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5 truncate">
                                <DollarSign className={`w-4 h-4 shrink-0 ${activeTab === 'configurator' ? 'text-white' : 'text-indigo-600'}`} />
                                <span className="truncate">Fee Configurator (3 Installments)</span>
                            </span>
                            {activeTab === 'configurator' && <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 ml-2" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('reports')}
                            className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                activeTab === 'reports'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-extrabold'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5 truncate">
                                <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'reports' ? 'text-white' : 'text-emerald-600'}`} />
                                <span className="truncate">Financial Analytics</span>
                            </span>
                            {activeTab === 'reports' && <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 ml-2" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Tab Content Area */}
            <div className="space-y-6">
                    {/* TAB 1: PAYMENT COLLECTION & DIGITAL PRINTABLE RECEIPTS */}
                    {activeTab === 'payments' && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
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
                                    {/* Financial Overview Card - Matching Reference Theme */}
                                    {(() => {
                                        const selectedStudentClass = (classes || []).find(c => c.id === selectedStudent.classId);
                                        const targetMentor = selectedStudentClass ? (mentors || []).find(m => (m.assignedClassIds || []).includes(selectedStudentClass.id) || selectedStudentClass.mentorId === m.id) : null;
                                        return (
                                            <div className="bg-white border-2 border-amber-200/90 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4">
                                                {/* Header Row */}
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                                                    <div className="flex items-center gap-3.5">
                                                        {/* Orange Avatar Square */}
                                                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                                                            <User className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2.5">
                                                                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">{selectedStudent.name}</h3>
                                                                {studentTotals.isFullyPaid ? (
                                                                    <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                                                        <CheckCircle className="w-3 h-3 text-white" /> FULLY PAID
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-amber-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                                                                        DUES PENDING
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                                Reg: <span className="font-mono font-bold text-gray-800">{selectedStudent.registerNo || 'N/A'}</span>
                                                                {selectedStudentClass && (
                                                                    <>
                                                                        {' • '}Class: <span className="font-extrabold text-purple-700">{selectedStudentClass.name}-{selectedStudentClass.division}</span>
                                                                    </>
                                                                )}
                                                                {targetMentor && (
                                                                    <>
                                                                        {' • '}Mentor: <span className="font-extrabold text-purple-700">{targetMentor.name}</span>
                                                                    </>
                                                                )}
                                                            </p>
                                                            <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                                                                Fee Scheme: Academic Standard • 3 Term Installments
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Right Action Button */}
                                                    <div>
                                                        {studentTotals.isFullyPaid ? (
                                                            <span className="px-4 py-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                                                                <CheckCircle className="w-4 h-4 text-emerald-600" /> Account Settled
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const el = document.getElementById('payment-form-section');
                                                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                                }}
                                                                className="px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                                            >
                                                                <CreditCard className="w-4 h-4" /> Collect Fee Payment
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Middle Stat Boxes Grid - Matching Preview Grid Style */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-2">
                                                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/90 text-center shadow-none">
                                                        <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1 truncate">TOTAL ACADEMIC FEE</p>
                                                        <p className="text-lg sm:text-xl font-extrabold text-gray-900 font-mono">₹{studentTotals.totalFee.toLocaleString()}</p>
                                                    </div>
                                                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/90 text-center shadow-none">
                                                        <p className="text-[10px] sm:text-[11px] text-emerald-700 font-bold uppercase tracking-wider mb-1 truncate">PAID SO FAR</p>
                                                        <p className="text-lg sm:text-xl font-extrabold text-emerald-600 font-mono">₹{studentTotals.totalPaid.toLocaleString()}</p>
                                                    </div>
                                                    <div className={clsx(
                                                        "p-4 rounded-2xl border text-center shadow-none",
                                                        studentTotals.remainingBalance > 0
                                                            ? "bg-rose-50/60 border-rose-100/90"
                                                            : "bg-gray-50/80 border-gray-100/90"
                                                    )}>
                                                        <p className={clsx(
                                                            "text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 truncate",
                                                            studentTotals.remainingBalance > 0 ? "text-rose-600" : "text-gray-400"
                                                        )}>
                                                            REMAINING DUES
                                                        </p>
                                                        <p className={clsx(
                                                            "text-lg sm:text-xl font-extrabold font-mono",
                                                            studentTotals.remainingBalance > 0 ? "text-rose-600" : "text-gray-900"
                                                        )}>
                                                            ₹{studentTotals.remainingBalance.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Bottom Installment Summary - Matching Admin Note Bar Style */}
                                                <div className="mt-1 pt-3 border-t border-gray-100 flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                                            <CreditCard className="w-4 h-4 text-indigo-600 stroke-[2.5]" /> INSTALLMENT BREAKDOWN SUMMARY
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {[
                                                            { key: 'inst1', label: 'Inst 1 (Admission)', paid: studentTotals.inst1Paid, due: activeFeeStruct.installments?.inst1?.amount || 4233 },
                                                            { key: 'inst2', label: 'Inst 2 (Mid-Term)', paid: studentTotals.inst2Paid, due: activeFeeStruct.installments?.inst2?.amount || 4233 },
                                                            { key: 'inst3', label: 'Inst 3 (Final Term)', paid: studentTotals.inst3Paid, due: activeFeeStruct.installments?.inst3?.amount || 4234 }
                                                        ].map((inst) => {
                                                            const isPaid = inst.paid >= inst.due;
                                                            return (
                                                                <div 
                                                                    key={inst.key} 
                                                                    className={clsx(
                                                                        "p-2.5 rounded-xl border text-xs font-semibold flex justify-between items-center",
                                                                        isPaid ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" : "bg-gray-50/70 border-gray-100 text-gray-700"
                                                                    )}
                                                                >
                                                                    <span className="truncate pr-1">{inst.label}</span>
                                                                    <span className={clsx("font-bold text-[11px] shrink-0", isPaid ? "text-emerald-700" : "text-amber-600")}>
                                                                        {isPaid ? `Paid ₹${inst.paid.toLocaleString()}` : `Due ₹${(inst.due - inst.paid).toLocaleString()}`}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

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

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Academic Year:</label>
                                            <select
                                                value={payAcademicYear}
                                                onChange={(e) => setPayAcademicYear(e.target.value)}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl focus:bg-white outline-none"
                                            >
                                                <option value="2026-2027">2026-2027 (Current Academic Year)</option>
                                                <option value="2025-2026">2025-2026 (Previous Year Arrears)</option>
                                                <option value="2024-2025">2024-2025 (Previous Year Arrears)</option>
                                            </select>
                                        </div>
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
                                    <div className="pt-1">
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                            (lastIssuedReceipt.academicYear || '2026-2027') === '2026-2027'
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                : 'bg-amber-100 text-amber-800 border-amber-300'
                                        }`}>
                                            {(lastIssuedReceipt.academicYear || '2026-2027') === '2026-2027' ? '🟢 Current (2026-2027)' : `🟠 Arrears (${lastIssuedReceipt.academicYear})`}
                                        </span>
                                    </div>
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
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-gray-400">Receipt #{p.receiptId} • {p.paymentMode}</span>
                                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                                        (p.academicYear || '2026-2027') === '2026-2027'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {(p.academicYear || '2026-2027') === '2026-2027' ? '2026-2027' : `Arrears ${p.academicYear}`}
                                                    </span>
                                                </div>
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
                                                    onClick={() => handleOpenEditModal(p)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit this transaction log"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
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
                                        onClick={() => applyConcessionPreset(30)}
                                        className={`p-2 rounded-lg text-xs font-extrabold border transition-all text-center ${
                                            totalFeeAmount === 8890 ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                                        }`}
                                    >
                                        30% Sibling (₹8,890)
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

                            {/* 1. Academic Year Filter (FIRST) */}
                            <select
                                value={duesAcademicYearFilter}
                                onChange={(e) => setDuesAcademicYearFilter(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-2 outline-none text-gray-800"
                            >
                                <option value="all">All Academic Years</option>
                                <option value="2026-2027">Current Year (2026-2027)</option>
                                <option value="previous">Previous Arrears (2025-2026 & Older)</option>
                            </select>

                            {/* 2. Mentor Selector (SECOND) */}
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

                            {/* 3. Class Selector (THIRD - Cascading based on selected Mentor) */}
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
                                        <th className="px-3.5 py-3 w-10 text-center">#</th>
                                        <th className="px-3.5 py-3">Student & Reg No</th>
                                        <th className="px-3.5 py-3">Class</th>
                                        <th className="px-3.5 py-3">Yearly Fee Status</th>
                                        <th className="px-3.5 py-3 text-center">Total Fee</th>
                                        <th className="px-3.5 py-3 text-center">Paid So Far</th>
                                        <th className="px-3.5 py-3 text-center">Pending Dues</th>
                                        <th className="px-3.5 py-3 text-right">Actions & Reminders</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {totalDuesItems === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="p-8 text-center text-gray-400 italic">
                                                No students matching current filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedDuesListData.map((item, idx) => (
                                            <tr key={item.student.id} className={`hover:bg-gray-50 transition-colors ${!item.isFullyPaid ? 'bg-rose-50/10' : ''}`}>
                                                <td className="px-3.5 py-3 text-center font-bold text-gray-400">
                                                    {(duesCurrentPage - 1) * DUES_ITEMS_PER_PAGE + idx + 1}
                                                </td>
                                                <td className="px-3.5 py-3 font-bold text-gray-900">
                                                    <div>
                                                        <div className="font-extrabold text-gray-900 text-sm tracking-tight">{item.student.name}</div>
                                                        <div className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                                            Reg: {item.student.registerNo || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3.5 py-3 font-bold text-gray-700">
                                                    {item.cls ? `${item.cls.name}-${item.cls.division}` : 'N/A'}
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        {/* Current Academic Year Status Badge */}
                                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                                                            item.isCurrentPaid
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            {item.isCurrentPaid ? '🟢 2026-2027 Paid' : '🔴 2026-2027 Due'}
                                                        </span>

                                                        {/* Previous Academic Year Status Badge */}
                                                        {item.isNewAdmission ? (
                                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-gray-50 text-gray-500 border-gray-200">
                                                                ⚪ 2025-2026: N/A (New Student)
                                                            </span>
                                                        ) : item.isPreviousPaid ? (
                                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                🟢 2025-2026 Paid
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenArrearsModal(item.student)}
                                                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                                                title="Click to edit/update Previous Year Arrears balance"
                                                            >
                                                                <span>🟠 2025-2026 Arrears: ₹{item.previousDues.toLocaleString()}</span>
                                                                <Pencil className="w-3 h-3 text-amber-600 shrink-0" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3.5 py-3 text-center font-mono font-bold text-gray-800">
                                                    ₹{item.totalFee.toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-3 text-center font-mono font-bold text-emerald-600">
                                                    ₹{item.totalPaid.toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-3 text-center font-mono">
                                                    <div className="font-black text-rose-600 text-sm">
                                                        ₹{item.remainingDues.toLocaleString()}
                                                    </div>
                                                    {item.previousDues > 0 && (
                                                        <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">
                                                            (Incl. Arrears ₹{item.previousDues.toLocaleString()})
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3.5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Record Fee Payment Button (Pre-fills student data & switches tab) */}
                                                        <button
                                                            onClick={() => handleDirectRecordPayment(item.student)}
                                                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                                            title="Record Fee Payment directly for this student"
                                                        >
                                                            <CreditCard className="w-3.5 h-3.5" /> Record Fee Payment
                                                        </button>

                                                        {!item.isFullyPaid && (
                                                            <>
                                                                {/* Lock Student Panel / Restrict Access Button */}
                                                                <button
                                                                    onClick={() => handleToggleStudentLock(item.student)}
                                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                                                        item.student.isFeeLocked
                                                                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs'
                                                                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                                                    }`}
                                                                    title={item.student.isFeeLocked ? "Unlock student panel access" : "Lock student panel features (restricts directly to Tuition Fee page)"}
                                                                >
                                                                    {item.student.isFeeLocked ? (
                                                                        <>
                                                                            <Lock className="w-3.5 h-3.5 text-white" /> Panel Locked
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Lock className="w-3.5 h-3.5 text-amber-600" /> Lock Panel
                                                                        </>
                                                                    )}
                                                                </button>

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
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar (25 Items Per Page) */}
                        {totalDuesItems > 0 && (
                            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-gray-500 font-medium">
                                    Showing <span className="font-bold text-gray-900">{Math.min((duesCurrentPage - 1) * DUES_ITEMS_PER_PAGE + 1, totalDuesItems)}</span> to{' '}
                                    <span className="font-bold text-gray-900">{Math.min(duesCurrentPage * DUES_ITEMS_PER_PAGE, totalDuesItems)}</span> of{' '}
                                    <span className="font-extrabold text-indigo-900">{totalDuesItems}</span> students
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setDuesCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={duesCurrentPage === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalDuesPages }, (_, i) => i + 1)
                                            .filter(page => page === 1 || page === totalDuesPages || Math.abs(page - duesCurrentPage) <= 1)
                                            .map((page, index, array) => {
                                                const prevPage = array[index - 1];
                                                const showEllipsis = prevPage && page - prevPage > 1;

                                                return (
                                                    <React.Fragment key={page}>
                                                        {showEllipsis && <span className="px-1 text-xs text-gray-400">...</span>}
                                                        <button
                                                            onClick={() => setDuesCurrentPage(page)}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                                duesCurrentPage === page
                                                                    ? 'bg-indigo-600 text-white shadow-xs'
                                                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    </React.Fragment>
                                                );
                                            })
                                        }
                                    </div>

                                    <button
                                        onClick={() => setDuesCurrentPage(prev => Math.min(prev + 1, totalDuesPages))}
                                        disabled={duesCurrentPage >= totalDuesPages}
                                        className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
                                        title="Next Page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
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

                        <div className="w-full h-64 min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                        <th className="p-3">Academic Year</th>
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
                                            <td colSpan="10" className="p-8 text-center text-gray-400 italic">
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
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                                        (p.academicYear || '2026-2027') === '2026-2027'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {(p.academicYear || '2026-2027') === '2026-2027' ? '🟢 2026-2027 (Current)' : `🟠 ${p.academicYear} (Arrears)`}
                                                    </span>
                                                </td>
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
                                                            onClick={() => handleOpenEditModal(p)}
                                                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
                                                            title="Edit Transaction"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" /> Edit
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

            {/* Edit Fee Payment Transaction Modal */}
            {editingPayment && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 relative">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Pencil className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900">Edit Fee Transaction Log</h3>
                                    <p className="text-xs text-gray-500 font-mono font-semibold">Receipt #{editingPayment.receiptId || editingPayment.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseEditModal}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePaymentSubmit} className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                <p className="text-xs text-gray-500 font-medium">Student Name & Reg No:</p>
                                <p className="text-sm font-extrabold text-gray-900">{editingPayment.studentName} <span className="text-xs font-mono text-gray-500 font-semibold">(Reg: {editingPayment.registerNo || 'N/A'})</span></p>
                                <p className="text-xs text-indigo-600 font-bold">{editingPayment.className || 'Class N/A'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Amount Paid (INR):</label>
                                    <Input
                                        type="number"
                                        value={editPayAmount}
                                        onChange={(e) => setEditPayAmount(e.target.value)}
                                        placeholder="e.g. 4233"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode:</label>
                                    <select
                                        value={editPayMode}
                                        onChange={(e) => setEditPayMode(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl focus:bg-white outline-none"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI / GPay / PhonePe</option>
                                        <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Academic Year:</label>
                                    <select
                                        value={editAcademicYear}
                                        onChange={(e) => setEditAcademicYear(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl focus:bg-white outline-none"
                                    >
                                        <option value="2026-2027">2026-2027 (Current Year)</option>
                                        <option value="2025-2026">2025-2026 (Previous Year Arrears)</option>
                                        <option value="2024-2025">2024-2025 (Previous Year Arrears)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Installment Term:</label>
                                    <select
                                        value={editInstallmentKey}
                                        onChange={(e) => setEditInstallmentKey(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl focus:bg-white outline-none"
                                    >
                                        <option value="inst1">Installment 1 (Admission)</option>
                                        <option value="inst2">Installment 2 (Mid-Term)</option>
                                        <option value="inst3">Installment 3 (Final Term)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Payment Date:</label>
                                    <Input
                                        type="date"
                                        value={editPaymentDate}
                                        onChange={(e) => setEditPaymentDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Note:</label>
                                <Input
                                    type="text"
                                    value={editRemarks}
                                    onChange={(e) => setEditRemarks(e.target.value)}
                                    placeholder="e.g. Updated receipt entry"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleCloseEditModal}
                                    className="text-xs py-2 px-4 font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="text-xs py-2 px-4 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                                    disabled={submittingEditPay}
                                >
                                    {submittingEditPay ? 'Saving Changes...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Previous Year Arrears Modal */}
            {editingArrearsStudent && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 relative">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                    <Pencil className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900">Manage Previous Year Arrears</h3>
                                    <p className="text-xs text-gray-500 font-semibold">{editingArrearsStudent.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingArrearsStudent(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveArrearsSubmit} className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs">
                                <p className="text-gray-500 font-medium">Student Register Number:</p>
                                <p className="font-extrabold font-mono text-indigo-600">{editingArrearsStudent.registerNo || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Enrollment / Batch Year:</label>
                                <select
                                    value={inputJoiningYear}
                                    onChange={(e) => setInputJoiningYear(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl focus:bg-white outline-none"
                                >
                                    <option value="2026">2026-2027 Batch (New Student)</option>
                                    <option value="2025">2025-2026 Batch (Enrolled 2025)</option>
                                    <option value="2024">2024-2025 Batch (Enrolled 2024)</option>
                                    <option value="2023">2023-2024 Batch (Enrolled 2023)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Previous Academic Year Arrears Balance (INR):</label>
                                <Input
                                    type="number"
                                    value={inputArrearsAmount}
                                    onChange={(e) => setInputArrearsAmount(e.target.value)}
                                    placeholder="e.g. 12700"
                                    required
                                />
                                <p className="text-[11px] text-gray-400 mt-1">Set to 0 if all previous year dues are cleared.</p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingArrearsStudent(null)}
                                    className="text-xs py-2 px-4 font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="text-xs py-2 px-4 font-bold bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    Save Arrears
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    </div>
);
};

export default OfficeFeeManagement;
