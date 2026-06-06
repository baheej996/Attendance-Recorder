import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CheckCircle, XCircle, Clock, User, Trash2, UserPlus, UserMinus, ArrowRightLeft, Move } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useUI } from '../../contexts/UIContext';

const AdminAdmissionRequests = () => {
    const { 
        admissionRequests, 
        updateAdmissionRequest, 
        deleteAdmissionRequest,
        addStudent,
        updateStudent,
        deleteStudent,
        students 
    } = useData();
    const { showAlert } = useUI();
    
    // Status Modal State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, request: null });
    const [adminComment, setAdminComment] = useState('');

    const checkDuplicate = (newStudent) => {
        return students.find(s => {
            const sameReg = newStudent.registerNo && s.registerNo && String(s.registerNo).trim() === String(newStudent.registerNo).trim();
            const sameUid = newStudent.uid && s.uid && String(s.uid).trim() === String(newStudent.uid).trim();
            return sameReg || sameUid;
        });
    };

    // Filter for pending vs history
    const pendingRequests = (admissionRequests || []).filter(r => r.requestStatus === 'Pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const historyRequests = (admissionRequests || []).filter(r => r.requestStatus !== 'Pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleAction = (request, type) => {
        if (type === 'approve' && request.type === 'admission') {
            const duplicate = checkDuplicate(request);
            if (duplicate) {
                showAlert('Duplicate Student Found', `A student named "${duplicate.name}" already exists with the same Register No/UID.`, 'error');
                return;
            }
        }
        
        setAdminComment('');
        setConfirmModal({ isOpen: true, type: type, request: request });
    };

    const executeAction = async () => {
        const { type, request } = confirmModal;
        if (!type || !request) return;

        if (type === 'reject' && !adminComment.trim()) {
            showAlert('Reason Required', 'Please provide a reason for rejection.', 'error');
            return;
        }

        try {
            if (type === 'approve') {
                if (request.type === 'removal') {
                    // DEACTIVATE OR DELETE Student - User might prefer deactivating
                    await updateStudent(request.studentId, { status: 'Inactive' });
                } else if (request.type === 'transfer') {
                    // TRANSFER Student
                    await updateStudent(request.studentId, { classId: request.targetClassId });
                } else {
                    // NEW ADMISSION
                    await addStudent({
                        name: request.name,
                        registerNo: request.registerNo,
                        uid: request.uid,
                        gender: request.gender,
                        status: request.status,
                        classId: request.classId,
                    });
                }
                
                await updateAdmissionRequest(request.id, { 
                    requestStatus: 'Approved', 
                    resolvedAt: new Date().toISOString(),
                    adminComments: adminComment.trim()
                });
                showAlert('Success', `Request for ${request.studentName || request.name} approved!`, 'success');
                
            } else if (type === 'reject') {
                await updateAdmissionRequest(request.id, { 
                    requestStatus: 'Rejected', 
                    resolvedAt: new Date().toISOString(),
                    adminComments: adminComment.trim()
                });
                showAlert('Info', 'Request has been rejected.', 'info');
            } else if (type === 'delete') {
                await deleteAdmissionRequest(request.id);
                showAlert('Success', 'Request deleted from history.', 'success');
            }
        } catch (error) {
            console.error("Action error:", error);
            showAlert('Error', 'An error occurred while processing the request.', 'error');
        }

        setConfirmModal({ isOpen: false, type: null, request: null });
        setAdminComment('');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={executeAction}
                autoClose={confirmModal.type !== 'reject' && confirmModal.type !== 'approve'}
                title={
                    confirmModal.type === 'approve' ? "Approve Request" : 
                    confirmModal.type === 'delete' ? "Delete Record?" : 
                    "Reject Request"
                }
                message={
                    confirmModal.type === 'approve'
                    ? `Are you sure you want to approve this ${confirmModal.request?.type || 'admission'} request?`
                    : confirmModal.type === 'delete'
                        ? "Permanently delete this record?"
                        : `Reject this request?`
                }
                confirmText={confirmModal.type === 'approve' ? "Approve" : confirmModal.type === 'delete' ? "Delete" : "Reject"}
                isDanger={confirmModal.type === 'reject' || confirmModal.type === 'delete'}
            >
                {confirmModal.type === 'approve' && (
                    <div className="mt-4">
                        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Comment / Remarks (Optional)</label>
                        <textarea 
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                            placeholder="Type a comment..."
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                        />
                    </div>
                )}
                {confirmModal.type === 'reject' && (
                    <div className="mt-4">
                        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Reason for rejection (Required)</label>
                        <textarea 
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-500 min-h-[80px]"
                            placeholder="Type a reason..."
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                        />
                    </div>
                )}
            </ConfirmationModal>

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">Management Requests</h2>
                    <p className="text-gray-500 pl-4 mt-1">Review admissions, removals, and transfers from mentors.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold text-gray-500">
                    <div className="px-3 py-1 bg-white rounded shadow-sm text-indigo-600">{pendingRequests.length} Pending</div>
                </div>
            </div>

            <div className="grid gap-6">
                {pendingRequests.length === 0 ? (
                    <Card className="p-12 text-center text-gray-400 border-dashed bg-gray-50/50">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-bold">All caught up!</h3>
                        <p>No pending management requests at the moment.</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {pendingRequests.map(request => (
                            <Card key={request.id} className={`p-6 border-l-4 ${
                                request.type === 'removal' ? 'border-l-red-500' : 
                                request.type === 'transfer' ? 'border-l-amber-500' : 'border-l-indigo-500'
                            }`}>
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl text-white ${
                                                request.type === 'removal' ? 'bg-red-500' : 
                                                request.type === 'transfer' ? 'bg-amber-500' : 'bg-indigo-500'
                                            }`}>
                                                {request.type === 'removal' ? <UserMinus className="w-5 h-5" /> : 
                                                 request.type === 'transfer' ? <ArrowRightLeft className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 text-lg uppercase tracking-tight">{request.name}</span>
                                                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                        {request.type === 'transfer' ? 'Transfer' : request.type === 'removal' ? 'Removal' : 'Admission'}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-0.5">
                                                    Requested by <span className="font-bold text-gray-600">{request.mentorName}</span> • {new Date(request.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                            {request.type === 'transfer' ? (
                                                <div className="col-span-full flex items-center justify-between bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                                                    <div className="text-center flex-1">
                                                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">From</p>
                                                        <p className="font-bold text-gray-800">{request.className} - {request.classDivision}</p>
                                                    </div>
                                                    <div className="px-4 text-amber-500 animate-pulse"><Move className="w-6 h-6" /></div>
                                                    <div className="text-center flex-1">
                                                        <p className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-1">Target Class</p>
                                                        <p className="font-bold text-gray-800">{request.targetClassName}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Class Assignment</p>
                                                        <p className="font-bold text-gray-800">{request.className} - {request.classDivision}</p>
                                                    </div>
                                                    {request.type === 'admission' && (
                                                        <div>
                                                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">ID / Register No</p>
                                                            <p className="font-bold text-gray-800">{request.registerNo || request.uid || 'Not Provided'}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            
                                            {request.comments && (
                                                <div className="col-span-full border-t border-dashed border-gray-200 pt-3">
                                                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Mentor's Note</p>
                                                    <p className="text-gray-600 italic">"{request.comments}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col gap-2 min-w-[140px] justify-center">
                                        <Button onClick={() => handleAction(request, 'approve')} className="bg-green-600 text-white flex-1 gap-2">
                                            <CheckCircle className="w-4 h-4" /> Approve
                                        </Button>
                                        <Button onClick={() => handleAction(request, 'reject')} variant="secondary" className="text-red-600 border-red-100 bg-red-50/50 flex-1 gap-2">
                                            <XCircle className="w-4 h-4" /> Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {historyRequests.length > 0 && (
                    <section className="pt-8 opacity-60">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Resolution History</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {historyRequests.map(request => (
                                <div key={request.id} className="bg-white border border-gray-100 p-3 rounded-xl flex items-start justify-between gap-3 group relative overflow-hidden">
                                     <div className={`absolute top-0 left-0 w-1 h-full ${request.requestStatus === 'Approved' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                     <div className="min-w-0 flex-1 pl-1">
                                         <p className="font-bold text-gray-800 text-xs truncate">{request.name}</p>
                                         <p className="text-[9px] text-gray-400 uppercase tracking-tighter">
                                             {request.type === 'transfer' ? 'Transfer' : request.type === 'removal' ? 'Removal' : 'Admission'} • {request.requestStatus}
                                         </p>
                                         {(request.adminComments || request.adminComment) && (
                                             <p className="text-[10px] text-gray-500 mt-1 italic break-words whitespace-pre-wrap">
                                                 "{request.adminComments || request.adminComment}"
                                             </p>
                                         )}
                                     </div>
                                     <button onClick={() => handleAction(request, 'delete')} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                                         <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default AdminAdmissionRequests;
