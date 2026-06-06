import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Save, Calendar, CheckCircle, Trash2, Settings, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { StudentProfileModal } from '../../components/mentor/StudentProfileModal';
import { Eye } from 'lucide-react';

const AttendanceRecorder = () => {
    const { classes, students, attendance, recordAttendance, deleteAttendanceBatch, deleteAllAttendanceForStudentIds, currentUser, requireFeature } = useData();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState({}); // { studentId: 'Present' | 'Absent' }
    const [isDirty, setIsDirty] = useState(false); // Track unsaved edits
    const [showPopup, setShowPopup] = useState(false);
    const [msg, setMsg] = useState('');
    const [anomalyWarning, setAnomalyWarning] = useState({ isOpen: false, anomalies: [], pendingData: null });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        return requireFeature('attendance');
    }, [requireFeature]);

    // Confirmation State
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        type: null, // 'single' or 'full'
        step: 1 // 1 or 2
    });

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [currentPreviewStudentId, setCurrentPreviewStudentId] = useState(null);

    // Filter classes for Mentors
    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    // Reset dirty state when active context changes
    useEffect(() => {
        setIsDirty(false);
    }, [selectedClassId, date]);

    // Load existing records for the date if any
    useEffect(() => {
        if (!selectedClassId || !date) return;
        if (isDirty) return; // DO NOT overwrite if user is actively editing

        // Find existing records
        const existing = attendance.filter(r => r.date === date);
        // Initialize records for students in this class
        const classStudents = students.filter(s => s.classId === selectedClassId && s.status === 'Active');

        const initialRecords = {};
        classStudents.forEach(s => {
            const found = existing.find(r => r.studentId === s.id);
            initialRecords[s.id] = found ? found.status : 'Present'; // Default Record as Present
        });
        setRecords(initialRecords);
    }, [selectedClassId, date, attendance, students, isDirty]);

    const handleStatusChange = (studentId, status) => {
        setIsDirty(true);
        setRecords(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const executeSave = async (attendanceData) => {
        try {
            await recordAttendance(attendanceData);
            setIsDirty(false); 
            setMsg('Attendance Saved Successfully!');
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
            setAnomalyWarning({ isOpen: false, anomalies: [], pendingData: null });
        } catch (error) {
            console.error("Save error:", error);
            setMsg('Failed to save attendance. Try again.');
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
        }
    };

    const handleSave = async () => {
        // Prepare data
        const attendanceData = {
            date,
            classId: selectedClassId,
            mentorId: currentUser?.id || 'admin',
            records: Object.entries(records).map(([sid, status]) => ({
                studentId: sid,
                status
            }))
        };

        // Check for anomalies (consecutive days)
        const relevantRecords = attendanceData.records.filter(r => r.status === 'Present' || r.status === 'Absent');
        if (relevantRecords.length > 0) {
            const d = new Date(date);
            const prev = new Date(d); prev.setDate(prev.getDate() - 1);
            const next = new Date(d); next.setDate(next.getDate() + 1);
            const d1 = prev.toISOString().split('T')[0];
            const d2 = next.toISOString().split('T')[0];

            try {
                const q1 = query(collection(db, 'attendance'), where('date', '==', d1));
                const q2 = query(collection(db, 'attendance'), where('date', '==', d2));
                const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                const neighborRecords = [...snap1.docs, ...snap2.docs].map(doc => doc.data());

                const anomalies = [];
                relevantRecords.forEach(record => {
                    const conflict = neighborRecords.find(r => r.studentId === record.studentId && (r.status === 'Present' || r.status === 'Absent'));
                    if (conflict) {
                        const student = students.find(s => s.id === record.studentId);
                        anomalies.push(`${student?.name || record.studentId} (marked ${record.status} on ${conflict.date})`);
                    }
                });

                if (anomalies.length > 0) {
                    setAnomalyWarning({ isOpen: true, anomalies, pendingData: attendanceData });
                    return; // Pause save
                }
            } catch (err) {
                console.warn("Failed to check anomalies", err);
            }
        }

        await executeSave(attendanceData);
    };

    const handleRemove = () => {
        if (!selectedClassId || !date) return;
        setConfirmConfig({ isOpen: true, type: 'single', step: 1 });
    };

    const handleRemoveAllHistory = () => {
        if (!selectedClassId) return;
        setConfirmConfig({ isOpen: true, type: 'full', step: 1 });
    };

    const executeDelete = async () => {
        if (confirmConfig.type === 'single') {
            const classStudentIds = students
                .filter(s => s.classId === selectedClassId && s.status === 'Active')
                .map(s => s.id);

            try {
                await deleteAttendanceBatch(date, classStudentIds);

                // Reset
                const resetRecords = {};
                classStudentIds.forEach(id => {
                    resetRecords[id] = 'Present';
                });
                setRecords(resetRecords);

                setMsg('Attendance Records Deleted.');
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 3000);
            } catch (error) {
                console.error("Failed to delete attendance", error);
                alert("Failed to delete attendance: " + error.message);
            }
            setConfirmConfig({ isOpen: false, type: null, step: 1 });

        } else if (confirmConfig.type === 'full') {
            if (confirmConfig.step === 1) {
                // Move to step 2
                setConfirmConfig(prev => ({ ...prev, step: 2 }));
                return;
            }

            // Execute Step 2
            const classStudentIds = students
                .filter(s => s.classId === selectedClassId && s.status === 'Active')
                .map(s => s.id);

            try {
                await deleteAllAttendanceForStudentIds(classStudentIds);

                // Reset
                const resetRecords = {};
                classStudentIds.forEach(id => {
                    resetRecords[id] = 'Present';
                });
                setRecords(resetRecords);

                setMsg('All Class History Deleted.');
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 3000);
            } catch (error) {
                console.error("Failed to delete full history", error);
                alert("Failed to delete history: " + error.message);
            }
            setConfirmConfig({ isOpen: false, type: null, step: 1 });
        }
    };


    const classStudents = students
        .filter(s => s.classId === selectedClassId && s.status === 'Active')
        .sort((a, b) => {
            if ((a.gender || 'Male') === (b.gender || 'Male')) {
                // Secondary sort: Register No (Assuming alphanumeric or numeric)
                return a.registerNo.localeCompare(b.registerNo, undefined, { numeric: true, sensitivity: 'base' });
            }
            return (a.gender || 'Male') === 'Male' ? -1 : 1;
        });

    const selectedClass = classes.find(c => c.id === selectedClassId);
    const className = selectedClass ? `${selectedClass.name}-${selectedClass.division}` : 'this class';

    // Helper to get last 7 days for summary
    const getLast7Days = (baseDate) => {
        const days = [];
        for (let i = 7; i >= 1; i--) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const last7Days = getLast7Days(date);

    const AttendanceSummaryDots = ({ studentId }) => {
        return (
            <div className="flex gap-1">
                {last7Days.map(d => {
                    const record = attendance.find(r => r.studentId === studentId && r.date === d);
                    const status = record?.status;
                    const dayLetter = new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' }); // 'S', 'M', etc.
                    
                    return (
                        <div key={d} className="flex flex-col items-center gap-0.5">
                            <span className="text-[7px] font-bold text-gray-400 leading-none uppercase">{dayLetter}</span>
                            <div
                                title={`${d} (${new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}): ${status || 'No Record'}`}
                                className={clsx(
                                    "w-2.5 h-2.5 rounded-full border border-gray-100 shadow-sm transition-all hover:scale-125",
                                    status === 'Present' ? "bg-green-500" :
                                    status === 'Absent' ? "bg-red-500" :
                                    "bg-gray-100"
                                )}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-2 md:p-6 max-w-5xl mx-auto space-y-6 relative">
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ isOpen: false, type: null, step: 1 })}
                onConfirm={executeDelete}
                title={confirmConfig.type === 'full'
                    ? (confirmConfig.step === 1 ? "Delete All History" : "Final Warning")
                    : "Delete Daily Attendance"}
                message={confirmConfig.type === 'full'
                    ? (confirmConfig.step === 1
                        ? `Are you sure you want to delete ALL ATTENDANCE HISTORY for ${className}? This will wipe every record ever created for these students.`
                        : `FINAL WARNING: This action cannot be undone. Are you absolutely sure you want to delete all history for ${className}?`)
                    : "Are you sure you want to delete attendance records for this class on this date from the database?"}
                confirmText={confirmConfig.type === 'full'
                    ? (confirmConfig.step === 1 ? "Next Step" : "Yes, Delete Everything")
                    : "Delete"}
                cancelText="Cancel"
                isDanger
                autoClose={!(confirmConfig.type === 'full' && confirmConfig.step === 1)}
            />

            <ConfirmationModal
                isOpen={anomalyWarning.isOpen}
                onClose={() => setAnomalyWarning({ isOpen: false, anomalies: [], pendingData: null })}
                onConfirm={() => executeSave(anomalyWarning.pendingData)}
                title="Consecutive Attendance Detected"
                message={`Warning: Saving this will result in consecutive day attendance or absences for the following students:\n\n${anomalyWarning.anomalies.join('\n')}\n\nThis usually happens due to overlapping batch transfers or entry errors. Do you want to proceed anyway?`}
                confirmText="Proceed & Save"
                cancelText="Cancel"
                isDanger={true}
            />

            {/* Popup */}
            {showPopup && (
                <div className="fixed top-10 right-10 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-semibold text-lg">{msg}</span>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Attendance Recorder</h2>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="relative">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className={clsx(
                                "flex items-center justify-center p-2.5 rounded-xl transition-all duration-300",
                                isSettingsOpen ? "bg-indigo-100 text-indigo-700 shadow-inner" : "text-gray-500 hover:bg-gray-100"
                            )}
                            title="Advanced Options"
                        >
                            <Settings className={clsx("w-5 h-5", isSettingsOpen && "animate-spin-slow")} />
                        </Button>

                        {isSettingsOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                                <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-3 py-2 mb-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Advanced Actions</p>
                                    </div>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => {
                                                handleRemove();
                                                setIsSettingsOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-medium"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear Current Date
                                        </button>
                                        <div className="h-px bg-gray-50 my-1" />
                                        <button
                                            onClick={() => {
                                                handleRemoveAllHistory();
                                                setIsSettingsOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold group"
                                        >
                                            <AlertTriangle className="w-4 h-4 group-hover:animate-pulse" />
                                            Delete Entire History
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <Button 
                        onClick={handleSave} 
                        className="flex-1 md:flex-none flex items-center justify-center bg-[#a825ff] hover:bg-[#8f1cdb] text-white shadow-sm px-6 py-2.5 rounded-xl border-none text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Attendance
                    </Button>
                </div>
            </div>

            <Card>
                <div className="p-3 md:p-4 border-b border-gray-100 bg-white flex flex-col gap-4 rounded-t-xl">
                    <div className="flex flex-row gap-2 w-full items-center">
                        <div className="flex-1">
                            <Select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="bg-white border-gray-200 text-gray-800 shadow-sm rounded-lg w-full text-sm h-11"
                            >
                                <option value="" disabled>Select Class</option>
                                {availableClasses.length > 0 ? (
                                    availableClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                    ))
                                ) : (
                                    <option disabled>No classes assigned</option>
                                )}
                            </Select>
                        </div>
                        
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm h-11 min-w-[130px]">
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="outline-none text-xs md:text-sm text-gray-700 font-medium bg-transparent w-full"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-wider justify-center md:justify-start">
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Present</span>
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Absent</span>
                        <div className="h-4 w-px bg-gray-200 hidden md:block mx-1" />
                        <span className="flex items-center gap-1.5 opacity-80"><div className="w-2.5 h-2.5 rounded-full border border-gray-200 bg-white"></div> Last 7 Days History</span>
                    </div>
                </div>

                {!selectedClassId ? (
                    <div className="p-12 text-center text-gray-400">
                        {availableClasses.length === 0
                            ? "You are not assigned to any classes."
                            : "Please select a class to load students."}
                    </div>
                ) : classStudents.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        No students active in this class.
                    </div>
                ) : (
                    <div className="p-0">
                        <div className="max-h-[600px] overflow-auto">
                            {/* Desktop Table View */}
                            <table className="w-full text-left hidden md:table">
                                <thead className="bg-white sticky top-0 shadow-sm z-10">
                                     <tr>
                                         <th className="pl-4 pr-2 py-4 font-semibold text-gray-600 whitespace-nowrap w-4">Sl No</th>
                                         <th className="px-6 py-4 font-semibold text-gray-600">Reg No</th>
                                         <th className="px-6 py-4 font-semibold text-gray-600">Student Name</th>
                                         <th className="px-6 py-4 font-semibold text-gray-600">History (7d)</th>
                                         <th className="px-6 py-4 font-semibold text-gray-600 text-center">Details</th>
                                         <th className="px-6 py-4 font-semibold text-gray-600 text-center">Mark Attendance</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-50">
                                     {classStudents.map((student, index) => (
                                         <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                                             <td className="pl-4 pr-2 py-4 text-gray-500 font-medium text-sm">{index + 1}</td>
                                             <td className="px-6 py-4 text-gray-500 font-mono text-sm">{student.registerNo}</td>
                                             <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                                             <td className="px-6 py-4">
                                                 <AttendanceSummaryDots studentId={student.id} />
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <button
                                                     onClick={() => {
                                                         setCurrentPreviewStudentId(student.id);
                                                         setIsProfileModalOpen(true);
                                                     }}
                                                     className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                     title="View Detailed Profile"
                                                 >
                                                     <Eye className="w-4 h-4" />
                                                 </button>
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                                                     <button
                                                         onClick={() => handleStatusChange(student.id, 'Present')}
                                                         className={clsx(
                                                             "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                                                             records[student.id] === 'Present'
                                                                 ? "bg-white text-green-700 shadow-sm ring-1 ring-black/5"
                                                                 : "text-gray-500 hover:text-gray-700"
                                                         )}
                                                     >
                                                         Present
                                                     </button>
                                                     <button
                                                         onClick={() => handleStatusChange(student.id, 'Absent')}
                                                         className={clsx(
                                                             "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                                                             records[student.id] === 'Absent'
                                                                 ? "bg-white text-red-700 shadow-sm ring-1 ring-black/5"
                                                                 : "text-gray-500 hover:text-gray-700"
                                                         )}
                                                     >
                                                         Absent
                                                     </button>
                                                 </div>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>

                             {/* Mobile Card View */}
                             <div className="md:hidden space-y-2 p-2">
                                 {classStudents.map((student, index) => (
                                     <div key={student.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                         <div className="flex justify-between items-start mb-3">
                                             <div className="min-w-0 pr-2 flex items-start gap-3">
                                                 <span className="bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-md text-xs mt-0.5 shrink-0">{index + 1}</span>
                                                 <div className="min-w-0">
                                                     <h3 className="font-bold text-gray-900 truncate text-sm">{student.name}</h3>
                                                     <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-[10px] text-gray-500 font-mono italic">{student.registerNo}</p>
                                                        <AttendanceSummaryDots studentId={student.id} />
                                                     </div>
                                                 </div>
                                             </div>
                                             <button
                                                 onClick={() => {
                                                     setCurrentPreviewStudentId(student.id);
                                                     setIsProfileModalOpen(true);
                                                 }}
                                                 className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full bg-indigo-50"
                                             >
                                                 <Eye className="w-4 h-4" />
                                             </button>
                                         </div>

                                         <div className="grid grid-cols-2 gap-2">
                                             <button
                                                 onClick={() => handleStatusChange(student.id, 'Present')}
                                                 className={clsx(
                                                     "py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all",
                                                     records[student.id] === 'Present'
                                                         ? "bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1"
                                                         : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                                 )}
                                             >
                                                 <div className={clsx("w-2 h-2 rounded-full", records[student.id] === 'Present' ? "bg-green-500" : "bg-gray-400")} />
                                                 Present
                                             </button>
                                             <button
                                                 onClick={() => handleStatusChange(student.id, 'Absent')}
                                                 className={clsx(
                                                     "py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all",
                                                     records[student.id] === 'Absent'
                                                         ? "bg-red-100 text-red-700 ring-2 ring-red-500 shadow-sm"
                                                         : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                                 )}
                                             >
                                                 <div className={clsx("w-2 h-2 rounded-full", records[student.id] === 'Absent' ? "bg-red-500" : "bg-gray-400")} />
                                                 Absent
                                             </button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>

                        {/* Bottom action bar removed since buttons moved to top header */}
                    </div>
                )}
            </Card>

            <StudentProfileModal
                studentId={currentPreviewStudentId}
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
};

export default AttendanceRecorder;
