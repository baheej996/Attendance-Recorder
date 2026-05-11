import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FileText, Plus, Copy, Trash2, Edit2, Play, Pause, Eye, FileBarChart, CheckCircle2, Users, Globe } from 'lucide-react';
import EvaluationFormBuilder from './EvaluationFormBuilder';
import EvaluationResponses from './EvaluationResponses';

const EvaluationManager = ({ type = 'mentor' }) => {
    const { 
        evaluationForms, deleteEvaluationForm, updateEvaluationForm, createEvaluationForm, 
        studentEvaluationTemplates, deleteStudentEvaluationTemplate, updateStudentEvaluationTemplate, createStudentEvaluationTemplate,
        parentFeedbackTemplates, deleteParentFeedbackTemplate, updateParentFeedbackTemplate, createParentFeedbackTemplate,
        addNotification, evaluationSubmissions, studentEvaluations, parentFeedbacks, mentors, currentUser
    } = useData();
    const [view, setView] = useState('list'); // list, builder, responses
    const [selectedForm, setSelectedForm] = useState(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [sharingForm, setSharingForm] = useState(null);

    const forms = type === 'student' ? studentEvaluationTemplates : type === 'parent' ? parentFeedbackTemplates : evaluationForms;
    
    // Select the correct submissions collection
    const submissions = type === 'student' ? studentEvaluations : type === 'parent' ? parentFeedbacks : evaluationSubmissions;
    
    const deleteFunc = type === 'student' ? deleteStudentEvaluationTemplate : type === 'parent' ? deleteParentFeedbackTemplate : deleteEvaluationForm;
    const updateFunc = type === 'student' ? updateStudentEvaluationTemplate : type === 'parent' ? updateParentFeedbackTemplate : updateEvaluationForm;
    const createFunc = type === 'student' ? createStudentEvaluationTemplate : type === 'parent' ? createParentFeedbackTemplate : createEvaluationForm;

    const sortedForms = [...(forms || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleCreateNew = () => {
        setSelectedForm(null);
        setView('builder');
    };

    const handleEdit = (form) => {
        setSelectedForm(JSON.parse(JSON.stringify(form)));
        setView('builder');
    };

    const togglePublish = async (form) => {
        const newStatus = form.status === 'Published' ? 'Draft' : 'Published';
        await updateFunc(form.id, { status: newStatus });
        
        if (newStatus === 'Published' && type === 'mentor') {
            if (form.sharingType === 'individual' && form.sharedMentorIds?.length > 0) {
                // Send specific notifications
                await Promise.all(form.sharedMentorIds.map(mentorId => 
                    addNotification({
                        title: 'New Evaluation Pending',
                        message: `The ${form.month} ${form.year} Monthly Evaluation is now available for you.`,
                        audience: 'specific_mentor',
                        targetId: mentorId,
                        senderId: 'admin',
                        senderName: 'Admin',
                        senderRole: 'Admin',
                        type: 'evaluation'
                    })
                ));
            } else {
                // Global notification
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
        }
    };

    const handleShare = (form) => {
        setSharingForm(JSON.parse(JSON.stringify(form)));
        setIsShareModalOpen(true);
    };

    const saveSharing = async (formId, sharingType, sharedMentorIds) => {
        await updateFunc(formId, { sharingType, sharedMentorIds });
        
        // Notify newly added mentors
        const oldForm = forms.find(f => f.id === formId);
        const newlyAdded = sharedMentorIds.filter(id => !(oldForm.sharedMentorIds || []).includes(id));
        
        if (newlyAdded.length > 0) {
            await Promise.all(newlyAdded.map(mentorId => 
                addNotification({
                    title: 'Form Shared with You',
                    message: `${currentUser.name} shared the "${oldForm.title}" evaluation form with you.`,
                    audience: 'specific_mentor',
                    targetId: mentorId,
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    senderRole: currentUser.role,
                    type: 'evaluation'
                })
            ));
        }
        
        setIsShareModalOpen(false);
        setSharingForm(null);
    };

    if (view === 'builder') {
        return <EvaluationFormBuilder 
                    templateType={type}
                    initialData={selectedForm} 
                    onClose={() => setView('list')} 
                />;
    }

    if (view === 'responses') {
        const filteredSubmissions = (submissions || []).filter(s => 
            (type === 'mentor' ? s.formId === selectedForm.id : s.templateId === selectedForm.id)
        );
        return <EvaluationResponses 
                    type={type}
                    form={selectedForm} 
                    submissions={filteredSubmissions}
                    onClose={() => setView('list')} 
                />;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileBarChart className="w-6 h-6 text-indigo-600" />
                        {type === 'student' ? 'Student Evaluation Templates' : type === 'parent' ? 'Parent Feedback Templates' : 'Monthly Mentor Evaluations'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {type === 'student' ? 'Design monthly evaluation cards for students.' : type === 'parent' ? 'Design feedback forms for parents.' : 'Create dynamic evaluation forms for Mentors.'}
                    </p>
                </div>
                <Button variant="primary" onClick={handleCreateNew} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create New {type === 'mentor' ? 'Form' : 'Template'}
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
                                {type === 'mentor' && (
                                    <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${form.sharingType === 'individual' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                        {form.sharingType === 'individual' ? (
                                            <>
                                                <Users className="w-3 h-3" />
                                                Shared with {form.sharedMentorIds?.length || 0} Mentors
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="w-3 h-3" />
                                                Global Visibility
                                            </>
                                        )}
                                    </div>
                                )}
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
                            <div className="ml-auto flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-black ring-1 ring-indigo-200">
                                {(submissions || []).filter(s => (type === 'mentor' ? s.formId === form.id : s.templateId === form.id)).length} Responses
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                            <button 
                                onClick={() => handleEdit(form)}
                                disabled={type === 'mentor' && form.creatorId !== currentUser.id}
                                className={`flex-1 flex justify-center items-center gap-1.5 py-2 px-3 text-sm font-semibold border rounded-lg transition-colors ${type === 'mentor' && form.creatorId !== currentUser.id ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'}`}
                                title={type === 'mentor' && form.creatorId !== currentUser.id ? "Only the creator can edit this form" : "Edit Form"}
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
                        
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {type === 'mentor' && form.creatorId === currentUser.id && (
                                <button 
                                    onClick={() => handleShare(form)}
                                    title="Share with Mentors"
                                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                >
                                    <Users className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => togglePublish(form)}
                                disabled={type === 'mentor' && form.creatorId !== currentUser.id}
                                title={form.status === 'Published' ? "Unpublish" : "Publish"}
                                className={`p-2 rounded-lg transition-colors border ${type === 'mentor' && form.creatorId !== currentUser.id ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100' : (form.status === 'Published' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100')}`}
                            >
                                {form.status === 'Published' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => {
                                    const { id, createdAt, status, ...rest } = form;
                                    createFunc({
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
                                    if(window.confirm("Are you sure you want to delete this form?")) {
                                        deleteFunc(form.id);
                                    }
                                }}
                                disabled={type === 'mentor' && form.creatorId !== currentUser.id}
                                title="Delete"
                                className={`p-2 rounded-lg transition-colors border ${type === 'mentor' && form.creatorId !== currentUser.id ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
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
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No forms yet</h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">Create a dynamic schema to collect responses.</p>
                    <Button variant="primary" onClick={handleCreateNew} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Form
                    </Button>
                </Card>
            )}
            {/* Share Modal */}
            {isShareModalOpen && sharingForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Share Form</h3>
                                <p className="text-sm text-gray-500 font-medium">Control who can see and fill this evaluation.</p>
                            </div>
                            <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <Plus className="w-5 h-5 text-gray-500 rotate-45" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="flex p-1 bg-gray-100 rounded-xl">
                                <button 
                                    onClick={() => setSharingForm({...sharingForm, sharingType: 'all'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${sharingForm.sharingType === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Globe className="w-4 h-4" />
                                    All Mentors
                                </button>
                                <button 
                                    onClick={() => setSharingForm({...sharingForm, sharingType: 'individual'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${sharingForm.sharingType === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Users className="w-4 h-4" />
                                    Specific Mentors
                                </button>
                            </div>

                            {sharingForm.sharingType === 'individual' && (
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Colleagues</label>
                                    <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {mentors.filter(m => m.id !== currentUser.id).map(mentor => (
                                            <label key={mentor.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 cursor-pointer transition-colors group">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={sharingForm.sharedMentorIds?.includes(mentor.id)}
                                                    onChange={(e) => {
                                                        const current = sharingForm.sharedMentorIds || [];
                                                        const next = e.target.checked ? [...current, mentor.id] : current.filter(id => id !== mentor.id);
                                                        setSharingForm({...sharingForm, sharedMentorIds: next});
                                                    }}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-700 group-hover:text-indigo-600">{mentor.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium">{mentor.email}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {(sharingForm.sharedMentorIds?.length || 0) === 0 && (
                                        <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg flex items-center gap-1.5">
                                            <Eye className="w-3.5 h-3.5" /> Please select at least one mentor or switch to Global.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-50">
                                <Button variant="secondary" className="flex-1" onClick={() => setIsShareModalOpen(false)}>Cancel</Button>
                                <Button 
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" 
                                    disabled={sharingForm.sharingType === 'individual' && (sharingForm.sharedMentorIds?.length || 0) === 0}
                                    onClick={() => saveSharing(sharingForm.id, sharingForm.sharingType, sharingForm.sharedMentorIds || [])}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default EvaluationManager;
