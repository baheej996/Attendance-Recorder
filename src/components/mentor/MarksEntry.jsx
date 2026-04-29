import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Save, Search, Filter, Trash2, ChevronRight, ArrowLeft, CheckCircle, AlertCircle, Clock, Play, PauseCircle, Eye, EyeOff, Calendar, RotateCcw, Upload, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';
import ExamGradingModal from './ExamGradingModal';

// MarksEntry Component v2.1 - Smart Config Dashboard Update
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

    // Master Heartbeat: Forces UI re-calculation for scheduling every 10 seconds
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 10000);
        return () => clearInterval(timer);
    }, []);

    // Robust Parser: Handles AM/PM, legacy DD-MM-YYYY, and ISO across all browsers
    const parseFlexDate = (val) => {
        if (!val) return null;
        let cleanVal = val.trim();
        
        // Match: 24-04-2026 04:45 PM or 24/04/2026 etc.
        const parts = cleanVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
        if (parts) {
            let [_, d, m, y, h, mins, ampm] = parts;
            h = parseInt(h);
            if (ampm) {
                ampm = ampm.toUpperCase();
                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;
            }
            cleanVal = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.toString().padStart(2, '0')}:${mins}`;
        } else {
            // Fallback for YYYY-MM-DD formats
            cleanVal = cleanVal.replace(' ', 'T');
        }

        try {
            const d = new Date(cleanVal);
            if (isNaN(d.getTime())) return null;
            // Assume IST if no timezone provided
            if (!cleanVal.includes('+') && !cleanVal.includes('Z')) {
                return new Date(cleanVal + ":00+05:30");
            }
            return d;
        } catch (e) {
            return null;
        }
    };
    
    // Now derived from Tick
    const now = new Date();

    // Enhanced Helper: Standard format for native browser inputs
    const formatDateForInput = (val) => {
        const d = parseFlexDate(val);
        if (!d) return '';
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

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

                <div className="grid gap-6">                    {subjectStats.list.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No subjects found for this class.</p>
                        </div>
                    ) : (
                        <div className="grid gap-8">
                            {subjectStats.list.map((sub, index) => {
                                // Prioritize GUID-based setting, fallback to Name-based for legacy support
                                const setting = examSettings.find(s => 
                                    s.examId === selectedExamId && 
                                    s.classId === selectedClassId && 
                                    s.subjectId === sub.id
                                ) || examSettings.find(s => 
                                    s.examId === selectedExamId && 
                                    s.classId === selectedClassId && 
                                    s.subjectId === sub.name
                                ) || { isActive: false, isPublished: false, startTime: '', endTime: '', duration: 0 };

                                const start = parseFlexDate(setting.startTime);
                                const end = parseFlexDate(setting.endTime);
                                const isScheduled = start && now < start;
                                const isCurrentlyActive = setting.isActive || (start && now >= start && (!end || now <= end));

                                const handleToggleActive = (e) => {
                                    e.stopPropagation();
                                    updateExamSetting(selectedExamId, selectedClassId, sub.id, { isActive: !setting.isActive, subjectName: sub.name });
                                };

                                const handleTogglePublish = (e) => {
                                    e.stopPropagation();
                                    updateExamSetting(selectedExamId, selectedClassId, sub.id, { isPublished: !setting.isPublished, subjectName: sub.name });
                                };

                                const handleSettingChange = (type, value) => {
                                    if (type === 'endTime' && setting.startTime && value && value <= setting.startTime) {
                                        showAlert('Invalid Time', 'End time cannot be before or equal to start time.', 'error');
                                        return;
                                    }
                                    updateExamSetting(selectedExamId, selectedClassId, sub.id, { [type]: value, subjectName: sub.name });
                                };

                                return (
                                    <div 
                                        key={sub.id}
                                        className="group bg-white rounded-3xl border border-gray-100 hover:border-indigo-200 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl"
                                    >
                                        <div className="p-6 sm:p-8">
                                            {/* Top Row: Subject Info & Actions */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                                <div className="flex items-center gap-5">
                                                    <div className={clsx(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner",
                                                        sub.isEntered ? "bg-green-50 text-green-600" : "bg-indigo-50 text-indigo-600"
                                                    )}>
                                                        {sub.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-2xl text-gray-900 tracking-tight">{sub.name}</h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Max Marks: {sub.maxMarks}</span>
                                                            {sub.isEntered ? (
                                                                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-md">Entered</span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest rounded-md">Pending</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSubjectId(sub.id);
                                                            setCurrentStudentForGrading(null);
                                                            handleOpenModal(selectedExamId, sub.name, sub.maxMarks);
                                                        }}
                                                        className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95 text-center"
                                                    >
                                                        Enter Marks
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Middle Row: Two Prominent Toggles */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                {/* Status Toggle */}
                                                <button
                                                    onClick={handleToggleActive}
                                                    className={clsx(
                                                        "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest",
                                                        isCurrentlyActive 
                                                            ? "bg-green-50 border-green-200 text-green-700 shadow-sm shadow-green-100" 
                                                            : isScheduled 
                                                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                                                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                                                    )}
                                                >
                                                    {isCurrentlyActive ? (
                                                        <>
                                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                            Active
                                                        </>
                                                    ) : isScheduled ? (
                                                        <>
                                                            <Clock className="w-4 h-4 text-amber-500" />
                                                            Scheduled
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PauseCircle className="w-4 h-4" />
                                                            Inactive
                                                        </>
                                                    )}
                                                </button>

                                                {/* Visibility Toggle */}
                                                <button
                                                    onClick={handleTogglePublish}
                                                    className={clsx(
                                                        "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest",
                                                        setting.isPublished 
                                                            ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                                                            : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                                                    )}
                                                >
                                                    {setting.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    {setting.isPublished ? "Published" : "Hidden"}
                                                </button>
                                            </div>

                                            {/* Bottom Row: Date/Time & Duration */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="bg-white border-2 border-gray-100/50 rounded-2xl p-3 hover:border-gray-200 transition-colors focus-within:border-indigo-300 relative group/input">
                                                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Start Time</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="datetime-local"
                                                            className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none px-1"
                                                            value={formatDateForInput(setting.startTime)}
                                                            onChange={(e) => handleSettingChange('startTime', e.target.value)}
                                                        />
                                                        {setting.startTime && (
                                                            <button 
                                                                onClick={() => handleSettingChange('startTime', '')}
                                                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-white border-2 border-gray-100/50 rounded-2xl p-3 hover:border-gray-200 transition-colors focus-within:border-indigo-300 relative group/input">
                                                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">End Time</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="datetime-local"
                                                            className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none px-1"
                                                            value={formatDateForInput(setting.endTime)}
                                                            onChange={(e) => handleSettingChange('endTime', e.target.value)}
                                                        />
                                                        {setting.endTime && (
                                                            <button 
                                                                onClick={() => handleSettingChange('endTime', '')}
                                                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-white border-2 border-gray-100/50 rounded-2xl p-3 hover:border-gray-200 transition-colors focus-within:border-indigo-300 relative group/input">
                                                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Timer (Mins)</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            placeholder="No Timer"
                                                            className="flex-1 bg-transparent text-sm font-bold text-indigo-700 outline-none px-1"
                                                            value={setting.duration || ''}
                                                            onChange={(e) => handleSettingChange('duration', e.target.value)}
                                                        />
                                                        {setting.duration > 0 && (
                                                            <button 
                                                                onClick={() => handleSettingChange('duration', 0)}
                                                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                    <div className="flex gap-2 sm:gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100 shadow-sm">
                            <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Live Sync</span>
                        </div>
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
