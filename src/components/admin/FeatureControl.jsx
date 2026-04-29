import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Layers, FileText, Calendar, MessageSquare, BookOpen, Clock, Trophy, Star, Info, Sparkles, Book, CheckCircle, Moon, GraduationCap, Users } from 'lucide-react';
import { STUDENT_NAV_ITEMS } from '../../config/studentNavItems';
import { MENTOR_NAV_ITEMS } from '../../config/mentorNavItems';

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
    const { studentFeatureFlags, updateStudentFeatureFlags, mentorFeatureFlags, updateMentorFeatureFlags } = useData();
    const { showAlert } = useUI();
    const [activeTab, setActiveTab] = useState('student');

    // Extract features directly from configurations
    // Make sure to add a fallback description if it's missing in the mentor config
    const studentFeatures = STUDENT_NAV_ITEMS.map(item => ({
        key: item.key || item.id, // Fallback to id if key not present
        label: item.label,
        description: item.description || `Manage ${item.label.toLowerCase()} feature.`,
        icon: item.icon
    }));

    const mentorFeatures = MENTOR_NAV_ITEMS.map(item => ({
        key: item.key || item.id,
        label: item.label,
        description: item.description || `Manage ${item.label.toLowerCase()} feature.`,
        icon: item.icon
    }));

    const [localStudentFlags, setLocalStudentFlags] = useState({});
    const [localMentorFlags, setLocalMentorFlags] = useState({});

    useEffect(() => {
        if (studentFeatureFlags) {
            const explicitFlags = {};
            studentFeatures.forEach(f => explicitFlags[f.key] = studentFeatureFlags[f.key] !== false);
            setLocalStudentFlags(explicitFlags);
        }
    }, [studentFeatureFlags]);

    useEffect(() => {
        if (mentorFeatureFlags) {
            const explicitFlags = {};
            mentorFeatures.forEach(f => explicitFlags[f.key] = mentorFeatureFlags[f.key] !== false);
            setLocalMentorFlags(explicitFlags);
        } else {
            // Default all mentor features to true if missing
            const defaultFlags = {};
            mentorFeatures.forEach(f => defaultFlags[f.key] = true);
            setLocalMentorFlags(defaultFlags);
        }
    }, [mentorFeatureFlags]);

    const handleToggle = async (key, type) => {
        const isStudent = type === 'student';
        const currentFlags = isStudent ? localStudentFlags : localMentorFlags;
        const setLocalFlags = isStudent ? setLocalStudentFlags : setLocalMentorFlags;
        const updateFlags = isStudent ? updateStudentFeatureFlags : updateMentorFeatureFlags;
        const activeFeatures = isStudent ? studentFeatures : mentorFeatures;

        const currentValue = currentFlags[key] === undefined ? true : currentFlags[key];
        const newStatus = !currentValue;
        const updatedFlags = { ...currentFlags, [key]: newStatus };

        setLocalFlags(updatedFlags);

        try {
            await updateFlags(updatedFlags);
            showAlert('Success', `${activeFeatures.find(f => f.key === key)?.label} ${newStatus ? 'Enabled' : 'Disabled'} successfully.`, 'success');
        } catch (error) {
            console.error("Error updating features:", error);
            showAlert('Error', 'Failed to update feature.', 'error');
            // Revert on failure
            setLocalFlags(currentFlags);
        }
    };

    // Features array moved up to state boundary

    const renderToggles = (featuresList, flags, type) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuresList.map(f => (
                <FeatureToggle
                    key={f.key}
                    {...f}
                    isEnabled={flags[f.key] !== false} // Default to true if undefined
                    onToggle={() => handleToggle(f.key, type)}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Feature Control</h2>
                    <p className="text-gray-500">Enable or disable features for panels. New pages added to the app will automatically appear here. Changes are saved automatically.</p>
                </div>
            </div>

            <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('student')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        activeTab === 'student'
                            ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    Student Features
                </button>
                <button
                    onClick={() => setActiveTab('mentor')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        activeTab === 'mentor'
                            ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    Mentor Features
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                {activeTab === 'student' ? renderToggles(studentFeatures, localStudentFlags, 'student') : renderToggles(mentorFeatures, localMentorFlags, 'mentor')}
            </div>
        </div>
    );
};

export default FeatureControl;
