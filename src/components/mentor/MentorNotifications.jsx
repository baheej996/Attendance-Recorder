import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Bell, Send, Trash2, Users, AlertCircle, Shield, Inbox, ArrowUpRight, Clock, Edit2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const MentorNotifications = () => {
    const { currentUser, classes, notifications, addNotification, deleteNotification, updateNotification, markNotificationAsRead } = useData();

    const [activeTab, setActiveTab] = useState('inbox'); // inbox or sent
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [classId, setClassId] = useState('');

    // Filter relevant classes for this mentor
    const mentorClasses = classes.filter(c => (currentUser.assignedClassIds || []).includes(c.id));

    // Inbox: Notifications meant for all, mentors, or their class (if any)
    const inboxNotifications = (notifications || []).filter(n => {
        // Exclude automated system notifications (activities, exams) meant for students
        if (n.type === 'activity' || n.type === 'exam') return false;

        const isTarget = n.audience === 'all' || n.audience === 'mentors' || 
                        (n.audience === 'specific_class' && mentorClasses.some(c => c.id === n.classId)) ||
                        (n.audience === 'specific_mentor' && n.targetId === currentUser.id);
        return isTarget && n.senderId !== currentUser.id;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Sent: Notifications created by this mentor
    const sentNotifications = (notifications || []).filter(n => n.senderId === currentUser.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim() || !classId) return;

        const notifData = {
            title: title.trim(),
            message: message.trim(),
            audience: 'specific_class',
            classId,
        };

        if (editingId) {
            await updateNotification(editingId, notifData);
        } else {
            await addNotification({
                ...notifData,
                senderId: currentUser.id,
                senderName: currentUser.name,
                senderRole: 'Mentor'
            });
        }

        setIsCreating(false);
        setEditingId(null);
        setTitle('');
        setMessage('');
        setClassId('');
        setActiveTab('sent');
    };

    const handleEdit = (notif) => {
        setEditingId(notif.id);
        setTitle(notif.title);
        setMessage(notif.message);
        setClassId(notif.classId);
        setIsCreating(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingId(null);
        setTitle('');
        setMessage('');
        setClassId('');
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-indigo-600" />
                        Notifications
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Read your announcements and send updates to your classes.</p>
                </div>
                {!isCreating && (
                    <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsCreating(true)}>
                        <Send className="w-4 h-4" />
                        New Notification
                    </Button>
                )}
            </div>

            {!isCreating && (
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'inbox' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Inbox className="w-4 h-4" />
                        Inbox
                        {inboxNotifications.filter(n => !(n.readBy || []).includes(currentUser.id)).length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                                {inboxNotifications.filter(n => !(n.readBy || []).includes(currentUser.id)).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'sent' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Sent
                    </button>
                </div>
            )}

            {isCreating && (
                <Card className="p-6 bg-indigo-50/50 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                        {editingId ? "Edit Notification" : "Draft New Notification"}
                    </h3>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Class</label>
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                required
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select an allotted class...</option>
                                {mentorClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Note: Bring your notebooks tomorrow"
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                required
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Write your announcement details here..."
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="secondary" type="button" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" className="gap-2">
                                {editingId ? <Edit2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                {editingId ? "Update Notification" : "Send to Class"}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {!isCreating && activeTab === 'inbox' && (
                <div className="space-y-4 animate-in fade-in">
                    {inboxNotifications.length === 0 ? (
                        <Card className="p-12 text-center text-gray-500 border-dashed">
                            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p>Your inbox is empty.</p>
                        </Card>
                    ) : (
                        inboxNotifications.map(notif => {
                            const isUnread = !(notif.readBy || []).includes(currentUser.id);
                            return (
                                <Card key={notif.id} className={`p-4 md:p-6 transition-all ${isUnread ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white opacity-80 border-gray-100 hover:opacity-100'}`}>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUnread ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {notif.senderRole === 'Admin' ? <Shield className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                                <h4 className={`text-lg transition-colors ${isUnread ? 'font-bold text-indigo-900' : 'font-semibold text-gray-800'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] md:text-xs font-medium text-gray-400 whitespace-nowrap flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                                                {notif.message}
                                            </p>
                                                <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                                                            From: {notif.senderName} ({notif.senderRole})
                                                        </span>
                                                        {notif.senderRole === 'Admin' && notif.audience === 'specific_class' && (
                                                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-full border border-amber-100">
                                                                Transmitted to Class: {classes.find(c => c.id === notif.classId)?.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isUnread && (
                                                        <button 
                                                            onClick={() => markNotificationAsRead(notif.id, currentUser.id)}
                                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                                        >
                                                            Mark as read
                                                        </button>
                                                    )}
                                                </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            )}

            {!isCreating && activeTab === 'sent' && (
                <div className="space-y-4 animate-in fade-in">
                    {sentNotifications.length === 0 ? (
                        <Card className="p-12 text-center text-gray-500 border-dashed">
                            <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p>You haven't sent any notifications yet.</p>
                        </Card>
                    ) : (
                        sentNotifications.map(notif => (
                            <Card key={notif.id} className="p-5 flex flex-col md:flex-row justify-between gap-4 py-4 hover:shadow-md transition-shadow bg-white">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900">{notif.title}</h4>
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            To Class: {classes.find(c => c.id === notif.classId)?.name || 'Unknown'} - {classes.find(c => c.id === notif.classId)?.division || ''}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{notif.message}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium whitespace-nowrap">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            Seen by: {(notif.readBy || []).length} students
                                        </span>
                                        <span>•</span>
                                        <span>{format(new Date(notif.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 self-end md:self-center flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(notif)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                        title="Edit Note"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Delete this notification? It will be removed from student dashboards.")) {
                                                deleteNotification(notif.id);
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                        title="Delete Note"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MentorNotifications;
