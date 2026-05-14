import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Gamepad2, Trophy, Lock, ArrowLeft, Play, Unlock, CheckCircle2, Circle } from 'lucide-react';
import ArabicSpellGame from '../../components/student/games/ArabicSpellGame';
import { ARABIC_ALPHABET_LEVELS } from '../../data/arabicLevelsData';

const StudentGames = () => {
    const { currentUser, gameProgress, students, classFeatureFlags, requireFeature } = useData();
    const [activeTab, setActiveTab] = useState('hub'); // 'hub', 'levels', 'stagemenu', 'play', 'leaderboard'
    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [selectedStageIndex, setSelectedStageIndex] = useState(0);

    useEffect(() => {
        const cleanup = requireFeature('gamification');
        return cleanup;
    }, [requireFeature]);

    // Access Control Check
    const classFlag = classFeatureFlags?.find(f => f.classId === currentUser.classId);
    const isGamificationEnabled = classFlag?.gamification === true;
    const classStudents = students.filter(s => s.classId === currentUser.classId && s.status === 'Active');
    const unlockedLevels = classFlag?.unlockedArabicLevels || [1];

    const currentProgress = gameProgress.find(g => g.studentId === currentUser.id);
    const completedStagesData = currentProgress?.completedStages || {};

    // Leaderboard Data Calculation
    const leaderboardData = classStudents.map(student => {
        const progress = gameProgress.find(g => g.studentId === student.id);
        return {
            ...student,
            highestLevel: progress?.highestLevelCompleted || 0,
            currentLevel: progress?.currentLevel || 1,
            lastActive: progress?.lastUpdated || null
        };
    }).sort((a, b) => b.highestLevel - a.highestLevel);

    if (!isGamificationEnabled) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-500 shadow-xl border-t-8 border-t-gray-400">
                    <div className="mb-6 flex justify-center">
                        <div className="p-4 rounded-full bg-gray-100 text-gray-500">
                            <Lock className="w-12 h-12" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Games Locked</h2>
                    <p className="text-gray-600 mb-6">
                        Gamification features are currently disabled for your class. Ask your mentor to unlock them!
                    </p>
                </Card>
            </div>
        );
    }

    const renderStageMenu = () => {
        const levelData = ARABIC_ALPHABET_LEVELS.find(l => l.id === selectedLevelId);
        const completedStagesForLevel = completedStagesData[String(selectedLevelId)] || [];
        
        const STAGES = [
            { id: 0, name: 'Letter', text: levelData.letter },
            { id: 1, name: 'Fatha', text: levelData.fatha },
            { id: 2, name: 'Kasra', text: levelData.kasra },
            { id: 3, name: 'Damma', text: levelData.damma },
            { id: 4, name: 'Tanween', text: levelData.tanweenDamma },
            { id: 5, name: 'Sukoon', text: levelData.sukoon },
            { id: 6, name: 'Word', text: levelData.word },
            { id: 7, name: 'Sequence', text: 'Word Sequence' }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                    onClick={() => setActiveTab('levels')}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Levels
                </button>
                
                <Card className="p-6 bg-white shadow-lg border-t-4 border-t-indigo-500 max-w-4xl mx-auto">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Level {selectedLevelId}: {levelData.letter}</h2>
                            <p className="text-gray-500">Select a stage to play. You must complete all stages to pass this level.</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-indigo-600">{completedStagesForLevel.length}/8</span>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Stages Done</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {STAGES.map((stage) => {
                            const isCompleted = completedStagesForLevel.includes(stage.id);
                            
                            return (
                                <button
                                    key={stage.id}
                                    onClick={() => {
                                        setSelectedStageIndex(stage.id);
                                        setActiveTab('play');
                                    }}
                                    className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group ${
                                        isCompleted 
                                        ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-500 shadow-sm hover:shadow-md hover:-translate-y-1'
                                        : 'border-gray-200 bg-white hover:border-indigo-500 hover:bg-indigo-50 shadow-sm hover:shadow-md hover:-translate-y-1'
                                    }`}
                                >
                                    <div className="absolute top-3 right-3">
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-gray-300 group-hover:text-indigo-400" />
                                        )}
                                    </div>
                                    <span className={`text-2xl md:text-4xl font-arabic font-bold mb-2 text-center px-2 line-clamp-2 ${isCompleted ? 'text-emerald-700' : 'text-gray-900'}`} dir="rtl">
                                        {stage.text}
                                    </span>
                                    <span className={`text-xs font-bold uppercase tracking-widest ${isCompleted ? 'text-emerald-600' : 'text-gray-500'}`}>
                                        {stage.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Card>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-indigo-600" />
                        Learning Games
                    </h1>
                    <p className="text-gray-600 mt-1">Play games and improve your Arabic reading skills!</p>
                </div>

                {/* Tabs */}
                {activeTab !== 'play' && activeTab !== 'stagemenu' && (
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                        <button
                            onClick={() => { setActiveTab('hub'); setSelectedLevelId(null); }}
                            className={`flex-1 md:w-32 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'hub' || activeTab === 'levels' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Gamepad2 className="w-4 h-4" /> Games
                        </button>
                        <button
                            onClick={() => setActiveTab('leaderboard')}
                            className={`flex-1 md:w-32 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'leaderboard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Trophy className="w-4 h-4" /> Leaderboard
                        </button>
                    </div>
                )}
            </div>

            {/* Game Hub */}
            {activeTab === 'hub' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card 
                        onClick={() => setActiveTab('levels')}
                        className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden border-2 border-transparent hover:border-indigo-400 p-0"
                    >
                        <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
                            <span className="text-6xl font-arabic text-white drop-shadow-md relative z-10" dir="rtl">ا ب ت</span>
                        </div>
                        <div className="p-6 bg-white">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold text-gray-900">Arabic Reading Game</h3>
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                                    <Play className="w-4 h-4 fill-current" />
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm">Master the Arabic alphabet and words with voice recognition!</p>
                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">
                                28 Levels Available
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Levels Grid View */}
            {activeTab === 'levels' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button 
                        onClick={() => setActiveTab('hub')}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Games
                    </button>
                    
                    <Card className="p-6 bg-white shadow-lg border-t-4 border-t-indigo-500">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Level</h2>
                            <p className="text-gray-500">Levels with a padlock are locked by your mentor. Complete all 8 stages of a letter to pass the level!</p>
                        </div>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
                            {ARABIC_ALPHABET_LEVELS.map(level => {
                                const isUnlocked = unlockedLevels.includes(level.id);
                                const completedStages = completedStagesData[String(level.id)] || [];
                                const isCompleted = completedStages.length === 8;

                                return (
                                    <button
                                        key={level.id}
                                        disabled={!isUnlocked}
                                        onClick={() => {
                                            setSelectedLevelId(level.id);
                                            setActiveTab('stagemenu');
                                        }}
                                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all aspect-square ${
                                            !isUnlocked 
                                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60 grayscale' 
                                            : isCompleted 
                                                ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100 shadow-sm hover:shadow-md hover:-translate-y-1'
                                                : 'border-indigo-200 bg-white hover:border-indigo-500 hover:bg-indigo-50 shadow-sm hover:shadow-md hover:-translate-y-1'
                                        }`}
                                    >
                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-700' : 'text-gray-400'}`}>
                                                {level.id}
                                            </span>
                                        </div>
                                        
                                        {!isUnlocked ? (
                                            <Lock className="w-4 h-4 text-gray-400 absolute top-2 right-2" />
                                        ) : isCompleted ? (
                                            <Trophy className="w-4 h-4 text-emerald-500 absolute top-2 right-2" />
                                        ) : (
                                            <div className="absolute top-2 right-2 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1 rounded">
                                                {completedStages.length}/8
                                            </div>
                                        )}
                                        
                                        <span className={`text-3xl font-arabic font-bold ${!isUnlocked ? 'text-gray-400' : isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`} dir="rtl">
                                            {level.letter}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* Stage Menu View */}
            {activeTab === 'stagemenu' && selectedLevelId && renderStageMenu()}

            {/* Play View */}
            {activeTab === 'play' && selectedLevelId && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button 
                        onClick={() => setActiveTab('stagemenu')}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Stage Menu
                    </button>
                    <ArabicSpellGame 
                        levelId={selectedLevelId} 
                        initialStageIndex={selectedStageIndex}
                        onComplete={() => setActiveTab('stagemenu')} 
                    />
                </div>
            )}

            {/* Leaderboard View */}
            {activeTab === 'leaderboard' && (
                <Card className="p-6 bg-white shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        <h2 className="text-xl font-bold text-gray-900">Class Leaderboard</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                    <th className="pb-3 pl-4 font-medium">Rank</th>
                                    <th className="pb-3 font-medium">Student</th>
                                    <th className="pb-3 text-center font-medium">Highest Level Completed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {leaderboardData.map((student, index) => {
                                    const isCurrentUser = student.id === currentUser.id;
                                    return (
                                        <tr key={student.id} className={`group hover:bg-gray-50 transition-colors ${isCurrentUser ? 'bg-indigo-50/50' : ''}`}>
                                            <td className="py-4 pl-4 w-16">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                                    index === 0 ? 'bg-amber-100 text-amber-700' :
                                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                                    index === 2 ? 'bg-amber-50 text-amber-900' :
                                                    'bg-gray-50 text-gray-500'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className={`font-semibold ${isCurrentUser ? 'text-indigo-700' : 'text-gray-900'}`}>
                                                            {student.name} {isCurrentUser && "(You)"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-center">
                                                <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                                                    Level {student.highestLevel}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {leaderboardData.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="py-8 text-center text-gray-500">
                                            No game data available for this class yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default StudentGames;
