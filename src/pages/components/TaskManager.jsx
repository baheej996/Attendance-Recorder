import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { 
    ClipboardList, Trophy, Plus, Edit, Trash2, 
    CheckCircle2, XCircle, Clock, Users, ArrowRight,
    Search, Filter, Medal, AlertCircle, Bell
} from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

const TaskManager = () => {
    const { 
        mentorTasks, mentors, addMentorTask, updateMentorTask, 
        deleteMentorTask, toggleMentorTaskStatus, resolveMentorTask 
    } = useData();
    const { showAlert } = useUI();

    const [activeTab, setActiveTab] = useState('tasks');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [resolveData, setResolveData] = useState({ taskId: null, mentorId: null, mentorName: '', approved: true, note: '' });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        assignedTo: ['all'], // ['all'] or array of mentorIds
        mentorCanMarkDone: false
    });

    const [expandedTaskId, setExpandedTaskId] = useState(null);

    // ... (leaderboard calculation remains same, but we should make sure it checks submissions[mentorId].status === 'completed')
    // Actually the leaderboard calculation in previous snippet used submission.completed which resolveMentorTask sets. So it's fine.

    const handleResolve = (taskId, mentorId, mentorName, approved) => {
        setResolveData({ taskId, mentorId, mentorName, approved, note: '' });
        setIsResolveModalOpen(true);
    };

    const submitResolution = async () => {
        setIsUpdating(true);
        try {
            await resolveMentorTask(resolveData.taskId, resolveData.mentorId, resolveData.approved, resolveData.note);
            showAlert('Success', `Task ${resolveData.approved ? 'approved' : 'rejected'}`, 'success');
            setIsResolveModalOpen(false);
        } catch (error) {
            showAlert('Error', 'Failed to update task status', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    // ... handleOpenModal, handleSubmit, handleDelete remain largely same ...

    // Updating the expanded section in Task Overview:
    // (Search for mentorTasks.map for the replacement below)

    // --- Leaderboard Calculation ---
    const leaderboard = useMemo(() => {
        if (!mentors || !mentorTasks) return [];

        const mentorPoints = mentors.map(mentor => {
            let totalPoints = 0;
            let completedCount = 0;
            let earlyWins = 0;

            const relevantTasks = mentorTasks.filter(task => 
                task.assignedTo?.includes('all') || task.assignedTo?.includes(mentor.id)
            );

            relevantTasks.forEach(task => {
                const submission = task.submissions?.[mentor.id];
                if (submission?.completed) {
                    completedCount++;
                    let pts = 100; // Base points

                    // Bonus Logic: +20 if completed 24h before due date
                    if (submission.completedAt && task.dueDate) {
                        const compDate = new Date(submission.completedAt);
                        const dueDate = new Date(task.dueDate);
                        const diffMs = dueDate.getTime() - compDate.getTime();
                        if (diffMs >= 24 * 60 * 60 * 1000) {
                            pts += 20;
                            earlyWins++;
                        }
                    }
                    totalPoints += pts;
                }
            });

            return {
                id: mentor.id,
                name: mentor.name,
                points: totalPoints,
                completed: completedCount,
                assigned: relevantTasks.length,
                earlyWins,
                completionRate: relevantTasks.length > 0 ? (completedCount / relevantTasks.length) * 100 : 0
            };
        });

        return mentorPoints.sort((a, b) => b.points - a.points || b.completionRate - a.completionRate);
    }, [mentors, mentorTasks]);

    // --- Handlers ---
    const handleOpenModal = (task = null) => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description,
                dueDate: task.dueDate || '',
                assignedTo: task.assignedTo || ['all'],
                mentorCanMarkDone: task.mentorCanMarkDone || false
            });
            setEditingId(task.id);
        } else {
            setFormData({
                title: '',
                description: '',
                dueDate: '',
                assignedTo: ['all'],
                mentorCanMarkDone: false
            });
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title) return;

        setIsUpdating(true);
        try {
            if (editingId) {
                await updateMentorTask(editingId, formData);
                showAlert('Success', 'Task updated successfully', 'success');
            } else {
                await addMentorTask(formData);
                showAlert('Success', 'Task created successfully', 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            showAlert('Error', 'Failed to save task', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await deleteMentorTask(id);
            showAlert('Deleted', 'Task removed', 'info');
        } catch (error) {
            showAlert('Error', 'Failed to delete task', 'error');
        }
    };

    const getMentorOptions = useMemo(() => {
        const options = mentors.map(m => ({ id: m.id, label: m.name }));
        return [{ id: 'all', label: 'All Mentors' }, ...options];
    }, [mentors]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        Mentor Task Management
                    </h1>
                    <p className="text-gray-500 mt-1">Assign tasks and track performance across your team.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('tasks')}
                        className={clsx(
                            "px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                            activeTab === 'tasks' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <ClipboardList className="w-4 h-4" /> Tasks
                    </button>
                    <button 
                        onClick={() => setActiveTab('leaderboard')}
                        className={clsx(
                            "px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                            activeTab === 'leaderboard' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Trophy className="w-4 h-4" /> Leaderboard
                    </button>
                </div>
            </div>

            {activeTab === 'tasks' ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Task Overview</h3>
                        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create New Task
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {mentorTasks.length === 0 ? (
                            <Card className="p-12 text-center border-dashed bg-gray-50/50">
                                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">No tasks created yet</h3>
                                <p className="text-gray-500">Click the button above to start assigning tasks to mentors.</p>
                            </Card>
                        ) : (
                            mentorTasks.map(task => {
                                const assignedMentors = task.assignedTo?.includes('all') 
                                    ? mentors 
                                    : mentors.filter(m => task.assignedTo?.includes(m.id));
                                
                                const completedCount = Object.values(task.submissions || {}).filter(s => s.status === 'completed' || s.completed).length;

                                return (
                                    <Card key={task.id} className="group overflow-hidden">
                                        <div className="p-5 flex flex-col md:flex-row gap-4 justify-between">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h4 className="text-lg font-bold text-gray-900">{task.title}</h4>
                                                    
                                                    {Object.values(task.submissions || {}).some(s => s.status === 'under_review') && (
                                                        <span className="flex items-center gap-1 text-[10px] uppercase font-black text-white bg-red-600 px-2 py-1 rounded-full shadow-sm animate-pulse">
                                                            <Bell className="w-3 h-3" /> Needs Review
                                                        </span>
                                                    )}

                                                    {task.dueDate && (
                                                        <span className="flex items-center gap-1 text-[10px] uppercase font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                                            <Clock className="w-3 h-3" /> Due: {task.dueDate}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                                                <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
                                                    <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {task.assignedTo?.includes('all') ? 'All Mentors' : `${task.assignedTo?.length} Assigned`}
                                                    </span>
                                                    <span className={clsx(
                                                        "flex items-center gap-1 px-2.5 py-1 rounded-lg border",
                                                        completedCount === assignedMentors.length && assignedMentors.length > 0
                                                            ? "bg-green-50 text-green-700 border-green-100"
                                                            : "bg-gray-50 text-gray-700 border-gray-100"
                                                    )}>
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {completedCount} / {assignedMentors.length} Completed
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                                    className="font-bold flex items-center gap-1"
                                                >
                                                    {expandedTaskId === task.id ? 'Close List' : 'Track Status'}
                                                    <ArrowRight className={clsx("w-3.5 h-3.5 transition-transform", expandedTaskId === task.id ? "rotate-90" : "")} />
                                                </Button>
                                                <button onClick={() => handleOpenModal(task)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(task.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        {expandedTaskId === task.id && (
                                             <div className="bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2">
                                                 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                     {assignedMentors.map(mentor => {
                                                         const sub = task.submissions?.[mentor.id];
                                                         const isDone = sub?.status === 'completed' || sub?.completed;
                                                         const status = sub?.status ? sub.status : (isDone ? 'completed' : 'pending');
                                                         const isReview = status === 'under_review';
                                                         const isRejected = status === 'rejected';

                                                         return (
                                                             <div 
                                                                 key={mentor.id}
                                                                 className={clsx(
                                                                     "p-3 rounded-xl border bg-white flex flex-col gap-3 transition-all",
                                                                     isDone ? "border-green-200 shadow-sm" : 
                                                                     isReview ? "border-blue-300 ring-2 ring-blue-50 shadow-md" :
                                                                     isRejected ? "border-red-200 opacity-80" :
                                                                     "border-gray-200"
                                                                 )}
                                                             >
                                                                 <div className="flex items-center justify-between">
                                                                     <div className="flex items-center gap-3">
                                                                         <div className={clsx(
                                                                             "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white",
                                                                             isDone ? "bg-green-500" : isReview ? "bg-blue-500" : isRejected ? "bg-red-500" : "bg-gray-300"
                                                                         )}>
                                                                             {mentor.name.charAt(0)}
                                                                         </div>
                                                                         <div>
                                                                            <div className="text-sm font-bold text-gray-900">{mentor.name}</div>
                                                                            <div className="text-[9px] uppercase font-black tracking-tighter opacity-60">
                                                                                {status.replace('_', ' ')}
                                                                            </div>
                                                                         </div>
                                                                     </div>
                                                                     <div onClick={() => toggleMentorTaskStatus(task.id, mentor.id, !isDone)} className="cursor-pointer">
                                                                        {isDone ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-gray-200" />}
                                                                     </div>
                                                                 </div>

                                                                 {isReview && (
                                                                     <div className="flex gap-2 pt-1">
                                                                         <Button 
                                                                            size="sm" 
                                                                            className="flex-1 py-1 text-[10px] bg-green-600 hover:bg-green-700"
                                                                            onClick={() => handleResolve(task.id, mentor.id, mentor.name, true)}
                                                                         >
                                                                             Approve
                                                                         </Button>
                                                                         <Button 
                                                                            variant="secondary" 
                                                                            size="sm" 
                                                                            className="flex-1 py-1 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                                                            onClick={() => handleResolve(task.id, mentor.id, mentor.name, false)}
                                                                         >
                                                                             Reject
                                                                         </Button>
                                                                     </div>
                                                                 )}

                                                                 {(isDone || isRejected) && sub?.completedAt && (
                                                                     <div className="text-[9px] text-gray-400 italic">
                                                                         Done on {sub.completedAt.split('T')[0]}
                                                                     </div>
                                                                 )}
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
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Medal className="w-5 h-5 text-amber-500" /> Professional Leaderboard
                    </h3>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Rank</th>
                                        <th className="px-6 py-4">Mentor</th>
                                        <th className="px-6 py-4 text-center">Tasks</th>
                                        <th className="px-6 py-4 text-center">Early Bonus</th>
                                        <th className="px-6 py-4 text-right">Performance Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leaderboard.map((m, i) => {
                                        const rank = i + 1;
                                        return (
                                            <tr key={m.id} className={clsx("hover:bg-gray-50 transition-colors", rank === 1 && "bg-amber-50/30")}>
                                                <td className="px-6 py-4">
                                                    {rank === 1 ? <span className="text-2xl">🥇</span> : 
                                                     rank === 2 ? <span className="text-2xl">🥈</span> :
                                                     rank === 3 ? <span className="text-lg">🥉</span> :
                                                     <span className="font-bold text-gray-400">#{rank}</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                                            {m.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">{m.name}</div>
                                                            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-indigo-600 transition-all duration-1000" 
                                                                    style={{ width: `${m.completionRate}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-bold text-gray-900">{m.completed}</span>
                                                    <span className="text-xs text-gray-400 ml-1">/ {m.assigned}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {m.earlyWins > 0 ? (
                                                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-black border border-green-100">
                                                            +{m.earlyWins * 20} Bonus
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-xl font-black text-indigo-700">{m.points}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{m.completionRate.toFixed(0)}% Completion</div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Task Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Task" : "Assign New Task"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                        label="Task Title"
                        placeholder="e.g. Update Student Gallery"
                        value={formData.title}
                        onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                        required
                    />
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Task Description</label>
                        <textarea 
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm min-h-[100px]"
                            placeholder="Detailed instructions for mentors..."
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Due Date"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                        />
                         <SearchableSelect 
                            label="Assign To"
                            placeholder="Search mentors..."
                            isMulti={true}
                            options={getMentorOptions}
                            value={formData.assignedTo}
                            onChange={(val) => {
                                // Logic: if 'all' is picked, it dominates. If others are picked, 'all' is removed.
                                let final = Array.isArray(val) ? val : [val];
                                if (final.includes('all') && final.length > 1) {
                                    final = final[final.length - 1] === 'all' ? ['all'] : final.filter(v => v !== 'all');
                                }
                                setFormData(p => ({ ...p, assignedTo: final }));
                            }}
                        />
                    </div>

                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h5 className="text-sm font-bold text-indigo-900">Mentor Permissions</h5>
                                <p className="text-[10px] text-indigo-600 font-medium">Control what mentors can do with this task.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={formData.mentorCanMarkDone}
                                    onChange={(e) => setFormData(p => ({ ...p, mentorCanMarkDone: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-indigo-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Allow mentors to mark this task as "Done"
                        </div>
                    </div>

                    {formData.assignedTo?.length === 0 && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs font-bold">
                            <AlertCircle className="w-4 h-4" />
                            Warning: No mentors selected. Task will not be visible to anyone.
                        </div>
                    )}

                    <div className="flex gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                        <Button type="submit" disabled={isUpdating} className="flex-1 font-bold">
                            {editingId ? "Update Task" : "Create & Assign"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Resolution Modal */}
            <Modal
                isOpen={isResolveModalOpen}
                onClose={() => setIsResolveModalOpen(false)}
                title={resolveData.approved ? "Approve Submission" : "Reject Submission"}
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Mentor</div>
                        <div className="text-sm font-bold text-gray-900">{resolveData.mentorName}</div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Add a Note (Optional)</label>
                        <textarea 
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm min-h-[100px]"
                            placeholder={resolveData.approved ? "Great job! Keep it up." : "Please include the missing details..."}
                            value={resolveData.note}
                            onChange={(e) => setResolveData(p => ({ ...p, note: e.target.value }))}
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsResolveModalOpen(false)} className="flex-1">Cancel</Button>
                        <Button 
                            type="button" 
                            onClick={submitResolution} 
                            disabled={isUpdating}
                            className={clsx(
                                "flex-1 font-bold",
                                resolveData.approved ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                            )}
                        >
                            {isUpdating ? "Processing..." : resolveData.approved ? "Approve & Complete" : "Reject Submission"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TaskManager;
