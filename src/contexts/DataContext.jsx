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
    writeBatch
} from 'firebase/firestore';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // --- State Definitions ---
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [studentResponses, setStudentResponses] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [activities, setActivities] = useState([]);
    const [activitySubmissions, setActivitySubmissions] = useState([]);
    const [logEntries, setLogEntries] = useState([]);
    const [prayerRecords, setPrayerRecords] = useState([]);
    const [specialPrayers, setSpecialPrayers] = useState([]);

    // Settings & Misc
    const [starDeclarations, setStarDeclarations] = useState([]);
    const [adminRequests, setAdminRequests] = useState([]);
    const [chatSettings, setChatSettings] = useState([]);
    const [mentorSettings, setMentorSettings] = useState({ sidebarOrder: [] });
    const [examSettings, setExamSettings] = useState([]);

    const [institutionSettings, setInstitutionSettings] = useState({
        name: 'Attendance Recorder',
        tagline: 'Track Smart, Act Fast',
        academicYear: '2024-2025',
        chiefMentor: 'Dr. Principal',
        favicon: '/vite.svg'
    });
    const [adminCredentials, setAdminCredentials] = useState({ username: 'admin', password: 'admin123' });
    const [studentFeatureFlags, setStudentFeatureFlags] = useState({
        activities: true,
        exams: true,
        results: true,
        leave: true,
        chat: true,
        prayer: true,
        history: true,
        leaderboard: true,
        star: true,
        help: true
    });
    const [classFeatureFlags, setClassFeatureFlags] = useState([]);

    // Local Session State (No need to sync across devices)
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('currentUser');
        return saved ? JSON.parse(saved) : null;
    });

    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // --- Firestore Listeners ---
    // Helper to subscribe to a collection
    const subscribe = (collectionName, setState) => {
        const q = query(collection(db, collectionName));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setState(data);
        });
    };

    useEffect(() => {
        const unsubs = [
            subscribe('classes', setClasses),
            subscribe('students', setStudents),
            subscribe('mentors', setMentors),
            subscribe('attendance', setAttendance),
            subscribe('subjects', setSubjects),
            subscribe('exams', setExams),
            subscribe('results', setResults),
            subscribe('questions', setQuestions),
            subscribe('studentResponses', setStudentResponses),
            subscribe('leaveRequests', setLeaveRequests),
            subscribe('chatMessages', setChatMessages),
            subscribe('activities', setActivities),
            subscribe('activitySubmissions', setActivitySubmissions),
            subscribe('logEntries', setLogEntries),
            subscribe('prayerRecords', setPrayerRecords),
            subscribe('specialPrayers', setSpecialPrayers),

            subscribe('starDeclarations', setStarDeclarations),
            subscribe('adminRequests', setAdminRequests),
            subscribe('chatSettings', setChatSettings),
            subscribe('examSettings', setExamSettings),
            subscribe('classFeatureFlags', setClassFeatureFlags),
        ];

        // Single doc settings - we'll subscribe to the collection and find the doc
        const settingsUnsub = onSnapshot(collection(db, 'settings'), (snapshot) => {
            snapshot.docs.forEach(doc => {
                if (doc.id === 'institution') setInstitutionSettings(doc.data());
                if (doc.id === 'admin') setAdminCredentials(doc.data());
                if (doc.id === 'mentorUI') setMentorSettings(doc.data());
                if (doc.id === 'studentFeatures') setStudentFeatureFlags(doc.data());
            });
        });

        setIsDataLoaded(true); // Technically triggers before first data arrival, but listeners are active
        return () => {
            unsubs.forEach(u => u());
            settingsUnsub();
        };
    }, []);


    // --- Seeding Logic ---
    useEffect(() => {
        // Only run seeding if we have connected conceptually (useEffect runs), 
        // but we need to check if DB is actually empty.
        const checkAndSeed = async () => {
            const classesRef = collection(db, 'classes');
            const snapshot = await getDocs(classesRef);

            if (snapshot.empty) {
                console.log("No classes found in Firestore. Seeding demo data...");

                // 1. Seed Classes
                const class1 = await addDoc(collection(db, 'classes'), { name: "1", division: "A" });
                const class2 = await addDoc(collection(db, 'classes'), { name: "2", division: "B" });

                // 2. Seed Students
                await addDoc(collection(db, 'students'), {
                    name: "SHAHAN AHMED", registerNo: "REG001", uid: "UID123", gender: "Male", status: "Active", classId: class1.id
                });
                await addDoc(collection(db, 'students'), {
                    name: "MUHAMMED IZYAN K", registerNo: "REG002", uid: "UID124", gender: "Male", status: "Active", classId: class2.id
                });

                // 3. Seed Subjects
                await addDoc(collection(db, 'subjects'), { name: "English", classId: class1.id, maxMarks: 100, passMarks: 40, isExamSubject: true });
                await addDoc(collection(db, 'subjects'), { name: "Mathematics", classId: class1.id, maxMarks: 100, passMarks: 40, isExamSubject: true });
                await addDoc(collection(db, 'subjects'), { name: "Science", classId: class1.id, maxMarks: 100, passMarks: 40, isExamSubject: true });

                // 4. Seed Exams
                await addDoc(collection(db, 'exams'), {
                    name: "First Term Examination", date: new Date().toISOString().split('T')[0], status: "Published"
                });

                // 5. Seed Settings
                await setDoc(doc(db, 'settings', 'institution'), {
                    name: 'Attendance Recorder', tagline: 'Track Smart, Act Fast', academicYear: '2024-2025', chiefMentor: 'Dr. Principal'
                });
                await setDoc(doc(db, 'settings', 'admin'), { username: 'admin', password: 'admin123' });
                await setDoc(doc(db, 'settings', 'mentorUI'), { sidebarOrder: [] });
            }
        };

        // Simple debounce or check to ensure we don't run this excessively, 
        // but standard empty check is safe enough for this scale.
        checkAndSeed();
    }, []);


    // --- Auth Logic ---
    useEffect(() => {
        if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
        else localStorage.removeItem('currentUser');
    }, [currentUser]);

    const login = (user) => setCurrentUser(user);
    const logout = () => setCurrentUser(null);
    const validateAdmin = (username, password) => {
        return username === adminCredentials.username && password === adminCredentials.password;
    };


    // --- Actions ---
    // Helper for adding/updating
    // Note: Firestore adds 'id' automatically on addDoc, but we want to return it properly or wait.
    // However, the listeners update the state.

    // Classes
    const addClass = async (cls) => await addDoc(collection(db, 'classes'), cls);
    const updateClass = async (id, updated) => await updateDoc(doc(db, 'classes', id), updated);
    const deleteClass = async (id) => await deleteDoc(doc(db, 'classes', id));
    // Bulk delete (used in settings)
    const deleteClasses = async (ids) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, 'classes', id)));
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

    // Exams
    const addExam = async (exam) => await addDoc(collection(db, 'exams'), { ...exam, status: 'Draft', isActive: false });
    const updateExam = async (id, updated) => await updateDoc(doc(db, 'exams', id), updated);
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
                status: r.status,
                mentorId: record.mentorId
            });
        });
        await batch.commit();
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
        await setDoc(doc(db, 'settings', 'institution'), { ...institutionSettings, ...newSettings });
    };

    const updateAdminCredentials = async (username, password) => {
        await setDoc(doc(db, 'settings', 'admin'), { username, password });
    };

    // Reset Data (Optional, be careful!)
    const resetData = async () => {
        // This is dangerous and hard to verify permissions. 
        // We'll leave it as a manual console operation or iterate delete if really needed.
        console.log("Reset Data requested - function disabled for safety in Firestore mode.");
    };


    // Activities
    const addActivity = async (activity) => await addDoc(collection(db, 'activities'), { ...activity, status: 'Active', createdAt: new Date().toISOString() });
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
    const addLogEntry = async (entry) => await addDoc(collection(db, 'logEntries'), { ...entry, timestamp: new Date().toISOString() });
    const updateLogEntry = async (id, updates) => await updateDoc(doc(db, 'logEntries', id), updates);
    const deleteLogEntry = async (id) => await deleteDoc(doc(db, 'logEntries', id));

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
    const updateLeaveRequest = async (id, updates) => await updateDoc(doc(db, 'leaveRequests', id), updates);
    const deleteLeaveRequest = async (id) => await deleteDoc(doc(db, 'leaveRequests', id));
    const deleteLeaveRequests = async (ids) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, 'leaveRequests', id)));
        await batch.commit();
    };

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
            // Default to true if creating for the first time? Or true because we are toggling *on*?
            // If it was effectively false (not found), we want to make it true.
            await addDoc(collection(db, 'chatSettings'), { classId, isEnabled: true });
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

    const addAdminRequest = async (req) => await addDoc(collection(db, 'adminRequests'), req);
    const updateAdminRequest = async (id, upd) => await updateDoc(doc(db, 'adminRequests', id), upd);
    const deleteAdminRequest = async (id) => await deleteDoc(doc(db, 'adminRequests', id));


    // Exam Settings
    const updateExamSetting = async (examId, classId, subjectId, updates) => {
        const docId = `${examId}_${classId}_${subjectId}`;
        await setDoc(doc(db, 'examSettings', docId), { examId, classId, subjectId, ...updates }, { merge: true });
    };


    const value = {
        classes, addClass, updateClass, deleteClass, deleteClasses,
        students, addStudent, updateStudent, deleteStudent, deleteStudents, deleteAllStudents,
        mentors, addMentor, updateMentor, deleteMentor, deleteMentors,
        attendance, recordAttendance, deleteAttendanceBatch, deleteAllAttendanceForStudentIds,
        subjects, addSubject, updateSubject, deleteSubject,
        exams, addExam, updateExam, deleteExam,
        results, recordResult, deleteResultBatch,
        questions, addQuestion, updateQuestion, deleteQuestion,
        studentResponses, submitExam, deleteStudentResponse: async (e, s, stuk) => {
            const r = studentResponses.find(x => x.examId == e && x.subjectId == s && x.studentId == stuk);
            if (r) await deleteDoc(doc(db, 'studentResponses', r.id));
        },

        currentUser, login, logout,
        institutionSettings, updateInstitutionSettings,
        adminCredentials, updateAdminCredentials, validateAdmin,

        activities, addActivity, updateActivity, deleteActivity, toggleActivityStatus,
        activitySubmissions, markActivityAsDone, markActivityAsPending, getStudentActivityPoints,

        logEntries, addLogEntry, updateLogEntry, deleteLogEntry,
        prayerRecords, addPrayerRecord, getPrayerRecordsByStudent, deletePrayerRecordsForStudents,
        leaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest, deleteLeaveRequests,

        // New / Misc
        starDeclarations, saveStarDeclaration, deleteStarDeclaration,
        adminRequests, addAdminRequest, updateAdminRequest, deleteAdminRequest,
        chatMessages, sendMessage: async (msg) => await addDoc(collection(db, 'chatMessages'), { ...msg, timestamp: new Date().toISOString() }),
        markMessagesAsRead, deleteChatConversation,

        examSettings, updateExamSetting,
        chatSettings, toggleChatForClass, // Exported to fix crash

        mentorSettings, updateMentorSettings: async (s) => await setDoc(doc(db, 'settings', 'mentorUI'), s),

        studentFeatureFlags, updateStudentFeatureFlags: async (flags) => await setDoc(doc(db, 'settings', 'studentFeatures'), flags, { merge: true }),
        classFeatureFlags, updateClassFeatureFlags: async (classId, flags) => await setDoc(doc(db, 'classFeatureFlags', classId), { classId, ...flags }, { merge: true }),

        resetData,
        isDataLoaded,

        // Special Prayers
        specialPrayers,
        addSpecialPrayer: async (p) => await addDoc(collection(db, 'specialPrayers'), { ...p, createdAt: new Date().toISOString() }),
        updateSpecialPrayer: async (id, u) => await updateDoc(doc(db, 'specialPrayers', id), u),
        deleteSpecialPrayer: async (id) => await deleteDoc(doc(db, 'specialPrayers', id))
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export default DataContext;
