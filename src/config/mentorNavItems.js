import {
    ClipboardCheck,
    UserCheck,
    MessageSquare,
    Layers,
    BookOpen,
    Calendar,
    Printer,
    FileEdit,
    BarChart2,
    CalendarDays,
    Users,
    Info,
    Settings,
    Star,
    Moon
} from 'lucide-react';

export const MENTOR_NAV_ITEMS = [
    { id: 'attendance', icon: ClipboardCheck, label: 'Record Attendance', path: '/mentor/record' },
    { id: 'leaves', icon: UserCheck, label: 'Leave Requests', path: '/mentor/leaves' },
    { id: 'chat', icon: MessageSquare, label: 'Chat', path: '/mentor/chat' },
    { id: 'activities', icon: Layers, label: 'Activities', path: '/mentor/activities' },
    { id: 'logbook', icon: BookOpen, label: 'Class Log Book', path: '/mentor/logbook' },
    { id: 'prayer', icon: Calendar, label: 'Prayer Chart', path: '/mentor/prayer-chart' },
    { id: 'print', icon: Printer, label: 'Print Attendance', path: '/mentor/print' },
    { id: 'questions', icon: FileEdit, label: 'Question Bank', path: '/mentor/questions' },
    { id: 'marks', icon: BarChart2, label: 'Enter Exam Marks', path: '/mentor/marks' },
    { id: 'star-student', icon: Star, label: 'Star of the Month', path: '/mentor/star-student' },
    { id: 'stats', icon: CalendarDays, label: 'Statistics & History', path: '/mentor/stats' },
    { id: 'batches', icon: Users, label: 'Batches', path: '/mentor/batches' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/mentor/settings' },
    { id: 'help', icon: Info, label: 'Help', path: '/mentor/help' },
];
