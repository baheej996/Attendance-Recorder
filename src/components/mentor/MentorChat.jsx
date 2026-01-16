import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MessageSquare, Settings, Send, Search, User, CheckCircle, XCircle, Bell, Trash2 } from 'lucide-react';
import { PollCard } from '../chat/PollCard';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { format } from 'date-fns';
import { clsx } from 'clsx';

const MentorChat = () => {
    const {
        currentUser,
        students,
        classes,
        chatMessages,
        chatSettings,
        sendMessage,
        toggleChatForClass,
        markMessagesAsRead,
        activities,
        activitySubmissions,
        deleteChatConversation
    } = useData();

    const [activeTab, setActiveTab] = useState('inbox');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All'); // 'All' or classId
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const scrollRef = useRef(null);

    // Filter students belonging to mentor's classes
    // Filter students belonging to mentor's classes
    const assignedClassIds = currentUser?.assignedClassIds || [];
    const myStudents = students.filter(s => {
        const inAssignedClass = assignedClassIds.includes(s.classId);
        const matchesFilter = selectedFilter === 'All' || s.classId === selectedFilter;
        return inAssignedClass && matchesFilter;
    });

    // Get specific student object
    const selectedStudent = myStudents.find(s => s.id === selectedStudentId);

    // Messages for the selected conversation
    const currentMessages = chatMessages.filter(m =>
        (m.senderId === currentUser.id && m.receiverId === selectedStudentId) ||
        (m.senderId === selectedStudentId && m.receiverId === currentUser.id)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentMessages]);

    // Mark messages as read when opening conversation
    useEffect(() => {
        if (selectedStudentId) {
            const unreadIds = currentMessages
                .filter(m => m.receiverId === currentUser.id && !m.isRead)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                markMessagesAsRead(unreadIds);
            }
        }
    }, [selectedStudentId, currentMessages.length]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedStudentId) return;

        sendMessage({
            senderId: currentUser.id,
            receiverId: selectedStudentId,
            classId: selectedStudent?.classId,
            details: messageInput,
            type: 'text'
        });
        setMessageInput('');
    };

    const handleReminder = (e) => {
        e.preventDefault();
        if (!selectedStudent || !selectedStudentId) return;

        // 1. Find Pending Activities
        // Active activities for this class where the student has NOT completed the submission
        const pendingActivities = activities.filter(a =>
            a.classId === selectedStudent.classId &&
            a.status === 'Active' &&
            !activitySubmissions.some(s => s.activityId === a.id && s.studentId === selectedStudentId && s.status === 'Completed')
        );

        if (pendingActivities.length === 0) {
            alert("No pending work found for this student!");
            return;
        }

        const details = JSON.stringify({
            title: "Pending Work",
            items: pendingActivities.map(a => a.title)
        });

        sendMessage({
            senderId: currentUser.id,
            receiverId: selectedStudentId,
            classId: selectedStudent?.classId,
            details: details,
            type: 'reminder'
        });
    };

    const handleDeleteConversation = () => {
        if (!selectedStudentId) return;
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedStudentId) return;
        deleteChatConversation(selectedStudentId, currentUser.id);
        setIsDeleteModalOpen(false);
    };

    // Helper to get unread count for a student
    const getUnreadCount = (studentId) => {
        return chatMessages.filter(m => m.senderId === studentId && m.receiverId === currentUser.id && !m.isRead).length;
    };

    // Helper to get last message
    const getLastMessage = (studentId) => {
        const msgs = chatMessages.filter(m =>
            (m.senderId === currentUser.id && m.receiverId === studentId) ||
            (m.senderId === studentId && m.receiverId === currentUser.id)
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return msgs.length > 0 ? msgs[0] : null;
    };

    const filteredStudents = myStudents.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.registerNo.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        const lastMsgA = getLastMessage(a.id);
        const lastMsgB = getLastMessage(b.id);
        const timeA = lastMsgA ? new Date(lastMsgA.timestamp).getTime() : 0;
        const timeB = lastMsgB ? new Date(lastMsgB.timestamp).getTime() : 0;
        return timeB - timeA;
    });

    const isChatEnabled = (classId) => {
        const setting = chatSettings.find(s => s.classId === classId);
        return setting ? setting.isEnabled : false;
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col p-4 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mentor Chat</h1>
                    <p className="text-gray-500 text-sm">Communicate with your students</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'inbox' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        Inbox
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'settings' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        Settings
                    </button>
                </div>
            </div>

            {activeTab === 'inbox' ? (
                <div className="flex-1 flex gap-4 overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
                    {/* Sidebar */}
                    <div className="w-80 flex flex-col border-r border-gray-100">
                        <div className="p-4 border-b border-gray-100 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {/* Class Filters */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <button
                                    onClick={() => setSelectedFilter('All')}
                                    className={clsx(
                                        "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                        selectedFilter === 'All'
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    All
                                </button>
                                {assignedClassIds.map(classId => {
                                    const cls = classes.find(c => c.id === classId);
                                    if (!cls) return null;
                                    return (
                                        <button
                                            key={classId}
                                            onClick={() => setSelectedFilter(classId)}
                                            className={clsx(
                                                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                                selectedFilter === classId
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {cls.name}-{cls.division}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredStudents.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">No students found.</div>
                            ) : (
                                filteredStudents.map(student => {
                                    const unread = getUnreadCount(student.id);
                                    const lastMsg = getLastMessage(student.id);
                                    return (
                                        <button
                                            key={student.id}
                                            onClick={() => setSelectedStudentId(student.id)}
                                            className={clsx(
                                                "w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50",
                                                selectedStudentId === student.id && "bg-indigo-50 hover:bg-indigo-50"
                                            )}
                                        >
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                                    {student.name.charAt(0)}
                                                </div>
                                                {unread > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h4 className="font-medium text-gray-900 truncate">{student.name}</h4>
                                                    {lastMsg && (
                                                        <span className="text-xs text-gray-400 shrink-0">
                                                            {format(new Date(lastMsg.timestamp), 'MMM d')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={clsx("text-sm truncate", unread > 0 ? "font-medium text-gray-800" : "text-gray-500")}>
                                                    {lastMsg ? (
                                                        lastMsg.senderId === currentUser.id
                                                            ? `You: ${lastMsg.type === 'reminder' ? 'Sent a reminder' : lastMsg.details}`
                                                            : (lastMsg.type === 'reminder' ? 'Sent a reminder' : lastMsg.details)
                                                    ) : "No messages yet"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col text-sm">
                        {selectedStudent ? (
                            <>
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                            {selectedStudent.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{selectedStudent.name}</h3>
                                            <span className="text-gray-500 text-xs">Class {classes.find(c => c.id === selectedStudent.classId)?.name} - {classes.find(c => c.id === selectedStudent.classId)?.division}</span>
                                        </div>
                                    </div>
                                    {!isChatEnabled(selectedStudent.classId) && (
                                        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                                            <XCircle className="w-3 h-3" /> Chat Disabled
                                        </div>
                                    )}
                                    <button
                                        onClick={handleDeleteConversation}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Conversation"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
                                    {currentMessages.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                            <p>No messages yet. Start the conversation!</p>
                                        </div>
                                    ) : (
                                        currentMessages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={clsx(
                                                    "flex flex-col max-w-[70%]",
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
                                                    {msg.type === 'reminder' ? (
                                                        <PollCard data={msg.details} isSender={msg.senderId === currentUser.id} />
                                                    ) : (
                                                        msg.details
                                                    )}
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

                                <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleReminder}
                                        disabled={!isChatEnabled(selectedStudent.classId)}
                                        title="Send Pending Work Reminder"
                                        className="bg-yellow-50 text-yellow-600 border-yellow-100 hover:bg-yellow-100 px-3"
                                    >
                                        <Bell className="w-4 h-4" />
                                    </Button>
                                    <input
                                        type="text"
                                        placeholder={isChatEnabled(selectedStudent.classId) ? "Type a message..." : "Chat is disabled details for this class"}
                                        className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={messageInput}
                                        onChange={e => setMessageInput(e.target.value)}
                                        disabled={!isChatEnabled(selectedStudent.classId)}
                                    />
                                    <Button type="submit" disabled={!messageInput.trim() || !isChatEnabled(selectedStudent.classId)}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium">Select a student to start chatting</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl mx-auto w-full">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5" /> Chat Settings
                    </h2>
                    <div className="space-y-4">
                        {assignedClassIds.map(classId => {
                            const cls = classes.find(c => c.id === classId);
                            if (!cls) return null;
                            const enabled = isChatEnabled(classId);

                            return (
                                <div key={classId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Class {cls.name} - {cls.division}</h3>
                                        <p className="text-sm text-gray-500">
                                            {enabled
                                                ? "Students can currently message you."
                                                : "Chat is disabled for students in this class."}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => toggleChatForClass(classId)}
                                        className={clsx(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                            enabled ? "bg-indigo-600" : "bg-gray-200"
                                        )}
                                    >
                                        <span
                                            className={clsx(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                enabled ? "translate-x-6" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                            );
                        })}
                        {assignedClassIds.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No classes assigned.</p>
                        )}
                    </div>
                </div>
            )}


            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Conversation"
                message={`Are you sure you want to delete the chat history with ${selectedStudent?.name}? This action cannot be undone.`}
                confirmText="Delete Chat"
                isDanger={true}
            />
        </div>
    );
};

export default MentorChat;
