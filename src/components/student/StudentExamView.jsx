import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CheckCircle, Clock, AlertCircle, Eye, XCircle, Image as ImageIcon, Upload, FileText, X, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

const StudentExamView = () => {
    const { exams, questions, currentUser, classes, submitExam, studentResponses, subjects, results, examSettings } = useData();
    const { showAlert, showConfirm } = useUI();
    const [activeExamId, setActiveExamId] = useState(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null); // This is Subject NAME (linked to questions)
    const [answers, setAnswers] = useState({});
    const [attachments, setAttachments] = useState({});
    const [viewingMode, setViewingMode] = useState(false); // false = taking, true = viewing result

    // 1. Resolve Student's Class Name (to match Questions which use Class Name)
    const studentClass = classes.find(c => c.id === currentUser?.classId);
    if (!studentClass) return <div className="p-8 text-center text-gray-500">Class information not found.</div>;
    const studentClassName = studentClass.name;

    // 2. Get Active Exams (Students can take these, regardless of Publication status)
    const activeExams = exams.filter(e => e.isActive);

    // 3. Helper to check if student already took the exam for a subject
    // 3. Helper to check if student already took the exam for a subject (Check by ID)
    const hasTaken = (examId, subjectId) => {
        return studentResponses.some(r =>
            r.examId === examId &&
            r.subjectId === subjectId && // Expecting ID here
            r.studentId === currentUser.id
        );
    };

    // 4. Get Questions for the Active Exam & Subject
    const examQuestions = activeExamId && selectedSubjectId ? questions.filter(q =>
        q.examId === activeExamId &&
        q.classId === studentClassName && // Match by Class Name (shared across divisions)
        q.subjectId === selectedSubjectId
    ) : [];

    // Filter subjects that actually have questions for this exam?
    // Or just show all subjects this student has?
    // Let's list subjects.

    // Group questions by Subject?
    // Better flow: Select Exam -> Select Subject -> Take Test.

    const handleStartExam = (examId, subjectName) => {
        setActiveExamId(examId);
        setSelectedSubjectId(subjectName);
        setSelectedSubjectId(subjectName);
        setAnswers({});
        setAttachments({});
        setViewingMode(false);
    };

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
        showConfirm(
            "Submit Exam",
            "Are you sure you want to submit? You cannot change answers after submission.",
            () => {
                // Resolve Real Subject ID (for results/DB)
                const realSubject = subjects.find(s => s.name === selectedSubjectId && s.classId === currentUser.classId);

                submitExam({
                    examId: activeExamId,
                    subjectId: realSubject ? realSubject.id : selectedSubjectId, // Pass ID for storage
                    subjectName: selectedSubjectId, // Pass Name for Question Grading lookup
                    studentId: currentUser.id,
                    studentId: currentUser.id,
                    answers,
                    attachments
                });

                showAlert("Success", "Exam Submitted Successfully!", "success");
                setActiveExamId(null);
                setSelectedSubjectId(null);
            }
        );
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

                            <h4 className="font-semibold text-gray-700 mb-3">Available Subjects:</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {subjects.filter(s => s.classId === currentUser.classId).map(subj => { // Only show subjects linked to student's specific class ID?
                                    // Actually questions are linked to Class Name.
                                    // But Subjects are linked to Class ID? 
                                    // In DataContext seed: `classId: id1A`.
                                    // So yes, filter subjects by my class ID.
                                    // Then check if questions exist for this subject + exam.

                                    const qCount = questions.filter(q =>
                                        q.examId === exam.id &&
                                        q.classId === studentClassName &&
                                        q.subjectId === subj.name // questions store Subject Name? "English"
                                        // In QuestionBank, value={name} so yes.
                                    ).length;

                                    // Wait, subjectId in questions is Name?
                                    // in QuestionBank: value={name} -> selectedSubjectId -> addQuestion({ subjectId: selectedSubjectId })
                                    // So yes, questions.subjectId is the Name (e.g., "English").

                                    const isDone = hasTaken(exam.id, subj.id); // Check by ID

                                    // Composite Logic for taking exam
                                    // 1. Admin Exam Active (Checked by activeExams filter)
                                    // 2. Mentor Subject Setting Active
                                    // 3. Time Window (if set)
                                    // Lookup using Class ID (UUID) for strict division-level isolation
                                    const setting = examSettings.find(s => s.examId === exam.id && s.classId === currentUser.classId && s.subjectId === subj.name) || { isActive: false, isPublished: false };

                                    const now = new Date();
                                    const start = setting.startTime ? new Date(setting.startTime) : null;
                                    const end = setting.endTime ? new Date(setting.endTime) : null;
                                    const withinTime = (!start || now >= start) && (!end || now <= end);

                                    const canTake = setting.isActive && withinTime;

                                    // Composite Logic for Viewing Results
                                    // 1. Admin Exam Published (exam.status === 'Published')
                                    // 2. Mentor Subject Published (setting.isPublished)
                                    const canViewResults = isDone && exam.status === 'Published' && setting.isPublished;

                                    return (
                                        <div key={subj.id} className="border rounded-lg p-4 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-800">{subj.name}</p>
                                                <p className="text-sm text-gray-500">{qCount} Questions</p>
                                            </div>

                                            <div className="mt-4">
                                                {isDone ? (
                                                    <div className="space-y-2">
                                                        <span className="flex items-center gap-2 text-green-600 font-medium text-sm">
                                                            <CheckCircle className="w-4 h-4" /> Completed
                                                        </span>
                                                        {canViewResults && (
                                                            <Button
                                                                onClick={() => handleViewAnswers(exam.id, subj.name, subj.id)}
                                                                variant="secondary"
                                                                className="w-full text-xs h-8 flex items-center justify-center gap-2"
                                                            >
                                                                <Eye className="w-3 h-3" /> View Answers
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : qCount > 0 ? (
                                                    <Button
                                                        onClick={() => handleStartExam(exam.id, subj.name)}
                                                        variant="primary"
                                                        className="w-full text-sm"
                                                        disabled={!canTake}
                                                        title={!canTake ? "Exam is currently closed by your mentor" : "Start Exam"}
                                                    >
                                                        {canTake ? "Take Exam" : (setting.isActive ? "Scheduled" : "Closed")}
                                                    </Button>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">No Questions</span>
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
                            const isCorrect = isMCQ && myAns === q.correctAnswer;

                            return (
                                <div key={q.id} className={clsx(
                                    "p-6 rounded-xl border relative overflow-hidden",
                                    isMCQ
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
                                            <p className={clsx("font-medium",
                                                isMCQ && (isCorrect ? "text-green-700" : "text-red-700")
                                            )}>
                                                {myAns || "(Skipped)"}
                                                {isMCQ && (isCorrect ? <CheckCircle className="inline w-4 h-4 ml-2" /> : <XCircle className="inline w-4 h-4 ml-2" />)}
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

                                    {((isMCQ && !isCorrect) || (!isMCQ)) && (
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
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => setActiveExamId(null)}
                    className="text-gray-500 hover:text-gray-900 font-medium"
                >
                    &larr; Back to Exams
                </button>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Subject</p>
                    <p className="text-xl font-bold text-indigo-600">{selectedSubjectId}</p>
                </div>
            </div>

            <Card className="p-8">
                <div className="space-y-8">
                    {examQuestions.map((q, idx) => (
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
                                            <label key={i} className={clsx(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                answers[q.id] === opt
                                                    ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200"
                                                    : "bg-white border-gray-200 hover:bg-gray-50"
                                            )}>
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`} // Unique name per question group
                                                    value={opt}
                                                    checked={answers[q.id] === opt}
                                                    onChange={() => handleAnswerChange(q.id, opt)}
                                                    className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                />
                                                <span className="text-gray-700">{opt}</span>
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
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <Button onClick={handleSubmit} variant="primary" className="w-full py-3 text-lg font-bold shadow-lg">
                        Submit Exam
                    </Button>
                </div>
            </Card>
        </div>
    );
};



export default StudentExamView;
