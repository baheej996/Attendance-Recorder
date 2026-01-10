import React, { createContext, useContext, useEffect, useState } from 'react';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // Initial Data with Robust Parsing
    const [classes, setClasses] = useState(() => {
        try {
            const saved = localStorage.getItem('classes');
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

    const [questions, setQuestions] = useState(() => {
        try {
            const saved = localStorage.getItem('questions');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing questions:", e);
            return [];
        }
    });

    const [studentResponses, setStudentResponses] = useState(() => {
        try {
            const saved = localStorage.getItem('studentResponses');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing studentResponses:", e);
            return [];
        }
    });

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
    useEffect(() => localStorage.setItem('questions', JSON.stringify(questions)), [questions]);
    useEffect(() => localStorage.setItem('studentResponses', JSON.stringify(studentResponses)), [studentResponses]);
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
    const deleteSubject = (id) => setSubjects(prev => prev.filter(s => s.id !== id));

    // Exam Actions
    const addExam = (exam) => setExams(prev => [...prev, { ...exam, id: generateId(), status: 'Draft', isActive: false }]);
    const updateExam = (id, updated) => setExams(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    const deleteExam = (id) => setExams(prev => prev.filter(e => e.id !== id));

    // Question Actions
    const addQuestion = (q) => setQuestions(prev => [...prev, { ...q, id: generateId() }]);
    const deleteQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id));
    const updateQuestion = (id, updated) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q));
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
        localStorage.removeItem('questions');
        localStorage.removeItem('studentResponses');
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

    return (
        <DataContext.Provider value={{
            classes, addClass, updateClass, deleteClass, deleteClasses, deleteAllClasses,
            students, addStudent, updateStudent, setStudents, deleteStudent, deleteStudents, deleteAllStudents,
            mentors, addMentor, updateMentor, deleteMentor, deleteMentors, deleteAllMentors,
            attendance, recordAttendance, setAttendance, deleteAttendanceBatch, deleteAllAttendanceForStudentIds,
            subjects, addSubject, deleteSubject,
            exams, addExam, updateExam, deleteExam, examSettings, updateExamSetting,
            results, recordResult, deleteResultBatch, setResults,
            questions, addQuestion, deleteQuestion, updateQuestion,
            studentResponses, submitExam,
            currentUser, login, logout,
            resetData,
            resetData,
            institutionSettings, updateInstitutionSettings,
            validateAdmin, updateAdminCredentials
        }}>
            {children}
        </DataContext.Provider>
    );
};
