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

    // Seeding Logic (Run once on mount)
    useEffect(() => {
        let seeded = false;
        let newClasses = [...classes];

        // Seed Classes if empty
        const class1A = newClasses.find(c => c.name === "1" && c.division === "A");
        let id1A = class1A ? class1A.id : generateId();
        if (!class1A) {
            newClasses.push({ id: id1A, name: "1", division: "A" });
            seeded = true;
        }

        const class2B = newClasses.find(c => c.name === "2" && c.division === "B");
        let id2B = class2B ? class2B.id : generateId();
        if (!class2B) {
            newClasses.push({ id: id2B, name: "2", division: "B" });
            seeded = true;
        }

        if (seeded) setClasses(newClasses);

        // Seed Students
        let newStudents = [...students];
        let studentSeeded = false;

        const s1 = newStudents.find(s => s.registerNo === "REG001");
        if (!s1) {
            newStudents.push({
                id: generateId(),
                name: "SHAHAN AHMED",
                registerNo: "REG001",
                uid: "UID123",
                gender: "Male",
                status: "Active",
                classId: id1A
            });
            studentSeeded = true;
        }

        const s2 = newStudents.find(s => s.registerNo === "REG002");
        if (!s2) {
            newStudents.push({
                id: generateId(),
                name: "MUHAMMED IZYAN K",
                registerNo: "REG002",
                uid: "UID124",
                gender: "Male",
                status: "Active",
                classId: id2B
            });
            studentSeeded = true;
        }

        if (studentSeeded) setStudents(newStudents);

    }, []); // Run once on mount

    // Seeding logic for Exams/Subjects (Run once on mount/update if empty)
    useEffect(() => {
        let seeded = false;
        let newSubjects = [...subjects];

        // Seed Subjects if empty
        if (newSubjects.length === 0 && classes.length > 0) {
            const class1A = classes.find(c => c.name === "1" && c.division === "A");
            if (class1A) {
                newSubjects.push(
                    { id: generateId(), name: "English", classId: class1A.id, maxMarks: 100, passMarks: 40 },
                    { id: generateId(), name: "Mathematics", classId: class1A.id, maxMarks: 100, passMarks: 40 },
                    { id: generateId(), name: "Science", classId: class1A.id, maxMarks: 100, passMarks: 40 }
                );
                seeded = true;
            }
        }
        if (seeded) setSubjects(newSubjects);

        let examSeeded = false;
        let newExams = [...exams];
        if (newExams.length === 0) {
            newExams.push({
                id: generateId(),
                name: "First Term Examination",
                date: new Date().toISOString().split('T')[0],
                status: "Published" // Draft, Published
            });
            examSeeded = true;
        }
        if (examSeeded) setExams(newExams);

    }, [classes.length]); // Depend on classes to seed subjects correctly

    // Effects to save data
    useEffect(() => localStorage.setItem('classes', JSON.stringify(classes)), [classes]);
    useEffect(() => localStorage.setItem('students', JSON.stringify(students)), [students]);
    useEffect(() => localStorage.setItem('mentors', JSON.stringify(mentors)), [mentors]);
    useEffect(() => localStorage.setItem('attendance', JSON.stringify(attendance)), [attendance]);
    useEffect(() => localStorage.setItem('subjects', JSON.stringify(subjects)), [subjects]);
    useEffect(() => localStorage.setItem('exams', JSON.stringify(exams)), [exams]);
    useEffect(() => localStorage.setItem('results', JSON.stringify(results)), [results]);
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
    const addExam = (exam) => setExams(prev => [...prev, { ...exam, id: generateId(), status: 'Draft' }]);
    const updateExam = (id, updated) => setExams(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    const deleteExam = (id) => setExams(prev => prev.filter(e => e.id !== id));

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
            exams, addExam, updateExam, deleteExam,
            results, recordResult, deleteResultBatch, setResults,
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
