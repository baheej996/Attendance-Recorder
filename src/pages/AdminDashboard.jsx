import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, School, Trash2, AlertTriangle, LogOut, UserCheck, Laptop, BookOpen, FileText, Settings, Info, ArrowRightLeft, Bell, X, Menu, Replace, ClipboardList, MessageSquare, ChevronDown, ChevronRight, Megaphone, UserPlus, FileBarChart, Video, BarChart2, Trophy, FileQuestion, BookHeart } from 'lucide-react';
import { clsx } from 'clsx';
import ClassManagement from './components/ClassManagement';
import AdminLiveClasses from './components/AdminLiveClasses';
import MentorManagement from './components/MentorManagement';
import StudentManagement from './components/StudentManagement';
import SubjectManager from '../components/admin/SubjectManager';
import ExamManager from '../components/admin/ExamManager';
import BulkTransfer from '../components/admin/BulkTransfer';
import SyllabusManager from '../components/admin/SyllabusManager'; // New
import SyllabusTracker from '../components/admin/SyllabusTracker'; // New
import ExamQuestionTracker from '../components/common/ExamQuestionTracker';
import AdminAdmissionRequests from '../components/admin/AdminAdmissionRequests';
import AdminRequests from './components/AdminRequests';
import EvaluationManager from '../components/admin/EvaluationManager';
import FeatureControl from '../components/admin/FeatureControl';
import SettingsManager from './components/SettingsManager';
import SubstitutionManager from './components/SubstitutionManager';
import TaskManager from './components/TaskManager';
import AdminChat from './components/AdminChat';
import AdminNotifications from '../components/admin/AdminNotifications';
import AdminMentorLeaderboard from '../components/admin/AdminMentorLeaderboard';
import AdminMentorQuranTracker from '../components/admin/AdminMentorQuranTracker';
import AdminSunnahCampaign from '../components/admin/AdminSunnahCampaign';
import MentorEvaluation from './components/MentorEvaluation';
import Help from './Help';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { AdminAuthModal } from '../components/ui/AdminAuthModal';
import { Card, CardHeader } from '../components/ui/Card';
import CountryStatsChart from '../components/admin/CountryStatsChart';

