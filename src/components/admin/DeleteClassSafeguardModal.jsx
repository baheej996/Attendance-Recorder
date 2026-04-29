import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Users, ArrowRight, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export const DeleteClassSafeguardModal = ({
    isOpen,
    onClose,
    classToDelete,
    studentsCount,
    classes,
    onBulkTransferAndDelete,
    onManageIndividually
}) => {
    const [targetClassId, setTargetClassId] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen || !classToDelete) return null;

    const targetClass = targetClassId ? classes.find(c => c.id === targetClassId) : null;

    const handleConfirm = () => {
        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }
        if (targetClassId) {
            onBulkTransferAndDelete(classToDelete.id, targetClassId);
            onClose();
        }
    };

    const handleCancel = () => {
        if (isConfirming) {
            setIsConfirming(false);
        } else {
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 transform transition-all scale-100 opacity-100 animate-in zoom-in-95 duration-200">
                {/* Header Area */}
                <div className="bg-red-50 p-6 flex items-start gap-4 border-b border-red-100">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Safeguard Warning</h2>
                        <p className="text-red-600 font-medium mt-1">
                            Cannot delete <span className="font-bold">Class {classToDelete.name}-{classToDelete.division}</span> because it has <span className="font-black bg-red-100 px-2 py-0.5 rounded-md">{studentsCount} active students</span>.
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    {!isConfirming ? (
                        <div className="space-y-6">
                            {/* Option B: Bulk Transfer */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Option 1: Bulk Transfer & Delete</h3>
                                        <p className="text-sm text-gray-500">Fastest method. Moves everyone at once.</p>
                                    </div>
                                </div>
                                <select
                                    value={targetClassId}
                                    onChange={(e) => setTargetClassId(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                >
                                    <option value="">Select Target Class...</option>
                                    {classes
                                        .filter(c => c.id !== classToDelete.id)
                                        .map(c => (
                                            <option key={c.id} value={c.id}>
                                                Class {c.name} - {c.division}
                                            </option>
                                        ))}
                                </select>
                                <Button 
                                    className="w-full mt-4 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                                    disabled={!targetClassId}
                                    onClick={handleConfirm}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Transfer All & Delete Class
                                </Button>
                            </div>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="shrink-0 px-6 text-gray-400 text-xs font-bold uppercase tracking-wider">OR</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            {/* Option A: Individual Transfer */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Option 2: Individual Transfer</h3>
                                        <p className="text-sm text-gray-500">Pick and choose where students go.</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="secondary"
                                    className="w-full bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={onManageIndividually}
                                >
                                    Manage Students Individually
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Final Confirmation</h3>
                            <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
                                You are about to move all <span className="font-bold text-gray-900">{studentsCount} students</span> to 
                                <span className="font-bold text-indigo-600"> Class {targetClass?.name}-{targetClass?.division} </span> 
                                and <span className="font-bold text-red-600">forever delete</span> Class {classToDelete.name}-{classToDelete.division}.
                            </p>
                            <div className="flex gap-3 mt-8">
                                <Button variant="secondary" onClick={handleCancel} className="flex-1">
                                    Cancel
                                </Button>
                                <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleConfirm}>
                                    Yes, Do it!
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer only if not confirming */}
                {!isConfirming && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                        <Button variant="secondary" onClick={onClose} className="px-6">
                            Close
                        </Button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
