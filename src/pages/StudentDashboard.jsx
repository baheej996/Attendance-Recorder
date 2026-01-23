import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BookOpen, Trophy, Calendar, LogOut, FileText, LayoutDashboard, Info, Layers, History, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';

// Import New Student Components
import StudentResultView from '../components/student/StudentResultView';
import StudentExamView from '../components/student/StudentExamView';
import Leaderboard from '../components/student/Leaderboard';
import StudentActivities from '../components/student/StudentActivities';
import PrayerChart from '../components/student/PrayerChart';
import ClassHistory from '../components/student/ClassHistory';
import StudentLeave from './StudentLeave';
import StudentChat from './StudentChat';
import StudentStarView from '../components/student/StudentStarView';

import Help from './Help';
import { Star } from 'lucide-react';

const COLORS = ['#10B981', '#EF4444'];

// 1. Sidebar Component (Same style as Admin/Mentor)
const SidebarItem = ({ icon: Icon, label, path, active, onClick, hasNotification }) => (
    <Link
        to={path}
        onClick={onClick}
        data-tour={`sidebar-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${active
            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
        {label}
        {hasNotification && (
            <span className="absolute right-4 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        )}
    </Link>
);

const StudentDashboard = () => {
    const { currentUser, logout, activities, activitySubmissions, classes } = useData(); // Added classes
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const hasPendingActivities = (activities || []).filter(a =>
        a.classId === currentUser.classId &&
        a.status === 'Active' &&
        !(activitySubmissions || []).some(s => s.activityId === a.id && s.studentId === currentUser.id && s.status === 'Completed')
    ).length > 0;

    if (!currentUser) return null;

    // Check feature flags
    const studentClass = classes.find(c => c.id === currentUser.classId);
    // Default to true if not set, to maintain backward compatibility
    const isPrayerChartEnabled = studentClass?.features?.prayerChart !== false;

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/student' },
        { icon: Layers, label: 'Activities', path: '/student/activities', hasNotification: hasPendingActivities },
        { icon: FileText, label: 'Online Exams', path: '/student/exams' },
        { icon: FileText, label: 'Report Card', path: '/student/results' },
        { icon: Calendar, label: 'Leave Applications', path: '/student/leave' },
        { icon: MessageSquare, label: 'Chat with Mentor', path: '/student/chat' },
        { icon: BookOpen, label: 'Prayer Chart', path: '/student/prayer-chart', hidden: !isPrayerChartEnabled },
        { icon: History, label: 'Class History', path: '/student/history' },
        { icon: Trophy, label: 'Leaderboard', path: '/student/leaderboard' },
        { icon: Star, label: 'Star of the Month', path: '/student/star-student' },
        { icon: Info, label: 'Help', path: '/student/help' },
    ].filter(item => !item.hidden);

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
                                hasNotification={item.hasNotification}
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
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-900">Student Portal</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
                        <LayoutDashboard className="w-6 h-6" />
                    </button>
                </div>

                <Routes>
                    <Route path="/" element={
                        // ... Dashboard ...
                        <div className="space-y-8 max-w-5xl mx-auto">
                            {/* Welcome Section */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-3xl font-bold mb-2">Welcome back, {currentUser.name}!</h2>
                                    <p className="text-indigo-100 text-lg">You are doing great! Keep up the good work.</p>
                                </div>
                                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-12 -translate-y-8">
                                    <Trophy className="w-48 h-48" />
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-green-50 rounded-full text-green-600">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">Overall</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-1">85%</h3>
                                    <p className="text-sm text-gray-500 font-medium">Attendance Rate</p>
                                </Card>

                                <Card className="p-6 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-1">2</h3>
                                    <p className="text-sm text-gray-500 font-medium">Pending Exams</p>
                                </Card>

                                <Card className="p-6 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                                            <Trophy className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Rank</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-1">Top 10%</h3>
                                    <p className="text-sm text-gray-500 font-medium">Class Performance</p>
                                </Card>
                            </div>

                            {/* Recent Activity / Chart - Simplified for now */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card className="p-6">
                                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                        Attendance Overview
                                    </h3>
                                    <div className="h-64 flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Present', value: 85 },
                                                        { name: 'Absent', value: 15 }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {[{ name: 'Present', value: 85 }, { name: 'Absent', value: 15 }].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-center gap-6 mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span className="text-sm text-gray-600">Present (85%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                            <span className="text-sm text-gray-600">Absent (15%)</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 bg-indigo-50 border-indigo-100">
                                    <h3 className="font-bold text-indigo-900 mb-4">Quick Actions</h3>
                                    <div className="space-y-3">
                                        <Button
                                            variant="primary"
                                            className="w-full justify-start gap-3 bg-white text-indigo-700 hover:bg-indigo-100 border-0"
                                            onClick={() => window.location.href = '/student/activities'}
                                        >
                                            <Layers className="w-4 h-4" />
                                            Complete Pending Activities
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="w-full justify-start gap-3 bg-white text-gray-700 hover:bg-gray-100 border-0"
                                            onClick={() => window.location.href = '/student/exams'}
                                        >
                                            <FileText className="w-4 h-4" />
                                            Take Pending Exams
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="w-full justify-start gap-3 bg-white text-gray-700 hover:bg-gray-100 border-0"
                                            onClick={() => window.location.href = '/student/results'}
                                        >
                                            <Trophy className="w-4 h-4" />
                                            View Report Card
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    } />
                    <Route path="/exams" element={<StudentExamView />} />
                    <Route path="/activities" element={<StudentActivities />} />
                    <Route path="/leave" element={<StudentLeave />} />
                    <Route path="/chat" element={<StudentChat />} />
                    <Route path="/prayer-chart" element={<PrayerChart />} />
                    <Route path="/history" element={<ClassHistory />} />
                    <Route path="/results" element={<StudentResultView />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/star-student" element={<StudentStarView />} />
                    <Route path="/help" element={<Help />} />
                </Routes>
            </main>
        </div>
    );
};

export default StudentDashboard;
