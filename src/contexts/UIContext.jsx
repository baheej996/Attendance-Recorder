import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, HelpCircle } from 'lucide-react';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

// Visual Component for the Modal
const Modal = ({ isOpen, type, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isConfirm = false }) => {
    if (!isOpen) return null;

    const getIcon = () => {
        if (type === 'success') return <CheckCircle className="w-12 h-12 text-green-500" />;
        if (type === 'error') return <AlertCircle className="w-12 h-12 text-red-500" />;
        if (type === 'warning') return <AlertCircle className="w-12 h-12 text-amber-500" />;
        return <Info className="w-12 h-12 text-indigo-500" />;
    };

    const getColorClass = () => {
        if (type === 'success') return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
        if (type === 'error') return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
        if (type === 'warning') return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
        return 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 bg-gray-50 p-3 rounded-full">
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title}
                    </h3>

                    <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        {isConfirm && (
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg shadow-indigo-500/20 transition-all ${getColorClass()}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const UIProvider = ({ children }) => {
    const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'info', callback: null });
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });

    const showAlert = useCallback((title, message, type = 'info', callback = null) => {
        setAlertState({ isOpen: true, title, message, type, callback });
    }, []);

    const showConfirm = useCallback((title, message, onConfirm, onCancel = null) => {
        setConfirmState({ isOpen: true, title, message, onConfirm, onCancel });
    }, []);

    const closeAlert = () => {
        if (alertState.callback) alertState.callback();
        setAlertState(prev => ({ ...prev, isOpen: false }));
    };

    const handleConfirm = () => {
        if (confirmState.onConfirm) confirmState.onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCancel = () => {
        if (confirmState.onCancel) confirmState.onCancel();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <UIContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {/* Render Overlay */}
            <Modal
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onConfirm={closeAlert}
                confirmText="Okay"
            />
            <Modal
                isOpen={confirmState.isOpen}
                isConfirm={true}
                title={confirmState.title}
                message={confirmState.message}
                type="warning"
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                confirmText="Confirm"
            />
        </UIContext.Provider>
    );
};
