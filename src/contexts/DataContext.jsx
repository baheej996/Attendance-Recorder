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

    // --- Lifecycle Subscriptions ---
    const [allStudents, setAllStudents] = useState([]);
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [allMentors, setAllMentors] = useState([]);
    const [classes, setClasses] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
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
    const [gameProgress, setGameProgress] = useState([]);
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
    
    // Student Assessment & Parent Feedback
    const [studentEvaluations, setStudentEvaluations] = useState([]);
    const [parentFeedbacks, setParentFeedbacks] = useState([]);
    const [feedbackSettings, setFeedbackSettings] = useState([]);

    const [studentEvaluationTemplates, setStudentEvaluationTemplates] = useState([]);
    const [parentFeedbackTemplates, setParentFeedbackTemplates] = useState([]);

    // Mentor Performance Leaderboard
    const [leaderboardRules, setLeaderboardRules] = useState([]);
    const [leaderboardCompletions, setLeaderboardCompletions] = useState([]);
    const [leaderboardSettings, setLeaderboardSettings] = useState({ isVisibleToMentors: false });
    const [allMentorSettings, setAllMentorSettings] = useState([]); // Buffer for all settings if needed
    const [examSettings, setExamSettings] = useState([]);
    const [studentStatuses, setStudentStatuses] = useState(['Active', 'Inactive', 'Viva pending', 'Exam pending', 'Payment Pending', 'Suspended', 'Dismissed']);
    const [logLimit, setLogLimit] = useState(10);
    const [allStudentsLimit, setAllStudentsLimit] = useState(10);
    const [allMentorsLimit, setAllMentorsLimit] = useState(10);
    const [allClassesLimit, setAllClassesLimit] = useState(10);

    const [attendanceLimit, setAttendanceLimit] = useState(500);
    const [resultsLimit, setResultsLimit] = useState(500);
    const [activitiesLimit, setActivitiesLimit] = useState(500);

    const [totalCounts, setTotalCounts] = useState({ students: 0, mentors: 0, classes: 0 });

    const loadMoreLogs = () => setLogLimit(prev => prev + 10);
    const loadMoreAllStudents = () => setAllStudentsLimit(prev => prev + 10);
    const loadMoreAllMentors = () => setAllMentorsLimit(prev => prev + 10);
    const loadMoreAllClasses = () => setAllClassesLimit(prev => prev + 10);
    const loadMoreAttendance = () => setAttendanceLimit(prev => prev + 500);
    const loadMoreResults = () => setResultsLimit(prev => prev + 500);
    const loadMoreActivities = () => setActivitiesLimit(prev => prev + 500);

    // System Versioning
    const [appVersion] = useState(1777391306000); // Internal Build Timestamp
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    const [institutionSettings, setInstitutionSettings] = useState({
        name: 'Samastha E-Learning',
        tagline: 'Realizing the real path',
        academicYear: '2026-2027',
        academicYearStartMonth: 3,
        chiefMentor: 'OP Siraj Faizy',
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
        feedback: true,
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

    // --- Current User Sync ---
    useEffect(() => {
        if (!currentUser?.id) return;
        
        const collectionName = currentUser.role === 'mentor' ? 'mentors' : (currentUser.role === 'student' ? 'students' : 'admins');
        if (collectionName === 'admins') return; // Admin sync is simple

        return onSnapshot(doc(db, collectionName, currentUser.id), (docSnap) => {
            if (docSnap.exists()) {
                const fresh = { ...docSnap.data(), id: docSnap.id };
                
                setCurrentUser(prev => {
                    if (!prev) return fresh;
                    // Compare all fields from database with prev state to ensure updates sync instantly
                    const hasChanged = Object.keys(fresh).some(key => {
                        if (Array.isArray(fresh[key])) {
                            return JSON.stringify(fresh[key]) !== JSON.stringify(prev[key]);
                        }
                        return fresh[key] !== prev[key];
                    });
                    return hasChanged ? { ...prev, ...fresh } : prev;
                });
            }
        });
    }, [currentUser?.id]); // Only run when identity changes

    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Dynamic Feature Registry for On-Demand Loading
    const [activeFeatures, setActiveFeatures] = useState(new Set());
    
    // Components call this in useEffect to request heavy data. 
    // DataContext will only subscribe to Firestore if at least one component requests it.
    // IMPORTANT: Must be wrapped in useCallback so it has a stable reference.
    // Without this, any useEffect that lists [requireFeature] as a dependency will re-run
    // on every render, causing an infinite loop (React error #185).
    const requireFeature = React.useCallback((feature) => {
        setActiveFeatures(prev => {
            const next = new Set(prev);
            next.add(feature);
            return next;
        });
        
        return () => {
            setActiveFeatures(prev => {
                const next = new Set(prev);
                next.delete(feature);
                return next;
            });
        };
    }, []); // stable - setActiveFeatures from useState is always stable

    // --- Firestore Listeners ---
    
    // Helper to subscribe to a collection with custom query constraints
    // IMPORTANT: The error handler is critical — without it, one failing query
    // (e.g. a missing Firestore composite index) silently crashes the entire
    // useEffect and breaks ALL subscriptions for the user, not just the one that failed.
    const getCount = async (collectionName, ...constraints) => {
        try {
            const q = query(collection(db, collectionName), ...constraints);
            const snap = await getCountFromServer(q);
            return snap.data().count;
        } catch (error) {
            console.error(`[DataContext] Error getting count for ${collectionName}:`, error);
            return 0;
        }
    };

    const subscribe = (collectionName, setState, ...constraints) => {
        const q = query(collection(db, collectionName), ...constraints);
        return onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setState(data);
            },
            (error) => {
                console.error(`[DataContext] Subscription failed for '${collectionName}':`, error.message);
            }
        );
    };

    // One-time fetch: use for admin-managed reference data (settings, templates) that
    // rarely changes. Avoids paying re-read costs whenever any user writes to the collection.
    // Mutations to these collections must keep local state in sync (optimistic update).
    const loadOnce = async (collectionName, setState, ...constraints) => {
        try {
            const q = constraints.length > 0
                ? query(collection(db, collectionName), ...constraints)
                : collection(db, collectionName);
            const snap = await getDocs(q);
            setState(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        } catch (error) {
            console.error(`[DataContext] One-time load failed for '${collectionName}':`, error.message);
        }
    };

    // 1. Global / Lightweight Subscriptions (Always needed)
    useEffect(() => {
        const unsubs = [
            subscribe('classes', setClasses),
            subscribe('subjects', setSubjects),
            subscribe('mentors', (data) => { setMentors(data); setAllMentors(data); }),
            subscribe('classFeatureFlags', setClassFeatureFlags),
            subscribe('mentorSettings', setAllMentorSettings),
            subscribe('liveClasses', setLiveClasses),
            subscribe('syllabi', setSyllabi),
            subscribe('syllabusStatus', setSyllabusStatuses),
            subscribe('substitutionRequests', setSubstitutionRequests),
            subscribe('questions', setQuestions),
        ];

        // Reference data — rarely changes, real-time sync is wasteful for 2k users.
        // Mutations on these collections refresh local state via their action functions below.
        loadOnce('chatSettings', setChatSettings);
        loadOnce('specialPrayers', setSpecialPrayers);
        loadOnce('examSettings', setExamSettings);
        loadOnce('studentEvaluationTemplates', setStudentEvaluationTemplates);
        loadOnce('parentFeedbackTemplates', setParentFeedbackTemplates);

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
                if (doc.id === 'leaderboard') {
                    setLeaderboardSettings(prev => ({ ...prev, ...doc.data() }));
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
        // High-efficiency one-time count fetch (Costs 1 read per 1,000 docs)
        const fetchCounts = async () => {
            try {
                const studentsSnap = await getCountFromServer(query(collection(db, 'students'), where('status', '==', 'Active')));
                const mentorsSnap = await getCountFromServer(collection(db, 'mentors'));
                const classesSnap = await getCountFromServer(collection(db, 'classes'));
                
                setTotalCounts({
                    students: studentsSnap.data().count,
                    mentors: mentorsSnap.data().count,
                    classes: classesSnap.data().count
                });
            } catch (error) {
                console.error("[DataContext] Error fetching total counts:", error);
            }
        };

        fetchCounts();
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
            setGameProgress([]);
            return;
        }

        const unsubs = [];

        if (currentUser.role === 'student') {
            const uid = currentUser.id;
            const cid = currentUser.classId;
            const myClassDoc = classes.find(c => c.id === cid);
            const batchClassIds = myClassDoc ? classes.filter(c => c.name === myClassDoc.name).map(c => c.id).slice(0, 30) : [cid];

            unsubs.push(
                subscribe('exams', setExams),
                subscribe('activities', setActivities, where('classId', '==', cid)),
                subscribe('chatMessages', setChatMessages, where('classId', '==', cid), limit(150)),
                subscribe('chatMessages', setUnreadChats, where('receiverId', '==', uid), where('isRead', '==', false)),
                subscribe('notifications', setNotifications, where('audience', 'in', ['students', 'all', 'specific_class']), limit(100)),
                subscribe('starDeclarations', setStarDeclarations, where('classId', '==', cid)),
                subscribe('students', setStudents, where('classId', 'in', batchClassIds)),
                subscribe('studentEvaluations', setStudentEvaluations, where('studentId', '==', uid), where('status', '==', 'Published')),
                subscribe('feedbackSettings', setFeedbackSettings, where('classId', '==', cid)),
                subscribe('gameProgress', setGameProgress, where('classId', '==', cid))
            );

            // On-Demand Heavy Data
            if (activeFeatures.has('attendance')) {
                unsubs.push(subscribe('attendance', setAttendance, where('classId', '==', cid), orderBy('date', 'desc'), limit(attendanceLimit)));
            }
            if (activeFeatures.has('results')) unsubs.push(subscribe('results', setResults, where('classId', 'in', batchClassIds), limit(resultsLimit)));
            if (activeFeatures.has('prayer')) unsubs.push(subscribe('prayerRecords', setPrayerRecords, where('classId', '==', cid)));
            if (activeFeatures.has('quran')) unsubs.push(
                subscribe('quranRecitations', setQuranRecitations, where('classId', '==', cid)),
                subscribe('quranProgress', setQuranProgress, where('classId', '==', cid))
            );
            if (activeFeatures.has('activities')) unsubs.push(
                subscribe('activitySubmissions', setActivitySubmissions, where('classId', 'in', cid ? [cid, ''] : ['']), limit(activitiesLimit)),
                subscribe('studentResponses', setStudentResponses, where('studentId', '==', uid), limit(resultsLimit))
            );
            if (activeFeatures.has('leave')) unsubs.push(subscribe('leaveRequests', setLeaveRequests, where('studentId', '==', uid)));
            if (activeFeatures.has('ramadan')) unsubs.push(subscribe('ramadanLogs', setRamadanLogs, where('classId', '==', cid)));

            // Separate listener: direct messages TO this student (mentor→student DMs stored without classId)
            // These must be MERGED into chatMessages, not replace them
            const directMsgQ = query(collection(db, 'chatMessages'), where('receiverId', '==', uid), limit(150));
            const directMsgUnsub = onSnapshot(directMsgQ, (snap) => {
                const directMsgs = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setChatMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newMsgs = directMsgs.filter(m => !existingIds.has(m.id));
                    return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
                });
            });
            unsubs.push(directMsgUnsub);

            // Separate listener: messages SENT by this student (so sent messages appear immediately)
            const sentMsgQ = query(collection(db, 'chatMessages'), where('senderId', '==', uid), limit(150));
            const sentMsgUnsub = onSnapshot(sentMsgQ, (snap) => {
                const sentMsgs = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setChatMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newMsgs = sentMsgs.filter(m => !existingIds.has(m.id));
                    return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
                });
            });
            unsubs.push(sentMsgUnsub);

            // Separate listener: notifications sent specifically to THIS student (audience == 'specific_student')
            // Cannot be combined with the audience 'in' query above (different field filter),
            // so we merge them client-side like we do for direct chat messages.
            const specificNotifQ = query(
                collection(db, 'notifications'),
                where('audience', '==', 'specific_student'),
                where('targetId', '==', uid),
                limit(50)
            );
            const specificNotifUnsub = onSnapshot(specificNotifQ, (snap) => {
                const specificNotifs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                setNotifications(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const newNotifs = specificNotifs.filter(n => !existingIds.has(n.id));
                    return newNotifs.length > 0 ? [...prev, ...newNotifs] : prev;
                });
            });
            unsubs.push(specificNotifUnsub);
        } else if (currentUser.role === 'mentor') {
            const assignedClassIds = currentUser.assignedClassIds || (currentUser.classId ? [currentUser.classId] : []);

            unsubs.push(
                subscribe('students', setAllStudents, orderBy('name'), limit(allStudentsLimit)),
                subscribe('classes', setAllClasses, orderBy('name'), limit(allClassesLimit))
            );

            if (assignedClassIds.length > 0) {
                unsubs.push(
                    subscribe('students', setStudents, where('classId', 'in', assignedClassIds)),
                    subscribe('exams', setExams),
                    subscribe('chatMessages', setChatMessages, where('classId', 'in', assignedClassIds), limit(200)),
                    subscribe('activities', setActivities, where('classId', 'in', assignedClassIds)),
                    subscribe('starDeclarations', setStarDeclarations, where('classId', 'in', assignedClassIds)),
                    subscribe('gameProgress', setGameProgress, where('classId', 'in', assignedClassIds))
                );

                // On-Demand Heavy Data
                if (activeFeatures.has('attendance')) {
                    unsubs.push(subscribe('attendance', setAttendance, where('classId', 'in', assignedClassIds), orderBy('date', 'desc'), limit(attendanceLimit)));
                }
                if (activeFeatures.has('results')) unsubs.push(subscribe('results', setResults, where('classId', 'in', assignedClassIds), limit(resultsLimit)));
                if (activeFeatures.has('prayer')) unsubs.push(subscribe('prayerRecords', setPrayerRecords, where('classId', 'in', assignedClassIds)));
                if (activeFeatures.has('quran')) unsubs.push(
                    subscribe('quranRecitations', setQuranRecitations, where('classId', 'in', assignedClassIds)),
                    subscribe('quranProgress', setQuranProgress, where('classId', 'in', assignedClassIds))
                );
                if (activeFeatures.has('activities')) unsubs.push(
                    // Scope to the mentor's assigned classes so the 500-doc cap can't hide a freshly
                    // written submission (especially for older activities whose deterministic doc ID
                    // would otherwise land outside the unscoped window).
                    // Include '' to catch legacy submissions whose classId was written as empty
                    // (mirrors the same pattern the student listener uses at line 344).
                    subscribe('activitySubmissions', setActivitySubmissions, where('classId', 'in', [...assignedClassIds, '']), limit(activitiesLimit)),
                    subscribe('studentResponses', setStudentResponses, where('classId', 'in', assignedClassIds), limit(resultsLimit))
                );
                if (activeFeatures.has('leave')) unsubs.push(subscribe('leaveRequests', setLeaveRequests, where('classId', 'in', assignedClassIds)));
                if (activeFeatures.has('ramadan')) unsubs.push(subscribe('ramadanLogs', setRamadanLogs, where('classId', 'in', assignedClassIds)));
                
                unsubs.push(
                    subscribe('studentEvaluations', setStudentEvaluations, where('classId', 'in', assignedClassIds)),
                    subscribe('parentFeedbacks', setParentFeedbacks, where('classId', 'in', assignedClassIds)),
                    subscribe('feedbackSettings', setFeedbackSettings, where('classId', 'in', assignedClassIds))
                );
            }

            unsubs.push(
                subscribe('chatMessages', setUnreadChats, where('receiverId', '==', currentUser.id), where('isRead', '==', false)),
                subscribe('mentorTasks', setMentorTasks, where('mentorId', '==', currentUser.id)),
                // Filter evaluation forms: Show if (global visibility) OR (specifically shared) OR (created by current user)
                subscribe('evaluationForms', (data) => {
                    const filtered = data.filter(form => {
                        if (form.sharingType === 'all') return true;
                        if (form.creatorId === currentUser.id) return true;
                        if (form.sharedMentorIds?.includes(currentUser.id)) return true;
                        return false;
                    });
                    setEvaluationForms(filtered);
                }),
                subscribe('evaluationSubmissions', setEvaluationSubmissions, where('mentorId', '==', currentUser.id)),
                subscribe('questionSuggestions', setQuestionSuggestions, where('receiverId', '==', currentUser.id)),
                subscribe('notifications', setNotifications, orderBy('createdAt', 'desc'), limit(100)),
                // Mentor needs to see their own admission requests for the request history panel
                subscribe('admissionRequests', setAdmissionRequests, where('mentorId', '==', currentUser.id)),
                subscribe('leaderboardRules', setLeaderboardRules),
                subscribe('leaderboardCompletions', setLeaderboardCompletions)
            );
        } else if (currentUser.role === 'admin') {
            unsubs.push(
                subscribe('students', (data) => { setStudents(data); setAllStudents(data); }),
                subscribe('classes', (data) => { setClasses(data); setAllClasses(data); }),
                subscribe('exams', setExams),
                subscribe('activities', setActivities),
                subscribe('chatMessages', setChatMessages, orderBy('timestamp', 'desc'), limit(200)),
                subscribe('chatMessages', setUnreadChats, where('receiverId', '==', 'admin'), where('isRead', '==', false)),
                subscribe('notifications', setNotifications, orderBy('createdAt', 'desc'), limit(200)),
                subscribe('admissionRequests', setAdmissionRequests),
                subscribe('evaluationForms', setEvaluationForms),
                subscribe('evaluationSubmissions', setEvaluationSubmissions),
                subscribe('adminRequests', setAdminRequests),
                subscribe('leaderboardRules', setLeaderboardRules),
                subscribe('leaderboardCompletions', setLeaderboardCompletions),
                subscribe('studentEvaluations', setStudentEvaluations),
                subscribe('parentFeedbacks', setParentFeedbacks),
                subscribe('feedbackSettings', setFeedbackSettings),
                subscribe('gameProgress', setGameProgress)
            );
            
            // On-Demand Heavy Data
            if (activeFeatures.has('attendance')) unsubs.push(subscribe('attendance', setAttendance, orderBy('date', 'desc'), limit(attendanceLimit)));
            if (activeFeatures.has('results')) unsubs.push(subscribe('results', setResults, limit(resultsLimit)));
            if (activeFeatures.has('activities')) unsubs.push(subscribe('activitySubmissions', setActivitySubmissions, limit(activitiesLimit)));
            if (activeFeatures.has('quran')) unsubs.push(subscribe('quranRecitations', setQuranRecitations, limit(5000)));
            
            // Note: Admins may still need full attendance/results for reports, 
            // but those should ideally be fetched on-demand in the reports page.
        }

        return () => unsubs.forEach(u => u());
    }, [currentUser, allStudentsLimit, allMentorsLimit, allClassesLimit, activeFeatures, attendanceLimit, resultsLimit, activitiesLimit, classes]);

    // Separate Effect for Log Pagination (to avoid re-subscribing to everything else)
    // NOTE: where('classId') + orderBy('timestamp') requires a Firestore composite index.
    // We use where-only queries and sort client-side to avoid this requirement.
    useEffect(() => {
        if (!currentUser) {
            setLogEntries([]);
            return;
        }

        let q;
        if (currentUser.role === 'student') {
            // No orderBy — sort client-side to avoid composite index requirement
            q = query(collection(db, 'logEntries'), where('classId', '==', currentUser.classId), limit(logLimit));
        } else if (currentUser.role === 'mentor') {
            const assignedClassIds = currentUser.assignedClassIds || (currentUser.classId ? [currentUser.classId] : []);
            if (assignedClassIds.length > 0) {
                q = query(collection(db, 'logEntries'), where('classId', 'in', assignedClassIds), limit(logLimit));
            } else {
                setLogEntries([]);
                return;
            }
        } else if (currentUser.role === 'admin') {
            // Admin has no where clause, orderBy alone is fine (no composite index needed)
            q = query(collection(db, 'logEntries'), orderBy('timestamp', 'desc'), limit(logLimit));
        }

        if (!q) return;

        const unsub = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs
                    .map(doc => ({ ...doc.data(), id: doc.id }))
                    // Client-side sort — same result, no index needed
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setLogEntries(data);
            },
            (error) => {
                console.error('[DataContext] logEntries subscription failed:', error.message);
            }
        );

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

    /*
    useEffect(() => {
        if (!currentUser) return;
        const source = currentUser.role === 'mentor' ? mentors : (currentUser.role === 'student' ? students : []);
        const fresh = source.find(u => u.id === currentUser.id);
        if (fresh) {
            // Deep check for changes that affect the session
            const hasChanged = fresh.name !== currentUser.name || 
                               fresh.signature !== currentUser.signature || 
                               fresh.classId !== currentUser.classId ||
                               JSON.stringify(fresh.assignedClassIds) !== JSON.stringify(currentUser.assignedClassIds);
            
            if (hasChanged) {
                setCurrentUser(prev => ({ ...prev, ...fresh }));
            }
        }
    }, [mentors, students, currentUser?.id]);
    */

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
                        name: 'Samastha E-Learning',
                        tagline: 'Realizing the real path',
                        academicYear: '2026-2027',
                        chiefMentor: 'OP Siraj Faizy',
                        favicon: '/favicon.png'
                    });
                } else {
                    // Force update if still showing old name
                    const currentInst = instDoc.docs.find(d => d.id === 'institution')?.data();
                    if (currentInst && (currentInst.name === 'Attendance Recorder' || currentInst.name === 'SMART MADRASA')) {
                        console.log("Applying branding migration...");
                        await setDoc(institutionRef, {
                            name: 'Samastha E-Learning',
                            tagline: 'Realizing the real path',
                            academicYear: '2026-2027',
                            chiefMentor: 'OP Siraj Faizy'
                        }, { merge: true });
                    }
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
    const addStudent = async (student) => {
        const normalized = { 
            ...student, 
            registerNo: student.registerNo?.trim().toUpperCase(),
            status: student.status || 'Active' 
        };
        return await addDoc(collection(db, 'students'), normalized);
    };
    const updateStudent = async (id, data) => {
        const normalized = { ...data };
        if (normalized.registerNo) normalized.registerNo = normalized.registerNo.trim().toUpperCase();
        
        // Remove undefined fields to prevent Firestore errors
        Object.keys(normalized).forEach(key => {
            if (normalized[key] === undefined) {
                delete normalized[key];
            }
        });

        await updateDoc(doc(db, 'students', id), normalized);
        if (currentUser?.id === id) setCurrentUser(prev => ({ ...prev, ...normalized }));
    };
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
    const updateMentor = async (id, updated) => {
        await updateDoc(doc(db, 'mentors', id), updated);
        if (currentUser?.id === id) setCurrentUser(prev => ({ ...prev, ...updated }));
    };
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
            (q.subjectId === submission.subjectName || q.subjectId === submission.subjectId) &&
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
            classId: submission.classId,
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
            const matchingResults = results.filter(res => 
                res.examId === data.examId && 
                res.subjectId === data.subjectId && 
                res.studentId === r.studentId
            );
            
            const resultData = {
                examId: data.examId,
                subjectId: data.subjectId,
                studentId: r.studentId,
                classId: r.classId || matchingResults[0]?.classId, // ensure classId is preserved
                marks: r.marks,
                timestamp
            };

            if (matchingResults.length > 0) {
                // Update the first match
                const ref = doc(db, 'results', matchingResults[0].id);
                batch.update(ref, resultData);
                
                // Cleanup any duplicates that might have been created previously
                for (let i = 1; i < matchingResults.length; i++) {
                    const duplicateRef = doc(db, 'results', matchingResults[i].id);
                    batch.delete(duplicateRef);
                }
            } else {
                const docId = `${data.examId}_${data.subjectId}_${r.studentId}`;
                const ref = doc(db, 'results', docId);
                batch.set(ref, resultData);
            }
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
        const q = query(
            collection(db, 'attendance'),
            where('date', '==', date)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
            if (studentIds.includes(d.data().studentId)) {
                batch.delete(d.ref);
            }
        });
        await batch.commit();
    };

    const deleteAttendanceRecord = async (date, studentId) => {
        const q = query(
            collection(db, 'attendance'), 
            where('date', '==', date), 
            where('studentId', '==', studentId)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
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

    const markActivityAsDone = async (activityId, studentId, points = 0, classId = null) => {
        try {
            // Resolve Class ID: Priority: 1. Passed classId, 2. Activity's classId, 3. Student's classId, 4. Fallback
            let targetClassId = classId;
            if (!targetClassId) {
                const act = activities.find(a => a.id === activityId);
                targetClassId = act?.classId;
            }
            if (!targetClassId) {
                const student = (students.length > 0 ? students : allStudents).find(s => s.id === studentId);
                targetClassId = student?.classId || '';
            }

            const submissionData = {
                activityId,
                studentId,
                classId: targetClassId || '',
                status: 'Completed',
                points: points ?? 0,
                timestamp: new Date().toISOString()
            };

            // Use deterministic ID to natively prevent any duplicate rapid-clicks
            const docId = `${activityId}_${studentId}`;

            // Always write the canonical doc first — that's the user-visible action.
            await setDoc(doc(db, 'activitySubmissions', docId), submissionData, { merge: true });

            // Then opportunistically clean up any legacy auto-id duplicates from before
            // deterministic IDs were introduced. Best-effort: a failure here must NOT block the mark.
            const legacyDuplicates = activitySubmissions.filter(
                s => s.activityId === activityId && s.studentId === studentId && s.id && s.id !== docId
            );
            if (legacyDuplicates.length > 0) {
                try {
                    const batch = writeBatch(db);
                    legacyDuplicates.forEach(dup => batch.delete(doc(db, 'activitySubmissions', dup.id)));
                    await batch.commit();
                } catch (cleanupErr) {
                    console.warn('[markActivityAsDone] legacy duplicate cleanup failed:', cleanupErr);
                }
            }
        } catch (error) {
            console.error("Error in markActivityAsDone:", error);
            alert("Failed to mark activity: " + error.message);
        }
    };

    const markActivityAsPending = async (activityId, studentId) => {
        try {
            const batch = writeBatch(db);
            const deterministicId = `${activityId}_${studentId}`;
            const deletedIds = new Set();

            // Delete the deterministic ID if it exists
            batch.delete(doc(db, 'activitySubmissions', deterministicId));
            deletedIds.add(deterministicId);

            // Also delete any legacy duplicates that might exist in the database
            const duplicates = activitySubmissions.filter(s => s.activityId === activityId && s.studentId === studentId);
            duplicates.forEach(docSnap => {
                if (!deletedIds.has(docSnap.id)) {
                    batch.delete(doc(db, 'activitySubmissions', docSnap.id));
                    deletedIds.add(docSnap.id);
                }
            });

            await batch.commit();
        } catch (error) {
            console.error("Error in markActivityAsPending:", error);
            alert("Failed to unmark activity: " + error.message);
        }
    };

    const getStudentActivityPoints = (studentId, classId) => {
        // Manual override (set by mentor/admin from the activity tracker) takes precedence
        const studentRecord = (students.length > 0 ? students : allStudents).find(s => s.id === studentId);
        const manual = studentRecord?.manualActivityPoints;
        if (manual !== undefined && manual !== null && manual !== '') {
            const n = Number(manual);
            if (!Number.isNaN(n)) return n;
        }

        // Only count points from submissions whose activity is still Active
        const activeActivities = activities.filter(
            a => a.status === 'Active' && (!classId || a.classId === classId)
        );
        const activeActivityMap = new Map(activeActivities.map(a => [a.id, a]));
        const processedActivityIds = new Set();

        return activitySubmissions
            .filter(s => {
                if (s.studentId === studentId && s.status === 'Completed' && activeActivityMap.has(s.activityId)) {
                    if (processedActivityIds.has(s.activityId)) return false; // Deduplicate existing legacy submissions
                    processedActivityIds.add(s.activityId);
                    return true;
                }
                return false;
            })
            // Always read current maxPoints from activity, not stale stored s.points
            .reduce((sum, s) => sum + (Number(activeActivityMap.get(s.activityId)?.maxPoints) || 0), 0);
    };


    // Log Entries
    const addLogEntry = async (entry) => {
        const docRef = await addDoc(collection(db, 'logEntries'), { 
            ...entry, 
            completionStatus: entry.completionStatus || 'fully', // Default to fully for backward compatibility/simplicity
            timestamp: new Date().toISOString() 
        });
        
        // Update Syllabus Status only if fully completed
        if (entry.classId && entry.subjectId && entry.chapter && (entry.completionStatus === 'fully' || !entry.completionStatus)) {
            const statusId = `${entry.classId}_${entry.subjectId}`;
            const chapter = entry.chapter.trim();
            
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
        const log = logEntries.find(l => l.id === id);
        await updateDoc(doc(db, 'logEntries', id), updates);

        // If completion status changed to fully, or chapter changed
        if (updates.completionStatus || updates.chapter) {
            const finalLog = { ...log, ...updates };
            const statusId = `${finalLog.classId}_${finalLog.subjectId}`;
            const chapter = finalLog.chapter.trim();
            const existing = syllabusStatuses.find(s => s.id === statusId);
            let completedChapters = existing ? [...(existing.completedChapters || [])] : [];

            if (finalLog.completionStatus === 'fully') {
                if (!completedChapters.includes(chapter)) {
                    completedChapters.push(chapter);
                    await setDoc(doc(db, 'syllabusStatus', statusId), {
                        classId: finalLog.classId,
                        subjectId: finalLog.subjectId,
                        completedChapters
                    }, { merge: true });
                }
            } else if (finalLog.completionStatus === 'partially') {
                // If it was fully before and now it's partially, check if ANY OTHER log for this chapter is 'fully'
                const otherFullLogs = logEntries.filter(l => 
                    l.id !== id && 
                    l.classId === finalLog.classId && 
                    l.subjectId === finalLog.subjectId && 
                    l.chapter.trim() === chapter && 
                    l.completionStatus === 'fully'
                );
                if (otherFullLogs.length === 0) {
                    completedChapters = completedChapters.filter(ch => ch !== chapter);
                    await updateDoc(doc(db, 'syllabusStatus', statusId), { completedChapters });
                }
            }
        }
    };

    const deleteLogEntry = async (id) => {
        const log = logEntries.find(l => l.id === id);
        await deleteDoc(doc(db, 'logEntries', id));

        if (log && log.classId && log.subjectId && log.chapter && log.completionStatus === 'fully') {
            const chapter = log.chapter.trim();
            // Check if any OTHER 'fully' logs exist for this same chapter
            const q = query(collection(db, 'logEntries'), 
                where('classId', '==', log.classId), 
                where('subjectId', '==', log.subjectId),
                where('chapter', '==', log.chapter),
                where('completionStatus', '==', 'fully'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                // No more 'fully' logs for this chapter, remove it from syllabus status
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
        // classId is required so the mentor's subscription (filtered by classId) can find these records
        const student = students.find(s => s.id === record.studentId) || allStudents.find(s => s.id === record.studentId);
        const classId = record.classId || student?.classId || (currentUser?.id === record.studentId ? currentUser.classId : null);
        await setDoc(doc(db, 'prayerRecords', docId), { ...record, classId, timestamp: new Date().toISOString() });
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
            const next = !existing.isEnabled;
            await updateDoc(doc(db, 'chatSettings', existing.id), { isEnabled: next });
            setChatSettings(prev => prev.map(s => s.id === existing.id ? { ...s, isEnabled: next } : s));
        } else {
            // Default to true if creating for the first time
            const docRef = await addDoc(collection(db, 'chatSettings'), { classId, isEnabled: true, allowStudentGroupChat: true });
            setChatSettings(prev => [...prev, { id: docRef.id, classId, isEnabled: true, allowStudentGroupChat: true }]);
        }
    };

    const toggleGroupChatForClass = async (classId) => {
        const existing = chatSettings.find(s => s.classId === classId);
        if (existing) {
            const currentVal = existing.allowStudentGroupChat !== undefined ? existing.allowStudentGroupChat : true;
            const next = !currentVal;
            await updateDoc(doc(db, 'chatSettings', existing.id), { allowStudentGroupChat: next });
            setChatSettings(prev => prev.map(s => s.id === existing.id ? { ...s, allowStudentGroupChat: next } : s));
        } else {
            const docRef = await addDoc(collection(db, 'chatSettings'), { classId, isEnabled: false, allowStudentGroupChat: false });
            setChatSettings(prev => [...prev, { id: docRef.id, classId, isEnabled: false, allowStudentGroupChat: false }]);
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
        setExamSettings(prev => {
            const idx = prev.findIndex(s => s.id === docId);
            const merged = { id: docId, examId, classId, subjectId, ...(idx >= 0 ? prev[idx] : {}), ...updates };
            return idx >= 0 ? prev.map((s, i) => i === idx ? merged : s) : [...prev, merged];
        });
    };

    // --- Login Helpers (Direct DB Queries to avoid massive full-list reads) ---
    const fetchStudentByRegisterNo = async (regNo) => {
        const cleanReg = regNo.trim().toUpperCase();
        const searchTerms = [cleanReg, cleanReg.toLowerCase()];
        const fieldNames = ['registerNo', 'regNo', 'uid'];

        for (const field of fieldNames) {
            for (const term of searchTerms) {
                const q = query(collection(db, 'students'), where(field, '==', term), limit(1));
                const s = await getDocs(q);
                if (!s.empty) return { ...s.docs[0].data(), id: s.docs[0].id };
            }
        }

        return null;
    };

    const fetchMentorByEmail = async (email) => {
        const q = query(collection(db, 'mentors'), where('email', '==', email), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
    };

    const getHistoricalAttendanceStats = async (classId, year, month) => {
        const firstDayOfCurrentMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const firstDayOfNextMonth = month === 11 
            ? `${year + 1}-01-01` 
            : `${year}-${String(month + 2).padStart(2, '0')}-01`;
        
        // Dynamically calculate the start of the academic year based on the selected date.
        // Uses the configured academicYearStartMonth (defaults to 3 for April).
        // If the selected month is before the start month, it belongs to the previous year's academic session.
        const startMonthIndex = institutionSettings?.academicYearStartMonth !== undefined ? parseInt(institutionSettings.academicYearStartMonth, 10) : 3;
        const startYearNum = month >= startMonthIndex ? year : year - 1;
        const academicYearStartDate = `${startYearNum}-${String(startMonthIndex + 1).padStart(2, '0')}-01`;
        
        // We intentionally query ALL attendance records for the students in this class.
        // We do NOT optimize by classId, because we MUST fetch a student's attendance history
        // across all classes they have been part of (e.g., if transferred from TTS to MWF batch)
        // so their "Previous Total" carries over correctly.

        // Fallback: Query by student IDs (handles old records without classId and missing indexes)
        const classStudentIds = students
            .filter(s => s.classId === classId)
            .map(s => s.id);

        if (classStudentIds.length === 0) return { studentTotals: {}, totalWorkingDays: 0 };

        // Process in batches of 30 (Firestore 'in' limit)
        const allRecords = [];
        for (let i = 0; i < classStudentIds.length; i += 30) {
            const batchIds = classStudentIds.slice(i, i + 30);
            const qBatch = query(
                collection(db, 'attendance'),
                where('studentId', 'in', batchIds)
            );
            const snap = await getDocs(qBatch);
            allRecords.push(...snap.docs.map(d => d.data()));
        }

        // Filter by date in memory
        const filteredRecords = allRecords.filter(r => r.date && r.date >= academicYearStartDate && r.date < firstDayOfNextMonth);
        return processHistoricalRecords(filteredRecords, firstDayOfCurrentMonth, classId);
    };

    const processHistoricalRecords = (records, firstDayOfCurrentMonth, targetClassId) => {
        const studentTotals = {};
        const uniqueDates = new Set();
        const currentMonthRecords = [];
        
        records.forEach(r => {
            if (!r.date) return;
            if (r.date < firstDayOfCurrentMonth) {
                // Historical
                if (r.status === 'Present') {
                    studentTotals[r.studentId] = (studentTotals[r.studentId] || 0) + 1;
                }
                // ONLY count the working day if the class actually met
                if (r.classId === targetClassId || !r.classId) {
                    uniqueDates.add(r.date);
                }
            } else {
                // Current Month
                currentMonthRecords.push(r);
            }
        });
        
        return {
            studentTotals,
            totalWorkingDays: uniqueDates.size,
            currentMonthRecords
        };
    };

    const uniqueResults = React.useMemo(() => {
        const unique = {};
        results.forEach(r => {
            const key = `${r.examId}_${r.subjectId}_${r.studentId}`;
            const rTime = r.timestamp ? new Date(r.timestamp).getTime() : 0;
            const uTime = unique[key]?.timestamp ? new Date(unique[key].timestamp).getTime() : -1;
            if (!unique[key] || rTime > uTime) {
                unique[key] = r;
            }
        });
        return Object.values(unique);
    }, [results]);

    const value = {
        classes, addClass, updateClass, deleteClass, deleteClasses, transferStudentsAndBulkDeleteClass,
        students, addStudent, updateStudent, deleteStudent, deleteStudents, deleteAllStudents,
        allStudents, 
        
        mentors, addMentor, updateMentor, deleteMentor, deleteMentors,
        attendance, recordAttendance, deleteAttendanceBatch, deleteAllAttendanceForStudentIds, deleteAttendanceRecord,
        subjects, addSubject, updateSubject, deleteSubject, deleteSubjects,
        exams, addExam, updateExam, deleteExam,
        results: uniqueResults, recordResult, deleteResultBatch, deleteExamResultsForClass,
        questions, addQuestion, updateQuestion, deleteQuestion,
        studentResponses, submitExam, deleteStudentResponse: async (e, s, stuk) => {
            // First try local state (fast path)
            let r = studentResponses.find(x => x.examId == e && x.subjectId == s && x.studentId == stuk);
            if (r) {
                await deleteDoc(doc(db, 'studentResponses', r.id));
                return;
            }
            // Fallback: query Firestore directly (handles missing classId on old docs)
            try {
                const q1 = query(collection(db, 'studentResponses'),
                    where('examId', '==', e),
                    where('subjectId', '==', s),
                    where('studentId', '==', stuk)
                );
                const snap1 = await getDocs(q1);
                if (!snap1.empty) {
                    for (const d of snap1.docs) await deleteDoc(d.ref);
                    return;
                }
                // Also try matching by subjectName (legacy submissions store name instead of GUID)
                const sub = subjects.find(x => x.id === s);
                if (sub?.name) {
                    const q2 = query(collection(db, 'studentResponses'),
                        where('examId', '==', e),
                        where('subjectName', '==', sub.name),
                        where('studentId', '==', stuk)
                    );
                    const snap2 = await getDocs(q2);
                    for (const d of snap2.docs) await deleteDoc(d.ref);
                }
            } catch (err) {
                console.error('[deleteStudentResponse] Firestore fallback error:', err);
            }
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
        attendanceLimit, loadMoreAttendance,
        resultsLimit, loadMoreResults,
        activitiesLimit, loadMoreActivities,
        getCount,
        totalCounts,
        allMentors,
        allClasses,

        activities, addActivity, updateActivity, deleteActivity, toggleActivityStatus,
        activitySubmissions, markActivityAsDone, markActivityAsPending, getStudentActivityPoints,

        logEntries, addLogEntry, updateLogEntry, deleteLogEntry,
        logLimit, setLogLimit, loadMoreLogs,
        syllabusStatuses, syncSyllabusStatus,
        getPrayerRecordsForMonth: async (studentId, monthStr) => {
            try {
                // Fetch all for student to avoid composite index requirement
                const q = query(
                    collection(db, 'prayerRecords'),
                    where('studentId', '==', studentId)
                );
                const snap = await getDocs(q);
                const all = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                
                // Filter by month in JS
                const start = `${monthStr}-01`;
                const end = `${monthStr}-31`;
                return all.filter(r => r.date >= start && r.date <= end);
            } catch (error) {
                console.error("[DataContext] Error fetching monthly prayer records:", error);
                return [];
            }
        },
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

        gameProgress,
        updateGameProgress: async (studentId, updateFields) => {
            const studentDoc = (students || []).find(s => s.id === studentId) || (allStudents || []).find(s => s.id === studentId);
            const classId = studentDoc?.classId || currentUser?.classId || '';
            const progressRef = doc(db, 'gameProgress', studentId);
            await setDoc(progressRef, {
                ...updateFields,
                studentId,
                classId,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
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
        requireFeature,
        getHistoricalAttendanceStats,

        // Special Prayers
        specialPrayers,
        addSpecialPrayer: async (p) => {
            const created = { ...p, createdAt: new Date().toISOString() };
            const docRef = await addDoc(collection(db, 'specialPrayers'), created);
            setSpecialPrayers(prev => [...prev, { ...created, id: docRef.id }]);
            return docRef;
        },
        updateSpecialPrayer: async (id, u) => {
            await updateDoc(doc(db, 'specialPrayers', id), u);
            setSpecialPrayers(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
        },
        deleteSpecialPrayer: async (id) => {
            await deleteDoc(doc(db, 'specialPrayers', id));
            setSpecialPrayers(prev => prev.filter(p => p.id !== id));
        },

        // Ramadan & Quran Tracking
        ramadanLogs,
        addRamadanLog: async (log) => {
            // classId is required so the mentor's classId-based subscription can find these logs
            const student = students.find(s => s.id === log.studentId) || allStudents.find(s => s.id === log.studentId);
            const classId = log.classId || student?.classId || null;
            return await addDoc(collection(db, 'ramadanLogs'), { ...log, classId, timestamp: new Date().toISOString() });
        },
        updateRamadanLog: async (id, u) => await updateDoc(doc(db, 'ramadanLogs', id), u),
        deleteRamadanLog: async (id) => await deleteDoc(doc(db, 'ramadanLogs', id)),

        quranProgress,
        updateQuranProgress: async (studentId, data) => {
            const existing = quranProgress.find(q => q.studentId === studentId);
            // classId is required so the mentor's classId-based subscription can find this progress
            const student = students.find(s => s.id === studentId) || allStudents.find(s => s.id === studentId);
            const classId = data.classId || existing?.classId || student?.classId || null;
            if (existing) {
                await updateDoc(doc(db, 'quranProgress', existing.id), { ...data, classId, lastUpdated: new Date().toISOString() });
            } else {
                await addDoc(collection(db, 'quranProgress'), { studentId, ...data, classId, lastUpdated: new Date().toISOString() });
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
        createEvaluationForm: async (form) => await addDoc(collection(db, 'evaluationForms'), { 
            ...form, 
            creatorId: currentUser?.id || 'admin',
            createdAt: new Date().toISOString() 
        }),
        updateEvaluationForm: async (id, data) => await updateDoc(doc(db, 'evaluationForms', id), data),
        deleteEvaluationForm: async (id) => await deleteDoc(doc(db, 'evaluationForms', id)),
        
        evaluationSubmissions,
        submitEvaluationResponse: async (response) => await addDoc(collection(db, 'evaluationSubmissions'), { ...response, submittedAt: new Date().toISOString() }),

        // Student Evaluation Templates
        studentEvaluationTemplates,
        createStudentEvaluationTemplate: async (template) => {
            const created = { ...template, createdAt: new Date().toISOString() };
            const docRef = await addDoc(collection(db, 'studentEvaluationTemplates'), created);
            setStudentEvaluationTemplates(prev => [...prev, { ...created, id: docRef.id }]);
            return docRef;
        },
        updateStudentEvaluationTemplate: async (id, data) => {
            await updateDoc(doc(db, 'studentEvaluationTemplates', id), data);
            setStudentEvaluationTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
        },
        deleteStudentEvaluationTemplate: async (id) => {
            await deleteDoc(doc(db, 'studentEvaluationTemplates', id));
            setStudentEvaluationTemplates(prev => prev.filter(t => t.id !== id));
        },

        // Parent Feedback Templates
        parentFeedbackTemplates,
        createParentFeedbackTemplate: async (template) => {
            const created = { ...template, createdAt: new Date().toISOString() };
            const docRef = await addDoc(collection(db, 'parentFeedbackTemplates'), created);
            setParentFeedbackTemplates(prev => [...prev, { ...created, id: docRef.id }]);
            return docRef;
        },
        updateParentFeedbackTemplate: async (id, data) => {
            await updateDoc(doc(db, 'parentFeedbackTemplates', id), data);
            setParentFeedbackTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
        },
        deleteParentFeedbackTemplate: async (id) => {
            await deleteDoc(doc(db, 'parentFeedbackTemplates', id));
            setParentFeedbackTemplates(prev => prev.filter(t => t.id !== id));
        },

        // Mentor Performance Leaderboard
        leaderboardRules,
        leaderboardCompletions,
        leaderboardSettings,
        addLeaderboardRule: async (rule) => await addDoc(collection(db, 'leaderboardRules'), { ...rule, createdAt: new Date().toISOString() }),
        updateLeaderboardRule: async (id, updates) => await updateDoc(doc(db, 'leaderboardRules', id), updates),
        deleteLeaderboardRule: async (id) => {
            // Also delete all completions for this rule
            const batch = writeBatch(db);
            batch.delete(doc(db, 'leaderboardRules', id));
            leaderboardCompletions.filter(c => c.ruleId === id).forEach(c => batch.delete(doc(db, 'leaderboardCompletions', c.id)));
            await batch.commit();
        },
        toggleLeaderboardCompletion: async (ruleId, mentorId, month, currentUser) => {
            const existing = leaderboardCompletions.find(c => c.ruleId === ruleId && c.mentorId === mentorId && c.month === month);
            if (existing) {
                await deleteDoc(doc(db, 'leaderboardCompletions', existing.id));
            } else {
                await addDoc(collection(db, 'leaderboardCompletions'), {
                    ruleId, mentorId, month,
                    completedAt: new Date().toISOString(),
                    markedBy: currentUser?.id || 'admin'
                });
            }
        },
        duplicateRulesForMonth: async (sourceMonth, targetMonth) => {
            const sourceRules = leaderboardRules.filter(r => r.month === sourceMonth);
            const batch = writeBatch(db);
            sourceRules.forEach(rule => {
                const newRef = doc(collection(db, 'leaderboardRules'));
                const { id, createdAt, ...rest } = rule;
                batch.set(newRef, { ...rest, month: targetMonth, createdAt: new Date().toISOString() });
            });
            await batch.commit();
        },
        updateLeaderboardSettings: async (settings) => {
            await setDoc(doc(db, 'settings', 'leaderboard'), settings, { merge: true });
            setLeaderboardSettings(prev => ({ ...prev, ...settings }));
        },

        // Student Assessments & Parent Feedback
        studentEvaluations,
        addStudentEvaluation: async (evaluation) => await addDoc(collection(db, 'studentEvaluations'), { ...evaluation, createdAt: new Date().toISOString() }),
        updateStudentEvaluation: async (id, data) => await updateDoc(doc(db, 'studentEvaluations', id), data),
        deleteStudentEvaluation: async (id) => await deleteDoc(doc(db, 'studentEvaluations', id)),
        
        parentFeedbacks,
        addParentFeedback: async (feedback) => await addDoc(collection(db, 'parentFeedbacks'), { ...feedback, submittedAt: new Date().toISOString() }),
        deleteParentFeedback: async (id) => await deleteDoc(doc(db, 'parentFeedbacks', id)),

        feedbackSettings,
        updateFeedbackSettings: async (classId, settings) => {
            await setDoc(doc(db, 'feedbackSettings', classId), { classId, ...settings }, { merge: true });
        },
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export default DataContext;
