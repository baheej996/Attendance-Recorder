import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ClipboardCheck, BarChart2, CalendarDays, FileEdit, Info, Printer, Layers, BookOpen, Calendar, UserCheck, MessageSquare, Users } from 'lucide-react';
import { clsx } from 'clsx';
import AttendanceRecorder from './components/AttendanceRecorder';
import MentorStats from './components/MentorStats';
import QuestionBank from '../components/mentor/QuestionBank';
import MarksEntry from '../components/mentor/MarksEntry';
import PrintAttendance from '../components/mentor/PrintAttendance';
import ActivitiesManager from '../components/mentor/ActivitiesManager';
import LogBook from '../components/mentor/LogBook';
import Help from './Help';
import PrayerStats from '../components/mentor/PrayerStats';
import MentorLeaveRequests from '../components/mentor/MentorLeaveRequests';
import Batches from '../components/mentor/Batches';
import MentorSettings from '../components/mentor/MentorSettings';
import { MENTOR_NAV_ITEMS } from '../config/mentorNavItems';
import { useData } from '../contexts/DataContext';

const DashboardHome = () => (
    <div className="p-8 text-center text-gray-500">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, Mentor</h2>
        <p>Select "Record Attendance" to start your daily tasks.</p>
    </div>
);

const MentorDashboard = () => {
    const location = useLocation();
    const { logout, currentUser, leaveRequests, chatMessages } = useData();

    const pendingLeaves = (leaveRequests || []).filter(r =>
        r.status === 'Pending' && currentUser?.assignedClassIds?.includes(r.classId)
    ).length;

    const unreadChatCount = (chatMessages || []).filter(m =>
        m.receiverId === currentUser.id && !m.isRead
    ).length;

    const [navItems, setNavItems] = React.useState(MENTOR_NAV_ITEMS);

    const { mentorSettings } = useData();

    React.useEffect(() => {
        if (mentorSettings?.sidebarOrder && mentorSettings.sidebarOrder.length > 0) {
            // Sort master list based on saved ID order
            const ordered = [...MENTOR_NAV_ITEMS].sort((a, b) => {
                const idxA = mentorSettings.sidebarOrder.indexOf(a.id);
                const idxB = mentorSettings.sidebarOrder.indexOf(b.id);
                // If item not found in saved order, append at end
                const cleanIdxA = idxA === -1 ? 999 : idxA;
                const cleanIdxB = idxB === -1 ? 999 : idxB;
                return cleanIdxA - cleanIdxB;
            });
            setNavItems(ordered);
        } else {
            setNavItems(MENTOR_NAV_ITEMS);
        }
    }, [mentorSettings]);

    // Calculate badges
    const itemsWithBadges = navItems.map(item => {
        let badge = 0;
        if (item.id === 'leaves') badge = pendingLeaves;
        if (item.id === 'chat') badge = unreadChatCount;
        return { ...item, badge };
    });

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6" />
                        Mentor Panel
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {itemsWithBadges.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "flex items-center justify-between px-4 py-3 rounded-lg transition-colors font-medium",
                                    isActive
                                        ? "bg-purple-50 text-purple-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </div>
                                {item.badge > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {item.badge}
                                    </span>
                                )}
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
            <div className="flex-1 overflow-auto print:overflow-visible">
                <Routes>
                    <Route path="/" element={<DashboardHome />} />
                    <Route path="/record" element={<AttendanceRecorder />} />
                    <Route path="/leaves" element={<MentorLeaveRequests />} />
                    <Route path="/chat" element={<MentorChat />} />
                    <Route path="/activities" element={<ActivitiesManager />} />
                    <Route path="/logbook" element={<LogBook />} />
                    <Route path="/prayer-chart" element={<PrayerStats />} />
                    <Route path="/print" element={<PrintAttendance />} />
                    <Route path="/questions" element={<QuestionBank />} />
                    <Route path="/marks" element={<MarksEntry />} />
                    <Route path="/stats" element={<MentorStats />} />
                    <Route path="/batches" element={<Batches />} />
                    <Route path="/settings" element={<MentorSettings />} />
                    <Route path="/help" element={<Help />} />
                </Routes>
            </div>
        </div>
    );
};

export default MentorDashboard;
