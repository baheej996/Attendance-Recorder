import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { BookOpen, Save, Trash2, History, Filter, Search, Edit, PieChart as PieChartIcon, CheckCircle, Trophy, User, ChevronLeft, ChevronRight, Plus, X, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const LogBook = () => {
    console.log('[LogBook] Rendering...');
    const { classes, subjects, logEntries, addLogEntry, updateLogEntry, deleteLogEntry, currentUser, mentors, syllabi, logLimit, loadMoreLogs, syllabusStatuses } = useData();
    const { showAlert } = useUI();

    const [formData, setFormData] = useState({
        chapter: '',
        heading: '',
        remarks: '',
        completionStatus: 'fully',
        sharedClassIds: []
    });

    const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.

    const [editingId, setEditingId] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [filter, setFilter] = useState({
        classId: 'all',
        subjectId: 'all'
    });

    const [deleteConfig, setDeleteConfig] = useState({
        isOpen: false,
        id: null
    });

    // Filter classes assigned to this mentor
    const assignedClasses = useMemo(() => {
        const ids = currentUser?.assignedClassIds || [];
        return classes
            .filter(c => ids.includes(c.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [classes, currentUser?.assignedClassIds?.join(',')]);

    React.useEffect(() => {
        if (filter.classId === 'all' && assignedClasses.length > 0) {
            setFilter(prev => ({ ...prev, classId: assignedClasses[0].id }));
        }
    }, [assignedClasses, filter.classId]);

    // Filter subjects for the unique FILTER dropdown
    const filterSubjects = useMemo(() => {
        if (filter.classId === 'all') {
            const assignedClassIds = assignedClasses.map(c => c.id);
            return subjects.filter(s => assignedClassIds.includes(s.classId));
        }
        return subjects.filter(s => s.classId === filter.classId);
    }, [subjects, filter.classId, assignedClasses]);

    const otherClasses = useMemo(() => {
        if (filter.classId === 'all') return [];
        const currentClass = classes.find(c => c.id === filter.classId);
        if (!currentClass) return [];

        return assignedClasses.filter(c => 
            c.id !== filter.classId && 
            c.name === currentClass.name
        );
    }, [assignedClasses, filter.classId, classes]);

    // Get current subject's chapter count
    const currentSubject = useMemo(() => {
        return subjects.find(s => s.id === filter.subjectId);
    }, [subjects, filter.subjectId]);

    const chapterOptions = useMemo(() => {
        if (!currentSubject || !currentSubject.totalChapters) return [];
        return Array.from({ length: currentSubject.totalChapters }, (_, i) => `Chapter ${i + 1}`);
    }, [currentSubject]);

    // Get suggestions for Chapters and Headings based on history
    const suggestions = useMemo(() => {
        const pertinentLogs = logEntries.filter(l =>
            (filter.subjectId === 'all' || l.subjectId === filter.subjectId)
        );
        const chapters = [...new Set(pertinentLogs.map(l => l.chapter))].filter(Boolean);
        const headings = [...new Set(pertinentLogs.map(l => l.heading))].filter(Boolean);
        return { chapters, headings };
    }, [logEntries, filter.subjectId]);

    // --- Syllabus Coverage Calculation ---
    const coverageStats = useMemo(() => {
        const stats = [];
        assignedClasses.forEach(cls => {
            const clsSubjects = subjects.filter(s => s.classId === cls.id);
            clsSubjects.forEach(sub => {
                const status = syllabusStatuses.find(s => s.classId === cls.id && s.subjectId === sub.id);
                const uniqueChapters = status ? (status.completedChapters || []).length : 0;
                const totalChapters = sub.totalChapters || 0;

                if (totalChapters > 0) {
                    stats.push({
                        classId: cls.id,
                        subjectId: sub.id,
                        className: `${cls.name} ${cls.division}`,
                        subjectName: sub.name,
                        uniqueChapters,
                        totalChapters,
                        percentage: Math.min(Math.round((uniqueChapters / totalChapters) * 100), 100)
                    });
                }
            });
        });

        return stats;
    }, [assignedClasses, subjects, syllabusStatuses]);

    // Filter Coverage Stats based on current Filter selection
    const displayedStats = useMemo(() => {
        return coverageStats.filter(stat => {
            const matchesClass = filter.classId === 'all' || stat.classId === filter.classId;
            const matchesSubject = filter.subjectId === 'all' || stat.subjectId === filter.subjectId;
            return matchesClass && matchesSubject;
        });
    }, [coverageStats, filter]);

    // --- Heatmap Logic ---
    const heatmapDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = logEntries.filter(l => {
                const matchesClass = filter.classId === 'all' || l.classId === filter.classId;
                const matchesSubject = filter.subjectId === 'all' || l.subjectId === filter.subjectId;
                const matchesDate = l.date === dateStr || (l.timestamp && l.timestamp.startsWith(dateStr));
                return matchesClass && matchesSubject && matchesDate;
            }).length;
            days.push({ date: d, dateStr, count });
        }
        return days;
    }, [logEntries, filter]);

    // --- Syllabus Targets Logic ---
    const activeSyllabus = useMemo(() => {
        if (filter.classId === 'all') return [];
        
        const cls = classes.find(c => c.id === filter.classId);
        if (!cls) return [];

        let targetSubjects = subjects.filter(s => s.classId === cls.id);
        
        if (filter.subjectId !== 'all') {
             targetSubjects = targetSubjects.filter(s => s.id === filter.subjectId);
        }

        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const currentMonthName = targetDate.toLocaleString('default', { month: 'long' });

        return targetSubjects.map(subj => {
            const plan = syllabi.find(s => 
                s.gradeName === cls.name && 
                s.subjectName.toLowerCase() === subj.name.toLowerCase() && 
                s.month === currentMonthName
            );
            if (!plan) return null;

            const status = syllabusStatuses.find(s => s.classId === filter.classId && s.subjectId === subj.id);
            const completedChaptersList = status ? (status.completedChapters || []) : [];
            
            // Helper to match log chapter string with plan chapter number
            const isMatch = (logCh, planChNum) => {
                const logLower = logCh.toLowerCase().trim();
                const planStr = planChNum.toString();
                return logLower === planStr || logLower === `chapter ${planStr}`;
            };

            const completedChapters = plan.chapters.filter(chNum => 
                completedChaptersList.some(ch => isMatch(ch, chNum))
            );
            
            const isCompleted = plan.chapters.length > 0 && completedChapters.length === plan.chapters.length;

            return {
                id: plan.id,
                subjectId: subj.id,
                subjectName: subj.name,
                chapters: plan.chapters,
                isCompleted
            };
        }).filter(Boolean);
    }, [filter, classes, subjects, syllabi, syllabusStatuses, monthOffset]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (filter.classId === 'all' || filter.subjectId === 'all') {
            showAlert('Missing Information', 'Please select a Class and Subject from the top filter before adding a log.', 'error');
            return;
        }
        if (!formData.chapter) {
            showAlert('Missing Information', 'Please provide a Chapter.', 'error');
            return;
        }

        const selectedClass = classes.find(c => c.id === filter.classId);
        const selectedSubject = subjects.find(s => s.id === filter.subjectId);
        
        const timestamp = new Date().toISOString();
        const date = timestamp.split('T')[0];

        const basePayload = {
            chapter: formData.chapter,
            heading: formData.heading,
            remarks: formData.remarks,
            completionStatus: formData.completionStatus,
            mentorId: currentUser?.id,
            date
        };

        try {
            // Main entry
            if (editingId) {
                await updateLogEntry(editingId, {
                    ...basePayload,
                    classId: filter.classId,
                    subjectId: filter.subjectId,
                    className: selectedClass ? `${selectedClass.name} ${selectedClass.division}` : 'Unknown',
                    subjectName: selectedSubject ? selectedSubject.name : 'Unknown'
                });
                showAlert('Success', 'Log entry updated successfully.', 'success');
                setEditingId(null);
            } else {
                await addLogEntry({
                    ...basePayload,
                    classId: filter.classId,
                    subjectId: filter.subjectId,
                    className: selectedClass ? `${selectedClass.name} ${selectedClass.division}` : 'Unknown',
                    subjectName: selectedSubject ? selectedSubject.name : 'Unknown'
                });
                showAlert('Success', 'Class log added successfully.', 'success');
            }

            // Shared entries - Only for non-editing or if explicitly selected during edit
            if (formData.sharedClassIds.length > 0) {
                let sharedCount = 0;
                for (const targetClassId of formData.sharedClassIds) {
                    const targetClass = classes.find(c => c.id === targetClassId);
                    const matchingSubject = subjects.find(s => s.classId === targetClassId && s.name === selectedSubject?.name);
                    
                    if (targetClass && matchingSubject) {
                        await addLogEntry({
                            ...basePayload,
                            classId: targetClassId,
                            subjectId: matchingSubject.id,
                            className: `${targetClass.name} ${targetClass.division}`,
                            subjectName: matchingSubject.name
                        });
                        sharedCount++;
                    }
                }
                if (sharedCount > 0) {
                    showAlert('Shared', `Log shared with ${sharedCount} other classes.`, 'success');
                }
            }

            setFormData({ chapter: '', heading: '', remarks: '', completionStatus: 'fully', sharedClassIds: [] });
            setIsFormOpen(false);
        } catch (error) {
            console.error(error);
            showAlert('Error', 'An error occurred while saving the log.', 'error');
        }
    };

    const handleEdit = (log) => {
        setEditingId(log.id);
        
        setFilter({
            classId: log.classId,
            subjectId: log.subjectId
        });

        setFormData({
            chapter: log.chapter,
            heading: log.heading || '',
            remarks: log.remarks || '',
            completionStatus: log.completionStatus || 'fully',
            sharedClassIds: []
        });

        setIsFormOpen(true);
    };

    const confirmDelete = (id) => {
        setDeleteConfig({ isOpen: true, id });
    };

    const handleDelete = () => {
        if (deleteConfig.id) {
            deleteLogEntry(deleteConfig.id);
            showAlert('Deleted', 'Log entry removed.', 'success');
        }
        setDeleteConfig({ isOpen: false, id: null });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setIsFormOpen(false);
        setFormData({ chapter: '', heading: '', remarks: '', completionStatus: 'fully', sharedClassIds: [] });
    };

    const filteredLogs = useMemo(() => {
        return logEntries.filter(log => {
            const isAssignedClass = assignedClasses.some(c => c.id === log.classId);
            if (!isAssignedClass) return false;

            const matchesClass = filter.classId === 'all' || log.classId === filter.classId;
            const matchesSubject = filter.subjectId === 'all' || log.subjectId === filter.subjectId;
            return matchesClass && matchesSubject;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [logEntries, filter, assignedClasses]);

    const displayedLogs = filteredLogs.slice(0, logLimit);

    const COLORS = ['#4f46e5', '#e5e7eb']; // Indigo vs Gray

    return (
        <div className="space-y-6 p-4 max-w-[1600px] mx-auto">
            <ConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                title="Delete Log Entry"
                message="Are you sure you want to delete this class log? This action cannot be undone."
                confirmText="Yes, Delete"
                isDanger
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                        Class Log Book
                    </h1>
                    <p className="text-gray-500 mt-1">Track daily progress and syllabus coverage for your assigned classes.</p>
                </div>

                {/* Top Level Filters - Applies to Graphs AND Logs */}
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2 border-r border-gray-200">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm border-none focus:ring-0 p-0 text-gray-700 font-medium"
                            value={filter.classId}
                            onChange={e => setFilter({ ...filter, classId: e.target.value, subjectId: 'all' })}
                        >
                            {assignedClasses.map(c => <option key={c.id} value={c.id}>{c.name}-{c.division}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm border-none focus:ring-0 p-0 text-gray-700 font-medium max-w-[150px]"
                            value={filter.subjectId}
                            onChange={e => setFilter({ ...filter, subjectId: e.target.value })}
                        >
                            <option value="all">All Subjects</option>
                            {filterSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Heatmap Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 overflow-x-auto">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-semibold text-gray-800">Activity Heatmap (Last 30 Days)</h3>
                    </div>
                    <Button onClick={() => { setEditingId(null); setIsFormOpen(true); }} className="hidden md:flex items-center gap-2 shadow-sm py-1.5 px-3">
                        <Plus className="w-4 h-4" /> Add Log
                    </Button>
                </div>
                <div className="flex gap-1 min-w-max">
                    {heatmapDays.map((day, i) => (
                        <div 
                            key={i} 
                            title={`${day.dateStr}: ${day.count} logs`}
                            className={`w-4 h-4 rounded-sm flex-shrink-0 transition-all cursor-pointer hover:ring-2 hover:ring-indigo-300 ${
                                day.count === 0 ? 'bg-gray-100' :
                                day.count === 1 ? 'bg-indigo-200' :
                                day.count === 2 ? 'bg-indigo-400' :
                                'bg-indigo-600'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 gap-6">
                {/* Modal Form */}
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative">
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
                                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Save className="w-5 h-5 text-indigo-500" />
                                    {editingId ? "Update Entry" : "New Log Entry"}
                                </h2>
                                <button type="button" onClick={handleCancelEdit} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {(filter.classId === 'all' || filter.subjectId === 'all') && (
                                    <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs font-semibold mb-2">
                                        Please select a Class and Subject from the filters above to add a log entry.
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                                    {chapterOptions.length > 0 ? (
                                        <select
                                            value={formData.chapter}
                                            onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                            required
                                        >
                                            <option value="">Select Chapter</option>
                                            {chapterOptions.map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            list="chapter-suggestions"
                                            value={formData.chapter}
                                            onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                            placeholder="e.g. Chapter 1"
                                            required
                                        />
                                    )}
                                    <datalist id="chapter-suggestions">
                                        {suggestions.chapters.map((c, i) => <option key={i} value={c} />)}
                                    </datalist>
                                    {currentSubject && !currentSubject.totalChapters && (
                                        <p className="text-[10px] text-amber-600 mt-1">Total chapters not set in Admin. Use text entry.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Heading</label>
                                    <input
                                        type="text"
                                        list="heading-suggestions"
                                        value={formData.heading}
                                        onChange={e => setFormData({ ...formData, heading: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                        placeholder="e.g. Linear Equations"
                                    />
                                    <datalist id="heading-suggestions">
                                        {suggestions.headings.map((h, i) => <option key={i} value={h} />)}
                                    </datalist>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                    <textarea
                                        value={formData.remarks}
                                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white h-24 resize-none text-sm"
                                        placeholder="Notes on student progress, homework assigned, etc."
                                    />
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                                    <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">Syllabus Completion</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, completionStatus: 'partially' })}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${formData.completionStatus === 'partially' ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-amber-200'}`}
                                        >
                                            Partially Completed
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, completionStatus: 'fully' })}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${formData.completionStatus === 'fully' ? 'bg-green-100 border-green-300 text-green-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-green-200'}`}
                                        >
                                            Fully Completed
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-indigo-600 mt-2 font-medium">
                                        {formData.completionStatus === 'fully' 
                                            ? '✓ This chapter will be marked as DONE in targets.' 
                                            : '⚠ Progress tracked, but target remains pending.'}
                                    </p>
                                </div>

                                {otherClasses.length > 0 && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Share With Other Classes</label>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {otherClasses.map(cls => (
                                                <label key={cls.id} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-300"
                                                        checked={formData.sharedClassIds.includes(cls.id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                sharedClassIds: checked 
                                                                    ? [...prev.sharedClassIds, cls.id]
                                                                    : prev.sharedClassIds.filter(id => id !== cls.id)
                                                            }));
                                                        }}
                                                    />
                                                    <span className="text-xs text-gray-600 group-hover:text-indigo-600 font-medium transition-colors">
                                                        {cls.name} {cls.division}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 font-medium">Selected classes will also receive a copy of this log for the same subject name.</p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {editingId && (
                                        <Button type="button" onClick={handleCancelEdit} variant="secondary" className="w-1/3">
                                            Cancel
                                        </Button>
                                    )}
                                    <Button type="submit" variant="primary" className="flex-1" disabled={assignedClasses.length === 0 || filter.classId === 'all' || filter.subjectId === 'all'}>
                                        {editingId ? "Update Log" : "Add Log Entry"}
                                    </Button>
                                </div>
                            </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content: Syllabus Stats + Log History */}
                <div className="space-y-6">

                    {/* 1. Syllabus Coverage Section */}
                    {displayedStats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayedStats.map((stat, idx) => (
                                <div key={`${stat.classId}-${stat.subjectId}`} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <h4 className="font-semibold text-gray-800 text-sm">{stat.subjectName}</h4>
                                            <p className="text-[10px] text-gray-500">{stat.className}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-indigo-600">{stat.percentage}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5 overflow-hidden flex">
                                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${stat.percentage}%` }}></div>
                                    </div>
                                    <p className="text-[10px] font-medium text-gray-500 text-right">
                                        {stat.uniqueChapters} / {stat.totalChapters} Chapters
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        filter.classId !== 'all' && (
                            <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-3 rounded-xl text-xs text-center">
                                No tracked subjects found for this class. Ensure subjects have 'Total Chapters' set in Admin.
                            </div>
                        )
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                        {/* 2. Log History Section (60% width on large screens) */}
                        <div className="xl:col-span-3 space-y-4">
                            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                    <History className="w-4 h-4 text-gray-400" />
                                    Recent Logs
                                </h3>
                                <div className="text-[10px] text-gray-400">
                                    Showing {displayedLogs.length} entries.
                                </div>
                            </div>

                            <div className="space-y-3">
                                {displayedLogs.length === 0 ? (
                                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                                        <div className="mx-auto w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                            <BookOpen className="w-5 h-5 text-gray-300" />
                                        </div>
                                        <h3 className="text-gray-900 font-medium text-sm">{assignedClasses.length === 0 ? "No Assigned Classes" : "No Logs Found"}</h3>
                                        <p className="text-gray-400 text-xs mt-1">{assignedClasses.length === 0 ? "Ask admin to assign classes." : "Start by adding an entry."}</p>
                                    </div>
                                ) : (
                                    displayedLogs.map(log => (
                                        <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                                        {log.className}
                                                    </span>
                                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                        {log.subjectName}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.completionStatus === 'fully' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {log.completionStatus === 'fully' ? 'Fully Done' : 'Partial'}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 ml-auto sm:ml-2 font-medium">
                                                        {new Date(log.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {log.remarks && (
                                                    <div className="text-xs text-gray-500 italic mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                                                        "{log.remarks}"
                                                    </div>
                                                )}
                                                <div className="absolute top-3 right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white pl-2">
                                                    <button
                                                        onClick={() => handleEdit(log)}
                                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(log.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs font-bold text-gray-900 min-w-[60px]">Chapter:</span>
                                                    <span className="text-xs text-gray-700">{log.chapter}</span>
                                                </div>
                                                {log.heading && (
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xs font-bold text-gray-400 min-w-[60px]">Topic:</span>
                                                        <span className="text-xs text-gray-600">{log.heading}</span>
                                                    </div>
                                                )}
                                                {log.remarks && (
                                                    <div className="mt-2 bg-yellow-50/40 p-2 rounded-lg text-xs text-gray-600 italic border border-yellow-100/40">
                                                        "{log.remarks}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {filteredLogs.length > logLimit && (
                                    <div className="pt-4 flex justify-center">
                                        <Button 
                                            onClick={loadMoreLogs} 
                                            variant="secondary" 
                                            className="w-full py-3 bg-white hover:bg-gray-50 border-gray-200 text-indigo-600 font-bold shadow-sm"
                                        >
                                            Load More Logs
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Syllabus Targets Section (40% width on large screens) */}
                        <div className="xl:col-span-2">
                            {activeSyllabus.length > 0 && (
                                <Card className="overflow-hidden border-indigo-100 sticky top-6 p-4">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-indigo-600" />
                                            Active Syllabus Targets
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200 no-print">
                                            <button 
                                                type="button"
                                                onClick={() => setMonthOffset(prev => prev - 1)}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-[10px] text-indigo-700 px-1 py-0.5 rounded font-black uppercase min-w-[70px] text-center">
                                                {new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset).toLocaleString('default', { month: 'short', year: 'numeric' })}
                                            </span>
                                            <button 
                                                type="button"
                                                onClick={() => setMonthOffset(prev => prev + 1)}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        {activeSyllabus.map(target => (
                                            <div key={target.id} className={`p-4 rounded-xl border ${target.isCompleted ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                                                        {target.subjectName}
                                                    </span>
                                                    {target.isCompleted ? (
                                                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                                            <CheckCircle className="w-3 h-3" /> COMPLETED
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded shadow-sm">
                                                            PENDING
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {target.chapters.map(chNum => {
                                                        const logLower = `chapter ${chNum}`;
                                                        const isChCompleted = logEntries.some(l => 
                                                            l.classId === filter.classId && 
                                                            l.subjectId === target.subjectId && 
                                                            l.completionStatus === 'fully' &&
                                                            (l.chapter.toLowerCase().trim() === chNum.toString() || l.chapter.toLowerCase().trim() === logLower)
                                                        );
                                                        return (
                                                            <span key={chNum} className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold rounded shadow-sm border ${isChCompleted ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-200'}`}>
                                                                Ch {chNum}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile FAB */}
            <button
                type="button"
                onClick={() => { setEditingId(null); setIsFormOpen(true); }}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors z-40"
            >
                <Plus className="w-6 h-6" />
            </button>
        </div>
    );
};

export default LogBook;
