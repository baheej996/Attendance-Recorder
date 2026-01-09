import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Save, Search, Filter, Trash2, ChevronRight, ArrowLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';

const MarksEntry = () => {
    const {
        subjects, exams, students, results,
        recordResult, deleteResultBatch, classes, currentUser
    } = useData();

    // 1. Data Filtering & Stats
    const availableClasses = useMemo(() => classes.filter(c =>
        currentUser && currentUser.assignedClassIds && currentUser.assignedClassIds.includes(c.id)
    ), [classes, currentUser]);

    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Marks State
    const [marksData, setMarksData] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    // Helper: partial reset
    const resetSelection = (level) => {
        if (level === 'exam') {
            setSelectedExamId('');
            setSelectedClassId('');
            setSelectedSubjectId('');
        } else if (level === 'class') {
            setSelectedClassId('');
            setSelectedSubjectId('');
        } else if (level === 'subject') {
            setSelectedSubjectId('');
        }
        setMarksData({});
        setHasChanges(false);
    };

    // --- Computed Data for Current Step ---

    // Step 1: Exams Stats
    const examStats = useMemo(() => {
        return {
            total: exams.length,
            published: exams.filter(e => e.status === 'Published').length,
            draft: exams.filter(e => e.status === 'Draft').length
        };
    }, [exams]);

    // Step 2: Class Stats (for selected Exam)
    const classStats = useMemo(() => {
        if (!selectedExamId) return null;
        let completed = 0;
        let pending = 0;

        availableClasses.forEach(cls => {
            const clsSubjects = subjects.filter(s => s.classId === cls.id);
            if (clsSubjects.length === 0) {
                pending++;
                return;
            }
            // Check if ALL subjects in this class have at least one result entry for this exam
            const allSubjectsDone = clsSubjects.every(sub =>
                results.some(r => r.examId === selectedExamId && r.subjectId === sub.id)
            );
            if (allSubjectsDone) completed++; else pending++;
        });

        return { total: availableClasses.length, completed, pending };
    }, [availableClasses, selectedExamId, subjects, results]);

    // Step 3: Subject Stats (for selected Class)
    const subjectStats = useMemo(() => {
        if (!selectedExamId || !selectedClassId) return null;
        const clsSubjects = subjects.filter(s => s.classId === selectedClassId);
        let entered = 0;

        clsSubjects.forEach(sub => {
            const hasEntry = results.some(r => r.examId === selectedExamId && r.subjectId === sub.id);
            if (hasEntry) entered++;
        });

        return {
            total: clsSubjects.length,
            entered,
            pending: clsSubjects.length - entered,
            list: clsSubjects.map(sub => ({
                ...sub,
                isEntered: results.some(r => r.examId === selectedExamId && r.subjectId === sub.id)
            }))
        };
    }, [subjects, selectedExamId, selectedClassId, results]);

    // Step 4: Students & Marks Loading
    const classStudents = useMemo(() =>
        students.filter(s => s.classId === selectedClassId),
        [students, selectedClassId]);

    useEffect(() => {
        if (selectedExamId && selectedClassId && selectedSubjectId) {
            const existing = results.filter(r => r.examId === selectedExamId && r.subjectId === selectedSubjectId);
            const initialData = {};
            existing.forEach(r => initialData[r.studentId] = r.marks);
            setMarksData(initialData);
            setHasChanges(false);
        }
    }, [selectedExamId, selectedClassId, selectedSubjectId, results]);

    // Handlers
    const handleMarkChange = (studentId, value) => {
        setMarksData(prev => ({ ...prev, [studentId]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        const records = Object.entries(marksData).map(([studentId, marks]) => ({
            studentId, marks: Number(marks)
        }));
        recordResult({ examId: selectedExamId, subjectId: selectedSubjectId, records });
        setHasChanges(false);
        alert('Marks saved successfully!');
    };

    const handleDelete = () => {
        if (window.confirm('Delete all marks for this subject? This cannot be undone.')) {
            const studentIds = classStudents.map(s => s.id);
            deleteResultBatch(selectedExamId, selectedSubjectId, studentIds);
            setMarksData({});
            setHasChanges(false);
            alert('Marks deleted successfully!');
        }
    };

    // --- Render Steps ---

    // 1. Exam Selection
    if (!selectedExamId) {
        return (
            <div className="p-8 max-w-5xl mx-auto space-y-10 animate-fadeIn">
                <div className="flex items-center gap-4 mb-10">
                    <Filter className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-3xl font-bold text-gray-900">Select Exam</h2>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="p-6 border-l-4 border-l-indigo-500">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Exams</p>
                        <p className="text-3xl font-bold mt-2">{examStats.total}</p>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-green-500">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Published</p>
                        <p className="text-3xl font-bold mt-2">{examStats.published}</p>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-yellow-500">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Drafts</p>
                        <p className="text-3xl font-bold mt-2">{examStats.draft}</p>
                    </Card>
                </div>

                {/* List */}
                <div className="grid gap-6">
                    {exams.map(exam => (
                        <Card
                            key={exam.id}
                            onClick={() => setSelectedExamId(exam.id)}
                            className="p-6 flex justify-between items-center cursor-pointer hover:shadow-lg transition-all hover:bg-gray-50 border border-gray-100"
                        >
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 mb-2">{exam.name}</h3>
                                <span className={clsx(
                                    "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide",
                                    exam.status === 'Published' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                )}>
                                    {exam.status}
                                </span>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // 2. Class Selection
    if (!selectedClassId) {
        return (
            <div className="p-8 max-w-5xl mx-auto space-y-10 animate-fadeIn">
                <div className="flex items-center gap-4 mb-10">
                    <Button variant="secondary" onClick={() => resetSelection('exam')} className="p-2 h-auto rounded-full hover:bg-gray-200">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Select Class</h2>
                        <p className="text-gray-500 mt-1">Exam: {exams.find(e => e.id === selectedExamId)?.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="p-6 bg-indigo-50 border-indigo-100">
                        <p className="text-indigo-600 text-sm font-bold uppercase tracking-wider">Assigned Classes</p>
                        <p className="text-3xl font-bold text-indigo-900 mt-2">{classStats.total}</p>
                    </Card>
                    <Card className="p-6 bg-green-50 border-green-100">
                        <p className="text-green-600 text-sm font-bold uppercase tracking-wider">Completed</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">{classStats.completed}</p>
                    </Card>
                    <Card className="p-6 bg-amber-50 border-amber-100">
                        <p className="text-amber-600 text-sm font-bold uppercase tracking-wider">Pending</p>
                        <p className="text-3xl font-bold text-amber-900 mt-2">{classStats.pending}</p>
                    </Card>
                </div>

                <div className="grid gap-6">
                    {availableClasses.map(cls => {
                        // Determine status for this specific class
                        const clsSubjects = subjects.filter(s => s.classId === cls.id);
                        const isComplete = clsSubjects.length > 0 && clsSubjects.every(sub =>
                            results.some(r => r.examId === selectedExamId && r.subjectId === sub.id)
                        );

                        return (
                            <Card
                                key={cls.id}
                                onClick={() => setSelectedClassId(cls.id)}
                                className="p-6 flex justify-between items-center cursor-pointer hover:shadow-lg transition-all hover:bg-gray-50 border border-gray-100"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-xl text-indigo-600">
                                        {cls.name}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900">Class {cls.name} - {cls.division}</h3>
                                        <p className="text-gray-500 mt-1">{clsSubjects.length} Subjects</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {isComplete ? (
                                        <div className="flex items-center gap-2 text-green-600 font-medium px-4 py-2 bg-green-50 rounded-lg">
                                            <CheckCircle className="w-5 h-5" /> Completed
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-amber-600 font-medium px-4 py-2 bg-amber-50 rounded-lg">
                                            <Clock className="w-5 h-5" /> Pending
                                        </div>
                                    )}
                                    <ChevronRight className="w-6 h-6 text-gray-300" />
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 3. Subject Selection
    if (!selectedSubjectId) {
        return (
            <div className="p-8 max-w-5xl mx-auto space-y-10 animate-fadeIn">
                <div className="flex items-center gap-4 mb-10">
                    <Button variant="secondary" onClick={() => resetSelection('class')} className="p-2 h-auto rounded-full hover:bg-gray-200">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Select Subject</h2>
                        <p className="text-gray-500 mt-1">
                            {exams.find(e => e.id === selectedExamId)?.name} • Class {availableClasses.find(c => c.id === selectedClassId)?.name}-{availableClasses.find(c => c.id === selectedClassId)?.division}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="p-6">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Subjects</p>
                        <p className="text-3xl font-bold mt-2">{subjectStats.total}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Entered</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">{subjectStats.entered}</p>
                    </Card>
                    <Card className="p-6">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Pending</p>
                        <p className="text-3xl font-bold text-amber-600 mt-2">{subjectStats.pending}</p>
                    </Card>
                </div>

                <div className="grid gap-6">
                    {subjectStats.list.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border-2 border-dashed">
                            No subjects found for this class.
                        </div>
                    ) : (
                        subjectStats.list.map(sub => (
                            <Card
                                key={sub.id}
                                onClick={() => setSelectedSubjectId(sub.id)}
                                className="p-6 flex justify-between items-center cursor-pointer hover:shadow-lg transition-all hover:bg-gray-50 border border-gray-100"
                            >
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900">{sub.name}</h3>
                                    <p className="text-gray-500 mt-1">Max Marks: {sub.maxMarks}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {sub.isEntered ? (
                                        <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                                            Entered
                                        </span>
                                    ) : (
                                        <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-bold">
                                            Not Entered
                                        </span>
                                    )}
                                    <ChevronRight className="w-6 h-6 text-gray-300" />
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // 4. Mark Entry Table (Final Step)
    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="secondary" onClick={() => resetSelection('subject')} className="p-2 h-auto rounded-full hover:bg-gray-200">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Enter Marks</h2>
                    <p className="text-gray-500 mt-1">
                        {availableClasses.find(c => c.id === selectedClassId)?.name}-{availableClasses.find(c => c.id === selectedClassId)?.division} • {subjects.find(s => s.id === selectedSubjectId)?.name}
                    </p>
                </div>
            </div>

            <Card className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 font-medium">
                        Total Students: <span className="font-bold text-gray-900 ml-1">{classStudents.length}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleDelete}
                            variant="danger"
                            className="flex items-center gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-sm font-medium px-4 py-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Entry
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            variant="primary"
                            className="flex items-center gap-2 text-sm font-medium px-6 py-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Marks
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Marks Obtained</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {classStudents.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.registerNo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="number"
                                            min="0"
                                            max={subjects.find(s => s.id === selectedSubjectId)?.maxMarks || 100}
                                            value={marksData[student.id] || ''}
                                            onChange={e => handleMarkChange(student.id, e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1.5 px-2 border"
                                            placeholder="0"
                                        />
                                    </td>
                                </tr>
                            ))}
                            {classStudents.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                                        No students found in this class.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default MarksEntry;
