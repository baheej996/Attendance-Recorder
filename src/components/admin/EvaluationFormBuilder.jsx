import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Save, X, Plus, Trash2, GripVertical, Settings2, FileText, CalendarDays, Layers, Copy } from 'lucide-react';
import { Reorder } from 'framer-motion';

const QUESTION_TYPES = [
    { value: 'radio', label: 'Multiple Choice (Single Answer)' },
    { value: 'checkbox', label: 'Checkboxes (Multiple Answers)' },
    { value: 'rating', label: 'Custom Rating (Slider)' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'paragraph', label: 'Paragraph (Long Answer)' },
    { value: 'file', label: 'File Attachment / Evidence' },
];

const EvaluationFormBuilder = ({ initialData, onClose, templateType = 'mentor' }) => {
    const { 
        createEvaluationForm, updateEvaluationForm,
        createStudentEvaluationTemplate, updateStudentEvaluationTemplate,
        createParentFeedbackTemplate, updateParentFeedbackTemplate
    } = useData();

    const [title, setTitle] = useState(initialData?.title || (templateType === 'student' ? 'New Student Evaluation' : templateType === 'parent' ? 'New Parent Feedback' : 'New Evaluation Form'));
    const [month, setMonth] = useState(initialData?.month || new Date().toLocaleString('default', { month: 'long' }));
    const [year, setYear] = useState(initialData?.year || new Date().getFullYear().toString());
    const [sections, setSections] = useState(initialData?.sections || [
        { id: `sec_${Date.now()}`, title: 'General', questions: [] }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formData = { title, month, year, sections, status: initialData?.status || 'Draft' };
            
            if (templateType === 'student') {
                if (initialData?.id) await updateStudentEvaluationTemplate(initialData.id, formData);
                else await createStudentEvaluationTemplate(formData);
            } else if (templateType === 'parent') {
                if (initialData?.id) await updateParentFeedbackTemplate(initialData.id, formData);
                else await createParentFeedbackTemplate(formData);
            } else {
                if (initialData?.id) await updateEvaluationForm(initialData.id, formData);
                else await createEvaluationForm(formData);
            }
            
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const addSection = () => {
        setSections([...sections, { id: `sec_${Date.now()}`, title: `Section ${sections.length + 1}`, questions: [] }]);
    };

    const updateSectionTitle = (secId, newTitle) => {
        setSections(sections.map(s => s.id === secId ? { ...s, title: newTitle } : s));
    };

    const removeSection = (secId) => {
        if(window.confirm("Delete this entire section and its questions?")) {
            setSections(sections.filter(s => s.id !== secId));
        }
    };

    const addQuestion = (secId) => {
        const newQuestion = {
            id: `q_${Date.now()}`,
            type: 'radio',
            label: 'New Question',
            options: ['Option 1'],
            required: true,
            logic: null // { showIf: { questionId: '', value: '' } }
        };
        setSections(sections.map(s => {
            if (s.id === secId) return { ...s, questions: [...s.questions, newQuestion] };
            return s;
        }));
    };

    const updateQuestion = (secId, qId, updates) => {
        setSections(sections.map(s => {
            if (s.id === secId) {
                return {
                    ...s,
                    questions: s.questions.map(q => q.id === qId ? { ...q, ...updates } : q)
                };
            }
            return s;
        }));
    };

    const removeQuestion = (secId, qId) => {
        setSections(sections.map(s => {
            if (s.id === secId) return { ...s, questions: s.questions.filter(q => q.id !== qId) };
            return s;
        }));
    };

    const copyQuestion = (secId, qId) => {
        setSections(sections.map(s => {
            if (s.id === secId) {
                const qIdx = s.questions.findIndex(q => q.id === qId);
                if (qIdx === -1) return s;
                
                const originalQ = s.questions[qIdx];
                const copiedQ = {
                    ...JSON.parse(JSON.stringify(originalQ)),
                    id: `q_${Date.now()}_copy`,
                    label: `${originalQ.label} (Copy)`
                };
                
                const newQuestions = [...s.questions];
                newQuestions.splice(qIdx + 1, 0, copiedQ);
                
                return { ...s, questions: newQuestions };
            }
            return s;
        }));
    };

    const onReorderQuestions = (secId, newOrder) => {
        setSections(sections.map(s => {
            if (s.id === secId) return { ...s, questions: newOrder };
            return s;
        }));
    };

    // Get all previous questions for conditional logic
    const getAllQuestions = () => {
        const all = [];
        sections.forEach(s => s.questions.forEach(q => all.push(q)));
        return all;
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            {/* Header Sticky Bar */}
            <div className="sticky top-16 z-20 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 w-full">
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200" title="Close Without Saving">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                    <input 
                        className="text-2xl font-black bg-transparent border-none outline-none focus:ring-0 placeholder-gray-300 w-full"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Evaluation Form Title"
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    <select value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-medium">
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <select value={year} onChange={e => setYear(e.target.value)} className="px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-medium">
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                            <option key={y} value={y.toString()}>{y}</option>
                        ))}
                    </select>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving} className="gap-2 ml-4">
                        {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Form
                    </Button>
                </div>
            </div>

            {/* Sections Container */}
            <div className="max-w-4xl mx-auto space-y-8">
                {sections.map((sec, secIdx) => (
                    <Card key={sec.id} className="p-0 border-t-4 border-t-indigo-600 overflow-visible shadow-lg relative bg-white">
                        <div className="absolute -left-12 top-6 bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md hidden md:flex">
                            {secIdx + 1}
                        </div>
                        <div className="p-6 bg-indigo-50/30 border-b border-gray-100 flex justify-between items-center group">
                            <input
                                className="text-xl font-bold bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-300 pb-1"
                                value={sec.title}
                                onChange={(e) => updateSectionTitle(sec.id, e.target.value)}
                                placeholder="Section Title..."
                            />
                            <button 
                                onClick={() => removeSection(sec.id)} 
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <Reorder.Group axis="y" values={sec.questions} onReorder={(newOrder) => onReorderQuestions(sec.id, newOrder)} className="space-y-4">
                                {sec.questions.map((q, qIdx) => (
                                    <Reorder.Item key={q.id} value={q} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group hover:shadow-md transition-shadow">
                                        <div className="flex justify-between gap-4 mb-4">
                                            <div className="flex gap-2 w-full">
                                                <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 py-2">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                                <input
                                                    className="flex-1 font-semibold text-lg bg-gray-50 px-3 py-2 border border-transparent focus:border-gray-200 focus:bg-white rounded outline-none"
                                                    value={q.label}
                                                    onChange={e => updateQuestion(sec.id, q.id, { label: e.target.value })}
                                                    placeholder="Question Text"
                                                />
                                            </div>
                                            <div className="w-64 shrink-0 shrink-0">
                                                <select 
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
                                                    value={q.type}
                                                    onChange={(e) => updateQuestion(sec.id, q.id, { type: e.target.value })}
                                                >
                                                    {QUESTION_TYPES.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Dynamic Question Config UI */}
                                        <div className="pl-8 pr-4 space-y-4">
                                            {(q.type === 'radio' || q.type === 'checkbox') && (
                                                <div className="space-y-2">
                                                    {(q.options || []).map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 border border-gray-300 ${q.type === 'radio' ? 'rounded-full' : 'rounded'}`}></div>
                                                            <input 
                                                                className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-gray-300 outline-none pb-1"
                                                                value={opt}
                                                                onChange={e => {
                                                                    const newOpts = [...q.options];
                                                                    newOpts[optIdx] = e.target.value;
                                                                    updateQuestion(sec.id, q.id, { options: newOpts });
                                                                }}
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    const newOpts = q.options.filter((_, i) => i !== optIdx);
                                                                    updateQuestion(sec.id, q.id, { options: newOpts });
                                                                }}
                                                                className="text-gray-300 hover:text-red-500 px-2"
                                                            ><X className="w-4 h-4"/></button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => updateQuestion(sec.id, q.id, { options: [...(q.options || []), `Option ${(q.options?.length||0)+1}`] })}
                                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-2"
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Option
                                                    </button>
                                                </div>
                                            )}

                                            {q.type === 'rating' && (
                                                <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <span className="font-bold text-gray-500">Scale:</span>
                                                    <input 
                                                        type="number" className="w-16 px-2 py-1 border rounded" 
                                                        value={q.min || 1} 
                                                        onChange={e => updateQuestion(sec.id, q.id, { min: parseInt(e.target.value) })}
                                                    />
                                                    <span>to</span>
                                                    <input 
                                                        type="number" className="w-16 px-2 py-1 border rounded" 
                                                        value={q.max || 10} 
                                                        onChange={e => updateQuestion(sec.id, q.id, { max: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            )}

                                            {(q.type === 'short_answer' || q.type === 'paragraph' || q.type === 'file') && (
                                                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 italic">
                                                    User input field will render here.
                                                </div>
                                            )}

                                            {/* Conditional Logic (Show If) */}
                                            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                                                <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                    <Settings2 className="w-3 h-3" /> Visibility Logic
                                                </h5>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-xs font-bold text-gray-500">Show this question if</span>
                                                    <select 
                                                        className="text-xs p-1 border rounded bg-white font-medium min-w-[150px]"
                                                        value={q.logic?.showIf?.questionId || ''}
                                                        onChange={e => updateQuestion(sec.id, q.id, { 
                                                            logic: e.target.value ? { showIf: { questionId: e.target.value, value: q.logic?.showIf?.value || '' } } : null 
                                                        })}
                                                    >
                                                        <option value="">(Always Show)</option>
                                                        {getAllQuestions().filter(prevQ => prevQ.id !== q.id).map(prevQ => (
                                                            <option key={prevQ.id} value={prevQ.id}>{prevQ.label}</option>
                                                        ))}
                                                    </select>
                                                    {q.logic?.showIf?.questionId && (
                                                        <>
                                                            <span className="text-xs font-bold text-gray-500">is</span>
                                                            <input 
                                                                placeholder="Value (e.g. Yes)"
                                                                className="text-xs p-1 border rounded bg-white font-medium w-32"
                                                                value={q.logic?.showIf?.value || ''}
                                                                onChange={e => updateQuestion(sec.id, q.id, { 
                                                                    logic: { showIf: { ...q.logic.showIf, value: e.target.value } } 
                                                                })}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-end items-center gap-4 border-t border-gray-100 pt-4">
                                            <button 
                                                onClick={() => copyQuestion(sec.id, q.id)}
                                                className="text-gray-400 hover:text-indigo-600 p-2 rounded hover:bg-indigo-50 transition-colors flex items-center gap-1.5 text-xs font-bold"
                                                title="Duplicate Question"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Duplicate
                                            </button>
                                            <div className="w-px h-6 bg-gray-200"></div>
                                            <button 
                                                onClick={() => removeQuestion(sec.id, q.id)}
                                                className="text-gray-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                                                title="Delete Question"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="w-px h-6 bg-gray-200"></div>
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <span className="text-sm font-medium text-gray-700">Required</span>
                                                <div className="relative">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only" 
                                                        checked={q.required} 
                                                        onChange={e => updateQuestion(sec.id, q.id, { required: e.target.checked })} 
                                                    />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${q.required ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${q.required ? 'transform translate-x-4' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>

                            <button 
                                onClick={() => addQuestion(sec.id)}
                                className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Add Question to {sec.title}
                            </button>
                        </div>
                    </Card>
                ))}

                <div className="flex justify-center pb-20">
                    <Button variant="secondary" onClick={addSection} className="gap-2 shadow-sm border border-gray-300 bg-white">
                        <Layers className="w-4 h-4" />
                        Add New Section
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EvaluationFormBuilder;
