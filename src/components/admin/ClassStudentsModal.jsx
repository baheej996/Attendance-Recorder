import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Search, Trash2, ArrowRightLeft, UserX, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../ui/ConfirmationModal';

export const ClassStudentsModal = ({
    isOpen,
    onClose,
    classItem,
    students,
    classes,
    onTransfer,
    onDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [actionType, setActionType] = useState(null); // 'transfer' | 'delete' | 'transfer-confirm'
    const [targetClassId, setTargetClassId] = useState('');

    if (!isOpen || !classItem) return null;

    // Filter students for this class
    const classStudents = students.filter(s => s.classId === classItem.id);

    // Filter by search
    const filteredStudents = classStudents.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registerNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleActionClick = (student, type) => {
        setSelectedStudent(student);
        setActionType(type);
        setTargetClassId(''); // Reset target class
    };

    const handleConfirm = () => {
        if (actionType === 'delete') {
            onDelete(selectedStudent.id);
            handleCancelAction();
        } else if (actionType === 'transfer') {
            if (!targetClassId) return;
            // Move to confirmation step
            setActionType('transfer-confirm');
        } else if (actionType === 'transfer-confirm') {
            onTransfer(selectedStudent.id, targetClassId);
            handleCancelAction();
        }
    };

    const handleCancelAction = () => {
        setSelectedStudent(null);
        setActionType(null);
        setTargetClassId('');
    };

    // Sub-modal for actions
    const renderActionModal = () => {
        if (!selectedStudent) return null;

        if (actionType === 'delete') {
            return (
                <ConfirmationModal
                    isOpen={true}
                    onClose={handleCancelAction}
                    onConfirm={handleConfirm}
                    title="Remove Student"
                    message={`Are you sure you want to remove ${selectedStudent.name}? This action cannot be undone.`}
                    confirmText="Remove"
                    isDanger
                />
            );
        }

        if (actionType === 'transfer-confirm') {
            const targetClass = classes.find(c => c.id === targetClassId);
            return (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setActionType('transfer')}
                    onConfirm={handleConfirm}
                    title="Confirm Transfer"
                    message={`Are you sure you want to transfer ${selectedStudent.name} to Class ${targetClass?.name}-${targetClass?.division}?`}
                    confirmText="Yes, Transfer"
                />
            );
        }

        if (actionType === 'transfer') {
            return createPortal(
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-gray-100 transform transition-all scale-100 opacity-100 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={handleCancelAction}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-indigo-100 text-indigo-600 shadow-sm">
                                <ArrowRightLeft className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Transfer Student</h3>
                            <p className="text-sm text-gray-500 mt-1 font-medium">
                                Select destination class for {selectedStudent.name}
                            </p>
                        </div>

                        <div className="mb-6 text-left">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Class</label>
                            <select
                                value={targetClassId}
                                onChange={(e) => setTargetClassId(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
                            >
                                <option value="">Select Destination...</option>
                                {classes
                                    .filter(c => c.id !== classItem.id) // Exclude current
                                    .map(c => (
                                        <option key={c.id} value={c.id}>
                                            Class {c.name} - {c.division}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={handleCancelAction}
                                className="flex-1 bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={!targetClassId}
                                className="flex-1 shadow-md shadow-indigo-100"
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            );
        }

        return null;
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Students in Class ${classItem.name}-${classItem.division}`}
                maxWidth="2xl"
            >
                <div className="flex flex-col h-[60vh]">
                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto -mx-6 px-6">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <p>{searchTerm ? "No matching students found." : "No students in this class yet."}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 pb-4">
                                {filteredStudents.map((student, index) => (
                                    <div
                                        key={student.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                                                <p className="text-[11px] text-gray-400 font-medium tracking-tight uppercase">{student.registerNo || 'No Reg No'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleActionClick(student, 'transfer')}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100 shadow-sm sm:shadow-none"
                                                title="Transfer Student"
                                            >
                                                <ArrowRightLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleActionClick(student, 'delete')}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 shadow-sm sm:shadow-none"
                                                title="Remove Student"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t mt-auto flex justify-between items-center">
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{classStudents.length} Students</span>
                        <Button variant="secondary" onClick={onClose} className="px-6">Close</Button>
                    </div>
                </div>
            </Modal>

            {renderActionModal()}
        </>
    );
};
