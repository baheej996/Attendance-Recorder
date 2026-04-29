import React, { useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { X, UploadCloud, Trash2, Image as ImageIcon, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const SubjectBookModal = ({ isOpen, onClose, subjectGroup }) => {
    const { updateSubject } = useData();
    const { showAlert, showConfirm } = useUI();
    const [uploadingChapter, setUploadingChapter] = useState(null);
    const [expandedChapter, setExpandedChapter] = useState(1);
    
    // Create refs for inputs dynamically
    const fileInputRefs = useRef({});

    if (!isOpen || !subjectGroup) return null;

    const subject = subjectGroup.sampleSubject;
    const totalChapters = Number(subject.totalChapters) || 0;
    const chapterData = subject.chapterData || {};

    const handleFileSelect = async (e, chapterIndex) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            showAlert('Validation Error', 'Only image files (JPEG, PNG) are allowed.', 'error');
            return;
        }

        setUploadingChapter(chapterIndex);
        
        try {
            // 1. Parallel Cloud Storage Upload
            const uploadPromises = imageFiles.map(async (file) => {
                const ext = file.name.split('.').pop() || 'png';
                const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                // Reverting to 'chapter_' to match existing security rules
                const fileName = `subject_books/${subject.id}/chapter_${chapterIndex}/${uniqueId}.${ext}`;
                const storageRef = ref(storage, fileName);
                const snapshot = await uploadBytes(storageRef, file);
                return await getDownloadURL(snapshot.ref);
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            
            // 2. Prepare Data
            const currentChapterData = chapterData[chapterIndex] || { images: [], isRevealedToStudents: false };
            const updatedChapterData = {
                ...chapterData,
                [chapterIndex]: {
                    ...currentChapterData,
                    images: [...(currentChapterData.images || []), ...uploadedUrls]
                }
            };

            // 3. Batch Database Updates
            const updateIds = subjectGroup.subjectIds;
            await Promise.all(updateIds.map(id => updateSubject(id, { chapterData: updatedChapterData })));

            showAlert('Success', `${uploadedUrls.length} pages added to Chapter ${chapterIndex}`, 'success');
        } catch (error) {
            console.error('CRITICAL UPLOAD ERROR:', error);
            const errorMsg = error.code === 'storage/unauthorized' 
                ? 'Permission denied. Please check storage rules.' 
                : `Failed: ${error.message || 'Unknown error occurred'}`;
            showAlert('Upload Error', errorMsg, 'error');
        } finally {
            setUploadingChapter(null);
            if (fileInputRefs.current[chapterIndex]) fileInputRefs.current[chapterIndex].value = '';
        }
    };

    const handleDeleteImage = (chapterIndex, imageUrl) => {
        showConfirm(
            'Delete Page',
            'Are you sure you want to delete this page from the chapter?',
            async () => {
                try {
                    const currentChapterData = chapterData[chapterIndex] || { images: [] };
                    const updatedImages = (currentChapterData.images || []).filter(url => url !== imageUrl);
                    
                    const updatedChapterData = {
                        ...chapterData,
                        [chapterIndex]: {
                            ...currentChapterData,
                            images: updatedImages
                        }
                    };

                    await Promise.all(
                        subjectGroup.subjectIds.map(id => updateSubject(id, { chapterData: updatedChapterData }))
                    );
                    showAlert('Success', 'Page removed successfully.', 'success');
                } catch (error) {
                    console.error('Error removing page:', error);
                    showAlert('Error', 'Failed to remove the page.', 'error');
                }
            }
        );
    };

    const handleClearChapter = (chapterIndex) => {
        showConfirm(
            'Clear Chapter',
            `Are you sure you want to delete ALL pages from Chapter ${chapterIndex}?`,
            async () => {
                try {
                    const currentChapterData = chapterData[chapterIndex] || {};
                    const updatedChapterData = {
                        ...chapterData,
                        [chapterIndex]: {
                            ...currentChapterData,
                            images: []
                        }
                    };

                    await Promise.all(
                        subjectGroup.subjectIds.map(id => updateSubject(id, { chapterData: updatedChapterData }))
                    );
                    showAlert('Success', 'All pages removed from the chapter.', 'success');
                } catch (error) {
                    console.error('Error clearing chapter:', error);
                    showAlert('Error', 'Failed to clear chapter.', 'error');
                }
            }
        );
    };

    if (totalChapters <= 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No Chapters Found</h2>
                    <p className="text-gray-500 mb-6">
                        This subject does not have the 'totalChapters' value set. Please go back and edit the subject to specify the total number of chapters before uploading books.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors w-full"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Manage Chapters</h2>
                            <p className="text-sm text-gray-500">Subject: {subject.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {chapters.map((chapterIndex) => {
                        const chapterImages = chapterData[chapterIndex]?.images || [];
                        const isExpanded = expandedChapter === chapterIndex;
                        const isUploadingThis = uploadingChapter === chapterIndex;

                        return (
                            <div key={chapterIndex} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Accordion Header */}
                                <button 
                                    className={`w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors ${isExpanded ? 'border-b border-gray-200' : ''}`}
                                    onClick={() => setExpandedChapter(isExpanded ? null : chapterIndex)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                            {chapterIndex}
                                        </div>
                                        <h3 className="font-bold text-gray-800">Chapter {chapterIndex}</h3>
                                        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                            {chapterImages.length} Pages
                                        </span>
                                    </div>
                                    <div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                    </div>
                                </button>

                                {/* Accordion Content */}
                                {isExpanded && (
                                    <div className="p-4 bg-white">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Upload Zone */}
                                            <div className="w-full md:w-1/3 shrink-0 border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/jpeg, image/png, image/webp"
                                                    ref={(el) => fileInputRefs.current[chapterIndex] = el}
                                                    onChange={(e) => handleFileSelect(e, chapterIndex)}
                                                    className="hidden"
                                                />
                                                <UploadCloud className="w-8 h-8 text-indigo-400 mb-3" />
                                                <p className="text-sm text-gray-600 mb-4 font-medium">Upload Pages for CH {chapterIndex}</p>
                                                <button
                                                    onClick={() => fileInputRefs.current[chapterIndex]?.click()}
                                                    disabled={uploadingChapter !== null}
                                                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                                >
                                                    {isUploadingThis ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                                                        </>
                                                    ) : (
                                                        'Select Images'
                                                    )}
                                                </button>
                                            </div>

                                            {/* Gallery Zone */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-bold text-gray-800 text-sm">Uploaded Pages</h4>
                                                    {chapterImages.length > 0 && (
                                                        <button
                                                            onClick={() => handleClearChapter(chapterIndex)}
                                                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Clear Chapter
                                                        </button>
                                                    )}
                                                </div>

                                                {chapterImages.length === 0 ? (
                                                    <div className="h-32 border border-gray-100 bg-gray-50 rounded-xl flex items-center justify-center">
                                                        <p className="text-gray-400 text-sm">No pages. Upload images to populate.</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex overflow-x-auto gap-3 pb-2 snap-x">
                                                        {chapterImages.map((url, imgIndex) => (
                                                            <div key={imgIndex} className="relative group shrink-0 w-24 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 snap-start">
                                                                <img 
                                                                    src={url} 
                                                                    alt={`CH${chapterIndex} Page ${imgIndex + 1}`} 
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <button
                                                                        onClick={() => handleDeleteImage(chapterIndex, url)}
                                                                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                                                        title="Delete Page"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">
                                                                    P{imgIndex + 1}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubjectBookModal;
