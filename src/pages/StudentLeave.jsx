import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { format, differenceInDays } from 'date-fns';

const StudentLeave = () => {
    const { currentUser, leaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest } = useData();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        type: 'Sick Leave',
        reason: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter requests for current student
    const myRequests = leaveRequests
        .filter(r => r.studentId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
        if (window.confirm("Are you sure you want to delete this leave request?")) {
            deleteLeaveRequest(id);
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leave Applications</h1>
                    <p className="text-gray-500">Request leave and track status</p>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)} className="gap-2 flex items-center">
                        <Plus className="w-4 h-4" /> New Application
                    </Button>
                )}
            </div>

            {showForm && (
                <Card className="p-6 border-l-4 border-l-indigo-500 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg mb-4">{editingId ? 'Edit Application' : 'New Leave Application'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Leave</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option>Sick Leave</option>
                                <option>Family Function</option>
                                <option>Casual Leave</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                            <textarea
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                placeholder="Please explain why you need leave..."
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>{editingId ? 'Update Application' : 'Submit Application'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="space-y-4">
                {myRequests.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-gray-900 font-medium">No Applications Yet</h3>
                        <p className="text-gray-500 text-sm">You haven't applied for any leave yet.</p>
                    </div>
                ) : (
                    myRequests.map(req => (
                        <Card key={req.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-800">{req.type}</h4>
                                        <div className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                            {differenceInDays(new Date(req.endDate), new Date(req.startDate)) + 1} Days
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">{req.reason}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(req.startDate), 'MMM d, yyyy')} - {format(new Date(req.endDate), 'MMM d, yyyy')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Applied on {format(new Date(req.createdAt), 'MMM d')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {getStatusBadge(req.status)}

                                    {req.status === 'Pending' && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleEdit(req)}
                                                className="text-xs h-7 px-2 flex items-center"
                                            >
                                                <Edit2 className="w-3 h-3 mr-1" /> Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDelete(req.id)}
                                                className="text-xs h-7 px-2 flex items-center"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                                            </Button>
                                        </div>
                                    )}

                                    {req.comment && (
                                        <div className="text-xs text-right max-w-[200px] text-gray-500 bg-gray-50 p-2 rounded">
                                            <span className="font-semibold block text-indigo-700">Mentor Note:</span>
                                            {req.comment}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default StudentLeave;
