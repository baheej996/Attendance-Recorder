import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { BookOpen, Save, Trash2, History, Filter, Search } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const LogBook = () => {
    const { classes, subjects, logEntries, addLogEntry, deleteLogEntry, currentUser } = useData();
    const { showAlert } = useUI();

    const [formData, setFormData] = useState({
        classId: '',
        subjectId: '',
        chapter: '',
        heading: '',
        remarks: ''
    });

    const [filter, setFilter] = useState({
        classId: 'all',
        subjectId: 'all'
    });

    // Filter classes assigned to this mentor
    const assignedClasses = useMemo(() => {
        // If no currentUser or no assignedClassIds (e.g. admin viewed or data issue), fallback to all or empty?
        // Assuming mentor context primarily. If currentUser is null/undefined, return empty.
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
            // If all classes selected, show subjects from all ASSIGNED classes
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.classId || !formData.subjectId || !formData.chapter) {
            showAlert('Missing Information', 'Please fill in at least Class, Subject and Chapter.', 'error');
            return;
        }

        const selectedClass = classes.find(c => c.id === formData.classId);
        const selectedSubject = subjects.find(s => s.id === formData.subjectId);

        addLogEntry({
            ...formData,
            className: selectedClass ? `${selectedClass.name} ${selectedClass.division}` : 'Unknown',
            subjectName: selectedSubject ? selectedSubject.name : 'Unknown',
            date: new Date().toISOString().split('T')[0],
            mentorId: currentUser?.id
        });

        showAlert('Success', 'Class log updated successfully.', 'success');
        setFormData(prev => ({ ...prev, chapter: '', heading: '', remarks: '' }));
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this log entry?')) {
            deleteLogEntry(id);
            showAlert('Deleted', 'Log entry removed.', 'success');
        }
    };

    // Filtered Logs for Display
    const displayedLogs = useMemo(() => {
        return logEntries.filter(log => {
            // Only show logs for assigned classes
            const isAssignedClass = assignedClasses.some(c => c.id === log.classId);
            if (!isAssignedClass) return false;

            const matchesClass = filter.classId === 'all' || log.classId === filter.classId;
            const matchesSubject = filter.subjectId === 'all' || log.subjectId === filter.subjectId;
            return matchesClass && matchesSubject;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [logEntries, filter, assignedClasses]);

    return (
        <div className="space-y-6 p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                        Class Log Book
                    </h1>
                    <p className="text-gray-500 mt-1">Track daily progress, chapters covered, and remarks for your assigned classes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Entry Form */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <div className="p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                                <Save className="w-5 h-5 text-indigo-500" />
                                New Logger
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
                                            <option key={s.id} value={s.id}>{s.name}</option>
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

                                <Button type="submit" variant="primary" className="w-full" disabled={assignedClasses.length === 0}>
                                    Add Log Entry
                                </Button>
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

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    className="bg-transparent text-sm border-none focus:ring-0 p-0 text-gray-600"
                                    value={filter.classId}
                                    onChange={e => setFilter({ ...filter, classId: e.target.value, subjectId: 'all' })}
                                >
                                    <option value="all">All Classes</option>
                                    {assignedClasses.map(c => <option key={c.id} value={c.id}>{c.name}-{c.division}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                <BookOpen className="w-4 h-4 text-gray-400" />
                                <select
                                    className="bg-transparent text-sm border-none focus:ring-0 p-0 text-gray-600 max-w-[150px]"
                                    value={filter.subjectId}
                                    onChange={e => setFilter({ ...filter, subjectId: e.target.value })}
                                >
                                    <option value="all">All Subjects</option>
                                    {filterSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
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
                                        <button
                                            onClick={() => handleDelete(log.id)}
                                            className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
                                            title="Delete Log"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
