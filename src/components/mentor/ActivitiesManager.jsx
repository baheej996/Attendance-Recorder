import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { db } from '../../firebase';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy, Pencil, Search, Filter, Settings, Copy, Download, FileText, Calendar, Edit3, RotateCcw, Save, Maximize2 } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

// Racing Competition Leaderboard Helpers
const ChequeredFlag = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 4H19V14H4V4Z" fill="#1E293B" />
        <rect x="4" y="4" width="3.75" height="2.5" fill="#FFFFFF" />
        <rect x="11.5" y="4" width="3.75" height="2.5" fill="#FFFFFF" />
        <rect x="7.75" y="6.5" width="3.75" height="2.5" fill="#FFFFFF" />
        <rect x="15.25" y="6.5" width="3.75" height="2.5" fill="#FFFFFF" />
        <rect x="4" y="9" width="3.75" height="2.5" fill="#FFFFFF" />
        <rect x="11.5" y="9" width="3.75" height="2.5" fill="#FFFFFF" />
        <rect x="7.75" y="11.5" width="3.75" height="2.5" fill="#FFFFFF" />
        <rect x="15.25" y="11.5" width="3.75" height="2.5" fill="#FFFFFF" />
    </svg>
);

const RaceCarIcon = ({ color = "#F59E0B", className = "w-8 h-5" }) => (
    <svg className={className} viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="21" width="12" height="6" rx="2.5" fill="#0F172A" />
        <rect x="44" y="21" width="12" height="6" rx="2.5" fill="#0F172A" />
        <circle cx="14" cy="24" r="2" fill="#94A3B8" />
        <circle cx="50" cy="24" r="2" fill="#94A3B8" />
        <path d="M4 21C4 18.5 6 17 9 17L16 16C19 12 24 9 32 9L44 9C49 9 55 12 58 16L60 18C62 19 63 20 63 21.5C63 23 61.5 24 59 24H7C5 24 4 22.5 4 21Z" fill={color} />
        <path d="M22 15L27 10.5C28.5 9.5 31 9.5 34 9.5H43C46.5 9.5 49 11.5 50.5 15H22Z" fill="#020617" opacity="0.8" />
        <path d="M28 11.5L31 10.5H41L46 14.5H25L28 11.5Z" fill="#E2E8F0" opacity="0.45" />
        <path d="M59 19.5C61 19.5 63 19.5 64 20.5C63 21.5 61 21.5 59 21.5Z" fill="#FEF08A" />
        <rect x="4" y="19" width="2.5" height="3" rx="1" fill="#EF4444" />
    </svg>
);

const getRankTheme = (rank) => {
    switch (rank) {
        case 1:
            return {
                badgeBg: 'bg-amber-400 text-amber-950 shadow-md shadow-amber-200 border-amber-300 font-extrabold',
                carColor: '#F59E0B',
                barGradient: 'from-amber-400 via-amber-300 to-yellow-300',
                percentBadge: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-2xs',
                rowBg: 'bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white border-amber-200/90 shadow-xs hover:shadow-md'
            };
        case 2:
            return {
                badgeBg: 'bg-blue-100 text-blue-700 border-blue-200 font-bold',
                carColor: '#2563EB',
                barGradient: 'from-blue-500 via-blue-400 to-cyan-400',
                percentBadge: 'bg-blue-100 text-blue-900 border-blue-200 font-extrabold shadow-2xs',
                rowBg: 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
            };
        case 3:
            return {
                badgeBg: 'bg-orange-100 text-orange-700 border-orange-200 font-bold',
                carColor: '#F97316',
                barGradient: 'from-orange-500 via-orange-400 to-amber-400',
                percentBadge: 'bg-orange-100 text-orange-900 border-orange-200 font-extrabold shadow-2xs',
                rowBg: 'bg-white border-slate-200/80 hover:border-orange-300 hover:shadow-xs'
            };
        case 4:
            return {
                badgeBg: 'bg-purple-100 text-purple-700 border-purple-200 font-bold',
                carColor: '#A855F7',
                barGradient: 'from-purple-500 via-purple-400 to-indigo-400',
                percentBadge: 'bg-purple-100 text-purple-900 border-purple-200 font-extrabold shadow-2xs',
                rowBg: 'bg-white border-slate-200/80 hover:border-purple-300 hover:shadow-xs'
            };
        case 5:
            return {
                badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200 font-bold',
                carColor: '#10B981',
                barGradient: 'from-emerald-500 via-emerald-400 to-teal-400',
                percentBadge: 'bg-emerald-100 text-emerald-900 border-emerald-200 font-extrabold shadow-2xs',
                rowBg: 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs'
            };
        case 6:
            return {
                badgeBg: 'bg-pink-100 text-pink-700 border-pink-200 font-bold',
                carColor: '#EC4899',
                barGradient: 'from-pink-500 via-pink-400 to-rose-400',
                percentBadge: 'bg-pink-100 text-pink-900 border-pink-200 font-extrabold shadow-2xs',
                rowBg: 'bg-white border-slate-200/80 hover:border-pink-300 hover:shadow-xs'
            };
        default:
            return {
                badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
                carColor: '#64748B',
                barGradient: 'from-slate-400 via-slate-300 to-gray-300',
                percentBadge: 'bg-slate-100 text-slate-800 border-slate-200 font-extrabold shadow-2xs',
                rowBg: 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
            };
    }
};