import DashboardHome from './components/DashboardHome';
const AdminDashboard = () => {
    const location = useLocation();
    const { logout, adminRequests, substitutionRequests, admissionRequests, unreadChats, mentors, students, notifications, mentorTasks, classes } = useData();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const pendingRequestsCount = adminRequests?.filter(r => r.status === 'Pending').length || 0;
    const pendingSubsCount = substitutionRequests?.filter(r => r.status === 'Pending Admin Approval').length || 0;
    const pendingAdmissionsCount = admissionRequests?.filter(r => r.requestStatus === 'Pending').length || 0;
    
    const pendingTasksCount = React.useMemo(() => {
        return mentorTasks?.reduce((acc, task) => {
            const reviews = Object.values(task.submissions || {}).filter(s => s.status === 'under_review').length;
            return acc + reviews;
        }, 0) || 0;
    }, [mentorTasks]);

    const unreadMessagesCount = (unreadChats || []).length;

    const unreadNotificationsCount = (notifications || []).filter(n => 
        (n.audience === 'all' || n.audience === 'mentors') && 
        n.senderId !== 'admin' &&
        !(n.readBy || []).includes('admin')
    ).length;

    const attentionClassesCount = React.useMemo(() => {
        return (classes || []).filter(cls => {
            const studentCount = students.filter(s => s.classId === cls.id && s.status === 'Active').length;
            const mentorCount = mentors.filter(m => (m.assignedClassIds || []).includes(cls.id)).length;
            return studentCount === 0 || mentorCount === 0;
        }).length;
    }, [classes, students, mentors]);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardHome onTabChange={handleTabChange} />;
            case 'classes': return <ClassManagement />;
            case 'live-classes': return <AdminLiveClasses />;
            case 'mentors': return <MentorManagement />;
            case 'students': return <StudentManagement />;
            case 'subjects': return <SubjectManager />;
            case 'syllabus': return <SyllabusManager />; // New
            case 'syllabus-tracker': return <SyllabusTracker />; // New
            case 'exams': return <ExamManager />;
            case 'question-tracker': return <ExamQuestionTracker />;

            case 'bulk-transfer': return <BulkTransfer />;
            case 'admissions': return <AdminAdmissionRequests />;
            case 'requests': return <AdminRequests />; // New
            case 'features': return <FeatureControl />; // New
            case 'substitutions': return <SubstitutionManager />;
            case 'tasks': return <TaskManager />;
            case 'messages': return <AdminChat />;
            case 'notifications': return <AdminNotifications />;
            case 'evaluations': return <EvaluationManager />;
            case 'mentor-evaluation': return <MentorEvaluation />;
            case 'mentor-quran-tracking': return <AdminMentorQuranTracker />;
            case 'sunnah-campaign': return <AdminSunnahCampaign />;
            case 'leaderboard': return <AdminMentorLeaderboard />;
            case 'settings': return <SettingsManager />;
            case 'help': return <Help />;
            default: return <DashboardHome />;
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false); // Close mobile menu on selection
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm z-30 sticky top-0">
                <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="lg:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 -ml-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-md transform hover:scale-105 transition-transform duration-200">
                            <Laptop className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight hidden sm:block">Admin<span className="text-indigo-600">Portal</span></h1>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight sm:hidden">Admin</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Logout Confirmation Modal */}
            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={logout}
                title="Admin Sign Out"
                message="Are you sure you want to end your administrative session?"
                confirmText="Sign Out"
                isDanger={true}
            />

            <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className={clsx(
                        "lg:col-span-1 space-y-4",
                        "fixed inset-0 z-10 bg-gray-600 bg-opacity-75 lg:hidden",
                        isMobileMenuOpen ? "block" : "hidden"
                    )} onClick={() => setIsMobileMenuOpen(false)}>
                        {/* Mobile Drawer Content */}
                        <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-gray-50 shadow-xl overflow-y-auto p-4 space-y-4 pt-20" onClick={e => e.stopPropagation()}>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Management</h2>
                                </div>
                                <nav className="flex flex-col p-2 space-y-1">
                                    <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} isMobile />
                                    <SidebarItem icon={School} label="Classes" active={activeTab === 'classes'} onClick={() => handleTabChange('classes')} badge={attentionClassesCount} isMobile />
                                    <SidebarItem icon={Video} label="Live Classes" active={activeTab === 'live-classes'} onClick={() => handleTabChange('live-classes')} isMobile />
                                    <SidebarItem icon={Users} label="Mentors" active={activeTab === 'mentors'} onClick={() => handleTabChange('mentors')} isMobile />
                                    <SidebarItem icon={UserCheck} label="Students" active={activeTab === 'students'} onClick={() => handleTabChange('students')} isMobile />
                                    <SidebarItem icon={ArrowRightLeft} label="Bulk Transfer" active={activeTab === 'bulk-transfer'} onClick={() => handleTabChange('bulk-transfer')} isMobile />
                                    <SidebarItem icon={UserPlus} label="Admissions" active={activeTab === 'admissions'} onClick={() => handleTabChange('admissions')} badge={pendingAdmissionsCount} isMobile />
                                    <SidebarItem icon={Bell} label="Requests" active={activeTab === 'requests'} onClick={() => handleTabChange('requests')} badge={pendingRequestsCount} isMobile />
                                    <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => handleTabChange('messages')} badge={unreadMessagesCount} isMobile />
                                    <SidebarItem icon={Megaphone} label="Notifications" active={activeTab === 'notifications'} onClick={() => handleTabChange('notifications')} badge={unreadNotificationsCount} isMobile />
                                    <SidebarItem icon={Replace} label="Substitutions" active={activeTab === 'substitutions'} onClick={() => handleTabChange('substitutions')} badge={pendingSubsCount} isMobile />
                                    <SidebarItem icon={ClipboardList} label="Tasks" active={activeTab === 'tasks'} onClick={() => handleTabChange('tasks')} badge={pendingTasksCount} isMobile />
                                    <SidebarItem icon={BookOpen} label="Mentor Quran Stats" active={activeTab === 'mentor-quran-tracking'} onClick={() => handleTabChange('mentor-quran-tracking')} isMobile />
                                    <SidebarItem icon={BookHeart} label="Sunnah Campaign" active={activeTab === 'sunnah-campaign'} onClick={() => handleTabChange('sunnah-campaign')} isMobile />
                                    <SidebarItem icon={FileBarChart} label="Mentor Evaluation" active={activeTab === 'mentor-evaluation'} onClick={() => handleTabChange('mentor-evaluation')} isMobile />
                                    <SidebarItem icon={FileBarChart} label="Evaluations" active={activeTab === 'evaluations'} onClick={() => handleTabChange('evaluations')} isMobile />
                                    <SidebarItem icon={Trophy} label="Leaderboard" active={activeTab === 'leaderboard'} onClick={() => handleTabChange('leaderboard')} isMobile />
                                </nav>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Academics</h2>
                                </div>
                                <nav className="flex flex-col p-2 space-y-1">
                                    <SidebarItem icon={BookOpen} label="Subjects" active={activeTab === 'subjects'} onClick={() => handleTabChange('subjects')} isMobile />
                                    <SidebarItem icon={FileText} label="Syllabus" active={activeTab === 'syllabus'} onClick={() => handleTabChange('syllabus')} isMobile />
                                    <SidebarItem icon={ClipboardList} label="Syllabus Tracker" active={activeTab === 'syllabus-tracker'} onClick={() => handleTabChange('syllabus-tracker')} isMobile />
                                    <SidebarItem icon={FileText} label="Exams" active={activeTab === 'exams'} onClick={() => handleTabChange('exams')} isMobile />
                                    <SidebarItem icon={FileQuestion} label="Question Tracking" active={activeTab === 'question-tracker'} onClick={() => handleTabChange('question-tracker')} isMobile />
                                </nav>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuration</h2>
                                </div>
                                <nav className="flex flex-col p-2 space-y-1">
                                    <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} isMobile />
                                    <SidebarItem icon={Info} label="Help" active={activeTab === 'help'} onClick={() => handleTabChange('help')} isMobile />
                                </nav>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Sidebar (hidden on mobile) */}
                    <div className="hidden lg:block lg:col-span-1 space-y-4 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto pb-4 pr-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Management</h2>
                            </div>
                            <nav className="flex flex-col p-2 space-y-1">
                                <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                                <SidebarItem icon={School} label="Classes" active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} badge={attentionClassesCount} />
                                <SidebarItem icon={Video} label="Live Classes" active={activeTab === 'live-classes'} onClick={() => setActiveTab('live-classes')} />
                                <SidebarItem icon={Users} label="Mentors" active={activeTab === 'mentors'} onClick={() => setActiveTab('mentors')} />
                                <SidebarItem icon={UserCheck} label="Students" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
                                <SidebarItem icon={ArrowRightLeft} label="Bulk Transfer" active={activeTab === 'bulk-transfer'} onClick={() => setActiveTab('bulk-transfer')} />
                                <SidebarItem icon={UserPlus} label="Admissions" active={activeTab === 'admissions'} onClick={() => setActiveTab('admissions')} badge={pendingAdmissionsCount} />
                                <SidebarItem icon={Bell} label="Requests" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} badge={pendingRequestsCount} />
                                <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} badge={unreadMessagesCount} />
                                <SidebarItem icon={Megaphone} label="Notifications" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} badge={unreadNotificationsCount} />
                                <SidebarItem icon={Replace} label="Substitutions" active={activeTab === 'substitutions'} onClick={() => setActiveTab('substitutions')} badge={pendingSubsCount} />
                                <SidebarItem icon={ClipboardList} label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} badge={pendingTasksCount} />
                                <SidebarItem icon={BookOpen} label="Mentor Quran Stats" active={activeTab === 'mentor-quran-tracking'} onClick={() => setActiveTab('mentor-quran-tracking')} />
                                <SidebarItem icon={BookHeart} label="Sunnah Campaign" active={activeTab === 'sunnah-campaign'} onClick={() => setActiveTab('sunnah-campaign')} />
                                <SidebarItem icon={BarChart2} label="Mentor Evaluation" active={activeTab === 'mentor-evaluation'} onClick={() => setActiveTab('mentor-evaluation')} />
                                <SidebarItem icon={FileBarChart} label="Evaluations" active={activeTab === 'evaluations'} onClick={() => setActiveTab('evaluations')} />
                                <SidebarItem icon={Trophy} label="Leaderboard" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
                            </nav>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Academics</h2>
                            </div>
                            <nav className="flex flex-col p-2 space-y-1">
                                <SidebarItem icon={BookOpen} label="Subjects" active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
                                <SidebarItem icon={FileText} label="Syllabus" active={activeTab === 'syllabus'} onClick={() => setActiveTab('syllabus')} />
                                <SidebarItem icon={ClipboardList} label="Syllabus Tracker" active={activeTab === 'syllabus-tracker'} onClick={() => setActiveTab('syllabus-tracker')} />
                                <SidebarItem icon={FileText} label="Exams" active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} />
                                <SidebarItem icon={FileQuestion} label="Question Tracking" active={activeTab === 'question-tracker'} onClick={() => setActiveTab('question-tracker')} />
                            </nav>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuration</h2>
                            </div>
                            <nav className="flex flex-col p-2 space-y-1">
                                <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                                <SidebarItem icon={Laptop} label="App Features" active={activeTab === 'features'} onClick={() => setActiveTab('features')} />
                                <SidebarItem icon={Info} label="Help" active={activeTab === 'help'} onClick={() => setActiveTab('help')} />
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        {renderContent()}
                    </div>
                </div>
            </main >
        </div >
    );
};

// Simple Sidebar Item Component
const SidebarItem = ({ icon: Icon, label, active, onClick, badge, isMobile }) => (
    <button
        onClick={onClick}
        data-tour={isMobile ? `mobile-sidebar-${label.toLowerCase().replace(/\s+/g, '-')}` : `sidebar-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${active
            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
    >
        <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
            {label}
        </div>
        {badge > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center px-1.5 rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm border-2 border-white animate-in zoom-in duration-300">
                {badge}
            </span>
        )}
    </button>
);

export default AdminDashboard;
