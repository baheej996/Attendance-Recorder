import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { format, differenceInDays } from 'date-fns';

const StudentLeave = () => {
    const { currentUser, leaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest } = useData();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, requestId: null });

    // Form State
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        type: 'Sick Leave',
        reason: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(3);

    // Filter requests for current student
    const myRequests = leaveRequests
        .filter(r => r.studentId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const displayedRequests = myRequests.slice(0, visibleCount);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Basic Validation
        if (!formData.startDate || !formData.endDate || !formData.reason) {
            alert("Please fill in all fields.");
            setIsSubmitting(false);
            return;
        }

        try {
            if (editingId) {
                // Concurrency Check: Verify status is still pending right before saving
                const freshRequest = leaveRequests.find(r => r.id === editingId);
                if (!freshRequest || freshRequest.status !== 'Pending') {
                    alert("This request has just been processed by your mentor and cannot be edited anymore.");
                    setEditingId(null);
                    setShowForm(false);
                    return;
                }

                updateLeaveRequest(editingId, {
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    type: formData.type,
                    reason: formData.reason,
                    updatedAt: new Date().toISOString()
                });
                alert("Request updated successfully.");
            } else {
                await addLeaveRequest({
                    studentId: currentUser.id,
                    studentName: currentUser.name,
                    classId: currentUser.classId,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    type: formData.type,
                    reason: formData.reason
                });
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({
                startDate: '',
                endDate: '',
                type: 'Sick Leave',
                reason: ''
            });
        } catch (err) {
            console.error(err);
            alert("Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (req) => {
        if (req.status !== 'Pending') {
            alert("Only pending requests can be edited.");
            return;
        }
        setEditingId(req.id);
        setFormData({
            startDate: req.startDate,
            endDate: req.endDate,
            type: req.type,
            reason: req.reason
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            startDate: '',
            endDate: '',
            type: 'Sick Leave',
            reason: ''
        });
    };

    const handleDelete = (id) => {
        setDeleteModal({ isOpen: true, requestId: id });
    };

    const confirmDelete = () => {
        if (deleteModal.requestId) {
            deleteLeaveRequest(deleteModal.requestId);
            setDeleteModal({ isOpen: false, requestId: null });
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Approved</span>;
            case 'Rejected':
                return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Rejected</span>;
            default:
                return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        Leave Hub
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium mt-0.5">Request absence and track approvals</p>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)} className="gap-2 flex items-center rounded-2xl font-black text-xs uppercase tracking-widest px-6 py-3 w-full md:w-auto shadow-lg shadow-indigo-100 active:scale-95 transition-all">
                        <Plus className="w-4 h-4" /> New Application
                    </Button>
                )}
            </div>

            {showForm && (
                <Card className="p-6 border border-indigo-100 bg-white rounded-3xl shadow-xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-black text-lg mb-6 text-gray-900 underline decoration-indigo-200 decoration-4 underline-offset-4">
                        {editingId ? 'Edit Record' : 'Create Application'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Starts</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all"
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ends</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all"
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                            <select
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all appearance-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option>Sick Leave</option>
                                <option>Family Function</option>
                                <option>Casual Leave</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason / Explanation</label>
                            <textarea
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all h-28 resize-none"
                                placeholder="Why do you need this leave?"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={handleCancel} className="w-full sm:w-1/3 rounded-2xl font-black text-xs uppercase tracking-widest py-3 hover:bg-gray-100">
                                Dismiss
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-2/3 rounded-2xl font-black text-xs uppercase tracking-widest py-3 shadow-lg shadow-indigo-100 active:scale-95 transition-all">
                                {editingId ? 'Update Record' : 'Send Request'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="space-y-4">
                {myRequests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">No Applications</h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">You haven't requested any leave yet.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {displayedRequests.map(req => (
                                <Card key={req.id} className="p-5 overflow-hidden rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-gray-900 leading-tight">{req.type}</h4>
                                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                        {differenceInDays(new Date(req.endDate), new Date(req.startDate)) + 1} Days
                                                    </span>
                                                </div>
                                                <p className="text-xs font-medium text-gray-500 line-clamp-2 leading-relaxed">{req.reason}</p>
                                            </div>
                                            <div className="shrink-0">
                                                {getStatusBadge(req.status)}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-y border-gray-50">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d')}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <Clock className="w-3.5 h-3.5" />
                                                Applied {format(new Date(req.createdAt), 'MMM d')}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            {req.status === 'Pending' ? (
                                                <div className="flex gap-2 w-full md:w-auto">
                                                    <button
                                                        onClick={() => handleEdit(req)}
                                                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 active:scale-95 transition-all border border-gray-100"
                                                    >
                                                        <Edit2 className="w-3 h-3" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 active:scale-95 transition-all border border-red-100"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex-1">
                                                    {req.comment && (
                                                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Mentor Remark</p>
                                                            <p className="text-xs font-medium text-gray-600 leading-relaxed italic">"{req.comment}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {visibleCount < myRequests.length && (
                            <div className="pt-4 flex justify-center">
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setVisibleCount(prev => prev + 5)}
                                    className="rounded-2xl font-black text-[10px] uppercase tracking-widest px-8 py-3 border-gray-100 hover:bg-gray-50 text-gray-500"
                                >
                                    Load More History
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, requestId: null })}
                title="Confirm Deletion"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-100">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="font-medium">Are you sure?</p>
                            <p className="text-sm mt-1 opacity-90">
                                This will permanently delete your leave request. This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: false, requestId: null })}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmDelete}>
                            Delete Request
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StudentLeave;
