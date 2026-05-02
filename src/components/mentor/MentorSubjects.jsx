import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../ui/Card';
import { Book, Eye, EyeOff, BookOpen, Layers, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ZoomableImage from '../ui/ZoomableImage';

const MentorSubjects = () => {
    const { currentUser, classes, subjects, updateSubject } = useData();
    const { showAlert } = useUI();
    const [viewingData, setViewingData] = useState(null); // { subjectName: '', chapterIndex: 1, images: [] }
    const [expandedClassId, setExpandedClassId] = useState(null);
    const [expandedSubjectId, setExpandedSubjectId] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const containerRef = React.useRef(null);

    const assignedClasses = classes.filter(c => currentUser?.assignedClassIds?.includes(c.id));

    // Group subjects by class
    const subjectsByClass = assignedClasses.map(cls => {
        const classSubjects = subjects.filter(s => s.classId === cls.id && s.isClassSubject !== false);
        return {
            classDetails: cls,
            subjects: classSubjects
        };
    }).filter(group => group.subjects.length > 0);

    // Auto-expand first class if only one exists
    React.useEffect(() => {
        if (subjectsByClass.length === 1 && !expandedClassId) {
            setExpandedClassId(subjectsByClass[0].classDetails.id);
        }
    }, [subjectsByClass]);

    // Intersection Observer to track current page
    React.useEffect(() => {
        if (!viewingData) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = parseInt(entry.target.getAttribute('data-index'));
                        if (!isNaN(index)) setCurrentPage(index);
                    }
                });
            },
            { threshold: 0.5, root: containerRef.current }
        );

        const timeout = setTimeout(() => {
            const pages = document.querySelectorAll('.chapter-page');
            pages.forEach((page) => observer.observe(page));
        }, 500);

        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, [viewingData]);

    const scrollToPage = (index) => {
        const el = document.getElementById(`page-${index}`);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

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
                <div className="space-y-4">
                    {subjectsByClass.map(group => {
                        const isClassExpanded = expandedClassId === group.classDetails.id;
                        return (
                            <div key={group.classDetails.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div 
                                    className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isClassExpanded ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                                    onClick={() => setExpandedClassId(isClassExpanded ? null : group.classDetails.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl transition-colors ${isClassExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-indigo-50 text-indigo-600'}`}>
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 leading-none mb-1">
                                                {group.classDetails.name} - {group.classDetails.division}
                                            </h3>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                {group.subjects.length} Assigned {group.subjects.length === 1 ? 'Subject' : 'Subjects'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-lg border transition-all ${isClassExpanded ? 'bg-white border-indigo-200 text-indigo-600 rotate-180' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                        <ChevronDown className="w-5 h-5" />
                                    </div>
                                </div>

                                {isClassExpanded && (
                                    <div className="p-5 bg-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
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
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Class Only</span>
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
                                                                                    onClick={() => {
                                                                                        setCurrentPage(0);
                                                                                        setViewingData({
                                                                                            subjectName: subject.name,
                                                                                            chapterIndex,
                                                                                            images: currentChapterData.images
                                                                                        });
                                                                                    }}
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
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Book Viewer Modal */}
            {viewingData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-6xl h-[95vh] flex flex-col bg-black rounded-[2rem] overflow-hidden shadow-2xl relative border border-white/10">
                        {/* Header Overlay - Solid Backdrop */}
                        <div className="absolute top-0 w-full p-4 bg-gray-900/95 backdrop-blur-md shadow-2xl z-20 flex justify-between items-center border-b border-white/10 px-6">
                            <div className="text-white flex items-center gap-4">
                                <button 
                                    onClick={() => setViewingData(null)}
                                    className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center transition-all border border-white/10"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <div>
                                    <h3 className="font-black text-xl tracking-tight leading-none mb-1">
                                        {viewingData.subjectName}
                                    </h3>
                                    <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <span className="bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded">Chapter {viewingData.chapterIndex}</span>
                                        <span>{viewingData.images.length} Digital Pages</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6 pointer-events-auto">
                                {/* Navigation Controls */}
                                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                                    <button 
                                        onClick={() => scrollToPage(Math.max(0, currentPage - 1))}
                                        disabled={currentPage === 0}
                                        className="p-2.5 text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-20"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    
                                    <div className="flex items-center gap-2 px-3">
                                        <input 
                                            type="number" 
                                            value={currentPage + 1}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (val >= 1 && val <= viewingData.images.length) {
                                                    scrollToPage(val - 1);
                                                }
                                            }}
                                            className="w-12 bg-transparent text-white font-black text-xl outline-none text-center border-b-2 border-indigo-500/50 focus:border-indigo-500"
                                        />
                                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">/ {viewingData.images.length}</span>
                                    </div>

                                    <button 
                                        onClick={() => scrollToPage(Math.min(viewingData.images.length - 1, currentPage + 1))}
                                        disabled={currentPage === viewingData.images.length - 1}
                                        className="p-2.5 text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-20"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Download Global Button */}
                                <a 
                                    href={viewingData.images[currentPage]} 
                                    download={`${viewingData.subjectName}_Ch${viewingData.chapterIndex}_P${currentPage + 1}.jpg`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden md:flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Page {currentPage + 1}
                                </a>
                            </div>
                        </div>

                        {/* Scrolling Pages Container */}
                        <div 
                            ref={containerRef}
                            className="flex-1 overflow-y-auto px-4 pt-32 pb-12 snap-y snap-mandatory scroll-smooth relative z-0 hide-scrollbar" 
                            style={{ scrollbarWidth: 'none' }}
                        >
                            <div className="flex flex-col items-center gap-20 w-full max-w-4xl mx-auto">
                                {viewingData.images.map((url, index) => (
                                    <div 
                                        key={index} 
                                        id={`page-${index}`} 
                                        data-index={index}
                                        className="chapter-page relative w-full snap-start shrink-0 flex flex-col items-center justify-center min-h-[70vh] py-8"
                                    >
                                        <div className="w-full max-w-2xl flex justify-between items-center mb-6 px-4">
                                            <div className="text-gray-500 font-black tracking-widest text-[10px] uppercase">— Digital Page {index + 1} —</div>
                                            <a 
                                                href={url} 
                                                download={`${viewingData.subjectName}_Ch${viewingData.chapterIndex}_P${index + 1}.jpg`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 hover:bg-white/10"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download Page
                                            </a>
                                        </div>
                                        <div className="w-full h-[85vh]">
                                            <ZoomableImage 
                                                src={url} 
                                                alt={`Chapter ${viewingData.chapterIndex} Page ${index + 1}`} 
                                                className="rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] bg-white overflow-hidden border border-white/5"
                                            />
                                        </div>
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
