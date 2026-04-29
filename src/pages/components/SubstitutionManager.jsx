import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
    Replace, CheckCircle, Clock, FileText, ArrowRight, 
    UserCircle2, BookOpen, AlertTriangle, X, Check, Search, Filter, Trash2 
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { clsx } from 'clsx';

const SubstitutionManager = () => {
    const { substitutionRequests, mentors, classes, subjects, clearSubstitutionRequests } = useData();
    const { showAlert } = useUI();
    const [activeTab, setActiveTab] = useState('review');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [overrideMentor, setOverrideMentor] = useState({}); // { requestId: mentorId }
    const [viewingGallery, setViewingGallery] = useState(null); // { title: '', images: [] }

    const pendingRequests = (substitutionRequests || []).filter(r => r.status === 'Pending Admin Approval');
    const allRequests = (substitutionRequests || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    const handleClearAll = async () => {
        if (window.confirm("⚠️ DANGER: This will permanently DELETE ALL substitution requests (Pending, Approved, and Completed). This action cannot be undone. Are you absolutely sure?")) {
            setIsUpdating(true);
            try {
                await clearSubstitutionRequests();
                showAlert('Success', 'All substitution records cleared successfully.', 'success');
            } catch (error) {
                showAlert('Error', 'Failed to clear records.', 'error');
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const helperGetMentorName = (id) => mentors?.find(m => m.id === id)?.name || 'Unknown Mentor';
    const helperGetClassName = (id) => {
        const c = classes?.find(c => c.id === id);
        return c ? `${c.name}-${c.division}` : 'Unknown Class';
    };

    const handleApprove = async (reqId) => {
        const req = substitutionRequests.find(r => r.id === reqId);
        if (!req) return;

        setIsUpdating(true);
        try {
            const finalSubstituteId = overrideMentor[reqId] || req.substituteId;
            
            await updateDoc(doc(db, 'substitutionRequests', reqId), {
                status: 'Pending Substitute Approval',
                substituteId: finalSubstituteId,
                approvedAt: new Date().toISOString()
            });
            
            showAlert('Success', `Request approved and forwarded to ${helperGetMentorName(finalSubstituteId)}.`, 'success');
            // Clear override state for this request
            setOverrideMentor(prev => {
                const next = { ...prev };
                delete next[reqId];
                return next;
            });
        } catch (error) {
            console.error('Error approving request:', error);
            showAlert('Error', 'Failed to approve request.', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReject = async (reqId) => {
        if (!window.confirm("Are you sure you want to REJECT this substitution request?")) return;
        
        setIsUpdating(true);
        try {
            await updateDoc(doc(db, 'substitutionRequests', reqId), {
                status: 'Rejected by Admin',
                rejectedAt: new Date().toISOString()
            });
            showAlert('Success', 'Request rejected.', 'info');
        } catch (error) {
            showAlert('Error', 'Failed to reject request.', 'error');
        } finally {
            setIsUpdating(false);
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
            case 'Pending Admin Approval': return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full border border-gray-200 uppercase">Pending Review</span>;
            case 'Rejected by Admin': return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">Admin Rejected</span>;
            case 'Pending Substitute Approval': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">Awaiting Mentor</span>;
            case 'Accepted': return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200">In Progress</span>;
            case 'Rejected': return <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">Mentor Rejected</span>;
            case 'Completed': return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200">Completed</span>;
            case 'Settled': return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">Settled ✓</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full border border-gray-200">{status}</span>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Replace className="w-6 h-6" />
                        </div>
                        Substitution Management
                    </h1>
                    <p className="text-gray-500 mt-1">Review and approve substitution requests between mentors.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('review')}
                        className={clsx(
                            "flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap",
                            activeTab === 'review' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        Needs Review ({pendingRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={clsx(
                            "flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap",
                            activeTab === 'all' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        History
                    </button>
                </div>
            </div>

            {activeTab === 'review' && (
                <div className="grid grid-cols-1 gap-6">
                    {pendingRequests.length === 0 ? (
                        <Card className="p-12 text-center border-dashed bg-gray-50/50">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900">No Pending Reviews</h3>
                            <p className="text-gray-500">All substitution requests have been processed.</p>
                        </Card>
                    ) : (
                        pendingRequests.map(req => (
                            <Card key={req.id} className="overflow-hidden border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                    {/* Column 1: Who & When */}
                                    <div className="p-6 lg:col-span-1 bg-gray-50/30">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Requester</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                                        {helperGetMentorName(req.requesterId).charAt(0)}
                                                    </div>
                                                    <p className="font-bold text-gray-900 leading-tight">{helperGetMentorName(req.requesterId)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center lg:justify-start">
                                                <ArrowRight className="w-4 h-4 text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Substitute Mentor</p>
                                                <select 
                                                    value={overrideMentor[req.id] || req.substituteId}
                                                    onChange={(e) => setOverrideMentor(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                                >
                                                    {mentors.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                                {overrideMentor[req.id] && overrideMentor[req.id] !== req.substituteId && (
                                                    <p className="text-[10px] text-orange-600 font-bold mt-1 animate-pulse">
                                                        ⚠️ Changed from {helperGetMentorName(req.substituteId)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2 & 3: Details */}
                                    <div className="p-6 lg:col-span-2 space-y-4">
                                        <div className="flex flex-wrap gap-3">
                                            <div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">Class</p>
                                                <p className="font-bold text-indigo-700 text-sm">{helperGetClassName(req.classId)}</p>
                                            </div>
                                            <div className="bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Date</p>
                                                <p className="font-bold text-gray-700 text-sm">{req.date}</p>
                                            </div>
                                            {req.attachedSubjectId && (
                                                <button 
                                                    onClick={() => handleOpenAttachment(req)}
                                                    className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 flex items-center gap-2 hover:bg-green-100 transition-colors group"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5 text-green-600 group-hover:scale-110 transition-transform" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest leading-none mb-1 text-left">Portion Linked</p>
                                                        <p className="font-bold text-green-700 text-sm">CH {req.attachedChapterIndex} (View)</p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Portion to Lecture</p>
                                            <p className="text-gray-800 font-medium italic">"{req.portion}"</p>
                                        </div>

                                        {req.notes && (
                                            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Notes for substitute</p>
                                                <p className="text-xs text-amber-900 leading-relaxed font-medium">{req.notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Column 4: Actions */}
                                    <div className="p-6 lg:col-span-1 flex flex-col justify-center gap-3 bg-gray-50/30">
                                        <Button 
                                            onClick={() => handleApprove(req.id)} 
                                            disabled={isUpdating}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm border-0 font-bold py-3 flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-5 h-5 shrink-0" />
                                            <span>Approve & Forward</span>
                                        </Button>
                                        <Button 
                                            onClick={() => handleReject(req.id)}
                                            disabled={isUpdating}
                                            variant="secondary" 
                                            className="w-full text-red-600 hover:bg-red-50 border-red-200 font-bold py-3 flex items-center justify-center gap-2"
                                        >
                                            <X className="w-5 h-5 shrink-0" />
                                            <span>Reject Request</span>
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'all' && (
                <Card className="overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Search history..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm bg-white"
                            />
                        </div>
                        <Button 
                            onClick={handleClearAll}
                            disabled={isUpdating || allRequests.length === 0}
                            variant="secondary"
                            className="w-full sm:w-auto text-red-600 border-red-100 hover:bg-red-50 font-bold flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Clear All Records
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Date & Status</th>
                                    <th className="px-6 py-4">Requester</th>
                                    <th className="px-6 py-4">Substitute</th>
                                    <th className="px-6 py-4">Class & Portion</th>
                                    <th className="px-6 py-4 text-right">Ledger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {allRequests
                                    .filter(req => 
                                        helperGetMentorName(req.requesterId).toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        helperGetMentorName(req.substituteId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        req.portion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        req.date.includes(searchQuery)
                                    )
                                    .map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 mb-1">{req.date}</div>
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-indigo-50 rounded text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                                    {helperGetMentorName(req.requesterId).charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-700">{helperGetMentorName(req.requesterId)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-purple-50 rounded text-purple-600 flex items-center justify-center text-[10px] font-bold">
                                                    {helperGetMentorName(req.substituteId).charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-700">{helperGetMentorName(req.substituteId)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{helperGetClassName(req.classId)}</div>
                                            <div className="text-gray-500 text-xs line-clamp-1 truncate w-40" title={req.portion}>{req.portion}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-gray-900">₹{req.amount || 150}</div>
                                            <div className="text-[10px] text-gray-400">Fixed Fee</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {allRequests.length === 0 && (
                            <div className="p-12 text-center text-gray-500 italic">
                                No substitution records found.
                            </div>
                        )}
                    </div>
                </Card>
            )}

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

export default SubstitutionManager;
