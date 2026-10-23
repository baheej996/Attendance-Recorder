import React from 'react';
import InstitutionDirectory from '../components/mentor/InstitutionDirectory';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    ClipboardCheck, BarChart2, CalendarDays, FileEdit, Info, Printer, Layers, 
    BookOpen, Calendar, UserCheck, MessageSquare, Users, Video, ShieldCheck, 
    ExternalLink, Trophy, Search, X, Bell, Repeat, ClipboardList, FileBarChart, 
    AlertTriangle, CheckCircle, ChevronRight, Sparkles 
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
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
import MentorGamesView from './mentor/MentorGamesView';
import SpecialPrayerManager from '../components/mentor/SpecialPrayerManager';
import MentorPrayerStats from '../components/mentor/MentorPrayerStats';
import MentorRamadan from '../components/mentor/MentorRamadan';
import MentorQuranRecitation from '../components/mentor/MentorQuranRecitation';
import MentorSunnahCampaign from '../components/mentor/MentorSunnahCampaign';
import MentorLeaderboard from '../components/mentor/MentorLeaderboard';
import MentorSubjects from '../components/mentor/MentorSubjects';
import ClassSubstitution from '../components/mentor/ClassSubstitution';
import MentorTasks from '../components/mentor/MentorTasks';
import MentorAdmissionRequest from '../components/mentor/MentorAdmissionRequest';
import MentorNotifications from '../components/mentor/MentorNotifications';
import MentorEvaluations from '../components/mentor/MentorEvaluations';
import StudentAssessment from '../components/mentor/StudentAssessment';
import MentorClassEssentials from '../components/mentor/MentorClassEssentials';
import MentorProfile from '../components/mentor/MentorProfile';
import ExamQuestionTracker from '../components/common/ExamQuestionTracker';
import AttendanceAnomalies from '../components/mentor/AttendanceAnomalies';
import ErrorBoundary from '../components/ErrorBoundary';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { MENTOR_NAV_ITEMS } from '../config/mentorNavItems';
import { useData } from '../contexts/DataContext';

