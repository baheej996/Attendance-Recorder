import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    ClipboardList, Clock, CheckCircle2, AlertCircle, 
    Calendar, User, ArrowRight, Trophy, RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';

const MentorTasks = () => {
    const { mentorTasks, currentUser, submitMentorTask } = useData();

    const myTasks = useMemo(() => {
        if (!mentorTasks || !currentUser) return [];
        
        return mentorTasks
            .filter(task => 
                task.assignedTo?.includes('all') || 
                task.assignedTo?.includes(currentUser.id)
            )
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [mentorTasks, currentUser]);

    const stats = useMemo(() => {
        const completed = myTasks.filter(t => t.submissions?.[currentUser.id]?.status === 'completed').length;
        const pending = myTasks.length - completed;
        return { completed, pending, total: myTasks.length };
    }, [myTasks, currentUser?.id]);

    const handleToggleStatus = async (taskId, status) => {
        if (status === 'under_review' || status === 'completed') {
            // No action needed for these states in current request, 
            // but we might want to allow cancellation if under_review.
            return;
        }
        
        try {
            await submitMentorTask(taskId, currentUser.id);
        } catch (error) {
            console.error("Failed to submit task:", error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header omitted for brevity in targetContent search but present in file */}
            {/* ... */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        Professional Tasks
                    </h1>
                    <p className="text-gray-500 mt-1">Review and manage your assigned responsibilities.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="px-4 py-2 bg-green-50 rounded-xl border border-green-100 text-center">
                        <div className="text-sm font-black text-green-700">{stats.completed}</div>
                        <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Completed</div>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 text-center">
                        <div className="text-sm font-black text-amber-700">{stats.pending}</div>
                        <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pending</div>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="grid grid-cols-1 gap-4">
                {myTasks.length === 0 ? (
                    <Card className="p-12 text-center border-dashed bg-gray-50/50">
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No tasks assigned yet</h3>
                        <p className="text-gray-500">When the administration assigns you a task, it will appear here.</p>
                    </Card>
                ) : (
                    myTasks.map(task => {
                        const submission = task.submissions?.[currentUser.id];
                        const status = submission?.status || 'pending';
                        const isDone = status === 'completed';
                        const isReview = status === 'under_review';
                        const isRejected = status === 'rejected';
                        const canToggle = task.mentorCanMarkDone;

                        return (
                            <Card key={task.id} className={clsx(
                                "group border-l-4 transition-all overflow-hidden",
                                isDone ? "border-l-green-500 bg-green-50/10 shadow-sm" : 
                                isReview ? "border-l-blue-500 bg-blue-50/10" :
                                isRejected ? "border-l-red-500 bg-red-50/10" :
                                "border-l-amber-500 hover:shadow-md"
                            )}>
                                <div className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h4 className="text-lg font-bold text-gray-900">{task.title}</h4>
                                            {isDone ? (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-black text-green-600 bg-green-100 px-2 py-1 rounded-full border border-green-200">
                                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                                </span>
                                            ) : isReview ? (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
                                                    <Clock className="w-3 h-3" /> Under Review
                                                </span>
                                            ) : isRejected ? (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-black text-red-600 bg-red-100 px-2 py-1 rounded-full border border-red-200">
                                                    <AlertCircle className="w-3 h-3" /> Changes Required
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                                                    <Clock className="w-3 h-3" /> Action Required
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap max-w-2xl">{task.description}</p>
                                        
                                        <div className="flex flex-wrap gap-4 pt-2">
                                            {task.dueDate && (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                    <Calendar className="w-4 h-4" />
                                                    Due: {task.dueDate}
                                                </div>
                                            )}
                                            {isDone && submission.completedAt && (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Approved on {submission.completedAt.split('T')[0]}
                                                </div>
                                            )}
                                            {submission?.adminNote && (
                                                <div className={clsx(
                                                    "flex items-center gap-1.5 text-xs font-bold p-2 rounded-lg border",
                                                    isRejected ? "bg-red-50 text-red-700 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                                )}>
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    Note: {submission.adminNote}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        {canToggle ? (
                                            <Button 
                                                variant={isReview ? "ghost" : isRejected ? "primary" : isDone ? "secondary" : "primary"}
                                                size="sm"
                                                disabled={isReview || isDone}
                                                onClick={() => handleToggleStatus(task.id, status)}
                                                className="flex items-center justify-center gap-2 font-bold shadow-sm"
                                            >
                                                {isDone ? (
                                                    <><CheckCircle2 className="w-4 h-4" /> Completed</>
                                                ) : isReview ? (
                                                    <><RefreshCw className="w-4 h-4 animate-spin-slow" /> Pending Approval</>
                                                ) : isRejected ? (
                                                    <><RefreshCw className="w-4 h-4" /> Resubmit Task</>
                                                ) : (
                                                    <><CheckCircle2 className="w-4 h-4" /> Mark as Done</>
                                                )}
                                            </Button>
                                        ) : (
                                            !isDone && (
                                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-3 w-full md:w-48">
                                                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                                    <div className="text-[10px] font-bold text-amber-700 leading-tight">
                                                        Complete this task and contact admin to update status.
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Performance Tip */}
            {stats.total > 0 && (
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                            <Trophy className="w-10 h-10 text-amber-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">Boost Your Ranking!</h3>
                            <p className="text-indigo-100 text-sm max-w-xl">
                                Complete your tasks at least **24 hours before the due date** to earn **+20 bonus points** on the professional leaderboard.
                            </p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-12 -translate-y-8">
                        <Sparkles className="w-48 h-48" />
                    </div>
                </div>
            )}
        </div>
    );
};

// Simple Sparkles icon needed for the tip
const Sparkles = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

export default MentorTasks;
