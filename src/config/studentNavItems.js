import { 
    Home, LayoutDashboard, Layers, Book, FileText, Calendar, 
    MessageSquare, BookOpen, Moon, History, CheckCircle, 
    Trophy, Star, Bell, Info, MessageCircle, Gamepad2
} from 'lucide-react';

export const STUDENT_NAV_ITEMS = [
    { icon: Home, label: 'Welcome', path: '/student', key: 'welcome', description: 'Animated landing page for students.' },
    { icon: LayoutDashboard, label: 'Overview', path: '/student/overview', key: 'overview', description: 'Detailed dashboard with academic stats.' },
    { icon: Layers, label: 'Activities', path: '/student/activities', key: 'activities', description: 'Assignments and projects for students.' },
    { icon: Book, label: 'My Subjects', path: '/student/subjects', key: 'subjects', description: 'View assigned subjects and materials.' },
    { icon: FileText, label: 'Online Exams', path: '/student/exams', key: 'exams', description: 'MCQ based online examinations.' },
    { icon: FileText, label: 'Report Card', path: '/student/results', key: 'results', description: 'View exam results and progress.' },
    { icon: Calendar, label: 'Leave Applications', path: '/student/leave', key: 'leave', description: 'Apply for leave and view status.' },
    { icon: MessageSquare, label: 'Chat with Mentor', path: '/student/chat', key: 'chat', description: 'Messaging system with mentors.' },
    { icon: BookOpen, label: 'Prayer Chart', path: '/student/prayer-chart', key: 'prayer', description: 'Daily prayer tracking.' },
    { icon: BookOpen, label: 'Quran Recitation', path: '/student/quran-recitation', key: 'quran-recitation', description: 'Track your daily Quran recitation status.' },
    { icon: Moon, label: 'Ramadan', path: '/student/ramadan', key: 'ramadan', description: 'Special Ramadan acts and tracking.' },
    { icon: History, label: 'Class History', path: '/student/history', key: 'history', description: 'View past class logs.' },
    { icon: CheckCircle, label: 'Attendance History', path: '/student/attendance', key: 'attendanceHistory', description: 'View attendance records and rate.' },
    { icon: Trophy, label: 'Leaderboard', path: '/student/leaderboard', key: 'leaderboard', description: 'Class rankings and points.' },
    { icon: Gamepad2, label: 'Learning Games', path: '/student/games', key: 'gamification', description: 'Play games and improve your Arabic reading skills.' },
    { icon: Star, label: 'Star of the Month', path: '/student/star-student', key: 'star', description: 'Monthly student recognition.' },
    { icon: Bell, label: 'Notifications', path: '/student/notifications', key: 'notifications', description: 'System notifications and alerts.' },
    { icon: MessageCircle, label: 'Feedback', path: '/student/feedback', key: 'feedback', description: 'Student assessment and parent feedback form.' },
    { icon: Info, label: 'Help', path: '/student/help', key: 'help', description: 'Guides and FAQs.' },
];
