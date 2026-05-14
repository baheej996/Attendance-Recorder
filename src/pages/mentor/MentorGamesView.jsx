import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Gamepad2, Trophy, Users, Settings, Filter, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { Switch } from '../../components/ui/Switch';
import { ARABIC_ALPHABET_LEVELS } from '../../data/arabicLevelsData';

const MentorGamesView = () => {
    const { currentUser, students, classes, gameProgress, classFeatureFlags, updateClassFeatureFlags } = useData();
    const [selectedClassId, setSelectedClassId] = useState('All');

    // Filter students by selected class and mentor's assigned classes
    const mentorClasses = classes.filter(c => currentUser?.assignedClassIds?.includes(c.id));
    const activeClasses = selectedClassId === 'All' 
        ? mentorClasses 
        : mentorClasses.filter(c => c.id === selectedClassId);

    const filteredStudents = students.filter(s => 
        activeClasses.some(c => c.id === s.classId)
    );

    const toggleGamificationAccess = async (classId, currentStatus) => {
        try {
            await updateClassFeatureFlags(classId, { gamification: !currentStatus });
        } catch (error) {
            console.error("Failed to update feature flag:", error);
        }
    };

    const toggleLevelUnlock = async (classId, levelId, currentUnlockedArray) => {
        let newUnlocked = [...(currentUnlockedArray || [])];
        if (newUnlocked.includes(levelId)) {
            newUnlocked = newUnlocked.filter(id => id !== levelId);
        } else {
            newUnlocked.push(levelId);
        }
        try {
            await updateClassFeatureFlags(classId, { unlockedArabicLevels: newUnlocked });
        } catch (error) {
            console.error("Failed to update level unlocks:", error);
        }
    };

    const unlockAllLevels = async (classId) => {
        try {
            const allIds = ARABIC_ALPHABET_LEVELS.map(l => l.id);
            await updateClassFeatureFlags(classId, { unlockedArabicLevels: allIds });
        } catch (error) {
            console.error("Failed to unlock all:", error);
        }
    };

    const lockAllLevels = async (classId) => {
        try {
            await updateClassFeatureFlags(classId, { unlockedArabicLevels: [] });
        } catch (error) {
            console.error("Failed to lock all:", error);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-indigo-600" />
                        Gamification Control
                    </h1>
                    <p className="text-gray-600 mt-1">Manage game access and track student reading progress.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                    >
                        <option value="All">All My Classes</option>
                        {mentorClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Access Control Cards */}
            <div className="grid grid-cols-1 gap-6">
                {activeClasses.map(cls => {
                    const classFlag = classFeatureFlags?.find(f => f.classId === cls.id);
                    const isEnabled = classFlag?.gamification === true;
                    const unlockedLevels = classFlag?.unlockedArabicLevels || [1]; // default level 1 unlocked
                    const classStudentCount = students.filter(s => s.classId === cls.id && s.status === 'Active').length;
                    
                    return (
                        <Card key={cls.id} className="p-0 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
                            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {cls.name} <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">Div {cls.division}</span>
                                    </h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                        <Users className="w-4 h-4" /> {classStudentCount} Students
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 mt-4 md:mt-0 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                    <span className={`text-sm font-bold px-3 py-1.5 rounded-lg ${isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {isEnabled ? 'Game Enabled' : 'Game Disabled'}
                                    </span>
                                    <Switch 
                                        checked={isEnabled} 
                                        onChange={() => toggleGamificationAccess(cls.id, isEnabled)} 
                                    />
                                </div>
                            </div>

                            {/* Level Unlocks Grid */}
                            {isEnabled && (
                                <div className="p-6 bg-white animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800">Arabic Reading Levels</h4>
                                            <p className="text-sm text-gray-500">Toggle which letters students are allowed to play.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => unlockAllLevels(cls.id)} className="text-xs font-medium bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                                                Unlock All
                                            </button>
                                            <button onClick={() => lockAllLevels(cls.id)} className="text-xs font-medium bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                                                Lock All
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-3">
                                        {ARABIC_ALPHABET_LEVELS.map(level => {
                                            const isUnlocked = unlockedLevels.includes(level.id);
                                            return (
                                                <button
                                                    key={level.id}
                                                    onClick={() => toggleLevelUnlock(cls.id, level.id, unlockedLevels)}
                                                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                                        isUnlocked 
                                                        ? 'border-indigo-500 bg-indigo-50 hover:bg-indigo-100 shadow-sm' 
                                                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 opacity-60'
                                                    }`}
                                                >
                                                    <span className="text-xs text-gray-400 absolute top-1 left-1.5 font-bold">{level.id}</span>
                                                    {isUnlocked ? (
                                                        <Unlock className="w-3 h-3 text-indigo-400 absolute top-1.5 right-1.5" />
                                                    ) : (
                                                        <Lock className="w-3 h-3 text-gray-400 absolute top-1.5 right-1.5" />
                                                    )}
                                                    <span className={`text-2xl font-arabic font-bold mt-1 ${isUnlocked ? 'text-indigo-700' : 'text-gray-500'}`} dir="rtl">
                                                        {level.letter}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Leaderboard & Progress Tracking */}
            <Card className="p-0 overflow-hidden bg-white shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        Student Progress Tracker
                    </h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold">Student Name</th>
                                <th className="px-6 py-4 font-semibold">Class</th>
                                <th className="px-6 py-4 font-semibold text-center">Highest Level</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStudents.map(student => {
                                const cls = classes.find(c => c.id === student.classId);
                                const progress = gameProgress.find(g => g.studentId === student.id);
                                const highestLevel = progress?.highestLevelCompleted || 0;
                                
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{student.name}</div>
                                                    <div className="text-xs text-gray-500">{student.registerNo}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                                                {cls?.name || 'Unknown Class'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {highestLevel > 0 ? (
                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                                                    {highestLevel}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {highestLevel > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                                                    <CheckCircle2 className="w-4 h-4" /> Started
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 text-gray-500 text-xs font-medium border border-gray-200">
                                                    Not Started
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No students found in the selected classes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default MentorGamesView;
