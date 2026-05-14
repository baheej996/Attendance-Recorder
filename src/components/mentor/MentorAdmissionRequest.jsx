import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserPlus, UserMinus, ArrowRightLeft, Send, Clock, CheckCircle, XCircle, Edit2, Trash2, X, Move } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { clsx } from 'clsx';

const MentorAdmissionRequest = () => {
    const { 
        currentUser, 
        classes, 
        students,
        studentStatuses,
        admissionRequests, 
        addAdmissionRequest,
        updateAdmissionRequest,
        deleteAdmissionRequest
    } = useData();
    const { showAlert } = useUI();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRequest, setEditingRequest] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, requestId: null });
    
    // Request Type: 'admission' | 'removal' | 'transfer'
    const [requestType, setRequestType] = useState('admission');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        registerNo: '',
        uid: '',
        gender: 'Male',
        status: 'Active',
        classId: '',
        studentId: '',
        targetClassId: '',
        comments: ''
    });

    const assignedClasses = classes.filter(c => currentUser?.assignedClassIds?.includes(c.id));
    const assignedClassIds = assignedClasses.map(c => c.id);
    
    const studentsInMyClasses = useMemo(() => {
        return students.filter(s => assignedClassIds.includes(s.classId)).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, assignedClassIds]);

    const myRequests = admissionRequests
        .filter(r => r.mentorId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = (req) => {
        setEditingRequest(req);
        setRequestType(req.type || 'admission');
        setFormData({
            name: req.name || '',
            registerNo: req.registerNo || '',
            uid: req.uid || '',
            gender: req.gender || 'Male',
            status: req.status || 'Active',
            classId: req.classId || '',
            studentId: req.studentId || '',
            targetClassId: req.targetClassId || '',
            comments: req.comments || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingRequest(null);
        setFormData({
            name: '',
            registerNo: '',
            uid: '',
            gender: 'Male',
            status: 'Active',
            classId: '',
            studentId: '',
            targetClassId: '',
            comments: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (requestType === 'admission') {
            if (!formData.name || !formData.classId) {
                showAlert('Error', 'Full Name and Class are required.', 'error');
                return;
            }
        } else if (requestType === 'removal') {
            if (!formData.studentId) {
                showAlert('Error', 'Please select a student.', 'error');
                return;
            }
        } else if (requestType === 'transfer') {
            if (!formData.studentId || !formData.targetClassId) {
                showAlert('Error', 'Please select both student and target class.', 'error');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const selectedClass = classes.find(c => c.id === formData.classId);
            const targetClass = classes.find(c => c.id === formData.targetClassId);
            const selectedStudent = students.find(s => s.id === formData.studentId);

            const data = {
                type: requestType,
                ...formData,
                // Enrich data for display in Admin
                className: requestType === 'admission' ? (selectedClass?.name || '') : (classes.find(c => c.id === selectedStudent?.classId)?.name || ''),
                classDivision: requestType === 'admission' ? (selectedClass?.division || '') : (classes.find(c => c.id === selectedStudent?.classId)?.division || ''),
                targetClassName: targetClass ? `${targetClass.name} - ${targetClass.division}` : '',
                studentName: selectedStudent ? selectedStudent.name : formData.name,
                name: selectedStudent ? selectedStudent.name : formData.name // Fallback for list display
            };

            if (editingRequest) {
                await updateAdmissionRequest(editingRequest.id, data);
                showAlert('Success', 'Request updated successfully.', 'success');
                resetForm();
            } else {
                await addAdmissionRequest({
                    mentorId: currentUser.id,
                    mentorName: currentUser.name,
                    requestStatus: 'Pending',
                    createdAt: new Date().toISOString(),
                    ...data
                });
                showAlert('Success', 'Request sent to Admin for approval.', 'success');
                resetForm();
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            showAlert('Error', 'Failed to process request.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <ConfirmationModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, requestId: null })}
                onConfirm={async () => {
                    await deleteAdmissionRequest(deleteModal.requestId);
                    showAlert('Success', 'Request deleted.', 'success');
                    setDeleteModal({ isOpen: false, requestId: null });
                }}
                title="Delete Request?"
                message="Are you sure you want to delete this request?"
                confirmText="Delete"
                isDanger
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-8 h-8 text-indigo-600" />
                        Student Management Request
                    </h2>
                    <p className="text-gray-500">
                        Submit requests for new admissions, student removals, or class transfers.
                    </p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit shrink-0">
                    <button 
                        onClick={() => { setRequestType('admission'); resetForm(); }}
                        className={clsx(
                            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                            requestType === 'admission' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <UserPlus className="w-4 h-4" /> Admission
                    </button>
                    <button 
                        onClick={() => { setRequestType('removal'); resetForm(); }}
                        className={clsx(
                            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                            requestType === 'removal' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <UserMinus className="w-4 h-4" /> Removal
                    </button>
                    <button 
                        onClick={() => { setRequestType('transfer'); resetForm(); }}
                        className={clsx(
                            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                            requestType === 'transfer' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <ArrowRightLeft className="w-4 h-4" /> Transfer
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="p-6 border border-gray-100 shadow-sm relative">
                        {editingRequest && (
                            <div className="absolute top-4 right-4 group">
                                <Button onClick={resetForm} className="p-1 h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-3 mb-5 flex items-center gap-2">
                            {requestType === 'admission' ? <UserPlus className="w-4 h-4 text-indigo-500" /> : 
                             requestType === 'removal' ? <UserMinus className="w-4 h-4 text-red-500" /> : 
                             <Move className="w-4 h-4 text-amber-500" />}
                            {editingRequest ? 'Edit Request' : `New ${requestType.replace('_', ' ')} Details`}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {(requestType === 'removal' || requestType === 'transfer') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Source Class <span className="text-red-500">*</span></label>
                                        <select 
                                            name="classId" 
                                            value={formData.classId} 
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 appearance-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select source class</option>
                                            {assignedClasses.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Select Student <span className="text-red-500">*</span></label>
                                        <select 
                                            name="studentId" 
                                            value={formData.studentId} 
                                            onChange={handleChange}
                                            required
                                            disabled={!formData.classId}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 appearance-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            <option value="">{formData.classId ? 'Select student' : 'Choose class first'}</option>
                                            {students.filter(s => s.classId === formData.classId && s.status === 'Active').sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {requestType === 'transfer' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Class <span className="text-red-500">*</span></label>
                                    <select 
                                        name="targetClassId" 
                                        value={formData.targetClassId} 
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 appearance-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select target class</option>
                                        {classes.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {requestType === 'admission' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                                        <Input name="name" placeholder="Enter full name" value={formData.name} onChange={handleChange} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Register No.</label>
                                        <Input name="registerNo" placeholder="e.g. 1045" value={formData.registerNo} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">UID</label>
                                        <Input name="uid" placeholder="e.g. UID123" value={formData.uid} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
                                        <select name="classId" value={formData.classId} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50">
                                            <option value="">Select a class</option>
                                            {assignedClasses.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason / Comments</label>
                                <textarea
                                    name="comments"
                                    placeholder={requestType === 'removal' ? "Explain why this student should be removed..." : "Additional details..."}
                                    value={formData.comments}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 min-h-[100px]"
                                />
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
                                {editingRequest && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
                                <Button 
                                    type="submit" 
                                    className={clsx(
                                        "flex items-center gap-2 text-white px-6",
                                        editingRequest ? 'bg-amber-600' : 
                                        requestType === 'removal' ? 'bg-red-600' : 'bg-indigo-600'
                                    )} 
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Processing...' : <><Send className="w-4 h-4" /> Send Request</>}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-0 border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                        <div className="bg-slate-50 p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">Request History</h3>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
                            {myRequests.length === 0 ? (
                                <div className="text-center text-sm text-gray-500 py-6">No requests found.</div>
                            ) : (
                                myRequests.map(req => (
                                    <div key={req.id} className="p-3 rounded-xl border bg-white shadow-sm border-gray-100 hover:border-indigo-100 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-sm text-gray-900 truncate pr-2 flex items-center gap-2">
                                                {req.type === 'removal' && <UserMinus className="w-3 h-3 text-red-500" />}
                                                {req.type === 'transfer' && <ArrowRightLeft className="w-3 h-3 text-amber-500" />}
                                                {req.name}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {req.requestStatus === 'Pending' && (
                                                    <button onClick={() => handleEdit(req)} className="p-1 text-gray-400 hover:text-amber-500"><Edit2 className="w-3.5 h-3.5" /></button>
                                                )}
                                                {req.requestStatus === 'Pending' ? <Clock className="w-4 h-4 text-orange-500" /> : 
                                                 req.requestStatus === 'Approved' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            {req.type === 'transfer' ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="bg-gray-100 px-1 rounded">{req.className}</span>
                                                    <ArrowRightLeft className="w-2.5 h-2.5" />
                                                    <span className="bg-indigo-50 text-indigo-600 px-1 rounded">{req.targetClassName}</span>
                                                </div>
                                            ) : (
                                                <span>{req.type === 'removal' ? 'Removal from' : 'Admission to'} {req.className} - {req.classDivision}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MentorAdmissionRequest;