const ActivitiesManager = () => {
    const {
        activities, addActivity, updateActivity, deleteActivity, toggleActivityStatus,
        classes, students, allStudents, subjects, currentUser, mentors,
        activitySubmissions, markActivityAsDone, markActivityAsPending, requireFeature,
        getStudentActivityPoints, updateStudent
    } = useData();

    // Inline editor state for manual points override: keyed by studentId
    const [editingPointsFor, setEditingPointsFor] = useState(null);
    const [pointsDraft, setPointsDraft] = useState('');
    const [savingPointsFor, setSavingPointsFor] = useState(null);

    const handleToggleMark = (activity, student, isDone) => {
        // Fire-and-forget: writes are idempotent thanks to the deterministic doc ID
        // in markActivityAsDone. Firestore's onSnapshot subscription will flip the UI.
        if (isDone) {
            markActivityAsPending(activity.id, student.id);
        } else {
            markActivityAsDone(activity.id, student.id, activity.maxPoints, activity.classId);
        }
    };

    const beginEditPoints = (student) => {
        const current = getStudentActivityPoints(student.id, student.classId);
        setEditingPointsFor(student.id);
        setPointsDraft(String(current ?? 0));
    };

    const cancelEditPoints = () => {
        setEditingPointsFor(null);
        setPointsDraft('');
    };

    const saveEditPoints = async (student) => {
        const raw = pointsDraft.trim();
        const n = raw === '' ? null : Number(raw);
        if (raw !== '' && Number.isNaN(n)) {
            alert('Please enter a valid number.');
            return;
        }
        setSavingPointsFor(student.id);
        try {
            await updateStudent(student.id, { manualActivityPoints: raw === '' ? null : n });
            setEditingPointsFor(null);
            setPointsDraft('');
        } catch (e) {
            alert('Failed to save points: ' + (e?.message || e));
        } finally {
            setSavingPointsFor(null);
        }
    };

    const resetEditPoints = async (student) => {
        setSavingPointsFor(student.id);
        try {
            await updateStudent(student.id, { manualActivityPoints: null });
            setEditingPointsFor(null);
            setPointsDraft('');
        } catch (e) {
            alert('Failed to reset points: ' + (e?.message || e));
        } finally {
            setSavingPointsFor(null);
        }
    };

    // UI States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [expandedActivityId, setExpandedActivityId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, activityId: null, isBulk: false });
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [isBatchShare, setIsBatchShare] = useState(false);
    const [isAllottedShare, setIsAllottedShare] = useState(false);
    const [selectedShareClassIds, setSelectedShareClassIds] = useState([]); // Added missing state
    const [isBatchDelete, setIsBatchDelete] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
    const [expandedReportType, setExpandedReportType] = useState(null);
    const [pendingReportConfig, setPendingReportConfig] = useState(null);
    const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
    const [leaderboardClassId, setLeaderboardClassId] = useState('');
    const [showMentorLeaderboard, setShowMentorLeaderboard] = useState(false);
    const [selectedLeaderboardMonth, setSelectedLeaderboardMonth] = useState(() => format(new Date(), 'yyyy-MM'));
    const [isExpandedLeaderboardOpen, setIsExpandedLeaderboardOpen] = useState(false);
    const [animateRace, setAnimateRace] = useState(false);
    const [globalActivities, setGlobalActivities] = useState([]);
    const [globalSubmissions, setGlobalSubmissions] = useState([]);
    const [globalStudents, setGlobalStudents] = useState([]);
    const reportDropdownRef = useRef(null);

    // Trigger car racing animation when Leaderboard Modal opens
    useEffect(() => {
        if (isExpandedLeaderboardOpen) {
            setAnimateRace(false);
            const timer = setTimeout(() => {
                setAnimateRace(true);
            }, 120);
            return () => clearTimeout(timer);
        } else {
            setAnimateRace(false);
        }
    }, [isExpandedLeaderboardOpen, selectedLeaderboardMonth]);

    // Fetch global activities, submissions & students across all classes when Leaderboard is active
    useEffect(() => {
        if (!showMentorLeaderboard && !isExpandedLeaderboardOpen) return;

        let isMounted = true;
        const fetchGlobalData = async () => {
            try {
                const [actSnap, subSnap, stuSnap] = await Promise.all([
                    getDocs(collection(db, 'activities')),
                    getDocs(query(collection(db, 'activitySubmissions'), where('status', '==', 'Completed'))),
                    getDocs(query(collection(db, 'students'), where('status', '==', 'Active')))
                ]);
                if (isMounted) {
                    setGlobalActivities(actSnap.docs.map(d => ({ ...d.data(), id: d.id })));
                    setGlobalSubmissions(subSnap.docs.map(d => ({ ...d.data(), id: d.id })));
                    setGlobalStudents(stuSnap.docs.map(d => ({ ...d.data(), id: d.id })));
                }
            } catch (err) {
                console.error('Error fetching global leaderboard data:', err);
            }
        };

        fetchGlobalData();

        return () => {
            isMounted = false;
        };
    }, [showMentorLeaderboard, isExpandedLeaderboardOpen, selectedLeaderboardMonth]);

    // Close Report Dropdown on outside click
    useEffect(() => {
        const cleanup = requireFeature('activities');
        
        const handleClickOutside = (event) => {
            if (reportDropdownRef.current && !reportDropdownRef.current.contains(event.target)) {
                setIsReportDropdownOpen(false);
            }
        };

        if (isReportDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            cleanup();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isReportDropdownOpen, requireFeature]);

    // Filter/Search States
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedActivityIds, setSelectedActivityIds] = useState([]);
    const [sortOrder, setSortOrder] = useState('newest');

    // Form State
    const [newActivity, setNewActivity] = useState({
        title: '',
        description: '',
        classId: '',
        subjectId: '',
        maxPoints: 10,
        dueDate: '',
        studentCanMarkDone: false // New field
    });

    const availableClasses = useMemo(() => (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes, [classes, currentUser]);

    // Initialize leaderboard class
    useEffect(() => {
        if (isLeaderboardModalOpen) {
            if (selectedClassId !== 'all') {
                setLeaderboardClassId(selectedClassId);
            } else if (availableClasses.length > 0 && !leaderboardClassId) {
                setLeaderboardClassId(availableClasses[0].id);
            }
        }
    }, [isLeaderboardModalOpen, selectedClassId, availableClasses, leaderboardClassId]);

    const handleCreateOrUpdate = (e) => {
        e.preventDefault();
        if (!newActivity.title || (!newActivity.classId && !isAllottedShare)) return;

        // Duplicate Check (for primary class)
        const cleanTitle = newActivity.title.trim().toLowerCase();
        const primaryClassId = newActivity.classId;

        // If batch share, we use the logic for batch
        if (editingActivityId) {
            updateActivity(editingActivityId, newActivity);
            if (isBatchShare) {
                const selectedClass = classes.find(c => c.id === primaryClassId);
                if (selectedClass) {
                    const batchClasses = classes.filter(c => c.name === selectedClass.name && c.id !== primaryClassId);
                    batchClasses.forEach(batchClass => {
                        addActivity({ ...newActivity, classId: batchClass.id });
                    });
                }
            } else if (isAllottedShare) {
                selectedShareClassIds.forEach(cid => {
                    if (cid !== primaryClassId) {
                        addActivity({ ...newActivity, classId: cid });
                    }
                });
            }
        } else {
            if (isBatchShare) {
                const selectedClass = classes.find(c => c.id === primaryClassId);
                if (selectedClass) {
                    const batchClasses = classes.filter(c => c.name === selectedClass.name);
                    batchClasses.forEach(batchClass => {
                        addActivity({ ...newActivity, classId: batchClass.id });
                    });
                }
            } else if (isAllottedShare) {
                // Share with ONLY the individually selected allotted classes
                if (selectedShareClassIds.length === 0) {
                    addActivity(newActivity);
                } else {
                    selectedShareClassIds.forEach(cid => {
                        addActivity({ ...newActivity, classId: cid });
                    });
                }
            } else {
                addActivity(newActivity);
            }
        }

        closeModal();
    };

    const openCreateModal = () => {
        setEditingActivityId(null);
        setIsBatchShare(false);
        setIsAllottedShare(false); // Reset
        setSelectedShareClassIds([]); 
        let defaultStudentMarkDone = false;

        // If a class is already selected, use its default config
        if (selectedClassId !== 'all') {
            const classConfig = classFeatureFlags?.find(f => f.classId === selectedClassId);
            defaultStudentMarkDone = classConfig?.studentCanMarkActivities || false;
        }

        setNewActivity({
            title: '',
            description: '',
            classId: selectedClassId !== 'all' ? selectedClassId : '',
            subjectId: '',
            maxPoints: 10,
            dueDate: '',
            studentCanMarkDone: defaultStudentMarkDone
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (activity) => {
        setEditingActivityId(activity.id);
        setIsBatchShare(false); // N/A for edit usually, or disabled
        setNewActivity({
            title: activity.title,
            description: activity.description,
            classId: activity.classId,
            subjectId: activity.subjectId || '',
            maxPoints: activity.maxPoints,
            dueDate: activity.dueDate || '',
            studentCanMarkDone: activity.studentCanMarkDone || false
        });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingActivityId(null);
        setIsBatchShare(false);
        setNewActivity({ title: '', description: '', classId: '', subjectId: '', maxPoints: 10, dueDate: '', studentCanMarkDone: false });
    };

    const confirmDelete = () => {
        if (deleteConfirmation.isBulk) {
            selectedActivityIds.forEach(id => deleteActivity(id));
            setSelectedActivityIds([]);
        } else if (deleteConfirmation.activityId) {
            if (isBatchDelete) {
                // Batch Delete Logic
                const activityToDelete = activities.find(a => a.id === deleteConfirmation.activityId);
                if (activityToDelete) {
                    const activityClass = classes.find(c => c.id === activityToDelete.classId);
                    if (activityClass) {
                        // Find all classes in the same batch (Grade)
                        const batchClassIds = classes
                            .filter(c => c.name === activityClass.name)
                            .map(c => c.id);

                        // Find all activities in these classes with same Title and Subject
                        const batchActivities = activities.filter(a =>
                            batchClassIds.includes(a.classId) &&
                            a.title === activityToDelete.title &&
                            a.subjectId === activityToDelete.subjectId
                        );

                        batchActivities.forEach(a => deleteActivity(a.id));
                    } else {
                        // Fallback
                        deleteActivity(deleteConfirmation.activityId);
                    }
                }
            } else {
                deleteActivity(deleteConfirmation.activityId);
            }
        }
        setDeleteConfirmation({ isOpen: false, activityId: null, isBulk: false });
        setIsBatchDelete(false); // Reset
    };



    const { classFeatureFlags, updateClassFeatureFlags } = useData();

    const handleClassSettingToggle = async (classId, currentSetting) => {
        const newSetting = !currentSetting;
        // Update feature flag
        await updateClassFeatureFlags(classId, { studentCanMarkActivities: newSetting });

        // Bulk update existing activities for this class
        const classActivities = activities.filter(a => a.classId === classId);
        for (const act of classActivities) {
            await updateActivity(act.id, { studentCanMarkDone: newSetting });
        }
    };

    const handleCopyActivityReport = async (activity) => {
        const assignedClass = classes.find(c => c.id === activity.classId);
        if (!assignedClass) return;

        const classStudents = students.filter(s => s.classId === activity.classId && s.status === 'Active');

        // Sort boys first, then girls, then alphabetically
        const sortedStudents = [...classStudents].sort((a, b) => {
            if (a.gender === 'Boy' && b.gender !== 'Boy') return -1;
            if (a.gender !== 'Boy' && b.gender === 'Boy') return 1;
            return a.name.localeCompare(b.name);
        });

        const completed = [];
        const pending = [];

        sortedStudents.forEach(student => {
            const submission = activitySubmissions.find(sub => sub.activityId === activity.id && sub.studentId === student.id);
            if (submission?.status === 'Completed') {
                completed.push(student.name);
            } else {
                pending.push(student.name);
            }
        });

        const reportText = `*Activity:* ${activity.title}\n*Class:* ${assignedClass.name} - ${assignedClass.division}\n\n*Completed ✅*\n${completed.length > 0 ? completed.map(n => `• ${n}`).join('\n') : 'None'}\n\n*Pending ⏳*\n${pending.length > 0 ? pending.map(n => `• ${n}`).join('\n') : 'None'}`;

        try {
            await navigator.clipboard.writeText(reportText);
            alert('Activity Report copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy report:', err);
            alert('Failed to copy report to clipboard.');
        }
    };

    const handleReportIconClick = (timeframe, format) => {
        setPendingReportConfig({ timeframe, format });
        setIsReportDropdownOpen(false); // optionally close the dropdown
    };

    const confirmGenerateReport = (detailLevel) => {
        if (!pendingReportConfig) return;
        generateCommonActivityReport(pendingReportConfig.timeframe, pendingReportConfig.format, detailLevel);
        setPendingReportConfig(null);
    };

    const generateCommonActivityReport = async (timeframe, reportFormat, detailLevel = 'detailed') => {
        let targetClasses = [];

        if (selectedClassId === 'all') {
            if (!availableClasses || availableClasses.length === 0) {
                alert("You have no assigned classes to generate reports for.");
                return;
            }
            targetClasses = availableClasses;
        } else {
            const assignedClass = classes.find(c => c.id === selectedClassId);
            if (!assignedClass) return;
            targetClasses = [assignedClass];
        }

        const now = new Date();
        let startDate, endDate, periodName;

        switch (timeframe) {
            case 'daily':
                startDate = startOfDay(now);
                endDate = endOfDay(now);
                periodName = `Daily Report (${format(now, 'MMM dd, yyyy')})`;
                break;
            case 'weekly':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
                periodName = `Weekly Report (${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')})`;
                break;
            case 'monthly':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                periodName = `Monthly Report (${format(now, 'MMMM yyyy')})`;
                break;
            case 'annually':
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                periodName = `Annual Report (${format(now, 'yyyy')})`;
                break;
            default:
                return;
        }

        const reportDataByClass = [];

        for (const targetClass of targetClasses) {
            // 1. Filter Activities in this timeframe for this class (excluding inactive)
            const classActivities = activities.filter(a => a.classId === targetClass.id && a.status !== 'Inactive');

            const periodActivities = classActivities.filter(a => {
                const activityDate = a.dueDate ? new Date(a.dueDate) : new Date(a.createdAt || now);
                try {
                    return isWithinInterval(activityDate, { start: startDate, end: endDate });
                } catch (e) {
                    return false;
                }
            });

            if (periodActivities.length === 0) continue; // Skip classes with no activities in this timeframe

            // 2. Fetch students and prepare stats
            const classStudents = students.filter(s => s.classId === targetClass.id && s.status === 'Active');
            const sortedStudents = [...classStudents].sort((a, b) => {
                if (a.gender === 'Boy' && b.gender !== 'Boy') return -1;
                if (a.gender !== 'Boy' && b.gender === 'Boy') return 1;
                return a.name.localeCompare(b.name);
            });

            const studentStats = sortedStudents.map(student => {
                let completedCount = 0;
                const completedActivities = [];
                const pendingActivities = [];

                periodActivities.forEach(activity => {
                    const isCompleted = activitySubmissions.some(
                        sub => sub.activityId === activity.id && sub.studentId === student.id && sub.status === 'Completed'
                    );
                    if (isCompleted) {
                        completedCount++;
                        completedActivities.push(activity.title);
                    } else {
                        pendingActivities.push(activity.title);
                    }
                });
                return {
                    ...student,
                    completedCount,
                    totalActivities: periodActivities.length,
                    completedActivities,
                    pendingActivities
                };
            });

            // Calculate overall class completion percentage
            const totalPossibleActivities = studentStats.length * periodActivities.length;
            const totalCompletedActivities = studentStats.reduce((sum, stat) => sum + stat.completedCount, 0);
            const classCompletionPercentage = totalPossibleActivities > 0
                ? Math.round((totalCompletedActivities / totalPossibleActivities) * 100)
                : 0;

            reportDataByClass.push({
                cls: targetClass,
                activitiesCount: periodActivities.length,
                studentStats,
                classCompletionPercentage // Inject the new metric
            });
        }

        if (reportDataByClass.length === 0) {
            alert(`No activities found in the selected timeframe (${timeframe}).`);
            return;
        }

        if (reportFormat === 'copy') {
            const classBlocks = reportDataByClass.map(data => {
                const totalPendingCount = data.studentStats.reduce((sum, stat) => sum + (stat.totalActivities - stat.completedCount), 0);
                const totalCompletedCount = data.studentStats.reduce((sum, stat) => sum + stat.completedCount, 0);
                const classTotalPossible = data.activitiesCount * data.studentStats.length;
                const percentPending = classTotalPossible > 0 ? Math.round((totalPendingCount / classTotalPossible) * 100) : 0;

                if (detailLevel === 'short') {
                    return `*Class:* ${data.cls.name} - ${data.cls.division}\n*Total Students:* ${data.studentStats.length}\n*Total Activities:* ${data.activitiesCount}\n*Completed:* ${data.classCompletionPercentage}%\n*Pending:* ${percentPending}%`;
                }

                const fullyCompletedList = [];
                const partiallyCompletedList = [];
                const notStartedList = [];

                data.studentStats.forEach(stat => {
                    const isFullyCompleted = stat.completedCount === stat.totalActivities;
                    const isNotStarted = stat.completedCount === 0;

                    let entry = `• ${stat.name}`;
                    if (isFullyCompleted) {
                        entry += `\n  Completed: ${stat.completedActivities.join(', ')}`;
                        fullyCompletedList.push(entry);
                    } else if (isNotStarted) {
                        entry += `\n  Pending: ${stat.pendingActivities.join(', ')}`;
                        notStartedList.push(entry);
                    } else {
                        entry += `\n  Completed: ${stat.completedActivities.join(', ')}\n  Pending: ${stat.pendingActivities.join(', ')}`;
                        partiallyCompletedList.push(entry);
                    }
                });

                const fullyCompletedText = fullyCompletedList.length > 0 ? fullyCompletedList.join('\n\n') : 'None';
                const partiallyCompletedText = partiallyCompletedList.length > 0 ? partiallyCompletedList.join('\n\n') : 'None';
                const notStartedText = notStartedList.length > 0 ? notStartedList.join('\n\n') : 'None';

                return `*Class:* ${data.cls.name} - ${data.cls.division}\n*Overall Class Completion:* ${data.classCompletionPercentage}%\n*Total Activities:* ${data.activitiesCount}\n\n*Fully Completed ✅*\n${fullyCompletedText}\n\n*Partially Completed ⚠️*\n${partiallyCompletedText}\n\n*Not Started ⏳*\n${notStartedText}`;
            });

            const titleHeader = `*Report: ${periodName}*\n`;
            const reportText = titleHeader + classBlocks.join('\n\n====================\n\n');

            try {
                await navigator.clipboard.writeText(reportText);
                alert(`${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Report copied to clipboard!`);
            } catch (err) {
                alert('Failed to copy report.');
            }
        } else if (reportFormat === 'pdf') {
            const doc = new jsPDF();

            if (detailLevel === 'short') {
                // Short Report: Print all classes on a continuous set of pages
                doc.setFontSize(16);
                doc.text('Activity Report (Short Overview)', 14, 15);
                doc.setFontSize(11);
                doc.text(`Period: ${periodName}`, 14, 22);

                let currentY = 35;
                const pageHeight = doc.internal.pageSize.getHeight();

                reportDataByClass.forEach((data, index) => {
                    // Check if we need a new page for this block (approx 30 units tall)
                    if (currentY + 30 > pageHeight - 15) {
                        doc.addPage();
                        currentY = 20;
                    }

                    // Class Header
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(12);
                    doc.text(`${data.cls.name} - ${data.cls.division}`, 14, currentY);

                    // Completion Metric aligned right
                    doc.text(`Class Completion: ${data.classCompletionPercentage}%`, 130, currentY);

                    // Details
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(10);
                    currentY += 6;

                    const classTotalPossible = data.activitiesCount * data.studentStats.length;
                    const totalPendingCount = data.studentStats.reduce((sum, stat) => sum + (stat.totalActivities - stat.completedCount), 0);
                    const percentPending = classTotalPossible > 0 ? Math.round((totalPendingCount / classTotalPossible) * 100) : 0;

                    doc.text(`Total Students: ${data.studentStats.length}  |  Total Activities: ${data.activitiesCount}`, 14, currentY);
                    doc.text(`Pending: ${percentPending}%`, 130, currentY);

                    // Add spacing for next class
                    currentY += 15;

                    // Add a separator line if not the last item
                    if (index < reportDataByClass.length - 1) {
                        doc.setDrawColor(200, 200, 200);
                        doc.line(14, currentY - 7, 196, currentY - 7);
                    }
                });
            } else {
                // Detailed Report: One page (or more) per class
                reportDataByClass.forEach((data, index) => {
                    if (index > 0) {
                        doc.addPage();
                    }

                    // PDF Header
                    doc.setFontSize(16);
                    doc.text(`Activity Report (Detailed)`, 14, 15);
                    doc.setFontSize(11);
                    doc.text(`Class: ${data.cls.name} - ${data.cls.division}`, 14, 22);
                    doc.text(`Period: ${periodName}`, 14, 28);
                    doc.text(`Total Activities: ${data.activitiesCount}`, 14, 34);

                    // Class Completion Metric
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(12);
                    doc.text(`Overall Class Completion: ${data.classCompletionPercentage}%`, 130, 22);
                    doc.setFont(undefined, 'normal');

                    const tableData = data.studentStats.map(stat => {
                        const completedText = stat.completedCount > 0
                            ? `${stat.completedCount}\n(${stat.completedActivities.join(', ')})`
                            : '0';

                        const pendingText = stat.pendingActivities.length > 0
                            ? `${stat.totalActivities - stat.completedCount}\n(${stat.pendingActivities.join(', ')})`
                            : '0';

                        return [
                            stat.name,
                            completedText,
                            pendingText,
                            `${Math.round((stat.completedCount / stat.totalActivities) * 100)}%`
                        ];
                    });

                    autoTable(doc, {
                        startY: 40,
                        head: [['Student Name', 'Completed', 'Pending', 'Completion %']],
                        body: tableData,
                        theme: 'grid',
                        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
                        styles: { fontSize: 9, cellPadding: 3 },
                        columnStyles: {
                            0: { cellWidth: 40 }, // Name
                            1: { cellWidth: 60 }, // Completed
                            2: { cellWidth: 60 }, // Pending
                            3: { cellWidth: 20 }  // %
                        }
                    });
                });
            }

            const fileNameScope = selectedClassId === 'all' ? 'All_Classes' : `${reportDataByClass[0].cls.name}`;
            doc.save(`Activity_Report_${fileNameScope}_${timeframe}.pdf`);
        }

        setIsReportDropdownOpen(false); // Close dropdown after action
    };

    // Initialize selected class to first available if 'all' isn't valid context or just preference
    // For now 'all' is fine, or we can default to [0].

    // Filtered Activities
    const filteredActivities = useMemo(() => {
        let result = activities;

        // 1. Class Filter
        if (selectedClassId !== 'all') {
            result = result.filter(a => a.classId === selectedClassId);
        } else if (currentUser?.role === 'mentor') {
            // If viewing 'All', still limit to mentor's classes
            result = result.filter(a => availableClasses.some(c => c.id === a.classId));
        }

        // 2. Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(query) ||
                a.description.toLowerCase().includes(query)
            );
        }

        // 3. Sort
        result = [...result].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [activities, selectedClassId, searchQuery, availableClasses, currentUser, sortOrder]);

    const leaderboardData = useMemo(() => {
        if (!isLeaderboardModalOpen || !leaderboardClassId) return [];
        
        const targetStudents = students.filter(s => s.classId === leaderboardClassId && s.status === 'Active');

        const data = targetStudents.map(student => {
            const points = getStudentActivityPoints(student.id, student.classId);
            const completedCount = activitySubmissions.filter(sub => sub.studentId === student.id && sub.status === 'Completed').length;
            
            return {
                ...student,
                points,
                completedCount
            };
        }).sort((a, b) => b.points - a.points || b.completedCount - a.completedCount);

        let rank = 1;
        return data.map((s, i) => {
            if (i > 0 && (s.points < data[i-1].points || (s.points === data[i-1].points && s.completedCount < data[i-1].completedCount))) {
                rank = i + 1;
            }
            return { ...s, rank };
        });
    }, [isLeaderboardModalOpen, leaderboardClassId, students, activitySubmissions, getStudentActivityPoints]);

    const monthOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = format(d, 'yyyy-MM');
            const label = format(d, 'MMMM yyyy');
            options.push({ value, label });
        }
        return options;
    }, []);

    const mentorLeaderboardData = useMemo(() => {
        if (!mentors || mentors.length === 0) return [];

        const [yearStr, monthStr] = selectedLeaderboardMonth.split('-');
        const targetYear = parseInt(yearStr, 10);
        const targetMonth = parseInt(monthStr, 10) - 1;

        const effectiveActivities = globalActivities.length > 0 ? globalActivities : (activities || []);
        const effectiveSubmissions = globalSubmissions.length > 0 ? globalSubmissions : (activitySubmissions || []);
        const studentPool = globalStudents.length > 0 ? globalStudents : ((allStudents && allStudents.length > 10) ? allStudents : (students || []));

        // Filter activities belonging to selected month
        const monthActivities = effectiveActivities.filter(act => {
            const actDate = act.createdAt 
                ? (typeof act.createdAt.toDate === 'function' ? act.createdAt.toDate() : new Date(act.createdAt))
                : (act.dueDate ? new Date(act.dueDate) : null);
            if (!actDate || isNaN(actDate.getTime())) return false;
            return actDate.getFullYear() === targetYear && actDate.getMonth() === targetMonth;
        });

        const activeStudents = studentPool.filter(s => s.status === 'Active');

        const result = mentors.map(m => {
            const assignedClassIds = m.assignedClassIds || (m.classId ? [m.classId] : []);
            const mentorStudents = activeStudents.filter(s => assignedClassIds.includes(s.classId));
            
            const mentorMonthActivities = monthActivities.filter(act => assignedClassIds.includes(act.classId));

            let totalExpectedSubmissions = 0;
            let totalCompletedSubmissions = 0;

            mentorMonthActivities.forEach(act => {
                const classStudents = mentorStudents.filter(s => s.classId === act.classId);
                totalExpectedSubmissions += classStudents.length;

                const completedCount = effectiveSubmissions.filter(sub => 
                    sub.activityId === act.id && 
                    sub.status === 'Completed' && 
                    classStudents.some(cs => cs.id === sub.studentId)
                ).length;

                totalCompletedSubmissions += completedCount;
            });

            const percentage = totalExpectedSubmissions > 0 
                ? Math.round((totalCompletedSubmissions / totalExpectedSubmissions) * 100)
                : 0;

            return {
                id: m.id,
                name: m.name || 'Unknown Mentor',
                email: m.email || m.username || 'No email',
                percentage,
                totalCompleted: totalCompletedSubmissions,
                totalExpected: totalExpectedSubmissions,
                activityCount: mentorMonthActivities.length
            };
        });

        result.sort((a, b) => b.percentage - a.percentage || b.totalCompleted - a.totalCompleted || a.name.localeCompare(b.name));

        let currentRank = 1;
        return result.map((item, index, arr) => {
            if (index > 0) {
                const prev = arr[index - 1];
                if (item.percentage !== prev.percentage || item.totalCompleted !== prev.totalCompleted) {
                    currentRank = index + 1;
                }
            }
            return { ...item, rank: currentRank };
        });
    }, [mentors, activities, globalActivities, globalStudents, students, allStudents, activitySubmissions, globalSubmissions, selectedLeaderboardMonth]);


    // Bulk Selection Handlers
    const toggleSelectAll = () => {
        if (selectedActivityIds.length === filteredActivities.length) {
            setSelectedActivityIds([]);
        } else {
            setSelectedActivityIds(filteredActivities.map(a => a.id));
        }
    };

    const toggleSelectActivity = (id) => {
        setSelectedActivityIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

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
        const classStudents = students.filter(s => s.classId === activity.classId && s.status === 'Active');
        const submittedCount = classStudents.filter(s =>
            activitySubmissions.some(sub => sub.activityId === activity.id && sub.studentId === s.id && sub.status === 'Completed')
        ).length;
        return { total: classStudents.length, submitted: submittedCount };
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Activity Manager</h1>
                    <p className="text-gray-500">Assign and track class activities</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto w-full md:w-auto">
                    {selectedActivityIds.length > 0 && (
                        <Button
                            variant="danger"
                            onClick={() => setDeleteConfirmation({ isOpen: true, isBulk: true })}
                            className="flex items-center gap-2 flex-1 md:flex-none justify-center"
                        >
                            <Trash2 className="w-4 h-4" /> Delete ({selectedActivityIds.length})
                        </Button>
                    )}
                    <Button onClick={() => setIsSettingsModalOpen(true)} variant="secondary" className="flex items-center gap-2 flex-1 md:flex-none justify-center">
                        <Settings className="w-4 h-4" /> Settings
                    </Button>

                    {/* Common Report Dropdown */}
                    <div className="relative" ref={reportDropdownRef}>
                        <Button
                            variant="secondary"
                            className="flex items-center gap-2 flex-1 md:flex-none justify-center"
                            onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                        >
                            <Calendar className="w-4 h-4" /> Report <ChevronDown className="w-4 h-4" />
                        </Button>

                        {isReportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                                {['daily', 'weekly', 'monthly', 'annually'].map((type) => (
                                    <div
                                        key={type}
                                        className="group relative border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpandedReportType(expandedReportType === type ? null : type)}
                                    >
                                        <div className="px-4 py-3 text-sm font-medium text-gray-700 capitalize w-full flex justify-between items-center cursor-pointer md:cursor-default">
                                            {type}
                                            <div className={`flex gap-2 transition-opacity ${expandedReportType === type ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                                                <button
                                                    onClick={() => handleReportIconClick(type, 'copy')}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                                    title="Copy to WhatsApp"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleReportIconClick(type, 'pdf')}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                    title="Download PDF"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={() => setIsLeaderboardModalOpen(true)}
                        variant="secondary"
                        className="flex items-center gap-2 flex-1 md:flex-none justify-center border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                    >
                        <Trophy className="w-4 h-4 text-amber-500" /> Leaderboard
                    </Button>

                    <Button onClick={openCreateModal} className="flex items-center gap-2 flex-1 md:flex-none justify-center">
                        <Plus className="w-4 h-4" /> New <span className="hidden md:inline">Activity</span>
                    </Button>
                </div>
            </div>

            {/* Filters & Tabs */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">

                {/* Class Tabs / Selector */}
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                    <button
                        onClick={() => setSelectedClassId('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedClassId === 'all'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        All Classes
                    </button>
                    {availableClasses.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedClassId(c.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedClassId === c.id
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {c.name} - {c.division}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search activities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Bulk Actions Header (if items exist) */}
            {filteredActivities.length > 0 && (
                <div className="flex items-center justify-between px-2 mb-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selectedActivityIds.length === filteredActivities.length && filteredActivities.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700 select-none cursor-pointer" onClick={toggleSelectAll}>Select All</span>
                    </div>

                    {/* Sort Dropdown & Mentor Leaderboard Button */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer py-1.5 pl-3 pr-8 bg-white text-gray-700 font-medium"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => setIsExpandedLeaderboardOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-lg text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-95 ml-1"
                            title="Open Floating Mentor Leaderboard"
                        >
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span>Mentor Leaderboard</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Activities List Column */}
                <div className={`space-y-6 ${showMentorLeaderboard ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                    <div className="grid gap-6">
                        {filteredActivities.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-900">No Activities Found</h3>
                                <p className="text-gray-500">
                                    {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first activity to start tracking Student performance.'}
                                </p>
                            </div>
                        ) : (
                            filteredActivities.map(activity => {
                                const stats = getClassStudentStats(activity);
                                const assignedClass = classes.find(c => c.id === activity.classId);
                                const assignedSubject = subjects.find(s => s.id === activity.subjectId);
                                const isExpanded = expandedActivityId === activity.id;

                                return (
                                    <Card key={activity.id} className="overflow-hidden">
                                        <div className="p-4 md:p-6 flex flex-col md:flex-row items-start gap-4">
                                            {/* Checkbox & Header Mobile Layout Grouping */}
                                            <div className="flex w-full md:w-auto gap-4">
                                                {/* Checkbox */}
                                                <div className="pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedActivityIds.includes(activity.id)}
                                                        onChange={() => toggleSelectActivity(activity.id)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </div>

                                                {/* Mobile Title View (hidden on desktop) */}
                                                <div className="md:hidden flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{activity.title}</h3>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${activity.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                            {activity.status}
                                                        </span>
                                                        <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                                                            {assignedClass ? `${assignedClass.name}-${assignedClass.division}` : 'Unknown Class'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full md:w-auto pl-8 md:pl-0 -mt-2 md:mt-0">
                                                {/* Desktop Title View (hidden on mobile) */}
                                                <div className="hidden md:flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-bold text-gray-900">{activity.title}</h3>
                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${activity.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
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

                                                <div className="flex flex-wrap gap-4 md:gap-6 text-sm text-gray-500">
                                                    <span>Max Points: <span className="font-semibold text-gray-900">{activity.maxPoints}</span></span>
                                                    <span>Due: <span className="font-semibold text-gray-900">{activity.dueDate || 'No Date'}</span></span>
                                                    <span>Submissions: <span className="font-semibold text-gray-900">{stats.submitted}/{stats.total}</span></span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-center items-end w-full md:w-auto gap-2 mt-4 md:mt-0 pl-8 md:pl-0 min-w-[180px]">
                                                {/* Animated Progress Bar */}
                                                <div className="w-full flex items-center gap-2 mb-1 px-1">
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden flex-1">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${stats.total > 0 && (stats.submitted === stats.total) ? 'bg-green-500' : 'bg-indigo-600'}`}
                                                            style={{ width: `${stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-500 min-w-[32px] text-right">
                                                        {stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(activity)}
                                                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Edit Activity"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleActivityStatus(activity.id)}
                                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${activity.status === 'Active'
                                                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                            : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                                                            }`}
                                                    >
                                                        {activity.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmation({ isOpen: true, activityId: activity.id, isBulk: false })}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Activity"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => setExpandedActivityId(isExpanded ? null : activity.id)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors ml-1"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Student Submission Progress Grid */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50/50 p-4 md:p-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Student Submission Tracker</h4>
                                                    <span className="text-xs text-gray-500 font-medium">Click mark to complete/unmark</span>
                                                </div>

                                                {(() => {
                                                    const classActiveActivities = activities.filter(
                                                        a => a.classId === activity.classId && a.status === 'Active'
                                                    );
                                                    const ceilingPoints = classActiveActivities.reduce(
                                                        (sum, a) => sum + (Number(a.maxPoints) || 0),
                                                        0
                                                    ) || activity.maxPoints;
                                                    return (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                            {students
                                                                .filter(s => s.classId === activity.classId && s.status === 'Active')
                                                                .map(student => {
                                                                    const submission = activitySubmissions.find(sub => sub.activityId === activity.id && sub.studentId === student.id);
                                                                    const isDone = submission?.status === 'Completed';
                                                                    const totalPoints = getStudentActivityPoints(student.id, student.classId);
                                                                    const isOverAllocated = totalPoints > ceilingPoints;
                                                                    const hasManualOverride =
                                                                        student.manualActivityPoints !== undefined &&
                                                                        student.manualActivityPoints !== null &&
                                                                        student.manualActivityPoints !== '';
                                                                    const isEditing = editingPointsFor === student.id;
                                                                    const isSaving = savingPointsFor === student.id;
                                                                    const canEdit = isOverAllocated || isEditing;

                                                                    const cardBorderClass = isOverAllocated
                                                                        ? 'bg-red-50 border-red-300 shadow-sm ring-1 ring-red-200'
                                                                        : isDone
                                                                            ? 'bg-white border-green-200 shadow-sm'
                                                                            : 'bg-white border-gray-200';

                                                                    return (
                                                                        <div key={student.id} className={`p-4 rounded-lg border flex flex-col gap-3 ${cardBorderClass}`}>
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <div className="min-w-0">
                                                                                    <p className={`font-medium truncate ${isOverAllocated ? 'text-red-900' : 'text-gray-900'}`}>{student.name}</p>
                                                                                    <p className={`text-xs ${isOverAllocated ? 'text-red-600' : 'text-gray-500'}`}>{student.registerNo}</p>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => handleToggleMark(activity, student, isDone)}
                                                                                    className={`p-2 rounded-full transition-colors shrink-0 ${isDone
                                                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                                                        }`}
                                                                                    title={isDone ? 'Unmark' : 'Mark as done'}
                                                                                >
                                                                                    {isDone ? (
                                                                                        <CheckCircle className="w-5 h-5" />
                                                                                    ) : (
                                                                                        <div className="w-5 h-5 border-2 border-current rounded-full" />
                                                                                    )}
                                                                                </button>
                                                                            </div>

                                                                            <div className={`flex items-center justify-between gap-2 pt-2 border-t ${isOverAllocated ? 'border-red-200' : 'border-gray-100'}`}>
                                                                                {isEditing ? (
                                                                                    <>
                                                                                        <input
                                                                                            type="number"
                                                                                            value={pointsDraft}
                                                                                            onChange={e => setPointsDraft(e.target.value)}
                                                                                            disabled={isSaving}
                                                                                            className="w-16 px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                                                                        />
                                                                                        <div className="flex items-center gap-1">
                                                                                            <button
                                                                                                onClick={() => saveEditPoints(student)}
                                                                                                disabled={isSaving}
                                                                                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                                                                                                title="Save points"
                                                                                            >
                                                                                                <Save className="w-3 h-3" />
                                                                                            </button>
                                                                                            {hasManualOverride && (
                                                                                                <button
                                                                                                    onClick={() => resetEditPoints(student)}
                                                                                                    disabled={isSaving}
                                                                                                    className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                                                                                                    title="Reset to calculated points"
                                                                                                >
                                                                                                    <RotateCcw className="w-3 h-3" />
                                                                                                </button>
                                                                                            )}
                                                                                            <button
                                                                                                onClick={cancelEditPoints}
                                                                                                disabled={isSaving}
                                                                                                className="p-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 text-xs"
                                                                                                title="Cancel"
                                                                                            >
                                                                                                <XCircle className="w-3 h-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <div className="flex items-center gap-1 min-w-0">
                                                                                            <span className={`text-xs font-bold ${isOverAllocated ? 'text-red-700' : 'text-gray-900'}`}>
                                                                                                {totalPoints} pts
                                                                                            </span>
                                                                                            <span className={`text-[10px] ${isOverAllocated ? 'text-red-500' : 'text-gray-400'}`}>
                                                                                                / max {ceilingPoints}
                                                                                            </span>
                                                                                            {isOverAllocated && (
                                                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-red-500 px-1.5 py-0.5 rounded">
                                                                                                    Over limit
                                                                                                </span>
                                                                                            )}
                                                                                            {!isOverAllocated && hasManualOverride && (
                                                                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                                                    Manual
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {canEdit && (
                                                                                            <button
                                                                                                onClick={() => beginEditPoints(student)}
                                                                                                className={`p-1.5 rounded-md shrink-0 ${isOverAllocated
                                                                                                    ? 'text-red-600 hover:bg-red-100 bg-red-100/50'
                                                                                                    : 'text-indigo-600 hover:bg-indigo-50'
                                                                                                    }`}
                                                                                                title={isOverAllocated ? 'Fix over-allocated points' : 'Edit total points'}
                                                                                            >
                                                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Mentor Leaderboard Sidebar Column */}
                {showMentorLeaderboard && (
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-amber-50/50 to-orange-50/30 border-b border-gray-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">Mentor Leaderboard</h3>
                                    <p className="text-xs text-gray-500">Activity completion %</p>
                                </div>
                            </div>

                            {/* Controls: Month Dropdown & Expand Button */}
                            <div className="flex items-center gap-1.5">
                                <select
                                    value={selectedLeaderboardMonth}
                                    onChange={(e) => setSelectedLeaderboardMonth(e.target.value)}
                                    className="bg-white border border-gray-200 text-xs font-semibold rounded-lg px-2 py-1.5 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-700 shadow-xs cursor-pointer"
                                >
                                    {monthOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => setIsExpandedLeaderboardOpen(true)}
                                    className="p-1.5 text-gray-600 hover:text-amber-700 hover:bg-amber-100/70 bg-white border border-gray-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shadow-2xs"
                                    title="Expand Detailed Breakdown"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Column Titles Header */}
                        <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                            <div className="col-span-2 text-left">RANK</div>
                            <div className="col-span-7 text-left">MENTOR</div>
                            <div className="col-span-3 text-right">PERCENTAGE</div>
                        </div>

                        {/* Leaderboard Rows List */}
                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                            {mentorLeaderboardData.length === 0 ? (
                                <div className="text-center py-8 px-4">
                                    <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-500">No mentor data available for this month.</p>
                                </div>
                            ) : (
                                mentorLeaderboardData.map((m, idx) => {
                                    const isTop3 = m.rank <= 3;
                                    const avatarBg = idx % 5 === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                        idx % 5 === 1 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                        idx % 5 === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                        idx % 5 === 3 ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                                        'bg-purple-100 text-purple-800 border border-purple-200';

                                    return (
                                        <div
                                            key={m.id}
                                            className={`grid grid-cols-12 items-center px-4 py-3 transition-colors hover:bg-amber-50/20 ${
                                                isTop3 ? 'bg-amber-50/10' : 'bg-white'
                                            }`}
                                        >
                                            {/* Rank Number */}
                                            <div className="col-span-2 flex items-center justify-start">
                                                <span className={`font-extrabold text-sm ${isTop3 ? 'text-amber-600 font-black' : 'text-gray-500'}`}>
                                                    {m.rank}
                                                </span>
                                            </div>

                                            {/* Mentor Initial & Details */}
                                            <div className="col-span-7 flex items-center gap-2.5 min-w-0 pr-2">
                                                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs uppercase ${avatarBg}`}>
                                                    {m.name ? m.name.charAt(0) : 'M'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-xs md:text-sm text-gray-900 truncate uppercase tracking-tight">
                                                        {m.name}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 truncate font-normal">
                                                        {m.email}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Percentage Score */}
                                            <div className="col-span-3 text-right">
                                                <span className="text-sm font-extrabold text-gray-900">
                                                    {m.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Activity Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                            <h2 className="text-xl font-bold">{editingActivityId ? 'Edit Activity' : 'Create Activity'}</h2>
                            <button onClick={closeModal} className="hover:bg-gray-100 rounded-full p-1 transition-colors">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                            <form id="activityForm" onSubmit={handleCreateOrUpdate} className="space-y-4">
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
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                                        onChange={(e) => {
                                            const cid = e.target.value;
                                            setNewActivity(prev => {
                                                const classConfig = classFeatureFlags?.find(f => f.classId === cid);
                                                const defaultMarkDone = classConfig?.studentCanMarkActivities || false;
                                                return { ...prev, classId: cid, studentCanMarkDone: defaultMarkDone };
                                            });
                                        }}
                                        required
                                    >
                                        <option value="">Select Class</option>
                                        {availableClasses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.division}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                        <div className={`p-3 rounded-lg border transition-all ${newActivity.classId ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                                            <div className="flex items-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="batchShare"
                                                    checked={isBatchShare}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setIsBatchShare(checked);
                                                        if (checked) setIsAllottedShare(false);
                                                    }}
                                                    disabled={!newActivity.classId}
                                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:cursor-not-allowed"
                                                />
                                                <label htmlFor="batchShare" className={`text-sm cursor-pointer select-none ${!newActivity.classId ? 'cursor-not-allowed text-gray-500' : 'text-indigo-900'}`}>
                                                    <span className="font-semibold block">Share with entire batch</span>
                                                    <span className={`text-xs ${!newActivity.classId ? 'text-gray-400' : 'text-indigo-700'}`}>
                                                        {newActivity.classId
                                                            ? <>Create for all divisions of <strong>Class {classes.find(c => c.id === newActivity.classId)?.name}</strong>.</>
                                                            : "Select a Class above to enable this option."}
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className={`p-3 rounded-lg border transition-all ${newActivity.classId || (isAllottedShare && availableClasses.length > 0) ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                                            <div className="flex items-start gap-2 mb-1">
                                                <input
                                                    type="checkbox"
                                                    id="allottedShare"
                                                    checked={isAllottedShare}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setIsAllottedShare(checked);
                                                        if (checked) {
                                                            setIsBatchShare(false);
                                                            setSelectedShareClassIds(availableClasses.map(c => c.id));
                                                        } else {
                                                            setSelectedShareClassIds([]);
                                                        }
                                                    }}
                                                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="allottedShare" className="text-sm cursor-pointer select-none text-purple-900 font-semibold block">
                                                    Share with allotted classes
                                                    <span className="text-xs text-purple-700 block font-normal mt-0.5">
                                                        Select specific classes assigned to you.
                                                    </span>
                                                </label>
                                            </div>

                                            {isAllottedShare && availableClasses.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-purple-100">
                                                    {availableClasses.map(cls => (
                                                        <label key={cls.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/50 cursor-pointer transition-colors border border-transparent hover:border-purple-200">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedShareClassIds.includes(cls.id)}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setSelectedShareClassIds(prev => [...prev, cls.id]);
                                                                    } else {
                                                                        setSelectedShareClassIds(prev => prev.filter(id => id !== cls.id));
                                                                    }
                                                                }}
                                                                className="h-3.5 w-3.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                            />
                                                            <span className="text-xs font-medium text-purple-800">{cls.name}-{cls.division}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
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

                                <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50/50 border-gray-200">
                                    <input
                                        type="checkbox"
                                        id="studentCanMarkDone"
                                        checked={newActivity.studentCanMarkDone}
                                        onChange={e => setNewActivity({ ...newActivity, studentCanMarkDone: e.target.checked })}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="studentCanMarkDone" className="text-sm cursor-pointer select-none text-gray-800 flex-1">
                                        <span className="font-semibold block">Student can mark as done</span>
                                        <span className="text-xs text-gray-500">Allow students to self-report completion.</span>
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex-shrink-0">
                            <Button type="submit" form="activityForm" className="w-full py-3 text-base shadow-lg shadow-indigo-200 transition-transform active:scale-[0.98]">
                                {editingActivityId ? 'Update Activity' : 'Create Activity'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => {
                    setDeleteConfirmation({ isOpen: false, activityId: null, isBulk: false });
                    setIsBatchDelete(false);
                }}
                onConfirm={confirmDelete}
                title={deleteConfirmation.isBulk ? "Delete Multiple Activities" : "Delete Activity"}
                message={deleteConfirmation.isBulk
                    ? `Are you sure you want to delete ${selectedActivityIds.length} activities? This action cannot be undone.`
                    : "Are you sure you want to delete this activity? This action cannot be undone and will remove all student submissions associated with it."
                }
                confirmText={deleteConfirmation.isBulk ? "Delete All Selected" : "Delete Activity"}
                isDanger={true}
            >
                {!deleteConfirmation.isBulk && deleteConfirmation.activityId && (
                    <div className="flex items-start gap-2 p-3 mt-2 bg-red-50 rounded-lg border border-red-100">
                        <input
                            type="checkbox"
                            id="batchDelete"
                            checked={isBatchDelete}
                            onChange={e => setIsBatchDelete(e.target.checked)}
                            className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="batchDelete" className="text-sm text-red-900 cursor-pointer select-none">
                            <span className="font-semibold block">Delete for entire batch</span>
                            <span className="text-red-700 text-xs">
                                Also delete this activity from <strong>all other classes in this grade</strong> (e.g. 10-A, 10-B...).
                            </span>
                        </label>
                    </div>
                )}
            </ConfirmationModal>

            {/* Duplicate Warning Modal */}
            <ConfirmationModal
                isOpen={showDuplicateWarning}
                onClose={() => setShowDuplicateWarning(false)}
                onConfirm={() => setShowDuplicateWarning(false)}
                title="Duplicate Activity"
                message="An activity with this Title and Subject is already assigned to this Class. Please use a different title or edit the existing activity."
                confirmText="Okay"
                cancelText={null} // Hide cancel button
                isDanger={true}
            />
            {/* Report Type Selection Modal */}
            {pendingReportConfig && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <Card className="w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                Report Type
                            </h2>
                            <button onClick={() => setPendingReportConfig(null)}>
                                <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => confirmGenerateReport('short')}
                                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors group relative"
                            >
                                <div className="font-bold text-gray-900 group-hover:text-indigo-700">Short Report</div>
                                <div className="text-sm text-gray-500 mt-1 pr-6 hover:text-indigo-600/90">
                                    Summary overview showing only the total students, completion percentage, and pending percentage for the class.
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronUp className="w-5 h-5 text-indigo-500 rotate-90" />
                                </div>
                            </button>

                            <button
                                onClick={() => confirmGenerateReport('detailed')}
                                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors group relative"
                            >
                                <div className="font-bold text-gray-900 group-hover:text-indigo-700">Detailed Report</div>
                                <div className="text-sm text-gray-500 mt-1 pr-6 hover:text-indigo-600/90">
                                    Comprehensive breakdown listing every individual student alongside their specific completed and pending tasks.
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronUp className="w-5 h-5 text-indigo-500 rotate-90" />
                                </div>
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Leaderboard Modal */}
            {isLeaderboardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Trophy className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Activity Leaderboard</h2>
                                    <p className="text-sm text-gray-600">Top students based on activity completion points</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <select 
                                    className="bg-white border border-gray-200 text-sm font-medium rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                    value={leaderboardClassId}
                                    onChange={(e) => setLeaderboardClassId(e.target.value)}
                                >
                                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.division}</option>)}
                                </select>
                                <button onClick={() => setIsLeaderboardModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            {leaderboardData.length === 0 ? (
                                <div className="text-center py-12">
                                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-gray-900">No Data Available</h3>
                                    <p className="text-gray-500">No activity data found for the selected class.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
                                    <table className="w-full min-w-[600px] text-left border-collapse">
                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                            <tr>
                                                <th className="p-4 w-20 text-center">Rank</th>
                                                <th className="p-4">Student</th>
                                                <th className="p-4 text-center">Activities Done</th>
                                                <th className="p-4 text-right">Points</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {leaderboardData.map((student, index) => {
                                                const studentClass = classes.find(c => c.id === student.classId);
                                                const isTop3 = index < 3;
                                                return (
                                                    <tr key={student.id} className={`transition-colors hover:bg-amber-50/30 ${isTop3 ? 'bg-amber-50/10' : 'bg-white'}`}>
                                                        <td className="p-4 text-center">
                                                            {student.rank === 1 ? <Trophy className="w-5 h-5 text-yellow-500 mx-auto" /> :
                                                             student.rank === 2 ? <Trophy className="w-5 h-5 text-gray-400 mx-auto" /> :
                                                             student.rank === 3 ? <Trophy className="w-5 h-5 text-amber-600 mx-auto" /> :
                                                             <span className="font-bold text-gray-500">{student.rank}</span>}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isTop3 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700'}`}>
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className={`font-bold ${isTop3 ? 'text-amber-900' : 'text-gray-900'}`}>{student.name}</div>
                                                                    <div className="text-xs text-gray-500 font-mono">{student.registerNo}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-xs">
                                                                {student.completedCount}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <span className={`text-lg font-extrabold ${student.points > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                                                    {student.points}
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-400">pts</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Settings className="w-5 h-5" /> Activity Settings
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Configure global activity preferences per class.</p>
                            </div>
                            <button onClick={() => setIsSettingsModalOpen(false)}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" /></button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {availableClasses.map(cls => {
                                const classConfig = classFeatureFlags?.find(f => f.classId === cls.id);
                                const isEnabled = classConfig?.studentCanMarkActivities || false;

                                return (
                                    <div key={cls.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{cls.name}-{cls.division}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] sm:max-w-xs">
                                                Allow students to mark activities as completed by themselves.
                                            </p>
                                        </div>

                                        <label className="relative inline-flex items-center cursor-pointer shrinks-0">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isEnabled}
                                                onChange={() => handleClassSettingToggle(cls.id, isEnabled)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </div>
            )}
            {/* Expanded Mentor Leaderboard Breakdown Modal - Race to Target Theme */}
            {isExpandedLeaderboardOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
                    <div className="bg-slate-50/90 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-white/60">
                        {/* Modal Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/80 bg-white shadow-2xs gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl shadow-md flex items-center justify-center">
                                    <ChequeredFlag className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black tracking-widest text-slate-400 uppercase">MENTOR</span>
                                        <span className="bg-amber-100 text-amber-900 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase border border-amber-200">
                                            RACE TO THE TARGET 🏁
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                        LEADERBOARD
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">Detailed monthly activity submission stats per mentor</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-3">
                                <div className="hidden lg:flex flex-col text-right mr-2">
                                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">MOTTO</span>
                                    <span className="text-xs font-black text-slate-600 italic">SAME GOAL, BIGGER IMPACT</span>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/80 rounded-2xl px-3 py-1.5 shadow-2xs">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <select
                                            value={selectedLeaderboardMonth}
                                            onChange={(e) => setSelectedLeaderboardMonth(e.target.value)}
                                            className="bg-transparent text-xs font-bold focus:outline-none text-slate-800 cursor-pointer"
                                        >
                                            {monthOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button 
                                        onClick={() => setIsExpandedLeaderboardOpen(false)} 
                                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-2xl transition-all"
                                        title="Close Leaderboard"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Column Labels */}
                        <div className="hidden md:grid grid-cols-12 px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-3">MENTOR</div>
                            <div className="col-span-6 text-center">PROGRESS (COMPLETED / TARGET)</div>
                            <div className="col-span-2 text-right">% COMPLETE</div>
                        </div>

                        {/* Modal Content - Animated Race Tracks */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50">
                            {mentorLeaderboardData.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                                    <Trophy className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-bold text-slate-800">No Racing Data Available</h3>
                                    <p className="text-slate-500 text-sm mt-1">No mentor activity metrics recorded for this selected month.</p>
                                </div>
                            ) : (
                                mentorLeaderboardData.map((m) => {
                                    const theme = getRankTheme(m.rank);
                                    const displayPercentage = Math.min(Math.max(m.percentage, 0), 100);

                                    return (
                                        <div 
                                            key={m.id}
                                            className={`rounded-2xl p-3 sm:p-4 border transition-all duration-300 ${theme.rowBg}`}
                                        >
                                            <div className="flex flex-col md:grid md:grid-cols-12 items-center gap-3 sm:gap-4">
                                                {/* Rank Badge */}
                                                <div className="col-span-1 flex items-center justify-start md:justify-center w-full md:w-auto">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${theme.badgeBg}`}>
                                                        {m.rank === 1 ? (
                                                            <span className="text-base" title="1st Place Champion">👑</span>
                                                        ) : (
                                                            <span>{m.rank}</span>
                                                        )}
                                                    </div>
                                                    {/* Mobile Mentor Name next to rank */}
                                                    <div className="md:hidden ml-3">
                                                        <div className="font-extrabold text-slate-900 text-sm">{m.name}</div>
                                                        <div className="text-xs text-slate-400 font-normal">{m.email}</div>
                                                    </div>
                                                    {/* Mobile % Badge */}
                                                    <div className="md:hidden ml-auto">
                                                        <span className={`px-3 py-1 rounded-xl text-xs font-black border ${theme.percentBadge}`}>
                                                            {m.percentage}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Mentor Info (Desktop) */}
                                                <div className="hidden md:block col-span-3 pr-2">
                                                    <div className="font-black text-slate-900 text-sm truncate">{m.name}</div>
                                                    <div className="text-xs font-medium text-slate-400 truncate">{m.email}</div>
                                                </div>

                                                {/* Animated Race Track (Progress Bar + Car) */}
                                                <div className="col-span-6 w-full flex items-center gap-3">
                                                    {/* Track Lane */}
                                                    <div className="relative flex-1 h-9 bg-slate-200/90 rounded-full flex items-center px-2 overflow-hidden border border-slate-300/60 shadow-inner">
                                                        {/* Track Center Dashed Line */}
                                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b-2 border-dashed border-white/70 pointer-events-none" />

                                                        {/* Filled Progress Bar */}
                                                        <div 
                                                            className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${theme.barGradient} transition-all duration-1000 ease-out shadow-xs`}
                                                            style={{ width: `${animateRace ? displayPercentage : 0}%` }}
                                                        />

                                                        {/* Race Car SVG */}
                                                        <div 
                                                            className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-10 filter drop-shadow-md"
                                                            style={{ 
                                                                left: animateRace 
                                                                    ? `calc(${Math.max(displayPercentage, 2)}% - ${displayPercentage > 10 ? '30px' : '10px'})`
                                                                    : '4px' 
                                                            }}
                                                        >
                                                            <RaceCarIcon color={theme.carColor} className="w-8 h-5" />
                                                        </div>

                                                        {/* Finish Line Flag */}
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-slate-900/10 p-0.5 rounded-xs backdrop-blur-2xs">
                                                            <ChequeredFlag className="w-4 h-4 text-slate-800" />
                                                        </div>
                                                    </div>

                                                    {/* Submissions count: Completed / Expected */}
                                                    <div className="text-xs font-black text-slate-700 font-mono whitespace-nowrap bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/80">
                                                        {m.totalCompleted} / {m.totalExpected}
                                                    </div>
                                                </div>

                                                {/* Completion Percentage (Desktop) */}
                                                <div className="hidden md:flex col-span-2 justify-end">
                                                    <span className={`px-3.5 py-1.5 rounded-xl text-sm font-black border ${theme.percentBadge}`}>
                                                        {m.percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row items-center justify-between text-xs font-extrabold text-slate-400 gap-2">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="tracking-wider uppercase">MENTORS MAKE A DIFFERENCE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="tracking-wider uppercase">KEEP MOVING FORWARD</span>
                                <ChequeredFlag className="w-4 h-4 text-slate-800" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivitiesManager;
