import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { User, MapPin, Phone, ShieldAlert } from 'lucide-react';

const StudentPersonalDetailsModal = ({ isOpen, onClose, student, classes, mentors }) => {
    if (!student) return null;

    const studentClass = classes?.find(c => c.id === student.classId);
    const assignedMentor = mentors?.find(m => m.assignedClassIds?.includes(student.classId));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Personal Details" size="2xl">
            <div className="space-y-6">
                {/* Official Bio Section */}
                <div className="bg-indigo-600 rounded-2xl p-5 border border-indigo-700 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <ShieldAlert className="w-32 h-32 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                        <ShieldAlert className="w-5 h-5 text-indigo-200" />
                        Official Bio
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Full Name</p>
                            <p className="font-semibold text-white">{student.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Register No.</p>
                            <p className="font-semibold text-white">{student.registerNo}</p>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Class</p>
                            <p className="font-semibold text-white">
                                {studentClass ? `${studentClass.name} - ${studentClass.division}` : 'Not assigned'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Gender</p>
                            <p className="font-semibold text-white">{student.gender || 'Not specified'}</p>
                        </div>
                    </div>
                </div>

                {/* Personal Details Added by Student */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Family Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Father's Name</p>
                            <p className="font-semibold text-gray-900">{student.fatherName || <span className="text-gray-400 italic">Not provided</span>}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Mother's Name</p>
                            <p className="font-semibold text-gray-900">{student.motherName || <span className="text-gray-400 italic">Not provided</span>}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                        Location Details
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Living Location</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Living Country</p>
                                    <p className="font-semibold text-gray-900">{student.livingCountry || <span className="text-gray-400 italic">Not provided</span>}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Living State</p>
                                    <p className="font-semibold text-gray-900">{student.livingState || <span className="text-gray-400 italic">Not provided</span>}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Native Location</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Native Country</p>
                                    <p className="font-semibold text-gray-900">{student.nativeCountry || <span className="text-gray-400 italic">Not provided</span>}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Native State</p>
                                    <p className="font-semibold text-gray-900">{student.nativeState || <span className="text-gray-400 italic">Not provided</span>}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-indigo-600" />
                        Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Contact No.</p>
                            <p className="font-semibold text-gray-900">{student.contactNo || <span className="text-gray-400 italic">Not provided</span>}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">WhatsApp No.</p>
                            <p className="font-semibold text-gray-900">{student.whatsappNo || <span className="text-gray-400 italic">Not provided</span>}</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end pt-2">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default StudentPersonalDetailsModal;
