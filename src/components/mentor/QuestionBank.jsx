import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, CheckCircle, HelpCircle, Edit2, Play, PauseCircle, Calendar, Eye, EyeOff, X } from 'lucide-react';

const QuestionBank = () => {
    const { questions, addQuestion, deleteQuestion, updateQuestion, exams, classes, subjects, examSettings, updateExamSetting } = useData();

    // Hierarchy State
    const [selectedExamId, setSelectedExamId] = useState('');
    const [expandedClassId, setExpandedClassId] = useState(null); // Which class card is expanded? (Optional, if we want accordion. Or just show all classes in grid)

    // Modal / Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [context, setContext] = useState({ examId: null, classId: null, subjectId: null }); // { examId, classId, subjectId }

    // Question Form State
    const [qType, setQType] = useState('MCQ');
    const [qText, setQText] = useState('');
    const [qMarks, setQMarks] = useState(1);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Helpers
    const getSetting = (examId, classId, subjectId) => {
        return examSettings.find(s => s.examId === examId && s.classId === classId && s.subjectId === subjectId) || { isActive: false, isPublished: false, startTime: '', endTime: '' };
    };

    const handleSettingChange = (examId, classId, subjectId, updates) => {
        updateExamSetting(examId, classId, subjectId, updates);
    };

    const openEditor = (examId, classId, subjectId) => {
        setContext({ examId, classId, subjectId });
        setIsEditorOpen(true);
        resetForm();
    };

    const resetForm = () => {
        setQText('');
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
        setQMarks(1);
        setEditingId(null);
        setQType('MCQ');
    };

    const handleSaveQuestion = (e) => {
        e.preventDefault();
        if (!context.examId || !context.classId || !context.subjectId || !qText) return;

        const questionData = {
            examId: context.examId,
            classId: context.classId,
            subjectId: context.subjectId,
            type: qType,
            text: qText,
            marks: qMarks,
            options: qType === 'MCQ' ? options : [],
            correctAnswer: qType === 'MCQ' ? correctAnswer : null
        };

        if (editingId) {
            updateQuestion(editingId, questionData);
            setEditingId(null);
        } else {
            addQuestion(questionData);
        }
        resetForm();
    };

    const handleEditQuestion = (q) => {
        setEditingId(q.id);
        setQType(q.type);
        setQText(q.text);
        setQMarks(q.marks);
        if (q.type === 'MCQ') {
            setOptions([...q.options]);
            setCorrectAnswer(q.correctAnswer);
        } else {
            setOptions(['', '', '', '']);
            setCorrectAnswer('');
        }
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    // Filter questions for the modal
    const currentQuestions = questions.filter(q =>
        q.examId === context.examId &&
        q.classId === context.classId &&
        q.subjectId === context.subjectId
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header / Exam Selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Advanced Question Bank</h2>
                    <p className="text-gray-500 text-sm">Manage questions, scheduling, and activation per subject.</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Exam Context:</label>
                    <select
                        value={selectedExamId}
                        onChange={e => setSelectedExamId(e.target.value)}
                        className="rounded-lg border-gray-300 shadow-sm p-2 bg-gray-50 border min-w-[200px]"
                    >
                        <option value="">-- Choose Exam --</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
            </div>

            {!selectedExamId ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">Please select an Exam from the top right to verify subjects.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Class Cards */}
                    {[...new Set(classes.map(c => c.name))].sort().map(className => (
                        <Card key={className} className="flex flex-col h-full bg-white shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                                <h3 className="font-bold text-indigo-900 text-lg">Class {className}</h3>
                                <span className="text-xs bg-white text-indigo-600 px-2 py-1 rounded-full font-medium border border-indigo-100">
                                    {subjects.length} Subjects Linked
                                </span>
                            </div>

                            <div className="p-4 space-y-4 flex-1">
                                {subjects.map(subj => {
                                    // Use SUBJECT NAME as ID key because questions/settings are linked to Subject Name + Class Name composite
                                    // Or are subjects global? "English" exists once or per class? 
                                    // In DataContext, subjects have classId. So we should filter subjects by this class.
                                    // Current logic: classes is array of {id, name}. 
                                    // subjects is array of {id, name, classId}.

                                    // 1. Find the Class ID(s) for this "Class Name" (could be multiple divisions 9A, 9B?)
                                    // The user prompt said "Subjects listed under class".
                                    // Let's assume subjects are unique per Class Name for simplicity in this view, 
                                    // OR better: Filter subjects that belong to ANY class with this name.

                                    // Actually, let's keep it simple: Show all unique Subject Names available in the system?
                                    // No, show subjects linked to this class hierarchy.

                                    // Issue: 'classes' has 'name' (e.g. "10"). 'subjects' has 'classId' (e.g. "id_10A").
                                    // We are grouping by Class NAME. So we need to find subjects for any class ID that has this name.
                                    const classIds = classes.filter(c => c.name === className).map(c => c.id);
                                    if (!classIds.includes(subj.classId)) return null;

                                    const setting = getSetting(selectedExamId, className, subj.name);
                                    // Note: Using className and subj.name as keys for settings to be robust across divisions.

                                    return (
                                        <div key={subj.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50/50">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{subj.name}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {questions.filter(q => q.examId === selectedExamId && q.classId === className && q.subjectId === subj.name).length} Questions
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => openEditor(selectedExamId, className, subj.name)}
                                                    className="text-xs h-8"
                                                >
                                                    <Edit2 className="w-3 h-3 mr-1" /> Manage Questions
                                                </Button>
                                            </div>

                                            {/* Controls */}
                                            <div className="space-y-3 bg-white p-3 rounded border border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-gray-500 uppercase">Access</span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleSettingChange(selectedExamId, className, subj.name, { isActive: !setting.isActive })}
                                                            className={`p-1.5 rounded transition-colors ${setting.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                            title={setting.isActive ? "Active: Students can take" : "Inactive: Hidden from students"}
                                                        >
                                                            {setting.isActive ? <Play className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSettingChange(selectedExamId, className, subj.name, { isPublished: !setting.isPublished })}
                                                            className={`p-1.5 rounded transition-colors ${setting.isPublished ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                            title={setting.isPublished ? "Published: Results visible" : "Unpublished: Results hidden"}
                                                        >
                                                            {setting.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-gray-50">
                                                    <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Auto-Schedule (Optional)</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="text-[10px] text-gray-400">Start</span>
                                                            <input
                                                                type="datetime-local"
                                                                className="w-full text-[10px] p-1 border rounded"
                                                                value={setting.startTime || ''}
                                                                onChange={e => handleSettingChange(selectedExamId, className, subj.name, { startTime: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-gray-400">End</span>
                                                            <input
                                                                type="datetime-local"
                                                                className="w-full text-[10px] p-1 border rounded"
                                                                value={setting.endTime || ''}
                                                                onChange={e => handleSettingChange(selectedExamId, className, subj.name, { endTime: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Questions Modal */}
            {isEditorOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-4xl h-[90vh] flex flex-col relative bg-white shadow-2xl">
                        <button
                            onClick={() => setIsEditorOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800">
                                Managing: {context.subjectId} (Class {context.classId})
                            </h3>
                            <p className="text-gray-500 text-sm">Add or edit questions for this subject.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Form */}
                            <div className="space-y-6">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                    {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    {editingId ? 'Edit Question' : 'Add New Question'}
                                </h4>

                                <form onSubmit={handleSaveQuestion} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                            <select
                                                value={qType}
                                                onChange={e => setQType(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm p-2 bg-white border text-sm"
                                            >
                                                <option value="MCQ">Multiple Choice</option>
                                                <option value="Short">Short Text</option>
                                                <option value="Paragraph">Paragraph</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={qMarks}
                                                onChange={e => setQMarks(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm"
                                            />
                                        </div>
                                    </div>

                                    <Input
                                        label="Question Text"
                                        value={qText}
                                        onChange={e => setQText(e.target.value)}
                                        placeholder="Enter question text..."
                                    />

                                    {qType === 'MCQ' && (
                                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                            <p className="text-sm font-medium text-gray-700">Choices</p>
                                            {options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-xs w-4">{String.fromCharCode(65 + idx)}</span>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => updateOption(idx, e.target.value)}
                                                        className="flex-1 rounded border-gray-300 p-1.5 text-sm"
                                                        placeholder={`Option ${idx + 1}`}
                                                        required
                                                    />
                                                    <input
                                                        type="radio"
                                                        name="correctAnswer"
                                                        checked={correctAnswer === opt && opt !== ''}
                                                        onChange={() => setCorrectAnswer(opt)}
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                        disabled={!opt}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button type="submit" variant="primary" className="flex-1">
                                            {editingId ? 'Update' : 'Add Question'}
                                        </Button>
                                        {editingId && (
                                            <Button type="button" variant="secondary" onClick={resetForm}>
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Right: List */}
                            <div className="space-y-4 border-l border-gray-100 pl-8">
                                <h4 className="font-bold text-gray-700">
                                    Existing Questions ({currentQuestions.length})
                                </h4>
                                <div className="space-y-3 h-[500px] overflow-y-auto pr-2">
                                    {currentQuestions.length === 0 && (
                                        <p className="text-gray-400 italic text-sm text-center py-10">No questions yet.</p>
                                    )}
                                    {currentQuestions.map((q, i) => (
                                        <div key={q.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group hover:border-indigo-200">
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded">
                                                <button onClick={() => handleEditQuestion(q)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                                                <button onClick={() => deleteQuestion(q.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="font-bold text-gray-300 text-sm">#{i + 1}</span>
                                                <div>
                                                    <p className="text-gray-800 text-sm font-medium">{q.text}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{q.type}</span>
                                                        <span className="text-[10px] bg-indigo-50 px-1.5 rounded text-indigo-500">{q.marks} m</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// Helper for dynamic classes
function clsx(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default QuestionBank;
