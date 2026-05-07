import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    Replace, AlertCircle, CheckCircle, Clock, FileText, Check, X, 
    ArrowRight, UserCircle2, IndianRupee, HandCoins, Edit, Trash2, BookOpen, ImageIcon, Video
} from 'lucide-react';
import { addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { clsx } from 'clsx';

const ClassSubstitution = () => {
    const { currentUser, mentors, classes, subjects, substitutionRequests, impersonate } = useData();
    const { showAlert } = useUI();
    const [activeTab, setActiveTab] = useState('incoming');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRequestId, setEditingRequestId] = useState(null);

    // Form State
    const [targetMentorId, setTargetMentorId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [date, setDate] = useState('');
    const [portion, setPortion] = useState('');
    const [notes, setNotes] = useState('');
    
    // Attachment State
    const [attachedSubjectId, setAttachedSubjectId] = useState('');
    const [attachedChapterIndex, setAttachedChapterIndex] = useState('');
    
    // Gallery State
    const [viewingGallery, setViewingGallery] = useState(null); // { title: '', images: [] }
    const [overrideModalData, setOverrideModalData] = useState({ isOpen: false, requestId: null, link: '' });

    // Derived Data
    const assignedClasses = useMemo(() => {
        if (!currentUser?.assignedClassIds) return [];
        return classes.filter(c => currentUser.assignedClassIds.includes(c.id));
    }, [classes, currentUser]);

    const availableMentors = useMemo(() => {
        return mentors.filter(m => m.id !== currentUser.id);
    }, [mentors, currentUser]);

    // Dependent Form Dropdowns
    const availableSubjects = useMemo(() => {
        if (!selectedClassId) return [];
        return (subjects || []).filter(s => s.classId === selectedClassId);
    }, [subjects, selectedClassId]);

    const availableChapters = useMemo(() => {
        if (!attachedSubjectId) return [];
        const sub = subjects?.find(s => s.id === attachedSubjectId);
        if (!sub || !sub.totalChapters) return [];
        return Array.from({length: sub.totalChapters}, (_, i) => i + 1);
    }, [subjects, attachedSubjectId]);

    // Sorting logic: Pending requests at the top, then date-based sorting
    const mySentRequests = useMemo(() => {
        return (substitutionRequests || []).filter(r => r.requesterId === currentUser.id)
            .sort((a, b) => {
                if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
    }, [substitutionRequests, currentUser]);

    const incomingRequests = useMemo(() => {
        return (substitutionRequests || []).filter(r => r.substituteId === currentUser.id && r.status === 'Pending Substitute Approval')
            .sort((a, b) => {
                return new Date(a.date) - new Date(b.date);
            });
    }, [substitutionRequests, currentUser]);

    const historyRequests = useMemo(() => {
        return (substitutionRequests || []).filter(r => r.substituteId === currentUser.id && ['Accepted', 'Rejected', 'Completed', 'Settled'].includes(r.status))
            .sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });
    }, [substitutionRequests, currentUser]);

    const ledgerToGet = useMemo(() => {
        return (substitutionRequests || []).filter(r => 
            r.substituteId === currentUser.id && 
            (r.status === 'Completed' || r.status === 'Settled')
        );
    }, [substitutionRequests, currentUser]);

    const ledgerToGive = useMemo(() => {
        return (substitutionRequests || []).filter(r => 
            r.requesterId === currentUser.id && 
            (r.status === 'Completed' || r.status === 'Settled')
        );
    }, [substitutionRequests, currentUser]);

    const totalToGet = ledgerToGet.filter(r => r.status === 'Completed').reduce((sum, r) => sum + (r.amount || 150), 0);
    const totalToGive = ledgerToGive.filter(r => r.status === 'Completed').reduce((sum, r) => sum + (r.amount || 150), 0);

    const helperGetMentorName = (id) => mentors?.find(m => m.id === id)?.name || 'Unknown Mentor';
    const helperGetClassName = (id) => {
        const c = classes?.find(c => c.id === id);
        return c ? `${c.name}-${c.division}` : 'Unknown Class';
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        if (!targetMentorId || !selectedClassId || !date || !portion) {
            showAlert('Error', 'Please fill in all required fields.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const requestPayload = {
                requesterId: currentUser.id,
                substituteId: targetMentorId,
                classId: selectedClassId,
                date,
                portion,
                notes,
                attachedSubjectId: attachedSubjectId || null,
                attachedChapterIndex: attachedChapterIndex || null,
                status: 'Pending Admin Approval',
                amount: 150,
                createdAt: new Date().toISOString()
            };

            if (editingRequestId) {
                // Remove createdAt from update to not overwrite original
                delete requestPayload.createdAt;
                await updateDoc(doc(db, 'substitutionRequests', editingRequestId), requestPayload);
                showAlert('Success', 'Substitution request updated successfully.', 'success');
            } else {
                await addDoc(collection(db, 'substitutionRequests'), requestPayload);
                showAlert('Success', 'Substitution request sent successfully.', 'success');
            }
            
            resetForm();
            setActiveTab('sent');
        } catch (error) {
            console.error('Error creating/updating request:', error);
            showAlert('Error', 'Failed to save request.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTargetMentorId('');
        setSelectedClassId('');
        setDate('');
        setPortion('');
        setNotes('');
        setAttachedSubjectId('');
        setAttachedChapterIndex('');
        setEditingRequestId(null);
    };

    const startEditing = (req) => {
        setTargetMentorId(req.substituteId);
        setSelectedClassId(req.classId);
        setDate(req.date);
        setPortion(req.portion);
        setNotes(req.notes || '');
        setAttachedSubjectId(req.attachedSubjectId || '');
        setAttachedChapterIndex(req.attachedChapterIndex || '');
        setEditingRequestId(req.id);
        setActiveTab('create');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteRequest = async (reqId) => {
        if (window.confirm("Are you sure you want to delete this pending request?")) {
            try {
                await deleteDoc(doc(db, 'substitutionRequests', reqId));
                showAlert('Success', 'Request deleted.', 'success');
            } catch (error) {
                showAlert('Error', 'Failed to delete request.', 'error');
            }
        }
    };

    const updateRequestStatus = async (requestId, newStatus) => {
        try {
            await updateDoc(doc(db, 'substitutionRequests', requestId), {
                status: newStatus
            });
            showAlert('Success', `Request marked as ${newStatus}.`, 'success');
        } catch (error) {
            console.error('Error updating request:', error);
            showAlert('Error', 'Failed to update request status.', 'error');
        }
    };

    const handleAcceptRequest = async () => {
        if (!overrideModalData.requestId) return;
        try {
            await updateDoc(doc(db, 'substitutionRequests', overrideModalData.requestId), {
                status: 'Accepted',
                substituteLiveLink: overrideModalData.link || ''
            });
            showAlert('Success', `Request marked as Accepted.`, 'success');
            setOverrideModalData({ isOpen: false, requestId: null, link: '' });
        } catch (error) {
            console.error('Error accepting request:', error);
            showAlert('Error', 'Failed to accept request.', 'error');
        }
    };

    const handleDirectSignIn = (mentorId) => {
        const targetMentor = mentors?.find(m => m.id === mentorId);
        if (targetMentor) {
            impersonate({ role: 'mentor', ...targetMentor });
            // FORCE A HARD RELOAD to ensure the entire app re-mounts as the impersonated user
            window.location.href = '/mentor'; 
        } else {
             showAlert('Error', 'Mentor account not found.', 'error');
        }
    };

    const handleOpenAttachment = (req) => {
        if (!req.attachedSubjectId || !req.attachedChapterIndex) return;
        
        const subject = subjects?.find(s => s.id === req.attachedSubjectId);
        if (!subject || !subject.chapterData) {
            showAlert('Not Found', 'The attached chapter data could not be found.', 'error');
            return;
        }

        const chapterData = subject.chapterData[req.attachedChapterIndex];
        if (!chapterData || !chapterData.images || chapterData.images.length === 0) {
            showAlert('No Pages', 'There are no pages uploaded for this chapter.', 'warning');
            return;
        }

        setViewingGallery({
            title: `${subject.name} - Chapter ${req.attachedChapterIndex}`,
            images: chapterData.images
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending Admin Approval': return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full border border-gray-200">Awaiting Admin Review</span>;
            case 'Rejected by Admin': return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">Rejected by Admin</span>;
            case 'Pending Substitute Approval': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">Waiting for Mentor Approval</span>;
            case 'Accepted': return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200">Accepted</span>;
            case 'Rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">Rejected by Mentor</span>;
            case 'Completed': return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200">Completed (Owed ₹150)</span>;
            case 'Settled': return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">Settled ✓</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full border border-gray-200">{status}</span>;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Substitute Link Override Modal */}
            {overrideModalData.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOverrideModalData({ isOpen: false, requestId: null, link: '' })}></div>
                    <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Accept substitution</h3>
                        <p className="text-sm text-gray-500 mb-4">Please provide your own Google Meet or Zoom link for this class. Students will be redirected to this link automatically.</p>
                        <input
                            type="url"
                            value={overrideModalData.link}
                            onChange={(e) => setOverrideModalData(p => ({ ...p, link: e.target.value }))}
                            placeholder="https://meet.google.com/..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setOverrideModalData({ isOpen: false, requestId: null, link: '' })}>Cancel</Button>
                            <Button onClick={handleAcceptRequest} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-0">Confirm Accept</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Replace className="w-6 h-6" />
                        </div>
                        Class Substitution
                    </h1>
                    <p className="text-gray-500 mt-1">Request cover for your classes or manage requests from other mentors.</p>
                </div>
                <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl">
                    {['incoming', 'history', 'sent', 'create', 'ledger'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                if (tab === 'create' && !editingRequestId) resetForm();
                                setActiveTab(tab);
                            }}
                            className={clsx(
                                "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize whitespace-nowrap",
                                activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            {tab === 'create' ? (editingRequestId ? 'Edit Request' : 'Create Request') : tab === 'incoming' ? 'Incoming Requests' : tab === 'history' ? 'Request Histories' : tab === 'sent' ? 'My Sent Requests' : 'Financial Ledger'}
                            {tab === 'incoming' && incomingRequests.filter(r => r.status === 'Pending Substitute Approval').length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                    {incomingRequests.filter(r => r.status === 'Pending Substitute Approval').length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Tabs */}
            <div className="space-y-6 flex-1 h-full min-h-[60vh]">
                
                {/* 1. Create Request Tab */}
                {activeTab === 'create' && (
                    <Card className="p-6 border border-indigo-100 relative">
                        {editingRequestId && (
                            <button 
                                onClick={() => { resetForm(); setActiveTab('sent'); }}
                                className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full"
                                title="Cancel Editing"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <form onSubmit={handleCreateRequest} className="space-y-6 max-w-2xl mx-auto">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 shrink-0 border-b pb-4 flex items-center gap-2">
                                {editingRequestId ? <Edit className="w-5 h-5 text-indigo-600" /> : null}
                                {editingRequestId ? 'Edit Substitution Request' : 'Draft Substitution Request'}
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Request Substitute From *</label>
                                    <select
                                        value={targetMentorId}
                                        onChange={(e) => setTargetMentorId(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50"
                                        required
                                    >
                                        <option value="">Select a Mentor...</option>
                                        {availableMentors.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Which Class? *</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => {
                                            setSelectedClassId(e.target.value);
                                            setAttachedSubjectId(''); // Reset subjects if class changes
                                            setAttachedChapterIndex('');
                                        }}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50"
                                        required
                                    >
                                        <option value="">Select a Class...</option>
                                        {assignedClasses.map(c => (
                                            <option key={c.id} value={c.id}>Class {c.name} - Div {c.division}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Substitution *</label>
                                    <input
                                        type="date"
                                        value={date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Portion to be Lectured *</label>
                                    <input
                                        type="text"
                                        value={portion}
                                        onChange={(e) => setPortion(e.target.value)}
                                        placeholder="e.g., Fiqh Chapter 4, complete exercise 2."
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Book Attachment Section */}
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-indigo-600" />
                                    Attach Lesson Materials (Optional)
                                </h3>
                                <p className="text-xs text-indigo-700 mb-2">Link specific book chapters so the substitute mentor can read the portion instantly.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <select
                                            value={attachedSubjectId}
                                            onChange={(e) => {
                                                setAttachedSubjectId(e.target.value);
                                                setAttachedChapterIndex(''); // Reset chapter on subject change
                                            }}
                                            disabled={!selectedClassId || availableSubjects.length === 0}
                                            className="w-full px-3 py-2 border border-white rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        >
                                            <option value="">Select a Subject...</option>
                                            {availableSubjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={attachedChapterIndex}
                                            onChange={(e) => setAttachedChapterIndex(e.target.value)}
                                            disabled={!attachedSubjectId || availableChapters.length === 0}
                                            className="w-full px-3 py-2 border border-white rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        >
                                            <option value="">Select a Chapter...</option>
                                            {availableChapters.map(ch => (
                                                <option key={ch} value={ch}>Chapter {ch}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Important Notes (Optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any specific instructions for the substitute?"
                                    rows="3"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50 resize-none"
                                />
                            </div>

                            <p className="text-xs font-bold text-gray-400 bg-gray-50 p-3 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                                Upon completion of this class by the substitute, ₹150 will be debited from your ledger.
                            </p>

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={isSubmitting} variant="primary" className="px-8 bg-indigo-600 hover:bg-indigo-700 font-bold">
                                    {isSubmitting ? 'Saving...' : (editingRequestId ? 'Update & Resend' : 'Send to Admin for Review')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* 2. Incoming Requests Tab */}
                {activeTab === 'incoming' && (
                    <div className="space-y-4">
                        {incomingRequests.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
                                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
                                <p className="text-gray-500">No incoming substitution requests at the moment.</p>
                            </div>
                        ) : (
                            incomingRequests.map(req => (
                                <Card key={req.id} className="p-5 flex flex-col md:flex-row justify-between gap-4 md:gap-6 relative min-h-[140px] md:items-stretch">
                                    {/* Left Column: Avatar + Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        {/* Top Row: Avatar & Name */}
                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                                <span className="text-lg font-black text-indigo-700">{helperGetMentorName(req.requesterId).charAt(0)}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 leading-none">{helperGetMentorName(req.requesterId)}</h3>
                                                {getStatusBadge(req.status)}
                                            </div>
                                        </div>

                                        {/* Middle Row: Details Boxes */}
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 min-w-[100px] flex-1 sm:flex-none">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Class</p>
                                                <p className="font-semibold text-gray-900 text-sm">{helperGetClassName(req.classId)}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 min-w-[120px] flex-1 sm:flex-none">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date</p>
                                                <p className="font-semibold text-gray-900 text-sm">{req.date}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 min-w-[140px] max-w-full sm:max-w-[200px] w-full sm:w-auto">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Portion</p>
                                                <p className="font-semibold text-gray-800 text-sm truncate" title={req.portion}>{req.portion}</p>
                                            </div>
                                            
                                            {/* Attached Material Buton */}
                                            {req.attachedSubjectId && req.attachedChapterIndex && (
                                                <button 
                                                    onClick={() => handleOpenAttachment(req)}
                                                    className="flex w-full sm:w-auto items-stretch bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100/50 overflow-hidden"
                                                >
                                                    <div className="bg-indigo-100 p-2.5 flex items-center justify-center shrink-0">
                                                        <BookOpen className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div className="p-2.5 px-3 flex items-center justify-center font-bold text-sm text-indigo-700 w-full sm:w-auto">
                                                        Read Attached Material : CH {req.attachedChapterIndex}
                                                    </div>
                                                </button>
                                            )}
                                        </div>

                                        {/* Bottom Row: Notes */}
                                        {req.notes && (
                                            <div className="bg-[#FFFDF0] p-3 rounded-lg border border-yellow-100/50 w-full mt-auto">
                                                <p className="text-sm text-gray-500 italic">"{req.notes}"</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Actions (Accept/Reject) */}
                                    <div className="flex flex-col justify-between items-start md:items-end min-w-full md:min-w-[180px] shrink-0 md:border-l border-gray-50 md:pl-6 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-100 md:border-t-0">
                                        <div className="flex flex-col gap-2 w-full mt-auto">
                                            {req.status === 'Pending Substitute Approval' && (
                                                <>
                                                    <Button onClick={() => setOverrideModalData({ isOpen: true, requestId: req.id, link: '' })} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 text-sm font-bold shadow-sm py-2">
                                                        <Check className="w-4 h-4" /> Accept Request
                                                    </Button>
                                                    <Button onClick={() => updateRequestStatus(req.id, 'Rejected')} variant="secondary" className="w-full text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 text-sm font-bold border-red-200 py-2">
                                                        <X className="w-4 h-4" /> Reject
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* 2.5 Request Histories Tab */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {historyRequests.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">No History</h3>
                                <p className="text-gray-500">You don't have any past substitution requests.</p>
                            </div>
                        ) : (
                            historyRequests.map(req => (
                                <Card key={req.id} className="p-5 flex flex-col md:flex-row justify-between gap-4 md:gap-6 relative min-h-[140px] md:items-stretch">
                                    {/* Left Column: Avatar + Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        {/* Top Row: Avatar & Name */}
                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                                <span className="text-lg font-black text-indigo-700">{helperGetMentorName(req.requesterId).charAt(0)}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 leading-none">{helperGetMentorName(req.requesterId)}</h3>
                                                {getStatusBadge(req.status)}
                                            </div>
                                        </div>

                                        {/* Middle Row: Details Boxes */}
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 min-w-[100px] flex-1 sm:flex-none">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Class</p>
                                                <p className="font-semibold text-gray-900 text-sm">{helperGetClassName(req.classId)}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 min-w-[120px] flex-1 sm:flex-none">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date</p>
                                                <p className="font-semibold text-gray-900 text-sm">{req.date}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 min-w-[140px] max-w-full sm:max-w-[200px] w-full sm:w-auto">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Portion</p>
                                                <p className="font-semibold text-gray-800 text-sm truncate" title={req.portion}>{req.portion}</p>
                                            </div>
                                            
                                            {/* Attached Material Buton */}
                                            {req.attachedSubjectId && req.attachedChapterIndex && (
                                                <button 
                                                    onClick={() => handleOpenAttachment(req)}
                                                    className="flex w-full sm:w-auto items-stretch bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100/50 overflow-hidden"
                                                >
                                                    <div className="bg-indigo-100 p-2.5 flex items-center justify-center shrink-0">
                                                        <BookOpen className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div className="p-2.5 px-3 flex items-center justify-center font-bold text-sm text-indigo-700 w-full sm:w-auto">
                                                        Read Attached Material : CH {req.attachedChapterIndex}
                                                    </div>
                                                </button>
                                            )}
                                        </div>

                                        {/* Bottom Row: Notes */}
                                        {req.notes && (
                                            <div className="bg-[#FFFDF0] p-3 rounded-lg border border-yellow-100/50 w-full mt-auto">
                                                <p className="text-sm text-gray-500 italic">"{req.notes}"</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Actions (Sign In + Complete) */}
                                    <div className="flex flex-col justify-between items-start md:items-end min-w-full md:min-w-[180px] shrink-0 md:border-l border-gray-50 md:pl-6 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-100 md:border-t-0">
                                        <div className="mb-4 w-full flex flex-col gap-2">
                                            {req.substituteLiveLink && (
                                                <a 
                                                    href={req.substituteLiveLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-full group flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm border border-blue-100"
                                                    title="Join Class"
                                                >
                                                    <Video className="w-4 h-4 group-hover:animate-pulse" />
                                                    Join Provided Meet
                                                </a>
                                            )}
                                            {['Accepted', 'Completed', 'Settled'].includes(req.status) && (
                                                <button 
                                                    onClick={() => handleDirectSignIn(req.requesterId)}
                                                    className="w-full group flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm border border-indigo-100"
                                                    title={`Sign in as ${helperGetMentorName(req.requesterId)}`}
                                                >
                                                    <UserCircle2 className="w-4 h-4 group-hover:animate-pulse" />
                                                    Sign In to {helperGetMentorName(req.requesterId).split(' ')[0]}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 w-full mt-auto">
                                            {req.status === 'Accepted' && (
                                                <>
                                                    <Button onClick={() => updateRequestStatus(req.id, 'Completed')} className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 text-sm font-bold shadow-sm py-2">
                                                        <CheckCircle className="w-4 h-4" /> Mark Completed
                                                    </Button>
                                                    <p className="text-[10px] text-gray-400 text-center leading-tight mt-1">
                                                        Click after class.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* 3. Sent Requests Tab */}
                {activeTab === 'sent' && (
                    <div className="space-y-4">
                        {mySentRequests.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">No Sent Requests</h3>
                                <p className="text-gray-500">You haven't requested any substitutes yet.</p>
                            </div>
                        ) : (
                            mySentRequests.map(req => (
                                <Card key={req.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
                                    <div className="flex-1 w-full">
                                        <div className="flex items-center justify-between xl:justify-start gap-4 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">To:</span>
                                                <h3 className="text-lg font-bold text-gray-900 truncate">{helperGetMentorName(req.substituteId)}</h3>
                                            </div>
                                            {getStatusBadge(req.status)}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 font-medium">
                                            <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
                                                <UserCircle2 className="w-4 h-4 text-gray-400" /> {helperGetClassName(req.classId)}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md mb-2 sm:mb-0">
                                                <Clock className="w-4 h-4 text-gray-400" /> {req.date}
                                            </span>
                                            <span className="hidden sm:inline text-gray-300">|</span>
                                            <span className="line-clamp-1"><span className="text-gray-400 font-normal">Portion:</span> {req.portion}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Edit / Delete actions for Pending requests */}
                                    {req.status === 'Pending Admin Approval' && (
                                        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end md:border-l md:pl-4 border-gray-100">
                                            <button 
                                                onClick={() => startEditing(req)}
                                                className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRequest(req.id)}
                                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                title="Cancel/Delete Request"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* 4. Financial Ledger Tab */}
                {activeTab === 'ledger' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-green-800 uppercase tracking-wider">Total To Get</p>
                                        <h3 className="text-3xl font-black text-green-700 mt-2 flex items-center">
                                            <IndianRupee className="w-7 h-7 mr-1" /> {totalToGet}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-green-200/50 rounded-xl text-green-700">
                                        <HandCoins className="w-8 h-8" />
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-green-600 mt-4">Unsettled earnings from classes you substituted.</p>
                            </Card>

                            <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-red-800 uppercase tracking-wider">Total To Give</p>
                                        <h3 className="text-3xl font-black text-red-700 mt-2 flex items-center">
                                            <IndianRupee className="w-7 h-7 mr-1" /> {totalToGive}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-red-200/50 rounded-xl text-red-700">
                                        <ArrowRight className="w-8 h-8" />
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-red-600 mt-4">Unsettled debts to mentors who covered your classes.</p>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="overflow-hidden border border-gray-200">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Amount to Receive
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                    {ledgerToGet.length === 0 ? (
                                        <p className="p-6 text-center text-sm text-gray-500 italic">No pending receivables.</p>
                                    ) : (
                                        ledgerToGet.map(req => (
                                            <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">From: {helperGetMentorName(req.requesterId)}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{helperGetClassName(req.classId)} • {req.date}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-black text-green-600 mb-2">₹{req.amount}</p>
                                                    {req.status === 'Completed' ? (
                                                        <button 
                                                            onClick={() => updateRequestStatus(req.id, 'Settled')}
                                                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold rounded-lg transition-colors border border-green-200"
                                                        >
                                                            Mark Received
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400">Settled ✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>

                            <Card className="overflow-hidden border border-gray-200">
                                <div className="p-4 bg-gray-50 border-b border-gray-200">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        Amount to Pay
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                    {ledgerToGive.length === 0 ? (
                                        <p className="p-6 text-center text-sm text-gray-500 italic">No pending payables.</p>
                                    ) : (
                                        ledgerToGive.map(req => (
                                            <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">To: {helperGetMentorName(req.substituteId)}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{helperGetClassName(req.classId)} • {req.date}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-black text-red-600 mb-2">₹{req.amount}</p>
                                                    {req.status === 'Settled' ? (
                                                        <span className="text-xs font-bold text-gray-400">Settled ✓</span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-gray-400 italic">Awaiting Receiver</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Gallery Full Screen Modal Overlay */}
            {viewingGallery && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in">
                    {/* Gallery Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-400" />
                            {viewingGallery.title}
                        </h3>
                        <button 
                            onClick={() => setViewingGallery(null)}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Gallery Viewer */}
                    <div className="flex-1 overflow-auto p-4 flex flex-col items-center gap-6">
                        {viewingGallery.images.map((imgUrl, i) => (
                            <img 
                                key={i} 
                                src={imgUrl} 
                                alt={`Page ${i+1}`}
                                className="max-w-full md:max-w-4xl rounded-lg shadow-xl"
                                loading="lazy"
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassSubstitution;
