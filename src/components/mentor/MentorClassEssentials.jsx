import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import {
    FolderOpen,
    Search,
    Video,
    Music,
    Image as ImageIcon,
    FileText,
    Play,
    Download,
    X,
    Eye,
    Film,
    FileAudio,
    FileImage,
    Sparkles,
    Calendar,
    Users,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatFileSize } from '../admin/ClassEssentialsManager';

const MentorClassEssentials = () => {
    const { classEssentials = [], currentUser, classes = [] } = useData();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'video' | 'audio' | 'image' | 'document'
    const [classFilter, setClassFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Modals
    const [previewModal, setPreviewModal] = useState({ isOpen: false, item: null });

    // Mentor's assigned classes
    const mentorClassNames = useMemo(() => {
        const assignedIds = currentUser?.assignedClassIds || (currentUser?.classId ? [currentUser.classId] : []);
        const assigned = classes.filter(c => assignedIds.includes(c.id));
        return [...new Set(assigned.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [classes, currentUser]);

    // Categories in current essentials
    const allCategories = useMemo(() => {
        const set = new Set();
        (classEssentials || []).forEach(item => {
            if (item.category) set.add(item.category);
        });
        return Array.from(set);
    }, [classEssentials]);

    // Filtered essentials
    // Mentors see items targeted to 'all' OR to any of their assigned classes (or if they pick a filter)
    const filteredEssentials = useMemo(() => {
        return (classEssentials || []).filter(item => {
            // Audience matching: Item is either for 'all' or matches one of mentor's classes
            const isRelevantToMentor = item.targetClass === 'all' || mentorClassNames.includes(item.targetClass);
            if (!isRelevantToMentor) return false;

            // Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = (item.title || '').toLowerCase().includes(q);
                const descMatch = (item.description || '').toLowerCase().includes(q);
                const catMatch = (item.category || '').toLowerCase().includes(q);
                const fileMatch = (item.fileName || '').toLowerCase().includes(q);
                if (!titleMatch && !descMatch && !catMatch && !fileMatch) return false;
            }

            // Type Filter
            if (typeFilter !== 'all' && item.fileType !== typeFilter) return false;

            // Class Filter
            if (classFilter !== 'all') {
                if (item.targetClass !== 'all' && item.targetClass !== classFilter) return false;
            }

            // Category Filter
            if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

            return true;
        }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [classEssentials, searchQuery, typeFilter, classFilter, categoryFilter, mentorClassNames]);

    // Counts
    const metrics = useMemo(() => {
        const relevant = (classEssentials || []).filter(item => item.targetClass === 'all' || mentorClassNames.includes(item.targetClass));
        const total = relevant.length;
        const videos = relevant.filter(i => i.fileType === 'video').length;
        const audios = relevant.filter(i => i.fileType === 'audio').length;
        const images = relevant.filter(i => i.fileType === 'image').length;
        const documents = relevant.filter(i => i.fileType === 'document').length;
        return { total, videos, audios, images, documents };
    }, [classEssentials, mentorClassNames]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Hero */}
            <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-purple-50/60 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                        <FolderOpen className="w-3.5 h-3.5 text-purple-600" />
                        <span>Teacher Resource & Media Hub</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Class Essentials</h1>
                    <p className="text-gray-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
                        Access audio recordings (MP3), video tutorials (MP4), morning assembly duas, charts, and teaching aids curated by the administration for your classes.
                    </p>

                    {/* Quick Stats Pill Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
                        <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                            <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                                <FolderOpen className="w-3.5 h-3.5 text-purple-500" /> Available Resources
                            </p>
                            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
                        </div>
                        <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                            <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                                <Film className="w-3.5 h-3.5 text-rose-500" /> Video Guides
                            </p>
                            <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{metrics.videos}</p>
                        </div>
                        <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                            <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                                <FileAudio className="w-3.5 h-3.5 text-amber-500" /> Audio Duas & Clips
                            </p>
                            <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{metrics.audios}</p>
                        </div>
                        <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                            <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                                <FileImage className="w-3.5 h-3.5 text-emerald-500" /> Posters & Docs
                            </p>
                            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{metrics.images + metrics.documents}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-4 sm:p-5 shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                    {/* Media Type Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                        {[
                            { id: 'all', label: 'All Resources', icon: FolderOpen },
                            { id: 'video', label: 'Videos', icon: Video },
                            { id: 'audio', label: 'Audios', icon: Music },
                            { id: 'image', label: 'Posters & Images', icon: ImageIcon },
                            { id: 'document', label: 'Documents', icon: FileText }
                        ].map(t => {
                            const Icon = t.icon;
                            const isActive = typeFilter === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTypeFilter(t.id)}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                        isActive
                                            ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Filter Selects */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search materials..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Standard Filter */}
                        {mentorClassNames.length > 0 && (
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">All My Classes</option>
                                {mentorClassNames.map(std => (
                                    <option key={std} value={std}>Class {std}</option>
                                ))}
                            </select>
                        )}

                        {/* Category Filter */}
                        {allCategories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">All Categories</option>
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </Card>

            {/* Media Grid */}
            {filteredEssentials.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FolderOpen className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Class Essentials Found</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                        {searchQuery || typeFilter !== 'all' || classFilter !== 'all' || categoryFilter !== 'all'
                            ? "No resources match your active search or filters. Try resetting filters."
                            : "No materials have been uploaded for your classes yet. Check back soon."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredEssentials.map(item => {
                        const isVideo = item.fileType === 'video';
                        const isAudio = item.fileType === 'audio';
                        const isImage = item.fileType === 'image';

                        return (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl border border-gray-100 hover:border-purple-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
                            >
                                {/* Media Thumbnail Area */}
                                <div
                                    onClick={() => setPreviewModal({ isOpen: true, item })}
                                    className="h-44 bg-gray-900 relative overflow-hidden flex items-center justify-center select-none cursor-pointer"
                                >
                                    {isImage ? (
                                        <img
                                            src={item.fileUrl}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    ) : isVideo ? (
                                        <div className="w-full h-full relative bg-slate-950 flex items-center justify-center">
                                            <video
                                                src={item.fileUrl}
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                                preload="metadata"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                    <Play className="w-6 h-6 fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : isAudio ? (
                                        <div className="w-full h-full bg-gradient-to-br from-amber-600 to-orange-800 flex flex-col items-center justify-center p-4 text-white">
                                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-inner">
                                                <Music className="w-7 h-7 text-white" />
                                            </div>
                                            <span className="text-[11px] font-bold tracking-wider uppercase opacity-80">Click to Play Audio</span>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4 text-white">
                                            <FileText className="w-12 h-12 text-white/80 mb-1" />
                                            <span className="text-xs font-bold uppercase opacity-80">Document / PDF</span>
                                        </div>
                                    )}

                                    {/* Type Badge Top Left */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm",
                                            isVideo && "bg-rose-600/90 text-white",
                                            isAudio && "bg-amber-600/90 text-white",
                                            isImage && "bg-emerald-600/90 text-white",
                                            !isVideo && !isAudio && !isImage && "bg-blue-600/90 text-white"
                                        )}>
                                            {item.fileType}
                                        </span>
                                    </div>

                                    {/* Target Class Badge Top Right */}
                                    <div className="absolute top-3 right-3">
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                                            {item.targetClass === 'all' ? 'All Classes' : `Class ${item.targetClass}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-1">
                                            {item.category || 'General'}
                                        </p>
                                        <h4
                                            onClick={() => setPreviewModal({ isOpen: true, item })}
                                            className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 cursor-pointer hover:text-purple-600 transition-colors"
                                            title={item.title}
                                        >
                                            {item.title}
                                        </h4>
                                        {item.description && (
                                            <p className="text-gray-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Footer Info & Actions */}
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3">
                                            <span>{formatFileSize(item.fileSize)}</span>
                                            <span>
                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPreviewModal({ isOpen: true, item })}
                                                className="flex-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                {isAudio ? <Music className="w-3.5 h-3.5" /> : isVideo ? <Play className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                <span>{isAudio ? 'Listen' : isVideo ? 'Watch' : 'View'}</span>
                                            </button>

                                            <a
                                                href={item.fileUrl}
                                                download={item.fileName || 'file'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors cursor-pointer"
                                                title="Download for classroom use"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* PREVIEW / PLAYER MODAL */}
            {previewModal.isOpen && previewModal.item && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">
                                    {previewModal.item.category} • {previewModal.item.fileType.toUpperCase()}
                                </span>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                                    {previewModal.item.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setPreviewModal({ isOpen: false, item: null })}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Player / Viewer Content */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950/5">
                            {previewModal.item.fileType === 'video' ? (
                                <div className="w-full rounded-2xl overflow-hidden bg-black shadow-lg">
                                    <video
                                        src={previewModal.item.fileUrl}
                                        controls
                                        autoPlay
                                        className="w-full max-h-[60vh] object-contain mx-auto"
                                    />
                                </div>
                            ) : previewModal.item.fileType === 'audio' ? (
                                <div className="w-full max-w-lg p-6 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-xl flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                                        <Music className="w-10 h-10 text-purple-200 animate-pulse" />
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">{previewModal.item.title}</h4>
                                    <p className="text-xs text-purple-200 mb-6">{previewModal.item.category}</p>
                                    <audio
                                        src={previewModal.item.fileUrl}
                                        controls
                                        autoPlay
                                        className="w-full rounded-xl"
                                    />
                                </div>
                            ) : previewModal.item.fileType === 'image' ? (
                                <div className="w-full flex items-center justify-center max-h-[65vh]">
                                    <img
                                        src={previewModal.item.fileUrl}
                                        alt={previewModal.item.title}
                                        className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-lg"
                                    />
                                </div>
                            ) : (
                                <div className="text-center p-8">
                                    <FileText className="w-16 h-16 text-purple-500 mx-auto mb-3" />
                                    <p className="font-bold text-gray-900 mb-2">{previewModal.item.fileName}</p>
                                    <a
                                        href={previewModal.item.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow hover:bg-purple-700"
                                    >
                                        <Download className="w-4 h-4" /> Open Document
                                    </a>
                                </div>
                            )}

                            {previewModal.item.description && (
                                <div className="mt-4 w-full p-4 bg-white rounded-2xl border border-gray-200/80 text-xs text-gray-600">
                                    <strong className="block text-gray-900 mb-0.5">Guidance & Description:</strong>
                                    {previewModal.item.description}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                            <span className="text-xs text-gray-500 font-medium">
                                File Size: {formatFileSize(previewModal.item.fileSize)}
                            </span>
                            <a
                                href={previewModal.item.fileUrl}
                                download={previewModal.item.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs rounded-xl shadow-sm transition-all"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download to Device</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorClassEssentials;
