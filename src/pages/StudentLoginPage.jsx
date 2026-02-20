import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import { GraduationCap, History, X } from 'lucide-react';

const StudentLoginPage = () => {
    const navigate = useNavigate();
    const { students, login } = useData();

    const [registerNo, setRegisterNo] = useState('');
    const [error, setError] = useState('');
    const [recentLogins, setRecentLogins] = useState([]);

    // Dynamically switch PWA manifest for student install
    useEffect(() => {
        const link = document.querySelector("link[rel='manifest']");
        if (link) {
            link.href = "/manifest-student.json";
        }

        // Load recent logins
        try {
            const history = JSON.parse(localStorage.getItem('student_login_history') || '[]');
            if (Array.isArray(history)) {
                setRecentLogins(history);
            }
        } catch (e) {
            console.error("Failed to load login history", e);
        }

        // Revert on unmount
        return () => {
            if (link) {
                link.href = "/manifest.json";
            }
        };
    }, []);

    const saveLoginHistory = (regNo) => {
        try {
            let history = JSON.parse(localStorage.getItem('student_login_history') || '[]');
            if (!Array.isArray(history)) history = [];
            // Add to top, remove duplicates, keep max 5
            history = [regNo, ...history.filter(r => r !== regNo)].slice(0, 5);
            localStorage.setItem('student_login_history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save login history", e);
        }
    };

    const removeHistoryItem = (e, regNo) => {
        e.stopPropagation(); // Prevent clicking the parent button
        const updated = recentLogins.filter(r => r !== regNo);
        setRecentLogins(updated);
        localStorage.setItem('student_login_history', JSON.stringify(updated));
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        const student = students.find(s => s.registerNo === registerNo && s.status === 'Active');

        if (student) {
            saveLoginHistory(registerNo);
            login({ role: 'student', ...student });
            navigate('/student');
        } else {
            setError('Invalid Register Number');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-indigo-100 rounded-full text-indigo-600 mb-4">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Student Portal
                    </h1>
                    <p className="text-gray-500">Please enter your register number</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                        label="Register Number"
                        placeholder="e.g. A001"
                        value={registerNo}
                        onChange={e => setRegisterNo(e.target.value)}
                    />

                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{error}</div>}

                    <Button type="submit" className="w-full h-11 text-base">
                        Login
                    </Button>
                </form>

                {recentLogins.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <History className="w-3 h-3" /> Recent Logins
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem('student_login_history');
                                    setRecentLogins([]);
                                }}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {recentLogins.map(reg => (
                                <div
                                    key={reg}
                                    onClick={() => setRegisterNo(reg)}
                                    className="group flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-100">
                                            {reg.charAt(0)}
                                        </div>
                                        <span className="font-medium text-gray-700 font-mono">{reg}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <button
                                            type="button"
                                            onClick={(e) => removeHistoryItem(e, reg)}
                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default StudentLoginPage;
