import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const styles = {
        success: "bg-white border-green-200 text-gray-800",
        error: "bg-white border-red-200 text-gray-800",
        info: "bg-white border-blue-200 text-gray-800"
    };

    return (
        <div className={clsx(
            "fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300 z-50",
            styles[type]
        )}>
            {icons[type]}
            <p className="font-medium text-sm">{message}</p>
            <button
                onClick={onClose}
                className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
                <X className="w-4 h-4 text-gray-400" />
            </button>
        </div>
    );
};
