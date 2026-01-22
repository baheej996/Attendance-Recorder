import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Check, X, Users, AlertCircle, ChevronRight, School, Filter, Layers } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';

const BulkTransfer = () => {
    const { classes, students, updateStudent, exams, results, subjects } = useData();
    const { showAlert } = useUI();

    // Steps: 1 = Selection, 2 = Review
    const [step, setStep] = useState(1);

    // Selection State
    const [isAllClassesMode, setIsAllClassesMode] = useState(false);
    const [sourceClassId, setSourceClassId] = useState('');
    const [targetClassId, setTargetClassId] = useState('');
    const [transferMode, setTransferMode] = useState('exam'); // 'direct' or 'exam'
    const [selectedExamId, setSelectedExamId] = useState('');

    // Review State
    const [studentsToPromote, setStudentsToPromote] = useState([]); // List of student IDs
    const [processedStudents, setProcessedStudents] = useState([]); // Array of student objects with status
    const [classMappings, setClassMappings] = useState([]); // For All Classes mode: [{ source, target, studentCount }]

    // Derived Data
    const sourceClass = classes.find(c => c.id === sourceClassId);
    const targetClass = classes.find(c => c.id === targetClassId);

    // Helper to find next class
    const findNextClass = (currentClass) => {
        if (!currentClass) return null;
        const currentStd = parseInt(currentClass.name);
        if (isNaN(currentStd)) return null;
        const nextStd = (currentStd + 1).toString();
        return classes.find(c => c.name === nextStd && c.division === currentClass.division);
    };

    // Auto-match Target Class logic (Single Mode)
    useEffect(() => {
        if (!isAllClassesMode && sourceClass && !targetClassId) {
            const match = findNextClass(sourceClass);
            if (match) setTargetClassId(match.id);
        }
    }, [sourceClass, classes, targetClassId, isAllClassesMode]);

    // Calculate Mappings for All Classes Mode
    useEffect(() => {
        if (isAllClassesMode) {
            const mappings = classes
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(cls => {
                    const target = findNextClass(cls);
                    const count = students.filter(s => s.classId === cls.id && s.status === 'Active').length;
                    return {
                        source: cls,
                        target: target,
                        studentCount: count
                    };
                });
            setClassMappings(mappings);
        }
    }, [isAllClassesMode, classes, students]);

    // PREPARE DATA FOR REVIEW STEP
    const handleNext = () => {
        if (!isAllClassesMode && (!sourceClassId || !targetClassId)) {
            showAlert('Missing Selection', 'Please select both source and target classes.', 'error');
            return;
        }
        if (transferMode === 'exam' && !selectedExamId) {
            showAlert('Missing Exam', 'Please select an exam to evaluate results.', 'error');
            return;
        }

        let studentsToProcess = [];
        let itemsToProcess = [];

        if (isAllClassesMode) {
            // Process ONLY classes that have a valid target and students
            classMappings.filter(m => m.target && m.studentCount > 0).forEach(mapping => {
                const classStudents = students.filter(s => s.classId === mapping.source.id && s.status === 'Active');
                itemsToProcess.push({
                    students: classStudents,
                    sourceId: mapping.source.id,
                    targetId: mapping.target.id
                });
            });

            if (itemsToProcess.length === 0) {
                showAlert('No Valid Transfers', 'No active classes have valid next-year targets or students.', 'warning');
                return;
            }
        } else {
            const classStudents = students.filter(s => s.classId === sourceClassId && s.status === 'Active');
            itemsToProcess.push({
                students: classStudents,
                sourceId: sourceClassId,
                targetId: targetClassId
            });
        }

        let allProcessed = [];

        itemsToProcess.forEach(item => {
            const processed = item.students.map(student => {
                let status = 'eligible'; // eligible, failed, unknown
                let details = '';

                if (transferMode === 'exam') {
                    const classSubjects = subjects.filter(s => s.classId === item.sourceId && s.isExamSubject);
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
                    targetClassId: item.targetId, // Important: Store target for this student
                    isSelected: (status === 'passed' || status === 'eligible')
                };
            });
            allProcessed = [...allProcessed, ...processed];
        });

        setProcessedStudents(allProcessed);
        setStudentsToPromote(allProcessed.filter(s => s.isSelected).map(s => s.id));
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
            setStudentsToPromote(prev => prev.filter(id => !toSelect.includes(id)));
        } else {
            setStudentsToPromote(prev => [...new Set([...prev, ...toSelect])]);
        }
    };

    const executeTransfer = () => {
        if (studentsToPromote.length === 0) return;

        studentsToPromote.forEach(studentId => {
            const student = processedStudents.find(s => s.id === studentId);
            if (student && student.targetClassId) {
                updateStudent(studentId, { classId: student.targetClassId });
            }
        });

        const distinctClassCount = new Set(processedStudents.filter(s => studentsToPromote.includes(s.id)).map(s => s.classId)).size;

        showAlert('Transfer Complete', `Successfully transferred ${studentsToPromote.length} students across ${distinctClassCount} classes.`, 'success');

        // Reset
        setStep(1);
        setSourceClassId('');
        setTargetClassId('');
        setStudentsToPromote([]);
        setProcessedStudents([]);
    };

    if (step === 1) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Bulk Transfer</h2>
                        <p className="text-gray-500">Promote students to the next academic year or batch.</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-2 w-fit">
                    <button
                        onClick={() => setIsAllClassesMode(false)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${!isAllClassesMode ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <School className="w-4 h-4" />
                        Single Class
                    </button>
                    <button
                        onClick={() => setIsAllClassesMode(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isAllClassesMode ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Layers className="w-4 h-4" />
                        All Classes (Whole School)
                    </button>
                </div>

                {/* Single Class Mode */}
                {!isAllClassesMode && (
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
                )}

                {/* All Classes Mode Preview */}
                {isAllClassesMode && (
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Academic Year Transition Plan</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="p-3 text-left">Current Class</th>
                                        <th className="p-3 text-left">Students</th>
                                        <th className="p-3 text-left">Target Class (Next Year)</th>
                                        <th className="p-3 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {classMappings.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">{m.source.name}-{m.source.division}</td>
                                            <td className="p-3">{m.studentCount}</td>
                                            <td className="p-3">
                                                {m.target ? (
                                                    <span className="flex items-center gap-2 text-green-700 font-medium">
                                                        <ArrowRight className="w-3 h-3" />
                                                        {m.target.name}-{m.target.division}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">No Target Found</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {m.studentCount === 0 ? (
                                                    <span className="text-gray-400">No Students</span>
                                                ) : !m.target ? (
                                                    <span className="text-orange-600 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> Manual Check Reqd
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Ready
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            * Targets are auto-matched based on Name (Standard) + Division. e.g. 5-A to 6-A.
                        </p>
                    </Card>
                )}

                {/* Configuration (Common) */}
                {((!isAllClassesMode && sourceClassId && targetClassId) || (isAllClassesMode)) && (
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
                                disabled={(!isAllClassesMode && (!sourceClassId || !targetClassId)) || (transferMode === 'exam' && !selectedExamId)}
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
                        {isAllClassesMode ? (
                            <span className="font-semibold text-indigo-600">Whole School Promotion Mode</span>
                        ) : (
                            <>
                                <span className="font-semibold text-gray-700">{sourceClass?.name}-{sourceClass?.division}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span className="font-semibold text-gray-700">{targetClass?.name}-{targetClass?.division}</span>
                            </>
                        )}
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
                                {isAllClassesMode && <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Class Action</th>}
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Exam Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedStudents.map(student => {
                                const isSelected = studentsToPromote.includes(student.id);
                                const currentClass = classes.find(c => c.id === student.classId);
                                const targetClass = classes.find(c => c.id === student.targetClassId);

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
                                            {isAllClassesMode && (
                                                <div className="text-xs text-indigo-600 md:hidden mt-1">
                                                    {currentClass?.name}-{currentClass?.division} → {targetClass?.name}-{targetClass?.division}
                                                </div>
                                            )}
                                        </td>
                                        {isAllClassesMode && (
                                            <td className="p-4 text-xs">
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <span>{currentClass?.name}-{currentClass?.division}</span>
                                                    <ArrowRight className="w-3 h-3" />
                                                    <span className="font-medium text-gray-900">{targetClass?.name}-{targetClass?.division}</span>
                                                </div>
                                            </td>
                                        )}
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
