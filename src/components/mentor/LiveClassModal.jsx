import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Video, Clock, CalendarDays, X, Link as LinkIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const LiveClassModal = ({ isOpen, onClose, classId, className }) => {
    const { liveClasses, classes, updateLiveClassConfig } = useData();
    const { showAlert } = useUI();

    const [link, setLink] = useState('');
    const [time, setTime] = useState('');
    const [selectedDays, setSelectedDays] = useState([]);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && classId) {
            const existingConfig = liveClasses?.find(lc => lc.classId === classId);
            const classItem = classes?.find(c => c.id === classId);

            // Admins can set a global start time and days for a class. We prioritize those.
            const adminTime = classItem?.startTime || '';
            const adminDays = classItem?.days && classItem.days.length > 0 ? classItem.days : null;

            if (existingConfig) {
                setLink(existingConfig.link || '');
                setTime(adminTime || existingConfig.time || '');
                setSelectedDays(adminDays || existingConfig.selectedDays || DAYS_OF_WEEK);
                setIsEnabled(existingConfig.isEnabled || false);
            } else {
                setLink('');
                setTime(adminTime || '');
                setSelectedDays(adminDays || DAYS_OF_WEEK);
                setIsEnabled(false);
            }
        }
    }, [isOpen, classId, liveClasses, classes]);

    if (!isOpen) return null;

    const toggleDay = (day) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const handleSave = async () => {
        if (isEnabled && (!link || !time || selectedDays.length === 0)) {
            showAlert('Error', 'Please fill all details if the live class is enabled.', 'error');
            return;
        }

        // Strict URL Validation
        if (isEnabled && link) {
            try {
                const url = new URL(link);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    throw new Error('Invalid protocol');
                }
            } catch (e) {
                showAlert('Error', 'Please enter a valid meeting URL (e.g., starting with https://).', 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            await setDoc(doc(db, 'liveClasses', classId), {
                classId,
                link: link || '',
                time: time || '',
                selectedDays: selectedDays || [],
                isEnabled: isEnabled || false
            }, { merge: true });
            
            showAlert('Success', `Live class settings for ${className} updated.`, 'success');
            onClose();
        } catch (error) {
            console.error('Error saving live class config:', error);
            showAlert('Error', 'Failed to update live class settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Video className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Live Class Settings</h2>
                            <p className="text-sm text-gray-500">Class {className} · Global IST Sync</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <h3 className="font-semibold text-gray-900">Enable Live Class</h3>
                            <p className="text-sm text-gray-500">Show live class link to students</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isEnabled}
                                onChange={(e) => setIsEnabled(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" />
                                Meeting Link (Google Meet, Zoom, etc.)
                            </label>
                            <input
                                type="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                placeholder="https://meet.google.com/..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                disabled={!isEnabled}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Daily Time (India Time - IST)
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                disabled={!isEnabled}
                            />
                            <p className="text-[10px] text-indigo-600 mt-1 font-medium">
                                Entering time in IST ensures students worldwide see the link at the correct moment. (Pre-filled from Admin settings if available)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" />
                                Active Days
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day}
                                        type="button"
                                        disabled={!isEnabled}
                                        onClick={() => toggleDay(day)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                                            selectedDays.includes(day)
                                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                                            !isEnabled && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {day.substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                The link will only be visible to students on the selected days.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors border border-gray-200 bg-white"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveClassModal;
