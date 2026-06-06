import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserPlus, User, Check, Trash2, Edit, BookOpen, Users, X, Plus, Search, Phone, ExternalLink, ShieldCheck, Calendar, Clock, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { BulkUploadButton } from '../../components/ui/BulkUploadButton';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { FileSpreadsheet, FileText } from 'lucide-react';

const MentorManagement = () => {
    const { mentors, addMentor, updateMentor, deleteMentor, deleteMentors, deleteAllMentors, classes, students, impersonate } = useData();
    const { showAlert } = useUI();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', qualification: '', contactNumber: '', profilePhoto: '', assignedClassIds: [], isExamCoordinator: false });
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, type: 'single' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [timetableModal, setTimetableModal] = useState({ isOpen: false, mentor: null });

    // Filter available classes for assignment
    const availableClassOptions = useMemo(() => {
        return classes
            .filter(cls => {
                const assignedMentor = mentors.find(m => m.assignedClassIds.includes(cls.id));
                // Show if unassigned OR assigned to current mentor (when editing)
                return !assignedMentor || (editingId && assignedMentor.id === editingId);
            })
            .map(c => ({ id: c.id, label: `${c.name} - ${c.division}` }));
    }, [classes, mentors, editingId]);

    const filteredMentors = mentors.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBulkUpload = (data) => {
        let count = 0;
        let errors = 0;
        data.forEach(row => {
            if (row.name && row.email && row.password) {
                const isDup = mentors.some(m => m.email === row.email);
                if (!isDup) {
                    // Parse Assigned Classes
                    let assignedIds = [];
                    if (row.assignedclasses) {
                        const classRequests = row.assignedclasses.split(';').map(c => c.trim());
                        classRequests.forEach(req => {
                            const [clsName, clsDiv] = req.split('-').map(s => s.trim());
                            if (clsName && clsDiv) {
                                const found = classes.find(c =>
                                    c.name.toLowerCase() === clsName.toLowerCase() &&
                                    c.division.toLowerCase() === clsDiv.toLowerCase()
                                );
                                if (found) assignedIds.push(found.id);
                            }
                        });
                    }

                    addMentor({
                        name: row.name,
                        email: row.email,
                        password: row.password,
                        assignedClassIds: assignedIds
                    });
                    count++;
                } else {
                    errors++;
                }
            }
        });
        showAlert('Bulk Upload Complete', `Added: ${count}\nDuplicates/Skipped: ${errors}`, 'info');
    };

    const handleOpenModal = () => {
        setFormData({ name: '', email: '', password: '', qualification: '', contactNumber: '', profilePhoto: '', assignedClassIds: [], isExamCoordinator: false });
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
        if (!formData.name || !formData.email || !formData.password) {
            setError('All fields (Name, Email, Password) are required');
            return;
        }

        const isDuplicate = mentors.some(m => m.email === formData.email && m.id !== editingId);
        if (isDuplicate) {
            setError('Email already registered');
            return;
        }

        if (editingId) {
            updateMentor(editingId, formData);
            // alert("Mentor Updated Successfully!");
        } else {
            addMentor(formData);
            // alert("Mentor Added Successfully!");
        }

        handleCloseModal();
    };

    const handleEdit = (mentor) => {
        setFormData({
            name: mentor.name,
            email: mentor.email,
            password: mentor.password,
            qualification: mentor.qualification || '',
            contactNumber: mentor.contactNumber || '',
            profilePhoto: mentor.profilePhoto || '',
            assignedClassIds: mentor.assignedClassIds || [],
            isExamCoordinator: mentor.isExamCoordinator || false
        });
        setEditingId(mentor.id);
        setError('');
        setIsModalOpen(true);
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
            deleteMentor(deleteConfig.id);
        } else if (deleteConfig.type === 'all') {
            deleteAllMentors();
            setSelectedIds([]);
        } else if (deleteConfig.type === 'selected') {
            deleteMentors(selectedIds);
            setSelectedIds([]);
        }
        setDeleteConfig({ isOpen: false, id: null, type: 'single' });
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === mentors.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(mentors.map(m => m.id));
        }
    };

    const getExportData = () => {
        return mentors.map(m => {
            const assignedClasses = (m.assignedClassIds || [])
                .map(cid => classes.find(c => c.id === cid))
                .filter(Boolean);
            
            const validClassIds = assignedClasses.map(c => c.id);
            const totalStudents = students.filter(s =>
                validClassIds.includes(s.classId) && s.status === 'Active'
            ).length;
            
            return {
                Name: m.name || '',
                Email: m.email || '',
                'Contact Number': m.contactNumber || '',
                Qualification: m.qualification || '',
                'Assigned Classes': assignedClasses.map(c => `${c.name}-${c.division}`).join(', ') || 'None',
                'Total Students': totalStudents
            };
        });
    };

    const handleExportExcel = () => {
        exportToExcel(getExportData(), 'Mentors_Export');
    };

    const handleExportPDF = () => {
        const data = getExportData();
        const headers = ['Name', 'Email', 'Contact Number', 'Qualification', 'Assigned Classes', 'Total Students'];
        const body = data.map(d => [d.Name, d.Email, d['Contact Number'], d.Qualification, d['Assigned Classes'], d['Total Students']]);
        exportToPDF(body, headers, 'Mentors_Export', 'Mentors Directory');
    };

    const handleDirectSignIn = (mentor) => {
        impersonate({ role: 'mentor', ...mentor });
        showAlert(`Signed in as ${mentor.name}`, "Redirecting to mentor portal...", 'success');
        setTimeout(() => navigate('/mentor'), 1000);
    };

    const toggleClass = (classId) => {
        setFormData(prev => {
            const current = prev.assignedClassIds || [];
            if (current.includes(classId)) {
                return { ...prev, assignedClassIds: current.filter(id => id !== classId) };
            } else {
                return { ...prev, assignedClassIds: [...current, classId] };
            }
        });
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePhoto: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
            <ConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ isOpen: false, id: null, type: 'single' })}
                onConfirm={handleDelete}
                title={
                    deleteConfig.type === 'all' ? "Delete ALL Mentors" :
                        deleteConfig.type === 'selected' ? `Delete ${selectedIds.length} Mentors` :
                            "Delete Mentor"
                }
                message={
                    deleteConfig.type === 'all' ? "Are you sure you want to delete ALL mentors? This cannot be undone." :
                        deleteConfig.type === 'selected' ? `Are you sure you want to delete these ${selectedIds.length} mentors? This cannot be undone.` :
                            "Are you sure you want to delete this mentor? Their account and access will be permanently removed."
                }
                confirmText={deleteConfig.type === 'all' ? "Yes, Delete Everything" : "Yes, Delete"}
                cancelText="Cancel"
                isDanger
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? "Edit Mentor" : "Add New Mentor"}
            >
                <div>
                    <p className="text-sm text-gray-500 mb-6">{editingId ? "Update mentor details" : "Create a mentor account"}</p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Full Name"
                            placeholder="e.g. John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        />
                        <Input
                            label="Email (Username)"
                            type="email"
                            placeholder="e.g. john@school.com"
                            value={formData.email}
                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        />
                        <Input
                            label="Password"
                            type="text"
                            placeholder="Set login password"
                            value={formData.password}
                            onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                        />
                        <Input
                            label="Contact Number"
                            placeholder="e.g. +91 9876543210"
                            value={formData.contactNumber}
                            onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
                        />

                        <Input
                            label="Qualification"
                            placeholder="e.g. M.Sc Mathematics, B.Ed"
                            value={formData.qualification}
                            onChange={(e) => setFormData(p => ({ ...p, qualification: e.target.value }))}
                        />

                        <div className="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                            <input 
                                type="checkbox" 
                                id="isExamCoordinator"
                                checked={formData.isExamCoordinator}
                                onChange={(e) => setFormData(p => ({ ...p, isExamCoordinator: e.target.checked }))}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <div>
                                <label htmlFor="isExamCoordinator" className="font-bold text-gray-900 text-sm block">Exam Coordinator</label>
                                <p className="text-xs text-gray-500">Grant this mentor access to track question paper progress across all classes.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                            <div className="flex items-center gap-4">
                                {formData.profilePhoto && (
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 shrink-0">
                                        <img src={formData.profilePhoto} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Recommended: Square image, max 1MB.</p>
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <SearchableSelect
                            label="Assign Classes"
                            placeholder="Type to search and add classes..."
                            isMulti={true}
                            options={availableClassOptions}
                            value={formData.assignedClassIds}
                            onChange={(vals) => setFormData(p => ({ ...p, assignedClassIds: vals }))}
                            error={availableClassOptions.length === 0 && !editingId ? "No classes available to assign." : ""}
                        />

                        <div className="flex gap-2 pt-2">
                            <Button type="button" onClick={handleCloseModal} className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                                <UserPlus className="w-4 h-4" />
                                {editingId ? "Update Mentor" : "Add Mentor"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/95 backdrop-blur-sm py-4 sticky top-[64px] z-20 border-b border-gray-200 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Mentor Management</h2>
                    <p className="text-sm text-gray-500">Manage mentors and class assignments</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2 w-full md:w-auto">
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap px-2">{selectedIds.length} Selected</span>
                            <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])} className="text-gray-500 hover:text-gray-700">Cancel</Button>
                            <Button variant="danger" size="sm" onClick={confirmDeleteSelected} className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete ({selectedIds.length})</span>
                                <span className="sm:hidden">Del</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search mentors..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleExportExcel} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200" title="Export Excel">
                                    <FileSpreadsheet className="w-4 h-4" />
                                </Button>
                                <Button onClick={handleExportPDF} className="flex-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200" title="Export PDF">
                                    <FileText className="w-4 h-4" />
                                </Button>
                                <div className="flex-1">
                                    <BulkUploadButton onUploadSuccess={handleBulkUpload} type="mentor" />
                                </div>
                                <Button onClick={handleOpenModal} className="flex items-center justify-center gap-2 whitespace-nowrap flex-1">
                                    <Plus className="w-4 h-4" />
                                    Add Mentor
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Card>
                <div className="flex items-center justify-between pb-4">
                    <CardHeader title="Mentors List" description={`Total: ${mentors.length} mentors`} className="p-0 border-none mb-0" />
                    {mentors.length > 0 && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === mentors.length && mentors.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-500">Select All</span>
                        </div>
                    )}
                </div>

                {filteredMentors.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">
                            {searchTerm ? "No mentors found matching your search." : "No mentors added yet. Click \"Add Mentor\" to get started."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredMentors.map((mentor) => {
                            // Filter classes to only those that actually exist in the current classes array
                            const assignedClasses = (mentor.assignedClassIds || [])
                                .map(cid => classes.find(c => c.id === cid))
                                .filter(Boolean);
                            
                            const validClassIds = assignedClasses.map(c => c.id);

                            const totalStudents = students.filter(s =>
                                validClassIds.includes(s.classId) && s.status === 'Active'
                            ).length;
                            
                            const isSelected = selectedIds.includes(mentor.id);

                            return (
                                <div
                                    key={mentor.id}
                                    className={clsx(
                                        "relative p-4 rounded-lg border flex flex-col sm:flex-row items-start justify-between group transition-colors gap-4",
                                        isSelected ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-100 hover:border-indigo-200"
                                    )}
                                >
                                    <div className="absolute top-4 left-4 z-10">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelection(mentor.id)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="flex items-start gap-4 pl-8 w-full">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-gray-200">
                                            {mentor.profilePhoto ? (
                                                <img src={mentor.profilePhoto} alt={mentor.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-lg text-gray-900 truncate flex items-center gap-2">
                                                {mentor.name}
                                                {mentor.isExamCoordinator && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                                                        <Star className="w-3 h-3" /> Exam Coordinator
                                                    </span>
                                                )}
                                            </h4>
                                            {mentor.qualification && (
                                                <p className="text-xs text-indigo-600 font-medium mb-0.5">{mentor.qualification}</p>
                                            )}
                                            <p className="text-sm text-gray-500 truncate">{mentor.email}</p>

                                            <div className="flex flex-wrap gap-2 mt-2 mb-2 text-xs font-medium text-gray-500">
                                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm whitespace-nowrap">
                                                    <BookOpen className="w-3 h-3 text-indigo-500" />
                                                    {assignedClasses.length} Classes
                                                </span>
                                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm whitespace-nowrap">
                                                    <Users className="w-3 h-3 text-green-500" />
                                                    {totalStudents} Students
                                                </span>
                                            </div>

                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {assignedClasses.length > 0 ? (
                                                    assignedClasses.map(cls => (
                                                        <span key={cls.id} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700">
                                                            {cls.name}-{cls.division}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No classes assigned</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                        <button
                                            onClick={() => handleDirectSignIn(mentor)}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-sm active:scale-95 font-bold text-[10px] whitespace-nowrap"
                                        >
                                            <ShieldCheck className="w-3 h-3" />
                                            Log In
                                        </button>

                                        <button
                                            onClick={() => setTimetableModal({ isOpen: true, mentor })}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all shadow-sm active:scale-95 font-bold text-[10px] whitespace-nowrap"
                                        >
                                            <Calendar className="w-3 h-3" />
                                            Timetable
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEdit(mentor)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(mentor.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors "
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Timetable Modal */}
            <Modal
                isOpen={timetableModal.isOpen}
                onClose={() => setTimetableModal({ isOpen: false, mentor: null })}
                title={`Full Timetable Matrix: ${timetableModal.mentor?.name}`}
                className="!max-w-6xl"
            >
                <div className="space-y-4">
                    {(() => {
                        const assignedClasses = (timetableModal.mentor?.assignedClassIds || [])
                            .map(cid => classes.find(c => c.id === cid))
                            .filter(Boolean);

                        if (assignedClasses.length === 0) {
                            return <p className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">No classes assigned to this mentor.</p>;
                        }

                        // Define Days
                        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                        
                        // Extract unique time slots
                        const rawSlots = [...new Set(assignedClasses.map(c => 
                            c.startTime && c.endTime ? `${c.startTime} - ${c.endTime}` : null
                        ))].filter(Boolean);

                        // Sort slots by start time
                        const sortedSlots = rawSlots.sort((a, b) => {
                            const startA = a.split(' - ')[0];
                            const startB = b.split(' - ')[0];
                            return startA.localeCompare(startB);
                        });

                        const formatTime = (timeRange) => {
                            return timeRange.split(' - ').map(t => {
                                let [h, m] = t.split(':');
                                let hr = parseInt(h);
                                let am = hr >= 12 ? 'PM' : 'AM';
                                return `${hr % 12 || 12}:${m} ${am}`;
                            }).join(' - ');
                        };

                        return (
                            <div className="border border-gray-100 rounded-2xl shadow-sm overflow-hidden bg-white">
                                <table className="w-full border-collapse bg-white text-sm">
                                    <thead>
                                        <tr className="bg-indigo-600 text-white">
                                            <th className="p-4 text-left border-r border-indigo-500/30 w-32 bg-indigo-700">Day / Time</th>
                                            {sortedSlots.map(slot => (
                                                <th key={slot} className="p-4 text-center border-r border-indigo-500/30 min-w-[140px]">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Clock className="w-4 h-4 opacity-70" />
                                                        <span className="font-bold tracking-tight leading-tight">{formatTime(slot)}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {DAYS.map((day, dIdx) => (
                                            <tr key={day} className={clsx("group transition-colors", dIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                                                <td className="p-4 font-bold text-gray-900 border-r border-gray-100 bg-inherit whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className={clsx("w-1.5 h-5 rounded-full", dIdx % 2 === 0 ? "bg-indigo-500" : "bg-purple-500")}></div>
                                                        {day}
                                                    </div>
                                                </td>
                                                {sortedSlots.map(slot => {
                                                    const classAtTime = assignedClasses.find(c => 
                                                        (c.days || []).includes(day) && 
                                                        (`${c.startTime} - ${c.endTime}` === slot)
                                                    );

                                                    return (
                                                        <td key={slot} className="p-2 border-r border-gray-100 align-middle">
                                                            {classAtTime ? (
                                                                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] cursor-default">
                                                                    <div className="flex flex-col items-center text-center gap-1">
                                                                        <div className="p-1.5 bg-white text-indigo-600 rounded-lg shadow-sm">
                                                                            <BookOpen className="w-4 h-4" />
                                                                        </div>
                                                                        <span className="font-black text-indigo-900 leading-none whitespace-nowrap">Class {classAtTime.name}</span>
                                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black uppercase tracking-widest mt-1">
                                                                            Div {classAtTime.division}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center py-4 opacity-10">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}
                    <div className="pt-4 flex justify-end">
                        <Button onClick={() => setTimetableModal({ isOpen: false, mentor: null })} className="px-10 h-11 rounded-xl shadow-lg shadow-gray-200">Close View</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MentorManagement;
