import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, BarChart2, CalendarDays, FileEdit, Info, Printer, Layers, BookOpen, Calendar, UserCheck, MessageSquare, Users, Video, ShieldCheck, ExternalLink, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../components/ui/Card';
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
import MentorChat from '../components/mentor/MentorChat';
import Batches from '../components/mentor/Batches';
import MentorSettings from '../components/mentor/MentorSettings';
import StarOfTheMonth from '../components/mentor/StarOfTheMonth';
import SpecialPrayerManager from '../components/mentor/SpecialPrayerManager';
import MentorPrayerStats from '../components/mentor/MentorPrayerStats';
import MentorRamadan from '../components/mentor/MentorRamadan';
import MentorQuranRecitation from '../components/mentor/MentorQuranRecitation';
import MentorLeaderboard from '../components/mentor/MentorLeaderboard';
import MentorSubjects from '../components/mentor/MentorSubjects';
import ClassSubstitution from '../components/mentor/ClassSubstitution';
import MentorTasks from '../components/mentor/MentorTasks';
import MentorAdmissionRequest from '../components/mentor/MentorAdmissionRequest';
import MentorNotifications from '../components/mentor/MentorNotifications';
import MentorEvaluations from '../components/mentor/MentorEvaluations';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { MENTOR_NAV_ITEMS } from '../config/mentorNavItems';
import { useData } from '../contexts/DataContext';

