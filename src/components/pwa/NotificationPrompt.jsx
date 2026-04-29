import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, X, Shield, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const NotificationPrompt = () => {
    const { permission, requestPermission } = useNotifications();
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Only show if permission is default and not dismissed this session
        const dismissed = sessionStorage.getItem('notificationPromptDismissed');
        if (permission === 'default' && !dismissed) {
            const timer = setTimeout(() => setShow(true), 3000); // Wait 3s after load
            return () => clearTimeout(timer);
        }
    }, [permission]);

    const handleRequest = async () => {
        const result = await requestPermission();
        if (result !== 'default') setShow(false);
    };

    const handleDismiss = () => {
        setShow(false);
        sessionStorage.setItem('notificationPromptDismissed', 'true');
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <Card className="p-0 overflow-hidden shadow-2xl border-2 border-indigo-100 bg-white/95 backdrop-blur-md">
                <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/20 rounded-lg">
                            <Bell className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">Stay Updated</span>
                    </div>
                    <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                        Enable Notifications?
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                        Get real-time alerts for new tasks, messages, and important academic updates directly on your device.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={handleRequest}
                            variant="primary"
                            className="w-full justify-between items-center bg-indigo-600 hover:bg-indigo-700 h-11"
                        >
                            Enable Now <ArrowRight className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
                            <Shield className="w-3 h-3 text-green-500" />
                            Safe & Secure • Unsubscribe Anytime
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default NotificationPrompt;
