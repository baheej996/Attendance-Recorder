import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserPlus, User, Check, Trash2, Edit, BookOpen, Users, X, Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';

import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { BulkUploadButton } from '../../components/ui/BulkUploadButton';
import { Modal } from '../../components/ui/Modal';

const MentorManagement = () => {
    const { mentors, addMentor, updateMentor, deleteMentor, deleteMentors, deleteAllMentors, classes, students } = useData();
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', qualification: '', profilePhoto: '', assignedClassIds: [] });
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, type: 'single' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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
        setFormData({ name: '', email: '', password: '', qualification: '', profilePhoto: '', assignedClassIds: [] });
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
            profilePhoto: mentor.profilePhoto || '',
            assignedClassIds: mentor.assignedClassIds || []
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
        <div className="p-8 max-w-6xl mx-auto space-y-8">
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
                            label="Qualification"
                            placeholder="e.g. M.Sc Mathematics, B.Ed"
                            value={formData.qualification}
                            onChange={(e) => setFormData(p => ({ ...p, qualification: e.target.value }))}
                        />

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Classes</label>
                            {classes.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No classes available. Add classes first.</p>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto border rounded-xl p-2 bg-gray-50">
                                    {classes.filter(cls => {
                                        const assignedMentor = mentors.find(m => m.assignedClassIds.includes(cls.id));
                                        // Show if unassigned OR assigned to current mentor (when editing)
                                        return !assignedMentor || (editingId && assignedMentor.id === editingId);
                                    }).map(cls => {
                                        const isSelected = formData.assignedClassIds.includes(cls.id);
                                        return (
                                            <div key={cls.id} className="flex items-center justify-between p-2 rounded-lg border bg-white shadow-sm">
                                                <span className="text-sm font-medium text-gray-700">{cls.name}-{cls.division}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleClass(cls.id)}
                                                    className={clsx(
                                                        "px-3 py-1 text-xs rounded-full border transition-colors",
                                                        isSelected
                                                            ? "bg-indigo-600 text-white border-indigo-600"
                                                            : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                                                    )}
                                                >
                                                    {isSelected ? 'Selected' : 'Select'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {classes.filter(cls => {
                                        const assignedMentor = mentors.find(m => m.assignedClassIds.includes(cls.id));
                                        return !assignedMentor || (editingId && assignedMentor.id === editingId);
                                    }).length === 0 && (
                                            <p className="text-sm text-gray-500 italic text-center py-2">All classes are currently assigned.</p>
                                        )}
                                </div>
                            )}
                        </div>

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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 -mx-4 sm:-mx-6 lg:-mx-8 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Mentor Management</h2>
                    <p className="text-sm text-gray-500">Manage mentors and class assignments</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2 w-full md:w-auto">
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap px-2">{selectedIds.length} Selected</span>
                            <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])} className="text-gray-500 hover:text-gray-700">Cancel</Button>
                            <Button variant="danger" size="sm" onClick={confirmDeleteSelected} className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedIds.length})
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-3 w-full md:w-auto">
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
                                <BulkUploadButton onUploadSuccess={handleBulkUpload} type="mentor" />
                                <Button onClick={handleOpenModal} className="flex items-center gap-2 whitespace-nowrap">
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
                            const totalStudents = students.filter(s =>
                                mentor.assignedClassIds.includes(s.classId) && s.status === 'Active'
                            ).length;
                            const isSelected = selectedIds.includes(mentor.id);

                            return (
                                <div
                                    key={mentor.id}
                                    className={clsx(
                                        "relative p-4 rounded-lg border flex items-start justify-between group transition-colors",
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

                                    <div className="flex items-start gap-4 pl-8">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-gray-200">
                                            {mentor.profilePhoto ? (
                                                <img src={mentor.profilePhoto} alt={mentor.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-900">{mentor.name}</h4>
                                            {mentor.qualification && (
                                                <p className="text-xs text-indigo-600 font-medium mb-0.5">{mentor.qualification}</p>
                                            )}
                                            <p className="text-sm text-gray-500">{mentor.email}</p>

                                            <div className="flex gap-4 mt-2 mb-2 text-xs font-medium text-gray-500">
                                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                                                    <BookOpen className="w-3 h-3 text-indigo-500" />
                                                    {mentor.assignedClassIds.length} Classes
                                                </span>
                                                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                                                    <Users className="w-3 h-3 text-green-500" />
                                                    {totalStudents} Students
                                                </span>
                                            </div>

                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {mentor.assignedClassIds.length > 0 ? (
                                                    mentor.assignedClassIds.map(cid => {
                                                        const cls = classes.find(c => c.id === cid);
                                                        return cls ? (
                                                            <span key={cid} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700">
                                                                {cls.name}-{cls.division}
                                                            </span>
                                                        ) : null;
                                                    })
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No classes assigned</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(mentor)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Mentor"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(mentor.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Mentor"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default MentorManagement;
