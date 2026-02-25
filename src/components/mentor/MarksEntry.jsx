import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Save, Search, Filter, Trash2, ChevronRight, ArrowLeft, CheckCircle, AlertCircle, Clock, Play, PauseCircle, Eye, EyeOff, Calendar, RotateCcw, Upload, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';
import ExamGradingModal from './ExamGradingModal';

const MarksEntry = () => {
    const {
        subjects, exams, students, results,
        recordResult, deleteResultBatch, classes, currentUser,
        examSettings, updateExamSetting, deleteStudentResponse
    } = useData();
    const { showAlert, showConfirm } = useUI();

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

    // Grading Modal State
    const [gradingModalOpen, setGradingModalOpen] = useState(false);
    const [currentStudentForGrading, setCurrentStudentForGrading] = useState(null);

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
            const clsSubjects = subjects.filter(s => s.classId === cls.id && s.isExamSubject !== false);
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
        const clsSubjects = subjects.filter(s => s.classId === selectedClassId && s.isExamSubject !== false);
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
        showAlert('Success', 'Marks saved successfully!', 'success');
    };

    const handleDelete = () => {
        showConfirm(
            'Delete Marks',
            'Are you sure you want to delete all marks for this subject? This change cannot be undone.',
            () => {
                const studentIds = classStudents.map(s => s.id);
                deleteResultBatch(selectedExamId, selectedSubjectId, studentIds);
                setMarksData({});
                setHasChanges(false);
                showAlert('Deleted', 'Marks deleted successfully!', 'success');
            }
        );
    };

    const handleRetake = (studentId) => {
        showConfirm(
            'Allow Retake',
            'Are you sure? This will delete the student\'s submission and marks. They will be able to take the exam again.',
            () => {
                // 1. Delete Answer Sheet
                deleteStudentResponse(selectedExamId, selectedSubjectId, studentId);
                // 2. Delete Marks/Result
                deleteResultBatch(selectedExamId, selectedSubjectId, [studentId]);

                // 3. Update Local State
                const newMarks = { ...marksData };
                delete newMarks[studentId];
                setMarksData(newMarks);

                showAlert('Reset Successful', 'Student can now retake the exam.', 'success');
            }
        );
    };

    // --- Bulk CSV Logic ---
    const handleDownloadTemplate = () => {
        // 1. Gather all students in available classes
        const targetStudents = students.filter(s => availableClasses.some(c => c.id === s.classId));

        // 2. Determine all subjects applicable to these classes
        const applicableSubjects = subjects.filter(s =>
            s.isExamSubject !== false && availableClasses.some(c => c.id === s.classId)
        );

        // 3. Construct CSV Header
        const baseHeaders = ['Student ID', 'Register No', 'Student Name', 'Class', 'Division'];
        const subjectHeaders = applicableSubjects.map(sub => `[${sub.id}] ${sub.name}`);
        const csvRows = [baseHeaders.concat(subjectHeaders).join(',')];

        // 4. Construct Rows
        targetStudents.forEach(student => {
            const cls = availableClasses.find(c => c.id === student.classId);
            const row = [
                student.id,
                student.registerNo,
                `"${student.name}"`,
                cls.name,
                cls.division
            ];

            // For each subject, check if there's an existing mark, else empty
            applicableSubjects.forEach(sub => {
                // Determine if this subject applies to this student's class
                if (sub.classId !== student.classId) {
                    row.push('N/A'); // Subject not applicable for this class
                } else {
                    const existingResult = results.find(r =>
                        r.examId === selectedExamId &&
                        r.subjectId === sub.id &&
                        r.studentId === student.id
                    );
                    row.push(existingResult ? existingResult.marks : '');
                }
            });

            csvRows.push(row.join(','));
        });

        // 5. Trigger Download
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Exam_Marks_${selectedExamId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csv = event.target.result;
            const lines = csv.split('\n');
            if (lines.length < 2) return;

            const headers = lines[0].split(',');
            // Extract Subject IDs from Headers: "[subjectId] SubjectName"
            const subjectHeaderInfo = [];
            headers.forEach((h, index) => {
                const match = h.match(/\[(.*?)\]/);
                if (match) {
                    subjectHeaderInfo.push({ id: match[1], index });
                }
            });

            if (subjectHeaderInfo.length === 0) {
                showAlert('Format Error', 'Could not detect Subject IDs in the CSV headers. Please use the downloaded template.', 'error');
                return;
            }

            const subjectUpdates = {}; // { subjectId: [ { studentId, marks } ] }

            // Parse Rows
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                // Basic CSV parsing splitting by comma, allowing commas inside quotes if we implement a complex regex, 
                // but since our generated template puts quotes only around names, and marks are numbers, simple split works mostly.
                // A better split: match commas not inside quotes:
                const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
                if (row.length < headers.length) continue;

                const studentId = row[0].replace(/['"]+/g, '').trim();

                subjectHeaderInfo.forEach(info => {
                    let cellVal = row[info.index];
                    if (cellVal) cellVal = cellVal.replace(/['"]+/g, '').trim();

                    if (cellVal && cellVal !== 'N/A' && !isNaN(cellVal)) {
                        if (!subjectUpdates[info.id]) {
                            subjectUpdates[info.id] = [];
                        }
                        subjectUpdates[info.id].push({
                            studentId,
                            marks: Number(cellVal)
                        });
                    }
                });
            }

            // Save to DB
            let subjectsProcessed = 0;
            let totalMarksImported = 0;
            Object.keys(subjectUpdates).forEach(subjectId => {
                const records = subjectUpdates[subjectId];
                if (records.length > 0) {
                    recordResult({ examId: selectedExamId, subjectId, records });
                    subjectsProcessed++;
                    totalMarksImported += records.length;
                }
            });

            showAlert('Import Complete', `Successfully imported ${totalMarksImported} marks across ${subjectsProcessed} subjects!`, 'success');
            // Reset file input
            e.target.value = null;
        };
        reader.readAsText(file);
    };

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
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-gray-900">Select Class</h2>
                        <p className="text-gray-500 mt-1">Exam: {exams.find(e => e.id === selectedExamId)?.name}</p>
                    </div>

                    {/* CSV Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 bg-white"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Download Template</span>
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleUploadCSV}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                title="Upload CSV"
                            />
                            <Button variant="primary" className="flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Upload marks CSV</span>
                            </Button>
                        </div>
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
                        const clsSubjects = subjects.filter(s => s.classId === cls.id && s.isExamSubject !== false);
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
                        subjectStats.list.map(sub => {
                            // Use unique Class ID for Settings Key to ensure division-level control
                            const setting = examSettings.find(s => s.examId === selectedExamId && s.classId === selectedClassId && s.subjectId === sub.name)
                                || { isActive: false, isPublished: false, startTime: '', endTime: '' };

                            const handleToggleActive = (e) => {
                                e.stopPropagation();
                                updateExamSetting(selectedExamId, selectedClassId, sub.name, { isActive: !setting.isActive });
                            };

                            const handleTogglePublish = (e) => {
                                e.stopPropagation();
                                updateExamSetting(selectedExamId, selectedClassId, sub.name, { isPublished: !setting.isPublished });
                            };

                            const handleDateChange = (type, value) => {
                                updateExamSetting(selectedExamId, selectedClassId, sub.name, { [type]: value });
                            };

                            return (
                                <Card
                                    key={sub.id}
                                    className="flex flex-col p-0 overflow-hidden border border-gray-100 hover:shadow-lg transition-all"
                                >
                                    {/* Header / Main Click Area */}
                                    <div
                                        onClick={() => setSelectedSubjectId(sub.id)}
                                        className="p-6 cursor-pointer bg-white hover:bg-gray-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-xl text-gray-900">{sub.name}</h3>
                                                <p className="text-gray-500 mt-1">Max Marks: {sub.maxMarks}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {sub.isEntered ? (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Entered</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">Pending</span>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-gray-300" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controls Footer */}
                                    <div className="p-4 bg-gray-50 flex flex-col gap-3">
                                        <div className="flex items-center justify-between gap-4">
                                            {/* Activation Control */}
                                            <div
                                                onClick={handleToggleActive}
                                                className={clsx(
                                                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border",
                                                    setting.isActive
                                                        ? "bg-green-100 border-green-200 text-green-700"
                                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                                                )}
                                            >
                                                {setting.isActive ? <Play className="w-4 h-4 fill-current" /> : <PauseCircle className="w-4 h-4" />}
                                                <span className="text-xs font-bold uppercase">{setting.isActive ? "Active" : "Inactive"}</span>
                                            </div>

                                            {/* Publish Control */}
                                            <div
                                                onClick={handleTogglePublish}
                                                className={clsx(
                                                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border",
                                                    setting.isPublished
                                                        ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                                                )}
                                            >
                                                {setting.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                <span className="text-xs font-bold uppercase">{setting.isPublished ? "Published" : "Hidden"}</span>
                                            </div>
                                        </div>

                                        {/* Auto Schedule */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <label className="text-gray-500 font-semibold mb-1 block">Start</label>
                                                <input
                                                    type="datetime-local"
                                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-indigo-500"
                                                    value={setting.startTime || ''}
                                                    onChange={(e) => handleDateChange('startTime', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-500 font-semibold mb-1 block">End</label>
                                                <input
                                                    type="datetime-local"
                                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-indigo-500"
                                                    value={setting.endTime || ''}
                                                    onChange={(e) => handleDateChange('endTime', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        }))
                    }
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {classStudents.map(student => {
                                // Check if student has submitted
                                // We can check if their score exists in results?
                                // OR if they have a response in studentResponses (more accurate for "Needs Grading")
                                // But MarksEntry accesses `results`.
                                // Let's just provide the button always, or if mark is entered?
                                // Better: Provide simple "Grade" button.
                                return (
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="text-xs px-2 py-1 h-auto"
                                                onClick={() => {
                                                    setCurrentStudentForGrading(student);
                                                    setGradingModalOpen(true);
                                                }}
                                            >
                                                View/Grade
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs px-2 py-1 h-auto ml-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                                                title="Allow Retake"
                                                onClick={() => handleRetake(student.id)}
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
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


            {/* Grading Modal */}
            <ExamGradingModal
                isOpen={gradingModalOpen}
                onClose={() => {
                    setGradingModalOpen(false);
                    // Refresh data? MarksEntry listens to `results`, so it should auto-update if `recordResult` was called.
                }}
                examId={selectedExamId}
                subjectId={selectedSubjectId}
                studentId={currentStudentForGrading?.id}
                studentName={currentStudentForGrading?.name}
            />
        </div >
    );
};

export default MarksEntry;
