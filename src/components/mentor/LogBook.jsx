import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { BookOpen, Save, Trash2, History, Filter, Search, Edit, PieChart as PieChartIcon, CheckCircle, Trophy, User } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const LogBook = () => {
    const { classes, subjects, logEntries, addLogEntry, updateLogEntry, deleteLogEntry, currentUser, mentors, syllabi, logLimit, loadMoreLogs, syllabusStatuses } = useData();
    const { showAlert } = useUI();

    const [formData, setFormData] = useState({
        chapter: '',
        heading: '',
        remarks: '',
        sharedClassIds: []
    });

    const [editingId, setEditingId] = useState(null);

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
        if (!currentUser || !currentUser.assignedClassIds) return [];
        return classes.filter(c => currentUser.assignedClassIds.includes(c.id));
    }, [classes, currentUser]);

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

    // --- Syllabus Targets Logic ---
    const activeSyllabus = useMemo(() => {
        if (filter.classId === 'all') return [];
        
        const cls = classes.find(c => c.id === filter.classId);
        if (!cls) return [];

        let targetSubjects = subjects.filter(s => s.classId === cls.id);
        
        if (filter.subjectId !== 'all') {
             targetSubjects = targetSubjects.filter(s => s.id === filter.subjectId);
        }

        const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

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
    }, [filter, classes, subjects, syllabi, syllabusStatuses]);


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
                    const matchingSubject = subjects.find(s => s.classId === targetClassId && s.name === selectedSubject.name);
                    
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

            setFormData({ chapter: '', heading: '', remarks: '', sharedClassIds: [] });
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
            sharedClassIds: []
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        setFormData({ chapter: '', heading: '', remarks: '', sharedClassIds: [] });
    };

    const displayedLogs = useMemo(() => {
        return logEntries.filter(log => {
            const isAssignedClass = assignedClasses.some(c => c.id === log.classId);
            if (!isAssignedClass) return false;

            const matchesClass = filter.classId === 'all' || log.classId === filter.classId;
            const matchesSubject = filter.subjectId === 'all' || log.subjectId === filter.subjectId;
            return matchesClass && matchesSubject;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [logEntries, filter, assignedClasses]);

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
                            <option value="all">All Classes</option>
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

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Entry Form */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <div className="p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                                <Save className="w-5 h-5 text-indigo-500" />
                                {editingId ? "Update Entry" : "New Log Entry"}
                            </h2>

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
                    </Card>
                </div>

                {/* Right Column: Syllabus Stats + Log History */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Syllabus Coverage Section */}
                    {displayedStats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedStats.map((stat, idx) => (
                                <div key={`${stat.classId}-${stat.subjectId}`} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
                                    <div className="w-12 h-12 shrink-0 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Covered', value: stat.uniqueChapters },
                                                        { name: 'Remaining', value: Math.max(0, stat.totalChapters - stat.uniqueChapters) }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={20}
                                                    outerRadius={30}
                                                    fill="#8884d8"
                                                    paddingAngle={0}
                                                    dataKey="value"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    <Cell key="cell-0" fill="#4f46e5" />
                                                    <Cell key="cell-1" fill="#f3f4f6" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                                            {stat.percentage}%
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm">{stat.subjectName}</h4>
                                        <p className="text-xs text-gray-500 mb-1">{stat.className}</p>
                                        <p className="text-xs font-medium text-indigo-600">
                                            {stat.uniqueChapters} / {stat.totalChapters} Chapters
                                        </p>
                                    </div>
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
                                                    <span className="text-[9px] text-gray-400 ml-auto sm:ml-2 font-medium">
                                                        {new Date(log.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
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

                                {logEntries.length >= logLimit && (
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
                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{new Date().toLocaleString('default', { month: 'long' })}</span>
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
        </div>
    );
};

export default LogBook;
