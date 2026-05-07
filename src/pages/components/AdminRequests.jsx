import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle, XCircle, Clock, User, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const AdminRequests = () => {
    const { adminRequests, updateAdminRequest, deleteAdminRequest, classes, mentors, students } = useData();
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, requestId: null });

    // Filter for pending requests
    const pendingRequests = adminRequests.filter(r => r.status === 'Pending').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const historyRequests = adminRequests.filter(r => r.status !== 'Pending').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const handleAction = (id, type) => {
        setConfirmModal({
            isOpen: true,
            type: type,
            requestId: id
        });
    };

    const executeAction = () => {
        const { type, requestId } = confirmModal;
        if (!type || !requestId) return;

        if (type === 'resolve') {
            updateAdminRequest(requestId, { status: 'Resolved' });
        } else if (type === 'dismiss') {
            updateAdminRequest(requestId, { status: 'Dismissed' });
        } else if (type === 'delete') {
            deleteAdminRequest(requestId);
        }

        setConfirmModal({ isOpen: false, type: null, requestId: null });
    };

    return (
        <div className="space-y-6">
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={executeAction}
                title={confirmModal.type === 'resolve' ? "Complete Request?" : confirmModal.type === 'delete' ? "Delete Request?" : "Dismiss Request?"}
                message={confirmModal.type === 'resolve'
                    ? "This will mark the request as resolved. Ensure you have completed the requested changes."
                    : confirmModal.type === 'delete'
                        ? "This will permanently delete this request record from the history. This cannot be undone."
                        : "This will remove the request without taking action. Are you sure?"}
                confirmText={confirmModal.type === 'resolve' ? "Mark Resolved" : confirmModal.type === 'delete' ? "Delete Permanently" : "Dismiss"}
                cancelText="Cancel"
                isDanger={confirmModal.type === 'dismiss' || confirmModal.type === 'delete'}
            />

            <div>
                <h2 className="text-2xl font-bold text-gray-900">General Requests</h2>
                <p className="text-gray-500">Manage profile update requests from mentors and students.</p>
            </div>

            <div className="grid gap-6">
                {/* Pending Requests */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-500" />
                        Pending Requests ({pendingRequests.length})
                    </h3>

                    {pendingRequests.length === 0 ? (
                        <Card className="p-8 text-center text-gray-500 bg-gray-50 border-dashed">
                            No pending requests.
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {pendingRequests.map(request => {
                                const isStudent = !!request.studentId;
                                const student = isStudent ? students.find(s => s.id === request.studentId) : null;
                                const studentClass = student ? classes.find(c => c.id === student.classId) : null;
                                const assignedMentor = student ? mentors.find(m => m.assignedClassIds?.includes(student.classId)) : null;

                                return (
                                <Card key={request.id} className="p-6 border-l-4 border-l-yellow-400">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-bold text-gray-900 text-lg">
                                                    {request.mentorName || request.studentName}
                                                </span>
                                                <span className={`text-sm px-2 py-0.5 rounded-full flex items-center gap-1 ${isStudent ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    <User className="w-3 h-3" /> {isStudent ? 'Student' : 'Mentor'}
                                                </span>
                                            </div>

                                            {isStudent && student && (
                                                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">Reg No: <b>{student.registerNo || 'N/A'}</b></span>
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">Class: <b>{studentClass ? `${studentClass.name}-${studentClass.division}` : 'N/A'}</b></span>
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">Mentor: <b>{assignedMentor ? assignedMentor.name : 'N/A'}</b></span>
                                                </div>
                                            )}

                                            <div className="text-sm text-gray-500 mb-4">
                                                Requested on {new Date(request.timestamp).toLocaleDateString()} at {new Date(request.timestamp).toLocaleTimeString()}
                                                {request.type && <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">{request.type}</span>}
                                            </div>
                                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-gray-800">
                                                <p className="font-medium text-xs text-yellow-700 uppercase tracking-wide mb-1">Request Details:</p>
                                                {request.details || request.message}
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2 min-w-[140px] justify-center">
                                            <Button
                                                onClick={() => handleAction(request.id, 'resolve')}
                                                className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Resolve
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleAction(request.id, 'dismiss')}
                                                    className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                                                >
                                                    <XCircle className="w-4 h-4" /> Dismiss
                                                </Button>
                                                <Button
                                                    onClick={() => handleAction(request.id, 'delete')}
                                                    className="px-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 transition-colors"
                                                    title="Delete permanently"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* History */}
                {historyRequests.length > 0 && (
                    <section className="pt-8 border-t border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 text-opacity-70">Request History</h3>
                        <div className="space-y-2 opacity-75 grayscale hover:grayscale-0 transition-all">
                            {historyRequests.map(request => (
                                <div key={request.id} className="bg-white border border-gray-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1 sm:mb-0">
                                            <span className="font-bold text-gray-700">{request.mentorName || request.studentName}</span>
                                            <span className="hidden sm:inline mx-2 text-gray-300">|</span>
                                        </div>
                                        <p className="text-gray-500 text-sm truncate sm:max-w-xs">{request.details || request.message}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${request.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {request.status}
                                        </div>
                                        <button
                                            onClick={() => handleAction(request.id, 'delete')}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete permanently"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default AdminRequests;
