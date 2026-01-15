import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Check, X, Calendar, User, Clock, MessageSquare, AlertCircle, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { clsx } from 'clsx';

const MentorLeaveRequests = () => {
    const { leaveRequests, updateLeaveRequest, deleteLeaveRequests, currentUser, students, classes } = useData();
    const [actionId, setActionId] = useState(null);
    const [comment, setComment] = useState('');
    const [selectedIds, setSelectedIds] = useState([]); // Track selected requests
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });

    // Filter requests for mentor's assigned classes
    const assignedClassIds = currentUser?.assignedClassIds || [];

    const filteredRequests = leaveRequests
        .filter(r => assignedClassIds.includes(r.classId))
        .sort((a, b) => {
            // Sort Pending first
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            // Then by date descending
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

    const handleAction = async (id, status) => {
        try {
            updateLeaveRequest(id, {
                status,
                comment: comment,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            });
            setActionId(null);
            setComment('');
        } catch (error) {
            console.error("Failed to update request:", error);
            alert("Failed to update status.");
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredRequests.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredRequests.map(r => r.id));
        }
    };

    const handleBulkAction = (action) => {
        if (selectedIds.length === 0) return;
        setConfirmModal({ isOpen: true, action });
    };

    const executeBulkAction = async () => {
        const { action } = confirmModal;
        if (!action) return;

        try {
            if (action === 'delete') {
                deleteLeaveRequests(selectedIds);
            } else {
                const status = action === 'approve' ? 'Approved' : 'Rejected';
                selectedIds.forEach(id => {
                    updateLeaveRequest(id, {
                        status,
                        updatedAt: new Date().toISOString(),
                        updatedBy: currentUser.id
                    });
                });
            }
            setSelectedIds([]); // Clear selection after action
            setConfirmModal({ isOpen: false, action: null });
        } catch (error) {
            console.error("Bulk action failed:", error);
            alert("Failed to perform bulk action.");
        }
    };

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId);
        return student ? student.name : 'Unknown Student';
    };

    const getClassDetails = (classId) => {
        const cls = classes.find(c => c.id === classId);
        return cls ? `${cls.name}-${cls.division}` : 'Unknown Class';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    if (assignedClassIds.length === 0) {
        return <div className="p-8 text-center text-gray-500">No classes assigned to you.</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
                <p className="text-gray-500">Manage student leave applications</p>
            </div>

            {/* Bulk Action Toolbar */}
            {filteredRequests.length > 0 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                        >
                            {selectedIds.length === filteredRequests.length && filteredRequests.length > 0 ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                            )}
                            Select All
                        </button>
                        <span className="text-sm text-gray-500">
                            {selectedIds.length} selected
                        </span>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleBulkAction('approve')} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 whitespace-nowrap">
                                <Check className="w-4 h-4" /> Approve ({selectedIds.length})
                            </Button>
                            <Button size="sm" onClick={() => handleBulkAction('reject')} className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 whitespace-nowrap">
                                <X className="w-4 h-4" /> Reject ({selectedIds.length})
                            </Button>
                            <div className="w-px h-6 bg-gray-300 mx-2"></div>
                            <Button size="sm" onClick={() => handleBulkAction('delete')} variant="danger" className="flex items-center gap-2 whitespace-nowrap">
                                <Trash2 className="w-4 h-4" /> Delete ({selectedIds.length})
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-gray-900 font-medium">No Requests</h3>
                    <p className="text-gray-500 text-sm">There are no leave requests from your classes yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map(req => (
                        <Card key={req.id} className={`p-6 transition-all hover:shadow-md ${selectedIds.includes(req.id) ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : ''}`}>
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                                {/* Checkbox for Section */}
                                <div className="pt-1">
                                    <button onClick={() => toggleSelection(req.id)}>
                                        {selectedIds.includes(req.id) ? (
                                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-300 hover:text-indigo-400" />
                                        )}
                                    </button>
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {getStudentName(req.studentId).charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{getStudentName(req.studentId)}</h4>
                                            <p className="text-xs text-gray-500">Class {getClassDetails(req.classId)}</p>
                                        </div>
                                        <span className={clsx("ml-2 px-2 py-0.5 rounded text-xs font-bold border", getStatusColor(req.status))}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>
                                                {format(new Date(req.startDate), 'MMM d, yyyy')} - {format(new Date(req.endDate), 'MMM d, yyyy')}
                                            </span>
                                            <span className="font-medium ml-1">
                                                ({differenceInDays(new Date(req.endDate), new Date(req.startDate)) + 1} Days)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-gray-400" />
                                            <span className="capitalize">{req.type}</span>
                                        </div>
                                        <div className="col-span-full flex gap-2 items-start">
                                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                            <p className="italic text-gray-700">"{req.reason}"</p>
                                        </div>
                                    </div>

                                    {req.comment && (
                                        <div className="text-sm bg-indigo-50 text-indigo-800 p-2 rounded border border-indigo-100 flex gap-2">
                                            <span className="font-bold">Your Note:</span> {req.comment}
                                        </div>
                                    )}
                                </div>

                                {req.status === 'Pending' && (
                                    <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
                                        {actionId === req.id ? (
                                            <div className="space-y-2 animate-in fade-in zoom-in-95">
                                                <input
                                                    type="text"
                                                    placeholder="Add a comment (optional)..."
                                                    className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    value={comment}
                                                    onChange={e => setComment(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => handleAction(req.id, 'Approved')} className="bg-green-600 hover:bg-green-700 flex-1">
                                                        Confirm Approve
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleAction(req.id, 'Rejected')} className="bg-red-600 hover:bg-red-700 flex-1">
                                                        Reject
                                                    </Button>
                                                </div>
                                                <button onClick={() => setActionId(null)} className="text-xs text-gray-500 hover:underline w-full text-center">Cancel</button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button size="sm" onClick={() => setActionId(req.id)} className="bg-green-600 hover:bg-green-700 w-full flex items-center justify-center gap-2">
                                                    <Check className="w-4 h-4" /> Approve
                                                </Button>
                                                <Button size="sm" onClick={() => setActionId(req.id)} variant="danger" className="w-full flex items-center justify-center gap-2">
                                                    <X className="w-4 h-4" /> Reject
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            {/* Confirmation Modal */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, action: null })}
                title={`Confirm ${confirmModal.action === 'delete' ? 'Deletion' : confirmModal.action === 'reject' ? 'Rejection' : 'Approval'}`}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-orange-50 text-orange-800 rounded-lg">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="font-medium">Are you sure?</p>
                            <p className="text-sm mt-1 opacity-90">
                                You are about to <strong>{confirmModal.action}</strong> {selectedIds.length} selected request(s).
                                {confirmModal.action === 'delete' && " This action cannot be undone."}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setConfirmModal({ isOpen: false, action: null })}>
                            Cancel
                        </Button>
                        <Button
                            variant={confirmModal.action === 'approve' ? 'primary' : 'danger'}
                            onClick={executeBulkAction}
                            className="capitalize"
                        >
                            Confirm {confirmModal.action}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MentorLeaveRequests;
