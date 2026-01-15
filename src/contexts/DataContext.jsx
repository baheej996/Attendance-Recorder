import React, { createContext, useContext, useEffect, useState } from 'react';
import localforage from 'localforage';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // Initial Data with Robust Parsing
    const [classes, setClasses] = useState(() => {
        try {
            const saved = localStorage.getItem('classes')
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing classes:", e);
            return [];
        }
    });

    const [students, setStudents] = useState(() => {
        try {
            const saved = localStorage.getItem('students');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing students:", e);
            return [];
        }
    });

    const [mentors, setMentors] = useState(() => {
        try {
            const saved = localStorage.getItem('mentors');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing mentors:", e);
            return [];
        }
    });

    const [attendance, setAttendance] = useState(() => {
        try {
            const saved = localStorage.getItem('attendance');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing attendance:", e);
            return [];
        }
    });

    const [subjects, setSubjects] = useState(() => {
        try {
            const saved = localStorage.getItem('subjects');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing subjects:", e);
            return [];
        }
    });

    const [exams, setExams] = useState(() => {
        try {
            const saved = localStorage.getItem('exams');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing exams:", e);
            return [];
        }
    });

    const [results, setResults] = useState(() => {
        try {
            const saved = localStorage.getItem('results');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing results:", e);
            return [];
        }
    });

    const [questions, setQuestions] = useState([]);
    const [studentResponses, setStudentResponses] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]); // New: Leave Requests
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Load Heavy Data (Questions & Responses) from IndexedDB (localforage)
    useEffect(() => {
        const loadHeavyData = async () => {
            try {
                // Questions Migration checks
                const legacyQuestions = localStorage.getItem('questions');
                if (legacyQuestions) {
                    console.log("Migrating questions to IndexedDB...");
                    const parsed = JSON.parse(legacyQuestions);
                    setQuestions(parsed);
                    await localforage.setItem('questions', parsed);
                    localStorage.removeItem('questions');
                } else {
                    const loadedQuestions = await localforage.getItem('questions');
                    if (loadedQuestions) setQuestions(loadedQuestions);
                }

                // Responses Migration checks
                const legacyResponses = localStorage.getItem('studentResponses');
                if (legacyResponses) {
                    console.log("Migrating studentResponses to IndexedDB...");
                    const parsed = JSON.parse(legacyResponses);
                    setStudentResponses(parsed);
                    await localforage.setItem('studentResponses', parsed);
                    localStorage.removeItem('studentResponses');
                } else {
                    const loadedResponses = await localforage.getItem('studentResponses');
                    if (loadedResponses) setStudentResponses(loadedResponses);
                }

                // Leave Requests Loading
                const loadedLeaveRequests = await localforage.getItem('leaveRequests');
                if (loadedLeaveRequests) setLeaveRequests(loadedLeaveRequests);
            } catch (err) {
                console.error("Error loading heavy data:", err);
            } finally {
                setIsDataLoaded(true);
            }
        };
        loadHeavyData();
    }, []);

    // Sync Questions to localforage
    useEffect(() => {
        if (isDataLoaded) {
            localforage.setItem('questions', questions).catch(e => console.error("Error saving questions:", e));
        }
    }, [questions, isDataLoaded]);

    // Sync StudentResponses to localforage
    useEffect(() => {
        if (isDataLoaded) {
            localforage.setItem('studentResponses', studentResponses).catch(e => console.error("Error saving studentResponses:", e));
        }
    }, [studentResponses, isDataLoaded]);

    // Sync LeaveRequests to localforage
    useEffect(() => {
        if (isDataLoaded) {
            localforage.setItem('leaveRequests', leaveRequests).catch(e => console.error("Error saving leaveRequests:", e));
        }
    }, [leaveRequests, isDataLoaded]);

    const [institutionSettings, setInstitutionSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('institutionSettings');
            return saved ? JSON.parse(saved) : {
                name: 'Attendance Recorder',
                tagline: 'Track Smart, Act Fast',
                academicYear: '2024-2025',
                chiefMentor: 'Dr. Principal'
            };
        } catch (e) {
            console.error("Error parsing institution settings:", e);
            return {
                name: 'Attendance Recorder',
                tagline: 'Track Smart, Act Fast',
                academicYear: '2024-2025',
                chiefMentor: 'Dr. Principal'
            };
        }
    });

    const [adminCredentials, setAdminCredentials] = useState(() => {
        try {
            const saved = localStorage.getItem('adminCredentials');
            return saved ? JSON.parse(saved) : { username: 'admin', password: 'admin123' };
        } catch (e) {
            console.error("Error parsing admin credentials:", e);
            return { username: 'admin', password: 'admin123' };
        }
    });

    // Unified Seeding Logic (Run only ONCE on first ever load)
    useEffect(() => {
        const isInitialized = localStorage.getItem('appInitialized');

        if (!isInitialized) {
            // CRITICAL FIX: Check if data actually exists before overwriting!
            const hasData = classes.length > 0 || students.length > 0;
            if (hasData) {
                console.log("Existing data found. Skipping seed, setting initialized flag.");
                localStorage.setItem('appInitialized', 'true');
                return;
            }

            console.log("First time load: Seeding demo data...");

            // 1. Seed Classes
            const id1A = generateId();
            const id2B = generateId();
            const initialClasses = [
                { id: id1A, name: "1", division: "A" },
                { id: id2B, name: "2", division: "B" }
            ];
            setClasses(initialClasses);

            // 2. Seed Students
            const initialStudents = [
                {
                    id: generateId(),
                    name: "SHAHAN AHMED",
                    registerNo: "REG001",
                    uid: "UID123",
                    gender: "Male",
                    status: "Active",
                    classId: id1A
                },
                {
                    id: generateId(),
                    name: "MUHAMMED IZYAN K",
                    registerNo: "REG002",
                    uid: "UID124",
                    gender: "Male",
                    status: "Active",
                    classId: id2B
                }
            ];
            setStudents(initialStudents);

            // 3. Seed Subjects
            const initialSubjects = [
                { id: generateId(), name: "English", classId: id1A, maxMarks: 100, passMarks: 40 },
                { id: generateId(), name: "Mathematics", classId: id1A, maxMarks: 100, passMarks: 40 },
                { id: generateId(), name: "Science", classId: id1A, maxMarks: 100, passMarks: 40 }
            ];
            setSubjects(initialSubjects);

            // 4. Seed Exams
            const initialExams = [{
                id: generateId(),
                name: "First Term Examination",
                date: new Date().toISOString().split('T')[0],
                status: "Published"
            }];
            setExams(initialExams);

            // Mark as initialized
            localStorage.setItem('appInitialized', 'true');
        }
    }, [classes.length, students.length]);

    // Effects to save data
    useEffect(() => localStorage.setItem('classes', JSON.stringify(classes)), [classes]);
    useEffect(() => localStorage.setItem('students', JSON.stringify(students)), [students]);
    useEffect(() => localStorage.setItem('mentors', JSON.stringify(mentors)), [mentors]);
    useEffect(() => localStorage.setItem('attendance', JSON.stringify(attendance)), [attendance]);
    useEffect(() => localStorage.setItem('subjects', JSON.stringify(subjects)), [subjects]);
    useEffect(() => localStorage.setItem('exams', JSON.stringify(exams)), [exams]);
    useEffect(() => localStorage.setItem('results', JSON.stringify(results)), [results]);
    // Removed questions and studentResponses localStorage sync to avoid conflict with localforage migration logic
    useEffect(() => localStorage.setItem('institutionSettings', JSON.stringify(institutionSettings)), [institutionSettings]);
    useEffect(() => localStorage.setItem('adminCredentials', JSON.stringify(adminCredentials)), [adminCredentials]);

    // Helper for safe ID generation
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Auth State
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('currentUser');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
        else localStorage.removeItem('currentUser');
    }, [currentUser]);

    const login = (user) => setCurrentUser(user);
    const logout = () => setCurrentUser(null);

    // Actions
    const addClass = (cls) => setClasses(prev => [...prev, { ...cls, id: generateId() }]);
    const updateClass = (id, updated) => setClasses(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    const deleteClass = (id) => setClasses(prev => prev.filter(c => c.id !== id));

    // Mentor Actions
    const addMentor = (mentor) => setMentors(prev => [...prev, { ...mentor, id: generateId() }]);
    const updateMentor = (id, updated) => setMentors(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m));
    const deleteMentor = (id) => setMentors(prev => prev.filter(m => m.id !== id));

    // Student Actions
    const addStudent = (student) => setStudents(prev => [...prev, { ...student, id: generateId(), status: 'Active' }]);
    const updateStudent = (id, updated) => setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    const deleteStudent = (id) => setStudents(prev => prev.filter(s => s.id !== id));

    // Subject Actions
    const addSubject = (subject) => setSubjects(prev => [...prev, { ...subject, id: generateId() }]);
    const updateSubject = (id, updated) => setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    const deleteSubject = (id) => setSubjects(prev => prev.filter(s => s.id !== id));

    // Exam Actions
    const addExam = (exam) => setExams(prev => [...prev, { ...exam, id: generateId(), status: 'Draft', isActive: false }]);
    const updateExam = (id, updated) => setExams(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    const deleteExam = (id) => setExams(prev => prev.filter(e => e.id !== id));

    // Question Actions
    const addQuestion = (q) => setQuestions(prev => [...prev, { ...q, id: generateId() }]);
    const deleteQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id));
    const recalculateResultsForQuestion = (updatedQuestion, allQuestions) => {
        console.log(`[Regrade] Triggered for Question: ${updatedQuestion.text}, Correct: ${updatedQuestion.correctAnswer}`);

        // Find students who answered this question
        const affectedResponses = studentResponses.filter(r =>
            r.answers && r.answers[updatedQuestion.id] !== undefined
        );

        console.log(`[Regrade] Found ${affectedResponses.length} affected responses`);

        if (affectedResponses.length === 0) return;

        const updates = [];

        affectedResponses.forEach(response => {
            console.log(`[Regrade] Recalculating for Student: ${response.studentId}`);

            // Recalculate Score for this student
            const relevantQuestions = allQuestions.filter(q =>
                q.examId === response.examId &&
                q.subjectId === (response.subjectName || response.subjectId)
            );

            console.log(`[Regrade] Found ${relevantQuestions.length} relevant questions for Subject: ${response.subjectName}`);

            let newScore = 0;
            relevantQuestions.forEach(q => {
                const studentAns = response.answers[q.id];
                const isCorrect = q.type === 'MCQ' && studentAns === q.correctAnswer;
                console.log(`[Regrade] Q: ${q.text} (${q.marks}m) - Ans: ${studentAns} vs Correct: ${q.correctAnswer} -> ${isCorrect ? 'MATCH' : 'NO'}`);

                if (isCorrect) {
                    newScore += Number(q.marks);
                }
            });
            console.log(`[Regrade] New Total Score: ${newScore}`);

            // Prepare updates
            const updatedResp = { ...response, autoScore: newScore };

            const existingResult = results.find(r =>
                r.examId === response.examId &&
                r.subjectId === response.subjectId &&
                r.studentId === response.studentId
            );

            let updatedRes = null;
            if (existingResult) {
                updatedRes = { ...existingResult, marks: newScore };
            }

            updates.push({ response: updatedResp, result: updatedRes });
        });

        // Batch Apply
        if (updates.length > 0) {
            setStudentResponses(prev => prev.map(r => {
                const match = updates.find(u => u.response.id === r.id);
                return match ? match.response : r;
            }));

            setResults(prev => prev.map(r => {
                const match = updates.find(u => u.result && u.result.id === r.id);
                return match ? match.result : r;
            }));
        }
    };

    const updateQuestion = (id, updated) => {
        // Calculate the new state from the current valid 'questions'
        // 'questions' in scope is from the current render cycle
        const oldQ = questions.find(q => q.id === id);
        if (!oldQ) return;

        // Create the updated question object
        const newQ = { ...oldQ, ...updated };

        // Create the new questions array
        const newQuestions = questions.map(q => q.id === id ? newQ : q);

        // 1. Update State synchronously (react will batch)
        setQuestions(newQuestions);

        // 2. Trigger Re-grading if critical fields changed
        // We pass 'newQuestions' explicitly so grading sees the update immediately
        if (oldQ.correctAnswer !== newQ.correctAnswer || oldQ.marks !== newQ.marks) {
            console.log(`[UpdateQuestion] Detected change. Triggering Regrade for Q: ${newQ.text}`);
            recalculateResultsForQuestion(newQ, newQuestions);
        }
    };
    // q object: { examId (optional global), classLevel, subjectId, type, text, options:[], correctAnswer, marks }

    // Advanced Scheduling: Per-subject/class settings
    // { id, examId, classId, subjectId, isActive, isPublished, startTime, endTime }
    const [examSettings, setExamSettings] = useState(() => {
        const saved = localStorage.getItem('examSettings');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('examSettings', JSON.stringify(examSettings));
    }, [examSettings]);

    const updateExamSetting = (examId, classId, subjectId, updates) => {
        setExamSettings(prev => {
            const index = prev.findIndex(s => s.examId === examId && s.classId === classId && s.subjectId === subjectId);
            if (index >= 0) {
                const newSettings = [...prev];
                newSettings[index] = { ...newSettings[index], ...updates };
                return newSettings;
            } else {
                return [...prev, { id: generateId(), examId, classId, subjectId, isActive: false, isPublished: false, ...updates }];
            }
        });
    };

    // Exam Submission & Auto-grading
    const submitExam = (submission) => {
        // submission: { examId, subjectId, studentId, answers: { qId: val } }
        const rId = generateId();
        const timestamp = new Date().toISOString();

        // 1. Calculate Score
        let score = 0;
        const relevantQuestions = questions.filter(q =>
            // Match questions to this context (logic depends on how we link questions to exams)
            // For now assuming questions are linked via Class/Subject, and we filter by that.
            // BUT: User said "mentor can create questions... for that batch". 
            // So we need to match questions that belong to this Subject & Class.
            // FIX: Use subjectName for question lookup if provided (since questions are linked by Name), 
            // otherwise fallback to subjectId.
            q.subjectId === (submission.subjectName || submission.subjectId)
            // And potentially Exam ID if questions are Exam-specific?
            // "create questions for each subject in each class under the exam created by the admin"
            // So yes, Questions should have 'examId'.
            && q.examId === submission.examId
        );

        relevantQuestions.forEach(q => {
            const studentAns = submission.answers[q.id];
            if (q.type === 'MCQ' && studentAns === q.correctAnswer) {
                score += Number(q.marks);
            }
            // Text answers get 0 initially, need manual grading
        });

        // 2. Save Response
        const newResponse = {
            id: rId,
            ...submission,
            timestamp,
            status: 'Submitted',
            autoScore: score
        };

        setStudentResponses(prev => [...prev.filter(r => !(r.examId === submission.examId && r.subjectId === submission.subjectId && r.studentId === submission.studentId)), newResponse]);

        // 3. Update Results (Leaderboard) with Auto-Score
        // Note: This overrides any previous result for this exam/subject
        const newResult = {
            id: generateId(),
            examId: submission.examId,
            subjectId: submission.subjectId,
            studentId: submission.studentId,
            marks: score,
            timestamp
        };

        setResults(prev => {
            const filtered = prev.filter(p => !(p.examId === submission.examId && p.subjectId === submission.subjectId && p.studentId === submission.studentId));
            return [...filtered, newResult];
        });
    };

    // Result Actions
    // Record is { examId, subjectId, records: [{ studentId, marks }] }
    const recordResult = (data) => {
        const timestamp = new Date().toISOString();
        const newResults = data.records.map(r => ({
            id: generateId(),
            examId: data.examId,
            subjectId: data.subjectId,
            studentId: r.studentId,
            marks: r.marks, // could be number or "A+" etc
            timestamp
        }));

        setResults(prev => {
            // Remove existing results for same exam/subject/student to allow updates
            const filtered = prev.filter(p =>
                !(p.examId === data.examId && p.subjectId === data.subjectId && newResults.some(nr => nr.studentId === p.studentId))
            );
            return [...filtered, ...newResults];
        });
    };

    const deleteResultBatch = (examId, subjectId, studentIds) => {
        setResults(prev => prev.filter(r =>
            !(r.examId === examId && r.subjectId === subjectId && studentIds.includes(r.studentId))
        ));
    };

    const deleteStudentResponse = (examId, subjectId, studentId) => {
        setStudentResponses(prev => prev.filter(r =>
            !(r.examId === examId && r.subjectId === subjectId && r.studentId === studentId)
        ));
    };

    const recordAttendance = (record) => {
        // Record is { date, records: [{ studentId, status }] }
        // We flatten this to store individual records or keep as sessions. 
        // Let's store individual records: { id, date, studentId, status, mentorId }

        const newRecords = record.records.map(r => ({
            id: generateId(),
            date: record.date,
            studentId: r.studentId,
            status: r.status,
            mentorId: record.mentorId
        }));

        setAttendance(prev => {
            // Remove existing records for same day/student to allow updates
            const filtered = prev.filter(p =>
                !(p.date === record.date && newRecords.some(nr => nr.studentId === p.studentId))
            );
            return [...filtered, ...newRecords];
        });
    };

    const deleteAttendanceBatch = (date, studentIds) => {
        setAttendance(prev => prev.filter(r =>
            !(r.date === date && studentIds.includes(r.studentId))
        ));
    };

    const updateInstitutionSettings = (newSettings) => {
        setInstitutionSettings(prev => ({ ...prev, ...newSettings }));
    };

    const updateAdminCredentials = (username, password) => {
        setAdminCredentials({ username, password });
    };

    const validateAdmin = (username, password) => {
        return username === adminCredentials.username && password === adminCredentials.password;
    };

    const deleteAllAttendanceForStudentIds = (studentIds) => {
        setAttendance(prev => prev.filter(r => !studentIds.includes(r.studentId)));
    };

    const resetData = () => {
        setClasses([]);
        setStudents([]);
        setMentors([]);
        setAttendance([]);
        localStorage.removeItem('classes');
        localStorage.removeItem('students');
        localStorage.removeItem('mentors');
        setExams([]);
        setResults([]);
        setQuestions([]);
        setStudentResponses([]);
        localforage.removeItem('questions');
        localforage.removeItem('studentResponses');
    };

    const deleteAllClasses = () => {
        setClasses([]);
        localStorage.removeItem('classes');
    };

    const deleteAllMentors = () => {
        setMentors([]);
        localStorage.removeItem('mentors');
    };

    const deleteAllStudents = () => {
        setStudents([]);
        localStorage.removeItem('students');
    };

    const deleteClasses = (ids) => setClasses(prev => prev.filter(c => !ids.includes(c.id)));
    const deleteMentors = (ids) => setMentors(prev => prev.filter(m => !ids.includes(m.id)));
    const deleteStudents = (ids) => setStudents(prev => prev.filter(s => !ids.includes(s.id)));

    // Activities State
    const [activities, setActivities] = useState(() => {
        try {
            const saved = localStorage.getItem('activities');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing activities:", e);
            return [];
        }
    });

    // Activity Submissions/Tracking State
    const [activitySubmissions, setActivitySubmissions] = useState(() => {
        try {
            const saved = localStorage.getItem('activitySubmissions');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing activitySubmissions:", e);
            return [];
        }
    });

    // Log Book State
    const [logEntries, setLogEntries] = useState(() => {
        try {
            const saved = localStorage.getItem('logEntries');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing logEntries:", e);
            return [];
        }
    });

    // Prayer Chart State
    const [prayerRecords, setPrayerRecords] = useState(() => {
        try {
            const saved = localStorage.getItem('prayerRecords');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing prayerRecords:", e);
            return [];
        }
    });

    useEffect(() => localStorage.setItem('activities', JSON.stringify(activities)), [activities]);
    useEffect(() => localStorage.setItem('activitySubmissions', JSON.stringify(activitySubmissions)), [activitySubmissions]);
    useEffect(() => localStorage.setItem('logEntries', JSON.stringify(logEntries)), [logEntries]);
    useEffect(() => localStorage.setItem('prayerRecords', JSON.stringify(prayerRecords)), [prayerRecords]);

    // Activity Actions
    const addActivity = (activity) => {
        const newActivity = { ...activity, id: generateId(), status: 'Active', createdAt: new Date().toISOString() };
        setActivities(prev => [...prev, newActivity]);
    };

    const updateActivity = (id, updates) => {
        setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const deleteActivity = (id) => {
        setActivities(prev => prev.filter(a => a.id !== id));
        // Also clean up submissions
        setActivitySubmissions(prev => prev.filter(s => s.activityId !== id));
    };

    const toggleActivityStatus = (id) => {
        setActivities(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a));
    };

    // Submission/Grading Actions
    const markActivityAsDone = (activityId, studentId, points = 0) => {
        setActivitySubmissions(prev => {
            const existing = prev.find(s => s.activityId === activityId && s.studentId === studentId);
            if (existing) {
                return prev.map(s => s.activityId === activityId && s.studentId === studentId ? { ...s, status: 'Completed', points, timestamp: new Date().toISOString() } : s);
            }
            return [...prev, { id: generateId(), activityId, studentId, status: 'Completed', points, timestamp: new Date().toISOString() }];
        });
    };

    const markActivityAsPending = (activityId, studentId) => {
        setActivitySubmissions(prev => prev.filter(s => !(s.activityId === activityId && s.studentId === studentId)));
    };

    const getStudentActivityPoints = (studentId) => {
        return activitySubmissions
            .filter(s => s.studentId === studentId && s.status === 'Completed')
            .reduce((sum, s) => sum + (Number(s.points) || 0), 0);
    };

    // Log Book Actions
    const addLogEntry = (entry) => {
        const newEntry = { ...entry, id: generateId(), timestamp: new Date().toISOString() };
        setLogEntries(prev => [newEntry, ...prev]);
    };

    const updateLogEntry = (id, updates) => {
        setLogEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    };

    const deleteLogEntry = (id) => {
        setLogEntries(prev => prev.filter(e => e.id !== id));
    };

    // Prayer Chart Actions
    const addPrayerRecord = (record) => {
        // record: { studentId, date, prayers: { fajr: bool, dhuhr: bool, ... } }
        setPrayerRecords(prev => {
            // Check if record exists for this student and date
            const existingIndex = prev.findIndex(r => r.studentId === record.studentId && r.date === record.date);
            if (existingIndex >= 0) {
                const newRecords = [...prev];
                newRecords[existingIndex] = { ...newRecords[existingIndex], ...record, timestamp: new Date().toISOString() };
                return newRecords;
            }
            return [...prev, { ...record, id: generateId(), timestamp: new Date().toISOString() }];
        });
    };

    const getPrayerRecordsByStudent = (studentId) => {
        return prayerRecords.filter(r => r.studentId === studentId);
    };

    // Leave Request Actions
    const addLeaveRequest = (request) => {
        // request: { studentId, classId, startDate, endDate, reason, type }
        const newRequest = {
            ...request,
            id: generateId(),
            status: 'Pending',
            createdAt: new Date().toISOString()
        };
        setLeaveRequests(prev => [newRequest, ...prev]);
        return newRequest;
    };

    const updateLeaveRequest = (id, updates) => {
        setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const deleteLeaveRequest = (id) => {
        setLeaveRequests(prev => prev.filter(r => r.id !== id));
    };

    return (
        <DataContext.Provider value={{
            classes, addClass, updateClass, deleteClass, deleteClasses, deleteAllClasses,
            students, addStudent, updateStudent, setStudents, deleteStudent, deleteStudents, deleteAllStudents,
            mentors, addMentor, updateMentor, deleteMentor, deleteMentors, deleteAllMentors,
            attendance, recordAttendance, setAttendance, deleteAttendanceBatch, deleteAllAttendanceForStudentIds,
            subjects, addSubject, updateSubject, deleteSubject,
            exams, addExam, updateExam, deleteExam, examSettings, updateExamSetting,
            results, recordResult, deleteResultBatch, setResults,
            questions, addQuestion, deleteQuestion, updateQuestion,
            studentResponses, submitExam, deleteStudentResponse,
            currentUser, login, logout,
            resetData,
            institutionSettings, updateInstitutionSettings,
            validateAdmin, updateAdminCredentials,
            // Activities Exports
            activities, addActivity, updateActivity, deleteActivity, toggleActivityStatus,
            activitySubmissions, markActivityAsDone, markActivityAsPending, getStudentActivityPoints,
            // Log Book Exports
            logEntries, addLogEntry, updateLogEntry, deleteLogEntry,
            // Prayer Chart Exports
            prayerRecords, addPrayerRecord, getPrayerRecordsByStudent,
            // Leave Request Exports
            leaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest
        }}>
            {children}
        </DataContext.Provider>
    );
};
