import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    MessageCircle, 
    Plus, 
    Trash2, 
    Edit2, 
    Play, 
    Pause, 
    Search, 
    Filter, 
    CheckCircle, 
    Clock, 
    User, 
    FileText, 
    Star, 
    MessageSquare, 
    Check, 
    ArrowUpDown,
    Download,
    Eye,
    Shield
} from 'lucide-react';
import EvaluationFormBuilder from './EvaluationFormBuilder';
import { clsx } from 'clsx';

const ParentFeedbackManager = () => {
    const { 
        parentFeedbackTemplates, 
        deleteParentFeedbackTemplate, 
        updateParentFeedbackTemplate, 
        parentFeedbacks, 
        deleteParentFeedback,
        updateParentFeedbackStatusAndComment,
        classes,
        mentors,
        allStudents 
    } = useData();

    const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'templates'
    const [view, setView] = useState('list'); // 'list' | 'builder'
    const [selectedForm, setSelectedForm] = useState(null);

    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMentorId, setSelectedMentorId] = useState('all');
    const [selectedClassName, setSelectedClassName] = useState('all');
    const [selectedDivision, setSelectedDivision] = useState('all');
    const [selectedTemplateId, setSelectedTemplateId] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'pending' | 'reviewed'

    // Unique Class Names (e.g., '1', '2', '3', '4'...)
    const uniqueClassNames = useMemo(() => {
        const set = new Set();
        (classes || []).forEach(c => {
            if (c.name) set.add(String(c.name).trim());
        });
        (parentFeedbacks || []).forEach(f => {
            if (f.className) set.add(String(f.className).trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [classes, parentFeedbacks]);

    // Unique Divisions (e.g., 'A', 'B', 'C', 'N'...)
    const uniqueDivisions = useMemo(() => {
        const set = new Set();
        (classes || []).forEach(c => {
            if (c.division) set.add(String(c.division).trim());
        });
        (parentFeedbacks || []).forEach(f => {
            if (f.division) set.add(String(f.division).trim());
        });
        return Array.from(set).sort();
    }, [classes, parentFeedbacks]);

    // Helper to derive mentor name dynamically
    const getMentorName = (sub) => {
        if (sub?.mentorName && sub.mentorName !== 'Not Assigned' && sub.mentorName !== 'Unknown Mentor') {
            return sub.mentorName;
        }
        // 1. Try finding by classId / className
        const cls = (classes || []).find(c => c.id === sub?.classId || c.name === sub?.className);
        if (cls) {
            const mentor = (mentors || []).find(m => 
                m.id === cls.mentorId || 
                m.classId === cls.id || 
                (m.assignedClasses && m.assignedClasses.includes(cls.id)) ||
                m.assignedClass === cls.name
            );
            if (mentor?.name) return mentor.name;
        }
        // 2. Try finding by studentId
        const student = (allStudents || []).find(s => s.id === sub?.studentId);
        if (student) {
            const mentor = (mentors || []).find(m => m.id === student.mentorId || m.classId === student.classId);
            if (mentor?.name) return mentor.name;
        }
        return sub?.mentorName || 'Not Assigned';
    };

    // Unique Mentors (from mentors list + submissions)
    const mentorOptions = useMemo(() => {
        const map = new Map();
        (mentors || []).forEach(m => {
            if (m.id && m.name) map.set(m.id, m.name);
        });
        (parentFeedbacks || []).forEach(f => {
            const mName = getMentorName(f);
            if (mName && mName !== 'Not Assigned' && mName !== 'Unknown Mentor') {
                if (!Array.from(map.values()).includes(mName)) {
                    map.set(mName, mName);
                }
            }
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [mentors, parentFeedbacks, classes, allStudents]);

    // Comment editing state for individual submission
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [savingCommentId, setSavingCommentId] = useState(null);

    // Selected detail modal
    const [detailSubmission, setDetailSubmission] = useState(null);

    // Sort templates by date created
    const sortedTemplates = useMemo(() => {
        return [...(parentFeedbackTemplates || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [parentFeedbackTemplates]);

    // Submissions sorting: PENDING / UNREVIEWED FIRST, THEN NEWEST SUBMISSION DATE FIRST
    const processedSubmissions = useMemo(() => {
        let list = [...(parentFeedbacks || [])];

        // Search Filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(s => 
                (s.studentName && s.studentName.toLowerCase().includes(term)) ||
                (s.parentName && s.parentName.toLowerCase().includes(term)) ||
                (s.className && s.className.toLowerCase().includes(term))
            );
        }

        // Mentor Filter
        if (selectedMentorId !== 'all') {
            list = list.filter(s => {
                const subMentor = getMentorName(s);
                const targetMentor = mentorOptions.find(m => m.id === selectedMentorId);
                const targetName = targetMentor ? targetMentor.name : selectedMentorId;
                return s.mentorId === selectedMentorId || subMentor === targetName;
            });
        }

        // Class Name Filter
        if (selectedClassName !== 'all') {
            list = list.filter(s => {
                const cls = (classes || []).find(c => c.id === s.classId);
                const name = s.className || cls?.name || '';
                return String(name).trim() === selectedClassName;
            });
        }

        // Division Filter
        if (selectedDivision !== 'all') {
            list = list.filter(s => {
                const cls = (classes || []).find(c => c.id === s.classId);
                const div = s.division || cls?.division || '';
                return String(div).trim() === selectedDivision;
            });
        }

        // Template Filter
        if (selectedTemplateId !== 'all') {
            list = list.filter(s => s.templateId === selectedTemplateId);
        }

        // Status Filter
        if (selectedStatus !== 'all') {
            if (selectedStatus === 'pending') {
                list = list.filter(s => !s.status || s.status === 'pending' || !s.readByAdmin);
            } else if (selectedStatus === 'reviewed') {
                list = list.filter(s => s.status === 'reviewed' && s.readByAdmin);
            }
        }

        // Sort: Pending/Unreviewed first, then by date descending
        list.sort((a, b) => {
            const aIsPending = !a.status || a.status === 'pending' || !a.readByAdmin;
            const bIsPending = !b.status || b.status === 'pending' || !b.readByAdmin;

            if (aIsPending && !bIsPending) return -1;
            if (!aIsPending && bIsPending) return 1;

            return new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0);
        });

        return list;
    }, [parentFeedbacks, classes, mentors, allStudents, searchTerm, selectedMentorId, selectedClassName, selectedDivision, selectedTemplateId, selectedStatus, mentorOptions]);

    const unreviewedCount = useMemo(() => {
        return (parentFeedbacks || []).filter(s => !s.status || s.status === 'pending' || !s.readByAdmin).length;
    }, [parentFeedbacks]);

    const handleCreateNew = () => {
        setSelectedForm(null);
        setView('builder');
    };

    const handleEditForm = (form) => {
        setSelectedForm(JSON.parse(JSON.stringify(form)));
        setView('builder');
    };

    const togglePublish = async (form) => {
        const newStatus = form.status === 'Published' ? 'Draft' : 'Published';
        await updateParentFeedbackTemplate(form.id, { status: newStatus });
    };

    const handleSaveComment = async (submissionId) => {
        setSavingCommentId(submissionId);
        try {
            await updateParentFeedbackStatusAndComment(submissionId, {
                adminComment: commentText,
                commentedAt: new Date().toISOString()
            });
            setEditingCommentId(null);
        } catch (err) {
            console.error("Failed to save comment", err);
        } finally {
            setSavingCommentId(null);
        }
    };

    const handleToggleStatus = async (submission) => {
        const isReviewed = submission.status === 'reviewed' && submission.readByAdmin;
        const newStatus = isReviewed ? 'pending' : 'reviewed';
        await updateParentFeedbackStatusAndComment(submission.id, {
            status: newStatus,
            readByAdmin: newStatus === 'reviewed'
        });
        if (detailSubmission && detailSubmission.id === submission.id) {
            setDetailSubmission({ ...detailSubmission, status: newStatus, readByAdmin: newStatus === 'reviewed' });
        }
    };

    if (view === 'builder') {
        return (
            <EvaluationFormBuilder 
                templateType="parent"
                initialData={selectedForm} 
                onClose={() => setView('list')} 
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <MessageCircle className="w-7 h-7 text-indigo-600" />
                        Parent Feedback Portal Management
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        Strictly Confidential • Submissions reflect in Admin Portal only
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('submissions')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all relative flex items-center gap-2",
                                activeTab === 'submissions' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            Submissions
                            {unreviewedCount > 0 && (
                                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {unreviewedCount} NEW
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                activeTab === 'templates' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            Form Builder
                        </button>
                    </div>
                    {activeTab === 'templates' && (
                        <Button variant="primary" onClick={handleCreateNew} className="gap-2 text-xs">
                            <Plus className="w-4 h-4" /> Create Feedback Form
                        </Button>
                    )}
                </div>
            </div>

            {/* TAB 1: SUBMISSIONS LIST */}
            {activeTab === 'submissions' && (
                <div className="space-y-6">
                    {/* Filters & Search */}
                    <Card className="p-4 bg-white border-gray-100 shadow-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                <input 
                                    type="text"
                                    placeholder="Search parent/student..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Mentor Filter (BEFORE Class Filter) */}
                            <select 
                                value={selectedMentorId} 
                                onChange={e => setSelectedMentorId(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Mentors</option>
                                {mentorOptions.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>

                            {/* Class Name Filter */}
                            <select 
                                value={selectedClassName} 
                                onChange={e => setSelectedClassName(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Classes</option>
                                {uniqueClassNames.map(cName => (
                                    <option key={cName} value={cName}>Class {cName}</option>
                                ))}
                            </select>

                            {/* Division Filter */}
                            <select 
                                value={selectedDivision} 
                                onChange={e => setSelectedDivision(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Divisions</option>
                                {uniqueDivisions.map(div => (
                                    <option key={div} value={div}>Division ({div})</option>
                                ))}
                            </select>

                            {/* Form Template Filter */}
                            <select 
                                value={selectedTemplateId} 
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Forms</option>
                                {(parentFeedbackTemplates || []).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select 
                                value={selectedStatus} 
                                onChange={e => setSelectedStatus(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Statuses ({parentFeedbacks.length})</option>
                                <option value="pending">Unreviewed ({unreviewedCount})</option>
                                <option value="reviewed">Reviewed ({parentFeedbacks.length - unreviewedCount})</option>
                            </select>
                        </div>
                    </Card>

                    {/* Submissions Cards */}
                    {processedSubmissions.length === 0 ? (
                        <Card className="p-16 text-center text-gray-400 rounded-2xl border-2 border-dashed border-gray-200">
                            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <h3 className="text-lg font-bold text-gray-700">No Parent Feedback Submissions Found</h3>
                            <p className="text-xs text-gray-400 mt-1">When parents submit feedback from the student portal, responses will appear here.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {processedSubmissions.map((sub) => {
                                const isPending = !sub.status || sub.status === 'pending' || !sub.readByAdmin;
                                const template = (parentFeedbackTemplates || []).find(t => t.id === sub.templateId);

                                return (
                                    <Card 
                                        key={sub.id} 
                                        className={clsx(
                                            "p-6 transition-all border rounded-2xl relative overflow-hidden",
                                            isPending 
                                                ? "bg-amber-50/30 border-amber-200 shadow-md ring-1 ring-amber-400/30" 
                                                : "bg-white border-gray-100 shadow-sm hover:shadow-md"
                                        )}
                                    >
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0",
                                                    isPending ? "bg-amber-500" : "bg-indigo-600"
                                                )}>
                                                    <User className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-black text-gray-900">{sub.parentName || 'Parent / Guardian'}</h3>
                                                        {isPending ? (
                                                            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                                                New Feedback
                                                            </span>
                                                        ) : (
                                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3 text-emerald-600" /> Reviewed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                        Student: <span className="font-bold text-indigo-600">{sub.studentName}</span> • Class: <span className="font-semibold text-gray-700">{sub.className}</span> {sub.division && `(${sub.division})`} • Mentor: <span className="font-bold text-purple-700">{getMentorName(sub)}</span>
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Submitted: {new Date(sub.submittedAt || sub.createdAt || Date.now()).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end md:self-auto">
                                                <Button 
                                                    variant={isPending ? "primary" : "outline"} 
                                                    onClick={() => handleToggleStatus(sub)}
                                                    className="gap-1.5 text-xs py-1.5 px-3 rounded-xl"
                                                >
                                                    {isPending ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                    {isPending ? "Mark as Reviewed" : "Mark Unreviewed"}
                                                </Button>
                                                <Button 
                                                    variant="secondary" 
                                                    onClick={() => setDetailSubmission(sub)}
                                                    className="gap-1.5 text-xs py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                                                >
                                                    <Eye className="w-4 h-4 text-indigo-600" /> View Full Answers
                                                </Button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm("Delete this parent feedback submission?")) {
                                                            deleteParentFeedback(sub.id);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete Submission"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Brief Preview of Answers */}
                                        <div className="py-4 space-y-3">
                                            {template ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {template.sections.flatMap(sec => sec.questions).slice(0, 4).map(q => {
                                                        const answer = sub.responses?.[q.id];
                                                        if (answer === undefined || answer === null || answer === '') return null;
                                                        
                                                        return (
                                                            <div key={q.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 truncate">{q.label}</p>
                                                                {q.type === 'star_rating' ? (
                                                                    <div className="flex items-center gap-1 font-bold text-amber-500">
                                                                        <span>{answer} ⭐</span>
                                                                    </div>
                                                                ) : q.type === 'matrix_rating' && typeof answer === 'object' ? (
                                                                    <div className="space-y-1">
                                                                        {Object.entries(answer).slice(0, 2).map(([k, v]) => (
                                                                            <div key={k} className="flex justify-between font-medium">
                                                                                <span className="truncate pr-2 text-gray-600">{k}:</span>
                                                                                <span className="font-bold text-amber-500">{v} ⭐</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="font-semibold text-gray-800 line-clamp-2">
                                                                        {Array.isArray(answer) ? answer.join(', ') : String(answer)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 italic">Submitted using legacy/custom template.</p>
                                            )}
                                        </div>

                                        {/* Admin Comment / Note Section */}
                                        <div className="mt-2 pt-3 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <MessageSquare className="w-3.5 h-3.5" /> Admin Note / Internal Comment
                                                </span>
                                                {editingCommentId !== sub.id && (
                                                    <button 
                                                        onClick={() => {
                                                            setEditingCommentId(sub.id);
                                                            setCommentText(sub.adminComment || '');
                                                        }}
                                                        className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                                    >
                                                        <Edit2 className="w-3 h-3" /> {sub.adminComment ? 'Edit Note' : 'Add Note'}
                                                    </button>
                                                )}
                                            </div>

                                            {editingCommentId === sub.id ? (
                                                <div className="space-y-2">
                                                    <textarea 
                                                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        placeholder="Write an internal admin note for this feedback..."
                                                        rows={2}
                                                        value={commentText}
                                                        onChange={e => setCommentText(e.target.value)}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            onClick={() => setEditingCommentId(null)}
                                                            className="text-xs py-1 px-3"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button 
                                                            variant="primary" 
                                                            onClick={() => handleSaveComment(sub.id)}
                                                            disabled={savingCommentId === sub.id}
                                                            className="text-xs py-1 px-3"
                                                        >
                                                            {savingCommentId === sub.id ? 'Saving...' : 'Save Note'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {sub.adminComment ? (
                                                        <p className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200 font-medium leading-relaxed">
                                                            "{sub.adminComment}"
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 italic">No admin notes added yet.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: FORM BUILDER TEMPLATES LIST */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedTemplates.map(form => (
                        <Card key={form.id} className="p-6 relative group border border-gray-100 hover:shadow-lg transition-all hover:border-indigo-100">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${form.status === 'Published' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${form.status === 'Published' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    {form.status || 'Draft'}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleEditForm(form)} 
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                        title="Edit Template"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if(window.confirm("Delete this Parent Feedback Form template?")) {
                                                deleteParentFeedbackTemplate(form.id);
                                            }
                                        }} 
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Delete Template"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">{form.title}</h3>
                            <p className="text-xs text-gray-400 mb-4">{form.month} {form.year} • {(form.sections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0)} Questions</p>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                                <Button 
                                    variant={form.status === 'Published' ? "outline" : "primary"} 
                                    onClick={() => togglePublish(form)}
                                    className="gap-2 text-xs w-full justify-center"
                                >
                                    {form.status === 'Published' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    {form.status === 'Published' ? 'Unpublish' : 'Publish for Parents'}
                                </Button>
                            </div>
                        </Card>
                    ))}

                    {sortedTemplates.length === 0 && (
                        <div className="col-span-full py-16 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-500">No Feedback Forms Created</h3>
                            <p className="text-xs text-gray-400 mt-1 mb-4">Create your first dynamic parent feedback form to gather input from parents.</p>
                            <Button variant="primary" onClick={handleCreateNew} className="gap-2">
                                <Plus className="w-4 h-4" /> Create Feedback Form
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* FULL SUBMISSION DETAIL MODAL */}
            {detailSubmission && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setDetailSubmission(null)}>
                    <div className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start border-b pb-4">
                            <div>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                                    <Shield className="w-3.5 h-3.5 text-emerald-600" /> Confidential Parent Feedback
                                </span>
                                <h3 className="text-2xl font-black text-gray-900 mt-2">{detailSubmission.parentName || 'Parent / Guardian'}</h3>
                                <p className="text-sm text-gray-500 font-bold">
                                    Student: {detailSubmission.studentName} • Class: {detailSubmission.className} • Mentor: <span className="text-purple-700 font-extrabold">{getMentorName(detailSubmission)}</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Submitted: {new Date(detailSubmission.submittedAt || Date.now()).toLocaleString()}
                                </p>
                            </div>
                            <Button variant="secondary" onClick={() => setDetailSubmission(null)} className="text-xs">
                                Close
                            </Button>
                        </div>

                        {/* Answers Breakdown */}
                        <div className="space-y-6">
                            {(() => {
                                const template = (parentFeedbackTemplates || []).find(t => t.id === detailSubmission.templateId);
                                if (!template) {
                                    return (
                                        <div className="space-y-4">
                                            {Object.entries(detailSubmission.responses || {}).map(([k, v]) => (
                                                <div key={k} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <p className="text-xs font-bold text-gray-500 mb-1">{k}</p>
                                                    <p className="text-sm font-black text-gray-900">{String(v)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                return template.sections.map(section => (
                                    <div key={section.id} className="space-y-4">
                                        <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest border-b pb-1">
                                            {section.title}
                                        </h4>
                                        <div className="space-y-4">
                                            {section.questions.map(q => {
                                                const answer = detailSubmission.responses?.[q.id];
                                                const hasAnswer = answer !== undefined && answer !== null && answer !== '';

                                                return (
                                                    <div key={q.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                                                        <p className="text-xs font-bold text-gray-700">{q.label}</p>
                                                        
                                                        {!hasAnswer ? (
                                                            <p className="text-xs text-gray-400 italic">No response provided.</p>
                                                        ) : q.type === 'star_rating' ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex text-amber-400 text-lg">
                                                                    {[1, 2, 3, 4, 5].map(s => (
                                                                        <span key={s}>{s <= Number(answer) ? '⭐' : '☆'}</span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{answer} / 5 Stars</span>
                                                            </div>
                                                        ) : q.type === 'matrix_rating' && typeof answer === 'object' ? (
                                                            <div className="space-y-2 pt-1">
                                                                {Object.entries(answer).map(([aspect, score]) => (
                                                                    <div key={aspect} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
                                                                        <span className="font-bold text-gray-700">{aspect}</span>
                                                                        <div className="flex items-center gap-1.5 text-amber-500 font-black">
                                                                            <span>{score} ⭐</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white p-3 rounded-xl border border-gray-100 text-sm font-semibold text-gray-900 leading-relaxed">
                                                                {Array.isArray(answer) ? answer.join(', ') : String(answer)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Admin Note Box in Detail Modal */}
                        <div className="pt-4 border-t border-gray-100 bg-indigo-50/50 p-4 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">
                                    Admin Note / Comment
                                </span>
                            </div>
                            <textarea 
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Add admin note..."
                                rows={2}
                                value={detailSubmission.adminComment || ''}
                                onChange={e => setDetailSubmission({ ...detailSubmission, adminComment: e.target.value })}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <Button 
                                    variant="primary" 
                                    onClick={async () => {
                                        await updateParentFeedbackStatusAndComment(detailSubmission.id, {
                                            adminComment: detailSubmission.adminComment,
                                            commentedAt: new Date().toISOString()
                                        });
                                        alert("Admin note saved!");
                                    }}
                                    className="text-xs py-1.5 px-4"
                                >
                                    Save Note
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentFeedbackManager;
