import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Edit, BookOpen, Calendar, Layers, Search, History } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const SyllabusManager = () => {
    const { classes, subjects, syllabi, addSyllabus, updateSyllabus, deleteSyllabus, syncSyllabusStatus } = useData();
    const { showAlert } = useUI();

    const [formData, setFormData] = useState({ gradeName: '', subjectName: '', month: '', chapters: [] });
    const [editingId, setEditingId] = useState(null);
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Filter States
    const [filterGrade, setFilterGrade] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');

    // Pre-calculate grades and grouped subjects
    const uniqueGrades = useMemo(() => {
        return [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [classes]);

    // Available subjects for the selected grade in the form
    const availableSubjects = useMemo(() => {
        if (!formData.gradeName) return [];
        const gradeClassIds = classes.filter(c => c.name === formData.gradeName).map(c => c.id);
        const gradeSubjects = subjects.filter(s => gradeClassIds.includes(s.classId));
        const uniqueTemplates = [...new Map(gradeSubjects.map(s => [s.name.toLowerCase(), s])).values()];
        return uniqueTemplates.sort((a, b) => a.name.localeCompare(b.name));
    }, [formData.gradeName, classes, subjects]);

    // Available subject names for the filter (Dynamic based on selected grade)
    const allSubjectNames = useMemo(() => {
        let filteredSubjects = subjects;
        if (filterGrade !== 'all') {
            const gradeClassIds = classes.filter(c => c.name === filterGrade).map(c => c.id);
            filteredSubjects = subjects.filter(s => gradeClassIds.includes(s.classId));
        }
        const names = [...new Set(filteredSubjects.map(s => s.name))];
        return names.sort((a, b) => a.localeCompare(b));
    }, [subjects, classes, filterGrade]);

    // Calculate max chapters for the selected subject
    const getSubjectMaxChapters = () => {
        if (!formData.subjectName) return 0;
        const subj = availableSubjects.find(s => s.name.toLowerCase() === formData.subjectName.toLowerCase());
        return subj?.totalChapters ? Number(subj.totalChapters) : 0;
    };

    const maxChapters = getSubjectMaxChapters();

    const toggleChapter = (chapterNum) => {
        setFormData(prev => {
            const exists = prev.chapters.includes(chapterNum);
            return {
                ...prev,
                chapters: exists ? prev.chapters.filter(c => c !== chapterNum) : [...prev.chapters, chapterNum].sort((a, b) => a - b)
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.gradeName || !formData.subjectName || !formData.month) {
            showAlert('Validation Error', 'Grade, Subject, and Month are required.', 'error');
            return;
        }

        if (formData.chapters.length === 0) {
            showAlert('Validation Error', 'Please select at least one chapter.', 'error');
            return;
        }

        // Check duplicate syllabus plan (same grade, subject, and month)
        const isDuplicate = syllabi.some(s => 
            s.gradeName === formData.gradeName && 
            s.subjectName.toLowerCase() === formData.subjectName.toLowerCase() &&
            s.month === formData.month &&
            s.id !== editingId
        );

        if (isDuplicate) {
            showAlert('Duplicate Entry', `A syllabus plan for ${formData.month} already exists for this subject. Please edit it instead.`, 'error');
            return;
        }

        try {
            if (editingId) {
                await updateSyllabus(editingId, {
                    gradeName: formData.gradeName,
                    subjectName: formData.subjectName,
                    month: formData.month,
                    chapters: formData.chapters
                });
                showAlert('Success', 'Syllabus updated successfully.', 'success');
            } else {
                await addSyllabus({
                    gradeName: formData.gradeName,
                    subjectName: formData.subjectName,
                    month: formData.month,
                    chapters: formData.chapters
                });
                showAlert('Success', 'Syllabus added successfully.', 'success');
            }
            
            // Reset form but keep Grade/Subject for convenience
            setFormData(prev => ({ ...prev, month: '', chapters: [] }));
            setEditingId(null);
        } catch (error) {
            showAlert('Error', 'Failed to save syllabus.', 'error');
        }
    };

    const handleEdit = (syllabus) => {
        setFormData({
            gradeName: syllabus.gradeName,
            subjectName: syllabus.subjectName,
            month: syllabus.month,
            chapters: syllabus.chapters || []
        });
        setEditingId(syllabus.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = (id) => {
        setDeleteConfig({ isOpen: true, id });
    };

    const handleDelete = async () => {
        if (deleteConfig.id) {
            await deleteSyllabus(deleteConfig.id);
            showAlert('Success', 'Syllabus deleted.', 'success');
        }
        setDeleteConfig({ isOpen: false, id: null });
    };

    const cancelEdit = () => {
        setFormData({ gradeName: '', subjectName: '', month: '', chapters: [] });
        setEditingId(null);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const count = await syncSyllabusStatus();
            showAlert('Sync Complete', `Successfully processed ${count} logs to update syllabus tracking.`, 'success');
        } catch (error) {
            console.error(error);
            showAlert('Sync Failed', 'An error occurred while synchronizing data.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredSyllabi = useMemo(() => {
        return syllabi.filter(s => {
            // Text Search
            const matchesSearch = !searchQuery || 
                s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.gradeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.month.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Dropdown Filters
            const matchesGrade = filterGrade === 'all' || s.gradeName === filterGrade;
            const matchesSubject = filterSubject === 'all' || s.subjectName === filterSubject;
            const matchesMonth = filterMonth === 'all' || s.month === filterMonth;

            return matchesSearch && matchesGrade && matchesSubject && matchesMonth;
        }).sort((a, b) => {
            const gradeComp = a.gradeName.localeCompare(b.gradeName, undefined, { numeric: true });
            if (gradeComp !== 0) return gradeComp;
            const subjComp = a.subjectName.localeCompare(b.subjectName);
            if (subjComp !== 0) return subjComp;
            return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
        });
    }, [syllabi, searchQuery, filterGrade, filterSubject, filterMonth]);

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
            <ConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                title="Delete Syllabus Plan"
                message="Are you sure you want to delete this syllabus plan? This cannot be undone."
                confirmText="Delete"
                isDanger
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/95 backdrop-blur-sm py-4 sticky top-[64px] z-20 border-b border-gray-200">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Syllabus Management</h2>
                    <p className="text-sm text-gray-500">Plan monthly academic coverage per subject</p>
                </div>

                <Button 
                    onClick={handleSync} 
                    disabled={isSyncing} 
                    variant="secondary"
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200 text-indigo-600 font-bold shadow-sm"
                >
                    <History className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync All Progress'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-6">
                    <Card className="sticky top-[160px] p-5 shadow-sm border border-indigo-100 bg-white">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            {editingId ? <Edit className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                            {editingId ? "Edit Syllabus Plan" : "New Syllabus Plan"}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                                <select
                                    value={formData.gradeName}
                                    onChange={e => setFormData({ ...formData, gradeName: e.target.value, subjectName: '', chapters: [] })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                    required
                                >
                                    <option value="" disabled>Select Grade</option>
                                    {uniqueGrades.map(grade => (
                                        <option key={grade} value={grade}>Class {grade}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <select
                                    value={formData.subjectName}
                                    onChange={e => setFormData({ ...formData, subjectName: e.target.value, chapters: [] })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white disabled:bg-gray-100 disabled:text-gray-400"
                                    required
                                    disabled={!formData.gradeName}
                                >
                                    <option value="" disabled>Select Subject</option>
                                    {availableSubjects.map(sub => (
                                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                                    ))}
                                </select>
                                {formData.subjectName && maxChapters === 0 && (
                                    <p className="text-xs text-amber-600 mt-1 font-medium">This subject has 0 total chapters defined in Subjects. You cannot select chapters. Edit the subject first.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Month</label>
                                <select
                                    value={formData.month}
                                    onChange={e => setFormData({ ...formData, month: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 border bg-white"
                                    required
                                >
                                    <option value="" disabled>Select Month</option>
                                    {MONTHS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Chapters to Cover</label>
                                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 min-h-[100px]">
                                    {!formData.subjectName ? (
                                        <p className="text-sm text-gray-500 text-center mt-6">Select a subject first.</p>
                                    ) : maxChapters > 0 ? (
                                        <div className="grid grid-cols-4 gap-2">
                                            {Array.from({ length: maxChapters }, (_, i) => i + 1).map(num => (
                                                <button
                                                    key={num}
                                                    type="button"
                                                    onClick={() => toggleChapter(num)}
                                                    className={`py-1.5 px-1 rounded-md text-sm font-medium border transition-colors ${
                                                        formData.chapters.includes(num)
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                                                    }`}
                                                >
                                                    Ch {num}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center mt-6">No chapters configured.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                {editingId && (
                                    <Button type="button" onClick={cancelEdit} variant="secondary" className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200">
                                        Cancel
                                    </Button>
                                )}
                                <Button type="submit" className="flex-1" disabled={!formData.subjectName || maxChapters === 0}>
                                    {editingId ? "Update Plan" : "Add Plan"}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>

                        <select
                            value={filterGrade}
                            onChange={e => {
                                setFilterGrade(e.target.value);
                                setFilterSubject('all'); // Reset subject when grade changes
                            }}
                            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border bg-white text-sm"
                        >
                            <option value="all">All Grades</option>
                            {uniqueGrades.map(grade => (
                                <option key={grade} value={grade}>Class {grade}</option>
                            ))}
                        </select>

                        <select
                            value={filterSubject}
                            onChange={e => setFilterSubject(e.target.value)}
                            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border bg-white text-sm"
                        >
                            <option value="all">All Subjects</option>
                            {allSubjectNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>

                        <select
                            value={filterMonth}
                            onChange={e => setFilterMonth(e.target.value)}
                            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border bg-white text-sm"
                        >
                            <option value="all">All Months</option>
                            {MONTHS.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {filteredSyllabi.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No syllabus plans found.</p>
                            <p className="text-sm text-gray-400">Use the form to create a new monthly plan.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredSyllabi.map(syllabus => (
                                <div key={syllabus.id} className="bg-white border text-left border-gray-200 rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold font-mono tracking-wide">
                                                <Layers className="w-3 h-3" />
                                                Class {syllabus.gradeName}
                                            </span>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleEdit(syllabus)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => confirmDelete(syllabus.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-lg">{syllabus.subjectName}</h4>
                                        
                                        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                            {syllabus.month}
                                        </div>

                                        <div className="mt-4">
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Target Chapters</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {syllabus.chapters.map(ch => (
                                                    <span key={ch} className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded shadow-sm border border-gray-200/60">
                                                        {ch}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SyllabusManager;
