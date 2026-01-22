import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Check, X, Users, AlertCircle, ChevronRight, School, Filter } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';

const BulkTransfer = () => {
    const { classes, students, updateStudent, exams, results, subjects } = useData();
    const { showAlert } = useUI();

    // Steps: 1 = Selection, 2 = Review
    const [step, setStep] = useState(1);

    // Selection State
    const [sourceClassId, setSourceClassId] = useState('');
    const [targetClassId, setTargetClassId] = useState('');
    const [transferMode, setTransferMode] = useState('exam'); // 'direct' or 'exam'
    const [selectedExamId, setSelectedExamId] = useState('');

    // Review State
    const [studentsToPromote, setStudentsToPromote] = useState([]); // List of student IDs
    const [processedStudents, setProcessedStudents] = useState([]); // Array of student objects with status

    // Derived Data
    const sourceClass = classes.find(c => c.id === sourceClassId);
    const targetClass = classes.find(c => c.id === targetClassId);
    const sourceStudents = useMemo(() => students.filter(s => s.classId === sourceClassId && s.status === 'Active'), [students, sourceClassId]);

    // Auto-match Target Class logic
    useEffect(() => {
        if (sourceClass && !targetClassId) {
            // Try to find next standard with same division
            // Assuming name is a number like "5"
            const currentStd = parseInt(sourceClass.name);
            if (!isNaN(currentStd)) {
                const nextStd = (currentStd + 1).toString();
                const match = classes.find(c => c.name === nextStd && c.division === sourceClass.division);
                if (match) {
                    setTargetClassId(match.id);
                }
            }
        }
    }, [sourceClass, classes, targetClassId]);

    // PREPARE DATA FOR REVIEW STEP
    const handleNext = () => {
        if (!sourceClassId || !targetClassId) {
            showAlert('Missing Selection', 'Please select both source and target classes.', 'error');
            return;
        }
        if (transferMode === 'exam' && !selectedExamId) {
            showAlert('Missing Exam', 'Please select an exam to evaluate results.', 'error');
            return;
        }

        // Process Students
        const processed = sourceStudents.map(student => {
            let status = 'eligible'; // eligible, failed, unknown
            let details = '';

            if (transferMode === 'exam') {
                // Check Pass/Fail
                // Logic: Must pass ALL subjects in the exam? Or just have a result?
                // Let's go with: Check results for all subjects in that exam.
                // If any subject < passMark => Fail.

                // 1. Get all subjects for this class
                const classSubjects = subjects.filter(s => s.classId === sourceClassId && s.isExamSubject);

                // 2. Get results for this student & exam
                const studentResults = results.filter(r => r.studentId === student.id && r.examId === selectedExamId);

                let failCount = 0;
                let missingCount = 0;

                classSubjects.forEach(sub => {
                    const res = studentResults.find(r => r.subjectId === sub.id);
                    if (!res) {
                        missingCount++;
                    } else if (res.marks < sub.passMarks) {
                        failCount++;
                    }
                });

                if (failCount > 0) {
                    status = 'failed';
                    details = `Failed ${failCount} subjects`;
                } else if (missingCount > 0) {
                    status = 'unknown'; // incomplete results
                    details = `Missing ${missingCount} subjects`;
                } else {
                    status = 'passed';
                    details = 'Passed all subjects';
                }
            } else {
                status = 'eligible';
                details = 'Direct Promotion';
            }

            return {
                ...student,
                examStatus: status,
                examDetails: details,
                isSelected: (status === 'passed' || status === 'eligible') // Auto-select passed/eligible
            };
        });

        setProcessedStudents(processed);
        // Pre-select valid ones
        setStudentsToPromote(processed.filter(s => s.isSelected).map(s => s.id));
        setStep(2);
    };

    const handleToggleStudent = (studentId) => {
        setStudentsToPromote(prev => {
            if (prev.includes(studentId)) return prev.filter(id => id !== studentId);
            return [...prev, studentId];
        });
    };

    const handleSelectAll = (filterFn) => {
        const toSelect = processedStudents.filter(filterFn ? filterFn : () => true).map(s => s.id);
        const allSelected = toSelect.every(id => studentsToPromote.includes(id));

        if (allSelected) {
            // Deselect these
            setStudentsToPromote(prev => prev.filter(id => !toSelect.includes(id)));
        } else {
            // Select these (merge unique)
            setStudentsToPromote(prev => [...new Set([...prev, ...toSelect])]);
        }
    };

    const executeTransfer = () => {
        if (studentsToPromote.length === 0) return;

        studentsToPromote.forEach(studentId => {
            updateStudent(studentId, { classId: targetClassId });
        });

        showAlert('Transfer Complete', `Successfully transferred ${studentsToPromote.length} students to ${targetClass.name}-${targetClass.division}`, 'success');

        // Reset
        setStep(1);
        setSourceClassId('');
        setTargetClassId('');
        setStudentsToPromote([]);
    };

    if (step === 1) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Bulk Transfer</h2>
                    <p className="text-gray-500">Promote students to the next academic year or batch.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* Source */}
                    <Card className="p-6 border-l-4 border-l-indigo-500 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <School className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Source Class</h3>
                        </div>

                        <label className="block text-sm font-medium text-gray-700">Select Batch</label>
                        <select
                            value={sourceClassId}
                            onChange={(e) => setSourceClassId(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">-- Select Class --</option>
                            {classes.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {c.division} ({students.filter(s => s.classId === c.id && s.status === 'Active').length} students)</option>
                            ))}
                        </select>
                    </Card>

                    {/* Arrow Indicator */}
                    <div className="hidden md:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-2 rounded-full shadow-md border">
                        <ArrowRight className="text-gray-400" />
                    </div>

                    {/* Target */}
                    <Card className="p-6 border-l-4 border-l-green-500 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <School className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Target Class</h3>
                        </div>

                        <label className="block text-sm font-medium text-gray-700">Promote To</label>
                        <select
                            value={targetClassId}
                            onChange={(e) => setTargetClassId(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                            <option value="">-- Select Target --</option>
                            {classes
                                .filter(c => c.id !== sourceClassId)
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                ))}
                        </select>
                    </Card>
                </div>

                {/* Configuration */}
                {sourceClassId && targetClassId && (
                    <Card className="p-6 animate-in slide-in-from-bottom-2 duration-300">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            Transfer Rules
                        </h3>

                        <div className="space-y-4">
                            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg w-fit">
                                <button
                                    onClick={() => setTransferMode('exam')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transferMode === 'exam' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    Exam Result Based
                                </button>
                                <button
                                    onClick={() => setTransferMode('direct')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transferMode === 'direct' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    Direct Promotion (All)
                                </button>
                            </div>

                            {transferMode === 'exam' && (
                                <div className="max-w-md">
                                    <label className="block text-sm text-gray-600 mb-1">Select Qualifying Exam</label>
                                    <select
                                        value={selectedExamId}
                                        onChange={(e) => setSelectedExamId(e.target.value)}
                                        className="w-full p-2 border rounded-lg text-sm"
                                    >
                                        <option value="">-- Select Exam --</option>
                                        {exams.filter(e => e.status === 'Published').map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Students must pass all subjects in this exam to be auto-selected.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleNext}
                                disabled={!sourceClassId || !targetClassId || (transferMode === 'exam' && !selectedExamId)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Review Students
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </Card>
                )}
            </div>
        );
    }

    // STEP 2: REVIEW
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Review Transfer</h2>
                    <p className="text-gray-500 flex items-center gap-2 text-sm mt-1">
                        <span className="font-semibold text-gray-700">{sourceClass?.name}-{sourceClass?.division}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-semibold text-gray-700">{targetClass?.name}-{targetClass?.division}</span>
                    </p>
                </div>
                <button
                    onClick={() => setStep(1)}
                    className="text-gray-500 hover:text-gray-900 text-sm font-medium underline"
                >
                    Change Selection
                </button>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSelectAll()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => handleSelectAll(s => s.examStatus === 'passed')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded-lg text-sm hover:bg-green-50"
                        >
                            Passed Only
                        </button>
                        <button
                            onClick={() => handleSelectAll(s => s.examStatus === 'failed')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50"
                        >
                            Failed Only
                        </button>
                    </div>

                    <div className="text-sm text-gray-600">
                        <span className="font-bold text-indigo-600">{studentsToPromote.length}</span> students selected
                    </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={studentsToPromote.length === processedStudents.length && processedStudents.length > 0}
                                        onChange={() => handleSelectAll()}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Exam Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedStudents.map(student => {
                                const isSelected = studentsToPromote.includes(student.id);
                                return (
                                    <tr
                                        key={student.id}
                                        onClick={() => handleToggleStudent(student.id)}
                                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleStudent(student.id)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{student.name}</div>
                                            <div className="text-xs text-gray-500">{student.registerNo}</div>
                                        </td>
                                        <td className="p-4">
                                            {student.examStatus === 'passed' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                                    <Check className="w-3 h-3" /> Passed
                                                </span>
                                            )}
                                            {student.examStatus === 'failed' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                                    <X className="w-3 h-3" /> Failed
                                                </span>
                                            )}
                                            {student.examStatus === 'unknown' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                                                    <AlertCircle className="w-3 h-3" /> Incomplete
                                                </span>
                                            )}
                                            {student.examStatus === 'eligible' && ( // Direct Mode
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                    Eligible
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {student.examDetails}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={() => setStep(1)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                        Back
                    </button>
                    <button
                        onClick={executeTransfer}
                        disabled={studentsToPromote.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Transfer {studentsToPromote.length} Students
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default BulkTransfer;
