import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Layers, FileText, Calendar, MessageSquare, BookOpen, Clock, Trophy, Star, Info } from 'lucide-react';

const FeatureToggle = ({ label, description, icon: Icon, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-100 transition-colors">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h3 className={`font-semibold ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>{label}</h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={isEnabled}
                onChange={onToggle}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
    </div>
);

const FeatureControl = () => {
    const { studentFeatureFlags, updateStudentFeatureFlags } = useData();
    const { showAlert } = useUI();
    const [localFlags, setLocalFlags] = useState(studentFeatureFlags || {});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (studentFeatureFlags) {
            setLocalFlags(studentFeatureFlags);
        }
    }, [studentFeatureFlags]);

    const handleToggle = (key) => {
        setLocalFlags(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            setHasChanges(true);
            return updated;
        });
    };

    const saveChanges = async () => {
        try {
            await updateStudentFeatureFlags(localFlags);
            setHasChanges(false);
            showAlert('Success', 'Student panel features updated successfully.', 'success');
        } catch (error) {
            console.error("Error updating features:", error);
            showAlert('Error', 'Failed to update features.', 'error');
        }
    };

    const features = [
        { key: 'activities', label: 'Activities', description: 'Assignments and projects for students.', icon: Layers },
        { key: 'exams', label: 'Online Exams', description: 'MCQ based online examinations.', icon: FileText },
        { key: 'results', label: 'Report Card', description: 'View exam results and progress.', icon: FileText },
        { key: 'leave', label: 'Leave Applications', description: 'Apply for leave and view status.', icon: Calendar },
        { key: 'chat', label: 'Mentor Chat', description: 'Messaging system with mentors.', icon: MessageSquare },
        { key: 'prayer', label: 'Prayer Chart', description: 'Daily prayer tracking.', icon: BookOpen },
        { key: 'history', label: 'Class History', description: 'View past class logs.', icon: Clock },
        { key: 'leaderboard', label: 'Leaderboard', description: 'Class rankings and points.', icon: Trophy },
        { key: 'star', label: 'Star of the Month', description: 'Monthly student recognition.', icon: Star },
        { key: 'help', label: 'Help Section', description: 'Guides and FAQs.', icon: Info },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Feature Control</h2>
                    <p className="text-gray-500">Enable or disable features for the Student Panel.</p>
                </div>
                {hasChanges && (
                    <button
                        onClick={saveChanges}
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm animate-in fade-in"
                    >
                        Save Changes
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map(f => (
                    <FeatureToggle
                        key={f.key}
                        {...f}
                        isEnabled={localFlags[f.key] !== false} // Default to true if undefined
                        onToggle={() => handleToggle(f.key)}
                    />
                ))}
            </div>
        </div>
    );
};

export default FeatureControl;
