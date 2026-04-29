import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Bell, Send, Trash2, Users, AlertCircle, Shield, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';

const AdminNotifications = () => {
    const { currentUser, classes, mentors, students, notifications, addNotification, deleteNotification, updateNotification } = useData();
    const { showAlert } = useUI();

    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState('all');
    const [classId, setClassId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [showSeenBy, setShowSeenBy] = useState(null); // ID of notif to show seen list for

    const adminNotifications = (notifications || []).filter(n => n.senderRole === 'Admin').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;
        if (audience === 'specific_class' && !classId) return;

        const notifData = {
            title: title.trim(),
            message: message.trim(),
            audience,
            classId: audience === 'specific_class' ? classId : null,
            targetId: (audience === 'specific_mentor' || audience === 'specific_student') ? targetId : null,
        };

        if (editingId) {
            await updateNotification(editingId, notifData);
        } else {
            await addNotification({
                ...notifData,
                senderId: currentUser.id,
                senderName: currentUser.name || 'Administrator',
                senderRole: 'Admin'
            });
        }

        setIsCreating(false);
        setEditingId(null);
        setTitle('');
        setMessage('');
        setAudience('all');
        setClassId('');
        setTargetId('');
    };

    const handleEdit = (notif) => {
        setEditingId(notif.id);
        setTitle(notif.title);
        setMessage(notif.message);
        setAudience(notif.audience);
        setClassId(notif.classId || '');
        setTargetId(notif.targetId || '');
        setIsCreating(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingId(null);
        setTitle('');
        setMessage('');
        setAudience('all');
        setClassId('');
        setTargetId('');
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-indigo-600" />
                        Notification Manager
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Broadcast announcements to mentors, students, or entire classes.</p>
                </div>
                {!isCreating && (
                    <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsCreating(true)}>
                        <Send className="w-4 h-4" />
                        New Notification
                    </Button>
                )}
            </div>

            {isCreating && (
                <Card className="p-6 bg-indigo-50/50 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                        {editingId ? "Edit Notification" : "Draft New Notification"}
                    </h3>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="has-tooltip relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                                <select
                                    value={audience}
                                    onChange={(e) => {
                                        setAudience(e.target.value);
                                        if (e.target.value !== 'specific_class') setClassId('');
                                    }}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Everyone (Mentors & Students)</option>
                                    <option value="mentors">All Mentors</option>
                                    <option value="students">All Students</option>
                                    <option value="specific_class">Specific Class</option>
                                    <option value="specific_mentor">Specific Mentor</option>
                                    <option value="specific_student">Specific Student</option>
                                </select>
                            </div>

                            {audience === 'specific_class' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                                    <select
                                        value={classId}
                                        onChange={(e) => setClassId(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select a class...</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {audience === 'specific_mentor' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Mentor</label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Choose Mentor...</option>
                                        {mentors.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {audience === 'specific_student' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Choose Student...</option>
                                        {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({classes.find(c => c.id === s.classId)?.name || 'N/A'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Notice: Holiday Announcement"
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
                                {editingId ? "Update Notification" : "Broadcast Notification"}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Broadcast History</h3>
                {adminNotifications.length === 0 ? (
                    <Card className="p-12 text-center text-gray-500 border-dashed">
                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>No notifications have been sent yet.</p>
                    </Card>
                ) : (
                    adminNotifications.map(notif => (
                        <Card key={notif.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-gray-900">{notif.title}</h4>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Target: {
                                            notif.audience === 'specific_class' ? classes.find(c => c.id === notif.classId)?.name || 'Class' : 
                                            notif.audience === 'specific_mentor' ? `Mentor: ${mentors.find(m => m.id === notif.targetId)?.name || 'User'}` :
                                            notif.audience === 'specific_student' ? `Student: ${students.find(s => s.id === notif.targetId)?.name || 'User'}` :
                                            notif.audience
                                        }
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{notif.message}</p>
                                <div className="flex items-center gap-3 mt-3 relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowSeenBy(showSeenBy === notif.id ? null : notif.id);
                                        }}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 border ${showSeenBy === notif.id ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-inner' : 'bg-gray-50 text-gray-500 border-transparent hover:border-gray-200 hover:text-indigo-600'}`}
                                        title="Click to view names"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="text-xs font-bold">Seen by: {(notif.readBy || []).length}</span>
                                    </button>
                                    
                                    {showSeenBy === notif.id && (
                                        <div className="absolute top-10 left-0 p-4 bg-white border border-indigo-100 rounded-2xl shadow-2xl z-[60] min-w-[240px] animate-in fade-in zoom-in-95 slide-in-from-top-2">
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50">
                                                <h5 className="font-bold text-gray-900 text-sm">Read Receipts</h5>
                                                <button onClick={() => setShowSeenBy(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                                {(notif.readBy || []).length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic py-2">No one has viewed this yet.</p>
                                                ) : (
                                                    (notif.readBy || []).map(uid => {
                                                        const userProfile = mentors.find(m => m.id === uid) || students.find(s => s.id === uid);
                                                        return (
                                                            <div key={uid} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                                                <div className={`w-2 h-2 mt-1 rounded-full ${userProfile?.role === 'mentor' ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-bold text-gray-800 truncate">{userProfile?.name || 'Unknown User'}</p>
                                                                    <p className="text-[9px] text-gray-400 uppercase tracking-tighter">
                                                                        {userProfile?.role === 'student' ? (`Student • ${classes.find(c => c.id === userProfile.classId)?.name || 'N/A'}`) : 'Mentor'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-300">•</span>
                                    <span className="text-[11px] text-gray-400">{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</span>
                                </div>
                            </div>
                            <div className="flex-shrink-0 self-end md:self-center flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(notif)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit Note"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to delete this notification?")) {
                                            deleteNotification(notif.id);
                                        }
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Note"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminNotifications;
