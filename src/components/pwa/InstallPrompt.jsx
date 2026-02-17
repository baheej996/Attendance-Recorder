import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        // Check if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        if (isStandalone) return;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For iOS, show prompt after a small delay if not standalone
        if (isIOSDevice && !isStandalone) {
            // Check if we've already shown it this session to avoid annoyance
            const hasSeenPrompt = sessionStorage.getItem('pwa_prompt_seen');
            if (!hasSeenPrompt) {
                setTimeout(() => setIsVisible(true), 3000);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_seen', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white rounded-xl shadow-2xl p-4 border border-purple-100 flex flex-col gap-4 relative md:max-w-md md:mx-auto">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4 pr-6">
                    <div className="bg-purple-100 p-3 rounded-xl shrink-0">
                        <Smartphone className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Install App</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {isIOS
                                ? "Install this app on your iPhone for a better experience."
                                : "Add this app to your home screen for quick access and offline use."}
                        </p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-2">
                        <div className="flex items-center gap-2">
                            1. Tap the <Share className="w-4 h-4 text-blue-500" /> <strong>Share</strong> button
                        </div>
                        <div className="flex items-center gap-2">
                            2. Scroll down and tap <PlusSquare className="w-4 h-4 text-gray-600" /> <strong>Add to Home Screen</strong>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 mt-1">
                        <button
                            onClick={handleInstallClick}
                            className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors shadow-sm active:scale-95 transform"
                        >
                            Install Now
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-2.5 bg-gray-50 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstallPrompt;
