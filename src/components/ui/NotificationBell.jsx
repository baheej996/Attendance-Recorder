import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, ClipboardCheck, GraduationCap, Calendar, Trophy, Sparkles, Shield, Users } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

export const NotificationBell = ({ user, autoPop = false, className = "" }) => {
    const { notifications, markNotificationAsRead } = useData();
    const navigate = useNavigate();
    const popupRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [hasAutoPopped, setHasAutoPopped] = useState(false);

    // Filter unread notifications meant for this user
    const userNotifications = (notifications || []).filter(n => {
        const isForUser = 
            n.audience === 'all' ||
            (user.role === 'student' && n.audience === 'students') ||
            (user.role === 'mentor' && n.audience === 'mentors') ||
            (n.audience === 'specific_class' && (user.classId === n.classId || (user.role === 'mentor' && user.assignedClassIds?.includes(n.classId)))) ||
            (n.targetId === user.id);
        
        return isForUser;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const unreadNotifications = userNotifications.filter(n => !(n.readBy || []).includes(user.id));
    const latestUnread = unreadNotifications[0];

    // Auto-pop logic
    useEffect(() => {
        if (autoPop && latestUnread && !hasAutoPopped) {
            setIsOpen(true);
            setHasAutoPopped(true);
        }
    }, [latestUnread, autoPop, hasAutoPopped]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleClose = async (e, id) => {
        e.stopPropagation();
        setIsOpen(false);
        if (id) {
            await markNotificationAsRead(id, user.id);
        }
    };

    const handleBellClick = () => {
        if (unreadNotifications.length > 0) {
            setIsOpen(!isOpen);
        } else {
            // If no unread, maybe navigate to the full list
            navigate(user.role === 'mentor' ? '/mentor/notifications' : '/student/notifications');
        }
    };

    return (
        <div className={`relative ${className}`} ref={popupRef}>
            {/* Bell Icon Button */}
            <button
                onClick={handleBellClick}
                className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors relative z-10"
            >
                <Bell className={clsx("w-5 h-5 md:w-6 md:h-6 text-gray-700", unreadNotifications.length > 0 && "animate-wiggle")} />
                {unreadNotifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full border-2 border-white animate-ping"></span>
                )}
                {unreadNotifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {/* Auto Popup for Latest Unread */}
            {isOpen && latestUnread && (
                <div className="absolute top-0 right-full mr-4 w-66 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200 z-50">
                    {/* Tooltip Arrow - Adjusted to match top alignment */}
                    <div className="absolute top-4 -right-1.5 w-3 h-3 bg-white border-r border-t border-gray-100 transform rotate-45"></div>
                    
                    <button 
                        onClick={(e) => handleClose(e, latestUnread.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg flex items-center justify-center transition-all border border-transparent hover:border-red-100 active:scale-95 z-50"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="relative z-10 pr-6 flex gap-3">
                        {/* Type Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                            latestUnread.type === 'attendance' ? 'bg-teal-100 text-teal-600' :
                            latestUnread.type === 'exam' ? 'bg-amber-100 text-amber-600' :
                            latestUnread.type === 'leave' ? 'bg-orange-100 text-orange-600' :
                            latestUnread.type === 'star' ? 'bg-yellow-100 text-yellow-600' :
                            latestUnread.type === 'activity' ? 'bg-purple-100 text-purple-600' :
                            'bg-indigo-100 text-indigo-600'
                        }`}>
                            {latestUnread.type === 'attendance' ? <ClipboardCheck className="w-5 h-5" /> :
                             latestUnread.type === 'exam' ? <GraduationCap className="w-5 h-5" /> :
                             latestUnread.type === 'leave' ? <Calendar className="w-5 h-5" /> :
                             latestUnread.type === 'star' ? <Trophy className="w-5 h-5" /> :
                             latestUnread.type === 'activity' ? <Sparkles className="w-5 h-5" /> :
                             latestUnread.senderRole === 'Admin' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                            {latestUnread.title && (
                                <h4 className="text-base font-bold text-indigo-900 mb-1 leading-tight truncate">
                                    {latestUnread.title}
                                </h4>
                            )}
                            <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                                    {latestUnread.message}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-medium">From: {latestUnread.senderName}</span>
                        <div className="flex items-center gap-2">
                            {user.role === 'mentor' && latestUnread.audience === 'specific_class' && (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                                    Broadcast to Class
                                </span>
                            )}
                            {unreadNotifications.length > 1 && (
                                <button 
                                    onClick={() => navigate(user.role === 'mentor' ? '/mentor/notifications' : '/student/notifications')}
                                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                                >
                                    +{unreadNotifications.length - 1} more
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* If opened but no unread (fallback, though handled by navigate usually) */}
            {isOpen && !latestUnread && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-3 text-center animate-in fade-in z-50">
                    <p className="text-xs text-gray-500">No new notifications.</p>
                </div>
            )}
        </div>
    );
};