const DashboardHome = () => {
    const { currentUser, classes, students, liveClasses } = useData();
    const navigate = useNavigate();
    
    const assignedClasses = (classes || []).filter(c => 
        currentUser?.assignedClassIds?.includes(c.id)
    );

    const activeStudents = React.useMemo(() => (students || []).filter(s => s.status === 'Active'), [students]);

    const totalStudentsUnderMentor = activeStudents.filter(s => 
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
                                        Students ({activeStudents.filter(s => s.classId === cls.id).length})
                                    </h5>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        {activeStudents.filter(s => s.classId === cls.id).length > 0 ? (
                                            activeStudents.filter(s => s.classId === cls.id).map((student, sIdx) => (
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
                    onClick={() => navigate('/mentor/activities')}
                    className="p-4 flex items-center gap-4 bg-white/60 backdrop-blur-sm border-amber-100 hover:border-amber-500 hover:bg-amber-50/50 cursor-pointer transition-all group"
                >
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:rotate-12 transition-transform">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-gray-900">Activity Manager</h4>
                        <p className="text-xs text-gray-500">Manage student activities</p>
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
    const { 
        logout, currentUser, attendance, leaveRequests, unreadChats, stopImpersonating, 
        classes, students, notifications, mentorSettings, mentorTasks, substitutionRequests, 
        evaluationForms, evaluationSubmissions, mentorFeatureFlags, requireFeature, questionSuggestions 
    } = useData();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);
    const [sidebarSearchQuery, setSidebarSearchQuery] = React.useState('');
    const [isUpdatesHubOpen, setIsUpdatesHubOpen] = React.useState(false);
    const desktopUpdatesHubRef = React.useRef(null);
    const mobileUpdatesHubRef = React.useRef(null);

    // Click outside to close updates hub popover
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            const inDesktop = desktopUpdatesHubRef.current && desktopUpdatesHubRef.current.contains(event.target);
            const inMobile = mobileUpdatesHubRef.current && mobileUpdatesHubRef.current.contains(event.target);
            if (!inDesktop && !inMobile) {
                setIsUpdatesHubOpen(false);
            }
        };
        if (isUpdatesHubOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUpdatesHubOpen]);

    const handleReturn = () => {
        const role = currentUser?.originalUser?.role;
        stopImpersonating();
        if (role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/mentor';
        }
    };

    React.useEffect(() => {
        return requireFeature('leave');
    }, [requireFeature]);

    // Assigned Class IDs
    const mentorAssignedClassIds = React.useMemo(() => {
        const ids = currentUser?.assignedClassIds || (currentUser?.classId ? [currentUser.classId] : []);
        return Array.isArray(ids) ? ids : [];
    }, [currentUser]);

    // 1. Leave Requests
    const pendingLeaves = React.useMemo(() => {
        return (leaveRequests || []).filter(r =>
            r.status === 'Pending' && mentorAssignedClassIds.includes(r.classId)
        ).length;
    }, [leaveRequests, mentorAssignedClassIds]);

    // 2. Class Substitution (incoming requests waiting for this mentor's approval)
    const incomingSubReqsCount = React.useMemo(() => {
        return (substitutionRequests || []).filter(req => 
            (req.substituteId === currentUser?.id || req.substituteMentorId === currentUser?.id) && 
            req.status === 'Pending Substitute Approval'
        ).length;
    }, [substitutionRequests, currentUser?.id]);

    // 3. Unread Chats
    const unreadChatCount = (unreadChats || []).length;

    // 4. Tasks
    const pendingTasksCount = React.useMemo(() => {
        return (mentorTasks || []).filter(task => 
            (task.assignedTo?.includes('all') || task.assignedTo?.includes(currentUser?.id)) && 
            !task.submissions?.[currentUser?.id]?.completed
        ).length;
    }, [mentorTasks, currentUser?.id]);

    // 5. Notifications
    const mentorClasses = React.useMemo(() => 
        classes.filter(c => mentorAssignedClassIds.includes(c.id)),
        [classes, mentorAssignedClassIds]
    );

    const unreadNotificationsCount = React.useMemo(() => {
        return (notifications || []).filter(n => {
            const isTarget = n.audience === 'all' || n.audience === 'mentors' || 
                            (n.audience === 'specific_class' && mentorClasses.some(c => c.id === n.classId)) ||
                            (n.audience === 'specific_mentor' && n.targetId === currentUser?.id);
            return isTarget && n.senderId !== currentUser?.id && !(n.readBy || []).includes(currentUser?.id);
        }).length;
    }, [notifications, mentorClasses, currentUser?.id]);

    // 6. Evaluations
    const pendingEvaluationsCount = React.useMemo(() => {
        return (evaluationForms || []).filter(f => 
            f.status === 'Published' && 
            !(evaluationSubmissions || []).some(s => s.formId === f.id && s.mentorId === currentUser?.id)
        ).length;
    }, [evaluationForms, evaluationSubmissions, currentUser?.id]);

    // 7. Question Bank Suggestions
    const pendingQuestionsCount = React.useMemo(() => {
        return (questionSuggestions || []).filter(s => 
            s.receiverId === currentUser?.id && s.status === 'Pending'
        ).length;
    }, [questionSuggestions, currentUser?.id]);

    // 8. Anomalies
    const anomaliesBadgeCount = React.useMemo(() => {
        let count = 0;
        const myStudents = new Set((students || []).filter(s => mentorAssignedClassIds.includes(s.classId)).map(s => s.id));
        const recentRecordsByStudent = {};
        (attendance || []).forEach(r => {
            if (myStudents.has(r.studentId) && (r.status === 'Present' || r.status === 'Absent')) {
                if (!recentRecordsByStudent[r.studentId]) recentRecordsByStudent[r.studentId] = [];
                recentRecordsByStudent[r.studentId].push(r.date);
            }
        });
        Object.values(recentRecordsByStudent).forEach(dates => {
            dates.sort();
            for (let i=0; i<dates.length-1; i++) {
                const d1 = new Date(dates[i]);
                const d2 = new Date(dates[i+1]);
                const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    count++;
                }
            }
        });
        return count;
    }, [attendance, students, mentorAssignedClassIds]);

    // Aggregated list of all active pending updates for non-scrolling quick notifications
    const pendingUpdatesList = React.useMemo(() => {
        const list = [];
        if (pendingLeaves > 0) {
            list.push({
                id: 'leaves',
                title: 'Leave Requests',
                count: pendingLeaves,
                path: '/mentor/leaves',
                icon: UserCheck,
                color: 'text-amber-700 bg-amber-50 border-amber-200',
                desc: `${pendingLeaves} student leave request${pendingLeaves > 1 ? 's' : ''} awaiting review`
            });
        }
        if (incomingSubReqsCount > 0) {
            list.push({
                id: 'substitution',
                title: 'Class Substitution',
                count: incomingSubReqsCount,
                path: '/mentor/substitution',
                icon: Repeat,
                color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
                desc: `${incomingSubReqsCount} substitution request${incomingSubReqsCount > 1 ? 's' : ''} pending your response`
            });
        }
        if (pendingTasksCount > 0) {
            list.push({
                id: 'tasks',
                title: 'Professional Tasks',
                count: pendingTasksCount,
                path: '/mentor/tasks',
                icon: ClipboardList,
                color: 'text-purple-700 bg-purple-50 border-purple-200',
                desc: `${pendingTasksCount} professional task${pendingTasksCount > 1 ? 's' : ''} pending completion`
            });
        }
        if (unreadChatCount > 0) {
            list.push({
                id: 'chat',
                title: 'Chat Messages',
                count: unreadChatCount,
                path: '/mentor/chat',
                icon: MessageSquare,
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                desc: `${unreadChatCount} unread message${unreadChatCount > 1 ? 's' : ''}`
            });
        }
        if (pendingEvaluationsCount > 0) {
            list.push({
                id: 'evaluations',
                title: 'Self-Evaluation',
                count: pendingEvaluationsCount,
                path: '/mentor/evaluations',
                icon: FileBarChart,
                color: 'text-blue-700 bg-blue-50 border-blue-200',
                desc: `${pendingEvaluationsCount} self-evaluation form${pendingEvaluationsCount > 1 ? 's' : ''} to fill`
            });
        }
        if (pendingQuestionsCount > 0) {
            list.push({
                id: 'questions',
                title: 'Question Bank',
                count: pendingQuestionsCount,
                path: '/mentor/questions',
                icon: FileEdit,
                color: 'text-rose-700 bg-rose-50 border-rose-200',
                desc: `${pendingQuestionsCount} question suggestion${pendingQuestionsCount > 1 ? 's' : ''} to review`
            });
        }
        if (unreadNotificationsCount > 0) {
            list.push({
                id: 'notifications',
                title: 'Notifications',
                count: unreadNotificationsCount,
                path: '/mentor/notifications',
                icon: Bell,
                color: 'text-yellow-800 bg-yellow-50 border-yellow-200',
                desc: `${unreadNotificationsCount} unread notification${unreadNotificationsCount > 1 ? 's' : ''}`
            });
        }
        if (anomaliesBadgeCount > 0) {
            list.push({
                id: 'anomalies',
                title: 'Attendance Anomalies',
                count: anomaliesBadgeCount,
                path: '/mentor/anomalies',
                icon: AlertTriangle,
                color: 'text-orange-700 bg-orange-50 border-orange-200',
                desc: `${anomaliesBadgeCount} attendance anomal${anomaliesBadgeCount > 1 ? 'ies' : 'y'} detected`
            });
        }
        return list;
    }, [pendingLeaves, incomingSubReqsCount, pendingTasksCount, unreadChatCount, pendingEvaluationsCount, pendingQuestionsCount, unreadNotificationsCount, anomaliesBadgeCount]);

    const totalPendingCount = React.useMemo(() => {
        return pendingUpdatesList.reduce((sum, item) => sum + item.count, 0);
    }, [pendingUpdatesList]);

    const [navItems, setNavItems] = React.useState(MENTOR_NAV_ITEMS);

    React.useEffect(() => {
        // Filter globally enabled features first
        let baseItems = MENTOR_NAV_ITEMS.filter(item => {
            // Bypass feature flags on localhost for local testing
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
            if (!mentorFeatureFlags) return true; // Default to true if flags aren't loaded 
            return mentorFeatureFlags[item.id] !== false; // Only hide if explicitly false
        });

        // Filter Exam Coordinator specific tab
        baseItems = baseItems.filter(item => {
            if (item.id === 'exam-tracker') {
                return currentUser?.isExamCoordinator === true;
            }
            return true;
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

    const filteredNavItems = navItems.filter(item => 
        !sidebarSearchQuery || item.label.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
    );

    // Calculate badges
    const itemsWithBadges = filteredNavItems.map(item => {
        let badge = 0;
        if (item.id === 'leaves') badge = pendingLeaves;
        if (item.id === 'substitution') badge = incomingSubReqsCount;
        if (item.id === 'chat') badge = unreadChatCount;
        if (item.id === 'tasks') badge = pendingTasksCount;
        if (item.id === 'notifications') badge = unreadNotificationsCount;
        if (item.id === 'evaluations') badge = pendingEvaluationsCount;
        if (item.id === 'questions') badge = pendingQuestionsCount;
        if (item.id === 'anomalies') badge = anomaliesBadgeCount;
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
                    {currentUser?.name && (
                        <Link to="/mentor/profile" className="block mt-1 ml-8 truncate hover:opacity-75 transition-opacity">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                                {currentUser.name}
                            </p>
                        </Link>
                    )}
                </div>

                {/* Active Updates Quick-Jump Bar (Visible without scrolling down the sidebar) */}
                {totalPendingCount > 0 && (
                    <div className="px-3 pt-3 pb-1">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50 via-indigo-50 to-amber-50 border border-purple-200/70 shadow-2xs">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    Active Updates ({totalPendingCount})
                                </span>
                                <span className="text-[9px] font-bold text-purple-600 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                                    Quick Jump
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                {pendingUpdatesList.map(u => (
                                    <Link
                                        key={u.id}
                                        to={u.path}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white/95 border border-purple-100 hover:border-purple-300 hover:bg-purple-100/50 text-gray-700 hover:text-purple-900 shadow-2xs transition-all"
                                        title={u.desc}
                                    >
                                        <u.icon className="w-3 h-3 text-purple-600 shrink-0" />
                                        <span className="truncate max-w-[80px]">{u.title}</span>
                                        <span className="px-1 py-0.2 rounded-full bg-red-600 text-white text-[8px] font-black leading-none">
                                            {u.count}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-4 pb-2 pt-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={sidebarSearchQuery}
                            onChange={(e) => setSidebarSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                        {sidebarSearchQuery && (
                            <button
                                onClick={() => setSidebarSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
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
                            <div>
                                <h1 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                                    <CalendarDays className="w-6 h-6" />
                                    Mentor Panel
                                </h1>
                                {currentUser?.name && (
                                    <Link to="/mentor/profile" onClick={() => setIsMobileMenuOpen(false)} className="block mt-1 ml-8 truncate hover:opacity-75 transition-opacity">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                                            {currentUser.name}
                                        </p>
                                    </Link>
                                )}
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full">
                                <Users className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Mobile Active Updates Quick-Jump Bar */}
                        {totalPendingCount > 0 && (
                            <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50 via-indigo-50 to-amber-50 border border-purple-200/70 shadow-2xs">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            Active Updates ({totalPendingCount})
                                        </span>
                                        <span className="text-[9px] font-bold text-purple-600 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                                            Quick Jump
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                        {pendingUpdatesList.map(u => (
                                            <Link
                                                key={u.id}
                                                to={u.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white/95 border border-purple-100 hover:border-purple-300 hover:bg-purple-100/50 text-gray-700 hover:text-purple-900 shadow-2xs transition-all"
                                                title={u.desc}
                                            >
                                                <u.icon className="w-3 h-3 text-purple-600 shrink-0" />
                                                <span className="truncate max-w-[80px]">{u.title}</span>
                                                <span className="px-1 py-0.2 rounded-full bg-red-600 text-white text-[8px] font-black leading-none">
                                                    {u.count}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="px-4 py-2 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search menu..."
                                    value={sidebarSearchQuery}
                                    onChange={(e) => setSidebarSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                                {sidebarSearchQuery && (
                                    <button
                                        onClick={() => setSidebarSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
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
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-auto print:overflow-visible flex flex-col h-full relative">
                {/* Desktop Top Header Bar (Action Center & Notifications) */}
                <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-100 shrink-0 print:hidden z-30">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500">
                            {format(new Date(), 'EEEE, dd MMMM yyyy')}
                        </span>
                        {currentUser?.name && (
                            <span className="text-xs text-gray-400">
                                • Logged in as <span className="font-semibold text-gray-700">{currentUser.name}</span>
                            </span>
                        )}
                    </div>
                    
                    {/* Action Center Dropdown Hub (Desktop) */}
                    <div className="relative" ref={desktopUpdatesHubRef}>
                        <button
                            type="button"
                            onClick={() => setIsUpdatesHubOpen(prev => !prev)}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs border cursor-pointer",
                                totalPendingCount > 0
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-purple-500/20 hover:shadow-md hover:from-purple-700 hover:to-indigo-700"
                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                            )}
                            title="Pending Updates & Notifications"
                        >
                            <div className="relative flex items-center justify-center">
                                <Bell className={clsx("w-4 h-4", totalPendingCount > 0 && "animate-bounce")} />
                                {totalPendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                )}
                            </div>
                            <span>
                                {totalPendingCount > 0 ? `${totalPendingCount} Action${totalPendingCount > 1 ? 's' : ''} Required` : 'All Updates Caught Up'}
                            </span>
                            <span className={clsx(
                                "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                                totalPendingCount > 0 ? "bg-white text-purple-700" : "bg-gray-200 text-gray-600"
                            )}>
                                {totalPendingCount}
                            </span>
                        </button>

                        {/* Dropdown Popover (Desktop) */}
                        {isUpdatesHubOpen && (
                            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 leading-tight">Action Center</h4>
                                            <p className="text-[10px] text-gray-400">Pages with pending updates</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                                        {totalPendingCount} Action{totalPendingCount !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {pendingUpdatesList.length > 0 ? (
                                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                        {pendingUpdatesList.map((update) => {
                                            const Icon = update.icon;
                                            return (
                                                <Link
                                                    key={update.id}
                                                    to={update.path}
                                                    onClick={() => setIsUpdatesHubOpen(false)}
                                                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx("p-2 rounded-xl flex items-center justify-center shrink-0", update.color)}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                                                                {update.title}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 line-clamp-1">
                                                                {update.desc}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pl-2 shrink-0">
                                                        <span className="flex h-5 min-w-[20px] items-center justify-center px-1.5 rounded-full bg-red-600 text-[10px] font-black text-white shadow-2xs">
                                                            {update.count}
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center">
                                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-800">You're all caught up!</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">No pending leaves, substitutions, tasks, or messages.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0 print:hidden relative" ref={mobileUpdatesHubRef}>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-6 h-6 text-purple-600" />
                            <span className="font-bold text-gray-900">Mentor Panel</span>
                        </div>
                        {currentUser?.name && (
                            <Link to="/mentor/profile" className="block ml-8 truncate max-w-[150px] hover:opacity-75 transition-opacity">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">
                                    {currentUser.name}
                                </p>
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button 
                            type="button"
                            onClick={() => setIsUpdatesHubOpen(prev => !prev)} 
                            className={clsx(
                                "relative p-2 rounded-lg transition-all cursor-pointer",
                                totalPendingCount > 0 
                                    ? "text-purple-600 bg-purple-50 hover:bg-purple-100" 
                                    : "text-gray-500 hover:bg-gray-50"
                            )}
                            title="Active Updates"
                        >
                            <Bell className="w-5 h-5" />
                            {totalPendingCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center px-1 rounded-full bg-red-600 text-[9px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
                                    {totalPendingCount}
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                            className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                            <Layers className="w-6 h-6" />
                            {totalPendingCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                            )}
                        </button>
                    </div>

                    {/* Mobile Action Center Popover */}
                    {isUpdatesHubOpen && (
                        <div className="absolute top-full left-0 right-0 m-3 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 leading-tight">Action Center</h4>
                                        <p className="text-[10px] text-gray-400">Pages with pending updates</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                                        {totalPendingCount} Action{totalPendingCount !== 1 ? 's' : ''}
                                    </span>
                                    <button 
                                        onClick={() => setIsUpdatesHubOpen(false)}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {pendingUpdatesList.length > 0 ? (
                                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                    {pendingUpdatesList.map((update) => {
                                        const Icon = update.icon;
                                        return (
                                            <Link
                                                key={update.id}
                                                to={update.path}
                                                onClick={() => setIsUpdatesHubOpen(false)}
                                                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx("p-2 rounded-xl flex items-center justify-center shrink-0", update.color)}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-xs font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                                                            {update.title}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 line-clamp-1">
                                                            {update.desc}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 pl-2 shrink-0">
                                                    <span className="flex h-5 min-w-[20px] items-center justify-center px-1.5 rounded-full bg-red-600 text-[10px] font-black text-white shadow-2xs">
                                                        {update.count}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-6 text-center">
                                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-800">You're all caught up!</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">No pending leaves, substitutions, tasks, or messages.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {currentUser?.isImpersonating && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 flex items-center justify-between text-white shrink-0 animate-in slide-in-from-top duration-300 print:hidden">
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
                        <Route path="/profile" element={<MentorProfile />} />
                        <Route path="/record" element={<AttendanceRecorder />} />
                        <Route path="/tasks" element={<MentorTasks />} />
                        <Route path="/assessment" element={<StudentAssessment />} />
                        <Route path="/evaluations" element={<MentorEvaluations />} />
                        <Route path="/class-essentials" element={<MentorClassEssentials />} />
                        <Route path="/leaves" element={<MentorLeaveRequests />} />
                        <Route path="/chat" element={<MentorChat />} />
                        <Route path="/activities" element={<ActivitiesManager />} />
                        <Route path="/quran-recitation" element={<MentorQuranRecitation />} />
                        <Route path="/sunnah-campaign" element={<MentorSunnahCampaign />} />
                        <Route path="/logbook" element={<LogBook />} />
                        <Route path="/subjects" element={<MentorSubjects />} />
                        <Route path="/prayer-chart" element={<PrayerStats />} />
                        <Route path="/ramadan" element={<MentorRamadan />} />
                        <Route path="/notifications" element={<MentorNotifications />} />
                        <Route path="/admissions" element={<MentorAdmissionRequest />} />
                        <Route path="/print" element={<PrintAttendance />} />
                        <Route path="/questions" element={<QuestionBank />} />
                        <Route path="/exam-tracker" element={<ExamQuestionTracker />} />
                        <Route path="/marks" element={<MarksEntry />} />
                        <Route path="/stats" element={<MentorStats />} />
                        <Route path="/leaderboard" element={<MentorLeaderboard />} />
                        <Route path="/directory" element={<InstitutionDirectory />} />
                        <Route path="/star-student" element={<StarOfTheMonth />} />
                        <Route path="/gamification" element={<MentorGamesView />} />
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
                        <Route path="/anomalies" element={
                            <ErrorBoundary>
                                <AttendanceAnomalies />
                            </ErrorBoundary>
                        } />
                        <Route path="/settings" element={<MentorSettings />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="*" element={
                            <div className="p-12 flex flex-col items-center justify-center h-full text-center">
                                <h2 className="text-2xl font-bold text-red-500 mb-4">Route Not Found (404)</h2>
                                <p className="text-gray-600">The page you are looking for does not exist in the Mentor Dashboard.</p>
                                <p className="text-sm font-mono mt-4 bg-gray-100 p-2 rounded">Current Path: {window.location.pathname}</p>
                            </div>
                        } />
                    </Routes>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;
