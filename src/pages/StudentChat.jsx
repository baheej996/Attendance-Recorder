import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { MessageSquare, Send, User, Lock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

const StudentChat = () => {
    const { currentUser, mentors, chatMessages, chatSettings, sendMessage, markMessagesAsRead } = useData();
    const [messageInput, setMessageInput] = useState('');
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
    const currentMessages = chatMessages.filter(m =>
        (m.senderId === currentUser.id && m.receiverId === myMentor?.id) ||
        (m.senderId === myMentor?.id && m.receiverId === currentUser.id)
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
                .filter(m => m.receiverId === currentUser.id && !m.isRead)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                markMessagesAsRead(unreadIds);
            }
        }
    }, [myMentor, currentMessages.length]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !myMentor || !isEnabled) return;

        sendMessage({
            senderId: currentUser.id,
            receiverId: myMentor.id,
            classId: currentUser.classId,
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
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    M
                </div>
                <div>
                    <h1 className="font-bold text-gray-900">{myMentor.name}</h1>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> Class Mentor
                    </span>
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
                    currentMessages.map(msg => (
                        <div
                            key={msg.id}
                            className={clsx(
                                "flex flex-col max-w-[75%]",
                                msg.senderId === currentUser.id ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            <div
                                className={clsx(
                                    "px-4 py-2 rounded-2xl",
                                    msg.senderId === currentUser.id
                                        ? "bg-indigo-600 text-white rounded-br-none"
                                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                                )}
                            >
                                {msg.details}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {format(new Date(msg.timestamp), 'h:mm a')}
                                {msg.senderId === currentUser.id && (
                                    <span className="ml-1">{msg.isRead ? '• Read' : '• Sent'}</span>
                                )}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                />
                <Button type="submit" disabled={!messageInput.trim()}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
};

export default StudentChat;
