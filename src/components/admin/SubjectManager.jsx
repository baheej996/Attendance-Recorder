import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Trash2, Plus, BookOpen, Layers, Edit, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

const SubjectManager = () => {
    const { classes, subjects, addSubject, updateSubject, deleteSubject } = useData();
    const { showAlert } = useUI();

    // We now track 'gradeName' instead of specific 'classId'
    const [newSubject, setNewSubject] = useState({ name: '', gradeName: '', maxMarks: 100, passMarks: 40, totalChapters: 0, isExamSubject: true });
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState(''); // New Search State
    const [sortBy, setSortBy] = useState('grade'); // New Sort State: 'grade' | 'name'
    const [editingId, setEditingId] = useState(null);
    const [editingOriginalName, setEditingOriginalName] = useState('');

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
            // --- Batch Update Logic ---
            const targetGradeName = newSubject.gradeName;
            const targetClasses = classes.filter(c => c.name === targetGradeName);
            const targetClassIds = targetClasses.map(c => c.id);

            const subjectsToUpdate = subjects.filter(s =>
                targetClassIds.includes(s.classId) &&
                s.name.toLowerCase() === editingOriginalName.toLowerCase()
            );

            let updatedCount = 0;
            subjectsToUpdate.forEach(subj => {
                updateSubject(subj.id, {
                    name: newSubject.name,
                    maxMarks: Number(newSubject.maxMarks),
                    passMarks: Number(newSubject.passMarks),
                    totalChapters: Number(newSubject.totalChapters) || 0,
                    isExamSubject: newSubject.isExamSubject
                });
                updatedCount++;
            });

            showAlert('Success', `Updated subject across ${updatedCount} classes in Grade ${targetGradeName}.`, 'success');
            setEditingId(null);
            setEditingOriginalName('');
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
                        isExamSubject: newSubject.isExamSubject
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
            isExamSubject: newSubject.isExamSubject
        });

        if (editingId) {
            setNewSubject({ name: '', gradeName: '', maxMarks: 100, passMarks: 40, totalChapters: 0, isExamSubject: true });
        }
    };

    const handleEdit = (subject) => {
        const cls = classes.find(c => c.id === subject.classId);
        setEditingId(subject.id);
        setEditingOriginalName(subject.name);

        setNewSubject({
            name: subject.name,
            gradeName: cls ? cls.name : '',
            maxMarks: subject.maxMarks,
            passMarks: subject.passMarks || 40,
            totalChapters: subject.totalChapters || 0,
            isExamSubject: subject.isExamSubject !== undefined ? subject.isExamSubject : true
        });
        const formElement = document.getElementById('subject-form');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingOriginalName('');
        setNewSubject({ name: '', gradeName: '', maxMarks: 100, passMarks: 40, totalChapters: 0, isExamSubject: true });
    };

    // Helper to get class info
    const getClassName = (id) => {
        const c = classes.find(cl => cl.id === id);
        return c ? `${c.name} - ${c.division}` : 'Unknown';
    };

    const getClassObj = (id) => classes.find(c => c.id === id);

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

    return (
        <div className="space-y-6">
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
                                disabled={!!editingId} // Cannot change grade while editing a specific subject instance
                            >
                                <option value="">Select Grade</option>
                                {uniqueGrades.map(grade => (
                                    <option key={grade} value={grade}>Class {grade}</option>
                                ))}
                            </select>
                            {editingId && <p className="text-xs text-gray-400 mt-1">Grade cannot be changed when editing.</p>}
                        </div>
                        <Input
                            label="Subject Name"
                            placeholder="e.g. Mathematics"
                            value={newSubject.name}
                            onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                            required
                        />
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
                        <Input
                            label="Total Chapters (For Syllabus Tracking)"
                            type="number"
                            value={newSubject.totalChapters}
                            onChange={e => setNewSubject({ ...newSubject, totalChapters: e.target.value })}
                            placeholder="e.g. 12"
                        />
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <input
                                type="checkbox"
                                id="isExamSubject"
                                checked={newSubject.isExamSubject}
                                onChange={(e) => setNewSubject({ ...newSubject, isExamSubject: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <div className="flex flex-col">
                                <label htmlFor="isExamSubject" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                    Enable for Exams
                                </label>
                                <span className="text-xs text-gray-500">
                                    If unchecked, this subject will NOT appear in Question Bank or Exam Results.
                                </span>
                            </div>
                        </div>
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
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {filteredSubjects.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No subjects found.
                            </div>
                        ) : (
                            filteredSubjects.map(subject => (
                                <div key={subject.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                    <div>
                                        <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{subject.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            <Layers className="w-3 h-3" />
                                            {getClassName(subject.classId)}
                                            <span className="text-gray-300">|</span>
                                            Max: {subject.maxMarks} • Pass: {subject.passMarks || 40}
                                            {subject.totalChapters > 0 && (
                                                <>
                                                    <span className="text-gray-300">|</span>
                                                    <span className="text-gray-300">|</span>
                                                    {subject.totalChapters} Chaps
                                                </>
                                            )}
                                            {subject.isExamSubject === false && (
                                                <>
                                                    <span className="text-gray-300">|</span>
                                                    <span className="text-amber-600 font-medium">Non-Exam</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(subject)}
                                            className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Subject"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteSubject(subject.id)}
                                            className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Subject"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubjectManager;
