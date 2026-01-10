import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Plus, Trash2, CheckCircle, HelpCircle, FileText, X } from 'lucide-react';

const QuestionBank = () => {
    const { questions, addQuestion, deleteQuestion, exams, classes, subjects, currentUser } = useData();

    // Selection State
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // New Question Form State
    const [qType, setQType] = useState('MCQ'); // MCQ, Short, Paragraph
    const [qText, setQText] = useState('');
    const [qMarks, setQMarks] = useState(1);
    const [options, setOptions] = useState(['', '', '', '']); // Default 4 options for MCQ
    const [correctAnswer, setCorrectAnswer] = useState('');

    // Filtered Data
    // Admin exams are global. 
    // Classes/Subjects might be filtered by what the mentor teaches? 
    // For now, show all classes/subjects or filter by mentor's assignment if complex.
    // Simplifying: Show all for now or user can select.

    // Filter questions based on selection
    const filteredQuestions = questions.filter(q =>
        q.examId === selectedExamId &&
        q.classId === selectedClassId &&
        q.subjectId === selectedSubjectId
    );

    const handleAddQuestion = (e) => {
        e.preventDefault();
        if (!selectedExamId || !selectedClassId || !selectedSubjectId || !qText) return;

        const question = {
            examId: selectedExamId,
            classId: selectedClassId,
            subjectId: selectedSubjectId,
            type: qType,
            text: qText,
            marks: qMarks,
            options: qType === 'MCQ' ? options : [],
            correctAnswer: qType === 'MCQ' ? correctAnswer : null
        };

        addQuestion(question);

        // Reset form but keep selection
        setQText('');
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Selection Panel */}
                <Card className="p-6 md:col-span-1 h-fit">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                        Select Context
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                            <select
                                value={selectedExamId}
                                onChange={e => setSelectedExamId(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border bg-white"
                            >
                                <option value="">-- Choose Exam --</option>
                                {exams.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class (e.g. 10, 9)</label>
                            {/* We should probably group by Name/Std rather than Division ID if we want shared questions? 
                                User Requirement: "linked to ClassLevel + SubjectName rather than specific Division IDs" 
                                BUT for simplicity, let's use the Class ID for now, or distinct Names.
                                Let's show distinct Class Names to select. */}
                            <select
                                value={selectedClassId}
                                onChange={e => setSelectedClassId(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border bg-white"
                            >
                                <option value="">-- Choose Class --</option>
                                {[...new Set(classes.map(c => c.name))].map(name => (
                                    <option key={name} value={name}>Class {name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                            {/* Filter subjects by selected Class Name if possible, or just exact Subject Name?
                                Subjects are linked to Class ID in DB.
                                If I select ClassName="10", I should find all subjects linked to ANY Class 10 section. */}
                            <select
                                value={selectedSubjectId}
                                onChange={e => setSelectedSubjectId(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border bg-white"
                            >
                                <option value="">-- Choose Subject --</option>
                                {[...new Set(subjects.map(s => s.name))].map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Card>

                {/* 2. Question Form & List */}
                <div className="md:col-span-2 space-y-6">
                    {selectedExamId && selectedClassId && selectedSubjectId ? (
                        <>
                            {/* Create Form */}
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-indigo-600" />
                                    Add New Question
                                </h3>
                                <form onSubmit={handleAddQuestion} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                                            <select
                                                value={qType}
                                                onChange={e => setQType(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm p-2 bg-white border"
                                            >
                                                <option value="MCQ">Multiple Choice (MCQ)</option>
                                                <option value="Short">Small Text Answer</option>
                                                <option value="Paragraph">Paragraph Answer</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={qMarks}
                                                onChange={e => setQMarks(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm p-2 border"
                                            />
                                        </div>
                                    </div>

                                    <Input
                                        label="Question Text"
                                        value={qText}
                                        onChange={e => setQText(e.target.value)}
                                        placeholder="Enter the question here..."
                                    />

                                    {/* MCQ Options */}
                                    {qType === 'MCQ' && (
                                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm font-medium text-gray-700">Options</p>
                                            {options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="text-gray-500 w-6">{String.fromCharCode(65 + idx)}.</span>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => updateOption(idx, e.target.value)}
                                                        className="flex-1 rounded-md border-gray-300 shadow-sm p-1.5 border text-sm"
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
                                            <p className="text-xs text-gray-500 mt-1">* Select the radio button next to the correct answer.</p>
                                        </div>
                                    )}

                                    <Button type="submit" variant="primary" className="w-full">
                                        Add Question to Bank
                                    </Button>
                                </form>
                            </Card>

                            {/* Existing Questions List */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center justify-between">
                                    <span>Questions in this Set</span>
                                    <span className="text-sm font-normal bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                                        {filteredQuestions.length} Questions
                                    </span>
                                </h3>

                                <div className="space-y-3">
                                    {filteredQuestions.length === 0 && (
                                        <p className="text-gray-500 text-center py-8 bg-white rounded-xl border border-dashed">
                                            No questions added yet for this exam/class/subject.
                                        </p>
                                    )}
                                    {filteredQuestions.map((q, i) => (
                                        <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                                            <button
                                                onClick={() => deleteQuestion(q.id)}
                                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="flex gap-3">
                                                <span className="font-bold text-gray-400">Q{i + 1}.</span>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 mb-2">{q.text}</p>

                                                    {q.type === 'MCQ' && (
                                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                            {q.options.map((opt, idx) => (
                                                                <div key={idx} className={clsx(
                                                                    "px-2 py-1 rounded bg-gray-50",
                                                                    opt === q.correctAnswer && "bg-green-50 text-green-700 border border-green-200"
                                                                )}>
                                                                    {String.fromCharCode(65 + idx)}. {opt}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="mt-2 flex gap-2 text-xs">
                                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">{q.type}</span>
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600">{q.marks} Marks</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full min-h-[400px] bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                            <div className="text-center">
                                <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Select Exam, Class, and Subject on the left<br />to manage questions.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for dynamic classes
function clsx(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default QuestionBank;
