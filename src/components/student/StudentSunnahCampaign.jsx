import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Toast } from '../ui/Toast';
import { BookHeart, Calendar, Trophy, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const StudentSunnahCampaign = () => {
    const { currentUser, students = [], sunnahRecitations = [], sunnahSettings = [], requireFeature } = useData();

    // Data Subscription
    React.useEffect(() => {
        return requireFeature('sunnah');
    }, [requireFeature]);

    // Lock to today
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'ranking'
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Local inputs for counts before saving
    const [count, setCount] = useState('');

    const classId = currentUser?.classId;

    const classStudents = useMemo(() => {
        if (!classId) return [];
        return students.filter(s => s.classId === classId && s.status === 'Active')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, classId]);

    // Load initial count
    React.useEffect(() => {
        const rec = sunnahRecitations.find(r => r.studentId === currentUser?.id && r.date === today);
        if (rec) {
            setCount(rec.count.toString());
        }
    }, [sunnahRecitations, today, currentUser]);

    const currentSettings = useMemo(() => {
        return sunnahSettings.find(s => s.id === classId) || { allowStudents: false, hideCount: false };
    }, [sunnahSettings, classId]);

    const saveCount = async () => {
        if (!currentSettings.allowStudents) {
            setToast({ show: true, message: 'Self-marking is not permitted by your mentor.', type: 'error' });
            return;
        }

        const docId = `${currentUser.id}_${today}_sunnah`;
        const val = parseInt(count, 10);

        try {
            if (!isNaN(val) && val >= 0) {
                await setDoc(doc(db, 'sunnahRecitations', docId), {
                    studentId: currentUser.id,
                    classId,
                    date: today,
                    count: val,
                    status: 'Completed',
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

    // Calculate Ranks
    const rankings = useMemo(() => {
        if (!classId || !classStudents) return [];

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
    }, [classStudents, sunnahRecitations, classId]);

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
                    <p className="text-gray-500 mt-2">Track your daily Swalath recitations.</p>
                </div>

                <div className="flex w-full md:w-auto">
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
                </nav>
            </div>

            {/* --- TRACKING TAB CONTENT --- */}
            {activeTab === 'tracking' && (
                <div className="space-y-6 max-w-lg mx-auto mt-10">
                    <Card className="p-6 md:p-8 flex flex-col gap-6 text-center border border-pink-100 shadow-sm">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Today's Swalath</h2>
                            <p className="text-gray-500 mt-2">Enter the number of Swalath you recited today.</p>
                        </div>
                        
                        {currentSettings.allowStudents ? (
                            <div className="flex flex-col gap-4 items-center">
                                <input 
                                    type="number" 
                                    min="0"
                                    value={count}
                                    onChange={(e) => setCount(e.target.value)}
                                    className="border border-gray-300 rounded-xl p-4 text-center text-2xl font-bold w-full max-w-xs focus:ring-2 focus:ring-pink-500 outline-none" 
                                    placeholder="0"
                                />
                                <button 
                                    onClick={saveCount}
                                    className="w-full max-w-xs px-6 py-4 rounded-xl text-lg font-bold transition-all shadow-sm bg-pink-600 text-white border-pink-600 hover:bg-pink-700 hover:shadow-md"
                                >
                                    Save Count
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col items-center gap-3">
                                <Lock className="w-8 h-8 text-gray-400" />
                                <h3 className="font-bold text-gray-700">Self-Marking Disabled</h3>
                                <p className="text-sm text-gray-500">Your mentor will update the count for you.</p>
                                {count && (
                                    <div className="mt-4 p-4 bg-white rounded-xl border w-full">
                                        <span className="text-sm text-gray-500 block mb-1">Your current recorded count:</span>
                                        <span className="text-2xl font-black text-pink-600">{count}</span>
                                    </div>
                                )}
                            </div>
                        )}
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
                                        <th className="px-4 py-4 font-bold whitespace-nowrap min-w-[200px]">Student Name</th>
                                        <th className="px-4 py-4 font-bold text-center whitespace-nowrap">
                                            Total Swalath
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rankings.length > 0 ? (
                                        rankings.map((student, index, arr) => {
                                            const rank = index === 0 ? 1 :
                                                (student.totalRecitations === arr[index - 1].totalRecitations ?
                                                    arr.findIndex(st => st.totalRecitations === student.totalRecitations) + 1 :
                                                    index + 1);
                                                    
                                            const isMe = student.id === currentUser?.id;

                                            return (
                                                <tr key={student.id} className={clsx(
                                                    "transition-colors",
                                                    isMe ? "bg-amber-50/50" : "hover:bg-gray-50/50"
                                                )}>
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
                                                    <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                        {student.name} {isMe && <span className="text-xs font-normal text-amber-600 ml-2">(You)</span>}
                                                    </td>
                                                    <td className="px-4 py-4 text-center whitespace-nowrap">
                                                        {currentSettings.hideCount && !isMe ? (
                                                            <span className="text-gray-400 italic font-medium">Hidden</span>
                                                        ) : (
                                                            <span className={clsx(
                                                                "font-bold px-3 py-1 rounded-lg border text-amber-700 bg-amber-50 border-amber-200",
                                                                student.totalRecitations === 0 && "opacity-50"
                                                            )}>
                                                                {student.totalRecitations}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                                                No students found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default StudentSunnahCampaign;
