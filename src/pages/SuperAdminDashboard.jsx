import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Menu, X, School, GraduationCap, FileQuestion } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

import DashboardHome from './components/DashboardHome';
import MentorManagement from './components/MentorManagement';
import ClassManagement from './components/ClassManagement';
import StudentManagement from './components/StudentManagement';
import ExamManager from '../components/admin/ExamManager';

const SuperAdminDashboard = () => {
    const location = useLocation();
    const { logout } = useData();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(false);
        logout();
    };

    const navItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'classes', label: 'Classes', icon: School },
        { id: 'students', label: 'Students', icon: GraduationCap },
        { id: 'mentors', label: 'Mentors', icon: Users },
        { id: 'exams', label: 'Exams', icon: FileQuestion },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardHome onTabChange={setActiveTab} />;
            case 'classes':
                return <ClassManagement readOnly={true} />;
            case 'students':
                return <StudentManagement readOnly={true} />;
            case 'mentors':
                return <MentorManagement readOnly={true} />;
            case 'exams':
                return <ExamManager readOnly={true} />;
            default:
                return <DashboardHome onTabChange={setActiveTab} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed lg:sticky top-0 h-screen w-72 bg-white border-r border-gray-200 text-gray-800 flex flex-col transition-transform duration-300 ease-in-out z-50 shadow-sm",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                activeTab === item.id
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-semibold"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5", activeTab === item.id ? "text-indigo-600" : "text-gray-400")} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen relative">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 truncate">Super Admin</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
                    <div className="max-w-7xl mx-auto pb-24">
                        {renderContent()}
                    </div>
                </div>
            </main>

            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                title="Sign Out"
                message="Are you sure you want to sign out?"
                confirmText="Sign Out"
                isDangerous={true}
            />
        </div>
    );
};

export default SuperAdminDashboard;
