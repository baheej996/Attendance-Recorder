import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useData } from './DataContext';
import { useUI } from './UIContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { 
        currentUser, 
        unreadChats, 
        mentorTasks, 
        substitutionRequests, 
        leaveRequests 
    } = useData();
    const { showAlert } = useUI();
    const [permission, setPermission] = useState(() => {
        if (typeof window !== 'undefined' && "Notification" in window) {
            return window.Notification.permission;
        }
        return 'default';
    });
    const mountTime = useRef(new Date());
    const notifiedIds = useRef(new Set());

    // 1. Request Permission
    const requestPermission = async () => {
        if (typeof window === 'undefined' || !("Notification" in window) || !window.Notification.requestPermission) {
            console.warn("Notification API not supported in this browser.");
            return 'default';
        }
        try {
            const result = await window.Notification.requestPermission();
            setPermission(result);
            return result;
        } catch (e) {
            console.error("Failed to request notification permission:", e);
            return 'default';
        }
    };

    // 2. Core Show Notification Logic
    const showNotification = (title, options = {}) => {
        if (permission !== 'granted') return;

        // Browser/System Notification
        try {
            if ("Notification" in window && typeof window.Notification === 'function') {
                const n = new window.Notification(title, {
                    icon: '/favicon.png',
                    badge: '/favicon.png',
                    ...options
                });
                
                n.onclick = () => {
                    window.focus();
                    if (options.url) window.location.href = options.url;
                    n.close();
                };
            } else {
                throw new Error("Notification constructor not found");
            }
        } catch (e) {
            console.error("Native notification failed, falling back to service worker", e);
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        icon: '/favicon.png',
                        badge: '/favicon.png',
                        ...options
                    });
                });
            }
        }
    };

    // 3. Trigger Listeners
    useEffect(() => {
        if (!currentUser || permission !== 'granted') return;

        // Monitor Chat Messages
        const newChats = (unreadChats || []).filter(m => 
            new Date(m.timestamp) > mountTime.current &&
            !notifiedIds.current.has(m.id)
        );

        newChats.forEach(chat => {
            showNotification(`New Message from ${chat.senderName || 'Mentor'}`, {
                body: chat.content,
                url: currentUser.role === 'student' ? '/student/chat' : '/mentor/chat'
            });
            notifiedIds.current.add(chat.id);
        });

        // Monitor Tasks (for Mentors)
        if (currentUser.role === 'mentor') {
            const newTasks = (mentorTasks || []).filter(t => 
                (t.assignedTo === 'all' || (t.assignedTo || []).includes(currentUser.id)) &&
                new Date(t.createdAt) > mountTime.current &&
                !notifiedIds.current.has(t.id)
            );

            newTasks.forEach(task => {
                showNotification("New Professional Task", {
                    body: task.title,
                    url: '/mentor/tasks'
                });
                notifiedIds.current.add(task.id);
            });

            // Monitor Incoming Substitution Requests
            const newSubs = (substitutionRequests || []).filter(s => 
                s.substituteMentorId === currentUser.id &&
                s.status === 'Pending Substitute Approval' &&
                new Date(s.createdAt) > mountTime.current &&
                !notifiedIds.current.has(s.id)
            );

            newSubs.forEach(sub => {
                showNotification("Substitution Request", {
                    body: `New request from ${sub.requesterName} for ${sub.className}`,
                    url: '/mentor/substitution'
                });
                notifiedIds.current.add(sub.id);
            });

            // Monitor Leave Requests (for class teacher)
            const newLeaves = (leaveRequests || []).filter(l => 
                l.status === 'Pending' &&
                new Date(l.createdAt) > mountTime.current &&
                !notifiedIds.current.has(l.id)
            );

            newLeaves.forEach(leave => {
                showNotification("New Leave Request", {
                    body: `${leave.studentName} applied for leave`,
                    url: '/mentor/leaves'
                });
                notifiedIds.current.add(leave.id);
            });
        }

        // Admin Triggers
        if (currentUser.role === 'admin') {
            const pendingSubs = (substitutionRequests || []).filter(s => 
                s.status === 'Pending Admin Approval' &&
                new Date(s.createdAt) > mountTime.current &&
                !notifiedIds.current.has(s.id)
            );

            pendingSubs.forEach(sub => {
                showNotification("Admin Action: Substitution", {
                    body: `A substitution for ${sub.className} needs approval.`,
                    url: '/admin/substitutions'
                });
                notifiedIds.current.add(sub.id);
            });
        }

    }, [unreadChats, mentorTasks, substitutionRequests, leaveRequests, currentUser, permission]);

    return (
        <NotificationContext.Provider value={{ permission, requestPermission, showNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
