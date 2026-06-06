import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Book, BookOpen, GraduationCap, Trophy, Calendar, LogOut, FileText, LayoutDashboard, Info, Layers, History, MessageSquare, Moon, Video, Clock, ExternalLink, ArrowRight, TrendingUp, CheckCircle, Lock, AlertTriangle, Sparkles, Home, ChevronLeft, Bell } from 'lucide-react';
import { cn } from '../utils/cn';

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
import StudentGames from './student/StudentGames';
import StudentRamadan from '../components/student/StudentRamadan';
import StudentQuranRecitation from '../components/student/StudentQuranRecitation';
import StudentSubjects from '../components/student/StudentSubjects';
import AttendanceHistory from '../components/student/AttendanceHistory';
import StudentWelcome from '../components/student/StudentWelcome';
import StudentNotifications from '../components/student/StudentNotifications';
import FeedbackPortal from '../components/student/FeedbackPortal';
import StudentProfileModal from '../components/student/StudentProfileModal';

import Help from './Help';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { STUDENT_NAV_ITEMS } from '../config/studentNavItems';

const COLORS = ['#10B981', '#EF4444'];

// 1. Sidebar Component (Same style as Admin/Mentor)
const SidebarItem = ({ icon: Icon, label, path, active, onClick, hasNotification, badge, isMobile }) => (
    <Link
        to={path}
        onClick={onClick}
        data-tour={isMobile ? `mobile-sidebar-${label.toLowerCase().replace(/\s+/g, '-')}` : `sidebar-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${active
            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
        {label}
        {badge > 0 && (
            <span className="flex absolute right-4 h-5 min-w-[20px] items-center justify-center px-1.5 rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm border-2 border-white animate-in zoom-in duration-300">
                {badge}
            </span>
        )}
    </Link>
);

const StudentDashboard = () => {
    const { currentUser, logout, activities, activitySubmissions, classes, mentors, studentFeatureFlags, classFeatureFlags, attendance, exams, results, liveClasses, substitutionRequests, unreadChats, notifications, students, requireFeature } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Check if profile is incomplete
    const isProfileIncomplete = !currentUser?.fatherName || !currentUser?.motherName || !currentUser?.livingCountry || !currentUser?.livingState || !currentUser?.nativeCountry || !currentUser?.nativeState || !currentUser?.contactNo || !currentUser?.whatsappNo;

    React.useEffect(() => {
        const cleanupAttendance = requireFeature('attendance');
        const cleanupResults = requireFeature('results');
        const cleanupActivities = requireFeature('activities');
        const cleanupPrayer = requireFeature('prayer');
        return () => {
            cleanupAttendance();
            cleanupResults();
            cleanupActivities();
            cleanupPrayer();
        };
    }, [requireFeature]);


    // --- Dynamic Calculations ---

    // 1. Attendance Calculation
    const studentAttendance = (attendance || []).filter(r => r.studentId === currentUser.id);
    const totalDays = studentAttendance.length;
    const presentDays = studentAttendance.filter(r => r.status === 'Present').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const absentPercentage = totalDays > 0 ? 100 - attendancePercentage : 0; // If 0 days, 0 absent.

    // 2. Pending Exams Calculation
    const classExams = (exams || []).filter(e =>
        e.classId === currentUser.classId &&
        e.status === 'Published'
    );
    const pendingExamsCount = classExams.filter(e =>
        !(results || []).some(r => r.examId === e.id && r.studentId === currentUser.id)
    ).length;

    // 3. Performance (Average Score)
    const studentResults = (results || []).filter(r => r.studentId === currentUser.id);
    const totalMarks = studentResults.reduce((sum, r) => sum + (Number(r.marks) || 0), 0);
    const averageScore = studentResults.length > 0 ? Math.round(totalMarks / studentResults.length) : 0;

    // Pie chart Data
    const pieData = totalDays > 0
        ? [
            { name: 'Present', value: attendancePercentage },
            { name: 'Absent', value: absentPercentage }
        ]
        : [
            { name: 'No Data', value: 100 }
        ];

    const hasPendingActivities = (activities || []).filter(a =>
        a.classId === currentUser.classId &&
        a.status === 'Active' &&
        !(activitySubmissions || []).some(s => s.activityId === a.id && s.studentId === currentUser.id && s.status === 'Completed')
    ).length;

    const unreadChatCount = (unreadChats || []).length;

    const unreadNotificationsList = (notifications || []).filter(n => {
        return (n.audience === 'all' || n.audience === 'students' || (n.audience === 'specific_class' && n.classId === currentUser.classId) || (n.audience === 'specific_student' && n.targetId === currentUser.id)) && !(n.readBy || []).includes(currentUser.id);
    });
    
    const unreadNotificationCount = unreadNotificationsList.length;
    const unreadAttendanceCount = unreadNotificationsList.filter(n => n.type === 'attendance').length;
    const unreadLeaveCount = unreadNotificationsList.filter(n => n.type === 'leave').length;
    const unreadStarCount = unreadNotificationsList.filter(n => n.type === 'star').length;

    // --- Live Class check (Timezone Aware) ---
    // Get India time string: "Friday", "14:30"
    const getIndiaMoment = () => {
        const now = new Date();
        const dayFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
        return dayFormat.format(now);
    };

    const currentISTDay = getIndiaMoment();
    const classItem = (classes || []).find(c => c.id === currentUser?.classId);
    let activeLiveClass = (liveClasses || []).find(lc => lc.classId === currentUser?.classId && lc.isEnabled && lc.link);

    const effectiveTime = classItem?.startTime || activeLiveClass?.time;
    const effectiveDays = (classItem?.days && classItem.days.length > 0) ? classItem.days : activeLiveClass?.selectedDays;

    if (activeLiveClass && effectiveTime && effectiveDays && effectiveDays.some(d => d.toLowerCase() === currentISTDay.toLowerCase())) {
        // Normalize time - handle "17:00" and "05:00 PM"
        let hrs = 0, mins = 0;
        const timeStr = effectiveTime.trim().toUpperCase();
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            const [timePart, meridiem] = timeStr.split(' ');
            const [h, m] = timePart.split(':').map(Number);
            hrs = h % 12;
            if (meridiem === 'PM') hrs += 12;
            mins = m || 0;
        } else {
            const [h, m] = timeStr.split(':').map(Number);
            hrs = h;
            mins = m || 0;
        }

        const now = new Date();
        const istFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = istFormatter.formatToParts(now);
        const m = {};
        parts.forEach(p => m[p.type] = p.value);
        
        const classStartIST = new Date(`${m.year}-${m.month}-${m.day}T${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00+05:30`);
        const showStart = new Date(classStartIST.getTime() - 2 * 60 * 60 * 1000); // 2 hrs before
        const classEnd = new Date(classStartIST.getTime() + 4 * 60 * 60 * 1000); // 4 hrs after
        
        if (now < showStart || now > classEnd) {
            activeLiveClass = null; // Hide if outside window
        } else {
            // Apply Substitution Override if applicable for today
            const todayStr = `${m.year}-${m.month}-${m.day}`;
            const activeSubstitution = (substitutionRequests || []).find(req => 
                req.classId === currentUser?.classId &&
                req.status === 'Accepted' &&
                req.date === todayStr &&
                req.substituteLiveLink
            );

            if (activeSubstitution) {
                activeLiveClass = { ...activeLiveClass, link: activeSubstitution.substituteLiveLink };
            }
        }
    } else {
        activeLiveClass = null; // Hide if day doesn't match or config is incomplete
    }

    const isExamActive = (students || []).find(s => s.id === currentUser?.id)?.activeExamSession !== undefined && (students || []).find(s => s.id === currentUser?.id)?.activeExamSession !== null;

    if (!currentUser) return null;

    // Check feature flags
    const globalFlags = studentFeatureFlags || {};
    const classFlags = classFeatureFlags?.find(f => f.classId === currentUser.classId) || {};

    // Find all mentors assigned to this class
    const assignedMentors = mentors?.filter(m => (m.assignedClassIds || []).includes(currentUser.classId)) || [];

    const isFeatureEnabled = (key) => {
        // Bypass feature flags on localhost for local testing
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;

        // Admin level lock
        const isGloballyEnabled = globalFlags[key] !== false;

        // Mentor level lock (if ANY mentor disables it, it's locked)
        let isMentorEnabled = true;
        for (const mentor of assignedMentors) {
            const mentorFlags = classFeatureFlags?.find(f => f.classId === `mentor_${mentor.id}`) || {};
            if (mentorFlags[key] === false) {
                isMentorEnabled = false;
                break;
            }
        }

        // Class level lock
        const isLocallyEnabled = classFlags[key] !== false;

        return isGloballyEnabled && isMentorEnabled && isLocallyEnabled;
    };

    // Map over imported items to add dynamic badges
    const navItems = STUDENT_NAV_ITEMS.map((item) => {
        let badge = 0;
        let hasNotification = false;

        if (item.key === 'activities') {
            badge = hasPendingActivities;
            hasNotification = hasPendingActivities > 0;
        } else if (item.key === 'exams') {
            badge = pendingExamsCount;
        } else if (item.key === 'leave') {
            badge = unreadLeaveCount;
        } else if (item.key === 'chat') {
            badge = unreadChatCount;
        } else if (item.key === 'attendanceHistory') {
            badge = unreadAttendanceCount;
        } else if (item.key === 'star') {
            badge = unreadStarCount;
        } else if (item.key === 'notifications') {
            badge = unreadNotificationCount;
        }

        return { ...item, badge, hasNotification };
    }).filter((item) => !item.key || isFeatureEnabled(item.key));

    const isActive = (path) => {
        if (path === '/student' && location.pathname === '/student') return true;
        return path !== '/student' && location.pathname.startsWith(path);
    };

    // Redirect if on a disabled page
    useEffect(() => {
        const currentPath = location.pathname;

        // Special check for root /student (Welcome Page)
        if (currentPath === '/student' && !isFeatureEnabled('welcome')) {
            // Redirect to overview if enabled, else first available item
            if (isFeatureEnabled('overview')) {
                navigate('/student/overview', { replace: true });
            } else if (navItems.length > 0) {
                navigate(navItems[0].path, { replace: true });
            }
            return;
        }

        const matchedFeature = STUDENT_NAV_ITEMS.find(f => currentPath.startsWith(f.path));

        if (matchedFeature && !isFeatureEnabled(matchedFeature.key)) {
            // Redirect to welcome if enabled, else first available
            if (isFeatureEnabled('welcome')) {
                navigate('/student', { replace: true });
            } else if (isFeatureEnabled('overview')) {
                navigate('/student/overview', { replace: true });
            } else if (navItems.length > 0) {
                navigate(navItems[0].path, { replace: true });
            }
        }
    }, [location.pathname, globalFlags, classFlags, currentUser.classId, navigate, navItems]);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={cn(
                "w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-20 hidden md:flex flex-col transition-all duration-300",
                isExamActive && "opacity-0 -translate-x-full pointer-events-none"
            )}>
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <button 
                        onClick={() => setIsProfileModalOpen(true)}
                        className="w-full flex items-center gap-3 mb-8 sticky top-0 bg-white z-10 pb-4 border-b border-gray-50/50 text-left hover:bg-gray-50 transition-colors p-2 -mx-2 rounded-xl group"
                        title={isProfileIncomplete ? "Complete your profile" : "View Profile"}
                    >
                        <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-700 transition-colors relative">
                            <GraduationCap className="w-6 h-6 text-white" />
                            {isProfileIncomplete && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center bg-white rounded-full">
                                    <span className="h-2.5 w-2.5 bg-red-500 rounded-full flex shadow-sm animate-pulse"></span>
                                </span>
                            )}
                        </div>
                        <div className="overflow-hidden relative flex-1">
                            <h1 className="text-xl font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors pr-6">{currentUser.name}</h1>
                            <p className="text-xs text-gray-500">Academic Tracker</p>
                            {isProfileIncomplete && (
                                <AlertTriangle className="w-4 h-4 text-red-500 absolute top-1/2 -translate-y-1/2 right-1 animate-pulse" />
                            )}
                        </div>
                    </button>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.path}
                                icon={item.icon}
                                label={item.label}
                                path={item.path}
                                active={isActive(item.path)}
                                badge={item.badge}
                            />
                        ))}
                    </nav>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto">
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
                        onClick={() => setShowLogoutModal(true)}
                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm active:scale-95"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </aside>

            {/* Logout Confirmation Modal */}
            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={logout}
                title="Sign Out"
                message="Are you sure you want to sign out? You will need to log back in to access your dashboard."
                confirmText="Sign Out"
                isDanger={true}
            />

            {/* Content Area */}
            <main className={cn(
                "flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300",
                isExamActive ? "md:ml-0" : "md:ml-64"
            )}>
                {/* Mobile Header (App Style) */}
                <div className="md:hidden flex items-center justify-between mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2">
                        {( !isExamActive && !location.pathname.endsWith('/student') && !location.pathname.endsWith('/student/')) ? (
                            <button 
                                onClick={() => navigate('/student')} 
                                className="p-2 -ml-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 font-bold text-sm"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Back
                            </button>
                        ) : (
                            <button 
                                onClick={() => setIsProfileModalOpen(true)}
                                className="flex items-center gap-2 hover:bg-gray-50 p-1.5 -ml-1.5 rounded-lg transition-colors text-left"
                            >
                                <div className="p-2 bg-indigo-600 rounded-lg relative">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                    {isProfileIncomplete && (
                                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center bg-white rounded-full">
                                            <span className="h-2.5 w-2.5 bg-red-500 rounded-full flex shadow-sm animate-pulse"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-gray-900 truncate max-w-[120px]">{currentUser.name}</span>
                                    {isProfileIncomplete && (
                                        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                                    )}
                                </div>
                            </button>
                        )}
                    </div>
                    
                    {!isExamActive && (
                        <button 
                            onClick={() => setShowLogoutModal(true)} 
                            className="p-2.5 text-red-500 hover:bg-red-100 rounded-lg transition-all active:scale-95 border border-red-50"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>




                {/* Profile Modal */}
                <StudentProfileModal 
                    isOpen={isProfileModalOpen} 
                    onClose={() => setIsProfileModalOpen(false)} 
                    currentUser={currentUser} 
                />

                {currentUser.status === 'Active' ? (
                    <Routes>
                        <Route path="/" element={<StudentWelcome />} />
                        <Route path="/overview" element={
                            <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
                                {/* Welcome Content was here, now in StudentWelcome.jsx */}
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h2 className="text-3xl font-bold mb-2">Academic Overview</h2>
                                        <p className="text-indigo-100 text-lg">Check your progress and upcoming tasks.</p>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-12 -translate-y-8">
                                        <Trophy className="w-48 h-48" />
                                    </div>
                                </div>

                                {/* Live Class Banner */}
                                {activeLiveClass && (
                                    <div className="bg-white border-2 border-indigo-500 rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                            <Video className="w-32 h-32" />
                                        </div>
                                        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                                            <div className="p-4 bg-indigo-100 rounded-xl">
                                                <Video className="w-8 h-8 text-indigo-600 animate-pulse" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                    Live Class Today
                                                    <span className="flex h-3 w-3 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                    </span>
                                                </h3>
                                                <div className="flex items-center gap-2 text-gray-500 mt-1 font-medium">
                                                    <Clock className="w-4 h-4" />
                                                    Scheduled for {activeLiveClass.time}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative z-10 w-full md:w-auto">
                                            <a 
                                                href={activeLiveClass.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                                Join Live Class
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-green-50 rounded-full text-green-600">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <Link to="/student/attendance" className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors flex items-center gap-1">
                                                Details <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </div>
                                        <h3 className="text-3xl font-bold text-gray-900 mb-1">{attendancePercentage}%</h3>
                                        <p className="text-sm text-gray-500 font-medium">Attendance Rate</p>
                                    </Card>

                                    <Card className="p-6 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>
                                        </div>
                                        <h3 className="text-3xl font-bold text-gray-900 mb-1">{pendingExamsCount}</h3>
                                        <p className="text-sm text-gray-500 font-medium">Pending Exams</p>
                                    </Card>

                                    <Card className="p-6 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                                                <Trophy className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Avg</span>
                                        </div>
                                        <h3 className="text-3xl font-bold text-gray-900 mb-1">{averageScore > 0 ? averageScore : 'N/A'}</h3>
                                        <p className="text-sm text-gray-500 font-medium">Average Score</p>
                                    </Card>
                                </div>

                                {/* Recent Activity / Chart */}
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
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        fill="#8884d8"
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.name === 'No Data' ? '#E5E7EB' : COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex justify-center gap-6 mt-4">
                                            {totalDays > 0 ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                        <span className="text-sm text-gray-600">Present ({attendancePercentage}%)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                        <span className="text-sm text-gray-600">Absent ({absentPercentage}%)</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400">No attendance records yet</span>
                                            )}
                                        </div>
                                    </Card>

                                    <Card className="p-6 bg-indigo-50 border-indigo-100">
                                        <h3 className="font-bold text-indigo-900 mb-4">Quick Actions</h3>
                                        <div className="space-y-3">
                                            <Button
                                                variant="primary"
                                                className="w-full justify-start gap-3 bg-white text-indigo-700 hover:bg-indigo-100 border-0"
                                                onClick={() => navigate('/student/activities')}
                                            >
                                                <Layers className="w-4 h-4" />
                                                Complete Pending Activities
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="w-full justify-start gap-3 bg-white text-gray-700 hover:bg-gray-100 border-0"
                                                onClick={() => navigate('/student/exams')}
                                            >
                                                <FileText className="w-4 h-4" />
                                                Take Pending Exams
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="w-full justify-start gap-3 bg-white text-gray-700 hover:bg-gray-100 border-0"
                                                onClick={() => navigate('/student/results')}
                                            >
                                                <Trophy className="w-4 h-4" />
                                                View Report Card
                                            </Button>
                                            <Button
                                                variant="primary"
                                                className="w-full justify-start gap-3 bg-emerald-600 text-white hover:bg-emerald-700 border-0 shadow-md shadow-emerald-500/20"
                                                onClick={() => navigate('/student/quran-recitation')}
                                            >
                                                <BookOpen className="w-4 h-4" />
                                                Track Quran Recitation
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        } />
                        <Route path="/subjects" element={<StudentSubjects />} />
                        <Route path="/exams" element={<StudentExamView />} />
                        <Route path="/activities" element={<StudentActivities />} />
                        <Route path="/leave" element={<StudentLeave />} />
                        <Route path="/chat" element={<StudentChat />} />
                        <Route path="/prayer-chart" element={<PrayerChart />} />
                        <Route path="/quran-recitation" element={<StudentQuranRecitation />} />
                        <Route path="/ramadan" element={<StudentRamadan />} />
                        <Route path="/history" element={<ClassHistory />} />
                        <Route path="/attendance" element={<AttendanceHistory />} />
                        <Route path="/results" element={<StudentResultView />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/star-student" element={<StudentStarView />} />
                        <Route path="/games" element={<StudentGames />} />
                        <Route path="/notifications" element={<StudentNotifications />} />
                        <Route path="/feedback" element={<FeedbackPortal />} />
                        <Route path="/help" element={<Help />} />
                    </Routes>
                ) : (
                    <div className="h-full flex items-center justify-center p-4">
                        <Card className="max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-500 shadow-2xl border-t-8 border-t-amber-500">
                            <div className="mb-6 flex justify-center">
                                <div className={cn(
                                    "p-4 rounded-full",
                                    (currentUser.status === 'Suspended' || currentUser.status === 'Dismissed') ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    {(currentUser.status === 'Suspended' || currentUser.status === 'Dismissed') ? (
                                        <AlertTriangle className="w-12 h-12" />
                                    ) : (
                                        <Lock className="w-12 h-12" />
                                    )}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                                {currentUser.status === 'Viva pending' && "Your Viva is pending. Please contact your mentor for more details."}
                                {currentUser.status === 'Exam pending' && "Your exam is pending. Access to other features is temporarily restricted."}
                                {currentUser.status === 'Payment Pending' && "Your Payment is pending. Please clear your dues to regain full access."}
                                {(currentUser.status === 'Suspended' || currentUser.status === 'Dismissed') && "You are no longer a registered student. Please contact the administration."}
                                {![ 'Active', 'Viva pending', 'Exam pending', 'Payment Pending', 'Suspended', 'Dismissed'].includes(currentUser.status) && `Your account status is currently set to: ${currentUser.status}. Please contact administration for information.`}
                            </p>
                            <div className="pt-6 border-t border-gray-100">
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setShowLogoutModal(true)}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3"
                                >
                                    Sign Out
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
};

export default StudentDashboard;
