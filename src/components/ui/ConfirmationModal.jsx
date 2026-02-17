import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { clsx } from 'clsx';

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", cancelText = "Cancel", isDanger = false, autoClose = true, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className={clsx(
                            "p-3 rounded-full shrink-0",
                            isDanger ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
                        )}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
                            {children && <div className="mt-3">{children}</div>}
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3 justify-end">
                        {cancelText && (
                            <Button
                                onClick={onClose}
                                className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm"
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            onClick={() => {
                                onConfirm();
                                if (autoClose) {
                                    onClose();
                                }
                            }}
                            className={clsx(
                                "shadow-sm",
                                isDanger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            )}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
