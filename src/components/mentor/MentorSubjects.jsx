import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Book, Eye, EyeOff, BookOpen, Layers, ChevronDown, ChevronUp } from 'lucide-react';

const MentorSubjects = () => {
    const { currentUser, classes, subjects, updateSubject } = useData();
    const { showAlert } = useUI();
    const [viewingData, setViewingData] = useState(null); // { subjectName: '', chapterIndex: 1, images: [] }
    const [expandedSubjectId, setExpandedSubjectId] = useState(null);

    const assignedClasses = classes.filter(c => currentUser?.assignedClassIds?.includes(c.id));

    // Group subjects by class
    const subjectsByClass = assignedClasses.map(cls => {
        const classSubjects = subjects.filter(s => s.classId === cls.id);
        return {
            classDetails: cls,
            subjects: classSubjects
        };
    }).filter(group => group.subjects.length > 0);

    const handleToggleReveal = async (subject, chapterIndex) => {
        try {
            const currentChapterData = subject.chapterData || {};
            const chapterState = currentChapterData[chapterIndex] || { images: [], isRevealedToStudents: false };
            const newRevealStatus = !chapterState.isRevealedToStudents;

            const updatedChapterData = {
                ...currentChapterData,
                [chapterIndex]: {
                    ...chapterState,
                    isRevealedToStudents: newRevealStatus
                }
            };

            await updateSubject(subject.id, { chapterData: updatedChapterData });
            showAlert('Success', `Chapter ${chapterIndex} ${newRevealStatus ? 'revealed to' : 'hidden from'} students.`, 'success');
        } catch (error) {
            console.error('Error toggling chapter visibility:', error);
            showAlert('Error', 'Failed to change visibility.', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Book className="w-8 h-8 text-indigo-600" />
                        Class Books & Chapters
                    </h2>
                    <p className="text-gray-500">
                        View books uploaded by the administrator and control whether students can see specific chapters.
                    </p>
                </div>
            </div>

            {subjectsByClass.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Subjects Found</h3>
                    <p>There are no subjects assigned to your classes yet.</p>
                </Card>
            ) : (
                <div className="space-y-8">
                    {subjectsByClass.map(group => (
                        <div key={group.classDetails.id} className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                                <Layers className="w-5 h-5 text-indigo-500" />
                                {group.classDetails.name} - {group.classDetails.division}
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                {group.subjects.map(subject => {
                                    const totalChapters = Number(subject.totalChapters) || 0;
                                    const chapterData = subject.chapterData || {};
                                    const isExpanded = expandedSubjectId === subject.id;

                                    return (
                                        <Card key={subject.id} className="overflow-hidden flex flex-col transition-all border border-gray-100 shadow-sm">
                                            {/* Subject Header */}
                                            <div 
                                                className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-bold text-gray-900 text-lg">{subject.name}</h4>
                                                        {!subject.isExamSubject && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Non-Exam</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                                        <BookOpen className="w-4 h-4" />
                                                        {totalChapters > 0 ? `${totalChapters} Chapters` : 'No Chapters Configured'}
                                                    </div>
                                                </div>
                                                <div className="p-2 bg-white rounded-full text-gray-400 shadow-sm border border-gray-100">
                                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </div>
                                            </div>
                                            
                                            {/* Chapters List */}
                                            {isExpanded && totalChapters > 0 && (
                                                <div className="divide-y divide-gray-100 border-t border-gray-100">
                                                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapterIndex => {
                                                        const currentChapterData = chapterData[chapterIndex] || { images: [], isRevealedToStudents: false };
                                                        const hasBook = currentChapterData.images.length > 0;
                                                        const isRevealed = currentChapterData.isRevealedToStudents;

                                                        return (
                                                            <div key={chapterIndex} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                                        CH {chapterIndex}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-800">Chapter {chapterIndex}</div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {hasBook ? `${currentChapterData.images.length} pages available` : 'No pages uploaded yet'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-4 self-start sm:self-auto ml-[52px] sm:ml-0">
                                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                                        <div className="relative">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="sr-only peer"
                                                                                checked={isRevealed}
                                                                                onChange={() => handleToggleReveal(subject, chapterIndex)}
                                                                                disabled={!hasBook}
                                                                            />
                                                                            <div className={`w-10 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 transition-colors ${!hasBook ? 'bg-gray-100' : isRevealed ? 'bg-indigo-600' : 'bg-gray-300'} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                                                                        </div>
                                                                        <span className={`text-xs font-semibold select-none transition-colors ${!hasBook ? 'text-gray-400' : isRevealed ? 'text-indigo-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                                                            {!hasBook ? 'Unavailable' : isRevealed ? 'Revealed ' : 'Hidden'}
                                                                        </span>
                                                                    </label>

                                                                    <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

                                                                    <button
                                                                        onClick={() => setViewingData({
                                                                            subjectName: subject.name,
                                                                            chapterIndex,
                                                                            images: currentChapterData.images
                                                                        })}
                                                                        disabled={!hasBook}
                                                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                                                                            hasBook 
                                                                            ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white' 
                                                                            : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed hidden sm:flex'
                                                                        }`}
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                        View Book
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Book Viewer Modal */}
            {viewingData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
                    <button 
                        onClick={() => setViewingData(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-50 shadow-lg backdrop-blur-sm"
                    >
                        ✕
                    </button>
                    
                    <div className="w-full max-w-5xl h-[90vh] flex flex-col bg-black rounded-xl overflow-hidden shadow-2xl relative border border-white/10">
                        {/* Header Overlay */}
                        <div className="absolute top-0 w-full p-4 bg-gradient-to-b from-black/90 to-transparent z-10 flex justify-between items-center pointer-events-none">
                            <div className="text-white">
                                <h3 className="font-bold text-xl drop-shadow-md flex items-center gap-2">
                                    <Book className="w-5 h-5 text-indigo-400" />
                                    {viewingData.subjectName}
                                </h3>
                                <div className="text-gray-300 font-medium drop-shadow-sm flex items-center gap-2 mt-1">
                                    <span className="bg-indigo-600/80 px-2 py-0.5 rounded text-xs text-white">Chapter {viewingData.chapterIndex}</span>
                                    <span>{viewingData.images.length} Pages</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrolling Pages Container */}
                        <div className="flex-1 overflow-y-auto px-4 pt-24 pb-12 snap-y snap-mandatory scroll-smooth relative z-0 hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                            <div className="flex flex-col items-center gap-16 max-w-3xl mx-auto">
                                {viewingData.images.map((url, index) => (
                                    <div key={index} className="relative w-full snap-start shrink-0 flex items-center justify-center min-h-[50vh]">
                                        <div className="absolute -top-8 left-0 right-0 text-center text-gray-500 font-bold tracking-widest text-sm uppercase drop-shadow-sm">
                                            — Page {index + 1} —
                                        </div>
                                        <img 
                                            src={url} 
                                            alt={`Chapter ${viewingData.chapterIndex} Page ${index + 1}`} 
                                            className="max-w-full max-h-[85vh] object-contain rounded-md shadow-[0_0_40px_rgba(255,255,255,0.05)] bg-white pointer-events-auto"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default MentorSubjects;
