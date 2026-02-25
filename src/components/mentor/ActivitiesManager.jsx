import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy, Pencil, Search, Filter, Settings, Copy, Download, FileText, Calendar } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

const ActivitiesManager = () => {
    const {
        activities, addActivity, updateActivity, deleteActivity, toggleActivityStatus,
        classes, students, subjects, currentUser,
        activitySubmissions, markActivityAsDone, markActivityAsPending
    } = useData();

    // UI States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [expandedActivityId, setExpandedActivityId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, activityId: null, isBulk: false });
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [isBatchShare, setIsBatchShare] = useState(false); // New state
    const [isBatchDelete, setIsBatchDelete] = useState(false); // New state for delete
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // Settings Modal
    const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false); // Report Dropdown State
    const [expandedReportType, setExpandedReportType] = useState(null); // Mobile report row expansion
    const reportDropdownRef = useRef(null);

    // Close Report Dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (reportDropdownRef.current && !reportDropdownRef.current.contains(event.target)) {
                setIsReportDropdownOpen(false);
            }
        };

        if (isReportDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isReportDropdownOpen]);

    // Filter/Search States
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedActivityIds, setSelectedActivityIds] = useState([]);

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

    const handleCreateOrUpdate = (e) => {
        e.preventDefault();
        if (!newActivity.title || !newActivity.classId) return;

        // Duplicate Check
        // Clean strings for comparison
        const cleanTitle = newActivity.title.trim().toLowerCase();

        const isDuplicate = activities.some(a =>
            a.id !== editingActivityId && // Ignore self if editing
            a.status !== 'Deleted' && // Ignore deleted? Actually we usually hard delete, but if soft delete, check. Assuming hard delete from context.
            a.classId === newActivity.classId &&
            a.subjectId === newActivity.subjectId &&
            a.title.trim().toLowerCase() === cleanTitle
        );

        if (isDuplicate) {
            setShowDuplicateWarning(true);
            return;
        }

        if (editingActivityId) {
            updateActivity(editingActivityId, newActivity);
        } else {
            if (isBatchShare) {
                // Batch Creation Logic
                const selectedClass = classes.find(c => c.id === newActivity.classId);
                if (selectedClass) {
                    // Find all classes with the same Grade Name
                    const batchClasses = classes.filter(c => c.name === selectedClass.name);

                    batchClasses.forEach(batchClass => {
                        // Optional: Check strictly for duplicates to avoid spamming? 
                        // For now, let's just create it. The context might handle ID generation.
                        // We should reuse the newActivity object but swap the classId.
                        addActivity({ ...newActivity, classId: batchClass.id });
                    });
                }
            } else {
                // Single Class Creation
                addActivity(newActivity);
            }
        }

        closeModal();
    };

    const openCreateModal = () => {
        setEditingActivityId(null);
        setIsBatchShare(false); // Reset
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

    const availableClasses = useMemo(() => (currentUser?.role === 'mentor' || currentUser?.assignedClassIds)
        ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
        : classes, [classes, currentUser]);

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

        const classStudents = students.filter(s => s.classId === activity.classId);

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

    const generateCommonActivityReport = async (timeframe, reportFormat) => {
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
            // 1. Filter Activities in this timeframe for this class
            const classActivities = activities.filter(a => a.classId === targetClass.id);

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
            const classStudents = students.filter(s => s.classId === targetClass.id);
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

            reportDataByClass.push({
                cls: targetClass,
                activitiesCount: periodActivities.length,
                studentStats
            });
        }

        if (reportDataByClass.length === 0) {
            alert(`No activities found in the selected timeframe (${timeframe}).`);
            return;
        }

        if (reportFormat === 'copy') {
            const classBlocks = reportDataByClass.map(data => {
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

                return `*Class:* ${data.cls.name} - ${data.cls.division}\n*Total Activities:* ${data.activitiesCount}\n\n*Fully Completed ✅*\n${fullyCompletedText}\n\n*Partially Completed ⚠️*\n${partiallyCompletedText}\n\n*Not Started ⏳*\n${notStartedText}`;
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

            reportDataByClass.forEach((data, index) => {
                if (index > 0) {
                    doc.addPage();
                }

                // PDF Header
                doc.setFontSize(16);
                doc.text(`Activity Report`, 14, 15);
                doc.setFontSize(11);
                doc.text(`Class: ${data.cls.name} - ${data.cls.division}`, 14, 22);
                doc.text(`Period: ${periodName}`, 14, 28);
                doc.text(`Total Activities: ${data.activitiesCount}`, 14, 34);

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

        return result;
    }, [activities, selectedClassId, searchQuery, availableClasses, currentUser]);


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
        const classStudents = students.filter(s => s.classId === activity.classId);
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
                <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto">
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
                                                    onClick={() => generateCommonActivityReport(type, 'copy')}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                                    title="Copy to WhatsApp"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => generateCommonActivityReport(type, 'pdf')}
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
                <div className="flex items-center gap-3 px-2">
                    <input
                        type="checkbox"
                        checked={selectedActivityIds.length === filteredActivities.length && filteredActivities.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-500">Select All</span>
                </div>
            )}

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

                                    <div className="flex items-center justify-end w-full md:w-auto gap-2 mt-2 md:mt-0 pl-8 md:pl-0">
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
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-yellow-500" />
                                                Student Tracker
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleCopyActivityReport(activity)}
                                                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-full transition-colors"
                                                    title="Copy WhatsApp Report"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    WhatsApp Report
                                                </button>
                                                {activity.studentCanMarkDone && (
                                                    <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                                        Self-Marking Enabled
                                                    </span>
                                                )}
                                            </div>
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

                            {!editingActivityId && (
                                <div className={`flex items-start gap-2 p-3 rounded-lg border ${newActivity.classId ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                                    <input
                                        type="checkbox"
                                        id="batchShare"
                                        checked={isBatchShare}
                                        onChange={e => setIsBatchShare(e.target.checked)}
                                        disabled={!newActivity.classId}
                                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:cursor-not-allowed"
                                    />
                                    <label htmlFor="batchShare" className={`text-sm cursor-pointer select-none ${!newActivity.classId ? 'cursor-not-allowed text-gray-500' : 'text-indigo-900'}`}>
                                        <span className="font-semibold block">Share with entire batch</span>
                                        <span className={`text-xs ${!newActivity.classId ? 'text-gray-400' : 'text-indigo-700'}`}>
                                            {newActivity.classId
                                                ? <>Create this activity for all <strong>Class {classes.find(c => c.id === newActivity.classId)?.name}</strong> divisions (e.g. A, B, C...).</>
                                                : "Select a Class above to enable this option."}
                                        </span>
                                    </label>
                                </div>
                            )}
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
                                    className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="studentCanMarkDone" className="text-sm cursor-pointer select-none text-gray-800 flex-1">
                                    <span className="font-semibold block">Student can mark as done</span>
                                    <span className="text-xs text-gray-500">Allow students to self-report completion on their dashboard.</span>
                                </label>
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
        </div>
    );
};

export default ActivitiesManager;
