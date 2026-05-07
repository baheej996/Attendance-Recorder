import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    MessageCircle, 
    CheckCircle, 
    AlertTriangle, 
    ChevronRight, 
    Star, 
    Award, 
    Calendar, 
    BookOpen, 
    User,
    Globe,
    HelpCircle,
    Send,
    Layout,
    Info
} from 'lucide-react';
import { clsx } from 'clsx';

const FeedbackPortal = () => {
    const { 
        currentUser, 
        studentEvaluations, 
        feedbackSettings, 
        addParentFeedback,
        parentFeedbacks,
        classes,
        studentEvaluationTemplates,
        parentFeedbackTemplates
    } = useData();

    // Get settings for the student's class
    const settings = useMemo(() => 
        feedbackSettings.find(s => s.classId === currentUser.classId) || {
            evaluationEnabled: false,
            feedbackEnabled: false
        }
    , [feedbackSettings, currentUser.classId]);

    // Get all published evaluations for this student
    const allEvaluations = useMemo(() => 
        [...studentEvaluations]
            .filter(e => e.studentId === currentUser.id && e.status === 'Published')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
    , [studentEvaluations, currentUser.id]);

    const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);

    // Set initial selected evaluation to the latest
    useEffect(() => {
        if (allEvaluations.length > 0 && !selectedEvaluationId) {
            setSelectedEvaluationId(allEvaluations[0].id);
        }
    }, [allEvaluations, selectedEvaluationId]);

    const evaluation = useMemo(() => 
        allEvaluations.find(e => e.id === selectedEvaluationId) || allEvaluations[0]
    , [allEvaluations, selectedEvaluationId]);

    const [uploadProgress, setUploadProgress] = useState({});

    const handleFileUpload = async (qId, file) => {
        if (!file) return;
        const { storage } = await import('../../firebase');
        const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
        
        try {
            const fileRef = ref(storage, `parent_feedback/${currentUser.classId}/${currentUser.id}/${Date.now()}_${file.name}`);
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

    // Match evaluation with its template
    const evaluationTemplate = useMemo(() => {
        if (!evaluation) return null;
        return (studentEvaluationTemplates || []).find(t => t.id === evaluation.templateId) ||
               (studentEvaluationTemplates || []).find(t => t.month === evaluation.month && t.year === evaluation.year);
    }, [evaluation, studentEvaluationTemplates]);

    // Get current published parent template
    const activeParentTemplate = useMemo(() => {
        return (parentFeedbackTemplates || []).find(t => t.status === 'Published') || 
               (parentFeedbackTemplates || [])[0];
    }, [parentFeedbackTemplates]);

    // Check if feedback already submitted for THIS month/template
    const hasSubmittedFeedback = useMemo(() => {
        if (!activeParentTemplate) return false;
        return parentFeedbacks.some(f => f.studentId === currentUser.id && f.templateId === activeParentTemplate.id);
    }, [parentFeedbacks, currentUser.id, activeParentTemplate]);

    const [activeView, setActiveView] = useState('evaluation');

    useEffect(() => {
        if (!settings.evaluationEnabled && settings.feedbackEnabled) {
            setActiveView('form');
        }
    }, [settings]);
    
    // Dynamic Form State
    const [responses, setResponses] = useState({});
    const [parentName, setParentName] = useState(currentUser.fatherName || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const isQuestionVisible = (question) => {
        if (!question.logic || !question.logic.showIf) return true;
        const { questionId, value } = question.logic.showIf;
        const triggerAnswer = responses[questionId];
        return triggerAnswer === value;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeParentTemplate) return;
        
        setIsSubmitting(true);
        try {
            const studentClass = classes.find(c => c.id === currentUser.classId);
            const feedbackData = {
                studentId: currentUser.id,
                studentName: currentUser.name,
                classId: currentUser.classId,
                className: studentClass?.name || 'Unknown',
                division: studentClass?.division || 'Unknown',
                country: currentUser.livingCountry || 'Unknown',
                parentName,
                templateId: activeParentTemplate.id,
                submittedAt: new Date().toISOString(),
                responses
            };
            await addParentFeedback(feedbackData);
            setSubmitSuccess(true);
        } catch (error) {
            console.error("Error submitting feedback:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderQuestion = (q) => {
        if (!isQuestionVisible(q)) return null;

        return (
            <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-top-1">
                <p className="text-gray-900 font-black flex items-center gap-2">
                    {q.label}
                    {q.required && <span className="text-red-500">*</span>}
                </p>

                {q.type === 'radio' && (
                    <div className="flex flex-wrap gap-3">
                        {q.options.map(opt => (
                            <button 
                                key={opt} type="button"
                                onClick={() => setResponses({...responses, [q.id]: opt})}
                                className={clsx(
                                    "px-6 py-2 rounded-xl font-bold text-sm transition-all border-2",
                                    responses[q.id] === opt ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-white border-gray-100 text-gray-500 hover:border-indigo-200"
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
                                    key={opt} type="button"
                                    onClick={() => {
                                        const next = isSelected ? current.filter(i => i !== opt) : [...current, opt];
                                        setResponses({...responses, [q.id]: next});
                                    }}
                                    className={clsx(
                                        "px-6 py-2 rounded-xl font-bold text-sm transition-all border-2",
                                        isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-white border-gray-100 text-gray-500 hover:border-indigo-200"
                                    )}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                )}

                {q.type === 'rating' && (
                    <div className="space-y-2 max-w-md">
                        <input 
                            type="range" min={q.min || 1} max={q.max || 10} 
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
                        required={q.required}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Type your answer..."
                        value={responses[q.id] || ''}
                        onChange={(e) => setResponses({...responses, [q.id]: e.target.value})}
                    />
                )}

                {q.type === 'paragraph' && (
                    <textarea 
                        required={q.required}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32"
                        placeholder="Write in detail..."
                        value={responses[q.id] || ''}
                        onChange={(e) => setResponses({...responses, [q.id]: e.target.value})}
                    />
                )}

                {q.type === 'file' && (
                    <div className="flex flex-col gap-2">
                        {responses[q.id] ? (
                            <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-black text-gray-900 truncate">{responses[q.id].name}</p>
                                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Document Attached</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setResponses(prev => { const n = {...prev}; delete n[q.id]; return n; })}
                                    className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        ) : uploadProgress[q.id] ? (
                            <div className="p-8 border-2 border-indigo-100 rounded-2xl bg-indigo-50/30 space-y-3">
                                <div className="flex justify-between text-xs font-black text-indigo-600 uppercase tracking-widest">
                                    <span>Uploading File...</span>
                                    <span>{Math.round(uploadProgress[q.id])}%</span>
                                </div>
                                <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress[q.id]}%` }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <input 
                                    type="file"
                                    id={`file-${q.id}`}
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(q.id, e.target.files[0])}
                                />
                                <label 
                                    htmlFor={`file-${q.id}`}
                                    className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                                >
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-indigo-100 transition-colors">
                                            <Send className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 rotate-45" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500">Click to upload document</p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">PDF, JPG, PNG (Max 5MB)</p>
                                    </div>
                                </label>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!settings.evaluationEnabled && !settings.feedbackEnabled) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
                    <MessageCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Feedback Portal Closed</h2>
                <p className="text-gray-500 max-w-md font-medium">
                    The portal is currently offline. Please check back later when assessments are published.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Navigation Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Feedback & Progress</h1>
                    <p className="text-gray-500 font-medium">View your academic assessment and provide feedback.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit self-start">
                    {settings.evaluationEnabled && (
                        <button
                            onClick={() => setActiveView('evaluation')}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                activeView === 'evaluation' 
                                    ? "bg-white text-indigo-600 shadow-sm" 
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Award className="w-4 h-4" />
                            Academic Report
                        </button>
                    )}
                    {settings.feedbackEnabled && (
                        <button
                            onClick={() => setActiveView('form')}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                activeView === 'form' 
                                    ? "bg-white text-indigo-600 shadow-sm" 
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <MessageCircle className="w-4 h-4" />
                            Parent Feedback
                        </button>
                    )}
                </div>
            </div>

            {/* Evaluation View */}
            {activeView === 'evaluation' && settings.evaluationEnabled && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    {/* History Selector */}
                    {allEvaluations.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {allEvaluations.map(e => (
                                <button
                                    key={e.id}
                                    onClick={() => setSelectedEvaluationId(e.id)}
                                    className={clsx(
                                        "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                        selectedEvaluationId === e.id 
                                            ? "bg-indigo-600 text-white shadow-lg" 
                                            : "bg-white text-gray-500 border border-gray-100 hover:border-indigo-200"
                                    )}
                                >
                                    {e.month} {e.year}
                                </button>
                            ))}
                        </div>
                    )}

                    {evaluation ? (
                        evaluationTemplate ? (
                            <Card className="overflow-hidden border-t-8 border-t-indigo-600 shadow-2xl">
                                {/* Certificate Header */}
                                <div className="bg-indigo-50 p-8 text-center border-b border-indigo-100 relative">
                                    <div className="absolute top-4 right-4">
                                        <Award className="w-16 h-16 text-indigo-200 rotate-12 opacity-50" />
                                    </div>
                                    <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">{evaluationTemplate.title}</h2>
                                    <h3 className="text-3xl font-black text-gray-900 mb-1">{currentUser.name}</h3>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                        Roll No: {currentUser.rollNo} • {evaluation.month} {evaluation.year}
                                    </p>
                                </div>

                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {evaluationTemplate.sections.map((section, idx) => (
                                        <div key={section.id} className={clsx("space-y-4", idx % 2 === 0 ? "border-r-0 md:border-r border-gray-100 pr-0 md:pr-8" : "")}>
                                            <h4 className="flex items-center gap-2 text-indigo-700 font-black uppercase text-xs tracking-widest mb-4">
                                                <Layout className="w-4 h-4 text-indigo-400" /> {section.title}
                                            </h4>
                                            <div className="space-y-4">
                                                {section.questions.map(q => {
                                                    const answer = evaluation.responses[q.id];
                                                    if (answer === undefined || answer === null || answer === '') return null;
                                                    
                                                    return (
                                                        <div key={q.id} className="bg-gray-50 rounded-2xl p-4 group hover:bg-indigo-50 transition-colors">
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">{q.label}</p>
                                                            <p className="text-sm font-black text-gray-900">
                                                                {Array.isArray(answer) ? answer.join(', ') : answer}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Certificate Footer */}
                                <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center">
                                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                        Assessed by {evaluation.teacherName} on {new Date(evaluation.date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-[10px] font-black text-gray-600 uppercase">Authenticated Progress Report</span>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="overflow-hidden border-t-8 border-t-amber-500 shadow-2xl">
                                <div className="bg-amber-50 p-8 text-center border-b border-amber-100">
                                    <h2 className="text-xs font-black text-amber-600 uppercase tracking-[0.3em] mb-2">Historical Report</h2>
                                    <h3 className="text-3xl font-black text-gray-900 mb-1">{currentUser.name}</h3>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                        {evaluation.month} {evaluation.year}
                                    </p>
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(evaluation.responses || {}).map(([key, value]) => (
                                            <div key={key} className="bg-gray-50 rounded-2xl p-4">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                </p>
                                                <p className="text-sm font-black text-gray-900">
                                                    {Array.isArray(value) ? value.join(', ') : value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 p-4 bg-amber-50 rounded-2xl flex items-start gap-3 border border-amber-100">
                                        <Info className="w-5 h-5 text-amber-600 shrink-0" />
                                        <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                            This report was generated using a legacy system. Some labels might appear as raw field names.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm">
                            <Award className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-gray-300 uppercase tracking-widest">Report Not Published</h3>
                            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">Your academic assessment for the current period is still being processed by your mentor.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback Form View */}
            {activeView === 'form' && settings.feedbackEnabled && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {hasSubmittedFeedback ? (
                        <Card className="p-16 text-center space-y-6 rounded-[2rem] shadow-2xl border-indigo-50">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg rotate-3">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-gray-900">Thank You!</h2>
                                <p className="text-gray-500 font-medium max-w-md mx-auto text-lg leading-relaxed">
                                    Jazakallahu Khair for your valuable feedback. It has been successfully recorded for this period.
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                onClick={() => setActiveView('evaluation')}
                                className="mt-4 border-2 font-black uppercase tracking-widest py-6 px-10 rounded-2xl"
                            >
                                Back to Report
                            </Button>
                        </Card>
                    ) : submitSuccess ? (
                        <Card className="p-12 text-center space-y-4 rounded-[2rem]">
                            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                                <Send className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Submission Received</h2>
                            <p className="text-gray-500 font-medium">Your feedback is being processed...</p>
                            {setTimeout(() => window.location.reload(), 2500)}
                        </Card>
                    ) : activeParentTemplate ? (
                        <Card className="p-0 overflow-hidden shadow-2xl rounded-[2.5rem] border-none">
                            <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-3xl font-black mb-2">{activeParentTemplate.title}</h2>
                                    <p className="text-indigo-100 font-bold opacity-80 max-w-md">{activeParentTemplate.description || 'Your feedback helps us improve the quality of education for your child.'}</p>
                                </div>
                                <MessageCircle className="absolute -bottom-10 -right-10 w-48 h-48 text-white opacity-10 -rotate-12" />
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-12 bg-white">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">Parent / Guardian Name</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="Enter your full name"
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                            value={parentName}
                                            onChange={(e) => setParentName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Student Context</label>
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-bold text-gray-500">
                                            {currentUser.name} • {classes.find(c => c.id === currentUser.classId)?.name}
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Sections */}
                                {activeParentTemplate.sections.map((section) => (
                                    <div key={section.id} className="space-y-8 pt-8 border-t border-gray-50">
                                        <div className="space-y-1">
                                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <Layout className="w-4 h-4" /> {section.title}
                                            </h3>
                                            {section.description && <p className="text-xs text-gray-400 font-medium">{section.description}</p>}
                                        </div>
                                        
                                        <div className="space-y-10">
                                            {section.questions.map(renderQuestion)}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t pt-10">
                                    <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                        <Info className="w-5 h-5 shrink-0" />
                                        <p className="text-xs font-bold leading-tight">By submitting, you agree that this feedback accurately reflects your views for the current period.</p>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-8 text-xl font-black rounded-3xl shadow-2xl shadow-indigo-200 flex items-center gap-3 active:scale-95 transition-all w-full md:w-auto"
                                    >
                                        {isSubmitting ? "Sending..." : (
                                            <>
                                                Submit Feedback <Send className="w-6 h-6" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                            <MessageCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-gray-300 uppercase tracking-widest">Feedback Form Offline</h3>
                            <p className="text-sm text-gray-400 mt-2">The feedback form for this period is not yet available.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FeedbackPortal;
