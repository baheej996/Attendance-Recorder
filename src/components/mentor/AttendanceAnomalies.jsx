import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, CheckCircle, Trash2, CalendarDays, Loader2 } from 'lucide-react';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const AttendanceAnomalies = () => {
    const { classes, students, currentUser, deleteAttendanceRecord, deleteAttendanceBatch } = useData();
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnomaly, setSelectedAnomaly] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, date: '', studentId: '', global: false });
    const [msg, setMsg] = useState('');
    const [showPopup, setShowPopup] = useState(false);

    const availableClasses = (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes;

    const fetchAnomalies = async () => {
        setLoading(true);
        try {
            const myStudents = students.filter(s => availableClasses.some(c => c.id === s.classId));
            const myStudentIds = myStudents.map(s => s.id);
            
            if (myStudentIds.length === 0) {
                setAnomalies([]);
                setLoading(false);
                return;
            }

            const allRecords = [];
            for (let i = 0; i < myStudentIds.length; i += 30) {
                const batchIds = myStudentIds.slice(i, i + 30);
                const qBatch = query(collection(db, 'attendance'), where('studentId', 'in', batchIds), where('status', '==', 'Present'));
                const snap = await getDocs(qBatch);
                allRecords.push(...snap.docs.map(d => d.data()));
            }

            // Group by student
            const recordsByStudent = {};
            allRecords.forEach(r => {
                if (!r.date) return;
                if (!recordsByStudent[r.studentId]) recordsByStudent[r.studentId] = [];
                recordsByStudent[r.studentId].push(r);
            });

            const foundAnomalies = [];

            Object.entries(recordsByStudent).forEach(([studentId, records]) => {
                // Sort chronologically
                records.sort((a, b) => new Date(a.date) - new Date(b.date));
                const student = students.find(s => s.id === studentId);

                for (let i = 0; i < records.length - 1; i++) {
                    const current = records[i];
                    const next = records[i + 1];
                    
                    const d1 = new Date(current.date);
                    const d2 = new Date(next.date);
                    const diffTime = Math.abs(d2 - d1);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays === 1) {
                        foundAnomalies.push({
                            id: `${studentId}_${current.date}_${next.date}`,
                            studentId,
                            studentName: student?.name || 'Unknown',
                            regNo: student?.registerNo || '-',
                            classId: student?.classId,
                            className: availableClasses.find(c => c.id === student?.classId)?.name || 'Unknown',
                            date1: current.date,
                            date2: next.date
                        });
                    }
                }
            });

            setAnomalies(foundAnomalies);
        } catch (error) {
            console.error("Failed to fetch anomalies", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAnomalies();
    }, [students]);

    const handleResolve = (anomaly) => {
        setSelectedAnomaly(anomaly);
    };

    const confirmDeletion = (date, studentId, global) => {
        setConfirmConfig({
            isOpen: true,
            date,
            studentId,
            global
        });
    };

    const executeDeletion = async () => {
        const { date, studentId, global } = confirmConfig;
        setConfirmConfig({ isOpen: false, date: '', studentId: '', global: false });
        setSelectedAnomaly(null);
        
        try {
            if (global) {
                // Find all students in this class
                const anomaly = anomalies.find(a => a.studentId === studentId);
                const classStudentIds = students.filter(s => s.classId === anomaly?.classId).map(s => s.id);
                await deleteAttendanceBatch(date, classStudentIds);
                setMsg(`Deleted ${date} attendance globally for the class.`);
            } else {
                await deleteAttendanceRecord(date, studentId);
                setMsg(`Deleted ${date} attendance just for this student.`);
            }
            
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
            
            // Re-fetch to update UI
            fetchAnomalies();
        } catch (error) {
            console.error("Deletion failed", error);
            setMsg('Failed to delete attendance.');
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="p-2 md:p-6 max-w-5xl mx-auto space-y-6 relative">
            {showPopup && (
                <div className="fixed top-10 right-10 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-semibold text-lg">{msg}</span>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ isOpen: false, date: '', studentId: '', global: false })}
                onConfirm={executeDeletion}
                title="Confirm Deletion"
                message={`Are you sure you want to delete the attendance for ${confirmConfig.date} ${confirmConfig.global ? "FOR ALL STUDENTS IN THE CLASS" : "JUST FOR THIS STUDENT"}?`}
                confirmText="Yes, Delete"
                cancelText="Cancel"
                isDanger={true}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Attendance Anomalies</h2>
                    <p className="text-gray-500 text-sm mt-1">Review consecutive day attendance resulting from student batch transfers.</p>
                </div>
                <Button onClick={fetchAnomalies} variant="outline" className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> Refresh
                </Button>
            </div>

            {anomalies.length === 0 ? (
                <Card>
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-4">
                        <CheckCircle className="w-12 h-12 text-green-400" />
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">All Clear!</h3>
                            <p>No consecutive day anomalies detected in your classes.</p>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {anomalies.map((anomaly, idx) => (
                        <Card key={`${anomaly.id}_${idx}`} className="border-l-4 border-l-amber-500">
                            <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="bg-amber-100 p-2 rounded-full shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{anomaly.studentName} <span className="text-gray-500 font-normal text-sm">({anomaly.regNo})</span></h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Found consecutive attendances on <span className="font-semibold">{anomaly.date1}</span> and <span className="font-semibold">{anomaly.date2}</span>.
                                        </p>
                                    </div>
                                </div>
                                <Button onClick={() => handleResolve(anomaly)} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                                    Resolve
                                </Button>
                            </div>

                            {selectedAnomaly?.id === anomaly.id && (
                                <div className="bg-gray-50 p-4 border-t border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-700 mb-3">Which record would you like to delete?</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Date 1 Resolution */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                            <div className="font-bold text-indigo-700">{anomaly.date1}</div>
                                            <div className="flex flex-col gap-2">
                                                <Button variant="outline" size="sm" onClick={() => confirmDeletion(anomaly.date1, anomaly.studentId, false)} className="text-red-600 hover:bg-red-50 hover:border-red-200 justify-start">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete JUST for this student
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => confirmDeletion(anomaly.date1, anomaly.studentId, true)} className="text-red-600 hover:bg-red-50 hover:border-red-200 justify-start opacity-70">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete GLOBALLY (Entire Class)
                                                </Button>
                                            </div>
                                        </div>
                                        {/* Date 2 Resolution */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                            <div className="font-bold text-indigo-700">{anomaly.date2}</div>
                                            <div className="flex flex-col gap-2">
                                                <Button variant="outline" size="sm" onClick={() => confirmDeletion(anomaly.date2, anomaly.studentId, false)} className="text-red-600 hover:bg-red-50 hover:border-red-200 justify-start">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete JUST for this student
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => confirmDeletion(anomaly.date2, anomaly.studentId, true)} className="text-red-600 hover:bg-red-50 hover:border-red-200 justify-start opacity-70">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete GLOBALLY (Entire Class)
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-right">
                                        <Button variant="ghost" onClick={() => setSelectedAnomaly(null)} className="text-gray-500">Cancel</Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AttendanceAnomalies;
