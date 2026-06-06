import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '../ui/NotificationBell';
import { Card } from '../ui/Card';
import { 
    LayoutDashboard,
    Layers,
    Book,
    FileText,
    MessageSquare,
    Moon,
    History,
    CheckCircle,
    Trophy,
    Info,
    LogOut,
    ExternalLink,
    Zap,
    Video,
    Clock,
    Calendar,
    Star,
    BookOpen,
    User,
    Shield,
    Sparkles,
    ArrowRight,
    MessageCircle,
    Gamepad2
} from 'lucide-react';
import { clsx } from 'clsx';

const StudentWelcome = () => {
    const { currentUser, classes, mentors, liveClasses, substitutionRequests, studentFeatureFlags, classFeatureFlags, activities, activitySubmissions, exams, results, unreadChats, requireFeature } = useData();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000); // 10s is enough for dash refresh
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const cleanupResults = requireFeature('results');
        const cleanupActivities = requireFeature('activities');
        return () => {
            cleanupResults();
            cleanupActivities();
        };
    }, [requireFeature]);

    if (!currentUser) return null;

    // --- Dynamic Data ---
    const studentClass = classes.find(c => c.id === currentUser.classId);
    const assignedMentor = mentors.find(m => (m.assignedClassIds || []).includes(currentUser.classId));

    // Local Formatters
    const localDayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
    const localTimeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

    // --- Time Localization & Next Class Logic ---
    const { activeLiveClass, nextClassInfo } = useMemo(() => {
        if (!classes || !currentUser?.classId) return { activeLiveClass: null, nextClassInfo: null };

        const classItem = classes.find(c => c.id === currentUser.classId);
        const config = (liveClasses || []).find(lc => lc.classId === currentUser.classId && lc.isEnabled);
        
        const effectiveTime = classItem?.startTime || config?.time;
        const effectiveDays = (classItem?.days && classItem.days.length > 0) ? classItem.days : config?.selectedDays;

        if (!effectiveTime || !effectiveDays || effectiveDays.length === 0) {
            return { activeLiveClass: null, nextClassInfo: null };
        }

        const now = currentTime || new Date();
        const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

        // IST Formatter components
        const istFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric', month: '2-digit', day: '2-digit',
            weekday: 'long', hour12: false
        });

        // Current IST Info
        const currentParts = istFormatter.formatToParts(now);
        const cp = {};
        currentParts.forEach(p => cp[p.type] = p.value);
        
        let active = null;
        let next = null;

        // Search next 7 days for classes
        for (let i = 0; i < 7; i++) {
            const checkTime = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            const checkParts = istFormatter.formatToParts(checkTime);
            const sp = {};
            checkParts.forEach(p => sp[p.type] = p.value);
            
            const checkDayName = sp.weekday;
            
            // Normalize day matches (case-insensitive)
            const isDayMatch = effectiveDays.some(d => d.toLowerCase() === checkDayName.toLowerCase());
            
            if (isDayMatch) {
                // Construct the absolute start time in IST for this check day
                const classStartIST = new Date(`${sp.year}-${sp.month}-${sp.day}T${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00+05:30`);
                
                // Activation Window: 2 hrs before to 4 hrs after
                const winStart = new Date(classStartIST.getTime() - 2 * 60 * 60 * 1000);
                const winEnd = new Date(classStartIST.getTime() + 4 * 60 * 60 * 1000);

                if (now >= winStart && now <= winEnd && config?.link) {
                    active = config;
                }

                // If this is the first class found that isn't finished, it's our "Next"
                if (!next) {
                    if (now <= winEnd) {
                        next = { istDate: classStartIST, isToday: i === 0 };
                    }
                }
                
                if (active && next) break;
            }
        }

        if (active) {
            const todayStr = `${cp.year}-${cp.month}-${cp.day}`;
            const activeSubstitution = (substitutionRequests || []).find(req => 
                req.classId === currentUser?.classId &&
                req.status === 'Accepted' &&
                req.date === todayStr &&
                req.substituteLiveLink
            );
            if (activeSubstitution) {
                active = { ...active, link: activeSubstitution.substituteLiveLink };
            }
        }

        return { activeLiveClass: active, nextClassInfo: next };
    }, [liveClasses, currentUser?.classId, currentTime, substitutionRequests]);

    // --- Feature Flags for Mobile Grid ---
    const globalFlags = studentFeatureFlags || {};
    const classFlags = classFeatureFlags?.find(f => f.classId === currentUser.classId) || {};
    const assignedMentors = mentors?.filter(m => (m.assignedClassIds || []).includes(currentUser.classId)) || [];

    const isFeatureEnabled = (key) => {
        // Bypass feature flags on localhost for local testing
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;

        const isGloballyEnabled = globalFlags[key] !== false;
        let isMentorEnabled = true;
        for (const mentor of assignedMentors) {
            const mentorFlags = classFeatureFlags?.find(f => f.classId === `mentor_${mentor.id}`) || {};
            if (mentorFlags[key] === false) {isMentorEnabled = false; break;}
        }
        const isLocallyEnabled = classFlags[key] !== false;
        return isGloballyEnabled && isMentorEnabled && isLocallyEnabled;
    };

    const hasPendingActivities = (activities || []).filter(a =>
        a.classId === currentUser.classId &&
        a.status === 'Active' &&
        !(activitySubmissions || []).some(s => s.activityId === a.id && s.studentId === currentUser.id && s.status === 'Completed')
    ).length;

    const pendingExamsCount = (exams || []).filter(e =>
        e.classId === currentUser.classId &&
        e.status === 'Published' &&
        !(results || []).some(r => r.examId === e.id && r.studentId === currentUser.id)
    ).length;

    const unreadChatCount = (unreadChats || []).length;
    
    const unreadNotificationsList = (useData().notifications || []).filter(n => {
        return (n.audience === 'all' || n.audience === 'students' || (n.audience === 'specific_class' && n.classId === currentUser.classId) || (n.audience === 'specific_student' && n.targetId === currentUser.id)) && !(n.readBy || []).includes(currentUser.id);
    });
    const unreadAttendanceCount = unreadNotificationsList.filter(n => n.type === 'attendance').length;
    const unreadLeaveCount = unreadNotificationsList.filter(n => n.type === 'leave').length;
    const unreadStarCount = unreadNotificationsList.filter(n => n.type === 'star').length;

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/student/overview', key: 'overview', color: 'bg-indigo-500' },
        { icon: Layers, label: 'Activities', path: '/student/activities', key: 'activities', color: 'bg-purple-500', badge: hasPendingActivities },
        { icon: Book, label: 'Subjects', path: '/student/subjects', key: 'subjects', color: 'bg-emerald-500' },
        { icon: FileText, label: 'Online Exams', path: '/student/exams', key: 'exams', color: 'bg-amber-500', badge: pendingExamsCount },
        { icon: FileText, label: 'Report Card', path: '/student/results', key: 'results', color: 'bg-rose-500' },
        { icon: Calendar, label: 'Leave', path: '/student/leave', key: 'leave', color: 'bg-orange-500', badge: unreadLeaveCount },
        { icon: MessageSquare, label: 'Chat', path: '/student/chat', key: 'chat', color: 'bg-blue-500', badge: unreadChatCount },
        { icon: BookOpen, label: 'Prayer', path: '/student/prayer-chart', key: 'prayer', color: 'bg-cyan-500' },
        { icon: BookOpen, label: 'Quran', path: '/student/quran-recitation', key: 'quran-recitation', color: 'bg-emerald-600' },
        { icon: Moon, label: 'Ramadan', path: '/student/ramadan', key: 'ramadan', color: 'bg-indigo-700' },
        { icon: History, label: 'History', path: '/student/history', key: 'history', color: 'bg-slate-500' },
        { icon: CheckCircle, label: 'Attendance', path: '/student/attendance', key: 'attendanceHistory', color: 'bg-teal-500', badge: unreadAttendanceCount },
        { icon: Trophy, label: 'Leaderboard', path: '/student/leaderboard', key: 'leaderboard', color: 'bg-yellow-500' },
        { icon: Star, label: 'Star', path: '/student/star-student', key: 'star', color: 'bg-amber-400', badge: unreadStarCount },
        { icon: Gamepad2, label: 'Learning Games', path: '/student/games', key: 'gamification', color: 'bg-indigo-600' },
        { icon: MessageCircle, label: 'Feedback', path: '/student/feedback', key: 'feedback', color: 'bg-rose-500' },
        { icon: Info, label: 'Help', path: '/student/help', key: 'help', color: 'bg-gray-500' },
    ].filter(item => isFeatureEnabled(item.key));

    return (
        <div className="min-h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] flex flex-col items-center justify-start md:justify-center relative select-none overflow-y-auto md:overflow-visible bg-white rounded-3xl p-4 md:p-12 shadow-inner">
            {/* Notification Bell - Moved to the top-right of the main welcome card */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
                <NotificationBell user={currentUser} autoPop={true} />
            </div>
            {/* --- Premium Animated Background --- */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                {/* Reverted to Previous Subtle Colors */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[100px] animate-blob delay-2000"></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-amber-100/30 rounded-full blur-[100px] animate-blob delay-4000"></div>
                <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-blue-100/30 rounded-full blur-[100px] animate-blob"></div>
            </div>

            {/* Floating Icons */}
            <div className="hidden md:block absolute top-10 left-10 text-indigo-400/40 animate-float">
                <BookOpen className="w-20 h-20" />
            </div>
            <div className="hidden md:block absolute bottom-10 right-10 text-purple-400/40 animate-float delay-1000">
                <Trophy className="w-20 h-20" />
            </div>

            {/* Main Welcome Content */}
            <div className="relative z-10 text-center flex flex-col items-center animate-welcome w-full max-w-4xl py-4 md:py-0">
                
                {/* Profile Badge - Smaller on Mobile */}
                <div className="relative mb-4 md:mb-6 flex items-center justify-center">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 p-1 animate-wiggle-fast shadow-2xl">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                            <span className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-purple-600">
                                {currentUser.name.charAt(0)}
                            </span>
                        </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-amber-400 text-white p-1.5 md:p-2 rounded-lg shadow-lg animate-bounce">
                        <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                    </div>
                </div>

                {/* Welcome Message */}
                <div className="space-y-1 md:space-y-2 mb-6 md:mb-8">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight">
                        Ahlan Wa Sahlan, <br className="md:hidden" />
                        <span className="text-indigo-600 block md:inline">{currentUser.name.split(' ')[0]}!</span>
                    </h1>
                    <p className="text-sm md:text-xl text-gray-500 font-medium opacity-80">
                        Ready to learn something amazing today?
                    </p>
                </div>

                {/* Info Cards Grid - Stacked on Mobile, horizontal on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 w-full px-2">
                    {/* Class Info */}
                    <div className="animate-float origin-center transition-transform hover:scale-105" style={{ animationDelay: '0s' }}>
                        <Card className="p-3 md:p-6 bg-white/70 backdrop-blur-xl border-indigo-100/50 shadow-xl shadow-indigo-500/10 group">
                            <div className="flex flex-row md:flex-col items-center gap-3 md:gap-3 text-left md:text-center">
                                <div className="p-2 md:p-3 bg-indigo-600 rounded-xl md:rounded-2xl text-white group-hover:animate-wiggle-fast shadow-lg shadow-indigo-600/20">
                                    <BookOpen className="w-5 h-5 md:w-8 md:h-8" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Your Class</p>
                                    <p className="text-lg md:text-2xl font-black text-gray-900 truncate">
                                        {studentClass?.name}-{studentClass?.division}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Mentor Info */}
                    <div className="animate-float origin-center transition-transform hover:scale-105" style={{ animationDelay: '1.5s' }}>
                        <Card className="p-3 md:p-6 bg-white/70 backdrop-blur-xl border-purple-100/50 shadow-xl shadow-purple-500/10 group">
                            <div className="flex flex-row md:flex-col items-center gap-3 md:gap-3 text-left md:text-center">
                                <div className="p-2 md:p-3 bg-purple-600 rounded-xl md:rounded-2xl text-white group-hover:animate-wiggle-fast shadow-lg shadow-purple-600/20">
                                    <User className="w-5 h-5 md:w-8 md:h-8" />
                                </div>
                                <div className="min-w-0 flex-1 md:w-full">
                                    <p className="text-[10px] md:text-xs font-bold text-purple-400 uppercase tracking-widest mb-0.5">Your Mentor</p>
                                    <p className="text-lg md:text-2xl font-black text-gray-900 truncate">
                                        {assignedMentor?.name || 'Assigned soon'}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Next Class Info - Timezone Aware */}
                    <div className="animate-float origin-center transition-transform hover:scale-105" style={{ animationDelay: '3s' }}>
                        <Card className="p-3 md:p-6 bg-white/70 backdrop-blur-xl border-amber-100/50 shadow-xl shadow-amber-500/10 group">
                            <div className="flex flex-row md:flex-col items-center gap-3 md:gap-3 text-left md:text-center">
                                <div className="p-2 md:p-3 bg-amber-500 rounded-xl md:rounded-2xl text-white group-hover:animate-wiggle-fast shadow-lg shadow-amber-500/20">
                                    <Clock className="w-5 h-5 md:w-8 md:h-8" />
                                </div>
                                <div className="min-w-0 flex-1 md:w-full">
                                    <p className="text-[10px] md:text-xs font-bold text-amber-500 uppercase tracking-widest mb-0.5">
                                        {nextClassInfo?.isToday ? "Next Class: Today" : "Next Class Session"}
                                    </p>
                                    {nextClassInfo ? (
                                        <>
                                            <p className="text-lg md:text-2xl font-black text-gray-900">
                                                {localTimeFormat.format(nextClassInfo.istDate)}
                                            </p>
                                            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">
                                                {localDayFormat.format(nextClassInfo.istDate)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-lg md:text-2xl font-black text-gray-400">Not Scheduled</p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Live Class Action - Compact on Mobile */}
                <div className="mt-6 md:mt-10 w-full px-4 min-h-[80px] md:min-h-[120px] flex items-center justify-center">
                    {activeLiveClass ? (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full flex flex-col items-center">
                            <a 
                                href={activeLiveClass.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group relative inline-flex items-center gap-3 md:gap-4 px-6 md:px-10 py-3 md:py-5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-base md:text-xl rounded-2xl shadow-xl shadow-red-600/20 hover:shadow-red-600/40 transition-all transform hover:-translate-y-1 active:scale-95 animate-wiggle-fast"
                            >
                                <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3">
                                    <span className="flex h-5 w-5 md:h-6 md:w-6 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-5 w-5 md:h-6 md:w-6 bg-white flex items-center justify-center">
                                            <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-600" />
                                        </span>
                                    </span>
                                </div>
                                <Video className="w-5 h-5 md:w-8 md:h-8" />
                                JOIN LIVE CLASS NOW
                                <ExternalLink className="w-4 h-4 md:w-6 md:h-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </a>
                        </div>
                    ) : (
                        <div className="p-3 md:p-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl inline-block opacity-80 backdrop-blur-sm">
                            <p className="text-gray-400 text-sm md:text-base font-medium flex items-center gap-2">
                                <Video className="w-4 h-4 md:w-5 md:h-5" />
                                No live class active right now
                            </p>
                        </div>
                    )}
                </div>

                {/* --- App-Style Navigation Grid (Mobile Only) --- */}
                <div className="md:hidden mt-8 w-full max-w-sm px-2 overflow-y-auto pb-8">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            Our Services
                        </h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-100 to-transparent ml-4 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {navItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => navigate(item.path)}
                                data-tour={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                                className="flex flex-col items-center group active:scale-95 transition-all outline-none"
                            >
                                <div className={clsx(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg group-hover:shadow-indigo-500/20 transition-all relative overflow-hidden",
                                    item.color
                                )}>
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <item.icon className="w-7 h-7" />
                                    {item.badge > 0 && (
                                        <span className="absolute top-1 right-1 min-w-[20px] h-[20px] px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black animate-in zoom-in duration-300">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 text-center leading-tight group-active:text-indigo-600">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bottom Slogan - REMOVED on mobile grid mode or moved below */}
            </div>

            {/* Bottom Slogan - Hide on mobile if grid is showing */}
            <div className="hidden md:flex absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 items-center gap-2 text-indigo-500/40 font-bold tracking-[0.2em] uppercase text-[8px] md:text-xs text-center w-full justify-center">
                <Shield className="w-3 h-3 md:w-4 md:h-4 text-indigo-500" />
                Empowering Your Learning Journey
            </div>
        </div>
    );
};

export default StudentWelcome;
