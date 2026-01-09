import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BookOpen, Trophy, Calendar, LogOut, FileText, LayoutDashboard } from 'lucide-react';
import { clsx } from 'clsx';

// Import New Student Components
import StudentResultView from '../components/student/StudentResultView';
import Leaderboard from '../components/student/Leaderboard';

const COLORS = ['#10B981', '#EF4444'];

// 1. Sidebar Component (Same style as Admin/Mentor)
const SidebarItem = ({ icon: Icon, label, path, active, onClick }) => (
    <Link
        to={path}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${active
            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
        {label}
    </Link>
);

// 2. Main Student Dashboard Layout
const StudentDashboard = () => {
    const { currentUser, logout } = useData();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!currentUser) return null;

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/student' },
        { icon: FileText, label: 'Report Card', path: '/student/results' },
        { icon: Trophy, label: 'Leaderboard', path: '/student/leaderboard' },
    ];

    const isActive = (path) => {
        if (path === '/student' && location.pathname === '/student') return true;
        return path !== '/student' && location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-20 hidden md:block">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Student Portal</h1>
                            <p className="text-xs text-gray-500">Academic Tracker</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.path}
                                icon={item.icon}
                                label={item.label}
                                path={item.path}
                                active={isActive(item.path)}
                            />
                        ))}
                    </nav>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                            <p className="text-xs text-gray-500 truncate">{currentUser.registerNo}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 md:ml-64 p-8">
                <Routes>
                    <Route path="/" element={<StudentOverview student={currentUser} />} />
                    <Route path="/results" element={<StudentResultView />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                </Routes>
            </main>
        </div>
    );
};


// 3. Re-implement the original StudentView as 'StudentOverview'
const StudentOverview = ({ student }) => {
    const { attendance, students, classes } = useData();

    // Stats Calculations
    const classId = student.classId;
    const studentRecords = attendance.filter(r => r.studentId === student.id);
    const totalDays = studentRecords.length;
    const presentDays = studentRecords.filter(r => r.status === 'Present').length;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    // Topper Calculation
    const classStudents = students.filter(s => s.classId === classId && s.status === 'Active');
    const classStats = classStudents.map(s => {
        const recs = attendance.filter(r => r.studentId === s.id);
        const tot = recs.length;
        const pre = recs.filter(r => r.status === 'Present').length;
        const per = tot > 0 ? (pre / tot) * 100 : 0;
        return { ...s, percentage: per };
    });

    // Sort by percentage desc
    const sorted = [...classStats].sort((a, b) => b.percentage - a.percentage);
    const rank = sorted.findIndex(s => s.id === student.id) + 1;
    const topper = sorted[0];

    const data = [
        { name: 'Present', value: presentDays },
        { name: 'Absent', value: totalDays - presentDays },
    ];

    const studentClass = classes.find(c => c.id === classId);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome, {student.name}</h1>
                    <p className="text-gray-500">
                        Reg No: {student.registerNo} • {studentClass ? `Class ${studentClass.name}-${studentClass.division}` : ''}
                    </p>
                </div>
                <div className="hidden md:block">
                    <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                        Academic Year 2024-25
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Percentage Card */}
                <Card className="flex flex-col items-center justify-center p-6 bg-indigo-600 text-white border-none shadow-lg">
                    <div className="w-32 h-32 mb-4 relative">
                        {totalDays === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-indigo-200">No Data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        innerRadius={40}
                                        outerRadius={60}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#ffffff" />
                                        <Cell fill="#ffffff40" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                            {percentage.toFixed(0)}%
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold">Overall Attendance</h3>
                    <p className="text-indigo-200 text-sm mt-1">{presentDays} / {totalDays} Working Days</p>
                </Card>

                {/* Rank Card */}
                <Card className="p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Class Standing</h3>
                        </div>
                        <div className="mt-4">
                            <p className="text-4xl font-bold text-gray-900">#{rank}</p>
                            <p className="text-gray-500 text-sm">Your Rank in Class</p>
                        </div>
                        {topper && (
                            <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
                                <span className="text-gray-400">Class Topper:</span>
                                <span className="ml-2 font-medium text-gray-900">{topper.name} ({topper.percentage.toFixed(0)}%)</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Quick Stats */}
                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        Recent Activity
                    </h3>
                    <div className="space-y-3">
                        {studentRecords.slice(-5).reverse().map(rec => (
                            <div key={rec.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{new Date(rec.date).toLocaleDateString()}</span>
                                <span className={clsx(
                                    "px-2 py-0.5 rounded font-medium text-xs",
                                    rec.status === 'Present' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                    {rec.status}
                                </span>
                            </div>
                        ))}
                        {studentRecords.length === 0 && <p className="text-gray-400 text-sm italic">No records found.</p>}
                    </div>
                </Card>
            </div>

            {/* Detailed History */}
            <Card>
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Full Attendance History</h3>
                </div>
                <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-900 font-semibold sticky top-0">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Day</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {studentRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).map(rec => {
                                const d = new Date(rec.date);
                                return (
                                    <tr key={rec.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">{d.toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-gray-500">{d.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-xs font-semibold",
                                                rec.status === 'Present' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {rec.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default StudentDashboard;
