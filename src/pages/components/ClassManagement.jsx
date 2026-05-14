import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Plus, Trash2, Edit, Users, X, Search, Settings, Eye, Clock, Calendar, AlertTriangle, School, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { BulkUploadButton } from '../../components/ui/BulkUploadButton';
import { Modal } from '../../components/ui/Modal';
import { ClassStudentsModal } from '../../components/admin/ClassStudentsModal';
import { DeleteClassSafeguardModal } from '../../components/admin/DeleteClassSafeguardModal';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { FileSpreadsheet, FileText } from 'lucide-react';

// Keeping ClassAllotmentModal as it was part of the file logic
const ClassAllotmentModal = ({ isOpen, onClose, classItem, mentors, updateMentor, showAlert }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [reallotConfig, setReallotConfig] = useState({ isOpen: false, mentor: null });
    
    if (!isOpen || !classItem) return null;

    const filteredMentors = mentors.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const executeAllotment = (mentor) => {
        const isAssigned = (mentor.assignedClassIds || []).includes(classItem.id);
        const newAssigned = isAssigned
            ? (mentor.assignedClassIds || []).filter(id => id !== classItem.id)
            : [...(mentor.assignedClassIds || []), classItem.id];

        updateMentor(mentor.id, { ...mentor, assignedClassIds: newAssigned });
        setReallotConfig({ isOpen: false, mentor: null });
    };

    const handleToggle = (mentor) => {
        const isAssigned = (mentor.assignedClassIds || []).includes(classItem.id);
        
        if (!isAssigned) {
            const currentMentor = mentors.find(m => (m.assignedClassIds || []).includes(classItem.id));
            if (currentMentor && currentMentor.id !== mentor.id) {
                // Show confirmation instead of restricted alert
                setReallotConfig({
                    isOpen: true,
                    mentor: mentor,
                    currentMentorName: currentMentor.name
                });
                return;
            }
        }

        executeAllotment(mentor);
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={() => {
                    setSearchTerm('');
                    onClose();
                }}
                title="Manage Allotment"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Assign mentors to <span className="font-bold text-indigo-700">{classItem.name}-{classItem.division}</span>
                    </p>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search mentors by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 text-sm"
                            containerClassName="w-full"
                        />
                    </div>

                    {mentors.length === 0 ? (
                        <p className="text-center text-gray-400 py-4 font-medium italic">No mentors available.</p>
                    ) : filteredMentors.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 font-medium italic">No mentors found matching your search.</p>
                    ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {filteredMentors.map(mentor => {
                                const isAssigned = (mentor.assignedClassIds || []).includes(classItem.id);
                                return (
                                    <div
                                        key={mentor.id}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200",
                                            isAssigned 
                                                ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm" 
                                                : "hover:bg-gray-50 border-gray-100 hover:border-gray-200"
                                        )}
                                        onClick={() => handleToggle(mentor)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transform transition-transform group-hover:scale-105",
                                                isAssigned ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500")}>
                                                {mentor.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={clsx("font-bold text-sm", isAssigned ? "text-indigo-900" : "text-gray-700")}>{mentor.name}</p>
                                                <p className="text-xs text-gray-500 font-medium">{mentor.email}</p>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200",
                                            isAssigned ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-gray-300"
                                        )}>
                                            {isAssigned && <Users className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="pt-2 flex justify-end">
                        <Button onClick={() => {
                            setSearchTerm('');
                            onClose();
                        }} className="px-6">Done</Button>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={reallotConfig.isOpen}
                onClose={() => setReallotConfig({ isOpen: false, mentor: null })}
                onConfirm={() => executeAllotment(reallotConfig.mentor)}
                title="Confirm Re-allotment"
                message={`This class is already allotted to ${reallotConfig.currentMentorName}. Do you want to re-allot it to ${reallotConfig.mentor?.name}? This will remove the class from the current mentor.`}
                confirmText="Yes, Re-allot"
                isDanger
            />
        </>
    );
};

const ClassSettingsModal = ({ isOpen, onClose, settings, updateSettings }) => {
    const [limit, setLimit] = useState(settings.maxStudentsPerClass || '');

    const handleSave = () => {
        updateSettings({ maxStudentsPerClass: limit ? Number(limit) : null });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Class Settings">
            <div className="space-y-4">
                <p className="text-sm text-gray-500">Configure global settings for classes.</p>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Maximum Students per Class</label>
                    <Input
                        type="number"
                        placeholder="Unlimited"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        description="Leave empty for no limit. A warning will be shown if this limit is exceeded."
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Settings</Button>
                </div>
            </div>
        </Modal>
    );
};

const addOneHour = (timeStr) => {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    h = (h + 1) % 24;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
};

const ClassCard = ({ cls, isAttention, selectedIds, toggleSelection, openStudentsModal, handleEdit, confirmDelete, openAllotment, students, mentors }) => {
    const assignedMentors = mentors.filter(m => (m.assignedClassIds || []).includes(cls.id));
    const studentCount = students.filter(s => s.classId === cls.id && s.status === 'Active').length;
    const isSelected = selectedIds.includes(cls.id);

    return (
        <div
            className={clsx(
                "relative p-4 rounded-xl border flex flex-col justify-between group transition-all h-full",
                isSelected ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200" : 
                isAttention ? "bg-amber-50/50 border-amber-200 hover:border-amber-400" : "bg-white border-gray-100 hover:border-indigo-200 shadow-sm"
            )}
        >
            <div className="absolute top-4 left-4 z-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(cls.id)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
            </div>

            <div className="flex justify-between items-start mb-3 pl-8">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg text-gray-900">{cls.name}</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider">
                            Division {cls.division}
                        </span>
                        {isAttention && (
                            <div className="flex gap-1">
                                {studentCount === 0 && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold border border-red-200">NO STUDENTS</span>}
                                {assignedMentors.length === 0 && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold border border-amber-200">NO MENTOR</span>}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-3 text-gray-500">
                        <Users className={clsx("w-3.5 h-3.5", studentCount === 0 ? "text-red-500" : "text-indigo-400")} />
                        <span className={clsx("text-xs font-bold", studentCount === 0 ? "text-red-600" : "text-gray-700")}>
                            {studentCount} Students
                        </span>
                    </div>

                    {(cls.startTime || cls.endTime) && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-gray-500">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-medium">
                                {cls.startTime ? (() => { let [h,m]=cls.startTime.split(':'); let hr=parseInt(h); let am=hr>=12?'PM':'AM'; return `${hr%12||12}:${m} ${am}`; })() : '?'} - {cls.endTime ? (() => { let [h,m]=cls.endTime.split(':'); let hr=parseInt(h); let am=hr>=12?'PM':'AM'; return `${hr%12||12}:${m} ${am}`; })() : '?'}
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-1">
                    <button onClick={() => openStudentsModal(cls)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Students">
                        <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(cls)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => confirmDelete(cls.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-2 pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 tracking-wider">Allotted To</p>
                {assignedMentors.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {assignedMentors.map(m => (
                            <span key={m.id} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-700 font-medium shadow-sm">
                                {m.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-xs text-amber-600 font-bold italic flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> No mentor assigned
                    </span>
                )}

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => openStudentsModal(cls)}
                        className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-all flex items-center justify-center gap-1.5"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Students
                    </button>
                    <button
                        onClick={() => openAllotment(cls)}
                        className="flex-1 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-all flex items-center justify-center gap-1.5"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Allotment
                    </button>
                </div>
            </div>
        </div>
    );
};

const ClassManagement = () => {
    const { classes, addClass, updateClass, deleteClass, deleteClasses, deleteAllClasses, updateMentor, mentors, students, updateStudent, deleteStudent, institutionSettings, updateInstitutionSettings } = useData();
    const { showAlert } = useUI();
    const [formData, setFormData] = useState({ name: '', division: '', startTime: '', endTime: '', days: [] });
    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, type: 'single' });
    const [safeguardConfig, setSafeguardConfig] = useState({ isOpen: false, id: null, studentCount: 0 });
    const [allotmentConfig, setAllotmentConfig] = useState({ isOpen: false, classItem: null });
    const [studentsModalOpen, setStudentsModalOpen] = useState({ isOpen: false, classItem: null }); // New state for students modal
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStandard, setFilterStandard] = useState('');
    const [isAttentionExpanded, setIsAttentionExpanded] = useState(true);

    const uniqueStandards = [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

    const { attentionClasses, standardClasses } = React.useMemo(() => {
        const baseFiltered = classes.filter(c => {
            const matchesStandard = filterStandard ? c.name === filterStandard : true;
            const term = searchTerm.toLowerCase();
            const combinedSpace = `${c.name} ${c.division}`.toLowerCase();
            const combinedDash = `${c.name}-${c.division}`.toLowerCase();
            const combinedNoSpace = `${c.name}${c.division}`.toLowerCase();
            
            const assignedMentors = mentors.filter(m => (m.assignedClassIds || []).includes(c.id));
            const mentorMatches = assignedMentors.some(m => m.name.toLowerCase().includes(term));
            
            const matchesSearch = c.name.toLowerCase().includes(term) ||
                c.division.toLowerCase().includes(term) ||
                combinedSpace.includes(term) ||
                combinedDash.includes(term) ||
                combinedNoSpace.includes(term) ||
                mentorMatches;
                
            return matchesStandard && matchesSearch;
        }).sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true });
            if (nameCompare !== 0) return nameCompare;
            return a.division.localeCompare(b.division);
        });

        const attention = [];
        const standard = [];

        baseFiltered.forEach(cls => {
            const studentCount = students.filter(s => s.classId === cls.id && s.status === 'Active').length;
            const mentorCount = mentors.filter(m => (m.assignedClassIds || []).includes(cls.id)).length;
            
            if (studentCount === 0 || mentorCount === 0) {
                attention.push({ ...cls, studentCount, mentorCount });
            } else {
                standard.push({ ...cls, studentCount, mentorCount });
            }
        });

        return { attentionClasses: attention, standardClasses: standard };
    }, [classes, students, mentors, filterStandard, searchTerm]);

    const handleBulkUpload = (data) => {
        let count = 0;
        let errors = 0;
        data.forEach(row => {
            if (row.name && row.division) {
                // Check dup
                const isDup = classes.some(c =>
                    c.name.toLowerCase() === String(row.name).toLowerCase() &&
                    c.division.toLowerCase() === String(row.division).toLowerCase()
                );

                if (!isDup) {
                    let st = row.starttime ? String(row.starttime).trim() : '';
                    let et = row.endtime ? String(row.endtime).trim() : '';
                    if (st && !et) et = addOneHour(st);

                    addClass({
                        name: String(row.name),
                        division: String(row.division),
                        startTime: st,
                        endTime: et,
                        days: row.days ? String(row.days).split(';').map(d => d.trim()).filter(Boolean) : []
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
        setFormData({ name: '', division: '', startTime: '', endTime: '', days: [] });
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

        if (editingId) {
            updateClass(editingId, formData);
        } else {
            addClass(formData);
        }

        handleCloseModal();
    };

    const handleEdit = (cls) => {
        setFormData({ 
            name: cls.name, 
            division: cls.division,
            startTime: cls.startTime || '',
            endTime: cls.endTime || '',
            days: cls.days || []
        });
        setEditingId(cls.id);
        setError('');
        setIsModalOpen(true);
    };

    const confirmDelete = (id) => {
        const studentCount = students.filter(s => s.classId === id && s.status === 'Active').length;
        if (studentCount > 0) {
            setSafeguardConfig({ isOpen: true, id, studentCount });
        } else {
            setDeleteConfig({ isOpen: true, id, type: 'single' });
        }
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

    const openStudentsModal = (cls) => {
        setStudentsModalOpen({ isOpen: true, classItem: cls });
    };

    const handleTransferStudent = async (studentId, targetClassId) => {
        try {
            await updateStudent(studentId, { classId: targetClassId });
            showAlert('Success', 'Student transferred successfully', 'success');
        } catch (error) {
            console.error("Transfer failed", error);
            showAlert('Error', 'Failed to transfer student', 'error');
        }
    };

    const handleDeleteStudent = async (studentId) => {
        try {
            await deleteStudent(studentId);
            showAlert('Success', 'Student removed successfully', 'success');
        } catch (error) {
            console.error("Delete failed", error);
            showAlert('Error', 'Failed to delete student', 'error');
        }
    };

    const classesWithMultipleMentors = classes.filter(cls => {
        const assignedCount = mentors.filter(m => (m.assignedClassIds || []).includes(cls.id)).length;
        return assignedCount > 1;
    });

    const getExportData = () => {
        return classes.map(c => {
            const assignedMentors = mentors.filter(m => (m.assignedClassIds || []).includes(c.id)).map(m => m.name).join(', ');
            const studentCount = students.filter(s => s.classId === c.id && s.status === 'Active').length;
            return {
                'Class Name': c.name || '',
                Division: c.division || '',
                'Start Time': c.startTime || '',
                'End Time': c.endTime || '',
                'Conducting Days': Array.isArray(c.days) ? c.days.join(', ') : '',
                'Student Count': studentCount,
                Mentors: assignedMentors || 'Unassigned'
            };
        });
    };

    const handleExportExcel = () => {
        exportToExcel(getExportData(), 'Classes_Export');
    };

    const handleExportPDF = () => {
        const data = getExportData();
        const headers = ['Class Name', 'Division', 'Start Time', 'End Time', 'Days', 'Students', 'Mentors'];
        const body = data.map(d => [d['Class Name'], d.Division, d['Start Time'], d['End Time'], d['Conducting Days'], d['Student Count'], d.Mentors]);
        exportToPDF(body, headers, 'Classes_Export', 'Classes Directory');
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
            {classesWithMultipleMentors.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm flex items-start gap-3 animate-in fade-in">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="text-sm font-bold text-red-900">Mentor Allotment Warning</h3>
                        <p className="text-sm text-red-700 mt-1 leading-relaxed">
                            The following classes have been allotted to more than one mentor: 
                            <span className="font-semibold bg-red-100 px-2 py-0.5 rounded text-red-800 ml-1">
                                {classesWithMultipleMentors.map(c => `${c.name}-${c.division}`).join(', ')}
                            </span>. 
                            Classes should be strictly restricted to a single mentor. Please correct the allotments below.
                        </p>
                    </div>
                </div>
            )}

            <ClassStudentsModal
                isOpen={studentsModalOpen.isOpen}
                onClose={() => setStudentsModalOpen({ isOpen: false, classItem: null })}
                classItem={studentsModalOpen.classItem}
                students={students}
                classes={classes}
                onTransfer={handleTransferStudent}
                onDelete={handleDeleteStudent}
            />

            <DeleteClassSafeguardModal
                isOpen={safeguardConfig.isOpen}
                onClose={() => setSafeguardConfig({ isOpen: false, id: null, studentCount: 0 })}
                classToDelete={classes.find(c => c.id === safeguardConfig.id)}
                studentsCount={safeguardConfig.studentCount}
                classes={classes}
                onBulkTransferAndDelete={(classId, targetClassId) => {
                    transferStudentsAndBulkDeleteClass(classId, targetClassId, students);
                    showAlert('Success', 'Successfully transferred students and deleted the class.', 'success');
                }}
                onManageIndividually={() => {
                    // Close safeguard and open individual students modal
                    const cls = classes.find(c => c.id === safeguardConfig.id);
                    setSafeguardConfig({ isOpen: false, id: null, studentCount: 0 });
                    if(cls) openStudentsModal(cls);
                }}
            />

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
                showAlert={showAlert}
            />

            <ClassSettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={institutionSettings}
                updateSettings={updateInstitutionSettings}
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
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[13px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Start Time</label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        setFormData(p => ({ 
                                            ...p, 
                                            startTime: newStart, 
                                            // Automatically set end time to 1 hour later if empty or naturally updating
                                            endTime: newStart ? addOneHour(newStart) : p.endTime
                                        }));
                                    }}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[13px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">End Time</label>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-wide">Conducting Days</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map(day => {
                                    const isSelected = formData.days.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setFormData(p => ({
                                                ...p,
                                                days: isSelected ? p.days.filter(d => d !== day) : [...p.days, day]
                                            }))}
                                            className={clsx(
                                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all border",
                                                isSelected ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                            )}
                                        >
                                            {day.slice(0, 3)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/95 backdrop-blur-sm py-4 sticky top-[64px] z-20 border-b border-gray-200 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">Class Management</h2>
                    <p className="text-sm text-gray-500">Manage classes and divisions</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2 w-full md:w-auto h-[44px]">
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap px-2">{selectedIds.length} Selected</span>
                            <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])} className="h-8 text-gray-500 hover:text-gray-700">Cancel</Button>
                            <Button variant="danger" size="sm" onClick={confirmDeleteSelected} className="h-8 flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete ({selectedIds.length})</span>
                                <span className="sm:hidden">Del</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                                <Input
                                    placeholder="Search classes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-white h-11"
                                    containerClassName="w-full"
                                />
                            </div>
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
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button onClick={handleExportExcel} className="h-11 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3" title="Export Excel">
                                    <FileSpreadsheet className="w-4 h-4" />
                                </Button>
                                <Button onClick={handleExportPDF} className="h-11 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3" title="Export PDF">
                                    <FileText className="w-4 h-4" />
                                </Button>
                                <BulkUploadButton onUploadSuccess={handleBulkUpload} type="class" />
                                <Button onClick={handleOpenModal} className="h-11 flex items-center justify-center gap-2 whitespace-nowrap px-4">
                                    <Plus className="w-4 h-4" />
                                    Add Class
                                </Button>
                                <Button variant="secondary" className="h-11 px-3" onClick={() => setSettingsOpen(true)} title="Settings">
                                    <Settings className="w-4 h-4 text-gray-500" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                {attentionClasses.length > 0 && (
                    <div className="animate-in slide-in-from-top-4 duration-500">
                        <div 
                            className="flex items-center justify-between mb-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors"
                            onClick={() => setIsAttentionExpanded(!isAttentionExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Action Required</h3>
                                    <p className="text-sm text-amber-700/70 font-medium">{attentionClasses.length} classes need setup (missing students or mentors)</p>
                                </div>
                            </div>
                            <div className={clsx("p-2 rounded-lg transition-all duration-300", isAttentionExpanded ? "bg-amber-200 text-amber-800" : "bg-white text-amber-600 shadow-sm")}>
                                {isAttentionExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                        </div>
                        
                        {isAttentionExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in duration-300">
                                {attentionClasses.map((cls) => (
                                    <ClassCard 
                                        key={cls.id}
                                        cls={cls}
                                        isAttention={true}
                                        {...{ selectedIds, toggleSelection, openStudentsModal, handleEdit, confirmDelete, openAllotment, students, mentors }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <div className="flex items-center justify-between pb-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">All Classes</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                                {standardClasses.length + attentionClasses.length} Total
                            </span>
                        </div>
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

                    {standardClasses.length === 0 && attentionClasses.length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
                            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <School className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">
                                {searchTerm ? "No classes found matching your search." : "No classes added yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {standardClasses.map((cls) => (
                                <ClassCard 
                                    key={cls.id}
                                    cls={cls}
                                    isAttention={false}
                                    {...{ selectedIds, toggleSelection, openStudentsModal, handleEdit, confirmDelete, openAllotment, students, mentors }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassManagement;
