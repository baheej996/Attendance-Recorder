import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const UpdateNotification = () => {
    const { isUpdateAvailable } = useData();
    const [isVisible, setIsVisible] = React.useState(true);

    if (!isUpdateAvailable || !isVisible) return null;

    const handleRefresh = () => {
        window.location.reload(true);
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl shadow-indigo-200 border border-indigo-500 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <RefreshCw className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold leading-tight">New Update Available</h4>
                        <p className="text-[11px] text-indigo-100 opacity-90">Refresh to get the latest features and fixes.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-white text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap"
                    >
                        Refresh Now
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateNotification;
