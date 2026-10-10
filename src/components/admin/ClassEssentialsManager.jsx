import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { storage } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import {
    FolderOpen,
    Upload,
    Plus,
    Search,
    Video,
    Music,
    Image as ImageIcon,
    FileText,
    Play,
    Download,
    Trash2,
    Edit,
    X,
    CheckCircle,
    AlertCircle,
    Filter,
    Loader2,
    Eye,
    Film,
    FileAudio,
    FileImage,
    Sparkles,
    Calendar,
    Users
} from 'lucide-react';
import { clsx } from 'clsx';

const DEFAULT_CATEGORIES = [
    'Morning Dua & Adhkar',
    'Assembly Recitations',
    'Video Lessons & Guides',
    'Classroom Posters',
    'Nasheeds & Songs',
    'General Resources'
];

export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export const getFileType = (file) => {
    const mime = file?.type || '';
    const name = (file?.name || '').toLowerCase();
    if (mime.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mkv') || name.endsWith('.webm')) return 'video';
    if (mime.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a') || name.endsWith('.aac')) return 'audio';
    if (mime.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp')) return 'image';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'document';
    return 'other';
};

const ClassEssentialsManager = () => {
    const { classEssentials = [], addClassEssential, updateClassEssential, deleteClassEssential, classes = [], currentUser } = useData();
    const { showAlert } = useUI();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'video' | 'audio' | 'image' | 'document'
    const [classFilter, setClassFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Modals
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [previewModal, setPreviewModal] = useState({ isOpen: false, item: null });
    const [editModal, setEditModal] = useState({ isOpen: false, item: null });
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, item: null });

    // Upload Form State
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCategory, setUploadCategory] = useState(DEFAULT_CATEGORIES[0]);
    const [customCategory, setCustomCategory] = useState('');
    const [uploadTargetClass, setUploadTargetClass] = useState('all');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Unique Standards from classes
    const uniqueStandards = useMemo(() => {
        return [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [classes]);

    // Categories in current essentials
    const allCategories = useMemo(() => {
        const set = new Set(DEFAULT_CATEGORIES);
        classEssentials.forEach(item => {
            if (item.category) set.add(item.category);
        });
        return Array.from(set);
    }, [classEssentials]);

    // Filtered essentials
    const filteredEssentials = useMemo(() => {
        return (classEssentials || []).filter(item => {
            // Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = (item.title || '').toLowerCase().includes(q);
                const descMatch = (item.description || '').toLowerCase().includes(q);
                const catMatch = (item.category || '').toLowerCase().includes(q);
                const fileMatch = (item.fileName || '').toLowerCase().includes(q);
                if (!titleMatch && !descMatch && !catMatch && !fileMatch) return false;
            }

            // Type
            if (typeFilter !== 'all' && item.fileType !== typeFilter) return false;

            // Class
            if (classFilter !== 'all') {
                if (item.targetClass !== 'all' && item.targetClass !== classFilter) return false;
            }

            // Category
            if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

            return true;
        }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [classEssentials, searchQuery, typeFilter, classFilter, categoryFilter]);

    // Metrics
    const metrics = useMemo(() => {
        const total = classEssentials.length;
        const videos = classEssentials.filter(i => i.fileType === 'video').length;
        const audios = classEssentials.filter(i => i.fileType === 'audio').length;
        const images = classEssentials.filter(i => i.fileType === 'image').length;
        const documents = classEssentials.filter(i => i.fileType === 'document').length;
        return { total, videos, audios, images, documents };
    }, [classEssentials]);

    // Handle File Drop or Select
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadFile(file);
        setUploadError('');
        if (!uploadTitle.trim()) {
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            setUploadTitle(baseName);
        }
    };

    // Reset Upload Form
    const resetUploadForm = () => {
        setUploadFile(null);
        setUploadTitle('');
        setUploadCategory(DEFAULT_CATEGORIES[0]);
        setCustomCategory('');
        setUploadTargetClass('all');
        setUploadDescription('');
        setUploadProgress(0);
        setIsUploading(false);
        setUploadError('');
    };

    // Execute File Upload
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        setUploadError('');

        if (!uploadFile) {
            setUploadError('Please choose a file to upload.');
            return;
        }

        if (!uploadTitle.trim()) {
            setUploadError('Please provide a title for this essential.');
            return;
        }

        const chosenCategory = uploadCategory === 'Custom' ? customCategory.trim() : uploadCategory;
        if (!chosenCategory) {
            setUploadError('Please specify a category.');
            return;
        }

        const fileType = getFileType(uploadFile);
        const timestamp = Date.now();
        const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `class_essentials/${timestamp}_${safeName}`;
        const fileRef = ref(storage, storagePath);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const uploadTask = uploadBytesResumable(fileRef, uploadFile);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    setUploadProgress(percent);
                },
                (error) => {
                    console.error('Storage upload failed:', error);
                    setUploadError('Upload failed: ' + error.message);
                    setIsUploading(false);
                },
                async () => {
                    try {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                        await addClassEssential({
                            title: uploadTitle.trim(),
                            category: chosenCategory,
                            targetClass: uploadTargetClass,
                            description: uploadDescription.trim(),
                            fileUrl: downloadUrl,
                            storagePath,
                            fileName: uploadFile.name,
                            fileType,
                            mimeType: uploadFile.type || 'application/octet-stream',
                            fileSize: uploadFile.size,
                            uploadedBy: currentUser?.name || 'Administrator',
                            uploadedById: currentUser?.id || 'admin',
                            createdAt: new Date().toISOString()
                        });

                        setIsUploadModalOpen(false);
                        resetUploadForm();
                        showAlert('Upload Successful', `"${uploadTitle}" has been added to Class Essentials!`, 'success');
                    } catch (dbErr) {
                        console.error('Failed to save to Firestore:', dbErr);
                        setUploadError('Failed to save essential data: ' + dbErr.message);
                        setIsUploading(false);
                    }
                }
            );
        } catch (err) {
            console.error('Upload initiation error:', err);
            setUploadError('Error starting upload: ' + err.message);
            setIsUploading(false);
        }
    };

    // Handle Edit Save
    const handleEditSave = async (e) => {
        e.preventDefault();
        if (!editModal.item) return;

        try {
            await updateClassEssential(editModal.item.id, {
                title: editModal.item.title,
                category: editModal.item.category,
                targetClass: editModal.item.targetClass,
                description: editModal.item.description || ''
            });

            setEditModal({ isOpen: false, item: null });
            showAlert('Updated', 'Class Essential has been updated.', 'success');
        } catch (err) {
            showAlert('Update Error', err.message, 'error');
        }
    };

    // Handle Delete
    const handleDeleteConfirm = async () => {
        if (!deleteConfig.item) return;
        try {
            await deleteClassEssential(deleteConfig.item.id, deleteConfig.item.storagePath);
            setDeleteConfig({ isOpen: false, item: null });
            showAlert('Deleted', 'Class Essential removed successfully.', 'success');
        } catch (err) {
            showAlert('Delete Failed', err.message, 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Header Card */}
            <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-50/60 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                            <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Central Media & Resource Library</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Class Essentials</h1>
                        <p className="text-gray-500 text-sm mt-1.5 max-w-xl leading-relaxed">
                            Upload and manage audio clips (MP3), video lessons (MP4), posters, and teaching aids. All materials are instantly accessible to mentors in their panel.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            resetUploadForm();
                            setIsUploadModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all whitespace-nowrap self-start md:self-auto cursor-pointer"
                    >
                        <Plus className="w-5 h-5 text-white" />
                        <span>Upload Essential File</span>
                    </button>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100 relative z-10">
                    <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                        <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-indigo-500" /> Total Files
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
                    </div>
                    <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                        <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                            <Film className="w-3.5 h-3.5 text-rose-500" /> Videos (MP4)
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{metrics.videos}</p>
                    </div>
                    <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                        <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                            <FileAudio className="w-3.5 h-3.5 text-amber-500" /> Audios (MP3)
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{metrics.audios}</p>
                    </div>
                    <div className="bg-gray-50/80 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-100 transition-colors">
                        <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                            <FileImage className="w-3.5 h-3.5 text-emerald-500" /> Images & Docs
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{metrics.images + metrics.documents}</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Controls */}
            <Card className="p-4 sm:p-5 shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                    {/* Media Type Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                        {[
                            { id: 'all', label: 'All Files', icon: FolderOpen },
                            { id: 'video', label: 'Videos', icon: Video },
                            { id: 'audio', label: 'Audios', icon: Music },
                            { id: 'image', label: 'Images', icon: ImageIcon },
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
                                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Dropdown Filters */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by title or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
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

                        {/* Standard/Class Filter */}
                        <select
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Standards</option>
                            {uniqueStandards.map(std => (
                                <option key={std} value={std}>Class {std}</option>
                            ))}
                        </select>

                        {/* Category Filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Categories</option>
                            {allCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Content Grid */}
            {filteredEssentials.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FolderOpen className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Class Essentials Found</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                        {searchQuery || typeFilter !== 'all' || classFilter !== 'all' || categoryFilter !== 'all'
                            ? "No resources match your active search or filters. Try clearing filters."
                            : "No essential materials uploaded yet. Click below to add the first video, audio, or poster."}
                    </p>
                    <button
                        onClick={() => {
                            resetUploadForm();
                            setIsUploadModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Upload First Resource</span>
                    </button>
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
                                className="bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
                            >
                                {/* Media Thumbnail / Preview Area */}
                                <div className="h-44 bg-gray-900 relative overflow-hidden flex items-center justify-center select-none">
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
                                            <span className="text-[11px] font-bold tracking-wider uppercase opacity-80">Audio Recording</span>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-700 to-indigo-900 flex flex-col items-center justify-center p-4 text-white">
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
                                        {/* Category */}
                                        <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide mb-1">
                                            {item.category || 'General'}
                                        </p>
                                        {/* Title */}
                                        <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2" title={item.title}>
                                            {item.title}
                                        </h4>
                                        {/* Description */}
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

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setPreviewModal({ isOpen: true, item })}
                                                className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                                title="Preview / Play"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View</span>
                                            </button>

                                            <a
                                                href={item.fileUrl}
                                                download={item.fileName || 'file'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors cursor-pointer"
                                                title="Download file"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </a>

                                            <button
                                                onClick={() => setEditModal({ isOpen: true, item: { ...item } })}
                                                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors cursor-pointer"
                                                title="Edit Details"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => setDeleteConfig({ isOpen: true, item })}
                                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                                                title="Delete Resource"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* UPLOAD MODAL */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    if (!isUploading) {
                        setIsUploadModalOpen(false);
                        resetUploadForm();
                    }
                }}
                title="Upload Class Essential File"
            >
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                    {/* File Dropzone */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Select File (MP4, MP3, JPG, PNG, PDF)
                        </label>
                        <div className={clsx(
                            "border-2 border-dashed rounded-2xl p-6 text-center transition-colors",
                            uploadFile ? "border-emerald-400 bg-emerald-50/40" : "border-gray-200 hover:border-indigo-400 bg-gray-50"
                        )}>
                            <input
                                type="file"
                                id="essential-file-input"
                                onChange={handleFileChange}
                                accept="video/mp4,video/x-matroska,video/webm,audio/mp3,audio/mpeg,audio/wav,audio/m4a,image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden"
                                disabled={isUploading}
                            />
                            {uploadFile ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="font-bold text-gray-900 text-sm truncate max-w-xs">{uploadFile.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {formatFileSize(uploadFile.size)} • Type: <strong className="uppercase">{getFileType(uploadFile)}</strong>
                                    </p>
                                    {!isUploading && (
                                        <label
                                            htmlFor="essential-file-input"
                                            className="text-xs font-bold text-indigo-600 hover:underline mt-2 cursor-pointer"
                                        >
                                            Choose a different file
                                        </label>
                                    )}
                                </div>
                            ) : (
                                <label htmlFor="essential-file-input" className="cursor-pointer block">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="font-bold text-gray-800 text-sm">Click to choose or drag & drop file</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        MP4 videos, MP3 audio, JPG/PNG posters, or PDF documents
                                    </p>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <Input
                        label="Title / Resource Name *"
                        placeholder="e.g. Morning Dua Recitation Audio"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        disabled={isUploading}
                    />

                    {/* Category & Target Class */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            label="Category"
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value)}
                            disabled={isUploading}
                        >
                            {DEFAULT_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Custom">+ Custom Category</option>
                        </Select>

                        <Select
                            label="Target Class Standard"
                            value={uploadTargetClass}
                            onChange={(e) => setUploadTargetClass(e.target.value)}
                            disabled={isUploading}
                        >
                            <option value="all">All Classes & Mentors</option>
                            {uniqueStandards.map(std => (
                                <option key={std} value={std}>Class {std} Only</option>
                            ))}
                        </Select>
                    </div>

                    {/* Custom Category input if chosen */}
                    {uploadCategory === 'Custom' && (
                        <Input
                            label="Enter Custom Category Name *"
                            placeholder="e.g. Exam Guidelines"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            disabled={isUploading}
                        />
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description / Instructions (Optional)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Add guidance or notes for mentors about this file..."
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                            disabled={isUploading}
                        />
                    </div>

                    {/* Error display */}
                    {uploadError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Live Upload Progress */}
                    {isUploading && (
                        <div className="space-y-1.5 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                    Uploading to Firebase Storage...
                                </span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-indigo-200/60 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-indigo-600 font-medium">Please do not close this window during upload.</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsUploadModalOpen(false);
                                resetUploadForm();
                            }}
                            className="flex-1"
                            disabled={isUploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 flex items-center justify-center gap-2"
                            disabled={isUploading || !uploadFile}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Uploading ({uploadProgress}%)...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Upload Resource</span>
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* PREVIEW MODAL */}
            {previewModal.isOpen && previewModal.item && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                                    {previewModal.item.category} • {previewModal.item.fileType.toUpperCase()}
                                </span>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                                    {previewModal.item.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setPreviewModal({ isOpen: false, item: null })}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Media Player / Viewer Body */}
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
                                <div className="w-full max-w-lg p-6 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl text-white shadow-xl flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                                        <Music className="w-10 h-10 text-indigo-200 animate-pulse" />
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">{previewModal.item.title}</h4>
                                    <p className="text-xs text-indigo-200 mb-6">{previewModal.item.category}</p>
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
                                    <FileText className="w-16 h-16 text-indigo-500 mx-auto mb-3" />
                                    <p className="font-bold text-gray-900 mb-2">{previewModal.item.fileName}</p>
                                    <a
                                        href={previewModal.item.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700"
                                    >
                                        <Download className="w-4 h-4" /> Open Document
                                    </a>
                                </div>
                            )}

                            {previewModal.item.description && (
                                <div className="mt-4 w-full p-4 bg-white rounded-2xl border border-gray-200/80 text-xs text-gray-600">
                                    <strong className="block text-gray-900 mb-0.5">Instructions & Description:</strong>
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
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs rounded-xl shadow-sm transition-all"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download File</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT DETAILS MODAL */}
            {editModal.isOpen && editModal.item && (
                <Modal
                    isOpen={editModal.isOpen}
                    onClose={() => setEditModal({ isOpen: false, item: null })}
                    title="Edit Class Essential"
                >
                    <form onSubmit={handleEditSave} className="space-y-4">
                        <Input
                            label="Title *"
                            value={editModal.item.title}
                            onChange={(e) => setEditModal(p => ({
                                ...p,
                                item: { ...p.item, title: e.target.value }
                            }))}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Category"
                                value={editModal.item.category}
                                onChange={(e) => setEditModal(p => ({
                                    ...p,
                                    item: { ...p.item, category: e.target.value }
                                }))}
                            >
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </Select>

                            <Select
                                label="Target Class Standard"
                                value={editModal.item.targetClass || 'all'}
                                onChange={(e) => setEditModal(p => ({
                                    ...p,
                                    item: { ...p.item, targetClass: e.target.value }
                                }))}
                            >
                                <option value="all">All Classes</option>
                                {uniqueStandards.map(std => (
                                    <option key={std} value={std}>Class {std}</option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description / Notes
                            </label>
                            <textarea
                                rows={3}
                                value={editModal.item.description || ''}
                                onChange={(e) => setEditModal(p => ({
                                    ...p,
                                    item: { ...p.item, description: e.target.value }
                                }))}
                                className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setEditModal({ isOpen: false, item: null })}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* DELETE CONFIRMATION */}
            <ConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ isOpen: false, item: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Class Essential"
                message={`Are you sure you want to delete "${deleteConfig.item?.title}"? This will permanently delete the file from storage and mentors will no longer be able to access it.`}
                confirmText="Yes, Delete"
            />
        </div>
    );
};

export default ClassEssentialsManager;
