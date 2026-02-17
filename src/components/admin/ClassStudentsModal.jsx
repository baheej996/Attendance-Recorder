import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Search, Trash2, ArrowRightLeft, UserX, AlertTriangle } from 'lucide-react';
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
    const [actionType, setActionType] = useState(null); // 'transfer' | 'delete'
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
        } else if (actionType === 'transfer') {
            if (!targetClassId) return;
            onTransfer(selectedStudent.id, targetClassId);
        }
        handleCancelAction();
    };

    const handleCancelAction = () => {
        setSelectedStudent(null);
        setActionType(null);
        setTargetClassId('');
    };

    // Sub-modal for actions
    const renderActionModal = () => {
        if (!selectedStudent) return null;

        const isDelete = actionType === 'delete';
        const title = isDelete ? 'Remove Student' : 'Transfer Student';

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-gray-100 transform transition-all scale-100 opacity-100 animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className={clsx(
                            "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                            isDelete ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>
                            {isDelete ? <UserX className="w-6 h-6" /> : <ArrowRightLeft className="w-6 h-6" />}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {isDelete
                                ? `Are you sure you want to remove ${selectedStudent.name}? This action cannot be undone.`
                                : `Select destination class for ${selectedStudent.name}`
                            }
                        </p>
                    </div>

                    {!isDelete && (
                        <div className="mb-6 text-left">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Target Class</label>
                            <select
                                value={targetClassId}
                                onChange={(e) => setTargetClassId(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="">Select Class...</option>
                                {classes
                                    .filter(c => c.id !== classItem.id) // Exclude current
                                    .map(c => (
                                        <option key={c.id} value={c.id}>
                                            Class {c.name} - {c.division}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleCancelAction}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={isDelete ? "danger" : "default"}
                            onClick={handleConfirm}
                            disabled={!isDelete && !targetClassId}
                            className="flex-1"
                        >
                            {isDelete ? "Remove" : "Transfer"}
                        </Button>
                    </div>
                </div>
            </div>
        );
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
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{student.name}</p>
                                                <p className="text-xs text-gray-500">{student.registerNo || 'No Reg No'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleActionClick(student, 'transfer')}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Transfer"
                                            >
                                                <ArrowRightLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleActionClick(student, 'delete')}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t mt-auto flex justify-between items-center text-sm text-gray-500">
                        <span>Total: {classStudents.length} Students</span>
                        <Button variant="secondary" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </Modal>

            {renderActionModal()}
        </>
    );
};
