import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Trash2, Edit, Users, X, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { BulkUploadButton } from '../../components/ui/BulkUploadButton';
import { Modal } from '../../components/ui/Modal';

// Keeping ClassAllotmentModal as it was part of the file logic
const ClassAllotmentModal = ({ isOpen, onClose, classItem, mentors, updateMentor }) => {
    if (!isOpen || !classItem) return null;

    const handleToggle = (mentor) => {
        const isAssigned = mentor.assignedClassIds.includes(classItem.id);
        const newAssigned = isAssigned
            ? mentor.assignedClassIds.filter(id => id !== classItem.id)
            : [...mentor.assignedClassIds, classItem.id];

        updateMentor(mentor.id, { ...mentor, assignedClassIds: newAssigned });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Allotment"
        >
            <p className="mb-4 text-sm text-gray-600">
                Assign mentors to <span className="font-bold text-indigo-700">{classItem.name}-{classItem.division}</span>
            </p>

            {mentors.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No mentors available.</p>
            ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {mentors.map(mentor => {
                        const isAssigned = mentor.assignedClassIds.includes(classItem.id);
                        return (
                            <div
                                key={mentor.id}
                                className={clsx(
                                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                                    isAssigned ? "bg-indigo-50 border-indigo-200" : "hover:bg-gray-50 border-gray-100"
                                )}
                                onClick={() => handleToggle(mentor)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                        isAssigned ? "bg-indigo-200 text-indigo-700" : "bg-gray-200 text-gray-600")}>
                                        {mentor.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className={clsx("font-medium", isAssigned ? "text-indigo-900" : "text-gray-700")}>{mentor.name}</p>
                                        <p className="text-xs text-gray-500">{mentor.email}</p>
                                    </div>
                                </div>
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    isAssigned ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                                )}>
                                    {isAssigned && <Users className="w-3 h-3 text-white" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="pt-4 flex justify-end">
                <Button onClick={onClose}>Done</Button>
            </div>
        </Modal>
    );
};

const ClassManagement = () => {
    const { classes, addClass, deleteClass, deleteClasses, deleteAllClasses, updateMentor, mentors, students } = useData();
    const [formData, setFormData] = useState({ name: '', division: '' });
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, type: 'single' });
    const [allotmentConfig, setAllotmentConfig] = useState({ isOpen: false, classItem: null });
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClasses = classes.filter(c => {
        const term = searchTerm.toLowerCase();
        const combinedSpace = `${c.name} ${c.division}`.toLowerCase();
        const combinedDash = `${c.name}-${c.division}`.toLowerCase();
        const combinedNoSpace = `${c.name}${c.division}`.toLowerCase();

        return c.name.toLowerCase().includes(term) ||
            c.division.toLowerCase().includes(term) ||
            combinedSpace.includes(term) ||
            combinedDash.includes(term) ||
            combinedNoSpace.includes(term);
    });

    const handleBulkUpload = (data) => {
        let count = 0;
        let errors = 0;
        data.forEach(row => {
            if (row.classname && row.division) {
                // Check dup
                const isDup = classes.some(c =>
                    c.name.toLowerCase() === String(row.classname).toLowerCase() &&
                    c.division.toLowerCase() === String(row.division).toLowerCase()
                );

                if (!isDup) {
                    addClass({
                        name: String(row.classname),
                        division: String(row.division)
                    });
                    count++;
                } else {
                    errors++;
                }
            }
        });
        alert(`Bulk Upload Complete.\nAdded: ${count}\nDuplicates/Skipped: ${errors}`);
    };

    const handleOpenModal = () => {
        setFormData({ name: '', division: '' });
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
        if (!formData.name || !formData.division) {
            setError('Both Class Name and Division are required');
            return;
        }

        // Check for duplicates
        const isDuplicate = classes.some(c =>
            c.name.toLowerCase() === formData.name.toLowerCase() &&
            c.division.toLowerCase() === formData.division.toLowerCase() &&
            c.id !== editingId
        );

        if (isDuplicate) {
            setError('Class already exists');
            return;
        }

        addClass(formData);
        // alert("Class Added Successfully!");

        handleCloseModal();
    };

    const handleEdit = (cls) => {
        setFormData({ name: cls.name, division: cls.division });
        // Although the requirement didn't explicitly ask for Edit in modal, might as well support it since I have the logic
        // But for "Add new class" flow consistency, let's keep it simple.
        // Wait, the previous code had handleEdit which populated the form?
        // Let's implement editing support in modal too.
        setEditingId(cls.id);
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
            deleteClass(deleteConfig.id);
        } else if (deleteConfig.type === 'all') {
            deleteAllClasses();
            setSelectedIds([]);
        } else if (deleteConfig.type === 'selected') {
            deleteClasses(selectedIds);
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
        if (selectedIds.length === classes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(classes.map(c => c.id));
        }
    };

    const openAllotment = (cls) => {
        setAllotmentConfig({ isOpen: true, classItem: cls });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <ConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ isOpen: false, id: null, type: 'single' })}
                onConfirm={handleDelete}
                title={
                    deleteConfig.type === 'all' ? "Delete ALL Classes" :
                        deleteConfig.type === 'selected' ? `Delete ${selectedIds.length} Classes` :
                            "Delete Class"
                }
                message={
                    deleteConfig.type === 'all' ? "Are you sure you want to delete ALL classes? This cannot be undone." :
                        deleteConfig.type === 'selected' ? `Are you sure you want to delete these ${selectedIds.length} classes? This cannot be undone.` :
                            "Are you sure you want to delete this class? This might affect students currently assigned to it."
                }
                confirmText={deleteConfig.type === 'all' ? "Yes, Delete Everything" : "Yes, Delete"}
                cancelText="Cancel"
                isDanger
            />

            <ClassAllotmentModal
                isOpen={allotmentConfig.isOpen}
                onClose={() => setAllotmentConfig({ isOpen: false, classItem: null })}
                classItem={allotmentConfig.classItem}
                mentors={mentors}
                updateMentor={updateMentor}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? "Edit Class" : "Add New Class"}
            >
                <div>
                    <p className="text-sm text-gray-500 mb-6">{editingId ? "Update class details" : "Create a new class section"}</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Class Name"
                            placeholder="e.g. 10"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            error={error}
                        />
                        <Input
                            label="Division"
                            placeholder="e.g. A"
                            value={formData.division}
                            onChange={(e) => setFormData(p => ({ ...p, division: e.target.value }))}
                        />
                        <div className="flex gap-2 pt-2">
                            <Button type="button" onClick={handleCloseModal} className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" />
                                {editingId ? "Update Class" : "Add Class"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 -mx-4 sm:-mx-6 lg:-mx-8 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Class Management</h2>
                    <p className="text-sm text-gray-500">Manage classes and divisions</p>
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
                                    placeholder="Search classes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <BulkUploadButton onUploadSuccess={handleBulkUpload} type="class" />
                                <Button onClick={handleOpenModal} className="flex items-center gap-2 whitespace-nowrap">
                                    <Plus className="w-4 h-4" />
                                    Add Class
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Card>
                <div className="flex items-center justify-between pb-4">
                    <CardHeader title="All Classes" description={`Total: ${classes.length} classes`} className="p-0 border-none mb-0" />
                    {classes.length > 0 && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === classes.length && classes.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-500">Select All</span>
                        </div>
                    )}
                </div>

                {filteredClasses.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">
                            {searchTerm ? "No classes found matching your search." : "No classes added yet. Click \"Add Class\" to get started."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredClasses.map((cls) => {
                            const assignedMentors = mentors.filter(m => m.assignedClassIds.includes(cls.id));
                            const isSelected = selectedIds.includes(cls.id);

                            return (
                                <div
                                    key={cls.id}
                                    className={clsx(
                                        "relative p-4 rounded-lg border flex flex-col justify-between group transition-all h-full",
                                        isSelected ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-100 hover:border-indigo-200"
                                    )}
                                >
                                    <div className="absolute top-4 left-4 z-10">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelection(cls.id)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="flex justify-between items-start mb-3 pl-8">
                                        <div>
                                            <span className="font-bold text-lg text-gray-900">{cls.name}</span>
                                            <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                                                Div {cls.division}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(cls)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(cls.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-3 border-t border-gray-200/50">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Allotted To</p>
                                        {assignedMentors.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {assignedMentors.map(m => (
                                                    <span key={m.id} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-700">
                                                        {m.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No mentor assigned</span>
                                        )}

                                        <button
                                            onClick={() => openAllotment(cls)}
                                            className="w-full mt-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Users className="w-3 h-3" />
                                            Manage Allotment
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

export default ClassManagement;
