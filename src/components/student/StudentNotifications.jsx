import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { BookOpen, Calendar, Clock, Info, Shield, Users, Trophy, ClipboardCheck, GraduationCap, Sparkles, Star } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const StudentNotifications = () => {
    const { currentUser, notifications, markNotificationAsRead } = useData();

    // Filter notifications meant for this user
    const userNotifications = useMemo(() => {
        return (notifications || []).filter(n => {
            return n.audience === 'all' ||
                n.audience === 'students' ||
                (n.audience === 'specific_class' && (currentUser.classId === n.classId)) ||
                (n.audience === 'specific_student' && n.targetId === currentUser.id);
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [notifications, currentUser]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-gray-500">Stay updated on important announcements</p>
                </div>
            </div>

            {userNotifications.length === 0 ? (
                <Card className="p-12 text-center text-gray-500 border-dashed">
                    <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Notifications Yet</p>
                    <p className="text-sm mt-1">When admins or mentors send you an update, it will appear here.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {userNotifications.map(notif => {
                        const isUnread = !(notif.readBy || []).includes(currentUser.id);
                        
                        // Map type to icons
                        const getIcon = () => {
                            switch(notif.type) {
                                case 'attendance': return <ClipboardCheck className="w-5 h-5" />;
                                case 'exam': return <GraduationCap className="w-5 h-5" />;
                                case 'leave': return <Calendar className="w-5 h-5" />;
                                case 'star': return <Trophy className="w-5 h-5" />;
                                case 'activity': return <Sparkles className="w-5 h-5" />;
                                default: 
                                    return notif.senderRole === 'Admin' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />;
                            }
                        };

                        const getIconColor = () => {
                            if (!isUnread) return 'bg-gray-100 text-gray-500';
                            switch(notif.type) {
                                case 'attendance': return 'bg-teal-100 text-teal-600';
                                case 'exam': return 'bg-amber-100 text-amber-600';
                                case 'leave': return 'bg-orange-100 text-orange-600';
                                case 'star': return 'bg-yellow-100 text-yellow-600';
                                case 'activity': return 'bg-purple-100 text-purple-600';
                                default: return 'bg-indigo-100 text-indigo-600';
                            }
                        };
                        
                        return (
                            <Card 
                                key={notif.id} 
                                className={`p-4 md:p-6 transition-all border-l-4 ${isUnread ? 'bg-indigo-50/50 border-l-indigo-500 border-indigo-200 shadow-md' : 'bg-white opacity-80 hover:opacity-100 border-l-transparent'}`}
                            >
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${getIconColor()}`}>
                                            {getIcon()}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-lg transition-colors ${isUnread ? 'font-bold text-indigo-900' : 'font-semibold text-gray-800'}`}>
                                                    {notif.title}
                                                </h4>
                                                {isUnread && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>}
                                            </div>
                                            <span className="text-[10px] md:text-xs font-medium text-gray-400 whitespace-nowrap flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-white bg-gray-900 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    {notif.senderRole}
                                                </span>
                                                <span className="text-xs font-bold text-gray-500">
                                                    {notif.senderName}
                                                </span>
                                            </div>
                                            {isUnread && (
                                                <button 
                                                    onClick={() => markNotificationAsRead(notif.id, currentUser.id)}
                                                    className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                                                >
                                                    Mark as Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentNotifications;
