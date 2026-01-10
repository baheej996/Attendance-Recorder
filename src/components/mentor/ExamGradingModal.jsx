import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Button } from '../ui/Button';
import { X, Save, Check, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

const ExamGradingModal = ({ isOpen, onClose, examId, subjectId, studentId, studentName }) => {
    const { questions, studentResponses, classes, recordResult } = useData();
    const { showAlert } = useUI();
    const [manualMarks, setManualMarks] = useState({});

    if (!isOpen) return null;

    // 1. Get Questions for this Exam + Subject + Class
    // Wait, I need the student's class name to filter questions correctly.
    // I don't have student object passed fully, only ID.
    // I should probably lookup student or pass class name.
    // Let's assume I can find the student or use questions matching the examId/subjectId
    // AND match the student's response?

    // Better: Get the Response first.
    const response = studentResponses.find(r =>
        r.examId === examId &&
        r.subjectId === subjectId &&
        r.studentId === studentId
    );

    if (!response) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
                    <p className="text-gray-500 mb-4">No submission found for this student.</p>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        );
    }

    // Now get questions. Questions are linked to Class Name. 
    // The response doesn't store Class Name, but we can assume the questions valid for this exam/subject 
    // are the ones we care about.
    // Actually, we can just look at `response.answers` keys (Question IDs).
    const questionIds = Object.keys(response.answers);
    const relevantQuestions = questions.filter(q => questionIds.includes(q.id));

    // Initialize state with auto-scores or existing manual marks
    // We don't store manual marks in response separate from 'autoScore' currently.
    // So we restart from: MCQ = auto, Text = 0.
    // UNLESS we saved it back to response? 
    // Simplification: We only save TOTAL to 'results'. 
    // So every time we open this, we re-grade.
    // Use `questions` to determine correct answers/marks.

    const calculateCurrentTotal = () => {
        let total = 0;
        relevantQuestions.forEach(q => {
            // If we have a manual mark set in state, use it.
            if (manualMarks[q.id] !== undefined) {
                total += Number(manualMarks[q.id]);
            } else {
                // Default logic
                if (q.type === 'MCQ') {
                    if (response.answers[q.id] === q.correctAnswer) {
                        total += Number(q.marks);
                    }
                }
            }
        });
        return total;
    };

    const handleSave = () => {
        const totalScore = calculateCurrentTotal();
        // Update Results
        recordResult({
            examId,
            subjectId,
            records: [{ studentId, marks: totalScore }]
        });
        onClose();
        onClose();
        showAlert('Grading Complete', `Score Updated: ${totalScore}`, 'success');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Grading: {studentName}</h3>
                        <p className="text-sm text-gray-500">Submitted: {new Date(response.timestamp).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {relevantQuestions.map((q, idx) => {
                        const studentAns = response.answers[q.id];
                        const isMCQ = q.type === 'MCQ';
                        const isCorrect = isMCQ && studentAns === q.correctAnswer;
                        const score = manualMarks[q.id] !== undefined
                            ? manualMarks[q.id]
                            : (isCorrect ? q.marks : 0);

                        return (
                            <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-gray-800">Q{idx + 1}. {q.text}</h4>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{q.marks} Marks</span>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-md mb-3">
                                    <p className="text-sm text-gray-500 mb-1">Student Answer:</p>
                                    <p className={clsx(
                                        "font-medium",
                                        isMCQ ? (isCorrect ? "text-green-700" : "text-red-700") : "text-gray-900"
                                    )}>
                                        {studentAns || "(No Answer)"}
                                        {isMCQ && (isCorrect ? <Check className="inline w-4 h-4 ml-2" /> : <XCircle className="inline w-4 h-4 ml-2" />)}
                                    </p>
                                </div>

                                {!isMCQ && (
                                    <div className="flex items-center gap-4 mt-2">
                                        <label className="text-sm font-medium text-gray-700">Marks Awarded:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={q.marks}
                                            value={score}
                                            onChange={(e) => setManualMarks(prev => ({ ...prev, [q.id]: Number(e.target.value) }))}
                                            className="w-20 rounded border-gray-300 shadow-sm p-1 text-sm border"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-xl">
                    <div className="text-lg">
                        Total Score: <span className="font-bold text-indigo-600">{calculateCurrentTotal()}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave}>Save & Finalize</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamGradingModal;
