import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Trash2, Plus, BookOpen, Layers, Edit, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import SubjectBookModal from './SubjectBookModal';
import { FileImage } from 'lucide-react';
import { clsx } from 'clsx';

const SubjectManager = () => {
    const { classes, subjects, addSubject, updateSubject, deleteSubject, deleteSubjects, repairAllSubjects } = useData();
    const { showAlert } = useUI();

    const [isRepairing, setIsRepairing] = useState(false);

    const handleRepair = async () => {
        setIsRepairing(true);
        try {
            const addedCount = await repairAllSubjects();
            if (addedCount > 0) {
                showAlert('Success', `Sync complete! Added ${addedCount} missing subjects across classes.`, 'success');
            } else {
                showAlert('Info', 'All classes are already in sync with their subjects.', 'info');
            }
        } catch (error) {
            showAlert('Error', 'Failed to sync subjects.', 'error');
        } finally {
            setIsRepairing(false);
        }
    };

    // We now track 'gradeName' instead of specific 'classId'
    const [newSubject, setNewSubject] = useState({ name: '', gradeName: '', maxMarks: 100, passMarks: 40, totalChapters: 0, subjectMode: 'both' });
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState(''); // New Search State
    const [sortBy, setSortBy] = useState('grade'); // New Sort State: 'grade' | 'name'
    const [editingId, setEditingId] = useState(null);
    const [editingOriginalName, setEditingOriginalName] = useState('');
    const [editingOriginalGrade, setEditingOriginalGrade] = useState('');

    // Bulk Delete State
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Book Modal State
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [bookModalSubjectGroup, setBookModalSubjectGroup] = useState(null);

    // Clear selections when filters change to avoid ghost selections
    useEffect(() => {
        setSelectedSubjectIds([]);
    }, [selectedGradeFilter, searchQuery]);

    // Extract unique grade names (e.g. "1", "2", "3") sorted
    const uniqueGrades = [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newSubject.name || (!newSubject.gradeName && !editingId)) return;

        if (Number(newSubject.passMarks) > Number(newSubject.maxMarks)) {
            showAlert('Validation Error', "Pass marks cannot be greater than Maximum marks.", 'error');
            return;
        }

        if (editingId) {
            // --- Batch Update & Transfer Logic ---
            const originalGradeName = editingOriginalGrade;
            const targetGradeName = newSubject.gradeName;

            // Find all original subjects in this batch
            const originalSubjects = subjects.filter(s => {
                const sCls = classes.find(c => c.id === s.classId);
                const sGrade = sCls ? sCls.name : 'Unknown/Deleted';
                return sGrade === originalGradeName && s.name.toLowerCase() === editingOriginalName.toLowerCase();
            });

            const targetClasses = classes.filter(c => c.name === targetGradeName);

            let updatedCount = 0;
            let addedCount = 0;
            const toDelete = [];

            if (originalGradeName === targetGradeName) {
                // Normal property update
                originalSubjects.forEach(subj => {
                    updateSubject(subj.id, {
                        name: newSubject.name,
                        maxMarks: Number(newSubject.maxMarks),
                        passMarks: Number(newSubject.passMarks),
                        totalChapters: Number(newSubject.totalChapters) || 0,
                        isExamSubject: newSubject.subjectMode === 'exam' || newSubject.subjectMode === 'both',
                        isClassSubject: newSubject.subjectMode === 'class' || newSubject.subjectMode === 'both'
                    });
                    updatedCount++;
                });
            } else {
                // Grade transfer! Smartly map to preserve as many IDs as possible
                for (let i = 0; i < Math.max(originalSubjects.length, targetClasses.length); i++) {
                    if (i < originalSubjects.length && i < targetClasses.length) {
                        // Update existing and re-link classId
                        updateSubject(originalSubjects[i].id, {
                            name: newSubject.name,
                            classId: targetClasses[i].id,
                            maxMarks: Number(newSubject.maxMarks),
                            passMarks: Number(newSubject.passMarks),
                            totalChapters: Number(newSubject.totalChapters) || 0,
                            isExamSubject: newSubject.subjectMode === 'exam' || newSubject.subjectMode === 'both',
                            isClassSubject: newSubject.subjectMode === 'class' || newSubject.subjectMode === 'both'
                        });
                        updatedCount++;
                    } else if (i >= originalSubjects.length && i < targetClasses.length) {
                        // We need more subjects for the new grade
                        addSubject({
                            name: newSubject.name,
                            classId: targetClasses[i].id,
                            maxMarks: Number(newSubject.maxMarks),
                            passMarks: Number(newSubject.passMarks),
                            totalChapters: Number(newSubject.totalChapters) || 0,
                            isExamSubject: newSubject.subjectMode === 'exam' || newSubject.subjectMode === 'both',
                            isClassSubject: newSubject.subjectMode === 'class' || newSubject.subjectMode === 'both'
                        });
                        addedCount++;
                    } else if (i < originalSubjects.length && i >= targetClasses.length) {
                        // Original had too many subjects, delete the remainder
                        toDelete.push(originalSubjects[i].id);
                    }
                }
                
                if (toDelete.length > 0) {
                    deleteSubjects(toDelete);
                }
            }

            showAlert('Success', `Updated subject mapped to Grade ${targetGradeName}.`, 'success');
            setEditingId(null);
            setEditingOriginalName('');
            setEditingOriginalGrade('');
        } else {
            const targetClasses = classes.filter(c => c.name === newSubject.gradeName);

            let addedCount = 0;
            targetClasses.forEach(c => {
                const exists = subjects.some(s => s.classId === c.id && s.name.toLowerCase() === newSubject.name.toLowerCase());

                if (!exists) {
                    addSubject({
                        name: newSubject.name,
                        classId: c.id,
                        maxMarks: Number(newSubject.maxMarks),
                        passMarks: Number(newSubject.passMarks),
                        totalChapters: Number(newSubject.totalChapters) || 0,
                        isExamSubject: newSubject.subjectMode === 'exam' || newSubject.subjectMode === 'both',
                        isClassSubject: newSubject.subjectMode === 'class' || newSubject.subjectMode === 'both'
                    });
                    addedCount++;
                }
            });

            if (addedCount === 0) {
                showAlert('Duplicate Subject', `Subject '${newSubject.name}' already exists for all classes in Grade ${newSubject.gradeName}.`, 'warning');
            } else {
                showAlert('Success', `Subject added to ${addedCount} classes.`, 'success');
            }
        }

        setNewSubject({
            name: '',
            gradeName: newSubject.gradeName,
            maxMarks: newSubject.maxMarks,
            passMarks: newSubject.passMarks,
            totalChapters: newSubject.totalChapters,
            subjectMode: newSubject.subjectMode
        });

        if (editingId) {
            setNewSubject({ name: '', gradeName: '', maxMarks: 100, passMarks: 40, totalChapters: 0, subjectMode: 'both' });
        }
    };

    const handleEdit = (subject) => {
        const cls = classes.find(c => c.id === subject.classId);
        setEditingId(subject.id);
        setEditingOriginalName(subject.name);
        setEditingOriginalGrade(cls ? cls.name : 'Unknown/Deleted');

        let currentMode = 'both';
        if (subject.isExamSubject === false) currentMode = 'class';
        if (subject.isClassSubject === false) currentMode = 'exam';

        setNewSubject({
            name: subject.name,
            gradeName: cls ? cls.name : '',
            maxMarks: subject.maxMarks,
            passMarks: subject.passMarks || 40,
            totalChapters: subject.totalChapters || 0,
            subjectMode: currentMode
        });
        const formElement = document.getElementById('subject-form');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingOriginalName('');
        setEditingOriginalGrade('');
        setNewSubject({ name: '', gradeName: '', maxMarks: 100, passMarks: 40, totalChapters: 0, subjectMode: 'both' });
    };

    // Helper to get class info
    const getClassName = (id) => {
        const c = classes.find(cl => cl.id === id);
        return c ? `${c.name} - ${c.division}` : 'Unknown';
    };

    const getClassObj = (id) => classes.find(c => c.id === id);

    // Bulk selection handlers
    const toggleSelectAll = () => {
        if (selectedSubjectIds.length === filteredSubjects.length && filteredSubjects.length > 0) {
            setSelectedSubjectIds([]);
        } else {
            setSelectedSubjectIds(filteredSubjects.map(s => s.id));
        }
    };

    const toggleSelectSubject = (id) => {
        setSelectedSubjectIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const confirmBulkDelete = () => {
        deleteSubjects(selectedSubjectIds);
        setSelectedSubjectIds([]);
        setIsBulkDeleteModalOpen(false);
        showAlert('Success', `${selectedSubjectIds.length} subjects deleted successfully.`, 'success');
    };

    const handleDeleteGroup = (subjectIds) => {
        if (window.confirm("Are you sure you want to delete this subject from all divisions in this batch?")) {
            deleteSubjects(subjectIds);
            showAlert('Success', `Deleted from ${subjectIds.length} divisions.`, 'success');
        }
    };

    const toggleSelectGroup = (subjectIds) => {
        const allSelected = subjectIds.every(id => selectedSubjectIds.includes(id));
        if (allSelected) {
            setSelectedSubjectIds(prev => prev.filter(id => !subjectIds.includes(id)));
        } else {
            const missing = subjectIds.filter(id => !selectedSubjectIds.includes(id));
            setSelectedSubjectIds(prev => [...prev, ...missing]);
        }
    };

    // Filter and Sort Logic
    const filteredSubjects = subjects
        .filter(s => {
            // 1. Grade Filter
            if (selectedGradeFilter !== 'all') {
                const cls = classes.find(c => c.id === s.classId);
                if (!cls || cls.name !== selectedGradeFilter) return false;
            }
            // 2. Search Query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const clsName = getClassName(s.classId).toLowerCase();
                return s.name.toLowerCase().includes(query) || clsName.includes(query);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else {
                // Sort by Grade/Class Name then Division
                const cA = getClassObj(a.classId);
                const cB = getClassObj(b.classId);
                if (!cA || !cB) return 0;

                // Compare numeric grade first
                const gradeCompare = cA.name.localeCompare(cB.name, undefined, { numeric: true });
                if (gradeCompare !== 0) return gradeCompare;

                // Then division
                return cA.division.localeCompare(cB.division);
            }
        });

    const groupedSubjects = [];
    filteredSubjects.forEach(s => {
        const cls = getClassObj(s.classId);
        const gradeName = cls ? cls.name : 'Unknown/Deleted';
        const divisionInfo = cls ? cls.division : 'Orphaned';

        const groupKey = `${s.name}-${gradeName}`;

        const existing = groupedSubjects.find(g => g.key === groupKey);
        if (existing) {
            existing.subjectIds.push(s.id);
            existing.divisions.push(divisionInfo);
        } else {
            groupedSubjects.push({
                key: groupKey,
                name: s.name,
                gradeName: gradeName,
                maxMarks: s.maxMarks,
                passMarks: s.passMarks,
                totalChapters: s.totalChapters,
                isExamSubject: s.isExamSubject,
                isClassSubject: s.isClassSubject,
                subjectIds: [s.id],
                divisions: [divisionInfo],
                sampleSubject: s
            });
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <RefreshCw className={clsx("w-5 h-5", isRepairing && "animate-spin")} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-indigo-900">Subject Synchronization</h4>
                        <p className="text-xs text-indigo-700">Ensure all divisions in a batch have the same set of subjects.</p>
                    </div>
                </div>
                <Button 
                    onClick={handleRepair} 
                    disabled={isRepairing}
                    variant="secondary"
                    className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                >
                    {isRepairing ? "Syncing..." : "Sync All Divisions"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Add Subject Form */}
                <Card className="p-6" id="subject-form">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        {editingId ? <Edit className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                        {editingId ? "Update Subject Batch" : "Add New Subject"}
                    </h3>
                    {!editingId ? (
                        <p className="text-xs text-gray-500 mb-4">
                            Adding a subject here will assign it to <b>ALL</b> divisions of the selected Grade.
                        </p>
                    ) : (
                        <p className="text-xs text-indigo-500 bg-indigo-50 p-2 rounded mb-4 border border-indigo-100">
                            <b>Batch Update Mode:</b> Changes will apply to this subject for <b>ALL</b> classes in Grade {newSubject.gradeName}.
                        </p>
                    )}
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Class Name</label>
                            <select
                                value={newSubject.gradeName}
                                onChange={e => setNewSubject({ ...newSubject, gradeName: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                required
                            >
                                <option value="" disabled>Select Grade</option>
                                {editingOriginalGrade === 'Unknown/Deleted' && newSubject.gradeName === 'Unknown/Deleted' && (
                                    <option value="Unknown/Deleted" disabled>Class Unknown/Deleted (Orphaned)</option>
                                )}
                                {uniqueGrades.map(grade => (
                                    <option key={grade} value={grade}>Class {grade}</option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Subject Name"
                            placeholder="e.g. Mathematics"
                            value={newSubject.name}
                            onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                            required
                        />
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Mode</label>
                            <select
                                value={newSubject.subjectMode}
                                onChange={(e) => setNewSubject({ ...newSubject, subjectMode: e.target.value })}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                            >
                                <option value="both">Enable for both (Lecturing & Exams)</option>
                                <option value="class">Enable for class only (Lecturing)</option>
                                <option value="exam">Enable for exam only (Exams)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Controls where this subject appears for students and mentors.
                            </p>
                        </div>

                        {(newSubject.subjectMode === 'exam' || newSubject.subjectMode === 'both') && (
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Max Marks"
                                    type="number"
                                    value={newSubject.maxMarks}
                                    onChange={e => setNewSubject({ ...newSubject, maxMarks: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Pass Marks"
                                    type="number"
                                    value={newSubject.passMarks}
                                    onChange={e => setNewSubject({ ...newSubject, passMarks: e.target.value })}
                                    required
                                />
                            </div>
                        )}
                        <Input
                            label="Total Chapters (For Syllabus Tracking)"
                            type="number"
                            value={newSubject.totalChapters}
                            onChange={e => setNewSubject({ ...newSubject, totalChapters: e.target.value })}
                            placeholder="e.g. 12"
                        />

                        <div className="flex gap-2">
                            {editingId && (
                                <Button type="button" onClick={handleCancelEdit} variant="secondary" className="w-1/3">
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit" variant="primary" className="flex-1">
                                {editingId ? "Update Batch" : "Add Subject to Grade"}
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Subject List */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                            Existing Subjects
                        </h3>

                        {/* Search and Sort Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search subjects..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={selectedGradeFilter}
                                    onChange={e => setSelectedGradeFilter(e.target.value)}
                                    className="rounded-lg border-gray-300 shadow-sm py-2 text-sm px-2 bg-white"
                                >
                                    <option value="all">All Grades</option>
                                    {uniqueGrades.map(grade => (
                                        <option key={grade} value={grade}>Class {grade}</option>
                                    ))}
                                </select>
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    className="rounded-lg border-gray-300 shadow-sm py-2 text-sm px-2 bg-white"
                                >
                                    <option value="grade">Sort: Grade</option>
                                    <option value="name">Sort: Name</option>
                                </select>
                            </div>
                        </div>

                        {/* Bulk Actions Header */}
                        {filteredSubjects.length > 0 && (
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3 pl-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedSubjectIds.length === filteredSubjects.length && filteredSubjects.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {selectedSubjectIds.length > 0 ? `${selectedSubjectIds.length} selected` : 'Select All'}
                                    </span>
                                </div>
                                {selectedSubjectIds.length > 0 && (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => setIsBulkDeleteModalOpen(true)}
                                        className="flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete ({selectedSubjectIds.length})
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {groupedSubjects.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No subjects found.
                            </div>
                        ) : (
                            groupedSubjects.map(group => {
                                const isGroupSelected = group.subjectIds.every(id => selectedSubjectIds.includes(id));

                                return (
                                    <div key={group.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors group-hover gap-3">
                                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                                            <div className="pt-1 sm:pt-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isGroupSelected}
                                                    onChange={() => toggleSelectGroup(group.subjectIds)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{group.name}</p>
                                                <p className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                        <Layers className="w-3 h-3" />
                                                        Class {group.gradeName}
                                                        <span className="font-normal text-gray-500 ml-1">({group.divisions.length} Divisions)</span>
                                                    </span>
                                                    <span className="hidden sm:inline text-gray-300">|</span>
                                                    <span className="whitespace-nowrap">Max: {group.maxMarks} • Pass: {group.passMarks || 40}</span>
                                                    {group.totalChapters > 0 && (
                                                        <>
                                                            <span className="hidden sm:inline text-gray-300">|</span>
                                                            <span className="whitespace-nowrap">{group.totalChapters} Chaps</span>
                                                        </>
                                                    )}
                                                    {group.isExamSubject === false && (
                                                        <>
                                                            <span className="hidden sm:inline text-gray-300">|</span>
                                                            <span className="text-amber-600 font-medium whitespace-nowrap">Class Only</span>
                                                        </>
                                                    )}
                                                    {group.isClassSubject === false && (
                                                        <>
                                                            <span className="hidden sm:inline text-gray-300">|</span>
                                                            <span className="text-blue-600 font-medium whitespace-nowrap">Exam Only</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 sm:gap-1 self-end sm:self-auto opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                                            <button
                                                onClick={() => {
                                                    setBookModalSubjectGroup(group);
                                                    setIsBookModalOpen(true);
                                                }}
                                                className="text-gray-400 hover:text-green-600 p-2 hover:bg-green-50 rounded-lg transition-colors border border-gray-100 sm:border-none"
                                                title="Manage Book Pages"
                                            >
                                                <FileImage className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(group.sampleSubject)}
                                                className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-100 sm:border-none"
                                                title="Edit Batch Subject"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGroup(group.subjectIds)}
                                                className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors border border-gray-100 sm:border-none"
                                                title="Delete Batch Subject"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={confirmBulkDelete}
                title="Delete Multiple Subjects"
                message={`Are you sure you want to delete ${selectedSubjectIds.length} subjects? This action cannot be undone.`}
                confirmText="Delete All Selected"
                isDanger={true}
            />

            <SubjectBookModal
                isOpen={isBookModalOpen}
                onClose={() => {
                    setIsBookModalOpen(false);
                    setBookModalSubjectGroup(null);
                }}
                subjectGroup={bookModalSubjectGroup}
            />
        </div>
    );
};

export default SubjectManager;
