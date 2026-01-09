import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { LogIn, UserCog, User, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';

const LoginPage = () => {
    const navigate = useNavigate();
    const { mentors, students, login, validateAdmin } = useData();
    const [role, setRole] = useState('admin'); // admin, mentor, student
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        mentorName: '',
        registerNo: ''
    });
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        if (role === 'admin') {
            if (validateAdmin(formData.username, formData.password)) {
                login({ role: 'admin', name: 'Administrator' });
                navigate('/admin');
            } else {
                setError('Invalid Admin Credentials');
            }
        }
        else if (role === 'mentor') {
            // Match by email and password
            const mentor = mentors.find(m => m.email === formData.mentorEmail && m.password === formData.mentorPassword);
            if (mentor) {
                login({ role: 'mentor', ...mentor });
                navigate('/mentor');
            } else {
                setError('Invalid Email or Password');
            }
        }
        else if (role === 'student') {
            const student = students.find(s => s.registerNo === formData.registerNo && s.status === 'Active');
            if (student) {
                login({ role: 'student', ...student });
                navigate('/student');
            } else {
                setError('Invalid Register Number');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-indigo-100 rounded-full text-indigo-600 mb-4">
                        <LogIn className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="text-gray-500">Please login to continue</p>
                </div>

                {/* Role Toggles */}
                <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                    <button
                        onClick={() => { setRole('admin'); setError(''); }}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                            role === 'admin' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <UserCog className="w-4 h-4" /> Admin
                    </button>
                    <button
                        onClick={() => { setRole('mentor'); setError(''); }}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                            role === 'mentor' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <User className="w-4 h-4" /> Mentor
                    </button>
                    <button
                        onClick={() => { setRole('student'); setError(''); }}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                            role === 'student' ? "bg-white text-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <GraduationCap className="w-4 h-4" /> Student
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {role === 'admin' && (
                        <>
                            <Input
                                label="Username"
                                value={formData.username}
                                onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                            />
                            <Input
                                type="password"
                                label="Password"
                                value={formData.password}
                                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                            />
                            <p className="text-xs text-gray-400 text-center">Default: admin / admin123</p>
                        </>
                    )}

                    {role === 'mentor' && (
                        <div className="space-y-4">
                            <Input
                                label="Email"
                                type="email"
                                placeholder="e.g. mentor@school.com"
                                value={formData.mentorEmail || ''}
                                onChange={e => setFormData(p => ({ ...p, mentorEmail: e.target.value }))}
                            />
                            <Input
                                label="Password"
                                type="password"
                                placeholder="Enter password"
                                value={formData.mentorPassword || ''}
                                onChange={e => setFormData(p => ({ ...p, mentorPassword: e.target.value }))}
                            />
                            {mentors.length === 0 && <p className="text-xs text-red-500">No mentors registered yet.</p>}
                        </div>
                    )}

                    {role === 'student' && (
                        <Input
                            label="Register Number"
                            placeholder="e.g. A001"
                            value={formData.registerNo}
                            onChange={e => setFormData(p => ({ ...p, registerNo: e.target.value }))}
                        />
                    )}

                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{error}</div>}

                    <Button type="submit" className="w-full h-11 text-base">
                        Login as {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default LoginPage;
