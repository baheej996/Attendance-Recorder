import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { MessageSquare, Send, User, Lock, Info, Award, Phone, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

import { PollCard } from '../components/chat/PollCard';
import { StarCard } from '../components/chat/StarCard';

const StudentChat = () => {
    const { currentUser, mentors, students, chatMessages, chatSettings, sendMessage, markMessagesAsRead, classes } = useData();
    const [messageInput, setMessageInput] = useState('');
    const [activeChatView, setActiveChatView] = useState('direct'); // 'direct' or 'group'
    const scrollRef = useRef(null);

    // 1. Identify the Mentor for this student's class
    // We take the first mentor found who is assigned to this student's class
    const myMentor = mentors.find(m => m.assignedClassIds && m.assignedClassIds.includes(currentUser.classId));

    // 2. Check if Chat is enabled for this class
    const isChatEnabled = () => {
        const setting = chatSettings.find(s => s.classId === currentUser.classId);
        return setting ? setting.isEnabled : false;
    };

    const isEnabled = isChatEnabled();

    // 3. Filter Messages
    const isGroupChat = activeChatView === 'group';
    const activeChatId = isGroupChat ? `mentor_group_${currentUser.classId}` : myMentor?.id;
    const currentClassSetting = chatSettings.find(s => s.classId === currentUser.classId);
    const canSendInGroup = currentClassSetting ? (currentClassSetting.allowStudentGroupChat !== false) : true;

    const currentMessages = chatMessages.filter(m =>
        isGroupChat
            ? m.receiverId === activeChatId
            : (m.senderId === currentUser.id && m.receiverId === activeChatId) ||
            (m.senderId === activeChatId && m.receiverId === currentUser.id)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentMessages]);

    // Mark as read
    useEffect(() => {
        if (myMentor) {
            const unreadIds = currentMessages
                .filter(m => m.receiverId === currentUser.id && !m.isRead) // Does not mark group messages as read to avoid confusing global state
                .map(m => m.id);

            if (unreadIds.length > 0) {
                markMessagesAsRead(unreadIds);
            }
        }
    }, [myMentor, currentMessages.length]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !myMentor || !isEnabled) return;
        if (isGroupChat && !canSendInGroup) return; // Prevent send if mentor disabled it

        sendMessage({
            senderId: currentUser.id,
            receiverId: activeChatId,
            classId: isGroupChat ? null : currentUser.classId,
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Left Column: Mentor Profile */}
                <div className="lg:col-span-1 overflow-y-auto">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-0">
                        <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div className="w-20 h-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
                                    {myMentor.profilePhoto ? (
                                        <img
                                            src={myMentor.profilePhoto}
                                            alt={myMentor.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300">
                                            <User className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 pb-6 px-6 text-center">
                            <h2 className="text-xl font-bold text-gray-900">{myMentor.name}</h2>
                            <p className="text-sm text-gray-500 font-medium mb-4">Class Mentor</p>

                            <div className="space-y-4 text-left">
                                {myMentor.qualification && (
                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-600">
                                            <Award className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Qualification</h4>
                                            <p className="text-sm font-semibold text-gray-800">{myMentor.qualification}</p>
                                        </div>
                                    </div>
                                )}

                                {myMentor.contactNumber && (
                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-600">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Contact</h4>
                                            <p className="text-sm font-medium text-gray-800 break-all">{myMentor.contactNumber}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-600">
                                        <Lock className="w-4 h-4" /> {/* Reusing Lock icon as generic Info for now if Mail not imported, or update imports */}
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</h4>
                                        <p className="text-sm font-medium text-gray-800 break-all">{myMentor.email}</p>
                                    </div>
                                </div>

                                {myMentor.assignedClassIds && myMentor.assignedClassIds.length > 0 && (
                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-600">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Classes Handling</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {myMentor.assignedClassIds.map(cid => {
                                                    const cls = classes.find(c => c.id === cid);
                                                    return cls ? (
                                                        <span key={cid} className={clsx(
                                                            "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                                            cid === currentUser.classId
                                                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                                                : "bg-white text-gray-500 border-gray-200"
                                                        )}>
                                                            {cls.name}-{cls.division}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Chat Interface */}
                <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                {isGroupChat ? 'G' : 'M'}
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-900">{isGroupChat ? 'Class Group' : 'Chat Room'}</h1>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <User className="w-3 h-3" /> {isGroupChat ? 'Broadcasts & Group Chat' : 'Direct Message'}
                                </span>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveChatView('direct')}
                                className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-all max-md:text-xs", !isGroupChat ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                            >
                                Direct
                            </button>
                            <button
                                onClick={() => setActiveChatView('group')}
                                className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-all max-md:text-xs", isGroupChat ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                            >
                                Group
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
                        {currentMessages.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Say hello to your mentor!</p>
                            </div>
                        ) : (
                            currentMessages.map(msg => {
                                const isMe = msg.senderId === currentUser.id;
                                let senderName = '';
                                if (isGroupChat && !isMe) {
                                    const senderStudent = students.find(s => s.id === msg.senderId);
                                    const senderMentor = mentors.find(m => m.id === msg.senderId);
                                    senderName = senderStudent ? senderStudent.name : (senderMentor ? `Mentor ${senderMentor.name}` : 'Unknown');
                                }

                                return (
                                    <div
                                        key={msg.id}
                                        className={clsx(
                                            "flex flex-col max-w-[85%]", // Increased width for better reading
                                            isMe ? "ml-auto items-end" : "mr-auto items-start"
                                        )}
                                    >
                                        {isGroupChat && !isMe && (
                                            <span className="text-xs text-gray-500 mb-1 ml-1 font-medium">{senderName}</span>
                                        )}
                                        <div
                                            className={clsx(
                                                "px-4 py-2 rounded-2xl",
                                                isMe
                                                    ? "bg-indigo-600 text-white rounded-br-none"
                                                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                                            )}
                                        >
                                            {msg.type === 'reminder' ? (
                                                <PollCard data={msg.details} isSender={isMe} />
                                            ) : msg.type === 'star-card' ? (
                                                <StarCard data={typeof msg.details === 'string' ? JSON.parse(msg.details) : msg.details} />
                                            ) : (
                                                msg.details
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                                            {format(new Date(msg.timestamp), 'h:mm a')}
                                            {isMe && (
                                                <span className="ml-1">{msg.isRead ? '• Read' : '• Sent'}</span>
                                            )}
                                        </span>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2 shrink-0">
                        <input
                            type="text"
                            placeholder={isGroupChat && !canSendInGroup ? "Only mentors can send messages to this group" : "Type a message..."}
                            className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-100"
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            disabled={isGroupChat && !canSendInGroup}
                        />
                        <Button type="submit" disabled={!messageInput.trim() || (isGroupChat && !canSendInGroup)}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentChat;
