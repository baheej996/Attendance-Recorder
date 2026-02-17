import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const AdminRequests = () => {
    const { adminRequests, resolveAdminRequest } = useData();
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
            resolveAdminRequest(requestId, 'Resolved');
        } else if (type === 'dismiss') {
            resolveAdminRequest(requestId, 'Dismissed');
        }

        setConfirmModal({ isOpen: false, type: null, requestId: null });
    };

    return (
        <div className="space-y-6">
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={executeAction}
                title={confirmModal.type === 'resolve' ? "Complete Request?" : "Dismiss Request?"}
                message={confirmModal.type === 'resolve'
                    ? "This will mark the request as resolved. Ensure you have completed the requested changes."
                    : "This will remove the request without taking action. Are you sure?"}
                confirmText={confirmModal.type === 'resolve' ? "Mark Resolved" : "Dismiss"}
                cancelText="Cancel"
                isDanger={confirmModal.type === 'dismiss'}
            />

            <div>
                <h2 className="text-2xl font-bold text-gray-900">Mentor Requests</h2>
                <p className="text-gray-500">Manage profile update requests from mentors.</p>
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
                            {pendingRequests.map(request => (
                                <Card key={request.id} className="p-6 border-l-4 border-l-yellow-400">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-bold text-gray-900 text-lg">{request.mentorName}</span>
                                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <User className="w-3 h-3" /> Mentor
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 mb-4">
                                                Requested on {new Date(request.timestamp).toLocaleDateString()} at {new Date(request.timestamp).toLocaleTimeString()}
                                            </div>
                                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-gray-800">
                                                <p className="font-medium text-xs text-yellow-700 uppercase tracking-wide mb-1">Request Details:</p>
                                                {request.details}
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2 min-w-[140px] justify-center">
                                            <Button
                                                onClick={() => handleAction(request.id, 'resolve')}
                                                className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Resolve
                                            </Button>
                                            <Button
                                                onClick={() => handleAction(request.id, 'dismiss')}
                                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                                            >
                                                <XCircle className="w-4 h-4" /> Dismiss
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
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
                                            <span className="font-bold text-gray-700">{request.mentorName}</span>
                                            <span className="hidden sm:inline mx-2 text-gray-300">|</span>
                                        </div>
                                        <p className="text-gray-500 text-sm truncate sm:max-w-xs">{request.details}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${request.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {request.status}
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
