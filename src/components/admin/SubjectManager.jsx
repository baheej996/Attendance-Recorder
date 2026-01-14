import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Trash2, Plus, BookOpen, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

const SubjectManager = () => {
    const { classes, subjects, addSubject, deleteSubject } = useData();
    const { showAlert } = useUI();
    // We now track 'gradeName' instead of specific 'classId'
    const [newSubject, setNewSubject] = useState({ name: '', gradeName: '', maxMarks: 100, passMarks: 40, totalChapters: 0 });
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');

    // Extract unique grade names (e.g. "1", "2", "3") sorted
    const uniqueGrades = [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newSubject.name || !newSubject.gradeName) return;

        if (Number(newSubject.passMarks) > Number(newSubject.maxMarks)) {
            showAlert('Validation Error', "Pass marks cannot be greater than Maximum marks.", 'error');
            return;
        }

        // Find all classes that match the selected grade name
        const targetClasses = classes.filter(c => c.name === newSubject.gradeName);

        let addedCount = 0;
        targetClasses.forEach(c => {
            // Check if subject already exists for this class to prevent duplicates
            const exists = subjects.some(s => s.classId === c.id && s.name.toLowerCase() === newSubject.name.toLowerCase());

            if (!exists) {
                addSubject({
                    name: newSubject.name,
                    classId: c.id,
                    maxMarks: Number(newSubject.maxMarks),
                    passMarks: Number(newSubject.passMarks),
                    totalChapters: Number(newSubject.totalChapters) || 0
                });
                addedCount++;
            }
        });

        if (addedCount === 0) {
            showAlert('Duplicate Subject', `Subject '${newSubject.name}' already exists for all classes in Grade ${newSubject.gradeName}.`, 'warning');
        }

        setNewSubject({
            name: '',
            gradeName: newSubject.gradeName,
            maxMarks: newSubject.maxMarks,
            passMarks: newSubject.passMarks,
            totalChapters: newSubject.totalChapters
        }); // Keep grade/marks/chapters for faster entry
    };

    // Filter subjects logic
    const filteredSubjects = selectedGradeFilter === 'all'
        ? subjects
        : subjects.filter(s => {
            const cls = classes.find(c => c.id === s.classId);
            return cls && cls.name === selectedGradeFilter;
        });

    // Group subjects by class for better display
    const getClassName = (id) => {
        const c = classes.find(cl => cl.id === id);
        return c ? `${c.name} - ${c.division}` : 'Unknown';
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Add Subject Form */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-600" />
                        Add New Subject
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Adding a subject here will assign it to <b>ALL</b> divisions of the selected Grade.
                    </p>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Class Name</label>
                            <select
                                value={newSubject.gradeName}
                                onChange={e => setNewSubject({ ...newSubject, gradeName: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                required
                            >
                                <option value="">Select Grade</option>
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
                        <Button type="submit" variant="primary" className="w-full">
                            Add Subject to Grade
                        </Button>
                    </form>
                </Card>

                {/* Subject List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                            Existing Subjects
                        </h3>
                        <div className="w-40">
                            <select
                                value={selectedGradeFilter}
                                onChange={e => setSelectedGradeFilter(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm py-1.5 text-sm"
                            >
                                <option value="all">All Grades</option>
                                {uniqueGrades.map(grade => (
                                    <option key={grade} value={grade}>Class {grade}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {filteredSubjects.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No subjects found.
                            </div>
                        ) : (
                            filteredSubjects.map(subject => (
                                <div key={subject.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900">{subject.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            <Layers className="w-3 h-3" />
                                            {getClassName(subject.classId)}
                                            <span className="text-gray-300">|</span>
                                            Max: {subject.maxMarks} • Pass: {subject.passMarks || 40}
                                            {subject.totalChapters > 0 && (
                                                <>
                                                    <span className="text-gray-300">|</span>
                                                    {subject.totalChapters} Chaps
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => deleteSubject(subject.id)}
                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Subject"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
