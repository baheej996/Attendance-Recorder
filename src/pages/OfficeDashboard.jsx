import React, { useState } from 'react';
import { LayoutDashboard, Wallet, Users, School, LogOut, Menu, X, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '../contexts/DataContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

// Components
import OfficeOverview from '../components/office/OfficeOverview';
import OfficeFeeManagement from '../components/office/OfficeFeeManagement';
import ClassRevenueLeaderboard from '../components/office/ClassRevenueLeaderboard';
import StudentManagement from './components/StudentManagement';
import ClassManagement from './components/ClassManagement';

const OfficeDashboard = () => {
    const { logout } = useData();
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(false);
        logout();
    };

    const navItems = [
        { 
            id: 'overview', 
            label: 'Overview', 
            icon: LayoutDashboard,
            badge: null
        },
        { 
            id: 'fees', 
            label: 'Fee Collection', 
            icon: Wallet,
            badge: null
        },
        { 
            id: 'students', 
            label: 'Student Management', 
            icon: Users,
            badge: null
        },
        { 
            id: 'classes', 
            label: 'Class Management', 
            icon: School,
            badge: null
        },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OfficeOverview onTabChange={setActiveTab} />;
            case 'fees':
                return <OfficeFeeManagement />;
            case 'class-revenue':
                return <ClassRevenueLeaderboard onBack={() => setActiveTab('overview')} onTabChange={setActiveTab} />;
            case 'students':
                return <StudentManagement />;
            case 'classes':
                return <ClassManagement />;
            case 'mentors':
                return <StudentManagement />;
            default:
                return <OfficeOverview onTabChange={setActiveTab} />;
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
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/20 text-white">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Office Portal</h1>
                            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Accounts & Admission
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="lg:hidden text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={clsx(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200 font-bold"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={clsx("w-5 h-5", isActive ? "text-emerald-600" : "text-gray-400")} />
                                    <span className="text-sm">{item.label}</span>
                                </div>
                                {item.badge && (
                                    <span className={clsx(
                                        "px-2 py-0.5 text-xs font-bold rounded-full",
                                        isActive ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
                                    )}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Office Info & Sign Out Footer */}
                <div className="p-4 border-t border-gray-100 space-y-3">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium text-sm"
                    >
                        <LogOut className="w-5 h-5 text-red-500" />
                        <span>Sign Out Portal</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen relative">
                {/* Mobile Top Bar */}
                <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-bold text-gray-900 truncate">Office Portal</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:px-6 lg:py-6 custom-scrollbar relative bg-gray-50">
                    <div className="w-full max-w-[98%] 2xl:max-w-[1600px] mx-auto pb-20">
                        {renderContent()}
                    </div>
                </div>
            </main>

            {/* Sign Out Modal */}
            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                title="Sign Out Office Portal"
                message="Are you sure you want to exit the Office & Accounts Panel?"
                confirmText="Sign Out"
                isDangerous={true}
            />
        </div>
    );
};

export default OfficeDashboard;
