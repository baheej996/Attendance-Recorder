import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, HelpCircle, Edit2, X, ChevronDown, ChevronUp, Image as ImageIcon, Upload, Settings, Clock } from 'lucide-react';

const QuestionBank = () => {
    const { questions, addQuestion, deleteQuestion, updateQuestion, exams, classes, subjects, currentUser, examSettings, updateExamSetting } = useData();
    const { showAlert, showConfirm } = useUI();

    // Mentor specific filtering
    // currentUser.assignedClassIds is Array of Strings (Class IDs)
    const assignedClassIds = currentUser?.assignedClassIds || [];

    // Get unique Class Names assigned to this mentor
    const mentorClassNames = [...new Set(
        classes
            .filter(c => assignedClassIds.includes(c.id))
            .map(c => c.name)
    )].sort();

    // Filter subjects that are enabled for exams
    const examSubjects = questions.length >= 0 ? subjects.filter(s => s.isExamSubject !== false) : [];

    // Hierarchy State
    const [selectedExamId, setSelectedExamId] = useState('');
    const [expandedClasses, setExpandedClasses] = useState([]); // Array of expanded class names

    const toggleClassExpand = (className) => {
        setExpandedClasses(prev =>
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };

    // Modal / Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [context, setContext] = useState({ examId: null, classId: null, subjectId: null }); // { examId, classId, subjectId }

    // Question Form State
    const [qType, setQType] = useState('MCQ');
    const [qText, setQText] = useState('');
    const [qMarks, setQMarks] = useState(1);
    const [allowAttachments, setAllowAttachments] = useState(false);
    const [qImage, setQImage] = useState(null);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

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
        setQImage(null);
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
        setQMarks(1);
        setAllowAttachments(false);
        setEditingId(null);
        setQType('MCQ');
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setQImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveQuestion = (e) => {
        e.preventDefault();
        if (!context.examId || !context.classId || !context.subjectId || !qText) return;

        // Validation: Positive Marks
        if (Number(qMarks) <= 0) {
            showAlert('Invalid Marks', 'Marks must be greater than 0.', 'error');
            return;
        }

        // Validation: Max Marks Check
        // 1. Find the Max Marks for this Subject (context.subjectId is Name, context.classId is Class Name)
        const relevantSubject = examSubjects.find(s =>
            s.name === context.subjectId &&
            classes.find(c => c.id === s.classId)?.name === context.classId
        );
        const maxMarks = relevantSubject ? Number(relevantSubject.maxMarks) : 100;

        // 2. Calculate Current Total
        // currentQuestions is already filtered by context
        const currentTotal = currentQuestions.reduce((sum, q) => sum + Number(q.marks), 0);

        // 3. Calculate New Total
        // If editing, we subtract the OLD marks of this question first
        const deduction = editingId ? Number(questions.find(q => q.id === editingId)?.marks || 0) : 0;
        const newTotal = currentTotal - deduction + Number(qMarks);

        if (newTotal > maxMarks) {
            showAlert('Limit Exceeded', `Cannot save question!\n\nTotal Marks (${newTotal}) would exceed the Maximum Allowed Marks (${maxMarks}) for ${context.subjectId}.`, 'error');
            return;
        }

        const questionData = {
            examId: context.examId,
            classId: context.classId,
            subjectId: context.subjectId,
            type: qType,
            text: qText,
            allowAttachments,
            image: qImage,
            marks: Number(qMarks), // Ensure number type
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
        setAllowAttachments(q.allowAttachments || false);
        setQImage(q.image || null);
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

    const confirmDelete = (id) => {
        showConfirm(
            "Delete Question",
            "Are you sure you want to delete this question? This action cannot be undone.",
            () => deleteQuestion(id)
        );
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (checked, allIds) => {
        setSelectedIds(checked ? allIds : []);
    };

    const handleBulkDelete = () => {
        showConfirm(
            "Delete Multiple Questions",
            `Are you sure you want to delete ${selectedIds.length} questions? This action cannot be undone.`,
            () => {
                selectedIds.forEach(id => deleteQuestion(id));
                setSelectedIds([]);
            }
        );
    };

    // Filter questions for the modal
    const currentQuestions = questions.filter(q =>
        q.examId === context.examId &&
        q.classId === context.classId &&
        q.subjectId === context.subjectId
    );

    const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'settings'

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
                <div className="flex flex-col space-y-4">
                    {/* Class Cards (Vertical Accordion) */}
                    {mentorClassNames.map(className => {
                        // Filter subjects available for this Class Name
                        // 1. Get all Class IDs for this name (e.g. 1A, 1B)
                        const classIdsForName = classes.filter(c => c.name === className).map(c => c.id);

                        // 2. Get subjects linked to these Class IDs
                        const relevantSubjects = examSubjects.filter(s => classIdsForName.includes(s.classId));

                        // 3. Unique Subject Names
                        const uniqueSubjectNames = [...new Set(relevantSubjects.map(s => s.name))];

                        const isExpanded = expandedClasses.includes(className);

                        return (
                            <Card key={className} className={`flex flex-col bg-white shadow-sm border transition-all duration-200 ${isExpanded ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-gray-200'}`}>
                                <div
                                    className="bg-gray-50/50 px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => toggleClassExpand(className)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg ${isExpanded ? 'text-indigo-900' : 'text-gray-700'}`}>Class {className}</h3>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {uniqueSubjectNames.length} Subjects Linked
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Exam Status Summary could go here */}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-6 bg-white border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                        {uniqueSubjectNames.map(subjectName => {
                                            // Count questions for this specific context
                                            const qCount = questions.filter(q => q.examId === selectedExamId && q.classId === className && q.subjectId === subjectName).length;

                                            // Get Settings Status
                                            const setting = getSetting(selectedExamId, className, subjectName);

                                            return (
                                                <div key={subjectName} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all bg-white group">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h4 className="font-bold text-gray-800 text-lg">{subjectName}</h4>
                                                            <div className="flex gap-2 mt-1">
                                                                <p className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full inline-block">
                                                                    {qCount} Questions
                                                                </p>

                                                                {setting.duration && (
                                                                    <p className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-0.5 rounded-full inline-block">
                                                                        {setting.duration} mins
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => { e.stopPropagation(); openEditor(selectedExamId, className, subjectName); }}
                                                            className="text-xs h-8 flex items-center shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                                                        >
                                                            <Edit2 className="w-3 h-3 mr-1" /> Manage
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Questions Modal */}
            {isEditorOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-4xl h-[90vh] flex flex-col relative bg-white shadow-2xl overflow-hidden">
                        <button
                            onClick={() => setIsEditorOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="p-6 border-b border-gray-100 bg-white">
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {context.subjectId} <span className="text-gray-400 font-normal">/ Class {context.classId}</span>
                                </h3>
                                <p className="text-gray-500 text-sm">Manage questions and exam settings for this subject.</p>
                            </div>


                        </div>

                        {/* Exam Duration Settings Banner */}
                        <div className="mx-6 mt-6 p-5 bg-gray-50 border border-gray-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-indigo-200">
                            <div>
                                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-600" />
                                    Exam Duration
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    Set a time limit for this specific subject.
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={getSetting(context.examId, context.classId, context.subjectId).duration || ''}
                                        onChange={(e) => handleSettingChange(context.examId, context.classId, context.subjectId, { duration: e.target.value })}
                                        placeholder="No Limit"
                                        className="w-32 rounded-lg border-gray-300 shadow-sm pl-3 pr-10 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                    <span className="absolute right-3 top-2 text-gray-400 text-xs">mins</span>
                                </div>
                                <div className="text-xs text-gray-400 max-w-[150px] leading-tight hidden sm:block">
                                    (0/Empty = No Limit)<br />Changes auto-save.
                                </div>
                            </div>
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

                                    <div className="flex items-end gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Question Image (Optional)</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                        id="q-image-upload"
                                                    />
                                                    <label
                                                        htmlFor="q-image-upload"
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        {qImage ? 'Change Image' : 'Upload Image'}
                                                    </label>
                                                </div>
                                                {qImage && (
                                                    <div className="relative group">
                                                        <img src={qImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setQImage(null)}
                                                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-[2px]">
                                            <input
                                                type="checkbox"
                                                id="allowAttachments"
                                                checked={allowAttachments}
                                                onChange={(e) => setAllowAttachments(e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                            />
                                            <label htmlFor="allowAttachments" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                                Allow Attachments
                                            </label>
                                        </div>
                                    </div>

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
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                    <h4 className="font-bold text-gray-700">
                                        Existing Questions ({currentQuestions.length})
                                    </h4>
                                    {selectedIds.length > 0 && (
                                        <button
                                            onClick={handleBulkDelete}
                                            className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete ({selectedIds.length})
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 py-2">
                                    <input
                                        type="checkbox"
                                        disabled={currentQuestions.length === 0}
                                        checked={currentQuestions.length > 0 && selectedIds.length === currentQuestions.length}
                                        onChange={(e) => handleSelectAll(e.target.checked, currentQuestions.map(q => q.id))}
                                        className="rounded border-gray-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500 font-medium select-none">Select All</span>
                                </div>
                                <div className="space-y-3 h-[500px] overflow-y-auto pr-2">
                                    {currentQuestions.length === 0 && (
                                        <p className="text-gray-400 italic text-sm text-center py-10">No questions yet.</p>
                                    )}
                                    {currentQuestions.map((q, i) => (
                                        <div key={q.id} className={`p-3 rounded-lg border shadow-sm relative group hover:border-indigo-200 transition-colors ${selectedIds.includes(q.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded">
                                                <button onClick={() => handleEditQuestion(q)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                                                <button onClick={() => confirmDelete(q.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(q.id)}
                                                        onChange={() => handleToggleSelect(q.id)}
                                                        className="rounded border-gray-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-gray-300 text-sm">#{i + 1}</span>
                                                        <div className="flex-1">
                                                            <p className="text-gray-800 text-sm font-medium line-clamp-2">{q.text}</p>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{q.type}</span>
                                                                <span className="text-[10px] bg-indigo-50 px-1.5 rounded text-indigo-500">{q.marks} m</span>
                                                                {q.image && <span className="text-[10px] bg-blue-50 px-1.5 rounded text-blue-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Image</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </Card >
                </div >
            )}
        </div >
    );
};

// Helper for dynamic classes
function clsx(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default QuestionBank;
