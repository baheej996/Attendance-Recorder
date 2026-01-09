import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ClipboardCheck, BarChart2, CalendarDays, FileEdit } from 'lucide-react';
import { clsx } from 'clsx';
import AttendanceRecorder from './components/AttendanceRecorder';
import MentorStats from './components/MentorStats';
import MarksEntry from '../components/mentor/MarksEntry';
import { useData } from '../contexts/DataContext';

const DashboardHome = () => (
    <div className="p-8 text-center text-gray-500">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, Mentor</h2>
        <p>Select "Record Attendance" to start your daily tasks.</p>
    </div>
);

const MentorDashboard = () => {
    const location = useLocation();
    const { logout } = useData();

    const navItems = [
        { icon: ClipboardCheck, label: 'Record Attendance', path: '/mentor/record' },
        { icon: FileEdit, label: 'Enter Exam Marks', path: '/mentor/marks' },
        { icon: BarChart2, label: 'Statistics & History', path: '/mentor/stats' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6" />
                        Mentor Panel
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                                    isActive
                                        ? "bg-purple-50 text-purple-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="block w-full px-4 py-2 text-sm text-center text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <Routes>
                    <Route path="/" element={<DashboardHome />} />
                    <Route path="/record" element={<AttendanceRecorder />} />
                    <Route path="/marks" element={<MarksEntry />} />
                    <Route path="/stats" element={<MentorStats />} />
                </Routes>
            </div>
        </div>
    );
};

export default MentorDashboard;
