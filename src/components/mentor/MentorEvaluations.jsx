import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FileText, CalendarDays, CheckCircle, Clock } from 'lucide-react';
import DynamicFormRenderer from './DynamicFormRenderer';

const MentorEvaluations = () => {
    const { currentUser, evaluationForms, evaluationSubmissions } = useData();
    const [selectedForm, setSelectedForm] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'

    const userSubmissions = (evaluationSubmissions || []).filter(sub => sub.mentorId === currentUser?.id);
    const submittedFormIds = userSubmissions.map(sub => sub.formId);

    const pendingForms = useMemo(() => {
        return (evaluationForms || [])
            .filter(f => f.status === 'Published' && !submittedFormIds.includes(f.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [evaluationForms, submittedFormIds]);

    const completedForms = useMemo(() => {
        return (evaluationForms || [])
            .filter(f => submittedFormIds.includes(f.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [evaluationForms, submittedFormIds]);

    if (selectedForm) {
        return (
            <DynamicFormRenderer 
                form={selectedForm} 
                onCancel={() => setSelectedForm(null)}
                onComplete={() => {
                    setSelectedForm(null);
                    setActiveTab('completed');
                }}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        Monthly Evaluations
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Complete your monthly performance reflections</p>
                </div>
            </div>

            {/* Sub Nav */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Pending Required
                    {pendingForms.length > 0 && (
                        <span className="absolute top-2 right-1 flex h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center rounded-full font-black">
                            {pendingForms.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'completed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Completed Submissions
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {(activeTab === 'pending' ? pendingForms : completedForms).map(form => (
                    <Card key={form.id} className="p-6 overflow-hidden relative group border-gray-100 hover:border-indigo-200 transition-colors shadow-sm hover:shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 mb-1">{form.title}</h3>
                                <div className="text-sm font-bold text-indigo-600 flex items-center mb-1">
                                    {form.month} {form.year}
                                </div>
                            </div>
                            <div className="p-2 rounded-xl bg-gray-50 text-gray-400">
                                {activeTab === 'pending' ? <Clock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                            </div>
                        </div>

                        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2 font-medium">
                            <span className="bg-gray-100 px-2 py-1 rounded">
                                {form.sections?.length || 0} Parts
                            </span>
                            <span className="text-gray-300">•</span>
                            <span>{form.sections?.reduce((sum, sec) => sum + (sec.questions?.length || 0), 0) || 0} Questions required</span>
                        </div>

                        {activeTab === 'pending' ? (
                            <Button variant="primary" className="w-full justify-center" onClick={() => setSelectedForm(form)}>
                                Start Evaluation
                            </Button>
                        ) : (
                            <div className="pt-2 border-t border-gray-100">
                                <div className="text-sm text-green-600 font-bold flex items-center gap-1.5 justify-center mt-2">
                                    <CheckCircle className="w-4 h-4" /> Submitted
                                </div>
                                {/* Further expansion could allow mentor to view their own past answers. For now, we just indicate it's done. */}
                            </div>
                        )}
                    </Card>
                ))}

                {(activeTab === 'pending' && pendingForms.length === 0) && (
                    <div className="col-span-full py-16 text-center text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed">
                        <CheckCircle className="w-12 h-12 text-green-400 mb-3 mx-auto" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">You're all caught up!</h3>
                        <p>There are no pending evaluations requiring your attention.</p>
                    </div>
                )}
                
                {(activeTab === 'completed' && completedForms.length === 0) && (
                    <div className="col-span-full py-16 text-center text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed">
                        <FileText className="w-10 h-10 text-gray-300 mb-3 mx-auto" />
                        <p>You haven't completed any evaluations yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MentorEvaluations;
