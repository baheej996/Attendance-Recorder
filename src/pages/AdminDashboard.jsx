import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, School, Trash2, AlertTriangle, LogOut, UserCheck, Laptop, BookOpen, FileText, Settings, Info, ArrowRightLeft, Bell, X, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import ClassManagement from './components/ClassManagement';
import MentorManagement from './components/MentorManagement';
import StudentManagement from './components/StudentManagement';
import SubjectManager from '../components/admin/SubjectManager';
import ExamManager from '../components/admin/ExamManager';
import BulkTransfer from '../components/admin/BulkTransfer';
import AdminRequests from './components/AdminRequests'; // New
import FeatureControl from '../components/admin/FeatureControl'; // New
import SettingsManager from './components/SettingsManager';
import Help from './Help';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { AdminAuthModal } from '../components/ui/AdminAuthModal';
import { Card, CardHeader } from '../components/ui/Card';

const DashboardHome = () => {
    const { classes, mentors, students, resetData, adminRequests } = useData();
    const { showAlert } = useUI();
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);

    const checkAuthBeforeReset = () => {
        setIsResetModalOpen(false);
        setIsAdminAuthOpen(true);
    };

    const handleFinalReset = () => {
        resetData();
        setIsAdminAuthOpen(false);
        showAlert('Reset Complete', "System Factory Reset Complete. All data has been erased.", 'success');
        setTimeout(() => window.location.reload(), 2000);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={checkAuthBeforeReset}
                title="System Reset"
                message="DANGER: This will permanently delete ALL Classes, Mentors, Students, and Attendance records. This action cannot be undone. Are you absolutely sure?"
                confirmText="Yes, Proceed"
                cancelText="Cancel"
                isDanger
            />

            <AdminAuthModal
                isOpen={isAdminAuthOpen}
                onClose={() => setIsAdminAuthOpen(false)}
                onSuccess={handleFinalReset}
                title="Security Verification"
                message="To perform a factory reset, please verify your Admin identity."
            />

            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
                <p className="text-gray-500 mt-2">Welcome back, Administrator</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="flex items-center gap-4 border-l-4 border-l-indigo-500">
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                        <School className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Classes</p>
                        <h3 className="text-2xl font-bold text-gray-900">{classes.length}</h3>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-l-purple-500">
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Mentors</p>
                        <h3 className="text-2xl font-bold text-gray-900">{mentors.length}</h3>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-l-pink-500">
                    <div className="p-3 bg-pink-50 rounded-full text-pink-600">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Students</p>
                        <h3 className="text-2xl font-bold text-gray-900">{students.length}</h3>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-l-yellow-500">
                    <div className="p-3 bg-yellow-50 rounded-full text-yellow-600">
                        <Bell className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Pending Requests</p>
                        <h3 className="text-2xl font-bold text-gray-900">{adminRequests?.filter(r => r.status === 'Pending').length || 0}</h3>
                    </div>
                </Card>
            </div >

            <div className="mt-12 bg-red-50 border border-red-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                </h3>
                <p className="text-red-600/80 text-sm mb-4">
                    Perform a hard reset of the system. This will remove all data but keep your admin access.
                </p>
                <button
                    onClick={() => setIsResetModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete All Data
                </button>
            </div>
        </div >
    );
};

const AdminDashboard = () => {
    const location = useLocation();
    const { logout } = useData();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardHome />;
            case 'classes': return <ClassManagement />;
            case 'mentors': return <MentorManagement />;
            case 'students': return <StudentManagement />;
            case 'subjects': return <SubjectManager />;
            case 'exams': return <ExamManager />;

            case 'bulk-transfer': return <BulkTransfer />;
            case 'requests': return <AdminRequests />; // New
            case 'features': return <FeatureControl />; // New
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
            <header className="bg-white shadow-sm z-20 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
                            onClick={logout}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className={clsx(
                        "lg:col-span-1 space-y-4",
                        // Mobile styles: fixed overlay or regular flow? 
                        // Let's use regular flow but hidden on mobile unless open.
                        // Actually, for better UX on mobile, it should be an absolute/fixed overlay if we want to mimic a drawer,
                        // OR just a toggleable block. 
                        // Given the user's report "all menu showing", it was block.
                        // Let's make it hidden on mobile by default, and if open, it shows.
                        // If we just toggle 'hidden', it pushes content down. That's fine for a simple dashboard.
                        // But let's try a slide-over for a "premium" feel as requested? 
                        // To keep it robust without adding complex transition libraries right now, 
                        // let's use the 'hidden lg:block' pattern, and when open on mobile, it's a fixed overlay.
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
                                    <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
                                    <SidebarItem icon={School} label="Classes" active={activeTab === 'classes'} onClick={() => handleTabChange('classes')} />
                                    <SidebarItem icon={Users} label="Mentors" active={activeTab === 'mentors'} onClick={() => handleTabChange('mentors')} />
                                    <SidebarItem icon={UserCheck} label="Students" active={activeTab === 'students'} onClick={() => handleTabChange('students')} />
                                    <SidebarItem icon={ArrowRightLeft} label="Bulk Transfer" active={activeTab === 'bulk-transfer'} onClick={() => handleTabChange('bulk-transfer')} />
                                    <SidebarItem icon={Bell} label="Requests" active={activeTab === 'requests'} onClick={() => handleTabChange('requests')} />
                                </nav>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Academics</h2>
                                </div>
                                <nav className="flex flex-col p-2 space-y-1">
                                    <SidebarItem icon={BookOpen} label="Subjects" active={activeTab === 'subjects'} onClick={() => handleTabChange('subjects')} />
                                    <SidebarItem icon={FileText} label="Exams" active={activeTab === 'exams'} onClick={() => handleTabChange('exams')} />
                                </nav>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuration</h2>
                                </div>
                                <nav className="flex flex-col p-2 space-y-1">
                                    <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} />
                                    <SidebarItem icon={Info} label="Help" active={activeTab === 'help'} onClick={() => handleTabChange('help')} />
                                </nav>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Sidebar (hidden on mobile) */}
                    <div className="hidden lg:block lg:col-span-1 space-y-4 sticky top-20 h-fit">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Management</h2>
                            </div>
                            <nav className="flex flex-col p-2 space-y-1">
                                <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                                <SidebarItem icon={School} label="Classes" active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} />
                                <SidebarItem icon={Users} label="Mentors" active={activeTab === 'mentors'} onClick={() => setActiveTab('mentors')} />
                                <SidebarItem icon={UserCheck} label="Students" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
                                <SidebarItem icon={ArrowRightLeft} label="Bulk Transfer" active={activeTab === 'bulk-transfer'} onClick={() => setActiveTab('bulk-transfer')} />
                                <SidebarItem icon={Bell} label="Requests" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
                            </nav>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Academics</h2>
                            </div>
                            <nav className="flex flex-col p-2 space-y-1">
                                <SidebarItem icon={BookOpen} label="Subjects" active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
                                <SidebarItem icon={FileText} label="Exams" active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} />
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
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        data-tour={`sidebar-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${active
            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
        {label}
    </button>
);

export default AdminDashboard;
