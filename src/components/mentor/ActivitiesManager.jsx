import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy, Pencil } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const ActivitiesManager = () => {
    const {
        activities, addActivity, updateActivity, deleteActivity, toggleActivityStatus,
        classes, students, subjects, currentUser,
        activitySubmissions, markActivityAsDone, markActivityAsPending
    } = useData();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [expandedActivityId, setExpandedActivityId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, activityId: null });

    // Form State
    const [newActivity, setNewActivity] = useState({
        title: '',
        description: '',
        classId: '',
        subjectId: '',
        maxPoints: 10,
        dueDate: ''
    });

    const handleCreateOrUpdate = (e) => {
        e.preventDefault();
        if (!newActivity.title || !newActivity.classId) return;

        if (editingActivityId) {
            updateActivity(editingActivityId, newActivity);
        } else {
            addActivity(newActivity);
        }

        closeModal();
    };

    const openCreateModal = () => {
        setEditingActivityId(null);
        setNewActivity({ title: '', description: '', classId: '', subjectId: '', maxPoints: 10, dueDate: '' });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (activity) => {
        setEditingActivityId(activity.id);
        setNewActivity({
            title: activity.title,
            description: activity.description,
            classId: activity.classId,
            subjectId: activity.subjectId || '',
            maxPoints: activity.maxPoints,
            dueDate: activity.dueDate || ''
        });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingActivityId(null);
        setNewActivity({ title: '', description: '', classId: '', subjectId: '', maxPoints: 10, dueDate: '' });
    };

    const confirmDelete = () => {
        if (deleteConfirmation.activityId) {
            deleteActivity(deleteConfirmation.activityId);
            setDeleteConfirmation({ isOpen: false, activityId: null });
        }
    };

    const availableClasses = useMemo(() => (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes, [classes, currentUser]);

    const availableSubjects = useMemo(() => {
        if (!newActivity.classId) return [];

        const selectedClass = classes.find(c => c.id === newActivity.classId);
        if (!selectedClass) return [];

        // 1. Get all classes that share the same Grade Name (e.g., "1", "10")
        const sameGradeClassIds = classes
            .filter(c => c.name === selectedClass.name)
            .map(c => c.id);

        // 2. Find all subjects assigned to ANY of these classes
        const allGradeSubjects = subjects.filter(s => sameGradeClassIds.includes(s.classId));

        // 3. Deduplicate by Subject Name (e.g. if Math exists for 1-A and 1-B, show once)
        const uniqueSubjects = [];
        const seenNames = new Set();

        allGradeSubjects.forEach(s => {
            if (!seenNames.has(s.name)) {
                seenNames.add(s.name);
                uniqueSubjects.push(s);
            }
        });

        return uniqueSubjects.sort((a, b) => a.name.localeCompare(b.name));
    }, [subjects, classes, newActivity.classId]);

    const getClassStudentStats = (activity) => {
        const classStudents = students.filter(s => s.classId === activity.classId);
        const submittedCount = classStudents.filter(s =>
            activitySubmissions.some(sub => sub.activityId === activity.id && sub.studentId === s.id && sub.status === 'Completed')
        ).length;
        return { total: classStudents.length, submitted: submittedCount };
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Activity Manager</h1>
                    <p className="text-gray-500">Assign and track class activities</p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Activity
                </Button>
            </div>

            <div className="grid gap-6">
                {activities.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No Activities Yet</h3>
                        <p className="text-gray-500">Create your first activity to start tracking Student performance.</p>
                    </div>
                ) : (
                    activities.map(activity => {
                        const stats = getClassStudentStats(activity);
                        const assignedClass = classes.find(c => c.id === activity.classId);
                        const assignedSubject = subjects.find(s => s.id === activity.subjectId);
                        const isExpanded = expandedActivityId === activity.id;

                        return (
                            <Card key={activity.id} className="overflow-hidden">
                                <div className="p-6 flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-gray-900">{activity.title}</h3>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${activity.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {activity.status}
                                            </span>
                                            <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                                                {assignedClass ? `${assignedClass.name}-${assignedClass.division}` : 'Unknown Class'}
                                            </span>
                                            {assignedSubject && (
                                                <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                                                    {assignedSubject.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm mb-4">{activity.description}</p>

                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <span>Max Points: <span className="font-semibold text-gray-900">{activity.maxPoints}</span></span>
                                            <span>Due: <span className="font-semibold text-gray-900">{activity.dueDate || 'No Date'}</span></span>
                                            <span>Submissions: <span className="font-semibold text-gray-900">{stats.submitted}/{stats.total}</span></span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openEditModal(activity)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => toggleActivityStatus(activity.id)}
                                        >
                                            {activity.status === 'Active' ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => {
                                                setDeleteConfirmation({ isOpen: true, activityId: activity.id });
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setExpandedActivityId(isExpanded ? null : activity.id)}
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded Grading View */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50 p-6">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <Trophy className="w-4 h-4 text-yellow-500" />
                                            Student Tracker
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {students
                                                .filter(s => s.classId === activity.classId)
                                                .map(student => {
                                                    const submission = activitySubmissions.find(sub => sub.activityId === activity.id && sub.studentId === student.id);
                                                    const isDone = submission?.status === 'Completed';

                                                    return (
                                                        <div key={student.id} className={`p-4 rounded-lg border ${isDone ? 'bg-white border-green-200 shadow-sm' : 'bg-white border-gray-200'} flex items-center justify-between`}>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{student.name}</p>
                                                                <p className="text-xs text-gray-500">{student.registerNo}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    if (isDone) markActivityAsPending(activity.id, student.id);
                                                                    else markActivityAsDone(activity.id, student.id, activity.maxPoints);
                                                                }}
                                                                className={`p-2 rounded-full transition-colors ${isDone
                                                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                                    }`}
                                                            >
                                                                {isDone ? <CheckCircle className="w-5 h-5" /> : <div className="w-5 h-5 border-2 border-current rounded-full" />}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Create Activity Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{editingActivityId ? 'Edit Activity' : 'Create Activity'}</h2>
                            <button onClick={closeModal}><XCircle className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <Input
                                    value={newActivity.title}
                                    onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
                                    placeholder="e.g. Science Project"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    rows="3"
                                    value={newActivity.description}
                                    onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    value={newActivity.classId}
                                    onChange={e => setNewActivity({ ...newActivity, classId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Class</option>
                                    {availableClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Optional)</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    value={newActivity.subjectId}
                                    onChange={e => setNewActivity({ ...newActivity, subjectId: e.target.value })}
                                >
                                    <option value="">Select Subject</option>
                                    {availableSubjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                                    <Input
                                        type="number"
                                        value={newActivity.maxPoints}
                                        onChange={e => setNewActivity({ ...newActivity, maxPoints: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <Input
                                        type="date"
                                        value={newActivity.dueDate}
                                        onChange={e => setNewActivity({ ...newActivity, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                {editingActivityId ? 'Update Activity' : 'Create Activity'}
                            </Button>
                        </form>
                    </Card>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, activityId: null })}
                onConfirm={confirmDelete}
                title="Delete Activity"
                message="Are you sure you want to delete this activity? This action cannot be undone and will remove all student submissions associated with it."
                confirmText="Delete Activity"
                isDanger={true}
            />
        </div>
    );
};

export default ActivitiesManager;
