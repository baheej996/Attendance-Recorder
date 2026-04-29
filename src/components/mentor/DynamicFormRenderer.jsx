import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft, ArrowRight, Save, CheckCircle, Upload, X } from 'lucide-react';
import { storage } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const DynamicFormRenderer = ({ form, onComplete, onCancel }) => {
    const { currentUser, submitEvaluationResponse, addNotification } = useData();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // File upload specific states
    const [uploadProgress, setUploadProgress] = useState({});
    
    const sections = form.sections || [];
    const currentSection = sections[currentStep];

    const handleInput = (qId, value) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
    };

    const handleCheckboxInput = (qId, value) => {
        setAnswers(prev => {
            const current = Array.isArray(prev[qId]) ? prev[qId] : [];
            if (current.includes(value)) {
                return { ...prev, [qId]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [qId]: [...current, value] };
            }
        });
    };

    const handleFileUpload = async (qId, file) => {
        if (!file) return;
        
        // In local mode if storage isn't fully operational, we'll try/catch and fallback
        try {
            const fileRef = ref(storage, `evaluations/${form.id}/${currentUser.id}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, [qId]: progress }));
                },
                (error) => {
                    console.error("Upload failing:", error);
                    alert("Upload failed. Attempting graceful fallback.");
                    setUploadProgress(prev => { const n = {...prev}; delete n[qId]; return n; });
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    handleInput(qId, { url: downloadURL, name: file.name, type: file.type });
                    setUploadProgress(prev => { const n = {...prev}; delete n[qId]; return n; });
                }
            );
        } catch (error) {
            console.error(error);
            // Fallback for simple testing if storage emulator isn't properly connected
            handleInput(qId, { url: '#', name: file.name, type: file.type, _localPath: URL.createObjectURL(file) });
        }
    };

    const removeFile = (qId) => {
        setAnswers(prev => {
            const n = { ...prev };
            delete n[qId];
            return n;
        });
    };

    const validateStep = () => {
        const missing = currentSection.questions.filter(q => {
            if (!q.required) return false;
            const ans = answers[q.id];
            if (q.type === 'checkbox') return !ans || ans.length === 0;
            return ans === undefined || ans === '' || ans === null;
        });
        if (missing.length > 0) {
            alert(`Please answer the required question: "${missing[0].label}"`);
            return false;
        }
        return true;
    };

    const triggerSubmit = async () => {
        if (!validateStep()) return;
        
        setIsSubmitting(true);
        try {
            await submitEvaluationResponse({
                formId: form.id,
                mentorId: currentUser.id,
                answers: answers,
            });

            // Notify Admin
            await addNotification({
                title: 'Evaluation Submitted',
                message: `${currentUser?.name} has submitted their evaluation for ${form.month} ${form.year}.`,
                audience: 'admin',
                senderId: currentUser?.id,
                senderName: currentUser?.name,
                senderRole: 'mentor',
                type: 'evaluation_submission'
            });

            if(onComplete) onComplete();
        } catch (error) {
            console.error(error);
            alert("Failed to submit form.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            {/* Header & Progress */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center">
                    <h2 className="text-2xl font-black text-gray-900">{form.title}</h2>
                    <p className="text-indigo-600 font-bold">{form.month} {form.year}</p>
                </div>
                <div className="w-9" /> {/* Spacer */}
            </div>

            <div className="flex justify-between relative mb-12">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-indigo-600 -z-10 rounded transition-all duration-500" 
                    style={{ width: `${(currentStep / (sections.length - 1)) * 100}%` }}
                ></div>
                {sections.map((sec, i) => (
                    <div 
                        key={sec.id} 
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm
                            ${i < currentStep ? 'bg-indigo-600 text-white' : i === currentStep ? 'bg-white border-2 border-indigo-600 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}
                    >
                        {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
                    </div>
                ))}
            </div>

            {/* Current Section Card */}
            <Card className="p-8 bg-white border border-gray-100 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 py-2 px-6 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-bl-3xl">
                    Part {currentStep + 1} of {sections.length}
                </div>
                
                <h3 className="text-2xl font-extrabold text-gray-900 mb-8 border-b-2 border-indigo-100 pb-4 pr-16 leading-tight">
                    {currentSection.title}
                </h3>

                <div className="space-y-10">
                    {currentSection.questions.map((q, idx) => (
                        <div key={q.id} className="group">
                            <label className="block text-gray-900 font-bold text-lg mb-3">
                                {idx + 1}. {q.label}
                                {q.required && <span className="text-red-500 ml-1" title="Required">*</span>}
                            </label>

                            <div className="pl-4 border-l-4 border-transparent group-focus-within:border-indigo-500 transition-colors">
                                {/* Multiple Choice */}
                                {q.type === 'radio' && (
                                    <div className="space-y-3">
                                        {(q.options || []).map((opt, i) => (
                                            <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                                <input 
                                                    type="radio" 
                                                    name={q.id} 
                                                    value={opt}
                                                    checked={answers[q.id] === opt}
                                                    onChange={() => handleInput(q.id, opt)}
                                                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="font-medium text-gray-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Checkbox */}
                                {q.type === 'checkbox' && (
                                    <div className="space-y-3">
                                        {(q.options || []).map((opt, i) => {
                                            const isChecked = (answers[q.id] || []).includes(opt);
                                            return (
                                                <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        value={opt}
                                                        checked={isChecked}
                                                        onChange={() => handleCheckboxInput(q.id, opt)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                                    />
                                                    <span className="font-medium text-gray-700">{opt}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Rating */}
                                {q.type === 'rating' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-gray-400">{q.min || 1}</span>
                                            <span className="text-xl font-black text-indigo-600 bg-indigo-50 px-4 py-1 rounded-full">{answers[q.id] || ((q.max || 10) / 2)}</span>
                                            <span className="text-sm font-bold text-gray-400">{q.max || 10}</span>
                                        </div>
                                            <input 
                                                type="range"
                                                min={q.min || 1}
                                                max={q.max || 10}
                                                value={answers[q.id] || ((q.max || 10) / 2)}
                                                onChange={(e) => handleInput(q.id, parseInt(e.target.value))}
                                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                    </div>
                                )}

                                {/* Short Answer */}
                                {q.type === 'short_answer' && (
                                    <input 
                                        type="text"
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleInput(q.id, e.target.value)}
                                        className="w-full border-b-2 border-gray-300 bg-gray-50/50 focus:bg-indigo-50/30 px-4 py-3 outline-none focus:border-indigo-600 transition-colors font-medium text-gray-800"
                                        placeholder="Type your answer here..."
                                    />
                                )}

                                {/* Paragraph */}
                                {q.type === 'paragraph' && (
                                    <textarea 
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleInput(q.id, e.target.value)}
                                        rows={4}
                                        className="w-full border-2 border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white px-4 py-3 outline-none focus:border-indigo-500 transition-colors resize-y font-medium text-gray-800"
                                        placeholder="Type your detailed answer here..."
                                    />
                                )}

                                {/* File Attachment */}
                                {q.type === 'file' && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors group relative bg-gray-50/50">
                                        {answers[q.id] ? (
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="w-6 h-6" />
                                                </div>
                                                <div className="text-gray-900 font-bold">{answers[q.id].name}</div>
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); removeFile(q.id); }}
                                                    className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1 bg-red-50 px-3 py-1 rounded"
                                                >
                                                    <X className="w-4 h-4" /> Remove File
                                                </button>
                                            </div>
                                        ) : uploadProgress[q.id] ? (
                                            <div className="w-full max-w-xs mx-auto">
                                                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                    <span>Uploading...</span>
                                                    <span>{Math.round(uploadProgress[q.id])}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress[q.id]}%` }}></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                                <p className="text-gray-600 font-medium mb-2">Click to select or drag and drop</p>
                                                <p className="text-xs text-gray-400">PDF, Images, DOCX (Max 10MB)</p>
                                                <input 
                                                    type="file" 
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => handleFileUpload(q.id, e.target.files[0])}
                                                    accept="image/*,.pdf,.doc,.docx"
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center py-6 border-t border-gray-200 mt-8">
                <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    disabled={currentStep === 0 || isSubmitting}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Previous
                </Button>

                {currentStep < sections.length - 1 ? (
                    <Button 
                        variant="primary" 
                        onClick={() => {
                            if (validateStep()) setCurrentStep(prev => prev + 1);
                        }}
                        className="gap-2"
                    >
                        Next Part <ArrowRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button 
                        variant="primary" 
                        onClick={triggerSubmit}
                        disabled={isSubmitting}
                        className="gap-2 bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white shadow-green-200"
                    >
                        {isSubmitting ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Save className="w-5 h-5" /> Submit Evaluation</>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default DynamicFormRenderer;
