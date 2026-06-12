import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
    Book, 
    Eye, 
    BookOpen, 
    ChevronLeft, 
    ChevronRight, 
    Layers, 
    X,
    Sparkles,
    ArrowRight,
    Bookmark,
    Clock,
    Search,
    Download
} from 'lucide-react';
import ZoomableImage from '../ui/ZoomableImage';

const StudentSubjects = () => {
    const { currentUser, subjects } = useData();
    const [viewingData, setViewingData] = useState(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const availableSubjects = subjects
        .filter(s => s.classId === currentUser?.classId && s.isClassSubject !== false)
        .map(subject => {
            const chapterData = subject.chapterData || {};
            const totalChapters = Number(subject.totalChapters) || 0;
            const revealedChapters = [];
            for (let i = 1; i <= totalChapters; i++) {
                const data = chapterData[i];
                if (data && data.isRevealedToStudents && data.images?.length > 0) {
                    revealedChapters.push({ index: i, images: data.images });
                }
            }
            return { ...subject, revealedChapters };
        })
        .filter(s => s.revealedChapters.length > 0)
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const openChapter = (subjectName, chapter) => {
        setViewingData({ subjectName, chapterIndex: chapter.index, images: chapter.images });
        setCurrentPageIndex(0);
    };

    const nextPage = () => viewingData && currentPageIndex < viewingData.images.length - 1 && setCurrentPageIndex(prev => prev + 1);
    const prevPage = () => currentPageIndex > 0 && setCurrentPageIndex(prev => prev - 1);

    const springTransition = { type: "spring", stiffness: 300, damping: 30, mass: 1 };

    return (
        <div className="space-y-8 pb-12 overflow-hidden">
            <LayoutGroup>
                {/* Header Section */}
                <motion.div layout transition={springTransition} className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    <div className="relative bg-white/80 backdrop-blur-xl border border-white p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
                                <Book className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">My Subjects</h2>
                                <p className="text-gray-500 font-medium">Explore your digital curriculum and study materials.</p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-72 group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Find a subject..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 py-3 pl-12 pr-4 rounded-2xl text-sm font-semibold transition-all outline-none"
                            />
                        </div>
                    </div>
                </motion.div>

                {availableSubjects.length === 0 ? (
                    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-16 text-center bg-white/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-gray-200">
                        <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No subjects found</h3>
                        <p className="text-gray-500">Try adjusting your search filter.</p>
                    </motion.div>
                ) : (
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {availableSubjects.map((subject, idx) => {
                            const isExpanded = selectedSubjectId === subject.id;
                            return (
                                <motion.div 
                                    key={subject.id}
                                    layout
                                    transition={springTransition}
                                    className={cn("relative h-full", isExpanded ? "col-span-full z-10" : "z-0")}
                                >
                                    <motion.div
                                        layout
                                        transition={springTransition}
                                        whileHover={!isExpanded ? { y: -8, scale: 1.02 } : {}}
                                        onClick={() => setSelectedSubjectId(isExpanded ? null : subject.id)}
                                        className={cn(
                                            "h-full overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white transition-shadow duration-500 cursor-pointer",
                                            isExpanded ? "shadow-[0_20px_50px_rgba(0,0,0,0.1)]" : "hover:shadow-xl"
                                        )}
                                    >
                                        <div className="flex flex-col h-full">
                                            {/* Cover Design */}
                                            <motion.div 
                                                layout
                                                className={cn(
                                                    "relative p-8 overflow-hidden text-white transition-all duration-700",
                                                    isExpanded ? "min-h-[220px] bg-gradient-to-br from-indigo-500 to-purple-600" : "h-[200px] bg-gradient-to-br from-indigo-500 to-purple-600"
                                                )}
                                            >
                                                {/* Background Icon - Fixed Opacity with inline style to prevent animation resets */}
                                                <div 
                                                    style={{ opacity: 0.1 }}
                                                    className="absolute top-0 right-0 p-12 transform translate-x-4 -translate-y-4 pointer-events-none"
                                                >
                                                    <BookOpen className="w-48 h-48 md:w-64 md:h-64 text-white" />
                                                </div>
                                                
                                                <div className="relative z-10 h-full flex flex-col justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <motion.div layout className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center backdrop-blur-md">
                                                            <Bookmark className="w-4 h-4 text-white" />
                                                        </motion.div>
                                                        <motion.span layout className="text-[10px] font-black uppercase tracking-widest text-white/80">Subject Material</motion.span>
                                                    </div>

                                                    <div>
                                                        <motion.h3 
                                                            layoutId={`title-${subject.id}`} 
                                                            style={{ opacity: 1 }} 
                                                            className={cn("font-black tracking-tighter leading-none mb-4", isExpanded ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl")}
                                                        >
                                                            {subject.name}
                                                        </motion.h3>
                                                        <motion.div layout className="flex flex-wrap gap-3">
                                                            <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md text-[10px] font-black uppercase whitespace-nowrap border border-white/5">
                                                                <Layers className="w-3.5 h-3.5" />
                                                                {subject.revealedChapters.length} Chapters Active
                                                            </div>
                                                            {isExpanded && (
                                                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md text-[10px] font-black uppercase whitespace-nowrap border border-white/5">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    Curriculum v2.0
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                    </div>
                                                </div>

                                                <motion.div layout className="absolute bottom-6 right-6 p-4 bg-black/20 rounded-2xl backdrop-blur-md border border-white/10 group-hover:bg-black/30 transition-all">
                                                    <ArrowRight className={cn("w-5 h-5 transition-transform duration-500", isExpanded ? "rotate-90" : "")} />
                                                </motion.div>
                                            </motion.div>

                                            {/* Expanded Content */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={springTransition}
                                                        className="p-8 md:p-10 bg-gray-50/50"
                                                    >
                                                        <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                            {subject.revealedChapters.map((chapter, cIdx) => (
                                                                <motion.div 
                                                                    key={chapter.index}
                                                                    whileHover={{ y: -5, scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    onClick={(e) => { e.stopPropagation(); openChapter(subject.name, chapter); }}
                                                                    className="group/chapter bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer"
                                                                >
                                                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover/chapter:bg-indigo-600 group-hover/chapter:text-white transition-all shadow-sm">
                                                                        <BookOpen className="w-6 h-6" />
                                                                    </div>
                                                                    <h5 className="font-black text-xl text-gray-900 mb-1">Chapter {chapter.index}</h5>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{chapter.images.length} Digital Pages</p>
                                                                    <div className="mt-6 flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                                                        Read Now <ArrowRight className="w-3 h-3" />
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </motion.div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </LayoutGroup>

            {/* Smart Book Reader Modal */}
            <AnimatePresence>
                {viewingData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex flex-col bg-black/98 backdrop-blur-2xl">
                        <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-[70] pr-20 md:pr-6 pointer-events-none">
                            <div className="flex items-center gap-4 text-white pointer-events-auto">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg"><BookOpen className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-black text-xl uppercase tracking-tighter leading-none mb-1">{viewingData.subjectName}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chapter {viewingData.chapterIndex} • Page {currentPageIndex + 1}/{viewingData.images.length}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pointer-events-auto">
                                <a 
                                    href={viewingData.images[currentPageIndex]} 
                                    download={`${viewingData.subjectName}_Ch${viewingData.chapterIndex}_Page${currentPageIndex + 1}.jpg`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Page
                                </a>
                                <button onClick={() => setViewingData(null)} className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
                            <ZoomableImage 
                                key={currentPageIndex} 
                                src={viewingData.images[currentPageIndex]} 
                                alt={`Page ${currentPageIndex + 1}`}
                            />
                            <div className="absolute inset-0 flex pointer-events-none justify-between">
                                <div className="w-16 md:w-32 h-full cursor-w-resize pointer-events-auto" onClick={prevPage} />
                                <div className="w-16 md:w-32 h-full cursor-e-resize pointer-events-auto" onClick={nextPage} />
                            </div>
                        </div>
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2.5 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl z-[70]">
                            <button onClick={prevPage} disabled={currentPageIndex === 0} className={cn("p-2.5 rounded-xl transition-all", currentPageIndex === 0 ? "opacity-20 pointer-events-none" : "text-white bg-white/10 hover:bg-white/20")}><ChevronLeft className="w-5 h-5" /></button>
                            <div className="flex items-center gap-2 px-2">
                                <input 
                                    type="number"
                                    value={currentPageIndex + 1}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val >= 1 && val <= viewingData.images.length) {
                                            setCurrentPageIndex(val - 1);
                                        }
                                    }}
                                    className="w-12 bg-white/10 border border-white/10 text-white font-bold text-lg text-center rounded-lg py-1 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">of {viewingData.images.length}</span>
                            </div>
                            <button onClick={nextPage} disabled={currentPageIndex === viewingData.images.length - 1} className={cn("p-2.5 rounded-xl transition-all", currentPageIndex === viewingData.images.length - 1 ? "opacity-20 pointer-events-none" : "text-white bg-white/10 hover:bg-white/20")}><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentSubjects;


