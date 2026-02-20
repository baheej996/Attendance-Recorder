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
        success: <CheckCircle className="w-8 h-8 text-white" />,
        error: <XCircle className="w-8 h-8 text-white" />,
        info: <Info className="w-8 h-8 text-white" />
    };

    const styles = {
        success: "bg-green-600 border-transparent text-white",
        error: "bg-red-600 border-transparent text-white",
        info: "bg-blue-600 border-transparent text-white"
    };

    return (
        <div className={clsx(
            "fixed top-6 left-6 right-6 sm:left-auto sm:right-6 sm:top-6 flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-top-5 fade-in duration-300 z-[100] max-w-md",
            styles[type]
        )}>
            {icons[type]}
            <p className="font-medium text-lg leading-snug text-white">{message}</p>
            <button
                onClick={onClose}
                className="ml-auto p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close"
            >
                <X className="w-5 h-5 text-white/80" />
            </button>
        </div>
    );
};
