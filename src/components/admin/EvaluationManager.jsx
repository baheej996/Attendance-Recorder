import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FileText, Plus, Copy, Trash2, Edit2, Play, Pause, Eye, FileBarChart, CheckCircle2 } from 'lucide-react';
import EvaluationFormBuilder from './EvaluationFormBuilder';
import EvaluationResponses from './EvaluationResponses';

const EvaluationManager = () => {
    const { evaluationForms, deleteEvaluationForm, updateEvaluationForm, createEvaluationForm, addNotification, evaluationSubmissions } = useData();
    const [view, setView] = useState('list'); // list, builder, responses
    const [selectedForm, setSelectedForm] = useState(null);

    const sortedForms = [...(evaluationForms || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleCreateNew = () => {
        setSelectedForm(null);
        setView('builder');
    };

    const handleEdit = (form) => {
        // Create a deep copy to avoid mutating state directly in the builder before save
        setSelectedForm(JSON.parse(JSON.stringify(form)));
        setView('builder');
    };

    const handleDuplicate = async (form) => {
        const { id, createdAt, status, ...rest } = form;
        const newForm = {
            ...rest,
            title: `${form.title} (Copy)`,
            status: 'Draft',
            createdAt: new Date().toISOString()
        };
        // We need to call createEvaluationForm, but we can just use DataContext or handle it here if it's tricky.
        // Actually DataContext has `createEvaluationForm`. Let's assume it's imported from useData. 
        // Oh wait, createEvaluationForm is in DataContext. I'll import it.
    };

    const togglePublish = async (form) => {
        const newStatus = form.status === 'Published' ? 'Draft' : 'Published';
        await updateEvaluationForm(form.id, { status: newStatus });
        
        if (newStatus === 'Published') {
            await addNotification({
                title: 'New Evaluation Pending',
                message: `The ${form.month} ${form.year} Monthly Evaluation is now available. Please complete it.`,
                audience: 'mentors',
                senderId: 'admin',
                senderName: 'Admin',
                senderRole: 'Admin',
                type: 'evaluation'
            });
        }
    };

    if (view === 'builder') {
        return <EvaluationFormBuilder 
                    initialData={selectedForm} 
                    onClose={() => setView('list')} 
                />;
    }

    if (view === 'responses') {
        return <EvaluationResponses 
                    form={selectedForm} 
                    onClose={() => setView('list')} 
                />;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileBarChart className="w-6 h-6 text-indigo-600" />
                        Monthly Evaluations
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Create dynamic evaluation forms and collect responses from Mentors.</p>
                </div>
                <Button variant="primary" onClick={handleCreateNew} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create New Form
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedForms.map(form => (
                    <Card key={form.id} className="p-6 relative group border border-gray-100 hover:shadow-lg transition-all hover:border-indigo-100">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${form.status === 'Published' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                    {form.status === 'Published' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                    {form.status}
                                </span>
                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{form.title}</h3>
                                <div className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {form.month} {form.year}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-1"><span className="font-bold text-gray-700">{form.sections?.length || 0}</span> <span className="text-[10px] uppercase font-bold text-gray-400">Parts</span></div>
                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-gray-700">
                                    {form.sections?.reduce((sum, sec) => sum + (sec.questions?.length || 0), 0) || 0}
                                </span> <span className="text-[10px] uppercase font-bold text-gray-400">Qs</span>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-black ring-1 ring-red-200">
                                {(evaluationSubmissions || []).filter(s => s.formId === form.id).length} Responses
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                            <button 
                                onClick={() => handleEdit(form)}
                                className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Edit2 className="w-4 h-4 text-gray-400" />
                                Edit Form
                            </button>
                            <button 
                                onClick={() => {
                                    setSelectedForm(form);
                                    setView('responses');
                                }}
                                className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                                <Eye className="w-4 h-4 opacity-70" />
                                Responses
                            </button>
                        </div>
                        
                        {/* More Actions (Absolute positioning overlay on hover) */}
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => togglePublish(form)}
                                title={form.status === 'Published' ? "Unpublish" : "Publish"}
                                className={`p-2 rounded-lg transition-colors border ${form.status === 'Published' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                            >
                                {form.status === 'Published' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => {
                                    const { id, createdAt, status, ...rest } = form;
                                    createEvaluationForm({
                                        ...rest,
                                        title: `${form.title} (Copy)`,
                                        status: 'Draft'
                                    });
                                }}
                                title="Duplicate"
                                className="p-2 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => {
                                    if(window.confirm("Are you sure you want to delete this form? Any mentor responses tied to this form may become orphaned.")) {
                                        deleteEvaluationForm(form.id);
                                    }
                                }}
                                title="Delete"
                                className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
            {sortedForms.length === 0 && (
                <Card className="p-12 border-dashed flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                        <FileBarChart className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Evaluation Forms yet</h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">Create a dynamic schema to collect monthly evaluations from your mentors.</p>
                    <Button variant="primary" onClick={handleCreateNew} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Form
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default EvaluationManager;
