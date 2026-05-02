import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MessageSquare, Send, Search, User, Trash2, Shield, GraduationCap, Users } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const AdminChat = () => {
    const {
        currentUser,
        students,
        mentors,
        classes,
        chatMessages,
        sendMessage,
        markMessagesAsRead,
        deleteChatConversation
    } = useData();

    const [activeTab, setActiveTab] = useState('mentors'); // 'mentors' or 'students'
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const scrollRef = useRef(null);

    // Robust ID handling for Admin session
    const currentUserId = currentUser?.id || (currentUser?.role === 'admin' ? 'admin' : null);

    // Filter contacts based on search and tab
    const filteredMentors = mentors.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        const lastMsgA = getLastMessage(a.id);
        const lastMsgB = getLastMessage(b.id);
        const timeA = lastMsgA ? new Date(lastMsgA.timestamp).getTime() : 0;
        const timeB = lastMsgB ? new Date(lastMsgB.timestamp).getTime() : 0;
        return timeB - timeA;
    });

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.registerNo?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        const lastMsgA = getLastMessage(a.id);
        const lastMsgB = getLastMessage(b.id);
        const timeA = lastMsgA ? new Date(lastMsgA.timestamp).getTime() : 0;
        const timeB = lastMsgB ? new Date(lastMsgB.timestamp).getTime() : 0;
        return timeB - timeA;
    });

    const currentContacts = activeTab === 'mentors' ? filteredMentors : filteredStudents;
    const selectedContact = (activeTab === 'mentors' ? mentors : students).find(c => c.id === selectedContactId);

    // Messages for the selected conversation
    const currentMessages = chatMessages.filter(m =>
        (m.senderId === currentUserId && m.receiverId === selectedContactId) ||
        (m.senderId === selectedContactId && m.receiverId === currentUserId)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentMessages]);

    // Mark messages as read when opening conversation
    useEffect(() => {
        if (selectedContactId) {
            const unreadIds = currentMessages
                .filter(m => m.receiverId === currentUserId && !m.isRead)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                markMessagesAsRead(unreadIds);
            }
        }
    }, [selectedContactId, currentMessages.length]);

    // Helper to get unread count
    const getUnreadCount = (chatId) => {
        return chatMessages.filter(m => m.senderId === chatId && m.receiverId === currentUserId && !m.isRead).length;
    };

    // Helper to get last message
    function getLastMessage(chatId) {
        const msgs = chatMessages.filter(m =>
            (m.senderId === currentUserId && m.receiverId === chatId) ||
            (m.senderId === chatId && m.receiverId === currentUserId)
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return msgs.length > 0 ? msgs[0] : null;
    }

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedContactId || !currentUserId) return;

        // Resolve classId so the recipient's classId-based subscription can see this message.
        // For student recipients: use the student's own classId.
        // For mentor recipients: use their first assigned class as a routing key.
        let classId = null;
        if (activeTab === 'students') {
            const recipientStudent = students.find(s => s.id === selectedContactId);
            classId = recipientStudent?.classId || null;
        } else if (activeTab === 'mentors') {
            const recipientMentor = mentors.find(m => m.id === selectedContactId);
            classId = recipientMentor?.assignedClassIds?.[0] || null;
        }

        sendMessage({
            senderId: currentUserId,
            receiverId: selectedContactId,
            classId,
            details: messageInput,
            type: 'text'
        });

        setMessageInput('');
    };

    const confirmDelete = () => {
        if (!selectedContactId || !currentUserId) return;
        deleteChatConversation(selectedContactId, currentUserId);
        setIsDeleteModalOpen(false);
    };

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-indigo-600" /> Admin Chat
                    </h1>
                    <p className="text-gray-500 text-sm">Real-time support with mentors and students</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => { setActiveTab('mentors'); setSelectedContactId(null); }}
                        className={clsx(
                            "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                            activeTab === 'mentors' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Users className="w-4 h-4" /> Mentors
                    </button>
                    <button
                        onClick={() => { setActiveTab('students'); setSelectedContactId(null); }}
                        className={clsx(
                            "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                            activeTab === 'students' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <GraduationCap className="w-4 h-4" /> Students
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm relative">
                {/* Sidebar */}
                <div className={clsx(
                    "w-full md:w-80 flex flex-col border-r border-gray-100 absolute md:relative inset-0 bg-white z-10 transition-transform duration-300 md:translate-x-0",
                    selectedContactId ? "-translate-x-full md:translate-x-0" : "translate-x-0"
                )}>
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {currentContacts.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No {activeTab} found matching your search.
                            </div>
                        ) : (
                            currentContacts.map(contact => {
                                const unread = getUnreadCount(contact.id);
                                const lastMsg = getLastMessage(contact.id);
                                return (
                                    <button
                                        key={contact.id}
                                        onClick={() => setSelectedContactId(contact.id)}
                                        className={clsx(
                                            "w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-all text-left border-b border-gray-50",
                                            selectedContactId === contact.id && "bg-indigo-50/50"
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                                {contact.name.charAt(0)}
                                            </div>
                                            {unread > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-black">
                                                    {unread}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h4 className="font-bold text-gray-900 truncate">{contact.name}</h4>
                                                {lastMsg && (
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {format(new Date(lastMsg.timestamp), 'h:mm a')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={clsx("text-xs truncate", unread > 0 ? "font-bold text-gray-900" : "text-gray-500")}>
                                                {lastMsg ? (
                                                    lastMsg.senderId === currentUser.id ? `You: ${lastMsg.details}` : lastMsg.details
                                                ) : "Start a new conversation"}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-50/30">
                    {selectedContactId ? (
                        <>
                            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedContactId(null)}
                                        className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    </button>
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-indigo-100 shadow-lg">
                                        {selectedContact?.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-none">{selectedContact?.name}</h3>
                                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                                            {activeTab === 'mentors' ? (
                                                <span>Mentor</span>
                                            ) : (
                                                <>
                                                    <span>Student • {selectedContact?.registerNo}</span>
                                                    {(() => {
                                                        const studentClass = classes.find(c => c.id === selectedContact?.classId);
                                                        const mentor = mentors.find(m => m.assignedClassIds?.includes(selectedContact?.classId));
                                                        return (
                                                            <>
                                                                {studentClass && <span className="text-gray-400 capitalize">| Class {studentClass.name}-{studentClass.division}</span>}
                                                                {mentor && <span className="text-gray-400 capitalize">| Mentor: {mentor.name}</span>}
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete Conversation"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                {currentMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                        <MessageSquare className="w-16 h-16 mb-4" />
                                        <p className="font-bold uppercase tracking-widest text-xs">No history found</p>
                                    </div>
                                ) : (
                                    currentMessages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={clsx(
                                                "flex flex-col max-w-[80%]",
                                                msg.senderId === currentUserId ? "ml-auto items-end" : "mr-auto items-start"
                                            )}
                                        >
                                            <div className={clsx(
                                                "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm transition-all animate-in zoom-in-95",
                                                msg.senderId === currentUserId
                                                    ? "bg-indigo-600 text-white rounded-br-none"
                                                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"
                                            )}
                                        >
                                            {msg.details}
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
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Search details here..."
                                    className="flex-1 p-3 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-100 transition-all"
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                />
                                <Button type="submit" disabled={!messageInput.trim()} className="rounded-2xl w-12 h-12 flex items-center justify-center p-0 shadow-lg shadow-indigo-100 transition-transform active:scale-90">
                                    <Send className="w-5 h-5" />
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center p-8 bg-white/50 backdrop-blur-sm">
                            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-indigo-100/50 flex items-center justify-center mb-6">
                                <Shield className="w-12 h-12 text-indigo-100" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Support Center</h3>
                            <p className="text-sm font-bold text-gray-400 mt-2 max-w-xs uppercase tracking-widest leading-loose">
                                Select a mentor or student to begin real‑time support.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Erase History?"
                message={`Are you sure you want to delete the chat history with ${selectedContact?.name}? This action is permanent and cannot be reversed.`}
                confirmText="Erase All"
                isDanger={true}
            />
        </div>
    );
};

export default AdminChat;
