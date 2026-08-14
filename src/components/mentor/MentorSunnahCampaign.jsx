import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { BookHeart, Calendar, Search, Trophy, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const MentorSunnahCampaign = () => {
    const { currentUser, classes = [], students = [], sunnahRecitations = [], sunnahSettings = [], requireFeature } = useData();

    // Data Subscription
    React.useEffect(() => {
        return requireFeature('sunnah');
    }, [requireFeature]);

    // Lock to today
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const [selectedClassId, setSelectedClassId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'ranking' | 'settings'
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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

    // Load initial counts from recitations into local state
    React.useEffect(() => {
        const initialCounts = {};
        classStudents.forEach(student => {
            const rec = sunnahRecitations.find(r => r.studentId === student.id && r.date === today);
            initialCounts[student.id] = rec ? rec.count : '';
        });
        setCounts(initialCounts);
    }, [classStudents, sunnahRecitations, today]);

    const handleCountChange = (studentId, val) => {
        setCounts(prev => ({ ...prev, [studentId]: val }));
    };

    const saveCount = async (studentId) => {
        const docId = `${studentId}_${today}_sunnah`;
        const val = parseInt(counts[studentId], 10);

        try {
            if (!isNaN(val) && val >= 0) {
                await setDoc(doc(db, 'sunnahRecitations', docId), {
                    studentId,
                    classId: selectedClassId,
                    date: today,
                    count: val,
                    status: 'Completed',
                    mentorId: currentUser.id,
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
                if (qr.studentId === student.id && qr.status === 'Completed') {
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
                    <p className="text-gray-500 mt-2">Track daily Swalath recitations and manage class settings.</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 block p-3 w-full sm:w-64 font-medium outline-none transition-colors"
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
                        value={today}
                        min={today}
                        max={today}
                        readOnly
                        className="bg-gray-100 border border-gray-200 text-gray-600 text-sm rounded-xl block p-3 w-full sm:w-auto font-medium outline-none cursor-not-allowed"
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
                        <Calendar className="w-5 h-5" /> Today's Tracker
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

            {/* Quick Search */}
            {(activeTab === 'tracking' || activeTab === 'ranking') && (
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search student by name or register number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 p-3 block w-full sm:w-96 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                    />
                </div>
            )}

            {/* --- TRACKING TAB CONTENT --- */}
            {activeTab === 'tracking' && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Card className="hidden md:block overflow-hidden border border-gray-100 shadow-sm transition-all">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-4 font-medium whitespace-nowrap">Register No</th>
                                            <th className="px-4 py-4 font-medium whitespace-nowrap min-w-[200px]">Student Name</th>
                                            <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Swalath Count ({today})</th>
                                            <th className="px-4 py-4 font-medium text-center whitespace-nowrap">Action</th>
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
                                                            <button 
                                                                onClick={() => saveCount(student.id)}
                                                                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border bg-pink-600 text-white border-pink-600 hover:bg-pink-700 hover:shadow-md"
                                                            >
                                                                Save
                                                            </button>
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
        </div>
    );
};

export default MentorSunnahCampaign;
