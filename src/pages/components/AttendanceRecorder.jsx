import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Save, Calendar, CheckCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const AttendanceRecorder = () => {
    const { classes, students, attendance, recordAttendance, deleteAttendanceBatch, deleteAllAttendanceForStudentIds, currentUser } = useData();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState({}); // { studentId: 'Present' | 'Absent' }
    const [showPopup, setShowPopup] = useState(false);
    const [msg, setMsg] = useState('');

    // Confirmation State
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        type: null, // 'single' or 'full'
        step: 1 // 1 or 2
    });

    // Filter classes for Mentors
    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    // Load existing records for the date if any
    useEffect(() => {
        if (!selectedClassId || !date) return;

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
    }, [selectedClassId, date, attendance, students]);

    const handleStatusChange = (studentId, status) => {
        setRecords(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSave = () => {
        // Prepare data
        const attendanceData = {
            date,
            mentorId: currentUser?.id || 'admin',
            records: Object.entries(records).map(([sid, status]) => ({
                studentId: sid,
                status
            }))
        };

        recordAttendance(attendanceData);
        setMsg('Attendance Saved Successfully!');
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
    };

    const handleRemove = () => {
        if (!selectedClassId || !date) return;
        setConfirmConfig({ isOpen: true, type: 'single', step: 1 });
    };

    const handleRemoveAllHistory = () => {
        if (!selectedClassId) return;
        setConfirmConfig({ isOpen: true, type: 'full', step: 1 });
    };

    const executeDelete = () => {
        if (confirmConfig.type === 'single') {
            const classStudentIds = students
                .filter(s => s.classId === selectedClassId)
                .map(s => s.id);

            deleteAttendanceBatch(date, classStudentIds);

            // Reset
            const resetRecords = {};
            classStudentIds.forEach(id => {
                resetRecords[id] = 'Present';
            });
            setRecords(resetRecords);

            setMsg('Attendance Records Deleted.');
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
            setConfirmConfig({ isOpen: false, type: null, step: 1 });

        } else if (confirmConfig.type === 'full') {
            if (confirmConfig.step === 1) {
                // Move to step 2
                setConfirmConfig(prev => ({ ...prev, step: 2 }));
                return;
            }

            // Execute Step 2
            const classStudentIds = students
                .filter(s => s.classId === selectedClassId)
                .map(s => s.id);

            deleteAllAttendanceForStudentIds(classStudentIds);

            // Reset
            const resetRecords = {};
            classStudentIds.forEach(id => {
                resetRecords[id] = 'Present';
            });
            setRecords(resetRecords);

            setMsg('All Class History Deleted.');
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
            setConfirmConfig({ isOpen: false, type: null, step: 1 });
        }
    };


    const classStudents = students.filter(s => s.classId === selectedClassId && s.status === 'Active');
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const className = selectedClass ? `${selectedClass.name}-${selectedClass.division}` : 'this class';

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 relative">
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

            {/* Popup */}
            {showPopup && (
                <div className="fixed top-10 right-10 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-semibold text-lg">{msg}</span>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Attendance Recorder</h2>
                <div className="flex gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="outline-none text-sm text-gray-700 font-medium bg-transparent"
                        />
                    </div>
                </div>
            </div>

            <Card>
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center rounded-t-xl">
                    <div className="w-full sm:w-64">
                        <Select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="bg-white"
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

                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Present</span>
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Absent</span>
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
                            <table className="w-full text-left">
                                <thead className="bg-white sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-gray-600">Reg No</th>
                                        <th className="px-6 py-4 font-semibold text-gray-600">Student Name</th>
                                        <th className="px-6 py-4 font-semibold text-gray-600 text-center">Mark Attendance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {classStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 font-mono text-sm">{student.registerNo}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
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
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between gap-4 rounded-b-xl sticky bottom-0">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button variant="ghost" onClick={handleRemoveAllHistory} className="flex items-center justify-center text-red-700 bg-red-50 hover:bg-red-100 border border-red-200">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Entire Class History
                                </Button>
                                <Button variant="secondary" onClick={handleRemove} className="flex items-center justify-center text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Clear This Date
                                </Button>
                            </div>
                            <Button onClick={handleSave} className="flex items-center justify-center px-8 bg-purple-600 hover:bg-purple-700 text-white">
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AttendanceRecorder;