const DashboardHome = () => {
    const { currentUser, classes, students, liveClasses } = useData();
    const navigate = useNavigate();
    
    const assignedClasses = (classes || []).filter(c => 
        currentUser?.assignedClassIds?.includes(c.id)
    );

    const totalStudentsUnderMentor = (students || []).filter(s => 
        currentUser?.assignedClassIds?.includes(s.classId)
    ).length;

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 md:p-6 text-center overflow-hidden relative select-none">
            {/* Massive Islamic Loop Animation Background */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-40">
                <div className="relative w-full h-full max-w-[800px] animate-slow-spin">
                    {/* CSS Crescent Moon */}
                    <div className="absolute top-10 right-10 w-32 h-32 rounded-full shadow-[20px_20px_0_0_rgba(79,70,229,0.1)] -rotate-45"></div>
                    <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full shadow-[15px_15px_0_0_rgba(147,51,234,0.1)] rotate-12"></div>
                    {/* Octagonal Islamic Pattern (Abstract) */}
                    <div className="absolute inset-0 border-[40px] border-indigo-50/50 rounded-[40%] animate-pulse"></div>
                    <div className="absolute inset-20 border-[20px] border-purple-50/50 rounded-[30%] animate-pulse delay-700"></div>
                </div>
            </div>

            {/* Central Vector Graphic: Islamic Online Class Concept */}
            <div className="relative mb-6 animate-float flex flex-col items-center scale-75 sm:scale-90 md:scale-100 origin-bottom">
                
                {/* Vector Stats: Left Side (Class Count) */}
                <div className="absolute -left-20 sm:-left-40 top-1/2 -translate-y-1/2 flex flex-col items-center animate-wiggle">
                    <div className="w-16 h-16 sm:w-28 sm:h-28 bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-indigo-50 flex flex-col items-center justify-center p-2 sm:p-4">
                        <Layers className="w-5 h-5 sm:w-8 sm:h-8 text-purple-600 mb-1 sm:mb-2" />
                        <span className="text-lg sm:text-3xl font-black text-gray-900 leading-none">{assignedClasses.length}</span>
                        <span className="text-[7px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Classes</span>
                    </div>
                </div>

                {/* Vector Stats: Right Side (Student Count) */}
                <div className="absolute -right-20 sm:-right-40 top-1/2 -translate-y-1/2 flex flex-col items-center animate-wiggle delay-500">
                    <div className="w-16 h-16 sm:w-28 sm:h-28 bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-indigo-50 flex flex-col items-center justify-center p-2 sm:p-4">
                        <Users className="w-5 h-5 sm:w-8 sm:h-8 text-indigo-600 mb-1 sm:mb-2" />
                        <span className="text-lg sm:text-3xl font-black text-gray-900 leading-none">{totalStudentsUnderMentor}</span>
                        <span className="text-[7px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Students</span>
                    </div>
                </div>

                {/* stylized Laptop/Screen */}
                <div className="w-56 h-36 bg-indigo-600 rounded-2xl border-4 border-indigo-900 shadow-2xl relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-4 bg-indigo-800 opacity-50"></div>
                    {/* Glowing Book (Graphic) */}
                    <div className="relative z-10 text-white flex flex-col items-center gap-2">
                        <div className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                            <BookOpen className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                        </div>
                        <div className="flex gap-1 mt-1">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
                        </div>
                    </div>
                    {/* Animated Circuit lines (Online element) */}
                    <div className="absolute inset-0 opacity-10">
                        <svg width="100%" height="100%">
                            <path d="M0 20 H100 M0 50 H100 M0 80 H100" stroke="white" strokeWidth="0.5" strokeDasharray="5,5" className="animate-[dash-move_2s_linear_infinite]" />
                            <path d="M20 0 V100 M50 0 V100 M80 0 V100" stroke="white" strokeWidth="0.5" strokeDasharray="5,5" className="animate-[dash-move_3s_linear_infinite]" />
                        </svg>
                    </div>
                </div>
                {/* Stand / Bottom part */}
                <div className="w-48 h-10 bg-indigo-950/90 rounded-b-xl shadow-lg relative -mt-1 -z-10"></div>
            </div>

            {/* Welcome Text */}
            <div className="animate-welcome opacity-0 [animation-fill-mode:forwards]">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-1 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 tracking-tight leading-tight">
                    Ahlan wa Sahlan,<br /> {currentUser?.name || 'Mentor'}
                </h2>
                <div className="flex items-center justify-center gap-2 text-gray-400 font-bold mb-1">
                    <div className="h-[1px] w-4 bg-indigo-100 rounded-full"></div>
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Educational Dashboard</span>
                    <div className="h-[1px] w-4 bg-indigo-100 rounded-full"></div>
                </div>
                <p className="text-gray-500 max-w-xs sm:max-w-md mx-auto font-medium text-xs sm:text-sm leading-snug px-4">
                    Guidance is a light. Noble mission today.
                </p>
            </div>

            {/* Compact Class Bubbles Container */}
            <div className="mt-4 sm:mt-8 w-full max-w-5xl px-2 sm:px-4 relative">
                {assignedClasses.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                        {assignedClasses.slice(0, 10).map((cls, idx) => {
                            const liveConfig = liveClasses?.find(l => l.classId === cls.id && l.isEnabled && l.link);
                            return (
                            <div 
                                key={cls.id}
                                className={clsx(
                                    "group bg-white p-2 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] border border-indigo-50 shadow-md sm:shadow-lg transition-all flex flex-col items-center justify-center animate-wiggle cursor-pointer hover:scale-105 active:scale-95 border-b-2 border-indigo-100 relative min-w-[30%] sm:min-w-[0] lg:w-[18%]",
                                    idx % 2 === 0 ? "lg:mt-3" : "lg:-mt-3"
                                )}
                                style={{ 
                                    animationDelay: `${idx * 0.3}s`,
                                    animationDuration: `${3.5 + (idx % 2)}s`
                                }}
                            >
                                {liveConfig && (
                                    <a
                                        href={liveConfig.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full p-2 shadow-lg shadow-green-500/30 z-[60] animate-pulse hover:animate-none hover:scale-110 transition-transform flex items-center justify-center"
                                        title="Start Live Class Instantly"
                                    >
                                        <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </a>
                                )}
                                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-indigo-600 mb-1.5 sm:mb-3 group-hover:rotate-12 group-hover:scale-110 transition-all shadow-sm">
                                    <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                </div>
                                <div className="space-y-0.5 max-w-full overflow-hidden text-center">
                                    <span className="block text-sm sm:text-xl font-bold text-gray-900 leading-none truncate">{cls.name}</span>
                                    <div className="inline-flex items-center px-1 sm:px-1.5 py-0.5 bg-indigo-600 text-white rounded font-bold text-[6px] sm:text-[8px] tracking-widest uppercase">
                                        Div {cls.division}
                                    </div>
                                </div>

                                {/* Student List Hover/Touch Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-40 sm:w-48 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-indigo-50 p-3 opacity-0 group-hover:opacity-100 group-active:opacity-100 pointer-events-none transition-all duration-300 z-50 origin-bottom group-hover:animate-[tooltip-up_0.3s_ease-out_forwards] group-active:animate-[tooltip-up_0.3s_ease-out_forwards]">
                                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 border-b border-indigo-50 pb-1">
                                        Students ({students.filter(s => s.classId === cls.id).length})
                                    </h5>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        {students.filter(s => s.classId === cls.id).length > 0 ? (
                                            students.filter(s => s.classId === cls.id).map((student, sIdx) => (
                                                <div 
                                                    key={student.id} 
                                                    className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5 animate-[list-wiggle_0.4s_ease-in-out_infinite] px-1 hover:bg-indigo-50 rounded"
                                                    style={{ animationDelay: `${sIdx * 0.1}s` }}
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                                    <span className="truncate">{student.name}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[9px] text-gray-400 italic">No students allotted</p>
                                        )}
                                    </div>
                                    {/* Tooltip Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/95"></div>
                                </div>
                                
                                {/* Hover Indicator */}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 group-hover:w-8 transition-all duration-300"></div>
                            </div>
                        )})}
                    </div>
                ) : (
                    <div className="p-12 bg-white/40 backdrop-blur rounded-[3rem] border-2 border-dashed border-indigo-100 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Layers className="w-8 h-8" />
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No classes currently assigned</p>
                    </div>
                )}
            </div>

            {/* Quick Access Grid - NEW */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <Card 
                    onClick={() => navigate('/mentor/quran-recitation')}
                    className="p-4 flex items-center gap-4 bg-white/60 backdrop-blur-sm border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer transition-all group"
                >
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:rotate-12 transition-transform">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-gray-900">Quran Recitation</h4>
                        <p className="text-xs text-gray-500">Mark daily recitation stats</p>
                    </div>
                </Card>
                <Card 
                    onClick={() => navigate('/mentor/prayer-chart')}
                    className="p-4 flex items-center gap-4 bg-white/60 backdrop-blur-sm border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer transition-all group"
                >
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl group-hover:rotate-12 transition-transform">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-gray-900">Prayer Chart</h4>
                        <p className="text-xs text-gray-500">Track daily prayer habits</p>
                    </div>
                </Card>
                <Card 
                    onClick={() => navigate('/mentor/leaderboard')}
                    className="p-4 flex items-center gap-4 bg-white/60 backdrop-blur-sm border-amber-100 hover:border-amber-500 hover:bg-amber-50/50 cursor-pointer transition-all group"
                >
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:rotate-12 transition-transform">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-gray-900">Leaderboard</h4>
                        <p className="text-xs text-gray-500">View performance rankings</p>
                    </div>
                </Card>
            </div>

            {/* Background Decorative Elements - Static Blurs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-200/20 rounded-full blur-[100px] -z-10 animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-[100px] -z-10 animate-pulse delay-700"></div>
        </div>
    );
};

const MentorDashboard = () => {
    const location = useLocation();
    const { logout, currentUser, leaveRequests, unreadChats, stopImpersonating, classes, notifications, mentorSettings, mentorTasks, substitutionRequests, evaluationForms, evaluationSubmissions, mentorFeatureFlags } = useData();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);

    const handleReturn = () => {
        const role = currentUser?.originalUser?.role;
        stopImpersonating();
        if (role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/mentor';
        }
    };

    const pendingLeaves = (leaveRequests || []).filter(r =>
        r.status === 'Pending' && currentUser?.assignedClassIds?.includes(r.classId)
    ).length;

    const unreadChatCount = (unreadChats || []).length;
    

    const pendingTasksCount = (mentorTasks || []).filter(task => 
        (task.assignedTo?.includes('all') || task.assignedTo?.includes(currentUser.id)) && 
        !task.submissions?.[currentUser.id]?.completed
    ).length;

    const incomingSubReqsCount = (substitutionRequests || []).filter(req => 
        req.substituteMentorId === currentUser.id && 
        req.status === 'Pending Substitute Approval'
    ).length;

    const mentorClasses = classes.filter(c => (currentUser?.assignedClassIds || []).includes(c.id));
    const unreadNotificationsCount = (notifications || []).filter(n => {
        const isTarget = n.audience === 'all' || n.audience === 'mentors' || 
                        (n.audience === 'specific_class' && mentorClasses.some(c => c.id === n.classId)) ||
                        (n.audience === 'specific_mentor' && n.targetId === currentUser.id);
        return isTarget && n.senderId !== currentUser.id && !(n.readBy || []).includes(currentUser.id);
    }).length;

    const pendingEvaluationsCount = (evaluationForms || []).filter(f => 
        f.status === 'Published' && 
        !(evaluationSubmissions || []).some(s => s.formId === f.id && s.mentorId === currentUser?.id)
    ).length;

    const [navItems, setNavItems] = React.useState(MENTOR_NAV_ITEMS);

    React.useEffect(() => {
        // Filter globally enabled features first
        let baseItems = MENTOR_NAV_ITEMS.filter(item => {
            if (!mentorFeatureFlags) return true; // Default to true if flags aren't loaded 
            return mentorFeatureFlags[item.id] !== false; // Only hide if explicitly false
        });

        if (currentUser?.isImpersonating) {
            // If the impersonator is another MENTOR, restrict to Attendance ONLY
            if (currentUser.originalUser?.role === 'mentor') {
                baseItems = baseItems.filter(item => item.id === 'attendance');
            } else {
                 // If ADMIN, restrict only Substitution (as before)
                 baseItems = baseItems.filter(item => item.id !== 'substitution');
            }
        }

        if (mentorSettings?.sidebarOrder && mentorSettings.sidebarOrder.length > 0) {
            // Sort master list based on saved ID order
            const ordered = [...baseItems].sort((a, b) => {
                const idxA = mentorSettings.sidebarOrder.indexOf(a.id);
                const idxB = mentorSettings.sidebarOrder.indexOf(b.id);
                // If item not found in saved order, put it at a high priority (start)
                const cleanIdxA = idxA === -1 ? -0.5 : idxA;
                const cleanIdxB = idxB === -1 ? -0.5 : idxB;
                return cleanIdxA - cleanIdxB;
            });
            setNavItems(ordered);
        } else {
            setNavItems(baseItems);
        }
    }, [mentorSettings, currentUser?.isImpersonating, mentorFeatureFlags]);

    // Calculate badges
    const itemsWithBadges = navItems.map(item => {
        let badge = 0;
        if (item.id === 'leaves') badge = pendingLeaves;
        if (item.id === 'chat') badge = unreadChatCount;
        if (item.id === 'tasks') badge = pendingTasksCount;
        if (item.id === 'substitution') badge = incomingSubReqsCount;
        if (item.id === 'notifications') badge = unreadNotificationsCount;
        if (item.id === 'evaluations') badge = pendingEvaluationsCount;
        return { ...item, badge };
    });

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar (Desktop) */}
            <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col print:hidden">
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
                                data-tour={`sidebar-${item.id}`}
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
                                    <span className="flex h-5 min-w-[20px] items-center justify-center px-1.5 rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm border-2 border-white animate-in zoom-in duration-300">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="block w-full px-4 py-2 text-sm text-center text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={logout}
                title="Sign Out"
                message="Are you sure you want to sign out? Any unsaved changes may be lost."
                confirmText="Sign Out"
                isDanger={true}
            />

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="relative bg-white w-64 h-full shadow-xl flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h1 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                                <CalendarDays className="w-6 h-6" />
                                Mentor Panel
                            </h1>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full">
                                <Users className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {itemsWithBadges.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        data-tour={`mobile-sidebar-${item.id}`}
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
                                onClick={() => setShowLogoutModal(true)}
                                className="block w-full px-4 py-2 text-sm text-center text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-auto print:overflow-visible flex flex-col h-full">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-purple-600" />
                        <span className="font-bold text-gray-900">Mentor Panel</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
                        <Layers className="w-6 h-6" />
                    </button>
                </div>
                
                {currentUser?.isImpersonating && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 flex items-center justify-between text-white shrink-0 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Impersonating: {currentUser.name}
                            </span>
                        </div>
                        <button 
                            onClick={handleReturn}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/30"
                        >
                            {currentUser?.originalUser?.role === 'admin' ? 'Return to Admin Panel' : 'Return to My Account'}
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {/* Route Guard for Mentor-to-Mentor Impersonation */}
                    {currentUser?.isImpersonating && currentUser?.originalUser?.role === 'mentor' && location.pathname !== '/mentor' && location.pathname !== '/mentor/' && !location.pathname.startsWith('/mentor/record') ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 min-h-[400px]">
                            <div className="text-5xl mb-4">⛔</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                            <p className="text-gray-500 max-w-md">
                                As a substitute mentor, you are only authorized to **Record Attendance** for this class.
                            </p>
                            <Link to="/mentor/record" className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-sm hover:bg-indigo-700 transition-all">
                                Go to Record Attendance
                            </Link>
                        </div>
                    ) : (
                        <Routes>
                        <Route path="/" element={<DashboardHome />} />
                        <Route path="/record" element={<AttendanceRecorder />} />
                        <Route path="/tasks" element={<MentorTasks />} />
                        <Route path="/evaluations" element={<MentorEvaluations />} />
                        <Route path="/leaves" element={<MentorLeaveRequests />} />
                        <Route path="/chat" element={<MentorChat />} />
                        <Route path="/activities" element={<ActivitiesManager />} />
                        <Route path="/quran-recitation" element={<MentorQuranRecitation />} />
                        <Route path="/logbook" element={<LogBook />} />
                        <Route path="/subjects" element={<MentorSubjects />} />
                        <Route path="/prayer-chart" element={<PrayerStats />} />
                        <Route path="/ramadan" element={<MentorRamadan />} />
                        <Route path="/notifications" element={<MentorNotifications />} />
                        <Route path="/admissions" element={<MentorAdmissionRequest />} />
                        <Route path="/print" element={<PrintAttendance />} />
                        <Route path="/questions" element={<QuestionBank />} />
                        <Route path="/marks" element={<MarksEntry />} />
                        <Route path="/stats" element={<MentorStats />} />
                        <Route path="/leaderboard" element={<MentorLeaderboard />} />
                        <Route path="/star-student" element={<StarOfTheMonth />} />
                        <Route path="/batches" element={<Batches />} />
                        <Route path="/substitution" element={
                            currentUser?.isImpersonating ? (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 min-h-[400px]">
                                    <div className="text-5xl mb-4">⛔</div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                                    <p className="text-gray-500 max-w-md">
                                        For security reasons, you cannot access or manage substitution requests while impersonating another mentor's account.
                                    </p>
                                </div>
                            ) : (
                                <ClassSubstitution />
                            )
                        } />
                        <Route path="/settings" element={<MentorSettings />} />
                        <Route path="/help" element={<Help />} />
                    </Routes>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;
