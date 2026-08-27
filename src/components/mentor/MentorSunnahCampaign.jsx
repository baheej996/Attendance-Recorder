import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { BookHeart, Calendar, Search, Trophy, Settings, History, Edit2, Trash2, User, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const MentorSunnahCampaign = () => {
    const { currentUser, classes = [], students = [], sunnahRecitations = [], sunnahSettings = [], requireFeature } = useData();

    // Data Subscription
    React.useEffect(() => {
        return requireFeature('sunnah');
    }, [requireFeature]);

    // Bounded date picker state (default to today)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'logs' | 'ranking' | 'settings'
    const [selectedStudentIdFilter, setSelectedStudentIdFilter] = useState('all');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Modals & Action States
    const [editingLog, setEditingLog] = useState(null); // log object
    const [editCountInput, setEditCountInput] = useState('');
    const [deletingLog, setDeletingLog] = useState(null); // log object

    // Local inputs for counts before saving
    const [counts, setCounts] = useState({});

    // Data Filtering
    const myClasses = useMemo(() => {
        if (!currentUser?.assignedClassIds) return [];
        return classes.filter(c => currentUser.assignedClassIds.includes(c.id));
    }, [classes, currentUser]);

    // Auto-select first class when loaded
    React.useEffect(() => {
        if (myClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(myClasses[0].id);
        }
    }, [myClasses, selectedClassId]);

    const classStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId && s.status === 'Active')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, selectedClassId]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return classStudents;
        const lowerSearch = searchTerm.toLowerCase();
        return classStudents.filter(s =>
            s.name.toLowerCase().includes(lowerSearch) ||
            s.registerNo?.toLowerCase().includes(lowerSearch)
        );
    }, [classStudents, searchTerm]);

    // Load initial counts from recitations into local state for selectedDate
    React.useEffect(() => {
        const initialCounts = {};
        classStudents.forEach(student => {
            const rec = sunnahRecitations.find(r => r.studentId === student.id && r.date === selectedDate);
            initialCounts[student.id] = rec ? rec.count : '';
        });
        setCounts(initialCounts);
    }, [classStudents, sunnahRecitations, selectedDate]);

    // Historical Class Logs Mapping
    const classLogs = useMemo(() => {
        if (!selectedClassId) return [];
        const studentMap = new Map(classStudents.map(s => [s.id, s]));

        return sunnahRecitations
            .filter(r => r.classId === selectedClassId && studentMap.has(r.studentId))
            .map(r => ({
                ...r,
                student: studentMap.get(r.studentId)
            }))
            .sort((a, b) => b.date.localeCompare(a.date) || (a.student?.name || '').localeCompare(b.student?.name || ''));
    }, [sunnahRecitations, selectedClassId, classStudents]);

    const filteredLogs = useMemo(() => {
        return classLogs.filter(log => {
            const matchesStudent = selectedStudentIdFilter === 'all' || log.studentId === selectedStudentIdFilter;
            const matchesSearch = !searchTerm || (
                log.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.student?.registerNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.date.includes(searchTerm)
            );
            return matchesStudent && matchesSearch;
        });
    }, [classLogs, selectedStudentIdFilter, searchTerm]);

    const handleCountChange = (studentId, val) => {
        setCounts(prev => ({ ...prev, [studentId]: val }));
    };

    const saveCount = async (studentId) => {
        const docId = `${studentId}_${selectedDate}_sunnah`;
        const val = parseInt(counts[studentId], 10);

        try {
            if (!isNaN(val) && val >= 0) {
                await setDoc(doc(db, 'sunnahRecitations', docId), {
                    studentId,
                    classId: selectedClassId,
                    date: selectedDate,
                    count: val,
                    status: 'Completed',
                    mentorId: currentUser?.id || '',
                    timestamp: new Date().toISOString()
                }, { merge: true });
                setToast({ show: true, message: 'Saved successfully.', type: 'success' });
            } else {
                setToast({ show: true, message: 'Please enter a valid number.', type: 'error' });
            }
        } catch (error) {
            console.error('Error saving recitation:', error);
            setToast({ show: true, message: 'Failed to save.', type: 'error' });
        }
    };

    // Edit Log Logic
    const handleStartEdit = (log) => {
        setEditingLog(log);
        setEditCountInput(log.count !== undefined ? log.count.toString() : '');
    };

    const handleSaveEdit = async () => {
        if (!editingLog) return;
        const docId = editingLog.id || `${editingLog.studentId}_${editingLog.date}_sunnah`;
        const val = parseInt(editCountInput, 10);

        try {
            if (!isNaN(val) && val >= 0) {
                await setDoc(doc(db, 'sunnahRecitations', docId), {
                    count: val,
                    timestamp: new Date().toISOString()
                }, { merge: true });
                setToast({ show: true, message: 'Log updated successfully.', type: 'success' });
                setEditingLog(null);
            } else {
                setToast({ show: true, message: 'Please enter a valid number.', type: 'error' });
            }
        } catch (error) {
            console.error('Error updating log:', error);
            setToast({ show: true, message: 'Failed to update log.', type: 'error' });
        }
    };

    // Delete Log Logic
    const handleConfirmDelete = async () => {
        if (!deletingLog) return;
        const docId = deletingLog.id || `${deletingLog.studentId}_${deletingLog.date}_sunnah`;

        try {
            await deleteDoc(doc(db, 'sunnahRecitations', docId));
            setToast({ show: true, message: 'Log deleted successfully.', type: 'success' });
            setDeletingLog(null);
        } catch (error) {
            console.error('Error deleting log:', error);
            setToast({ show: true, message: 'Failed to delete log.', type: 'error' });
        }
    };

    // Navigate to student logs tab filtered by student
    const handleQuickViewStudentLogs = (studentId) => {
        setSelectedStudentIdFilter(studentId);
        setActiveTab('logs');
    };

    const currentSettings = useMemo(() => {
        return sunnahSettings.find(s => s.id === selectedClassId) || { allowStudents: false, hideCount: false };
    }, [sunnahSettings, selectedClassId]);

    const toggleSetting = async (field) => {
        if (!selectedClassId) return;
        const nextVal = !currentSettings[field];
        try {
            await setDoc(doc(db, 'sunnahSettings', selectedClassId), {
                id: selectedClassId,
                classId: selectedClassId,
                [field]: nextVal
            }, { merge: true });
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    };

    // Calculate Ranks
    const rankings = useMemo(() => {
        if (!selectedClassId || !classStudents) return [];

        const ranks = classStudents.map(student => {
            let total = 0;
            sunnahRecitations.forEach(qr => {
                if (qr.studentId === student.id && qr.status === 'Completed' && qr.classId === selectedClassId) {
                    total += (qr.count || 0);
                }
            });
            return {
                ...student,
                totalRecitations: total
            };
        });

        return ranks.sort((a, b) => {
            if (b.totalRecitations !== a.totalRecitations) {
                return b.totalRecitations - a.totalRecitations;
            }
            return a.name.localeCompare(b.name);
        });
    }, [classStudents, sunnahRecitations, selectedClassId]);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast({ ...toast, show: false })} 
                />
            )}

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BookHeart className="w-8 h-8 text-pink-600" />
                        Sunnah Campaign
                    </h1>
                    <p className="text-gray-500 mt-2">Track daily Swalath recitations, view student logs, and manage settings.</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 block p-3 w-full sm:w-64 font-medium outline-none transition-colors shadow-sm"
                    >
                        <option value="" disabled>Select a Class</option>
                        {myClasses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} - {c.division}
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={selectedDate}
                        max={today}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        title="Select date to view or enter counts"
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl block p-3 w-full sm:w-auto font-medium outline-none focus:ring-2 focus:ring-pink-500 transition-colors shadow-sm"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <nav className="-mb-px flex space-x-6 sm:space-x-8 min-w-max pb-1">
                    <button
                        onClick={() => setActiveTab('tracking')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'tracking'
                                ? "border-pink-500 text-pink-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Calendar className="w-5 h-5" /> Daily Tracker
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'logs'
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <History className="w-5 h-5" /> Student Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('ranking')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'ranking'
                                ? "border-amber-500 text-amber-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Trophy className="w-5 h-5" /> Leaderboard
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={clsx(
                            "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                            activeTab === 'settings'
                                ? "border-gray-800 text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Settings className="w-5 h-5" /> Settings
                    </button>
                </nav>
            </div>

            {/* Quick Search for Tracking, Logs & Ranking */}
            {(activeTab === 'tracking' || activeTab === 'ranking' || activeTab === 'logs') && (
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder={activeTab === 'logs' ? "Search log by student name, reg no, or date..." : "Search student by name or register number..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 p-3 block w-full rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                        />
                    </div>

                    {activeTab === 'logs' && (
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <select
                                value={selectedStudentIdFilter}
                                onChange={(e) => setSelectedStudentIdFilter(e.target.value)}
                                className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                            >
                                <option value="all">All Students</option>
                                {classStudents.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.registerNo || 'No ID'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* --- DAILY TRACKER TAB CONTENT --- */}
            {activeTab === 'tracking' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-pink-50/50 p-4 rounded-xl border border-pink-100">
                        <span className="text-sm font-semibold text-pink-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-pink-600" />
                            Tracking Date: <span className="font-bold">{selectedDate === today ? `${selectedDate} (Today)` : selectedDate}</span>
                        </span>
                        {selectedDate !== today && (
                            <button
                                onClick={() => setSelectedDate(today)}
                                className="text-xs font-bold text-pink-600 hover:text-pink-700 underline"
                            >
                                Jump to Today
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Card className="hidden md:block overflow-hidden border border-gray-100 shadow-sm transition-all">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-4 font-medium whitespace-nowrap">Register No</th>
                                            <th className="px-4 py-4 font-medium whitespace-nowrap min-w-[200px]">Student Name</th>
                                            <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Swalath Count ({selectedDate})</th>
                                            <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((student) => {
                                                return (
                                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-4 py-4 font-medium text-gray-600 whitespace-nowrap">
                                                            {student.registerNo || '-'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className="font-bold text-gray-900 leading-none">{student.name}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center whitespace-nowrap">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                value={counts[student.id] !== undefined ? counts[student.id] : ''}
                                                                onChange={(e) => handleCountChange(student.id, e.target.value)}
                                                                className="border border-gray-300 rounded p-2 text-center w-24 focus:ring-2 focus:ring-pink-500 outline-none" 
                                                                placeholder="Count"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4 text-center whitespace-nowrap">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button 
                                                                    onClick={() => saveCount(student.id)}
                                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border bg-pink-600 text-white border-pink-600 hover:bg-pink-700 hover:shadow-md"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleQuickViewStudentLogs(student.id)}
                                                                    title="View all logs of this student"
                                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-200"
                                                                >
                                                                    <History className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                    No students found in this class.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Mobile View: Card List */}
                        <div className="md:hidden space-y-3">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((student) => {
                                    return (
                                        <Card key={student.id} className="p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">{student.registerNo || 'No ID'}</span>
                                                    <span className="text-lg font-black text-gray-900">{student.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleQuickViewStudentLogs(student.id)}
                                                    className="p-2 text-xs text-purple-600 bg-purple-50 rounded-lg font-semibold flex items-center gap-1 hover:bg-purple-100 transition-colors"
                                                >
                                                    <History className="w-3.5 h-3.5" /> History
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={counts[student.id] !== undefined ? counts[student.id] : ''}
                                                    onChange={(e) => handleCountChange(student.id, e.target.value)}
                                                    className="border border-gray-300 rounded p-2 flex-1 outline-none focus:ring-2 focus:ring-pink-500"
                                                    placeholder="Count"
                                                />
                                                <button 
                                                    onClick={() => saveCount(student.id)}
                                                    className="py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border bg-pink-600 text-white border-pink-600 shadow-pink-100"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </Card>
                                    );
                                })
                            ) : (
                                <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    No students found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- STUDENT LOGS TAB CONTENT --- */}
            {activeTab === 'logs' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-purple-50/60 p-4 rounded-2xl border border-purple-100 gap-4">
                        <div>
                            <h3 className="font-bold text-purple-950 flex items-center gap-2 text-base">
                                <History className="w-5 h-5 text-purple-600" />
                                Historical Recitation Logs
                            </h3>
                            <p className="text-xs text-purple-700 mt-1">
                                Showing logs for {selectedStudentIdFilter === 'all' ? 'all students' : classStudents.find(s => s.id === selectedStudentIdFilter)?.name || 'selected student'}.
                            </p>
                        </div>
                        {selectedStudentIdFilter !== 'all' && (
                            <button
                                onClick={() => setSelectedStudentIdFilter('all')}
                                className="text-xs font-semibold px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors shadow-sm"
                            >
                                Show All Students
                            </button>
                        )}
                    </div>

                    <Card className="overflow-hidden border border-gray-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-4 font-medium whitespace-nowrap">Date</th>
                                        <th className="px-4 py-4 font-medium whitespace-nowrap">Register No</th>
                                        <th className="px-4 py-4 font-medium whitespace-nowrap min-w-[200px]">Student Name</th>
                                        <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Swalath Count</th>
                                        <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => (
                                            <tr key={log.id || `${log.studentId}_${log.date}`} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-4 font-bold text-gray-800 whitespace-nowrap">
                                                    {log.date}
                                                </td>
                                                <td className="px-4 py-4 font-medium text-gray-500 whitespace-nowrap">
                                                    {log.student?.registerNo || '-'}
                                                </td>
                                                <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    {log.student?.name || 'Unknown Student'}
                                                </td>
                                                <td className="px-4 py-4 text-center whitespace-nowrap">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200">
                                                        {log.count} recitations
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleStartEdit(log)}
                                                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                            title="Edit log entry"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingLog(log)}
                                                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                            title="Delete log entry"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                No recitation logs found matching the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- RANKING TAB CONTENT --- */}
            {activeTab === 'ranking' && (
                <div className="space-y-6">
                    <Card className="overflow-hidden border border-gray-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase border-b bg-amber-50 text-amber-700 border-amber-100">
                                    <tr>
                                        <th className="px-4 py-4 font-bold w-16 text-center whitespace-nowrap">Rank</th>
                                        <th className="px-4 py-4 font-bold whitespace-nowrap">Register No</th>
                                        <th className="px-4 py-4 font-bold whitespace-nowrap min-w-[200px]">Student Name</th>
                                        <th className="px-4 py-4 font-bold text-center whitespace-nowrap">
                                            Total Swalath {currentSettings.hideCount && '(Hidden from Students)'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rankings.length > 0 ? (
                                        rankings.filter(s => {
                                            if (!searchTerm) return true;
                                            const lowerSearch = searchTerm.toLowerCase();
                                            return s.name.toLowerCase().includes(lowerSearch) || s.registerNo?.toLowerCase().includes(lowerSearch);
                                        }).map((student, index, arr) => {
                                            const rank = index === 0 ? 1 :
                                                (student.totalRecitations === arr[index - 1].totalRecitations ?
                                                    arr.findIndex(st => st.totalRecitations === student.totalRecitations) + 1 :
                                                    index + 1);

                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-4 text-center font-bold whitespace-nowrap">
                                                        <div className={clsx(
                                                            "mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2",
                                                            rank === 1 ? "bg-amber-100 text-amber-700 border-amber-200 font-black shadow-sm" :
                                                                rank === 2 ? "bg-gray-100 text-gray-700 border-gray-200 font-bold" :
                                                                    rank === 3 ? "bg-orange-100 text-orange-700 border-orange-200 font-bold" :
                                                                        "border-transparent text-gray-500 bg-transparent"
                                                        )}>
                                                            {rank}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-medium text-gray-600 whitespace-nowrap">
                                                        {student.registerNo || '-'}
                                                    </td>
                                                    <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                        {student.name}
                                                    </td>
                                                    <td className="px-4 py-4 text-center whitespace-nowrap">
                                                        <span className={clsx(
                                                            "font-bold px-3 py-1 rounded-lg border text-amber-700 bg-amber-50 border-amber-200",
                                                            student.totalRecitations === 0 && "opacity-50"
                                                        )}>
                                                            {student.totalRecitations}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                No students found in this class.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- SETTINGS TAB CONTENT --- */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-6">Class Settings</h2>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Allow Students to Mark</h3>
                                    <p className="text-sm text-gray-500 mt-1">If enabled, students can submit their own Swalath counts from their panel.</p>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('allowStudents')}
                                    className={clsx(
                                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                        currentSettings.allowStudents ? "bg-pink-600" : "bg-gray-200"
                                    )}
                                >
                                    <span className={clsx(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        currentSettings.allowStudents ? "translate-x-5" : "translate-x-0"
                                    )} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between border-b pb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Hide Count on Leaderboard</h3>
                                    <p className="text-sm text-gray-500 mt-1">If enabled, students will see their rank but the actual count will be hidden in the Student Panel.</p>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('hideCount')}
                                    className={clsx(
                                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                        currentSettings.hideCount ? "bg-pink-600" : "bg-gray-200"
                                    )}
                                >
                                    <span className={clsx(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        currentSettings.hideCount ? "translate-x-5" : "translate-x-0"
                                    )} />
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Edit Log Modal */}
            <Modal
                isOpen={!!editingLog}
                onClose={() => setEditingLog(null)}
                title="Edit Recitation Log"
            >
                <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</p>
                        <p className="text-base font-bold text-gray-900 mt-0.5">{editingLog?.student?.name || 'Unknown Student'}</p>
                        {editingLog?.student?.registerNo && (
                            <p className="text-xs text-gray-500">Reg No: {editingLog.student.registerNo}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{editingLog?.date}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Swalath Recitation Count
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={editCountInput}
                            onChange={(e) => setEditCountInput(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-gray-900 font-medium"
                            placeholder="Enter new count"
                        />
                    </div>
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setEditingLog(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 transition-colors shadow-sm"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirmation Modal for Deleting Log */}
            <ConfirmationModal
                isOpen={!!deletingLog}
                onClose={() => setDeletingLog(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Recitation Log"
                message={`Are you sure you want to delete the Sunnah log for ${deletingLog?.student?.name || 'this student'} on ${deletingLog?.date} (${deletingLog?.count} recitations)? This action cannot be undone.`}
                confirmText="Delete Log"
                cancelText="Cancel"
                isDanger={true}
            />
        </div>
    );
};

export default MentorSunnahCampaign;
