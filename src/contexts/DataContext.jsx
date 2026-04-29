import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    setDoc,
    query,
    getDocs,
    writeBatch,
    where,
    limit,
    orderBy,
    serverTimestamp,
    getCountFromServer
} from 'firebase/firestore';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // --- State Definitions ---
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [studentResponses, setStudentResponses] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [unreadChats, setUnreadChats] = useState([]);
    const [activities, setActivities] = useState([]);
    const [activitySubmissions, setActivitySubmissions] = useState([]);
    const [logEntries, setLogEntries] = useState([]);
    const [prayerRecords, setPrayerRecords] = useState([]);
    const [specialPrayers, setSpecialPrayers] = useState([]);

    const [ramadanLogs, setRamadanLogs] = useState([]);
    const [quranProgress, setQuranProgress] = useState([]);
    const [quranRecitations, setQuranRecitations] = useState([]);
    const [liveClasses, setLiveClasses] = useState([]);
    const [syllabi, setSyllabi] = useState([]);
    const [syllabusStatuses, setSyllabusStatuses] = useState([]);
    
    // Notifications
    const [notifications, setNotifications] = useState([]);
    // Class Substitution
    const [substitutionRequests, setSubstitutionRequests] = useState([]);
    
    // Admission Requests
    const [admissionRequests, setAdmissionRequests] = useState([]);

    // Mentor Tasks & Evaluations
    const [mentorTasks, setMentorTasks] = useState([]);
    const [evaluationForms, setEvaluationForms] = useState([]);
    const [evaluationSubmissions, setEvaluationSubmissions] = useState([]);

    // Settings & Misc
    const [questionSuggestions, setQuestionSuggestions] = useState([]);
    const [starDeclarations, setStarDeclarations] = useState([]);
    const [starConfigs, setStarConfigs] = useState([]); // Per-class configurations
    const [adminRequests, setAdminRequests] = useState([]);
    const [chatSettings, setChatSettings] = useState([]);
    const [mentorSettings, setMentorSettings] = useState({ sidebarOrder: [] });
    const [allMentorSettings, setAllMentorSettings] = useState([]); // Buffer for all settings if needed
    const [examSettings, setExamSettings] = useState([]);
    const [studentStatuses, setStudentStatuses] = useState(['Active', 'Inactive', 'Viva pending', 'Exam pending', 'Payment Pending', 'Suspended', 'Dismissed']);
    const [logLimit, setLogLimit] = useState(10);
    const [allStudentsLimit, setAllStudentsLimit] = useState(10);
    const [allMentorsLimit, setAllMentorsLimit] = useState(10);
    const [allClassesLimit, setAllClassesLimit] = useState(10);

    const [totalCounts, setTotalCounts] = useState({ students: 0, mentors: 0, classes: 0 });

    const loadMoreLogs = () => setLogLimit(prev => prev + 10);
    const loadMoreAllStudents = () => setAllStudentsLimit(prev => prev + 10);
    const loadMoreAllMentors = () => setAllMentorsLimit(prev => prev + 10);
    const loadMoreAllClasses = () => setAllClassesLimit(prev => prev + 10);

    // System Versioning
    const [appVersion] = useState(1777391306000); // Internal Build Timestamp
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    const [institutionSettings, setInstitutionSettings] = useState({
        name: 'Attendance Recorder',
        tagline: 'Track Smart, Act Fast',
        academicYear: '2024-2025',
        chiefMentor: 'Dr. Principal',
        favicon: '/favicon.png' 
    });
    const [adminCredentials, setAdminCredentials] = useState({ username: 'adminsgm', password: 'GlobalAdmin' });
    const [studentFeatureFlags, setStudentFeatureFlags] = useState({
        welcome: true,
        overview: true,
        activities: true,
        exams: true,
        results: true,
        leave: true,
        chat: true,
        prayer: true,
        history: true,
        leaderboard: true,
        star: true,
        "quran-recitation": true,
        help: true
    });
    const [mentorFeatureFlags, setMentorFeatureFlags] = useState({
        "quran-recitation": true
    });
    const [classFeatureFlags, setClassFeatureFlags] = useState([]);

    // Local Session State (No need to sync across devices)
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('currentUser');
        return saved ? JSON.parse(saved) : null;
    });

    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // --- Firestore Listeners ---
    
    // Helper to subscribe to a collection with custom query constraints
    const subscribe = (collectionName, setState, ...constraints) => {
        const q = query(collection(db, collectionName), ...constraints);
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setState(data);
        });
    };

    // 1. Global / Lightweight Subscriptions (Always needed)
    useEffect(() => {
        const unsubs = [
            subscribe('classes', setClasses),
            subscribe('subjects', setSubjects),
            subscribe('mentors', setMentors),
            subscribe('starConfigs', setStarConfigs),
            subscribe('classFeatureFlags', setClassFeatureFlags),
            subscribe('mentorSettings', setAllMentorSettings),
            subscribe('liveClasses', setLiveClasses),
            subscribe('syllabi', setSyllabi),
            subscribe('syllabusStatus', setSyllabusStatuses),
        ];

        const settingsUnsub = onSnapshot(collection(db, 'settings'), (snapshot) => {
            snapshot.docs.forEach(doc => {
                if (doc.id === 'institution') setInstitutionSettings(doc.data());
                if (doc.id === 'admin') setAdminCredentials(doc.data());
                if (doc.id === 'studentFeatures') setStudentFeatureFlags(doc.data());
                if (doc.id === 'mentorFeatures') setMentorFeatureFlags(doc.data());
                if (doc.id === 'system') {
                    const latest = doc.data().latestVersion || 0;
                    if (latest > appVersion) {
                        setIsUpdateAvailable(true);
                    }
                }
                if (doc.id === 'studentStatuses') {
                    const list = doc.data().list || [];
                    setStudentStatuses(list.includes('Inactive') ? list : (list.length > 0 ? [...list, 'Inactive'] : ['Active', 'Inactive', 'Viva pending', 'Exam pending', 'Payment Pending', 'Suspended', 'Dismissed']));
                }
            });
        });

        setIsDataLoaded(true);
        return () => {
            unsubs.forEach(u => u());
            settingsUnsub();
        };
    }, []);

    useEffect(() => {
        const fetchTotalCounts = async () => {
            try {
                const [studentSnap, mentorSnap, classSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'students')),
                    getCountFromServer(collection(db, 'mentors')),
                    getCountFromServer(collection(db, 'classes'))
                ]);
                setTotalCounts({
                    students: studentSnap.data().count,
                    mentors: mentorSnap.data().count,
                    classes: classSnap.data().count
                });
            } catch (error) {
                console.error("Error fetching total counts:", error);
            }
        };

        fetchTotalCounts();
        // Refresh counts every 5 minutes or when data changes significantly
        const interval = setInterval(fetchTotalCounts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // 2. User-Specific / Heavy Subscriptions (Filtered for Performance)
    useEffect(() => {
        if (!currentUser) {
            // Clear specific data on logout
            setAttendance([]);
            setStudents([]);
            setAllStudents([]);
            setResults([]);
            setPrayerRecords([]);
            setQuranRecitations([]);
            setChatMessages([]);
            setUnreadChats([]);
            return;
        }

        const unsubs = [];

        if (currentUser.role === 'student') {
            const uid = currentUser.id;
            const cid = currentUser.classId;

            unsubs.push(
                // Only their own data
                subscribe('attendance', setAttendance, where('studentId', '==', uid)),
                subscribe('results', setResults, where('studentId', '==', uid)),
                subscribe('prayerRecords', setPrayerRecords, where('studentId', '==', uid)),
                subscribe('quranRecitations', setQuranRecitations, where('studentId', '==', uid)),
                subscribe('quranProgress', setQuranProgress, where('studentId', '==', uid)),
                subscribe('studentResponses', setStudentResponses, where('studentId', '==', uid)),
                subscribe('leaveRequests', setLeaveRequests, where('studentId', '==', uid)),
                
                // Only data relevant to their class
                subscribe('exams', setExams, where('classId', '==', cid)),
                subscribe('activities', setActivities, where('classId', '==', cid)),
                subscribe('chatMessages', setChatMessages, where('classId', '==', cid), orderBy('timestamp', 'desc'), limit(150)),
                subscribe('chatMessages', setUnreadChats, where('receiverId', '==', uid), where('isRead', '==', false)),
                subscribe('notifications', setNotifications, where('audience', 'in', ['students', 'all', 'specific_class'])),
                
                // Limited classmate info for leaderboards
                subscribe('students', setStudents, where('classId', '==', cid))
            );
        } else if (currentUser.role === 'mentor') {
            const assignedClassIds = currentUser.assignedClassIds || (currentUser.classId ? [currentUser.classId] : []);

            unsubs.push(
                subscribe('students', setAllStudents, orderBy('name'), limit(allStudentsLimit)),
                subscribe('mentors', setMentors, orderBy('name'), limit(allMentorsLimit)),
                subscribe('classes', setClasses, orderBy('name'), limit(allClassesLimit))
            );

            if (assignedClassIds.length > 0) {
                unsubs.push(
                    subscribe('students', setStudents, where('classId', 'in', assignedClassIds)),
                    subscribe('attendance', setAttendance, where('classId', 'in', assignedClassIds), limit(2000)), 
                    subscribe('exams', setExams, where('classId', 'in', assignedClassIds)),
                    subscribe('results', setResults, where('classId', 'in', assignedClassIds), limit(2000)),
                    subscribe('chatMessages', setChatMessages, where('classId', 'in', assignedClassIds), orderBy('timestamp', 'desc'), limit(400)),
                    subscribe('activities', setActivities, where('classId', 'in', assignedClassIds)),
                    subscribe('quranRecitations', setQuranRecitations, where('classId', 'in', assignedClassIds)),
                    subscribe('leaveRequests', setLeaveRequests, where('classId', 'in', assignedClassIds))
                );
            }

            unsubs.push(
                subscribe('chatMessages', setUnreadChats, where('receiverId', '==', currentUser.id), where('isRead', '==', false)),
                subscribe('mentorTasks', setMentorTasks, where('mentorId', '==', currentUser.id)),
                subscribe('notifications', setNotifications, orderBy('createdAt', 'desc'), limit(100))
            );
        } else if (currentUser.role === 'admin') {
            // Admins still load more, but we can limit logs and chats
            unsubs.push(
                subscribe('students', setStudents),
                subscribe('exams', setExams),
                subscribe('activities', setActivities),
                subscribe('attendance', setAttendance, orderBy('date', 'desc'), limit(1000)),
                subscribe('quranRecitations', setQuranRecitations, limit(500)),
                subscribe('chatMessages', setChatMessages, orderBy('timestamp', 'desc'), limit(500)),
                subscribe('chatMessages', setUnreadChats, where('receiverId', '==', 'admin'), where('isRead', '==', false)),
                subscribe('notifications', setNotifications, orderBy('createdAt', 'desc')),
                subscribe('admissionRequests', setAdmissionRequests),
                subscribe('evaluationForms', setEvaluationForms),
                subscribe('evaluationSubmissions', setEvaluationSubmissions),
                subscribe('adminRequests', setAdminRequests)
            );
            
            // Note: Admins may still need full attendance/results for reports, 
            // but those should ideally be fetched on-demand in the reports page.
        }

        return () => unsubs.forEach(u => u());
    }, [currentUser]);

    // Separate Effect for Log Pagination (to avoid re-subscribing to everything else)
    useEffect(() => {
        if (!currentUser) {
            setLogEntries([]);
            return;
        }

        let q;
        if (currentUser.role === 'student') {
            q = query(collection(db, 'logEntries'), where('classId', '==', currentUser.classId), orderBy('timestamp', 'desc'), limit(logLimit));
        } else if (currentUser.role === 'mentor') {
            const assignedClassIds = currentUser.assignedClassIds || (currentUser.classId ? [currentUser.classId] : []);
            if (assignedClassIds.length > 0) {
                q = query(collection(db, 'logEntries'), where('classId', 'in', assignedClassIds), orderBy('timestamp', 'desc'), limit(logLimit));
            } else {
                setLogEntries([]);
                return;
            }
        } else if (currentUser.role === 'admin') {
            q = query(collection(db, 'logEntries'), orderBy('timestamp', 'desc'), limit(logLimit));
        }

        if (!q) return;

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setLogEntries(data);
        });

        return () => unsub();
    }, [currentUser, logLimit]);

    // Individual Mentor Settings computed based on current user
    useEffect(() => {
        if (currentUser && currentUser.role === 'mentor') {
            const personal = allMentorSettings.find(s => s.id === currentUser.id);
            if (personal) {
                setMentorSettings(personal);
            } else {
                setMentorSettings({ sidebarOrder: [] });
            }
        }
    }, [currentUser, allMentorSettings]);

    // --- Helper Logic for Notifications (defined early for scope) ---
    const addNotification = async (notif) => {
        await addDoc(collection(db, 'notifications'), {
            ...notif,
            readBy: [],
            createdAt: new Date().toISOString()
        });
    };

    const markNotificationAsRead = async (notificationId, userId) => {
        const notif = (notifications || []).find(n => n.id === notificationId);
        if (notif && !(notif.readBy || []).includes(userId)) {
            await updateDoc(doc(db, 'notifications', notificationId), {
                readBy: [...(notif.readBy || []), userId]
            });
        }
    };


    // --- Seeding Logic ---
    useEffect(() => {
        const checkAndSeed = async () => {
            try {
                // 1. Check classes to log initial connection
                const classesSnapshot = await getDocs(collection(db, 'classes'));
                if (classesSnapshot.empty) {
                    console.log("No classes found. App is ready for first class.");
                }

                // 2. Check and seed Settings individually
                // This prevents reverting to defaults if classes are empty but settings were already customized
                const institutionRef = doc(db, 'settings', 'institution');
                const instDoc = await getDocs(query(collection(db, 'settings')));
                
                // Helper to check if a specific doc ID exists in settings
                const hasSetting = (id) => instDoc.docs.some(d => d.id === id);

                // ONLY seed if the collection is truly empty 
                // This prevents accidental resets if the connection is slow
                if (instDoc.empty || !hasSetting('institution')) {
                    console.log("Initializing institution settings...");
                    await setDoc(institutionRef, {
                        name: 'Attendance Recorder',
                        tagline: 'Track Smart, Act Fast',
                        academicYear: '2024-2025',
                        chiefMentor: 'Dr. Principal',
                        favicon: '/favicon.png'
                    });
                }

                if (!hasSetting('admin')) {
                    console.log("Initializing admin credentials...");
                    await setDoc(doc(db, 'settings', 'admin'), { username: 'adminsgm', password: 'GlobalAdmin' });
                }

                if (!hasSetting('mentorUI')) {
                    await setDoc(doc(db, 'settings', 'mentorUI'), { sidebarOrder: [] });
                }

                if (!hasSetting('studentStatuses')) {
                    await setDoc(doc(db, 'settings', 'studentStatuses'), { 
                        list: ['Active', 'Inactive', 'Viva pending', 'Exam pending', 'Payment Pending', 'Suspended', 'Dismissed'] 
                    });
                } else {
                    // MIGRATION: Ensure 'Inactive' is added to existing list
                    const statusDoc = instDoc.docs.find(d => d.id === 'studentStatuses');
                    const currentList = statusDoc?.data().list || [];
                    if (!currentList.includes('Inactive')) {
                        console.log("Migrating student statuses to include 'Inactive'...");
                        await updateDoc(doc(db, 'settings', 'studentStatuses'), {
                            list: [...currentList, 'Inactive']
                        });
                    }
                }

                // 3. Seed Default Evaluation Form if none exist
                const formsSnap = await getDocs(collection(db, 'evaluationForms'));
                if (formsSnap.empty) {
                    console.log("Seeding default evaluation form template...");
                    const defaultEvaluationForm = {
                        title: "Monthly Evaluation Form Template",
                        month: "April",
                        year: "2026",
                        status: "Draft",
                        createdAt: new Date().toISOString(),
                        sections: [
                            {
                                id: "sec1",
                                title: "Performance",
                                questions: [
                                    { id: "q1", type: "radio", label: "Syllabus Completion", options: ["Fully completed", "Partially completed"], required: true },
                                    { id: "q2", type: "radio", label: "Focus on Special Attention needed Students", options: ["Satisfied", "Not complete"], required: true },
                                    { id: "q3", type: "radio", label: "Personal Interaction with Students & Parents", options: ["Average", "Above Average"], required: true },
                                    { id: "q4", type: "radio", label: "Additional Innovation in LMA (this month)", options: ["Yes", "No"], required: true }
                                ]
                            },
                            {
                                id: "sec2",
                                title: "Self Reflection",
                                questions: [
                                    { id: "q5", type: "radio", label: "Issues/Challenges Solved This Month", options: ["Yes", "No"], required: true },
                                    { id: "qsafe5", type: "short_answer", label: "If yes, specify challenges solved:", required: false },
                                    { id: "q6", type: "radio", label: "Personal Difficulties Faced While Solving Challenges", options: ["Yes", "No"], required: true },
                                    { id: "qsafe6", type: "short_answer", label: "If yes, specify difficulties:", required: false },
                                    { id: "q7", type: "radio", label: "Mental Status While Handling Issues", options: ["Interesting / Motivating", "Stressful"], required: true }
                                ]
                            },
                            {
                                id: "sec3",
                                title: "Ratings",
                                questions: [
                                    { id: "q8", type: "rating", label: "Total KHI of the Month", min: 1, max: 10, required: true },
                                    { id: "q9", type: "rating", label: "Work Balance & Punctuality Rating", min: 1, max: 10, required: true },
                                    { id: "q10", type: "rating", label: "Support & Guidance Received from Higher Authority", min: 1, max: 10, required: true }
                                ]
                            },
                            {
                                id: "sec4",
                                title: "Suggestions",
                                questions: [
                                    { id: "q11", type: "paragraph", label: "Suggestions Related to Technical Area", required: false },
                                    { id: "q12", type: "paragraph", label: "Suggestions Related to Welfare and Emotional Security", required: false },
                                    { id: "q13", type: "file", label: "Attach Documents/Evidence (Optional)", required: false }
                                ]
                            }
                        ]
                    };
                    await addDoc(collection(db, 'evaluationForms'), defaultEvaluationForm);
                }
            } catch (error) {
                console.error("Seeding/Check error:", error);
            }
        };

        checkAndSeed();
    }, []);


    // --- Auth Logic ---
    useEffect(() => {
        if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
        else localStorage.removeItem('currentUser');
    }, [currentUser]);

    const login = (user) => setCurrentUser(user);
    const logout = () => setCurrentUser(null);
    
    const impersonate = (targetUser) => {
        const impersonator = { ...currentUser };
        setCurrentUser({
            ...targetUser,
            isImpersonating: true,
            originalUser: impersonator
        });
    };

    const stopImpersonating = () => {
        if (currentUser?.isImpersonating && currentUser?.originalUser) {
            setCurrentUser(currentUser.originalUser);
        }
    };

    const validateAdmin = (username, password) => {
        return username === adminCredentials.username && password === adminCredentials.password;
    };


    // --- Actions ---
    // Helper to sync subjects when a class is added or its grade changes
    const syncSubjectsForClass = async (classId, gradeName) => {
        // Find existing subject templates from other classes of the same grade
        const existingSubjectsForGrade = subjects.filter(s => {
            const cls = classes.find(c => c.id === s.classId);
            return cls && cls.name === gradeName;
        });

        if (existingSubjectsForGrade.length === 0) return;

        // Group by name to get unique subject templates
        const uniqueTemplates = [...new Map(existingSubjectsForGrade.map(s => [s.name.toLowerCase(), s])).values()];
        
        const batch = writeBatch(db);
        let addedCount = 0;

        uniqueTemplates.forEach(template => {
            // Check if this class already has this subject
            const alreadyHas = subjects.some(s => s.classId === classId && s.name.toLowerCase() === template.name.toLowerCase());
            
            if (!alreadyHas) {
                const newSubRef = doc(collection(db, 'subjects'));
                batch.set(newSubRef, {
                    name: template.name,
                    classId: classId,
                    maxMarks: template.maxMarks || 100,
                    passMarks: template.passMarks || 40,
                    totalChapters: template.totalChapters || 0,
                    isExamSubject: template.isExamSubject !== undefined ? template.isExamSubject : true,
                    isClassSubject: template.isClassSubject !== undefined ? template.isClassSubject : true
                });
                addedCount++;
            }
        });

        if (addedCount > 0) {
            await batch.commit();
            console.log(`Synced ${addedCount} subjects to new/updated class ${classId}`);
        }
    };

    // Bulk repair for all classes - finds missing subjects based on grade templates
    const repairAllSubjects = async () => {
        const gradeTemplates = {}; // { gradeName: [ {name, maxMarks, passMarks, ...} ] }

        // 1. Build templates from existing subjects
        subjects.forEach(s => {
            const cls = classes.find(c => c.id === s.classId);
            if (!cls) return;
            if (!gradeTemplates[cls.name]) gradeTemplates[cls.name] = new Map();
            
            // Use Map to keep the most "complete" template (priority to subjects with chapters or marks)
            const template = gradeTemplates[cls.name].get(s.name.toLowerCase());
            if (!template || ((s.totalChapters || 0) > (template.totalChapters || 0))) {
                gradeTemplates[cls.name].set(s.name.toLowerCase(), s);
            }
        });

        // 2. Scan all classes and add missing subjects
        const batch = writeBatch(db);
        let globalAddedCount = 0;

        classes.forEach(cls => {
            const templates = gradeTemplates[cls.name];
            if (!templates) return;

            templates.forEach(template => {
                const hasIt = subjects.some(s => s.classId === cls.id && s.name.toLowerCase() === template.name.toLowerCase());
                if (!hasIt) {
                    const newSubRef = doc(collection(db, 'subjects'));
                    batch.set(newSubRef, {
                        name: template.name,
                        classId: cls.id,
                        maxMarks: template.maxMarks || 100,
                        passMarks: template.passMarks || 40,
                        totalChapters: template.totalChapters || 0,
                        isExamSubject: template.isExamSubject !== undefined ? template.isExamSubject : true,
                        isClassSubject: template.isClassSubject !== undefined ? template.isClassSubject : true
                    });
                    globalAddedCount++;
                }
            });
        });

        if (globalAddedCount > 0) {
            await batch.commit();
            return globalAddedCount;
        }
        return 0;
    };

    // Helper for adding/updating
    // Note: Firestore adds 'id' automatically on addDoc, but we want to return it properly or wait.
    // However, the listeners update the state.

    // Classes
    const addClass = async (cls) => {
        const docRef = await addDoc(collection(db, 'classes'), cls);
        await syncSubjectsForClass(docRef.id, cls.name);
        return docRef;
    };
    const updateClass = async (id, updated) => {
        const oldClass = classes.find(c => c.id === id);
        await updateDoc(doc(db, 'classes', id), updated);
        
        // If the grade name changed, trigger a re-sync
        if (updated.name && oldClass && updated.name !== oldClass.name) {
            await syncSubjectsForClass(id, updated.name);
        }
    };
    const performCascadingClassCleanup = (batch, id, currentMentors) => {
        // 1. Delete the main class document
        batch.delete(doc(db, 'classes', id));
        // 2. Cleanup orphaned Live Class config
        batch.delete(doc(db, 'liveClasses', id));
        // 3. Cleanup orphaned Class Feature Flags
        batch.delete(doc(db, 'classFeatureFlags', id));
        
        // 4. Cleanup mentor references
        currentMentors.forEach(mentor => {
            if (mentor.assignedClassIds && mentor.assignedClassIds.includes(id)) {
                const updatedIds = mentor.assignedClassIds.filter(classId => classId !== id);
                batch.update(doc(db, 'mentors', mentor.id), { assignedClassIds: updatedIds });
            }
        });
    };

    const deleteClass = async (id) => {
        const batch = writeBatch(db);
        performCascadingClassCleanup(batch, id, mentors);
        await batch.commit();
    };

    // Bulk delete (used in settings)
    const deleteClasses = async (ids) => {
        const batch = writeBatch(db);
        ids.forEach(id => performCascadingClassCleanup(batch, id, mentors));
        await batch.commit();
    };

    const transferStudentsAndBulkDeleteClass = async (sourceClassId, targetClassId, currentStudents) => {
        const batch = writeBatch(db);
        
        // 1. Transfer all relevant students
        const studentsToTransfer = currentStudents.filter(s => s.classId === sourceClassId);
        studentsToTransfer.forEach(student => {
            batch.update(doc(db, 'students', student.id), { classId: targetClassId });
        });

        // 2. Cascade delete the source class
        performCascadingClassCleanup(batch, sourceClassId, mentors);
        
        await batch.commit();
    };


    // Students
    const addStudent = async (student) => await addDoc(collection(db, 'students'), { ...student, status: 'Active' });
    const updateStudent = async (id, updated) => await updateDoc(doc(db, 'students', id), updated);
    const deleteStudent = async (id) => await deleteDoc(doc(db, 'students', id));
    const deleteStudents = async (ids) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, 'students', id)));
        await batch.commit();
    };

    const deleteAllStudents = async () => {
        const CHUNK_SIZE = 400;
        const chunks = [];
        for (let i = 0; i < students.length; i += CHUNK_SIZE) {
            chunks.push(students.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(s => batch.delete(doc(db, 'students', s.id)));
            await batch.commit();
        }
    };

    // Mentors
    const addMentor = async (mentor) => await addDoc(collection(db, 'mentors'), mentor);
    const updateMentor = async (id, updated) => await updateDoc(doc(db, 'mentors', id), updated);
    const deleteMentor = async (id) => await deleteDoc(doc(db, 'mentors', id));
    const deleteMentors = async (ids) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, 'mentors', id)));
        await batch.commit();
    };

    // Subjects
    const addSubject = async (subject) => await addDoc(collection(db, 'subjects'), subject);
    const updateSubject = async (id, updated) => await updateDoc(doc(db, 'subjects', id), updated);
    const deleteSubject = async (id) => await deleteDoc(doc(db, 'subjects', id));
    const deleteSubjects = async (ids) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, 'subjects', id)));
        await batch.commit();
    };

    // Exams
    const addExam = async (exam) => {
        const docRef = await addDoc(collection(db, 'exams'), { ...exam, status: 'Draft', isActive: false });
        if (exam.status === 'Published') {
            await addNotification({
                title: 'New Exam Scheduled',
                message: `A new exam "${exam.name}" has been published. Please check your schedule.`,
                audience: exam.audience === 'class' ? 'specific_class' : 'students',
                classId: exam.classId || null,
                senderId: currentUser?.id || 'admin',
                senderName: currentUser?.name || 'Admin',
                senderRole: currentUser?.role || 'admin',
                type: 'exam'
            });
        }
        return docRef;
    };

    const updateExam = async (id, updated) => {
        const oldExam = exams.find(e => e.id === id);
        await updateDoc(doc(db, 'exams', id), updated);
        
        if (updated.status === 'Published' && oldExam?.status !== 'Published') {
            await addNotification({
                title: 'New Exam Published',
                message: `The exam "${updated.name || oldExam.name}" is now published. Please attend it at the scheduled time.`,
                audience: (updated.audience || oldExam.audience) === 'class' ? 'specific_class' : 'students',
                classId: updated.classId || oldExam.classId || null,
                senderId: currentUser?.id || 'admin',
                senderName: currentUser?.name || 'Admin',
                senderRole: currentUser?.role || 'admin',
                type: 'exam'
            });
        }
    };

    const deleteExam = async (id) => await deleteDoc(doc(db, 'exams', id));

    // Questions
    const addQuestion = async (q) => await addDoc(collection(db, 'questions'), q);
    const deleteQuestion = async (id) => await deleteDoc(doc(db, 'questions', id));
    const updateQuestion = async (id, updated) => {
        // Need oldQ for logic check? We can just update, and if critical fields change, trigger regrade.
        // For simplicity, we update first.
        const qRef = doc(db, 'questions', id);
        await updateDoc(qRef, updated);

        // Regrade logic - fetching fresh data to be safe or passing in
        if (updated.correctAnswer || updated.marks) {
            // Trigger regrade logic similar to before but async
            // Optimization: Maybe do this in a cloud function later? 
            // For now, client-side regrade is tricky with async state.
            // Let's rely on standard flow.
            // If the user needs regrading, we might need a dedicated button or manual trigger to avoid race conditions.
            // Or just update the local calculation logic when viewing results.
            console.log("Question updated. Regrading is complex in real-time sync. Recommended to re-submit.");
        }
    };

    // Results & Responses
    const submitExam = async (submission) => {
        const timestamp = new Date().toISOString();

        // Calculate Score locally before saving (optimistic)
        // Need to fetch questions for this exam/subject
        // This is tricky without synchronous access to 'questions'.
        // We use the current 'questions' state.

        let score = 0;
        const relevantQuestions = questions.filter(q =>
            q.subjectId === (submission.subjectName || submission.subjectId) &&
            q.examId === submission.examId
        );

        relevantQuestions.forEach(q => {
            const studentAns = submission.answers[q.id];
            if (q.type === 'MCQ' && studentAns === q.correctAnswer) {
                score += Number(q.marks);
            }
        });

        // Save Response
        const newResponse = {
            ...submission,
            timestamp,
            status: 'Submitted',
            autoScore: score
        };

        // Remove old response if exists (Firestore doesn't have multi-field unique constraint easily)
        // We find the old doc ID first.
        const oldResp = studentResponses.find(r =>
            r.examId === submission.examId &&
            r.subjectId === submission.subjectId &&
            r.studentId === submission.studentId
        );
        if (oldResp && oldResp.id) await deleteDoc(doc(db, 'studentResponses', oldResp.id));
        await addDoc(collection(db, 'studentResponses'), newResponse);

        // Save Result
        const oldRes = results.find(r =>
            r.examId === submission.examId &&
            r.subjectId === submission.subjectId &&
            r.studentId === submission.studentId
        );
        const resultData = {
            examId: submission.examId,
            subjectId: submission.subjectId,
            studentId: submission.studentId,
            marks: score,
            timestamp
        };
        if (oldRes && oldRes.id) await updateDoc(doc(db, 'results', oldRes.id), resultData);
        else await addDoc(collection(db, 'results'), resultData);
    };

    const recordResult = async (data) => {
        const timestamp = new Date().toISOString();
        const batch = writeBatch(db);

        data.records.forEach(r => {
            // Check for existing result to update or add new
            // This is hard to do in a batch without reading first.
            // Simple approach: Add new documents.
            // Cleanup: The UI filters duplicates or we should properly manage IDs.
            // Better: use setDoc with a composite ID if possible? 
            // Composite ID: `${examId}_${subjectId}_${studentId}`
            const docId = `${data.examId}_${data.subjectId}_${r.studentId}`;
            const ref = doc(db, 'results', docId);
            batch.set(ref, {
                examId: data.examId,
                subjectId: data.subjectId,
                studentId: r.studentId,
                marks: r.marks,
                timestamp
            });
        });
        await batch.commit();
    };

    const deleteResultBatch = async (examId, subjectId, studentIds) => {
        const batch = writeBatch(db);
        const toDelete = results.filter(r => r.examId === examId && r.subjectId === subjectId && studentIds.includes(r.studentId));
        toDelete.forEach(r => batch.delete(doc(db, 'results', r.id)));
        await batch.commit();
    };

    const deleteExamResultsForClass = async (examId, studentIds) => {
        if (!studentIds || studentIds.length === 0) return;
        const batch = writeBatch(db);
        const toDelete = results.filter(r => r.examId === examId && studentIds.includes(r.studentId));
        toDelete.forEach(r => batch.delete(doc(db, 'results', r.id)));
        await batch.commit();
    };

    // Attendance
    const recordAttendance = async (record) => {
        const batch = writeBatch(db);
        record.records.forEach(r => {
            // Composite ID: `${date}_${studentId}`
            const docId = `${record.date}_${r.studentId}`;
            const ref = doc(db, 'attendance', docId);
            batch.set(ref, {
                date: record.date,
                studentId: r.studentId,
                classId: record.classId, // Added missing field
                status: r.status,
                mentorId: record.mentorId,
                recordedAt: serverTimestamp()
            });
        });
        await batch.commit();

        // Send a notification to the class
        const targetClassId = record.classId || (students.find(s => s.id === record.records[0]?.studentId))?.classId;
        
        if (targetClassId) {
            await addNotification({
                title: 'Attendance Recorded',
                message: `Your attendance for ${record.date} has been recorded.`,
                audience: 'specific_class',
                classId: targetClassId,
                senderId: record.mentorId,
                senderName: currentUser?.name || 'Mentor',
                senderRole: 'mentor',
                type: 'attendance'
            });
        }
    };

    const deleteAttendanceBatch = async (date, studentIds) => {
        const batch = writeBatch(db);
        const toDelete = attendance.filter(r => r.date === date && studentIds.includes(r.studentId));
        toDelete.forEach(r => batch.delete(doc(db, 'attendance', r.id)));
        await batch.commit();
    };

    const deleteAllAttendanceForStudentIds = async (studentIds) => {
        const batch = writeBatch(db);
        const toDelete = attendance.filter(r => studentIds.includes(r.studentId));
        toDelete.forEach(r => batch.delete(doc(db, 'attendance', r.id)));
        await batch.commit();
    };


    // Settings Updates
    const updateInstitutionSettings = async (newSettings) => {
        // Use { merge: true } to prevent accidental erasure of extra fields 
        // and avoid dependency on potentially stale local state
        await setDoc(doc(db, 'settings', 'institution'), newSettings, { merge: true });
    };

    const updateAdminCredentials = async (username, password) => {
        await setDoc(doc(db, 'settings', 'admin'), { username, password });
    };

    const updateStudentStatuses = async (newList) => {
        await setDoc(doc(db, 'settings', 'studentStatuses'), { list: newList });
    };

    // Reset Data (Optional, be careful!)
    const resetData = async () => {
        const batch = writeBatch(db);
        
        // Define all collections to be cleared for a fresh academic year
        const collectionsToClear = [
            { items: classes, name: 'classes' },
            { items: students, name: 'students' },
            { items: mentors, name: 'mentors' },
            { items: attendance, name: 'attendance' },
            { items: subjects, name: 'subjects' },
            { items: exams, name: 'exams' },
            { items: results, name: 'results' },
            { items: questions, name: 'questions' },
            { items: studentResponses, name: 'studentResponses' },
            { items: leaveRequests, name: 'leaveRequests' },
            { items: chatMessages, name: 'chatMessages' },
            { items: activities, name: 'activities' },
            { items: activitySubmissions, name: 'activitySubmissions' },
            { items: logEntries, name: 'logEntries' },
            { items: prayerRecords, name: 'prayerRecords' },
            { items: specialPrayers, name: 'specialPrayers' },
            { items: ramadanLogs, name: 'ramadanLogs' },
            { items: quranProgress, name: 'quranProgress' },
            { items: liveClasses, name: 'liveClasses' },
            { items: syllabi, name: 'syllabi' },
            { items: questionSuggestions, name: 'questionSuggestions' },
            { items: starDeclarations, name: 'starDeclarations' },
            { items: starConfigs, name: 'starConfigs' },
            { items: adminRequests, name: 'adminRequests' },
            { items: examSettings, name: 'examSettings' },
            { items: chatSettings, name: 'chatSettings' },
            { items: classFeatureFlags, name: 'classFeatureFlags' },
            { items: substitutionRequests, name: 'substitutionRequests' },
            { items: admissionRequests, name: 'admissionRequests' }
        ];

        try {
            // Firestore batches are limited to 500 operations
            // We'll process each collection in safe batches
            for (const col of collectionsToClear) {
                if (col.items.length === 0) continue;
                
                // Process in chunks of 450 to be safe
                const CHUNK_SIZE = 450;
                for (let i = 0; i < col.items.length; i += CHUNK_SIZE) {
                    const subBatch = writeBatch(db);
                    const chunk = col.items.slice(i, i + CHUNK_SIZE);
                    chunk.forEach(item => {
                        subBatch.delete(doc(db, col.name, item.id));
                    });
                    await subBatch.commit();
                }
            }
            console.log("System Reset: All academic data cleared successfully.");
        } catch (error) {
            console.error("Critical error during system reset:", error);
            throw error; // Let UI handle error display
        }
    };


    // Mentor Tasks Actions
    const addMentorTask = async (taskData) => {
        await addDoc(collection(db, 'mentorTasks'), {
            ...taskData,
            createdAt: new Date().toISOString(),
            submissions: {} // mentorId: { completed: bool, completedAt: iso }
        });
    };

    const updateMentorTask = async (taskId, updates) => {
        await updateDoc(doc(db, 'mentorTasks', taskId), updates);
    };

    const deleteMentorTask = async (taskId) => {
        await deleteDoc(doc(db, 'mentorTasks', taskId));
    };

    const toggleMentorTaskStatus = async (taskId, mentorId, isCompleted) => {
        const task = mentorTasks.find(t => t.id === taskId);
        if (!task) return;

        const submissions = { ...task.submissions };
        if (isCompleted) {
            submissions[mentorId] = {
                status: 'completed',
                completed: true,
                completedAt: new Date().toISOString()
            };
        } else {
            delete submissions[mentorId];
        }

        await updateDoc(doc(db, 'mentorTasks', taskId), { submissions });
    };

    const submitMentorTask = async (taskId, mentorId) => {
        const task = mentorTasks.find(t => t.id === taskId);
        if (!task) return;

        const submissions = { ...task.submissions };
        submissions[mentorId] = {
            status: 'under_review',
            submittedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'mentorTasks', taskId), { submissions });
    };

    const resolveMentorTask = async (taskId, mentorId, approved, note = '') => {
        const task = mentorTasks.find(t => t.id === taskId);
        if (!task) return;

        const submissions = { ...task.submissions };
        if (approved) {
            submissions[mentorId] = {
                ...submissions[mentorId],
                status: 'completed',
                completed: true,
                completedAt: new Date().toISOString(),
                adminNote: note
            };
        } else {
            submissions[mentorId] = {
                ...submissions[mentorId],
                status: 'rejected',
                rejectedAt: new Date().toISOString(),
                adminNote: note
            };
        }

        await updateDoc(doc(db, 'mentorTasks', taskId), { submissions });
    };

    const clearSubstitutionRequests = async () => {
        if (substitutionRequests.length === 0) return;
        const batch = writeBatch(db);
        substitutionRequests.forEach(req => batch.delete(doc(db, 'substitutionRequests', req.id)));
        await batch.commit();
        console.log("Substitution data cleared.");
    };

    // Activities
    const addActivity = async (activity) => {
        const docRef = await addDoc(collection(db, 'activities'), { ...activity, status: 'Active', createdAt: new Date().toISOString() });
        await addNotification({
            title: 'New Activity Assigned',
            message: `A new activity "${activity.title}" has been posted for your class.`,
            audience: 'specific_class',
            classId: activity.classId,
            senderId: currentUser?.id,
            senderName: currentUser?.name,
            senderRole: currentUser?.role,
            type: 'activity'
        });
        return docRef;
    };
    const updateActivity = async (id, updates) => await updateDoc(doc(db, 'activities', id), updates);
    const deleteActivity = async (id) => await deleteDoc(doc(db, 'activities', id));
    const toggleActivityStatus = async (id) => {
        const act = activities.find(a => a.id === id);
        if (act) await updateDoc(doc(db, 'activities', id), { status: act.status === 'Active' ? 'Inactive' : 'Active' });
    };

    const markActivityAsDone = async (activityId, studentId, points = 0) => {
        // Check existing
        const existing = activitySubmissions.find(s => s.activityId === activityId && s.studentId === studentId);
        if (existing) {
            await updateDoc(doc(db, 'activitySubmissions', existing.id), { status: 'Completed', points, timestamp: new Date().toISOString() });
        } else {
            await addDoc(collection(db, 'activitySubmissions'), { activityId, studentId, status: 'Completed', points, timestamp: new Date().toISOString() });
        }
    };

    const markActivityAsPending = async (activityId, studentId) => {
        const existing = activitySubmissions.find(s => s.activityId === activityId && s.studentId === studentId);
        if (existing) await deleteDoc(doc(db, 'activitySubmissions', existing.id));
    };

    const getStudentActivityPoints = (studentId) => {
        return activitySubmissions
            .filter(s => s.studentId === studentId && s.status === 'Completed')
            .reduce((sum, s) => sum + (Number(s.points) || 0), 0);
    };

    // Log Entries
    const addLogEntry = async (entry) => {
        const docRef = await addDoc(collection(db, 'logEntries'), { ...entry, timestamp: new Date().toISOString() });
        
        // Update Syllabus Status
        if (entry.classId && entry.subjectId && entry.chapter) {
            const statusId = `${entry.classId}_${entry.subjectId}`;
            const chapter = entry.chapter.trim();
            
            // Get existing or create new
            const existing = syllabusStatuses.find(s => s.id === statusId);
            const completedChapters = existing ? [...(existing.completedChapters || [])] : [];
            
            if (!completedChapters.includes(chapter)) {
                completedChapters.push(chapter);
                await setDoc(doc(db, 'syllabusStatus', statusId), {
                    classId: entry.classId,
                    subjectId: entry.subjectId,
                    completedChapters
                }, { merge: true });
            }
        }
        return docRef;
    };

    const updateLogEntry = async (id, updates) => {
        await updateDoc(doc(db, 'logEntries', id), updates);
        // Note: For heavy editing, run syncSyllabusStatus from Admin.
    };

    const deleteLogEntry = async (id) => {
        const log = logEntries.find(l => l.id === id);
        await deleteDoc(doc(db, 'logEntries', id));

        if (log && log.classId && log.subjectId && log.chapter) {
            const chapter = log.chapter.trim();
            // Check if any OTHER logs exist for this same chapter
            const q = query(collection(db, 'logEntries'), 
                where('classId', '==', log.classId), 
                where('subjectId', '==', log.subjectId),
                where('chapter', '==', log.chapter),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                // No more logs for this chapter, remove it from syllabus status
                const statusId = `${log.classId}_${log.subjectId}`;
                const existing = syllabusStatuses.find(s => s.id === statusId);
                if (existing) {
                    const updated = (existing.completedChapters || []).filter(ch => ch !== chapter);
                    await updateDoc(doc(db, 'syllabusStatus', statusId), { completedChapters: updated });
                }
            }
        }
    };

    const syncSyllabusStatus = async () => {
        const snapshot = await getDocs(collection(db, 'logEntries'));
        const allLogs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        
        const statusMap = {};
        allLogs.forEach(log => {
            if (log.classId && log.subjectId && log.chapter) {
                const id = `${log.classId}_${log.subjectId}`;
                if (!statusMap[id]) {
                    statusMap[id] = {
                        classId: log.classId,
                        subjectId: log.subjectId,
                        completedChapters: new Set()
                    };
                }
                statusMap[id].completedChapters.add(log.chapter.trim());
            }
        });
        
        const batch = writeBatch(db);
        Object.entries(statusMap).forEach(([id, data]) => {
            batch.set(doc(db, 'syllabusStatus', id), {
                ...data,
                completedChapters: Array.from(data.completedChapters)
            });
        });
        
        await batch.commit();
        return allLogs.length;
    };

    // Prayer Records
    const addPrayerRecord = async (record) => {
        // Composite ID for uniqueness per day per student
        const docId = `${record.date}_${record.studentId}`;
        await setDoc(doc(db, 'prayerRecords', docId), { ...record, timestamp: new Date().toISOString() });
    };
    const getPrayerRecordsByStudent = (studentId) => prayerRecords.filter(r => r.studentId === studentId); // Local filter is fine as we sync all

    const deletePrayerRecordsForStudents = async (studentIds) => {
        const batch = writeBatch(db);
        // We need to find all records that belong to these students
        // Since we have all prayerRecords in state (synced), we can filter them here to get IDs
        // However, for large datasets, a query might be better. But consistent with this app's pattern:
        const toDelete = prayerRecords.filter(r => studentIds.includes(r.studentId));

        if (toDelete.length === 0) return;

        toDelete.forEach(r => {
            // The ID in prayerRecords state includes the doc ID? 
            // Yes, subscribe logic: `snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))`
            batch.delete(doc(db, 'prayerRecords', r.id));
        });

        await batch.commit();
    };

    // Leave Requests
    const addLeaveRequest = async (request) => {
        await addDoc(collection(db, 'leaveRequests'), { ...request, status: 'Pending', createdAt: new Date().toISOString() });
    };
    const updateLeaveRequest = async (id, updates) => {
        const oldReq = leaveRequests.find(r => r.id === id);
        await updateDoc(doc(db, 'leaveRequests', id), updates);
        
        if (updates.status && updates.status !== oldReq?.status) {
            await addNotification({
                title: `Leave Request ${updates.status}`,
                message: `Your leave request for ${oldReq.date} has been ${updates.status.toLowerCase()}.`,
                audience: 'specific_student',
                targetId: oldReq.studentId,
                senderId: currentUser?.id,
                senderName: currentUser?.name,
                senderRole: currentUser?.role,
                type: 'leave'
            });
        }
    };
    const deleteLeaveRequest = async (id) => await deleteDoc(doc(db, 'leaveRequests', id));
    const deleteLeaveRequests = async (ids) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, 'leaveRequests', id)));
        await batch.commit();
    };

    // Syllabus
    const addSyllabus = async (syllabus) => await addDoc(collection(db, 'syllabi'), { ...syllabus, timestamp: new Date().toISOString() });
    const updateSyllabus = async (id, updates) => await updateDoc(doc(db, 'syllabi', id), updates);
    const deleteSyllabus = async (id) => await deleteDoc(doc(db, 'syllabi', id));

    // Other Setters for settings (AdminRequest, ChatSettings, etc.)
    // These seemed to be missing explicit actions in the original file, or just used useState setters directly?
    // In the original, they just had useState. We can add wrapper Actions if needed, 
    // or just let the components use specific Firestore calls.
    // For now, let's assume the components might not call anything if actions didn't exist?
    // Re-checking original file... 
    // Ah, `setStarDeclarations`, `setAdminRequests` etc were just exposed state. 
    // If components called `setStarDeclarations` directly, that breaks.
    // We must provide replacement functions if they were exposed.
    // Creating generic update wrappers for those settings if they were just local state.

    // For now, if components used `set...` directly from useData context return, we need to bridge that.
    // But typically context exposes specific functions.

    // Additional Exports based on State Analysis:
    // `starDeclarations`: Need `addStarDeclaration`? 
    // Checked usage in other files: StarOfTheMonth.jsx likely uses it.
    // Let's implement generic save/update for these misc collections.

    const updateChatSettings = async (settings) => {
        // Assuming single doc or array? Original was array.
        // Let's just save it as one doc for simplicity? Or individual docs?
        // Original: `localStorage.setItem('chatSettings', JSON.stringify(chatSettings))`
        // We can store it as a single doc in settings.
        await setDoc(doc(db, 'settings', 'chat'), { items: settings });
    };
    // Note: The listener above `subscribe('chatSettings', setChatSettings)` works for a collection.
    // If we change structure, we break the app. 
    // Let's stick to collection for consistency if it was an array.

    // New Implementation for MentorChat
    const toggleChatForClass = async (classId) => {
        const existing = chatSettings.find(s => s.classId === classId);
        if (existing) {
            await updateDoc(doc(db, 'chatSettings', existing.id), { isEnabled: !existing.isEnabled });
        } else {
            // Default to true if creating for the first time
            await addDoc(collection(db, 'chatSettings'), { classId, isEnabled: true, allowStudentGroupChat: true });
        }
    };

    const toggleGroupChatForClass = async (classId) => {
        const existing = chatSettings.find(s => s.classId === classId);
        if (existing) {
            // If the field doesn't exist yet, it defaults to undefined which becomes true when toggled initially? 
            // Better to explicitly check. It should default to true.
            const currentVal = existing.allowStudentGroupChat !== undefined ? existing.allowStudentGroupChat : true;
            await updateDoc(doc(db, 'chatSettings', existing.id), { allowStudentGroupChat: !currentVal });
        } else {
            // If setting doesn't exist at all, create it with DM off (since toggleChat wasn't called) but group toggled appropriately.
            // Actually, if it doesn't exist, toggling group chat off means it should be false.
            await addDoc(collection(db, 'chatSettings'), { classId, isEnabled: false, allowStudentGroupChat: false });
        }
    };

    const markMessagesAsRead = async (messageIds) => {
        if (!messageIds || messageIds.length === 0) return;
        const batch = writeBatch(db);
        messageIds.forEach(id => {
            const ref = doc(db, 'chatMessages', id);
            batch.update(ref, { isRead: true });
        });
        await batch.commit();
    };

    const deleteChatConversation = async (studentId, mentorId) => {
        const msgs = chatMessages.filter(m =>
            (m.senderId === studentId && m.receiverId === mentorId) ||
            (m.senderId === mentorId && m.receiverId === studentId)
        );

        if (msgs.length === 0) return;

        const batch = writeBatch(db);
        msgs.forEach(msg => {
            batch.delete(doc(db, 'chatMessages', msg.id));
        });
        await batch.commit();
    };

    const saveStarDeclaration = async (dec) => await addDoc(collection(db, 'starDeclarations'), dec);
    const deleteStarDeclaration = async (id) => await deleteDoc(doc(db, 'starDeclarations', id));

    const updateStarConfig = async (classId, newConfig) => {
        await setDoc(doc(db, 'starConfigs', classId), { classId, config: newConfig }, { merge: true });
    };

    const addAdminRequest = async (req) => await addDoc(collection(db, 'adminRequests'), req);
    const updateAdminRequest = async (id, upd) => await updateDoc(doc(db, 'adminRequests', id), upd);
    const deleteAdminRequest = async (id) => await deleteDoc(doc(db, 'adminRequests', id));

    // Question Suggestions
    const suggestQuestions = async (suggestion) => await addDoc(collection(db, 'questionSuggestions'), { ...suggestion, status: 'Pending', timestamp: new Date().toISOString() });
    
    const resolveQuestionSuggestion = async (suggestionId, action) => {
        // action is 'Accepted' or 'Rejected'
        if (action === 'Rejected') {
            await deleteDoc(doc(db, 'questionSuggestions', suggestionId));
        } else if (action === 'Accepted') {
            await updateDoc(doc(db, 'questionSuggestions', suggestionId), { status: 'Accepted' });
        }
    };


    // Exam Settings
    const updateExamSetting = async (examId, classId, subjectId, updates) => {
        const docId = `${examId}_${classId}_${subjectId}`;
        await setDoc(doc(db, 'examSettings', docId), { examId, classId, subjectId, ...updates }, { merge: true });
    };

    // --- Login Helpers (Direct DB Queries to avoid massive full-list reads) ---
    const fetchStudentByRegisterNo = async (regNo) => {
        const q = query(collection(db, 'students'), where('registerNo', '==', regNo), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
    };

    const fetchMentorByEmail = async (email) => {
        const q = query(collection(db, 'mentors'), where('email', '==', email), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
    };

    const value = {
        classes, addClass, updateClass, deleteClass, deleteClasses, transferStudentsAndBulkDeleteClass,
        students, addStudent, updateStudent, deleteStudent, deleteStudents, deleteAllStudents,
        allStudents, 
        
        mentors, addMentor, updateMentor, deleteMentor, deleteMentors,
        attendance, recordAttendance, deleteAttendanceBatch, deleteAllAttendanceForStudentIds,
        subjects, addSubject, updateSubject, deleteSubject, deleteSubjects,
        exams, addExam, updateExam, deleteExam,
        results, recordResult, deleteResultBatch, deleteExamResultsForClass,
        questions, addQuestion, updateQuestion, deleteQuestion,
        studentResponses, submitExam, deleteStudentResponse: async (e, s, stuk) => {
            const r = studentResponses.find(x => x.examId == e && x.subjectId == s && x.studentId == stuk);
            if (r) await deleteDoc(doc(db, 'studentResponses', r.id));
        },

        currentUser, login, logout, impersonate, stopImpersonating,
        fetchStudentByRegisterNo, fetchMentorByEmail,
        institutionSettings, updateInstitutionSettings,
        adminCredentials, updateAdminCredentials, validateAdmin,
        studentStatuses, updateStudentStatuses,

        // Pagination & Counts
        allStudentsLimit, setAllStudentsLimit, loadMoreAllStudents,
        allMentorsLimit, setAllMentorsLimit, loadMoreAllMentors,
        allClassesLimit, setAllClassesLimit, loadMoreAllClasses,
        totalCounts,

        activities, addActivity, updateActivity, deleteActivity, toggleActivityStatus,
        activitySubmissions, markActivityAsDone, markActivityAsPending, getStudentActivityPoints,

        logEntries, addLogEntry, updateLogEntry, deleteLogEntry,
        logLimit, setLogLimit, loadMoreLogs,
        syllabusStatuses, syncSyllabusStatus,
        prayerRecords, addPrayerRecord, getPrayerRecordsByStudent, deletePrayerRecordsForStudents,
        leaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest, deleteLeaveRequests,

        // New / Misc
        starDeclarations, saveStarDeclaration, deleteStarDeclaration,
        starConfigs, updateStarConfig,
        adminRequests, addAdminRequest, updateAdminRequest, deleteAdminRequest,
        admissionRequests, 
        addAdmissionRequest: async (req) => await addDoc(collection(db, 'admissionRequests'), { ...req, createdAt: new Date().toISOString() }),
        updateAdmissionRequest: async (id, upd) => await updateDoc(doc(db, 'admissionRequests', id), upd),
        deleteAdmissionRequest: async (id) => await deleteDoc(doc(db, 'admissionRequests', id)),
        repairAllSubjects,
        questionSuggestions,
        resolveQuestionSuggestion,
        isUpdateAvailable,
        chatMessages, unreadChats, sendMessage: async (msg) => await addDoc(collection(db, 'chatMessages'), { ...msg, timestamp: new Date().toISOString() }),
        markMessagesAsRead, deleteChatConversation,

        examSettings, updateExamSetting,
        chatSettings, toggleChatForClass, toggleGroupChatForClass,
        substitutionRequests, clearSubstitutionRequests, 
        mentorTasks, addMentorTask, updateMentorTask, deleteMentorTask, toggleMentorTaskStatus,
        submitMentorTask, resolveMentorTask,
        syllabi, addSyllabus, updateSyllabus, deleteSyllabus,

        mentorSettings, 
        updateMentorSettings: async (s) => {
            if (currentUser) {
                await setDoc(doc(db, 'mentorSettings', currentUser.id), s, { merge: true });
            }
        },

        studentFeatureFlags, updateStudentFeatureFlags: async (flags) => await setDoc(doc(db, 'settings', 'studentFeatures'), flags, { merge: true }),
        mentorFeatureFlags, updateMentorFeatureFlags: async (flags) => await setDoc(doc(db, 'settings', 'mentorFeatures'), flags, { merge: true }),
        classFeatureFlags,
        updateClassFeatureFlags: async (classId, flags) => await setDoc(doc(db, 'classFeatureFlags', classId), { classId, ...flags }, { merge: true }),
        updateBulkClassFeatureFlags: async (classIds, flags) => {
            const batch = writeBatch(db);
            classIds.forEach(id => batch.set(doc(db, 'classFeatureFlags', id), { classId: id, ...flags }, { merge: true }));
            await batch.commit();
        },

        liveClasses,
        updateLiveClassConfig: async (classId, config) => await setDoc(doc(db, 'liveClasses', classId), { classId, ...config }, { merge: true }),

        repairAttendanceData: async () => {
            const batch = writeBatch(db);
            let count = 0;
            
            // Get all attendance records
            const snapshot = await getDocs(collection(db, 'attendance'));
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (!data.classId) {
                    const student = students.find(s => s.id === data.studentId);
                    if (student && student.classId) {
                        batch.update(docSnap.ref, { classId: student.classId });
                        count++;
                    }
                }
            });

            if (count > 0) {
                await batch.commit();
            }
            return count;
        },

        resetData,
        isDataLoaded,

        // Special Prayers
        specialPrayers,
        addSpecialPrayer: async (p) => await addDoc(collection(db, 'specialPrayers'), { ...p, createdAt: new Date().toISOString() }),
        updateSpecialPrayer: async (id, u) => await updateDoc(doc(db, 'specialPrayers', id), u),
        deleteSpecialPrayer: async (id) => await deleteDoc(doc(db, 'specialPrayers', id)),

        // Ramadan & Quran Tracking
        ramadanLogs,
        addRamadanLog: async (log) => await addDoc(collection(db, 'ramadanLogs'), { ...log, timestamp: new Date().toISOString() }),
        updateRamadanLog: async (id, u) => await updateDoc(doc(db, 'ramadanLogs', id), u),
        deleteRamadanLog: async (id) => await deleteDoc(doc(db, 'ramadanLogs', id)),

        quranProgress,
        updateQuranProgress: async (studentId, data) => {
            const existing = quranProgress.find(q => q.studentId === studentId);
            if (existing) {
                await updateDoc(doc(db, 'quranProgress', existing.id), { ...data, lastUpdated: new Date().toISOString() });
            } else {
                await addDoc(collection(db, 'quranProgress'), { studentId, ...data, lastUpdated: new Date().toISOString() });
            }
        },

        quranRecitations,

        // Notifications
        notifications,
        addNotification,
        deleteNotification: async (id) => await deleteDoc(doc(db, 'notifications', id)),
        updateNotification: async (id, data) => await updateDoc(doc(db, 'notifications', id), data),
        markNotificationAsRead,

        // Evaluations
        evaluationForms,
        createEvaluationForm: async (form) => await addDoc(collection(db, 'evaluationForms'), { ...form, createdAt: new Date().toISOString() }),
        updateEvaluationForm: async (id, data) => await updateDoc(doc(db, 'evaluationForms', id), data),
        deleteEvaluationForm: async (id) => await deleteDoc(doc(db, 'evaluationForms', id)),
        
        evaluationSubmissions,
        submitEvaluationResponse: async (response) => await addDoc(collection(db, 'evaluationSubmissions'), { ...response, submittedAt: new Date().toISOString() }),
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export default DataContext;
