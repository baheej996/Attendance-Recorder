import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BookOpen, Trophy, Calendar, LogOut, FileText, LayoutDashboard, Info, Layers, History } from 'lucide-react';
import { clsx } from 'clsx';

// Import New Student Components
import StudentResultView from '../components/student/StudentResultView';
import StudentExamView from '../components/student/StudentExamView';
import Leaderboard from '../components/student/Leaderboard';
import StudentActivities from '../components/student/StudentActivities';
import PrayerChart from '../components/student/PrayerChart';
import ClassHistory from '../components/student/ClassHistory';
import StudentLeave from './StudentLeave';

// ... other imports ...

const StudentDashboard = () => {
    const { currentUser, logout, activities, activitySubmissions, classes } = useData(); // Added classes
    // ...

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/student' },
        { icon: Layers, label: 'Activities', path: '/student/activities', hasNotification: hasPendingActivities },
        { icon: FileText, label: 'Online Exams', path: '/student/exams' },
        { icon: FileText, label: 'Report Card', path: '/student/results' },
        { icon: Calendar, label: 'Leave Applications', path: '/student/leave' }, // New Item
        { icon: BookOpen, label: 'Prayer Chart', path: '/student/prayer-chart', hidden: !isPrayerChartEnabled },
        { icon: History, label: 'Class History', path: '/student/history' },
        { icon: Trophy, label: 'Leaderboard', path: '/student/leaderboard' },
        { icon: Info, label: 'Help', path: '/student/help' },
    ].filter(item => !item.hidden);

    // ...

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* ... Sidebar ... */}

            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
                {/* ... Header ... */}

                <Routes>
                    <Route path="/" element={
                        // ... Dashboard ...
                        <div className="space-y-8 max-w-5xl mx-auto">
                            {/* ... */}
                        </div>
                    } />
                    <Route path="/exams" element={<StudentExamView />} />
                    <Route path="/activities" element={<StudentActivities />} />
                    <Route path="/leave" element={<StudentLeave />} />
                    <Route path="/prayer-chart" element={<PrayerChart />} />
                    <Route path="/history" element={<ClassHistory />} />
                    <Route path="/results" element={<StudentResultView />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/help" element={<Help />} />
                </Routes>
            </main>
        </div>
    );
};

export default StudentDashboard;
