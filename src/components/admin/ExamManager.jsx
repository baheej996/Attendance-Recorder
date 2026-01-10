import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Trash2, Plus, Calendar, CheckCircle, Eye, EyeOff, Play, PauseCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

const ExamManager = () => {
    const { exams, addExam, updateExam, deleteExam } = useData();
    const { showConfirm } = useUI();
    const [newExam, setNewExam] = useState({ name: '', date: '', status: 'Draft' });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newExam.name || !newExam.date) return;
        addExam(newExam);
        setNewExam({ name: '', date: '', status: 'Draft' });
    };

    const toggleStatus = (exam) => {
        const newStatus = exam.status === 'Draft' ? 'Published' : 'Draft';
        updateExam(exam.id, { status: newStatus });
    };

    const toggleActive = (exam) => {
        updateExam(exam.id, { isActive: !exam.isActive });
    };

    const handleDelete = (id) => {
        showConfirm(
            "Delete Exam",
            "Are you sure you want to delete this exam? This action cannot be undone.",
            () => deleteExam(id)
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Exam Form */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-600" />
                        Create New Exam
                    </h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <Input
                            label="Exam Name"
                            placeholder="e.g. Mid-Term Examination 2024"
                            value={newExam.name}
                            onChange={e => setNewExam({ ...newExam, name: e.target.value })}
                            required
                        />
                        <Input
                            label="Start Date"
                            type="date"
                            value={newExam.date}
                            onChange={e => setNewExam({ ...newExam, date: e.target.value })}
                            required
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                            <select
                                value={newExam.status}
                                onChange={e => setNewExam({ ...newExam, status: e.target.value })}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                            >
                                <option value="Draft">Draft (Results Hidden)</option>
                                <option value="Published">Published (Results Visible)</option>
                            </select>
                        </div>
                        <Button type="submit" variant="primary" className="w-full">
                            Create Exam
                        </Button>
                    </form>
                </Card>

                {/* Exam List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Exam Schedule
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {exams.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No exams scheduled.
                            </div>
                        ) : (
                            exams.map(exam => (
                                <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900">{exam.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            {new Date(exam.date).toLocaleDateString()}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${exam.status === 'Published'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {exam.status}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${exam.isActive
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {exam.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleActive(exam)}
                                            className={`p-2 rounded-lg transition-colors ${exam.isActive
                                                ? 'text-blue-600 hover:bg-blue-50'
                                                : 'text-gray-400 hover:bg-gray-100'
                                                }`}
                                            title={exam.isActive ? "Deactivate (Students cannot take)" : "Activate (Students can take)"}
                                        >
                                            {exam.isActive ? <PauseCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(exam)}
                                            className={`p-2 rounded-lg transition-colors ${exam.status === 'Published'
                                                ? 'text-green-600 hover:bg-green-50'
                                                : 'text-gray-400 hover:bg-gray-100'
                                                }`}
                                            title={exam.status === 'Published' ? "Unpublish Results" : "Publish Results"}
                                        >
                                            {exam.status === 'Published' ? <CheckCircle className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(exam.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Exam"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamManager;
