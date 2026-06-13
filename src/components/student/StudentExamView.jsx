import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CheckCircle, Clock, AlertCircle, Eye, XCircle, Image as ImageIcon, Upload, FileText, X, Calendar, Info, Lock, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const StudentExamView = () => {
    const { exams, questions, currentUser, classes, submitExam, studentResponses, subjects, results, examSettings, students, updateStudent, requireFeature } = useData();
    const { showAlert, showConfirm } = useUI();
    const [activeExamId, setActiveExamId] = useState(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null); // This is Subject NAME (linked to questions)
    const [answers, setAnswers] = useState({});
    const [attachments, setAttachments] = useState({});
    const [viewingMode, setViewingMode] = useState(false); // false = taking, true = viewing result

    const studentClass = classes.find(c => c.id === currentUser?.classId);

    React.useEffect(() => {
        const unsubResults = requireFeature('results');
        const unsubActivities = requireFeature('activities');
        return () => {
            unsubResults();
            unsubActivities();
        };
    }, [requireFeature]);
    
    // Unique Device Fingerprint (Stored in browser session)
    const [deviceId] = useState(() => {
        let id = localStorage.getItem('samastha_device_id');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('samastha_device_id', id);
        }
        return id;
    });

    const [timeLeft, setTimeLeft] = useState(null); // in seconds
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
    
    // Now derived from tick re-renders
    const now = new Date();
    // Timer Effect
    useEffect(() => {
        // Restore Session
        const savedSession = localStorage.getItem(`active_exam_session_${currentUser.id}`);
        if (savedSession && !activeExamId) {
            const { examId, subjectName } = JSON.parse(savedSession);
            setActiveExamId(examId);
            setSelectedSubjectId(subjectName);
            setViewingMode(false);
        }
    }, []);

    useEffect(() => {
        if (!activeExamId || !selectedSubjectId || viewingMode || !studentClass) return;

        // Find setting for this specific exam/class/subject
        const setting = examSettings.find(s =>
            s.examId === activeExamId &&
            s.classId === currentUser.classId &&
            (s.subjectId === selectedSubjectId || s.subjectName === selectedSubjectId)
        );

        const durationMins = setting?.duration ? parseInt(setting.duration) : 0;

        if (durationMins > 0) {
            const storageKey = `exam_start_${activeExamId}_${selectedSubjectId}_${currentUser.id}`;
            const storedStart = localStorage.getItem(storageKey);
            let startTime = storedStart ? parseInt(storedStart) : Date.now();

            if (!storedStart) {
                localStorage.setItem(storageKey, startTime.toString());
            }

            const endTime = startTime + (durationMins * 60 * 1000);

            // Immediate update
            const initialDiff = Math.ceil((endTime - Date.now()) / 1000);
            setTimeLeft(initialDiff > 0 ? initialDiff : 0);

            const interval = setInterval(() => {
                const now = Date.now();
                const diff = Math.ceil((endTime - now) / 1000);

                if (diff <= 0) {
                    setTimeLeft(0);
                    clearInterval(interval);
                    handleAutoSubmit();
                } else {
                    setTimeLeft(diff);
                }
            }, 1000);

            return () => clearInterval(interval);
        } else {
            setTimeLeft(null);
        }
    }, [activeExamId, selectedSubjectId, viewingMode, examSettings, studentClass]);

    const handleAutoSubmit = () => {
        showAlert("Time Up!", "Your exam time has ended. Submitting automatically...", "alert");
        confirmSubmit();
    };

    // We need a ref for answers to handle auto-submit correctly from the timer closure
    const answersRef = React.useRef(answers);
    const attachmentsRef = React.useRef(attachments);

    useEffect(() => {
        answersRef.current = answers;
        attachmentsRef.current = attachments;
    }, [answers, attachments]);

    // Redefined AutoSubmit using Refs
    const performAutoSubmit = () => {
        const realSubject = subjects.find(s => s.name === selectedSubjectId && s.classId === currentUser.classId);
        const submissionData = {
            examId: activeExamId,
            subjectId: realSubject ? realSubject.id : selectedSubjectId,
            subjectName: selectedSubjectId,
            studentId: currentUser.id,
            answers: answersRef.current,
            attachments: attachmentsRef.current
        };

        submitExam(submissionData);

        // Clear Storage
        const storageKey = `exam_start_${activeExamId}_${selectedSubjectId}_${currentUser.id}`;
        localStorage.removeItem(storageKey);

        setActiveExamId(null);
        setSelectedSubjectId(null);
    };

    // Keep strict latest ref for interval
    const performAutoSubmitRef = React.useRef(performAutoSubmit);
    useEffect(() => { performAutoSubmitRef.current = performAutoSubmit; });

    // Update the interval to call performAutoSubmit
    useEffect(() => {
        if (!activeExamId || !selectedSubjectId || viewingMode) return;

        const setting = examSettings.find(s => 
            s.examId === activeExamId && 
            s.classId === currentUser.classId && 
            (s.subjectId === selectedSubjectId || s.subjectName === selectedSubjectId)
        );
        const durationMins = setting?.duration ? parseInt(setting.duration) : 0;

        if (durationMins > 0) {
            const storageKey = `exam_start_${activeExamId}_${selectedSubjectId}_${currentUser.id}`;
            const storedStart = localStorage.getItem(storageKey);

            // If we just started (no storage), set it. 
            // Note: handleStartExam might have set it, but safe to check here.
            let startTime = storedStart ? parseInt(storedStart) : Date.now();
            if (!storedStart) {
                localStorage.setItem(storageKey, startTime.toString());
            }

            const endTime = startTime + (durationMins * 60 * 1000);

            const timer = setInterval(() => {
                const now = Date.now();
                const diff = Math.ceil((endTime - now) / 1000);

                if (diff <= 0) {
                    setTimeLeft(0);
                    clearInterval(timer);
                    showAlert("Time Up!", "Your exam time has ended. Your answers are being submitted.", "warn");
                    performAutoSubmitRef.current();
                } else {
                    setTimeLeft(diff);
                }
            }, 1000);

            return () => clearInterval(timer);
        } else {
            setTimeLeft(null);
        }
    }, [activeExamId, selectedSubjectId, viewingMode]); // Removed examSettings from dependency to avoid timer reset if settings update (though they shouldn't mid-exam)

    const formatTime = (seconds) => {
        if (seconds === null) return "";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!studentClass) return <div className="p-8 text-center text-gray-500">Class information not found.</div>;
    const studentClassName = studentClass.name; // Restored for Render usage

    const handleBack = async () => {
        if (activeExamId) {
            // Remove Session Lock
            await updateStudent(currentUser.id, { activeExamSession: null });
        }
        
        localStorage.removeItem(`active_exam_session_${currentUser.id}`);
        setActiveExamId(null);
        setSelectedSubjectId(null);
        setTimeLeft(null);
        setAnswers({});
        setAttachments({});
    };

    const handleStartExam = async (examId, subjectName) => {
        // Find actual subject ID
        const sub = subjects.find(s => s.name === subjectName && s.classId === currentUser.classId);
        if (!sub) return showAlert("Error", "Subject data not found.", "error");

        const studentData = (students || []).find(s => s.id === currentUser.id);

        // Security Check: Prevention of multi-device entry
        if (studentData?.activeExamSession && studentData.activeExamSession.deviceId !== deviceId) {
            showAlert("Access Denied", "An exam session is already active on another device. Please finish that session first.", "error");
            return;
        }

        // Lock Session in Firestore
        await updateStudent(currentUser.id, {
            activeExamSession: {
                examId,
                subjectId: sub.id,
                subjectName,
                deviceId,
                startedAt: new Date().toISOString()
            }
        });

        setActiveExamId(examId);
        setSelectedSubjectId(subjectName);
    };


    // 2. Get Active Exams (Students can take these, regardless of Publication status)
    const activeExams = exams.filter(e => e.isActive);

    // 3. Helper to check if student already took the exam for a subject
    // 3. Helper to check if student already took the exam for a subject (Check by ID)
    // 3. Helper to check if student already took the exam for a subject (Check by ID or Name)
    const hasTaken = (examId, subjectId, subjectName) => {
        return studentResponses.some(r =>
            r.examId == examId &&
            r.studentId === currentUser.id &&
            (r.subjectId === subjectId || (subjectName && r.subjectName === subjectName))
        );
    };

    // 4. Get Questions for the Active Exam & Subject
    const examQuestions = activeExamId && selectedSubjectId ? questions.filter(q => {
        // Find subject info to allow ID matching
        const sub = subjects.find(s => s.name === selectedSubjectId && s.classId === currentUser.classId);
        
        if (q.examId !== activeExamId) return false;
        
        // Match subject by ID or Name
        const subjectMatch = q.subjectId === selectedSubjectId || (sub && q.subjectId === sub.id);
        if (!subjectMatch) return false;
        
        // Backwards compatibility or direct classId match
        if (!q.shareMode) {
            return q.classId === studentClassName || q.classId === currentUser.classId;
        }
        
        // New explicit sharing mode
        if (q.shareMode === 'Batch') return q.classId === studentClassName;
        if (q.shareMode === 'Specific') return q.targetDivisions?.includes(currentUser.classId);
        
        return false;
    }) : [];

    // Filter subjects that actually have questions for this exam?
    // Or just show all subjects this student has?
    // Let's list subjects.

    // Group questions by Subject?
    // Better flow: Select Exam -> Select Subject -> Take Test.

    const handleViewAnswers = (examId, subjectName, subjectId) => {
        setActiveExamId(examId);
        setSelectedSubjectId(subjectName);
        setViewingMode(true);

        // Load existing answers
        const response = studentResponses.find(r =>
            r.examId === examId &&
            r.subjectId === subjectId &&
            r.studentId === currentUser.id
        );
        if (response) {
            setAnswers(response.answers);
            setAttachments(response.attachments || {});
        }
    };

    const handleAnswerChange = (qId, value) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
    };

    const handleFileUpload = (qId, e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachments(prev => ({ ...prev, [qId]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAttachment = (qId) => {
        setAttachments(prev => {
            const next = { ...prev };
            delete next[qId];
            return next;
        });
    };

    const handleSubmit = () => {
        // Validation: Check if all questions are answered
        const unansweredQuestions = examQuestions.filter(q => !answers[q.id]);

        // Auto-save logic handles "Time Up", but for manual verify:
        if (unansweredQuestions.length > 0 && timeLeft > 0) { // Only warn if time remains
            showConfirm("Unanswered Questions", `You have ${unansweredQuestions.length} unanswered questions. Are you sure you want to submit?`, () => {
                confirmSubmit();
            });
        } else {
            confirmSubmit();
        }
    };

    const confirmSubmit = async () => {
        localStorage.removeItem(`active_exam_session_${currentUser.id}`);

        // Clear Timer Storage
        const storageKey = `exam_start_${activeExamId}_${selectedSubjectId}_${currentUser.id}`;
        localStorage.removeItem(storageKey);

        // Lookup correct GUID for subject
        const realSubject = subjects.find(s => s.name === selectedSubjectId && s.classId === currentUser.classId);

        const submission = {
            examId: activeExamId,
            subjectId: realSubject?.id, // Send GUID to match MarksEntry
            subjectName: selectedSubjectId, // Send Name for fallback
            studentId: currentUser.id,
            classId: currentUser.classId, // Required for mentor subscription filter
            answers: answers,
            examName: exams.find(e => e.id === activeExamId)?.name
        };

        try {
            await submitExam(submission);
            
            // Clear Session Lock
            await updateStudent(currentUser.id, { activeExamSession: null });

            showAlert("Submitted", "Your exam has been submitted successfully.", "success");
            handleBack();
        } catch (error) {
            console.error("Submission error:", error);
            showAlert("Failed", "Your submission failed. Please try again.", "error");
        }
    };


    // View: List of Exams
    if (!activeExamId) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-indigo-600" />
                    Active Exams
                </h2>

                {activeExams.length === 0 ? (
                    <div className="p-12 bg-white rounded-xl text-center text-gray-500 shadow-sm border border-gray-100">
                        No active exams at the moment.
                    </div>
                ) : (
                    activeExams.map(exam => (
                        <Card key={exam.id} className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.name}</h3>
                            <p className="text-gray-500 mb-6 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(exam.date).toLocaleDateString()}
                            </p>

                            {exam.instructions && (
                                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-blue-700 uppercase mb-1 tracking-widest">Instructions</p>
                                        <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{exam.instructions}</p>
                                    </div>
                                </div>
                            )}

                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Available Subjects</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {subjects.filter(s => s.classId === currentUser.classId && s.isExamSubject !== false).map(subj => {
                                    const qCount = questions.filter(q => {
                                        if (q.examId !== exam.id) return false;
                                        const cidMatch = (q.classId === studentClassName || q.classId === currentUser.classId);
                                        const sidMatch = (
                                            q.subjectId?.toString().toLowerCase().trim() === subj.name?.toString().toLowerCase().trim() || 
                                            q.subjectId?.toString().toLowerCase().trim() === subj.id?.toString().toLowerCase().trim()
                                        );
                                        return cidMatch && sidMatch;
                                    }).length;

                                    const isDone = hasTaken(exam.id, subj.id, subj.name);
                                    const setting = examSettings.find(s => 
                                        s.examId === exam.id && 
                                        s.classId === currentUser.classId && 
                                        (s.subjectId === subj.id || s.subjectId === subj.name)
                                    ) || { isActive: false, isPublished: false, duration: 0 };

                                    const start = parseFlexDate(setting.startTime);
                                    const end = parseFlexDate(setting.endTime);
                                    
                                    // Automation Logic: 
                                    // If manually Inactive (setting.isActive === false) AND NO schedule, it's disabled.
                                    // If schedule exists, schedule determines status regardless of setting.isActive override if not explicitly 'blocked'.
                                    const hasSchedule = !!start;
                                    const isCurrentlyActive = setting.isActive || (start && now >= start && (!end || now <= end));
                                    const isUpcoming = start && now < start;
                                    const isExpired = end && now > end;
                                    
                                    const hasQuestions = qCount > 0;
                                    const canTake = hasQuestions && isCurrentlyActive;
                                    const canViewResults = isDone && ((exam.status === 'Published' && setting.isPublished) || setting.answersRevealed);

                                    const session = (students || []).find(s => s.id === currentUser.id)?.activeExamSession;
                                    const isLockedByOtherDevice = session && session.deviceId !== deviceId && session.examId === exam.id && (session.subjectId === subj.id || session.subjectName === subj.name);

                                    return (
                                        <div key={subj.id} className={cn(
                                            "bg-gray-50/50 rounded-2xl p-4 border transition-all hover:shadow-sm flex flex-col justify-between",
                                            canTake ? "border-indigo-200 bg-white" : "border-gray-100"
                                        )}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="min-w-0">
                                                    <p className="font-black text-gray-900 leading-tight truncate">{subj.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{qCount} Questions</span>
                                                        {setting.duration > 0 && (
                                                            <>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">{setting.duration} Mins</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {isDone && (
                                                    <span className="shrink-0 p-1 px-2 bg-green-100 text-green-700 text-[10px] font-black rounded-lg uppercase tracking-tighter">Finished</span>
                                                )}
                                            </div>

                                            {/* Time Info / Scheduled Badge */}
                                    {(start || end) && !isDone && (
                                        <div className="mb-4">
                                            {isUpcoming ? (
                                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-amber-600" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Scheduled</span>
                                                        <span className="text-xs font-bold text-amber-600">
                                                            {start.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {end && !isExpired && (
                                                        <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Ends: {end.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                    {isExpired && (
                                                        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                            <XCircle className="w-3 h-3" />
                                                            Expired
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                            <div className="mt-auto">
                                                {isDone ? (
                                                    canViewResults ? (
                                                        <button
                                                            onClick={() => handleViewAnswers(exam.id, subj.name, subj.id)}
                                                            className="w-full py-2 bg-white border border-gray-200 text-indigo-600 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm active:scale-95 transition-all"
                                                        >
                                                            View Answers
                                                        </button>
                                                    ) : (
                                                        <div className="w-full py-2 bg-gray-100 text-gray-400 font-bold text-[10px] text-center uppercase tracking-widest rounded-xl">
                                                            Awaiting Result
                                                        </div>
                                                    )
                                                ) : isLockedByOtherDevice ? (
                                                    <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase border border-amber-100 leading-tight">
                                                        <Lock className="w-3.5 h-3.5 shrink-0" />
                                                        Active elsewhere
                                                    </div>
                                                ) : hasQuestions ? (
                                                    <button
                                                        onClick={() => handleStartExam(exam.id, subj.name)}
                                                        disabled={!canTake}
                                                        className={cn(
                                                            "w-full py-2.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md",
                                                            canTake 
                                                                ? "bg-indigo-600 text-white shadow-indigo-100" 
                                                                : "bg-gray-200 text-gray-400 border border-gray-100 shadow-none cursor-not-allowed"
                                                        )}
                                                    >
                                                        {canTake ? "Start Exam" : (
                                                            !hasQuestions ? "No Questions" :
                                                            isUpcoming ? "Scheduled" : 
                                                            isExpired ? "Expired" : "Disabled"
                                                        )}
                                                    </button>
                                                ) : (
                                                    <div className="w-full py-2 bg-gray-100 text-gray-400 font-bold text-[10px] text-center uppercase tracking-widest rounded-xl">
                                                        No Questions
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        );
    }

    // View: Answer Sheet (Read Only)
    if (viewingMode) {
        // Calculate Total Score for display
        // We can get it from 'results' or calculate on fly? 
        // results is array: { examId, subjectId... marks }
        // Find result:
        const realSubj = subjects.find(s => s.name === selectedSubjectId && s.classId === currentUser.classId);
        const myResult = results.find(r =>
            r.examId === activeExamId &&
            r.subjectId === realSubj?.id &&
            r.studentId === currentUser.id
        );

        const setting = examSettings.find(s => 
            s.examId === activeExamId && 
            s.classId === currentUser.classId && 
            s.subjectId === realSubj?.id
        ) || examSettings.find(s => 
            s.examId === activeExamId && 
            (s.classId === currentUser.classId || s.classId === studentClassName) && 
            (s.subjectId === selectedSubjectId || s.subjectId === realSubj?.name)
        ) || {};

        const isRevealed = setting.answersRevealed === true;

        return (
            <div className="max-w-4xl mx-auto pb-12">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setActiveExamId(null)}
                        className="text-gray-500 hover:text-gray-900 font-medium"
                    >
                        &larr; Back to Exams
                    </button>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Subject: {selectedSubjectId}</p>
                        <p className="text-xl font-bold text-indigo-600">
                            Score: {myResult ? myResult.marks : 'Pending'}
                        </p>
                    </div>
                </div>

                <Card className="p-8 border-t-4 border-t-indigo-500">
                    <h2 className="text-2xl font-bold mb-6">Answer Sheet</h2>
                    <div className="space-y-8">
                        {examQuestions.map((q, idx) => {
                            const myAns = answers[q.id];
                            const isMCQ = q.type === 'MCQ';
                            const isCorrect = isMCQ && q.correctAnswer === myAns;

                            return (
                                <div key={q.id} className={cn(
                                    "p-6 rounded-xl border relative overflow-hidden",
                                    isRevealed && isMCQ
                                        ? (isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")
                                        : "bg-gray-50 border-gray-200"
                                )}>
                                    <div className="flex gap-3 mb-4">
                                        <span className="font-bold text-gray-500 text-lg">Q{idx + 1}.</span>
                                        <div className="flex-1">
                                            <p className="text-lg font-medium text-gray-900">{q.text}</p>
                                            <p className="text-xs text-gray-500 mt-1">{q.marks} Marks</p>
                                        </div>
                                    </div>

                                    <div className="pl-8 space-y-4">
                                        <div className="bg-white/50 p-3 rounded-lg">
                                            <p className="text-xs uppercase font-bold text-gray-500 mb-1">Your Answer:</p>
                                            <p className={cn("font-medium",
                                                isRevealed && isMCQ && (isCorrect ? "text-green-700" : "text-red-700")
                                            )}>
                                                {myAns || "(Skipped)"}
                                                {isRevealed && isMCQ && (isCorrect ? <CheckCircle className="inline w-4 h-4 ml-2" /> : <XCircle className="inline w-4 h-4 ml-2" />)}
                                            </p>

                                            {/* Show Attachment if exists */}
                                            {attachments[q.id] && (
                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Attachment</p>
                                                    {attachments[q.id].startsWith('data:image') ? (
                                                        <img src={attachments[q.id]} alt="Student Attachment" className="max-h-48 rounded-lg border border-gray-200" />
                                                    ) : (
                                                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border text-sm text-gray-600">
                                                            <FileText className="w-4 h-4" />
                                                            <span>Attached File (Download not supported in demo)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isRevealed && ((isMCQ && !isCorrect) || (!isMCQ)) && (
                                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                            {isMCQ ? (
                                                <>
                                                    <p className="text-xs uppercase font-bold text-indigo-600 mb-1">Correct Answer:</p>
                                                    <p className="font-bold text-indigo-900">{q.correctAnswer}</p>
                                                </>
                                            ) : (
                                                <p className="text-xs text-indigo-600 italic">
                                                    Note: Text answers are graded manually by your mentor.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                            );
                        })}
                    </div>
                </Card >
            </div >
        );
    }

    // View: Taking Exam
    return (
        <div className="max-w-4xl mx-auto pb-12 relative">
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur pt-4 pb-4 mb-6 border-b border-gray-100 flex items-center justify-between shadow-sm -mx-4 px-6 rounded-b-xl">
                <div className="flex items-center gap-6">
                    {viewingMode && (
                        <button
                            onClick={handleBack}
                            className="text-gray-500 hover:text-gray-900 font-medium"
                        >
                            &larr; Back to Exams
                        </button>
                    )}
                    {timeLeft !== null && !viewingMode && (
                        <div className={`flex items-center gap-2 px-6 py-3 rounded-full text-2xl font-bold border shadow-sm ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                            <Clock className="w-6 h-6" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Subject</p>
                    <div className="flex items-center gap-3">
                        <p className="text-xl font-bold text-indigo-600">{selectedSubjectId}</p>
                    </div>
                </div>
            </div>

            <Card className="p-8">
                <div className="space-y-8">
                    {examQuestions.map((q, idx) => {
                        return (
                            <div key={q.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex gap-3 mb-4">
                                    <span className="font-bold text-gray-500 text-lg">Q{idx + 1}.</span>
                                    <div className="flex-1">
                                        <p className="text-lg font-medium text-gray-900">{q.text}</p>
                                        <p className="text-xs text-gray-400 mt-1">{q.marks} Marks</p>
                                        {q.image && (
                                            <div className="mt-3">
                                                <img src={q.image} alt="Question Reference" className="max-h-64 rounded-lg border border-gray-200" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pl-8">
                                    {q.type === 'MCQ' ? (
                                        <div className="space-y-2">
                                            {q.options.map((opt, i) => (
                                                <label key={i} className={cn(
                                                    "flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-95 cursor-pointer touch-manipulation",
                                                    answers[q.id] === opt
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-200"
                                                        : "bg-white border-gray-100 text-gray-700 hover:border-indigo-200 shadow-sm"
                                                )}>
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                                                        answers[q.id] === opt ? "bg-white border-white" : "border-gray-200"
                                                    )}>
                                                        {answers[q.id] === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                                                    </div>
                                                    <span className="text-sm font-bold">{opt}</span>
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        value={opt}
                                                        checked={answers[q.id] === opt}
                                                        onChange={() => handleAnswerChange(q.id, opt)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            rows={4}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="Type your answer here..."
                                            value={answers[q.id] || ''}
                                            onChange={e => handleAnswerChange(q.id, e.target.value)}
                                        />
                                    )}

                                    {q.allowAttachments && (
                                        <div className="mt-4 border-t border-gray-100 pt-3">
                                            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Attach File (Optional)</label>

                                            {!attachments[q.id] ? (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="file"
                                                        id={`file-${q.id}`}
                                                        className="hidden"
                                                        accept="image/*,.pdf,.doc,.docx"
                                                        onChange={(e) => handleFileUpload(q.id, e)}
                                                    />
                                                    <label
                                                        htmlFor={`file-${q.id}`}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 cursor-pointer shadow-sm transition-colors"
                                                    >
                                                        <Upload className="w-3 h-3" />
                                                        Upload Attachment
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 w-fit">
                                                    <FileText className="w-4 h-4 text-indigo-600" />
                                                    <span className="text-sm text-indigo-700 font-medium">File Attached</span>
                                                    <button
                                                        onClick={() => removeAttachment(q.id)}
                                                        className="ml-2 p-1 hover:bg-indigo-100 rounded-full text-indigo-400 hover:text-indigo-700 transition-colors"
                                                        title="Remove File"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <Button onClick={handleSubmit} variant="primary" className="w-full py-3 text-lg font-bold shadow-lg">
                        Submit Exam
                    </Button>
                </div>
            </Card>
        </div >
    );
};



export default StudentExamView;
