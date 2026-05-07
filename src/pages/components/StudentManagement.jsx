import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { UserPlus, Search, ArrowRightLeft, Users, Trash2, Edit, X, ChevronLeft, ChevronRight, AlertTriangle, Settings, Plus, ChevronDown, Eye } from 'lucide-react';

import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { BulkUploadButton } from '../../components/ui/BulkUploadButton';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { clsx } from 'clsx';
import { Modal } from '../../components/ui/Modal';
import StudentPersonalDetailsModal from './StudentPersonalDetailsModal';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { FileSpreadsheet, FileText } from 'lucide-react';

const StudentManagement = () => {
    const { students, addStudent, deleteStudent, deleteStudents, classes, mentors, updateStudent, deleteAllStudents, institutionSettings, studentStatuses, updateStudentStatuses } = useData();
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({
        name: '',
        registerNo: '',
        uid: '',
        gender: 'Male',
        classId: '',
        status: 'Active'
    });
    const [filterStandard, setFilterStandard] = useState('');
    const [filterDivision, setFilterDivision] = useState('');

    const uniqueStandards = [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
    const uniqueDivisions = [...new Set(classes.map(c => c.division))].sort();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
    const [error, setError] = useState('');
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, type: 'single' });
    const [warningConfig, setWarningConfig] = useState({ isOpen: false, message: '' }); // New state for warnings
    const [selectedIds, setSelectedIds] = useState([]);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [newStatusName, setNewStatusName] = useState('');
    const [isAttentionExpanded, setIsAttentionExpanded] = useState(true);

    // Format classes for SearchableSelect
    const classOptions = useMemo(() => 
        classes.map(c => ({ id: c.id, label: `${c.name} - ${c.division}` })),
    [classes]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const handleBulkUpload = (data) => {
        if (data.length === 0) return;

        // Check if required headers exist in the first row
        const firstRow = data[0];
        const requiredHeaders = ['name', 'registerno', 'classname', 'division'];
        const missingHeaders = requiredHeaders.filter(h => !(h in firstRow));

        if (missingHeaders.length > 0) {
            const foundHeaders = Object.keys(firstRow).join(', ');
            showAlert(
                'Invalid CSV Format', 
                `Required columns missing: ${missingHeaders.join(', ')}.\n\nFound columns: ${foundHeaders || 'None'}.\n\nPlease ensure you are using the correct CSV template.`, 
                'error'
            );
            return;
        }

        let count = 0;
        let errors = 0;
        let errorDetails = [];

        data.forEach((row, index) => {
            const rowNum = index + 1;
            // Normalize inputs
            const rowClass = row.classname ? String(row.classname).trim() : '';
            const rowDiv = row.division ? String(row.division).trim() : '';
            const rowReg = row.registerno ? String(row.registerno).trim() : '';
            const rowName = row.name ? String(row.name).trim() : '';

            // Find class ID (Case insensitive for Division)
            const targetClass = classes.find(c =>
                c.name == rowClass && c.division.toLowerCase() == rowDiv.toLowerCase()
            );

            if (!rowName || !rowReg) {
                errors++;
                errorDetails.push(`Row ${rowNum}: ${!rowName ? 'Name' : ''}${(!rowName && !rowReg) ? ' & ' : ''}${!rowReg ? 'Register No' : ''} is empty`);
                return;
            }

            if (!targetClass) {
                errors++;
                errorDetails.push(`Row ${rowNum} (${rowName}): Class '${rowClass}-${rowDiv}' not found`);
                return;
            }

            const isRegDup = students.some(s => s.registerNo.toLowerCase() === rowReg.toLowerCase());
            const rowUid = row.uid ? String(row.uid).trim() : '';
            const isUidDup = rowUid ? students.some(s => (s.uid || '').toLowerCase() === rowUid.toLowerCase()) : false;

            // Check Class Limit
            const currentClassCount = students.filter(s => s.classId === targetClass.id).length;
            const limit = institutionSettings?.maxStudentsPerClass;
            const isFull = limit && currentClassCount >= limit;

            if (isFull) {
                errors++;
                errorDetails.push(`Row ${rowNum} (${rowName}): Class '${rowClass}-${rowDiv}' is full (Max: ${limit})`);
                return;
            }

            if (!isRegDup && !isUidDup) {
                addStudent({
                    name: rowName,
                    registerNo: rowReg,
                    uid: rowUid,
                    gender: row.gender || 'Male',
                    status: row.status || 'Active',
                    classId: targetClass.id
                });
                count++;
            } else {
                errors++;
                if (isRegDup) errorDetails.push(`Row ${rowNum} (${rowName}): Duplicate Register No '${rowReg}'`);
                if (isUidDup) errorDetails.push(`Row ${rowNum} (${rowName}): Duplicate UID '${rowUid}'`);
            }
        });

        let msg = `Bulk Upload Complete.\nSuccessfully Added: ${count}\nSkipped: ${errors}`;
        if (errors > 0) {
            msg += "\n\nError Highlights:\n" + errorDetails.slice(0, 10).join("\n");
            if (errorDetails.length > 10) msg += `\n...and ${errorDetails.length - 10} more.`;
            showAlert('Bulk Upload Warning', msg, 'warning');
        } else {
            showAlert('Bulk Upload Success', msg, 'success');
        }
    };

    const handleOpenModal = () => {
        setFormData({
            name: '',
            registerNo: '',
            uid: '',
            gender: 'Male',
            classId: '',
            status: 'Active'
        });
        setEditingId(null);
        setError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.classId || !formData.registerNo) {
            setError('Please fill required fields (Name, Reg No, Class)');
            return;
        }

        // Check Class Limit
        // If editing and NOT changing class, skip check (or check if already over? no, allow update)
        // If editing and changing class, check new class.
        // If adding, check class.

        let shouldCheckLimit = true;
        if (editingId) {
            const originalStudent = students.find(s => s.id === editingId);
            if (originalStudent && originalStudent.classId === formData.classId) {
                shouldCheckLimit = false;
            }
        }

        if (shouldCheckLimit) {
            const limit = institutionSettings?.maxStudentsPerClass;
            if (limit) {
                const currentCount = students.filter(s => s.classId === formData.classId).length;
                if (currentCount >= limit) {
                    setWarningConfig({
                        isOpen: true,
                        message: `Cannot add student. The class limit of ${limit} students has been reached for this class.`
                    });
                    return;
                }
            }
        }

        // Check duplication (exclude self if editing)
        const isRegDuplicate = students.some(s => s.registerNo === formData.registerNo && s.id !== editingId);
        if (isRegDuplicate) {
            setError('Register Number already exists');
            return;
        }

        if (formData.uid) {
            const isUidDuplicate = students.some(s => (s.uid || '').toLowerCase() === formData.uid.toLowerCase() && s.id !== editingId);
            if (isUidDuplicate) {
                setError('UID already exists for another student');
                return;
            }
        }

        if (editingId) {
            updateStudent(editingId, formData);
            // alert("Student Updated Successfully!");
        } else {
            addStudent(formData);
            // alert("Student Added Successfully!");
        }

        handleCloseModal();
    };

    const handleEdit = (student) => {
        setFormData({
            name: student.name,
            registerNo: student.registerNo,
            uid: student.uid || '',
            gender: student.gender || 'Male',
            classId: student.classId || '',
            status: student.status || 'Active'
        });
        setEditingId(student.id);
        setError('');
        setIsModalOpen(true);
    };

    const [transferConfig, setTransferConfig] = useState({ isOpen: false, student: null, newClassId: '' });

    const handleTransfer = (studentId, newClassId) => {
        if (!newClassId) return;

        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const limit = institutionSettings?.maxStudentsPerClass;
        if (limit) {
            const currentCount = students.filter(s => s.classId === newClassId).length;
            if (currentCount >= limit) {
                setWarningConfig({
                    isOpen: true,
                    message: `Cannot transfer student. The destination class limit of ${limit} students has been reached.`
                });
                return;
            }
        }

        setTransferConfig({
            isOpen: true,
            student: student,
            newClassId: newClassId
        });
    };

    const confirmTransfer = () => {
        if (!transferConfig.student || !transferConfig.newClassId) return;
        updateStudent(transferConfig.student.id, { classId: transferConfig.newClassId });
        setTransferConfig({ isOpen: false, student: null, newClassId: '' });
        showAlert('Success', 'Student transferred successfully', 'success');
    };

    const confirmDelete = (id) => {
        setDeleteConfig({ isOpen: true, id, type: 'single' });
    };

    const confirmDeleteAll = () => {
        setDeleteConfig({ isOpen: true, id: null, type: 'all' });
    };

    const confirmDeleteSelected = () => {
        setDeleteConfig({ isOpen: true, id: null, type: 'selected' });
    };

    const handleAddStatus = () => {
        if (!newStatusName.trim()) return;
        if (studentStatuses.includes(newStatusName.trim())) {
            showAlert('Error', 'Status already exists', 'error');
            return;
        }
        updateStudentStatuses([...studentStatuses, newStatusName.trim()]);
        setNewStatusName('');
    };

    const handleDeleteStatus = (statusToDelete) => {
        if (statusToDelete === 'Active') {
            showAlert('Error', 'Cannot delete Active status', 'error');
            return;
        }
        updateStudentStatuses(studentStatuses.filter(s => s !== statusToDelete));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return "bg-green-100 text-green-700";
            case 'Suspended': return "bg-orange-100 text-orange-700";
            case 'Dismissed': return "bg-red-100 text-red-700";
            case 'Viva pending': return "bg-blue-100 text-blue-700";
            case 'Exam pending': return "bg-purple-100 text-purple-700";
            case 'Payment Pending': return "bg-amber-100 text-amber-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const handleDelete = () => {
        if (deleteConfig.type === 'single' && deleteConfig.id) {
            deleteStudent(deleteConfig.id);
        } else if (deleteConfig.type === 'all') {
            deleteAllStudents();
            setSelectedIds([]);
        } else if (deleteConfig.type === 'selected') {
            deleteStudents(selectedIds);
            setSelectedIds([]);
        }
        setDeleteConfig({ isOpen: false, id: null, type: 'single' });
    };

    const { attentionStudents, regularStudents } = useMemo(() => {
        const matchesFilters = (student) => {
            const studentClass = classes.find(c => c.id === student.classId);
            const matchesStandard = filterStandard ? studentClass?.name === filterStandard : true;
            const matchesDivision = filterDivision ? studentClass?.division === filterDivision : true;
            const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.registerNo.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStandard && matchesDivision && matchesSearch;
        };

        const attention = [];
        const regular = [];

        students.forEach(student => {
            if (!matchesFilters(student)) return;
            
            const isUnallotted = !student.classId || !classes.some(c => c.id === student.classId);
            if (isUnallotted) {
                attention.push(student);
            } else {
                regular.push(student);
            }
        });

        return { attentionStudents: attention, regularStudents: regular };
    }, [students, classes, filterStandard, filterDivision, searchTerm]);

    const getMentorNameForStudent = (student) => {
        if (!student.classId || !mentors) return 'Unassigned';
        const mentor = mentors.find(m => m.assignedClassIds?.includes(student.classId));
        return mentor ? mentor.name : 'Unassigned';
    };

    // Detect duplicate registration numbers
    const duplicateStudents = React.useMemo(() => {
        const regCount = {};
        students.forEach(s => {
            const regNo = (s.registerNo || '').trim().toLowerCase();
            if (!regNo) return;
            regCount[regNo] = (regCount[regNo] || 0) + 1;
        });

        // Get reg numbers that appear more than once
        const duplicates = Object.keys(regCount).filter(reg => regCount[reg] > 1);

        if (duplicates.length === 0) return [];

        // Return all students that have these duplicate reg numbers
        return students.filter(s => {
            const regNo = (s.registerNo || '').trim().toLowerCase();
            return duplicates.includes(regNo);
        }).sort((a, b) => a.registerNo.localeCompare(b.registerNo));
    }, [students]);

    // Pagination Logic
    const totalPages = Math.ceil(regularStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = regularStudents.slice(startIndex, startIndex + itemsPerPage);

    // Reset page when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStandard, filterDivision, itemsPerPage]);

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        // Select only visible items (better UX for bulk actions across pages is complex, sticking to page-level for now or all)
        // Actually, user expects "Select All" to select visible.
        if (selectedIds.length === paginatedStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedStudents.map(s => s.id));
        }
    };

    const getExportData = () => {
        return students.map(s => {
            const studentClass = classes.find(c => c.id === s.classId);
            return {
                Name: s.name || '',
                'Register No': s.registerNo || '',
                UID: s.uid || '',
                Gender: s.gender || '',
                Class: studentClass ? `${studentClass.name} - ${studentClass.division}` : 'Unassigned',
                Mentor: getMentorNameForStudent(s),
                Status: s.status || '',
                Email: s.email || '',
                Phone: s.phone || '',
                DOB: s.dob || '',
                'Blood Group': s.bloodGroup || '',
                Address: s.address || '',
                'House Name': s.houseName || '',
                'Post Office': s.postOffice || '',
                'PIN Code': s.pinCode || '',
                'Father Name': s.fatherName || '',
                'Father Occupation': s.fatherOccupation || '',
                'Mother Name': s.motherName || '',
                'Parent Phone': s.parentPhone || '',
                'Identification Mark': s.identificationMark || '',
                'Device Used': s.deviceUsed || '',
                'Internet': s.internetAvailability || ''
            };
        });
    };

    const handleExportExcel = () => {
        exportToExcel(getExportData(), 'Students_Export');
    };

    const handleExportPDF = () => {
        const data = getExportData();
        const headers = ['Name', 'Reg No', 'Class', 'Gender', 'Phone', 'DOB', 'Father Name', 'House', 'Device'];
        const body = data.map(d => [d.Name, d['Register No'], d.Class, d.Gender, d.Phone, d.DOB, d['Father Name'], d['House Name'], d['Device Used']]);
        exportToPDF(body, headers, 'Students_Export', 'Students Directory');
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
            <StudentPersonalDetailsModal
                isOpen={!!selectedStudentForDetails}
                onClose={() => setSelectedStudentForDetails(null)}
                student={selectedStudentForDetails}
                classes={classes}
                mentors={mentors}
            />

            <ConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ isOpen: false, id: null, type: 'single' })}
                onConfirm={handleDelete}
                title={
                    deleteConfig.type === 'all' ? "Delete ALL Students" :
                        deleteConfig.type === 'selected' ? `Delete ${selectedIds.length} Students` :
                            "Delete Student"
                }
                message={
                    deleteConfig.type === 'all' ? "Are you sure you want to delete ALL students? This cannot be undone." :
                        deleteConfig.type === 'selected' ? `Are you sure you want to delete these ${selectedIds.length} students? This cannot be undone.` :
                            "Are you sure you want to delete this student record? This action cannot be undone."
                }
                confirmText={deleteConfig.type === 'all' ? "Yes, Delete Everything" : "Yes, Delete"}
                cancelText="Cancel"
                isDanger
            />

            <ConfirmationModal
                isOpen={warningConfig.isOpen}
                onClose={() => setWarningConfig({ isOpen: false, message: '' })}
                onConfirm={() => setWarningConfig({ isOpen: false, message: '' })}
                title="Class Limit Reached"
                message={warningConfig.message}
                confirmText="OK"
                isDanger={false}
                cancelText={null}
            />

            <ConfirmationModal
                isOpen={transferConfig.isOpen}
                onClose={() => setTransferConfig({ isOpen: false, student: null, newClassId: '' })}
                onConfirm={confirmTransfer}
                title="Confirm Transfer"
                message={(() => {
                    const targetClass = classes.find(c => c.id === transferConfig.newClassId);
                    return `Are you sure you want to transfer ${transferConfig.student?.name} to Class ${targetClass?.name}-${targetClass?.division}?`;
                })()}
                confirmText="Yes, Transfer"
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? "Edit Student" : "Register New Student"}
            >
                <div>
                    <p className="text-sm text-gray-500 mb-6">{editingId ? "Update student details" : "Add a new student to a class"}</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Full Name"
                            placeholder="e.g. Alice Smith"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            error={error}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Register No"
                                placeholder="e.g. A001"
                                value={formData.registerNo}
                                onChange={(e) => setFormData(p => ({ ...p, registerNo: e.target.value }))}
                            />
                            <Input
                                label="UID"
                                placeholder="Optional"
                                value={formData.uid}
                                onChange={(e) => setFormData(p => ({ ...p, uid: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Gender"
                                value={formData.gender}
                                onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </Select>
                            <Select
                                label="Status"
                                value={formData.status}
                                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                            >
                                {studentStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </Select>
                        </div>

                        <SearchableSelect
                            label="Assign Class"
                            placeholder="Search and select class..."
                            options={classOptions}
                            value={formData.classId}
                            onChange={(val) => setFormData(p => ({ ...p, classId: val }))}
                            error={!formData.classId && error ? "Class is required" : ""}
                        />

                        <div className="flex gap-2 pt-2">
                            <Button type="button" onClick={handleCloseModal} className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                                <UserPlus className="w-4 h-4" />
                                {editingId ? "Update Student" : "Register Student"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Status Management Modal */}
            <Modal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                title="Manage Student Statuses"
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Status</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Status name..."
                                value={newStatusName}
                                onChange={(e) => setNewStatusName(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddStatus} className="bg-indigo-600">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Existing Statuses</label>
                        <div className="space-y-2">
                            {studentStatuses.map(status => (
                                <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                                    <span className={clsx("text-sm font-medium", getStatusColor(status).split(' ')[1])}>{status}</span>
                                    {status !== 'Active' && (
                                        <button 
                                            onClick={() => handleDeleteStatus(status)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            <div className="sticky top-[64px] z-30 bg-gray-50/95 backdrop-blur-sm py-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Button
                        onClick={() => setIsStatusModalOpen(true)}
                        className="bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Statuses</span>
                    </Button>
                    <Button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-2" title="Export to Excel">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden sm:inline">Excel</span>
                    </Button>
                    <Button onClick={handleExportPDF} className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-2" title="Export to PDF">
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">PDF</span>
                    </Button>
                    <Button
                        onClick={handleOpenModal}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Student</span>
                        <span className="sm:hidden">Add</span>
                    </Button>
                    {selectedIds.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setSelectedIds([])}
                                className="bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                <span className="hidden sm:inline">Cancel</span>
                            </Button>
                            <Button
                                onClick={confirmDeleteSelected}
                                className="bg-white text-red-600 border border-red-200 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete ({selectedIds.length})</span>
                                <span className="sm:hidden">Del ({selectedIds.length})</span>
                            </Button>
                        </div>
                    )}
                    {students.length > 0 && (
                        <Button
                            onClick={confirmDeleteAll}
                            className="bg-white text-red-600 border border-red-200 hover:bg-red-50 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete All</span>
                            <span className="sm:hidden">Del All</span>
                        </Button>
                    )}
                    <div className="ml-auto md:ml-0">
                        <BulkUploadButton type="student" onUploadSuccess={handleBulkUpload} />
                    </div>
                </div>
            </div>

            {duplicateStudents.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <div className="p-4 border-b border-red-100 flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <div>
                            <h3 className="text-red-800 font-bold">Manual Review Requested: Duplicate Registration Numbers</h3>
                            <p className="text-red-600 text-sm">The following students share identical registration numbers. Please edit them to resolve the conflicts.</p>
                        </div>
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto">
                        <div className="space-y-3">
                            {duplicateStudents.map(student => {
                                const studentClass = classes?.find(c => c.id === student.classId);
                                return (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-white border border-red-100 rounded-lg shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                            <div className="min-w-[120px]">
                                                <span className="text-xs text-gray-500 block">Reg No</span>
                                                <span className="font-bold text-red-600">{student.registerNo}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-900 block">{student.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {studentClass ? `Class: ${studentClass.name}-${studentClass.division}` : 'No Class'} • UID: {student.uid || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleEdit(student)}
                                            size="sm"
                                            className="bg-red-100 text-red-700 hover:bg-red-200 border-none shrink-0"

                                        >
                                            <Edit className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Card>
            )}

            {attentionStudents.length > 0 && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                    <div 
                        className="flex items-center justify-between mb-4 bg-red-50/50 p-4 rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 transition-colors"
                        onClick={() => setIsAttentionExpanded(!isAttentionExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">Action Required</h3>
                                <p className="text-sm text-red-700/70 font-medium">{attentionStudents.length} unallotted students (No class assigned)</p>
                            </div>
                        </div>
                        <div className={clsx("p-2 rounded-lg transition-all duration-300", isAttentionExpanded ? "bg-red-200 text-red-800" : "bg-white text-red-600 shadow-sm")}>
                            {isAttentionExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                    </div>
                    
                    {isAttentionExpanded && (
                        <div className="space-y-3 mb-8 animate-in fade-in zoom-in duration-300">
                            {attentionStudents.map((student) => (
                                <div key={student.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{student.name}</h4>
                                            <p className="text-xs text-gray-500">Reg: {student.registerNo} • {student.gender}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="w-48">
                                            <SearchableSelect
                                                placeholder="Assign to class..."
                                                options={classOptions}
                                                value=""
                                                onChange={(val) => handleTransfer(student.id, val)}
                                                compact={true}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEdit(student)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => confirmDelete(student.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Card className="flex flex-col h-[calc(100vh-200px)] md:h-[800px] p-3 md:p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6 p-1">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Student Directory</h3>
                        <p className="text-gray-500 text-sm">Total: {regularStudents.length + attentionStudents.length} / {students.length}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-64 w-full h-11">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                            <Input
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-white h-11"
                                containerClassName="w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto h-11">
                            <Select
                                className="bg-white h-11 min-w-[140px]"
                                containerClassName="w-full sm:w-auto"
                                value={filterStandard}
                                onChange={(e) => setFilterStandard(e.target.value)}
                            >
                                <option value="">All Standards</option>
                                {uniqueStandards.map(std => (
                                    <option key={std} value={std}>Class {std}</option>
                                ))}
                            </Select>
                            <Select
                                className="bg-white h-11 min-w-[140px]"
                                containerClassName="w-full sm:w-auto"
                                value={filterDivision}
                                onChange={(e) => setFilterDivision(e.target.value)}
                            >
                                <option value="">All Divisions</option>
                                {uniqueDivisions.map(div => (
                                    <option key={div} value={div}>Division {div}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg relative">
                    {/* Desktop View */}
                    <table className="w-full text-left text-sm text-gray-600 hidden md:table">
                        <thead className="bg-gray-50 text-gray-900 font-semibold sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 w-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === paginatedStudents.length && paginatedStudents.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Reg No</th>
                                <th className="px-4 py-3">UID</th>
                                <th className="px-4 py-3">Class</th>
                                <th className="px-4 py-3">Mentor</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedStudents.map(student => {
                                const studentClass = classes?.find(c => c.id === student.classId);
                                const isSelected = selectedIds.includes(student.id);

                                return (
                                    <tr key={student.id} className={clsx("hover:bg-gray-50 transition-colors", isSelected && "bg-indigo-50")}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelection(student.id)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                                        <td className="px-4 py-3">{student.registerNo}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{student.uid || 'N/A'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs leading-none font-medium text-gray-600">
                                                {studentClass ? `${studentClass.name}-${studentClass.division}` : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 italic">
                                                {getMentorNameForStudent(student)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
                                                getStatusColor(student.status)
                                            )}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-28 flex-shrink-0">
                                                    <SearchableSelect
                                                        placeholder="Transfer..."
                                                        options={classOptions}
                                                        value=""
                                                        onChange={(val) => handleTransfer(student.id, val)}
                                                        compact={true}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedStudentForDetails(student)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="View Personal Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(student)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Edit Student"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(student.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Student"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedStudents.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-4 py-12 text-center text-gray-400 font-medium italic">
                                        {searchTerm || filterStandard || filterDivision ? "No students found matching your filters." : "No students in the directory."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile View */}
                    <div className="md:hidden flex flex-col divide-y divide-gray-100">
                        {paginatedStudents.map(student => {
                            const studentClass = classes?.find(c => c.id === student.classId);
                            const isSelected = selectedIds.includes(student.id);

                            return (
                                <div key={student.id} className={clsx("p-4 flex flex-col gap-3", isSelected && "bg-indigo-50")}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelection(student.id)}
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <div>
                                                <h4 className="font-medium text-gray-900">{student.name}</h4>
                                                <p className="text-xs text-gray-500">Reg: {student.registerNo} • UID: {student.uid || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                                            getStatusColor(student.status)
                                        )}>
                                            {student.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm pl-8">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] sm:text-xs text-gray-600">
                                                {studentClass ? `Class: ${studentClass.name}-${studentClass.division}` : 'No Class'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] sm:text-xs font-bold border border-indigo-100">
                                                {getMentorNameForStudent(student)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1 w-28">
                                                <SearchableSelect
                                                    placeholder="Transfer"
                                                    options={classOptions}
                                                    value=""
                                                    onChange={(val) => handleTransfer(student.id, val)}
                                                />
                                            </div>
                                            <button
                                                onClick={() => setSelectedStudentForDetails(student)}
                                                className="text-gray-400 hover:text-indigo-600 p-1"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="text-indigo-600 p-1"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(student.id)}
                                                className="text-red-600 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {paginatedStudents.length === 0 && (
                            <div className="p-8 text-center text-gray-400 italic font-medium">
                                No students found in the directory.
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, regularStudents.length)}</span> of <span className="font-medium">{regularStudents.length}</span> students
                    </p>
                    <div className="flex items-center gap-4">
                        <select
                            className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 py-1"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        >
                            <option value="10">10 per page</option>
                            <option value="25">25 per page</option>
                            <option value="50">50 per page</option>
                            <option value="100">100 per page</option>
                        </select>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="flex items-center gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </Button>
                            <span className="flex items-center px-4 rounded-md bg-gray-50 text-sm font-medium text-gray-700">
                                Page {currentPage} of {totalPages || 1}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="flex items-center gap-1"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default StudentManagement;
