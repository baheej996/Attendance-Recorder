import React, { useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Calendar, CheckCircle, XCircle, Clock, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';

const AttendanceHistory = () => {
    const { currentUser, attendance, notifications, markNotificationAsRead } = useData();
    
    // Auto-mark notifications as read when viewing this page
    useEffect(() => {
        if (!currentUser?.id || !notifications) return;
        const unreadAttendanceNotifs = notifications.filter(n => 
            n.type === 'attendance' && 
            !(n.readBy || []).includes(currentUser.id) &&
            (n.audience === 'all' || n.audience === 'students' || (n.audience === 'specific_class' && n.classId === currentUser.classId) || (n.audience === 'specific_student' && n.targetId === currentUser.id))
        );
        
        unreadAttendanceNotifs.forEach(n => markNotificationAsRead(n.id, currentUser.id));
    }, [notifications, currentUser, markNotificationAsRead]);

    // 1. Filter student-specific attendance
    const studentAttendance = useMemo(() => {
        if (!currentUser?.id) return [];
        return (attendance || [])
            .filter(r => r.studentId === currentUser.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [attendance, currentUser]);

    // 2. Summary stats
    const stats = useMemo(() => {
        const total = studentAttendance.length;
        const present = studentAttendance.filter(r => r.status === 'Present').length;
        const absent = total - present;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        
        return { total, present, absent, percentage };
    }, [studentAttendance]);

    // 3. Group by Month
    const groupedAttendance = useMemo(() => {
        const groups = {};
        studentAttendance.forEach(record => {
            const date = new Date(record.date);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) {
                groups[monthYear] = [];
            }
            groups[monthYear].push(record);
        });
        return Object.entries(groups);
    }, [studentAttendance]);

    if (!currentUser) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header section (Compact on Mobile) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2 md:gap-3">
                        <Calendar className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" />
                        Attendance
                    </h1>
                    <p className="text-xs md:text-gray-500 font-medium mt-0.5 md:mt-1">Detailed record of your presence</p>
                </div>
            </div>

            {/* Stats Overview (Grid on Mobile) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <Card className="p-3 md:p-5 border-l-4 border-l-indigo-500 shadow-sm">
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Days</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">{stats.total}</h3>
                </Card>

                <Card className="p-3 md:p-5 border-l-4 border-l-green-500 shadow-sm">
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Present</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">{stats.present}</h3>
                </Card>

                <Card className="p-3 md:p-5 border-l-4 border-l-red-500 shadow-sm">
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Absent</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">{stats.absent}</h3>
                </Card>

                <Card className={clsx(
                    "p-3 md:p-5 border-l-4 shadow-sm",
                    stats.percentage >= 75 ? "border-l-indigo-500" : "border-l-amber-500"
                )}>
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                        <div className={clsx(
                            "p-2 rounded-lg",
                            stats.percentage >= 75 ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                        )}>
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rate</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">{stats.percentage}%</h3>
                </Card>
            </div>

            {/* Attendance List grouped by month */}
            <div className="space-y-10">
                {groupedAttendance.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No Records Found</h3>
                        <p className="text-gray-400 max-w-xs text-sm">Attendance records haven't been added yet for your account.</p>
                    </div>
                ) : (
                    groupedAttendance.map(([month, records], idx) => (
                        <div key={month} className="animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="flex items-center gap-4 mb-4">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight pl-2">
                                    {month}
                                </h2>
                                <div className="h-[2px] flex-1 bg-gradient-to-r from-gray-100 to-transparent rounded-full"></div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {records.length} Entries
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {records.map((record) => {
                                    const date = new Date(record.date);
                                    const dayName = date.toLocaleDateString('default', { weekday: 'short' });
                                    const dayNum = date.getDate();
                                    
                                    return (
                                        <div 
                                            key={record.id}
                                            className={clsx(
                                                "group p-4 bg-white rounded-2xl border transition-all flex items-center justify-between hover:shadow-lg hover:-translate-y-1",
                                                record.status === 'Present' 
                                                    ? "border-green-50 hover:border-green-200" 
                                                    : "border-red-50 hover:border-red-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black transition-transform group-hover:scale-110",
                                                    record.status === 'Present' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                                )}>
                                                    <span className="text-[10px] leading-none uppercase tracking-tighter opacity-70">{dayName}</span>
                                                    <span className="text-lg leading-tight mt-0.5">{dayNum}</span>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">
                                                        {record.status}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-medium tracking-wide">
                                                        {date.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className={clsx(
                                                "p-2 rounded-full",
                                                record.status === 'Present' ? "bg-green-100/50 text-green-600" : "bg-red-100/50 text-red-600"
                                            )}>
                                                {record.status === 'Present' ? (
                                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 flex-shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tips / Info */}
            {stats.total > 0 && (
                <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-900 mb-1">Attendance Tip</h4>
                        <p className="text-sm text-indigo-700/80 leading-relaxed font-medium">
                            Consistent attendance is key to your academic success. Your current rate is <span className="font-black text-indigo-900 underline decoration-indigo-300 decoration-2">{stats.percentage}%</span>. Keep it up!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceHistory;
