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
        recordResult, deleteResultBatch, deleteExamResultsForClass, classes, currentUser,
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
        // Validation: Check if any marks exceed the subject's maximum
        const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
        const maxMarks = selectedSubject ? Number(selectedSubject.maxMarks) : 100;

        let hasInvalidMarks = false;
        const records = Object.entries(marksData).map(([studentId, marks]) => {
            const numMarks = Number(marks);
            if (numMarks > maxMarks) {
                hasInvalidMarks = true;
            }
            return { studentId, marks: numMarks };
        });

        if (hasInvalidMarks) {
            showAlert('Invalid Marks', `One or more students have marks exceeding the maximum allowed (${maxMarks}) for this subject.`, 'error');
            return; // Abort save
        }

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

    const handleDeleteAllClassMarks = () => {
        if (!selectedExamId || !selectedClassId) return;
        const currentClassStudentIds = classStudents.map(s => s.id);

        if (currentClassStudentIds.length === 0) {
            showAlert('No Students', 'There are no students in this class.', 'info');
            return;
        }

        const classInfo = availableClasses.find(c => c.id === selectedClassId);
        const className = classInfo ? `${classInfo.name}-${classInfo.division}` : 'this class';

        showConfirm(
            'Delete All Marks for Class',
            `Are you sure you want to delete ALL marks for EVERY subject in ${className} for this exam? This action cannot be undone.`,
            () => {
                deleteExamResultsForClass(selectedExamId, currentClassStudentIds);
                showAlert('Deleted', `All marks for ${className} have been deleted successfully.`, 'success');
            }
        );
    };

    const handleDeleteAllExamMarks = () => {
        if (!selectedExamId) return;

        // Get all students in all available classes
        const availableClassIds = availableClasses.map(c => c.id);
        const allAvailableStudentIds = students
            .filter(s => availableClassIds.includes(s.classId))
            .map(s => s.id);

        if (allAvailableStudentIds.length === 0) {
            showAlert('No Students', 'There are no students in your assigned classes.', 'info');
            return;
        }

        const examName = exams.find(e => e.id === selectedExamId)?.name || 'this exam';

        showConfirm(
            'Delete All Exam Marks',
            `Are you sure you want to delete ALL marks for every subject and class you manage in ${examName}? This action cannot be undone.`,
            () => {
                deleteExamResultsForClass(selectedExamId, allAvailableStudentIds);
                showAlert('Deleted', `All marks for ${examName} have been deleted successfully.`, 'success');
            }
        );
    };

    // --- Bulk CSV Logic ---
    const handleDownloadTemplate = () => {
        if (!selectedClassId) return;

        const currentClass = availableClasses.find(c => c.id === selectedClassId);
        if (!currentClass) return;

        // 1. Gather students in THIS class and sort them: Boys first, then by name
        let targetStudents = students.filter(s => s.classId === selectedClassId);
        targetStudents.sort((a, b) => {
            const aIsBoy = (a.gender || '').toLowerCase() === 'male' || (a.gender || '').toLowerCase() === 'boy';
            const bIsBoy = (b.gender || '').toLowerCase() === 'male' || (b.gender || '').toLowerCase() === 'boy';
            if (aIsBoy && !bIsBoy) return -1;
            if (!aIsBoy && bIsBoy) return 1;
            return a.name.localeCompare(b.name);
        });

        // 2. Determine subjects applicable to THIS class
        const applicableSubjects = subjects.filter(s =>
            s.isExamSubject !== false && s.classId === selectedClassId
        );

        // 3. Construct CSV Header
        const baseHeaders = ['Student ID', 'Register No', 'Student Name', 'Gender', 'Class', 'Division'];
        const subjectHeaders = applicableSubjects.map(sub => `[${sub.id}] ${sub.name}`);
        const csvRows = [baseHeaders.concat(subjectHeaders).join(',')];

        // 4. Construct Rows
        targetStudents.forEach(student => {
            const row = [
                student.id,
                student.registerNo,
                `"${student.name}"`,
                student.gender || '',
                currentClass.name,
                currentClass.division
            ];

            // For each subject, check if there's an existing mark, else empty
            applicableSubjects.forEach(sub => {
                const existingResult = results.find(r =>
                    r.examId === selectedExamId &&
                    r.subjectId === sub.id &&
                    r.studentId === student.id
                );
                row.push(existingResult ? existingResult.marks : '');
            });

            csvRows.push(row.join(','));
        });

        // 5. Trigger Download
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Class_${currentClass.name}_${currentClass.division}_Marks.csv`);
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
                        const numericVal = Number(cellVal);

                        // Validation: Check against subject max marks
                        const currentSubject = subjects.find(s => s.id === info.id);
                        const maxMarksForSubject = currentSubject ? Number(currentSubject.maxMarks) : 100;

                        if (numericVal > maxMarksForSubject) {
                            if (!subjectUpdates.errors) subjectUpdates.errors = true;
                        }

                        if (!subjectUpdates[info.id]) {
                            subjectUpdates[info.id] = [];
                        }
                        subjectUpdates[info.id].push({
                            studentId,
                            marks: numericVal
                        });
                    }
                });
            }

            if (subjectUpdates.errors) {
                showAlert('Import Failed', 'CSV contains marks that exceed the maximum limit for their respective subjects. Please fix the data and try again.', 'error');
                e.target.value = null;
                return; // Abort the entire import
            }

            // Save to DB
            let subjectsProcessed = 0;
            let totalMarksImported = 0;
            Object.keys(subjectUpdates).forEach(subjectId => {
                if (subjectId === 'errors') return; // Skip error flag
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
            <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-10 animate-fadeIn">
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                    <Filter className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Select Exam</h2>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8">
                    <Card className="p-3 sm:p-6 border-l-2 sm:border-l-4 border-l-indigo-500 text-center sm:text-left">
                        <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Total<br className="sm:hidden" /> Exams</p>
                        <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{examStats.total}</p>
                    </Card>
                    <Card className="p-3 sm:p-6 border-l-2 sm:border-l-4 border-l-green-500 text-center sm:text-left">
                        <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Published</p>
                        <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{examStats.published}</p>
                    </Card>
                    <Card className="p-3 sm:p-6 border-l-2 sm:border-l-4 border-l-yellow-500 text-center sm:text-left">
                        <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Drafts</p>
                        <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{examStats.draft}</p>
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
            <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-10 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-10">
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={() => resetSelection('exam')} className="p-1.5 sm:p-2 h-auto rounded-full hover:bg-gray-200 shrink-0">
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Select Class</h2>
                            <p className="text-gray-500 text-sm sm:text-base mt-0.5 sm:mt-1 truncate">Exam: {exams.find(e => e.id === selectedExamId)?.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 sm:gap-3 shrink-0">
                        <Button
                            variant="danger"
                            onClick={handleDeleteAllExamMarks}
                            className="flex items-center gap-1.5 sm:gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete All Marks</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8">
                    <Card className="p-3 sm:p-6 bg-indigo-50 border-indigo-100 text-center sm:text-left">
                        <p className="text-indigo-600 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Assigned<br className="sm:hidden" /> Classes</p>
                        <p className="text-xl sm:text-3xl font-bold text-indigo-900 mt-1 sm:mt-2">{classStats.total}</p>
                    </Card>
                    <Card className="p-3 sm:p-6 bg-green-50 border-green-100 text-center sm:text-left">
                        <p className="text-green-600 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Completed</p>
                        <p className="text-xl sm:text-3xl font-bold text-green-900 mt-1 sm:mt-2">{classStats.completed}</p>
                    </Card>
                    <Card className="p-3 sm:p-6 bg-amber-50 border-amber-100 text-center sm:text-left">
                        <p className="text-amber-600 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Pending</p>
                        <p className="text-xl sm:text-3xl font-bold text-amber-900 mt-1 sm:mt-2">{classStats.pending}</p>
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
                                <div className="flex items-center gap-4 sm:gap-6 min-w-0 pr-2">
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-lg sm:text-xl text-indigo-600">
                                        {cls.name}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg sm:text-xl text-gray-900 truncate">Class {cls.name} - {cls.division}</h3>
                                        <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">{clsSubjects.length} Subjects</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                    {isComplete ? (
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-green-600 font-bold px-2 sm:px-4 py-1.5 sm:py-2 bg-green-50 rounded-lg text-xs sm:text-sm">
                                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Completed</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-amber-600 font-bold px-2 sm:px-4 py-1.5 sm:py-2 bg-amber-50 rounded-lg text-xs sm:text-sm">
                                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Pending</span>
                                        </div>
                                    )}
                                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
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
            <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-10 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 sm:mb-10">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button variant="secondary" onClick={() => resetSelection('class')} className="p-1.5 sm:p-2 h-auto rounded-full hover:bg-gray-200 shrink-0">
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Select Subject</h2>
                            <p className="text-gray-500 text-sm sm:text-base mt-0.5 sm:mt-1 truncate">
                                {exams.find(e => e.id === selectedExamId)?.name} • Class {availableClasses.find(c => c.id === selectedClassId)?.name}-{availableClasses.find(c => c.id === selectedClassId)?.division}
                            </p>
                        </div>
                    </div>

                    {/* CSV Actions */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 md:ml-auto w-full md:w-auto">
                        <Button
                            variant="danger"
                            onClick={handleDeleteAllClassMarks}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 flex-grow sm:flex-none"
                        >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline whitespace-nowrap">Delete All Marks</span>
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleDownloadTemplate}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 flex-grow sm:flex-none"
                        >
                            <Download className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline whitespace-nowrap">Template</span>
                        </Button>
                        <div className="relative flex-grow sm:flex-none w-full sm:w-auto">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleUploadCSV}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                title="Upload CSV"
                            />
                            <Button variant="primary" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 w-full">
                                <Upload className="w-4 h-4 shrink-0" />
                                <span className="hidden sm:inline whitespace-nowrap">Upload CSV</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8">
                    <Card className="p-3 sm:p-6 text-center sm:text-left">
                        <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Total<br className="sm:hidden" /> Subjects</p>
                        <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{subjectStats.total}</p>
                    </Card>
                    <Card className="p-3 sm:p-6 text-center sm:text-left">
                        <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Entered</p>
                        <p className="text-xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{subjectStats.entered}</p>
                    </Card>
                    <Card className="p-3 sm:p-6 text-center sm:text-left">
                        <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider leading-tight">Pending</p>
                        <p className="text-xl sm:text-3xl font-bold text-amber-600 mt-1 sm:mt-2">{subjectStats.pending}</p>
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
                                        className="p-4 sm:p-6 cursor-pointer bg-white hover:bg-gray-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex justify-between items-center sm:items-start gap-2">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-lg sm:text-xl text-gray-900 truncate">{sub.name}</h3>
                                                <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">Max Marks: {sub.maxMarks}</p>
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                                {sub.isEntered ? (
                                                    <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-bold">Entered</span>
                                                ) : (
                                                    <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] sm:text-xs font-bold">Pending</span>
                                                )}
                                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
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
        <div className="p-2 sm:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-8 animate-fadeIn text-sm sm:text-base">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-8 px-2 sm:px-0">
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button variant="secondary" onClick={() => resetSelection('subject')} className="p-1.5 sm:p-2 h-auto rounded-full hover:bg-gray-200 shrink-0">
                        <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">Enter Marks</h2>
                        <p className="text-gray-500 text-xs sm:text-base mt-0 sm:mt-1 truncate">
                            {availableClasses.find(c => c.id === selectedClassId)?.name}-{availableClasses.find(c => c.id === selectedClassId)?.division} • {subjects.find(s => s.id === selectedSubjectId)?.name}
                        </p>
                    </div>
                </div>
            </div>

            <Card className="p-3 sm:p-8 relative">
                {/* Fixed Top Action Bar - Compact on Mobile */}
                <div className="flex flex-row flex-nowrap items-center justify-between bg-white sticky top-0 z-10 pb-3 mb-3 border-b border-gray-100">
                    <div className="text-[10px] sm:text-sm text-gray-600 bg-gray-50 px-2 py-1.5 sm:px-4 sm:py-2 rounded min-w-0 border border-gray-200 font-medium shrink-0 flex items-center">
                        <span className="hidden sm:inline">Total Students:</span>
                        <span className="sm:hidden">Total:</span>
                        <span className="font-bold text-gray-900 ml-1">{classStudents.length}</span>
                    </div>
                    <div className="flex gap-1 sm:gap-3 shrink-0 ml-1">
                        <Button
                            onClick={handleDelete}
                            variant="danger"
                            className="flex items-center justify-center gap-1 sm:gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 font-medium px-2 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-sm"
                        >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Delete Entry</span>
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            variant="primary"
                            className="flex items-center justify-center gap-1 sm:gap-2 font-medium px-3 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-sm whitespace-nowrap"
                        >
                            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Save<span className="hidden sm:inline"> Marks</span></span>
                        </Button>
                    </div>
                </div>

                {/* Table wrapper allowing horizontal scroll to fix clipping issue */}
                <div className="overflow-x-auto rounded-lg sm:rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Reg No</th>
                                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Student<span className="hidden sm:inline"> Name</span></th>
                                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-bold text-gray-500 uppercase tracking-wider w-24 sm:w-40">Marks<span className="hidden sm:inline"> Obtained</span></th>
                                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-bold text-gray-500 uppercase tracking-wider w-16 sm:w-24">Act.</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {classStudents.map(student => {
                                // Check if student has submitted
                                // We can check if their score exists in results?
                                // OR if they have a response in studentResponses (more accurate for "Needs Grading")
                                // But MarksEntry accesses `results`.
                                // Let's just provide the button always, or if mark is entered?
                                // Better: Provide simple "Grade" button.
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell font-mono">{student.registerNo}</td>
                                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{student.name}</span>
                                                <span className="sm:hidden text-[10px] text-gray-400 font-mono mt-0.5">{student.registerNo}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            <input
                                                type="number"
                                                min="0"
                                                max={subjects.find(s => s.id === selectedSubjectId)?.maxMarks || 100}
                                                value={marksData[student.id] || ''}
                                                onChange={e => handleMarkChange(student.id, e.target.value)}
                                                className="w-16 sm:w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm py-1.5 px-2 border transition-colors outline-none font-bold"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-start gap-1 sm:gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="px-1.5 sm:px-3 py-1.5 h-auto text-[10px] sm:text-xs font-bold"
                                                    title="View/Grade submission"
                                                    onClick={() => {
                                                        setCurrentStudentForGrading(student);
                                                        setGradingModalOpen(true);
                                                    }}
                                                >
                                                    <Eye className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">View/Grade</span>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="px-1.5 sm:px-2 py-1.5 h-auto text-amber-600 border-amber-200 hover:bg-amber-50"
                                                    title="Allow Retake"
                                                    onClick={() => handleRetake(student.id)}
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {classStudents.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 sm:py-12 text-center text-gray-500 text-sm sm:text-base">
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
