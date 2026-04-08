import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Book, Eye, BookOpen, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

const StudentSubjects = () => {
    const { currentUser, subjects } = useData();
    const [viewingData, setViewingData] = useState(null); // { subjectName, chapterIndex, images }
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Filter subjects and explicitly pull out revealed chapters
    const availableSubjects = subjects
        .filter(s => s.classId === currentUser?.classId)
        .map(subject => {
            const chapterData = subject.chapterData || {};
            const totalChapters = Number(subject.totalChapters) || 0;
            const revealedChapters = [];
            
            for (let i = 1; i <= totalChapters; i++) {
                const data = chapterData[i];
                if (data && data.isRevealedToStudents && data.images?.length > 0) {
                    revealedChapters.push({
                        index: i,
                        images: data.images
                    });
                }
            }
            
            return {
                ...subject,
                revealedChapters
            };
        })
        .filter(s => s.revealedChapters.length > 0);

    const openChapter = (subjectName, chapter) => {
        setViewingData({
            subjectName,
            chapterIndex: chapter.index,
            images: chapter.images
        });
        setCurrentPageIndex(0);
    };

    const nextPage = () => {
        if (viewingData && currentPageIndex < viewingData.images.length - 1) {
            setCurrentPageIndex(prev => prev + 1);
        }
    };

    const prevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(prev => prev - 1);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Book className="w-8 h-8 text-indigo-600" />
                        My Subjects & Books
                    </h2>
                    <p className="text-gray-500">
                        Access your digital subject books to study anytime.
                    </p>
                </div>
            </div>

            {availableSubjects.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Books Available</h3>
                    <p>Your mentor has not revealed any chapters for your class yet.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {availableSubjects.map(subject => (
                        <Card key={subject.id} className="overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row">
                            {/* Subject Meta */}
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 md:w-1/3 flex flex-col justify-center text-white shrink-0 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                                    <BookOpen className="w-48 h-48" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 opacity-80">
                                        <Layers className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            {subject.revealedChapters.length} Chapters Available
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold drop-shadow-md mb-2">{subject.name}</h3>
                                    {!subject.isExamSubject && (
                                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold self-start inline-block">
                                            NON-EXAM
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Chapters Grid */}
                            <div className="p-6 md:w-2/3 bg-gray-50 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {subject.revealedChapters.map(chapter => (
                                    <div key={chapter.index} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-lg">Chapter {chapter.index}</h4>
                                                <p className="text-xs text-gray-500 font-medium">{chapter.images.length} Pages</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => openChapter(subject.name, chapter)}
                                            className="w-full mt-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm transform hover:-translate-y-0.5"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Read Chapter
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Smart Book Reader Modal */}
            {viewingData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
                        <div className="flex items-center gap-3 text-white">
                            <Book className="w-6 h-6 text-indigo-400" />
                            <div>
                                <h3 className="font-bold text-lg leading-tight">{viewingData.subjectName}</h3>
                                <p className="text-sm text-gray-300 font-medium flex items-center gap-2">
                                    <span className="bg-indigo-600 px-2 py-0.5 rounded text-xs text-white">Ch {viewingData.chapterIndex}</span>
                                    <span>Page {currentPageIndex + 1} of {viewingData.images.length}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setViewingData(null)}
                            className="px-4 py-2 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"
                        >
                            Close
                        </button>
                    </div>
                    
                    <div className="w-full h-full flex items-center justify-center p-4 relative pt-20 pb-24">
                        {/* Current Page */}
                        <img 
                            src={viewingData.images[currentPageIndex]} 
                            alt={`Chapter ${viewingData.chapterIndex} Page ${currentPageIndex + 1}`} 
                            className="max-w-full max-h-full object-contain rounded-md shadow-2xl bg-white"
                        />

                        {/* Navigation Overlay (invisible click areas) */}
                        <div 
                            className="absolute top-0 left-0 w-1/3 h-full cursor-w-resize z-0"
                            onClick={prevPage}
                        />
                        <div 
                            className="absolute top-0 right-0 w-1/3 h-full cursor-e-resize z-0"
                            onClick={nextPage}
                        />
                    </div>

                    {/* Controls Footer */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 z-10 shadow-xl">
                        <button 
                            onClick={prevPage}
                            disabled={currentPageIndex === 0}
                            className={`p-3 rounded-full transition-colors ${currentPageIndex === 0 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-white/20 bg-black/40'}`}
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        
                        <div className="text-white font-bold min-w-[4rem] text-center text-lg">
                            {currentPageIndex + 1} / {viewingData.images.length}
                        </div>

                        <button 
                            onClick={nextPage}
                            disabled={currentPageIndex === viewingData.images.length - 1}
                            className={`p-3 rounded-full transition-colors ${currentPageIndex === viewingData.images.length - 1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-white/20 bg-black/40'}`}
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSubjects;
