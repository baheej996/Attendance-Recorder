import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Layers, FileText, Calendar, MessageSquare, BookOpen, Clock, Trophy, Star, Info, X } from 'lucide-react';

const FeatureToggle = ({ label, description, icon: Icon, isEnabled, isGloballyDisabled, globalDisabledReason, disabledTheme = 'red', onToggle }) => {
    const themeColors = {
        red: {
            border: 'border-red-100',
            bgBox: 'bg-red-50/30',
            iconBg: 'bg-red-100',
            iconText: 'text-red-500',
            toggleBg: 'bg-red-200'
        },
        yellow: {
            border: 'border-yellow-200',
            bgBox: 'bg-yellow-50/50',
            iconBg: 'bg-yellow-100',
            iconText: 'text-yellow-600',
            toggleBg: 'bg-yellow-200'
        }
    };

    const t = isGloballyDisabled ? themeColors[disabledTheme] : null;

    return (
        <div className={`flex items-center justify-between p-4 bg-white border rounded-xl transition-colors ${isGloballyDisabled ? `${t.border} ${t.bgBox} opacity-80 cursor-not-allowed` : 'border-gray-100 hover:border-indigo-100'}`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isGloballyDisabled ? `${t.iconBg} ${t.iconText}` : isEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className={`font-semibold ${isGloballyDisabled ? 'text-gray-700' : isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                        {label}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {isGloballyDisabled ? globalDisabledReason : description}
                    </p>
                </div>
            </div>
            <label className={`relative inline-flex items-center ${isGloballyDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isEnabled && !isGloballyDisabled}
                    onChange={onToggle}
                    disabled={isGloballyDisabled}
                />
                <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isGloballyDisabled ? t.toggleBg : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:bg-indigo-600'}`}></div>
            </label>
        </div>
    );
};

const ClassFeatureModal = ({ classId, isGlobalMode, className, isOpen, onClose }) => {
    const { currentUser, studentFeatureFlags, classFeatureFlags, updateClassFeatureFlags } = useData();
    const { showAlert } = useUI();

    const [localFlags, setLocalFlags] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setHasChanges(false);
            if (isGlobalMode) {
                // Global mode reads/writes to `mentor_${uid}`
                const mentorGlobalId = `mentor_${currentUser?.uid}`;
                const currentGlobalFlags = classFeatureFlags?.find(f => f.classId === mentorGlobalId) || {};
                setLocalFlags(currentGlobalFlags);
            } else if (classId) {
                // Local mode reads/writes to specific `classId`
                const currentClassFlags = classFeatureFlags?.find(f => f.classId === classId) || {};
                setLocalFlags(currentClassFlags);
            }
        }
    }, [isOpen, isGlobalMode, classId, classFeatureFlags, currentUser]);

    if (!isOpen) return null;

    const adminGlobalFlags = studentFeatureFlags || {};
    // Only lookup mentor flags if we are editing a single class, as it acts as the middle lock
    const mentorGlobalFlags = isGlobalMode ? {} : (classFeatureFlags?.find(f => f.classId === `mentor_${currentUser?.uid}`) || {});

    const handleToggle = (key) => {
        setLocalFlags(prev => {
            // If it doesn't exist in prev, default it to false (since we are toggling it off)
            // If it exists, flip it.
            const currentValue = prev[key] === undefined ? true : prev[key];
            const updated = { ...prev, [key]: !currentValue };
            setHasChanges(true);
            return updated;
        });
    };

    const saveChanges = async () => {
        setIsSaving(true);
        try {
            if (isGlobalMode) {
                await updateClassFeatureFlags(`mentor_${currentUser.uid}`, localFlags);
                showAlert('Success', `Global features updated for all your classes.`, 'success');
            } else {
                await updateClassFeatureFlags(classId, localFlags);
                showAlert('Success', `Features updated for class ${className}.`, 'success');
            }
            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error("Error updating features:", error);
            showAlert('Error', 'Failed to update features.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const features = [
        { key: 'activities', label: 'Activities', description: 'Enable assignments and projects.', icon: Layers },
        { key: 'exams', label: 'Online Exams', description: 'Enable MCQ based online examinations.', icon: FileText },
        { key: 'results', label: 'Report Card', description: 'Allow viewing of exam results.', icon: FileText },
        { key: 'leave', label: 'Leave Applications', description: 'Allow applying for leave.', icon: Calendar },
        { key: 'chat', label: 'Mentor Chat', description: 'Enable direct messaging.', icon: MessageSquare },
        { key: 'prayer', label: 'Prayer Chart', description: 'Enable daily prayer tracking.', icon: BookOpen },
        { key: 'history', label: 'Class History', description: 'Allow viewing of class logs.', icon: Clock },
        { key: 'leaderboard', label: 'Leaderboard', description: 'Show class rankings and points.', icon: Trophy },
        { key: 'star', label: 'Star of the Month', description: 'Show monthly student recognition.', icon: Star },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-gray-50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 rounded-t-2xl shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{isGlobalMode ? 'Global Class Features' : 'Class Features'}</h2>
                        <p className="text-sm text-gray-500">
                            {isGlobalMode ?
                                `Manage features for all of your assigned classes at once.` :
                                <span>Manage student panel features for <span className="font-semibold text-indigo-600">Class {className}</span></span>
                            }
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm flex gap-3 items-start border border-indigo-100">
                        <Info className="w-5 h-5 shrink-0 text-indigo-600 mt-0.5" />
                        <p>Turn off specific features for {isGlobalMode ? 'all your classes' : 'this class'}. Note that if the administrator has disabled a feature completely, you cannot enable it here.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {features.map(f => {
                            const isAdminDisabled = adminGlobalFlags[f.key] === false;
                            const isMentorDisabled = !isGlobalMode && mentorGlobalFlags[f.key] === false;

                            const isLocked = isAdminDisabled || isMentorDisabled;
                            let lockReason = '';
                            if (isAdminDisabled) lockReason = 'Disabled by Administrator';
                            else if (isMentorDisabled) lockReason = 'Enable in Global Features first';

                            const theme = isMentorDisabled ? 'yellow' : 'red';
                            const isEnabledLocally = localFlags[f.key] !== false; // Default true if undefined

                            return (
                                <FeatureToggle
                                    key={f.key}
                                    {...f}
                                    isEnabled={isEnabledLocally}
                                    isGloballyDisabled={isLocked}
                                    globalDisabledReason={lockReason}
                                    disabledTheme={theme}
                                    onToggle={() => handleToggle(f.key)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-gray-100 rounded-b-2xl shrink-0 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveChanges}
                        disabled={!hasChanges || isSaving}
                        className={`px-6 py-2 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2
                            ${!hasChanges ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClassFeatureModal;
