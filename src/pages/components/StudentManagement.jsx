import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { UserPlus, Search, ArrowRightLeft, Users, Trash2, Edit, X, ChevronLeft, ChevronRight } from 'lucide-react';

import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { BulkUploadButton } from '../../components/ui/BulkUploadButton';
import { clsx } from 'clsx';
import { Modal } from '../../components/ui/Modal';

const StudentManagement = () => {
    const { students, addStudent, deleteStudent, deleteStudents, classes, updateStudent, deleteAllStudents, institutionSettings } = useData();
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({
        name: '',
        registerNo: '',
        uid: '',
        gender: 'Male',
        classId: '',
        status: 'Active'
    });
    const [filterClassId, setFilterClassId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, type: 'single' });
    const [warningConfig, setWarningConfig] = useState({ isOpen: false, message: '' }); // New state for warnings
    const [selectedIds, setSelectedIds] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const handleBulkUpload = (data) => {
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
                errorDetails.push(`Row ${rowNum}: Missing Name or Register No`);
                return;
            }

            if (!targetClass) {
                errors++;
                errorDetails.push(`Row ${rowNum} (${rowName}): Class '${rowClass}-${rowDiv}' not found`);
                return;
            }

            const isDup = students.some(s => s.registerNo.toLowerCase() === rowReg.toLowerCase());

            // Check Class Limit
            const currentClassCount = students.filter(s => s.classId === targetClass.id).length;
            // We need to account for students added in this very bulk batch too... strictly speaking.
            // But complex to track state in loop. Let's just check versus initial + added in this loop?
            // Simplified: check versus current DB state. If user uploads 100 students, it might exceed.
            // Better: skip if already full.
            const limit = institutionSettings?.maxStudentsPerClass;
            const isFull = limit && currentClassCount >= limit;

            if (isFull) {
                errors++;
                errorDetails.push(`Row ${rowNum} (${rowName}): Class '${rowClass}-${rowDiv}' is full (Max: ${limit})`);
                return;
            }

            if (!isDup) {
                addStudent({
                    name: rowName,
                    registerNo: rowReg,
                    uid: row.uid || '',
                    gender: row.gender || 'Male',
                    status: row.status || 'Active',
                    classId: targetClass.id
                });
                count++;
            } else {
                errors++;
                errorDetails.push(`Row ${rowNum} (${rowName}): Duplicate Register No '${rowReg}'`);
            }
        });

        let msg = `Bulk Upload Complete.\nSuccessfully Added: ${count}\nSkipped: ${errors}`;
        if (errors > 0) {
            msg += "\n\nErrors:\n" + errorDetails.slice(0, 10).join("\n");
            if (errorDetails.length > 10) msg += `\n...and ${errorDetails.length - 10} more.`;
        }
        if (errors > 0) {
            msg += "\n\nErrors:\n" + errorDetails.slice(0, 10).join("\n");
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
        const isDuplicate = students.some(s => s.registerNo === formData.registerNo && s.id !== editingId);
        if (isDuplicate) {
            setError('Register Number already exists');
            return;
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

    const handleTransfer = (studentId, newClassId) => {
        if (!newClassId) return;

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

        updateStudent(studentId, { classId: newClassId });
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

    const filteredStudents = students.filter(student => {
        const matchesClass = filterClassId ? student.classId === filterClassId : true;
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.registerNo.includes(searchTerm);
        return matchesClass && matchesSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    // Reset page when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterClassId, itemsPerPage]);

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

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
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
                                <option value="Active">Active</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Dismissed">Dismissed</option>
                            </Select>
                        </div>

                        <Select
                            label="Assign Class"
                            value={formData.classId}
                            onChange={(e) => setFormData(p => ({ ...p, classId: e.target.value }))}
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                            ))}
                        </Select>

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

            <div className="sticky top-0 z-10 bg-gray-50 pt-2 pb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
                <div className="flex gap-2">
                    <Button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Student
                    </Button>
                    {selectedIds.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setSelectedIds([])}
                                className="bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDeleteSelected}
                                className="bg-white text-red-600 border border-red-200 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedIds.length})
                            </Button>
                        </div>
                    )}
                    {students.length > 0 && (
                        <Button
                            onClick={confirmDeleteAll}
                            className="bg-white text-red-600 border border-red-200 hover:bg-red-50 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete All
                        </Button>
                    )}
                    <BulkUploadButton type="student" onUploadSuccess={handleBulkUpload} />
                </div>
            </div>

            <Card className="flex flex-col h-[800px]">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Student Directory</h3>
                        <p className="text-gray-500 text-sm">Total: {filteredStudents.length} / {students.length}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>
                        <select
                            className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={filterClassId}
                            onChange={(e) => setFilterClassId(e.target.value)}
                        >
                            <option value="">All Classes</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg relative">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-semibold sticky top-0">
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
                                <th className="px-4 py-3">Class</th>
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
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                                {studentClass ? `${studentClass.name}-${studentClass.division}` : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full text-xs font-semibold",
                                                student.status === 'Active' && "bg-green-100 text-green-700",
                                                student.status === 'Suspended' && "bg-orange-100 text-orange-700",
                                                student.status === 'Dismissed' && "bg-red-100 text-red-700",
                                            )}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 group/transfer">
                                                    <ArrowRightLeft className="w-4 h-4 text-gray-400 group-hover/transfer:text-indigo-600" />
                                                    <select
                                                        className="text-xs border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 bg-transparent outline-none w-24"
                                                        onChange={(e) => handleTransfer(student.id, e.target.value)}
                                                        value=""
                                                    >
                                                        <option value="" disabled>Transfer...</option>
                                                        {classes.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}-{c.division}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <button
                                                    onClick={() => handleEdit(student)}
                                                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="Edit Student"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(student.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Delete Student"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                                        No students found matching criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of <span className="font-medium">{filteredStudents.length}</span> students
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
