import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { MessageSquare, Send, User, Lock, Info, Award, Phone, BookOpen, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

import { PollCard } from '../components/chat/PollCard';
import { StarCard } from '../components/chat/StarCard';

const StudentChat = () => {
    const { currentUser, mentors, students, chatMessages, chatSettings, sendMessage, markMessagesAsRead, classes } = useData();
    const [messageInput, setMessageInput] = useState('');
    const [activeChatView, setActiveChatView] = useState('direct'); // 'direct' or 'group'
    const scrollRef = useRef(null);

    // Robust ID handling
    const currentUserId = currentUser?.id || (currentUser?.role === 'admin' ? 'admin' : null);

    // 1. Get Class Mentor
    const myMentor = mentors.find(m => m.assignedClassIds?.includes(currentUser.classId));

    // 2. Check if Chat is enabled for this class
    const isChatEnabled = () => {
        const setting = chatSettings.find(s => s.classId === currentUser.classId);
        return setting ? setting.isEnabled : false;
    };

    const isEnabled = isChatEnabled();

    // 3. Filter Messages
    const isGroupChat = activeChatView === 'group';
    const isAdminChat = activeChatView === 'admin';
    const activeChatId = isAdminChat ? 'admin' : (isGroupChat ? `mentor_group_${currentUser.classId}` : myMentor?.id);
    const currentClassSetting = chatSettings.find(s => s.classId === currentUser.classId);
    const canSendInGroup = currentClassSetting ? (currentClassSetting.allowStudentGroupChat !== false) : true;

    // 4. Group messages into conversational threads
    const currentMessages = chatMessages.filter(m =>
        isGroupChat
            ? m.receiverId === activeChatId
            : (m.senderId === currentUserId && m.receiverId === activeChatId) ||
            (m.senderId === activeChatId && m.receiverId === currentUserId)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentMessages]);

    // Mark as read
    useEffect(() => {
        if (activeChatId) {
            const unreadIds = currentMessages
                .filter(m => m.receiverId === currentUserId && !m.isRead)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                markMessagesAsRead(unreadIds);
            }
        }
    }, [activeChatId, currentMessages.length]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !currentUserId) return;
        if (!isAdminChat && (!myMentor || !isEnabled)) return;
        if (isGroupChat && !canSendInGroup) return; // Prevent send if mentor disabled it

        sendMessage({
            senderId: currentUserId,
            receiverId: activeChatId,
            // Always include classId so messages are visible to mentor's classId-based subscription
            classId: currentUser.classId || null,
            details: messageInput,
            type: 'text'
        });

        setMessageInput('');
    };

    if (!myMentor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
                <Info className="w-12 h-12 mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">No Mentor Assigned</h3>
                <p>Your class does not have an assigned mentor to chat with.</p>
            </div>
        );
    }

    if (!isEnabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
                <Lock className="w-12 h-12 mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">Chat Unavailable</h3>
                <p>Your mentor has disabled chat for this class.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
            <div className="h-full">
                {/* Full Width Chat Interface */}
                <div className="flex flex-col bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden h-full">
                    {/* Header */}
                    <div className="p-4 px-5 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black overflow-hidden shrink-0 shadow-sm border border-indigo-100">
                                {isAdminChat ? (
                                    <Shield className="w-5 h-5" />
                                ) : (
                                    isGroupChat ? (
                                        <BookOpen className="w-5 h-5" />
                                    ) : (
                                        myMentor.profilePhoto ? (
                                            <img src={myMentor.profilePhoto} alt={myMentor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5" />
                                        )
                                    )
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-black text-gray-900 leading-none truncate md:text-lg">
                                    {isAdminChat ? 'Admin Support' : (isGroupChat ? 'Academic Community' : myMentor.name)}
                                </h2>
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                    {isAdminChat ? (
                                        'School Helpdesk'
                                    ) : (
                                        isGroupChat ? (
                                            'Class Group Broadcast'
                                        ) : (
                                            <>
                                                <span className="text-indigo-500">Your Mentor</span>
                                                {myMentor.contactNumber && (
                                                    <span className="hidden md:inline text-gray-300">• {myMentor.contactNumber}</span>
                                                )}
                                            </>
                                        )
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Navigation: Tabs on Desktop, Dropdown on Mobile */}
                        <div className="flex bg-gray-50 p-1.5 rounded-2xl items-center shadow-inner">
                            {/* Desktop Tabs */}
                            <div className="hidden md:flex gap-1">
                                <button
                                    onClick={() => setActiveChatView('direct')}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeChatView === 'direct' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    Direct
                                </button>
                                <button
                                    onClick={() => setActiveChatView('group')}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeChatView === 'group' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    Group
                                </button>
                                <button
                                    onClick={() => setActiveChatView('admin')}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeChatView === 'admin' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    Admin
                                </button>
                            </div>

                            {/* Mobile Dropdown */}
                            <div className="md:hidden flex items-center pr-2">
                                <select
                                    value={activeChatView}
                                    onChange={(e) => setActiveChatView(e.target.value)}
                                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-indigo-600 outline-none cursor-pointer pr-1"
                                >
                                    <option value="direct">Direct Chat</option>
                                    <option value="group">Class Group</option>
                                    <option value="admin">Admin Support</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-5 py-6 space-y-6 bg-gray-50/50" ref={scrollRef}>
                        {currentMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-400">
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                                    <MessageSquare className="w-10 h-10 text-gray-100" />
                                </div>
                                <h3 className="font-black text-gray-900 leading-none">No messages yet</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-50">Say hello!</p>
                            </div>
                        ) : (
                            currentMessages.map(msg => {
                                return (
                                    <div
                                        key={msg.id}
                                        className={clsx(
                                            "flex flex-col max-w-[85%] md:max-w-[70%]",
                                            msg.senderId === currentUserId ? "ml-auto items-end" : "mr-auto items-start"
                                        )}
                                    >
                                        <div
                                            className={clsx(
                                                "px-4 py-2.5 rounded-2xl text-[13px] font-bold shadow-sm transition-all animate-in zoom-in-95",
                                                msg.senderId === currentUserId
                                                    ? "bg-indigo-600 text-white rounded-br-none"
                                                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"
                                            )}
                                        >
                                            {msg.type === 'reminder' ? (
                                                <PollCard data={msg.details} isSender={msg.senderId === currentUserId} />
                                            ) : msg.type === 'star-card' ? (
                                                <StarCard data={typeof msg.details === 'string' ? JSON.parse(msg.details) : msg.details} />
                                            ) : (
                                                msg.details
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 px-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                {format(new Date(msg.timestamp), 'h:mm a')}
                                            </span>
                                            {msg.senderId === currentUserId && (
                                                <span className={clsx("text-[9px] font-black uppercase", msg.isRead ? "text-indigo-400" : "text-gray-300")}>
                                                    • {msg.isRead ? 'Seen' : 'Sent'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-50 flex gap-3 shrink-0">
                        <input
                            type="text"
                            placeholder={isGroupChat && !canSendInGroup ? "Mentor mode active" : (isAdminChat ? "Speak with Admin..." : (isGroupChat ? "Message class..." : `Message ${myMentor.name}...`))}
                            className="flex-1 p-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-100 transition-all disabled:opacity-50"
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            disabled={isGroupChat && !canSendInGroup}
                        />
                        <button 
                            type="submit" 
                            disabled={!messageInput.trim() || (isGroupChat && !canSendInGroup)}
                            className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-transform disabled:opacity-30 disabled:shadow-none shrink-0"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentChat;
