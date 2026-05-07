import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    Users, 
    MessageCircle, 
    Settings, 
    CheckCircle, 
    XCircle, 
    Search, 
    ChevronRight, 
    Save, 
    Eye, 
    EyeOff,
    Filter,
    Calendar,
    Download,
    User,
    Check,
    Info,
    Layout,
    FileText,
    ArrowLeft,
    HelpCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import EvaluationManager from '../admin/EvaluationManager';

const StudentAssessment = () => {
    const { 
        students, 
        classes, 
        currentUser, 
        studentEvaluations, 
        addStudentEvaluation, 
        updateStudentEvaluation, 
        parentFeedbacks,
        feedbackSettings,
        updateFeedbackSettings,
        studentEvaluationTemplates,
        parentFeedbackTemplates
    } = useData();

    const [activeTab, setActiveTab] = useState('evaluations');
    const [selectedFormType, setSelectedFormType] = useState('student');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Mentor classes
    const mentorClasses = useMemo(() => 
        classes.filter(c => currentUser?.assignedClassIds?.includes(c.id)),
    [classes, currentUser]);

    // Force first class if none selected
    const [selectedClassId, setSelectedClassId] = useState(mentorClasses[0]?.id || '');

    useEffect(() => {
        if (!selectedClassId && mentorClasses.length > 0) {
            setSelectedClassId(mentorClasses[0].id);
        }
    }, [mentorClasses, selectedClassId]);

    const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Dynamic Form State
    const [responses, setResponses] = useState({});
    const [uploadProgress, setUploadProgress] = useState({});

    const handleFileUpload = async (qId, file) => {
        if (!file) return;
        const { storage } = await import('../../firebase');
        const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
        
        try {
            const fileRef = ref(storage, `student_evaluations/${selectedMonth}_${selectedYear}/${selectedStudent.id}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, [qId]: progress }));
                },
                (error) => {
                    console.error("Upload failing:", error);
                    alert("Upload failed. Please try again.");
                    setUploadProgress(prev => { const n = {...prev}; delete n[qId]; return n; });
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setResponses(prev => ({ ...prev, [qId]: { url: downloadURL, name: file.name, type: file.type } }));
                    setUploadProgress(prev => { const n = {...prev}; delete n[qId]; return n; });
                }
            );
        } catch (error) {
            console.error(error);
            alert("Storage connection error.");
        }
    };

    const activeTemplate = useMemo(() => {
        if (activeTab === 'evaluations') {
            return (studentEvaluationTemplates || []).find(t => t.month === selectedMonth && t.year === selectedYear && t.status === 'Published') 
                   || (studentEvaluationTemplates || []).find(t => t.month === selectedMonth && t.year === selectedYear) 
                   || null;
        }
        return null;
    }, [studentEvaluationTemplates, selectedMonth, selectedYear, activeTab]);

    const filteredStudents = useMemo(() => {
        let result = students.filter(s => s.classId === selectedClassId);
        if (searchQuery) {
            result = result.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [students, selectedClassId, searchQuery]);

    const currentSettings = useMemo(() => 
        feedbackSettings.find(s => s.classId === selectedClassId) || { 
            classId: selectedClassId, 
            evaluationEnabled: false, 
            feedbackEnabled: false
        }
    , [feedbackSettings, selectedClassId]);

    const handleToggleSetting = (key) => {
        if (!selectedClassId) return;
        updateFeedbackSettings(selectedClassId, { ...currentSettings, [key]: !currentSettings[key] });
    };

    const openEvaluationForm = (student) => {
        if (!activeTemplate) {
            alert(`No template found for ${selectedMonth} ${selectedYear}. Please create one in the 'Manage Forms' tab.`);
            return;
        }
        const existing = studentEvaluations.find(e => e.studentId === student.id && e.month === selectedMonth && e.year === selectedYear);
        setSelectedStudent(student);
        if (existing) {
            setResponses(existing.responses || {});
        } else {
            setResponses({});
        }
        setIsEditing(true);
    };

    const handleSaveEvaluation = async (statusOverride) => {
        const status = statusOverride || 'Published';
        const evaluationData = {
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            mentorId: currentUser.id,
            classId: selectedStudent.classId,
            month: selectedMonth,
            year: selectedYear,
            templateId: activeTemplate.id,
            responses,
            status,
            date: new Date().toISOString(),
            teacherName: currentUser.name
        };

        const existing = studentEvaluations.find(e => e.studentId === selectedStudent.id && e.month === selectedMonth && e.year === selectedYear);
        if (existing) {
            await updateStudentEvaluation(existing.id, evaluationData);
        } else {
            await addStudentEvaluation(evaluationData);
        }
        setIsEditing(false);
        setSelectedStudent(null);
    };

    // Helper to check if a question should be visible
    const isQuestionVisible = (question) => {
        if (!question.logic || !question.logic.showIf) return true;
        const { questionId, value } = question.logic.showIf;
        const triggerAnswer = responses[questionId];
        return triggerAnswer === value;
    };

    const renderQuestion = (q) => {
        if (!isQuestionVisible(q)) return null;

        return (
            <div key={q.id} className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                    {q.label}
                    {q.required && <span className="text-red-500">*</span>}
                    {q.logic?.showIf && <HelpCircle className="w-3 h-3 text-amber-400" title="This field is conditionally visible." />}
                </label>

                {q.type === 'radio' && (
                    <div className="flex flex-wrap gap-3">
                        {q.options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setResponses({...responses, [q.id]: opt})}
                                className={clsx(
                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                    responses[q.id] === opt 
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                                        : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-white hover:border-indigo-200"
                                )}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}

                {q.type === 'checkbox' && (
                    <div className="flex flex-wrap gap-3">
                        {q.options.map(opt => {
                            const current = responses[q.id] || [];
                            const isSelected = current.includes(opt);
                            return (
                                <button
                                    key={opt}
                                    onClick={() => {
                                        const next = isSelected ? current.filter(i => i !== opt) : [...current, opt];
                                        setResponses({...responses, [q.id]: next});
                                    }}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                        isSelected 
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                                            : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-white hover:border-indigo-200"
                                    )}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                )}

                {q.type === 'rating' && (
                    <div className="space-y-2">
                        <input 
                            type="range" 
                            min={q.min || 1} 
                            max={q.max || 10} 
                            className="w-full accent-indigo-600"
                            value={responses[q.id] || q.min || 1}
                            onChange={(e) => setResponses({...responses, [q.id]: e.target.value})}
                        />
                        <div className="flex justify-between text-xs font-black text-indigo-600">
                            <span>{q.min || 1}</span>
                            <span className="bg-indigo-100 px-3 py-1 rounded-full">{responses[q.id] || q.min || 1}</span>
                            <span>{q.max || 10}</span>
                        </div>
                    </div>
                )}

                {q.type === 'short_answer' && (
                    <input 
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Type here..."
                        value={responses[q.id] || ''}
                        onChange={(e) => setResponses({...responses, [q.id]: e.target.value})}
                    />
                )}

                {q.type === 'paragraph' && (
                    <textarea 
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                        placeholder="Type detailed notes here..."
                        value={responses[q.id] || ''}
                        onChange={(e) => setResponses({...responses, [q.id]: e.target.value})}
                    />
                )}

                {q.type === 'file' && (
                    <div className="space-y-2">
                        {responses[q.id] ? (
                            <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span className="text-sm font-bold text-gray-700 truncate">{responses[q.id].name}</span>
                                </div>
                                <button 
                                    onClick={() => setResponses(prev => { const n = {...prev}; delete n[q.id]; return n; })}
                                    className="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        ) : uploadProgress[q.id] ? (
                            <div className="w-full space-y-1">
                                <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase">
                                    <span>Uploading...</span>
                                    <span>{Math.round(uploadProgress[q.id])}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress[q.id]}%` }} />
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <input 
                                    type="file"
                                    id={`eval-file-${q.id}`}
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(q.id, e.target.files[0])}
                                />
                                <label 
                                    htmlFor={`eval-file-${q.id}`}
                                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                                >
                                    <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                                    <span className="text-sm font-bold text-gray-500 group-hover:text-indigo-700">
                                        Attach Document
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (isEditing && selectedStudent && activeTemplate) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                    <div>
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="text-indigo-600 font-bold flex items-center gap-1 mb-2 hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Student List
                        </button>
                        <h2 className="text-2xl font-black text-gray-900">{activeTemplate.title}</h2>
                        <p className="text-gray-500 font-medium">Evaluating {selectedStudent.name} for {selectedMonth} {selectedYear}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => handleSaveEvaluation('Draft')}>Save as Draft</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleSaveEvaluation('Published')}>Publish Report</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {activeTemplate.sections.map((sec) => (
                        <Card key={sec.id} className="p-6 space-y-6 border-t-4 border-t-indigo-500">
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                                <Layout className="w-5 h-5 text-indigo-400" />
                                {sec.title}
                            </h3>
                            <div className="space-y-6">
                                {sec.questions.map(renderQuestion)}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Assessment & Feedback</h1>
                    <p className="text-gray-500 font-medium">Manage student evaluations and view parent feedback.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit self-start overflow-x-auto max-w-full">
                    {[
                        { id: 'evaluations', label: 'Evaluations', icon: CheckCircle },
                        { id: 'feedback', label: 'Parent Feedback', icon: MessageCircle },
                        { id: 'forms', label: 'Manage Forms', icon: FileText },
                        { id: 'settings', label: 'Access Control', icon: Settings }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "bg-white text-indigo-600 shadow-sm" 
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Tabs */}
            {activeTab === 'evaluations' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Toolbar */}
                    <Card className="p-4 flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search student by name..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <select 
                                    className="p-2 bg-transparent font-bold text-sm text-gray-700 outline-none"
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                >
                                    {mentorClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                                <select 
                                    className="p-2 bg-transparent font-bold text-sm text-indigo-600 outline-none"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <select 
                                    className="p-2 bg-transparent font-bold text-sm text-indigo-600 outline-none"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y.toString()}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Template Notice */}
                    {!activeTemplate && (
                        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-amber-900">No Evaluation Form for {selectedMonth} {selectedYear}</h4>
                                    <p className="text-sm text-amber-700 font-medium">You need to create a student evaluation template for this month before you can start evaluating.</p>
                                </div>
                            </div>
                            <Button 
                                variant="secondary" 
                                className="bg-amber-600 text-white hover:bg-amber-700 border-none"
                                onClick={() => setActiveTab('forms')}
                            >
                                Create Template Now
                            </Button>
                        </div>
                    )}

                    {/* Student List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStudents.map(student => {
                            const evaluation = studentEvaluations.find(e => e.studentId === student.id && e.month === selectedMonth && e.year === selectedYear);
                            const isPublished = evaluation?.status === 'Published';
                            const isDraft = evaluation?.status === 'Draft';

                            return (
                                <Card 
                                    key={student.id} 
                                    className={clsx(
                                        "p-5 hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden",
                                        !activeTemplate && "opacity-60 cursor-not-allowed"
                                    )}
                                    onClick={() => activeTemplate && openEvaluationForm(student)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                                                {student.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{student.name}</h4>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                                    Roll No: {student.rollNo || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        {isPublished ? (
                                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Published</span>
                                        ) : isDraft ? (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Draft</span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Pending</span>
                                        )}
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            {evaluation ? `Updated: ${new Date(evaluation.date).toLocaleDateString()}` : 'Click to evaluate'}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                    {filteredStudents.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">No students found</h3>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'forms' && (
                <div className="animate-in fade-in duration-300">
                    <Card className="p-1 overflow-hidden">
                        <div className="flex bg-gray-100 p-1 border-b">
                            <button 
                                className={clsx("flex-1 py-2 px-4 text-xs font-black uppercase tracking-widest transition-all rounded-lg", selectedFormType === 'student' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:bg-gray-200")}
                                onClick={() => setSelectedFormType('student')}
                            >
                                Student Evaluation Forms
                            </button>
                            <button 
                                className={clsx("flex-1 py-2 px-4 text-xs font-black uppercase tracking-widest transition-all rounded-lg", selectedFormType === 'parent' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:bg-gray-200")}
                                onClick={() => setSelectedFormType('parent')}
                            >
                                Parent Feedback Forms
                            </button>
                        </div>
                        <div className="p-6">
                            <EvaluationManager type={selectedFormType} />
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'feedback' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-gray-900">Responses from Parents</h3>
                        <Button 
                            className="flex items-center gap-2 text-indigo-600 bg-indigo-50 border-none hover:bg-indigo-100"
                        >
                            <Download className="w-4 h-4" /> Export Feedback
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {parentFeedbacks.filter(f => f.classId === selectedClassId).length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">No feedback submitted yet</h3>
                                <p className="text-sm text-gray-400 mt-2">Ensure the feedback form is enabled in the settings.</p>
                            </div>
                        ) : (
                            parentFeedbacks
                                .filter(f => f.classId === selectedClassId)
                                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                                .map(feedback => {
                                    const template = (parentFeedbackTemplates || []).find(t => t.id === feedback.templateId);
                                    const questions = template ? template.sections.flatMap(s => s.questions) : [];

                                    return (
                                        <Card key={feedback.id} className="p-6 overflow-hidden">
                                            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                                        <User className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-gray-900">{feedback.parentName || 'Parent'}</h4>
                                                        <p className="text-sm text-indigo-600 font-bold uppercase tracking-tight">
                                                            Feedback for: <span className="text-gray-900">{feedback.studentName}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-gray-400 uppercase tracking-[0.1em] mb-1">Submitted On</div>
                                                    <div className="text-sm font-bold text-gray-700">{new Date(feedback.submittedAt).toLocaleDateString()}</div>
                                                    {template && <div className="text-[10px] font-black text-indigo-400 uppercase mt-1">{template.title}</div>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                {Object.entries(feedback.responses || {}).map(([qId, answer]) => {
                                                    const question = questions.find(q => q.id === qId);
                                                    const label = question ? question.label : `Question ${qId}`;
                                                    
                                                    return (
                                                        <div key={qId} className="space-y-1">
                                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{label}</p>
                                                            <p className="text-sm font-bold text-gray-800">
                                                                {typeof answer === 'object' && answer !== null 
                                                                    ? (answer.answer || JSON.stringify(answer)) 
                                                                    : (Array.isArray(answer) ? answer.join(', ') : answer.toString())
                                                                }
                                                            </p>
                                                            {answer?.details && (
                                                                <div className="mt-1 flex items-start gap-2 bg-red-50 p-2 rounded-lg border border-red-100">
                                                                    <Info className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                                                    <p className="text-xs text-red-600 font-medium italic">"{answer.details}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    );
                                })
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
                    <div className="text-center space-y-2 mb-8">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Settings className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">Class Access Settings</h3>
                        <p className="text-gray-500 font-medium">Control which features are available to students and parents.</p>
                    </div>

                    <Card className="p-1 shadow-xl overflow-hidden border-indigo-50">
                        <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-black text-gray-500 uppercase tracking-widest">Select Class</span>
                            </div>
                            <select 
                                className="p-2 bg-white border border-gray-200 rounded-lg font-bold text-sm text-indigo-600 outline-none"
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                            >
                                {mentorClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                ))}
                            </select>
                        </div>

                        <div className="p-6 space-y-8">
                            <div className="flex items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <h4 className="font-black text-gray-900 flex items-center gap-2">
                                        Student Evaluation Reports
                                        {currentSettings.evaluationEnabled ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                                    </h4>
                                    <p className="text-sm text-gray-500 font-medium">Allow students to view their individual assessment cards once published.</p>
                                </div>
                                <button 
                                    onClick={() => handleToggleSetting('evaluationEnabled')}
                                    className={clsx(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                        currentSettings.evaluationEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                                    )}
                                >
                                    <span className={clsx(
                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                        currentSettings.evaluationEnabled ? 'translate-x-6' : 'translate-x-1'
                                    )} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between gap-6 pt-6 border-t">
                                <div className="space-y-1">
                                    <h4 className="font-black text-gray-900 flex items-center gap-2">
                                        Parent Feedback Form
                                        {currentSettings.feedbackEnabled ? <MessageCircle className="w-4 h-4 text-indigo-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                                    </h4>
                                    <p className="text-sm text-gray-500 font-medium">Open the feedback portal for parents in the Student Panel.</p>
                                </div>
                                <button 
                                    onClick={() => handleToggleSetting('feedbackEnabled')}
                                    className={clsx(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                        currentSettings.feedbackEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                                    )}
                                >
                                    <span className={clsx(
                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                        currentSettings.feedbackEnabled ? 'translate-x-6' : 'translate-x-1'
                                    )} />
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default StudentAssessment;
