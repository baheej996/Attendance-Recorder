import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { BookOpen, Save, Trash2, History, Filter, Search, Edit, PieChart as PieChartIcon, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const LogBook = () => {
    const { classes, subjects, logEntries, addLogEntry, updateLogEntry, deleteLogEntry, currentUser } = useData();
    const { showAlert } = useUI();

    const [formData, setFormData] = useState({
        classId: '',
        subjectId: '',
        chapter: '',
        heading: '',
        remarks: ''
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

    // Filter subjects based on selected class in FORM
    const formSubjects = useMemo(() => {
        if (!formData.classId) return [];
        return subjects.filter(s => s.classId === formData.classId);
    }, [subjects, formData.classId]);

    // Filter subjects for the FILTER dropdown
    const filterSubjects = useMemo(() => {
        if (filter.classId === 'all') {
            const assignedClassIds = assignedClasses.map(c => c.id);
            return subjects.filter(s => assignedClassIds.includes(s.classId));
        }
        return subjects.filter(s => s.classId === filter.classId);
    }, [subjects, filter.classId, assignedClasses]);

    // Get suggestions for Chapters and Headings based on history
    const suggestions = useMemo(() => {
        const pertinentLogs = logEntries.filter(l =>
            (!formData.subjectId || l.subjectId === formData.subjectId)
        );
        const chapters = [...new Set(pertinentLogs.map(l => l.chapter))].filter(Boolean);
        const headings = [...new Set(pertinentLogs.map(l => l.heading))].filter(Boolean);
        return { chapters, headings };
    }, [logEntries, formData.subjectId]);

    // --- Syllabus Coverage Calculation ---
    const coverageStats = useMemo(() => {
        // Stats for graphs: grouped by Subject per Class
        // We only care about assigned classes

        const stats = [];

        assignedClasses.forEach(cls => {
            // Get subjects for this class
            const clsSubjects = subjects.filter(s => s.classId === cls.id);

            clsSubjects.forEach(sub => {
                const logsForSub = logEntries.filter(l => l.classId === cls.id && l.subjectId === sub.id);
                const uniqueChapters = new Set(logsForSub.map(l => l.chapter.trim().toLowerCase())).size;
                const totalChapters = sub.totalChapters || 0;

                if (totalChapters > 0) { // Only showing meaningful stats
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
    }, [assignedClasses, subjects, logEntries]);

    // Filter Coverage Stats based on current Filter selection
    const displayedStats = useMemo(() => {
        return coverageStats.filter(stat => {
            const matchesClass = filter.classId === 'all' || stat.classId === filter.classId;
            const matchesSubject = filter.subjectId === 'all' || stat.subjectId === filter.subjectId;
            return matchesClass && matchesSubject;
        });
    }, [coverageStats, filter]);


    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.classId || !formData.subjectId || !formData.chapter) {
            showAlert('Missing Information', 'Please fill in at least Class, Subject and Chapter.', 'error');
            return;
        }

        const selectedClass = classes.find(c => c.id === formData.classId);
        const selectedSubject = subjects.find(s => s.id === formData.subjectId);

        const payload = {
            ...formData,
            className: selectedClass ? `${selectedClass.name} ${selectedClass.division}` : 'Unknown',
            subjectName: selectedSubject ? selectedSubject.name : 'Unknown',
            mentorId: currentUser?.id
        };

        if (editingId) {
            updateLogEntry(editingId, payload);
            showAlert('Success', 'Log entry updated successfully.', 'success');
            setEditingId(null);
        } else {
            addLogEntry({
                ...payload,
                date: new Date().toISOString().split('T')[0]
            });
            showAlert('Success', 'Class log added successfully.', 'success');
        }

        if (editingId) {
            setFormData({ classId: '', subjectId: '', chapter: '', heading: '', remarks: '' });
        } else {
            setFormData(prev => ({ ...prev, chapter: '', heading: '', remarks: '' }));
        }
    };

    const handleEdit = (log) => {
        setEditingId(log.id);
        const logClass = classes.find(c => c.name + " " + c.division === log.className || c.id === log.classId);

        setFormData({
            classId: log.classId,
            subjectId: log.subjectId,
            chapter: log.chapter,
            heading: log.heading || '',
            remarks: log.remarks || ''
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
        setFormData({ classId: '', subjectId: '', chapter: '', heading: '', remarks: '' });
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
        <div className="space-y-6 p-6 max-w-6xl mx-auto">
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

            {/* Syllabus Coverage Dashboard */}
            {displayedStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                    {displayedStats.map((stat, idx) => (
                        <div key={`${stat.classId}-${stat.subjectId}`} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                            <div className="w-16 h-16 shrink-0 relative">
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
                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-4 rounded-xl text-sm text-center">
                        No tracked subjects found for this class. Ensure subjects have 'Total Chapters' set in Admin.
                    </div>
                )
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Entry Form */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <div className="p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                                <Save className="w-5 h-5 text-indigo-500" />
                                {editingId ? "Update Entry" : "New Log Entry"}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                    <select
                                        value={formData.classId}
                                        onChange={e => setFormData({ ...formData, classId: e.target.value, subjectId: '' })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                        required
                                    >
                                        <option value="">Select Class</option>
                                        {assignedClasses.length > 0 ? (
                                            assignedClasses.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                            ))
                                        ) : (
                                            <option disabled>No Assigned Classes</option>
                                        )}
                                    </select>
                                    {assignedClasses.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">You are not assigned to any classes. Contact Admin.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <select
                                        value={formData.subjectId}
                                        onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                        required
                                        disabled={!formData.classId}
                                    >
                                        <option value="">Select Subject</option>
                                        {formSubjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} {s.totalChapters > 0 ? `(${s.totalChapters} Ch)` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                                    <input
                                        type="text"
                                        list="chapter-suggestions"
                                        value={formData.chapter}
                                        onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                        placeholder="e.g. Chapter 1: Algebra"
                                        required
                                    />
                                    <datalist id="chapter-suggestions">
                                        {suggestions.chapters.map((c, i) => <option key={i} value={c} />)}
                                    </datalist>
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
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white h-24 resize-none"
                                        placeholder="Notes on student progress, homework assigned, etc."
                                    />
                                </div>

                                <div className="flex gap-2">
                                    {editingId && (
                                        <Button type="button" onClick={handleCancelEdit} variant="secondary" className="w-1/3">
                                            Cancel
                                        </Button>
                                    )}
                                    <Button type="submit" variant="primary" className="flex-1" disabled={assignedClasses.length === 0}>
                                        {editingId ? "Update Log" : "Add Log Entry"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>

                {/* Log History */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-500" />
                            Recent Logs
                        </h3>
                        {/* Filters removed from here and moved to top */}
                        <div className="text-xs text-gray-400">
                            Showing {displayedLogs.length} entries matches filters.
                        </div>
                    </div>

                    <div className="space-y-4">
                        {displayedLogs.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <BookOpen className="w-6 h-6 text-gray-300" />
                                </div>
                                <h3 className="text-gray-900 font-medium">{assignedClasses.length === 0 ? "No Assigned Classes" : "No Logs Found"}</h3>
                                <p className="text-gray-500 text-sm mt-1">{assignedClasses.length === 0 ? "Ask admin to assign classes to you." : "Start by adding a new entry on the left."}</p>
                            </div>
                        ) : (
                            displayedLogs.map(log => (
                                <div key={log.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                                {log.className}
                                            </span>
                                            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                {log.subjectName}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-auto md:ml-2">
                                                {new Date(log.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                                            <button
                                                onClick={() => handleEdit(log)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Edit Log"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(log.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete Log"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm font-semibold text-gray-900 min-w-[70px]">Chapter:</span>
                                            <span className="text-sm text-gray-800">{log.chapter}</span>
                                        </div>
                                        {log.heading && (
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-semibold text-gray-500 min-w-[70px]">Topic:</span>
                                                <span className="text-sm text-gray-700">{log.heading}</span>
                                            </div>
                                        )}
                                        {log.remarks && (
                                            <div className="mt-3 bg-yellow-50/50 p-3 rounded-lg text-sm text-gray-700 italic border border-yellow-100/50">
                                                "{log.remarks}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogBook;
