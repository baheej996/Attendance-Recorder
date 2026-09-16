import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
    CheckCircle, 
    XCircle, 
    Search, 
    Filter, 
    User, 
    ChevronDown, 
    ChevronRight, 
    FileText, 
    Users, 
    BarChart2, 
    Clock, 
    AlertCircle, 
    Check, 
    Sparkles, 
    Maximize2, 
    Minimize2,
    Calendar,
    GraduationCap,
    School
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';

const ParentFeedbackTracker = () => {
    const { 
        parentFeedbackTemplates, 
        parentFeedbacks, 
        classes, 
        mentors, 
        allStudents, 
        students 
    } = useData();

    // 1. Template / Form Selection State
    const activeTemplates = useMemo(() => {
        const list = parentFeedbackTemplates || [];
        return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [parentFeedbackTemplates]);

    const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
        if (activeTemplates.length > 0) {
            const published = activeTemplates.find(t => t.status === 'Published');
            return published ? published.id : activeTemplates[0].id;
        }
        return 'all';
    });

    // 2. Search, Status Filter & Accordion States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'submitted' | 'pending'
    const [expandedMentorIds, setExpandedMentorIds] = useState(new Set());
    const [expandedClassIds, setExpandedClassIds] = useState(new Set());

    // Pool of active students across system
    const studentPool = useMemo(() => {
        const list = (allStudents && allStudents.length > 0) ? allStudents : (students || []);
        return list.filter(s => s.status === 'Active');
    }, [allStudents, students]);

    // Currently selected template object
    const selectedTemplate = useMemo(() => {
        if (selectedTemplateId === 'all') return null;
        return (parentFeedbackTemplates || []).find(t => t.id === selectedTemplateId);
    }, [selectedTemplateId, parentFeedbackTemplates]);

    // Submissions matching selected template
    const relevantSubmissionsMap = useMemo(() => {
        const map = new Map();
        (parentFeedbacks || []).forEach(sub => {
            if (selectedTemplateId === 'all' || sub.templateId === selectedTemplateId) {
                if (sub.studentId) {
                    // Keep the latest submission if multiple exist
                    map.set(sub.studentId, sub);
                }
            }
        });
        return map;
    }, [parentFeedbacks, selectedTemplateId]);

    // Overall KPI Stats
    const overallStats = useMemo(() => {
        const totalTarget = studentPool.length;
        let submittedCount = 0;

        studentPool.forEach(s => {
            if (relevantSubmissionsMap.has(s.id)) {
                submittedCount++;
            }
        });

        const pendingCount = totalTarget - submittedCount;
        const completionRate = totalTarget > 0 ? Math.round((submittedCount / totalTarget) * 100) : 0;

        return {
            totalTarget,
            submittedCount,
            pendingCount,
            completionRate
        };
    }, [studentPool, relevantSubmissionsMap]);

    // Recharts Pie Chart Data (Submitted vs Remaining)
    const pieData = useMemo(() => [
        { name: 'Submitted', value: overallStats.submittedCount, color: '#10B981' },
        { name: 'Remaining', value: overallStats.pendingCount, color: '#F43F5E' }
    ], [overallStats]);

    // Main Hierarchy Processing: Mentor -> Class -> Student
    const hierarchicalData = useMemo(() => {
        if (!mentors || mentors.length === 0) return [];

        const searchLower = searchTerm.trim().toLowerCase();

        // Map mentors & assigned classes
        const result = (mentors || []).map(mentor => {
            const assignedClassIds = mentor.assignedClassIds || (mentor.classId ? [mentor.classId] : []);
            
            const mentorClasses = (classes || []).filter(c => 
                assignedClassIds.includes(c.id) || 
                c.mentorId === mentor.id
            ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

            let mentorTotalStudents = 0;
            let mentorSubmittedCount = 0;

            const processedClasses = mentorClasses.map(cls => {
                const classStudents = studentPool.filter(s => s.classId === cls.id);
                
                let classSubmittedCount = 0;
                
                const processedStudents = classStudents.map(s => {
                    const isSubmitted = relevantSubmissionsMap.has(s.id);
                    if (isSubmitted) classSubmittedCount++;

                    const submissionData = relevantSubmissionsMap.get(s.id) || null;

                    return {
                        ...s,
                        isSubmitted,
                        submissionData
                    };
                }).sort((a, b) => {
                    // Submitted first, then name
                    if (a.isSubmitted && !b.isSubmitted) return -1;
                    if (!a.isSubmitted && b.isSubmitted) return 1;
                    return a.name.localeCompare(b.name);
                });

                // Apply status filter to students
                let filteredStudents = processedStudents;
                if (statusFilter === 'submitted') {
                    filteredStudents = processedStudents.filter(s => s.isSubmitted);
                } else if (statusFilter === 'pending') {
                    filteredStudents = processedStudents.filter(s => !s.isSubmitted);
                }

                // Apply search filter to students
                if (searchLower) {
                    filteredStudents = filteredStudents.filter(s => 
                        s.name.toLowerCase().includes(searchLower) ||
                        (s.registerNo && s.registerNo.toLowerCase().includes(searchLower)) ||
                        mentor.name.toLowerCase().includes(searchLower)
                    );
                }

                mentorTotalStudents += classStudents.length;
                mentorSubmittedCount += classSubmittedCount;

                const classCompletionRate = classStudents.length > 0 
                    ? Math.round((classSubmittedCount / classStudents.length) * 100) 
                    : 0;

                return {
                    classObj: cls,
                    totalStudents: classStudents.length,
                    submittedCount: classSubmittedCount,
                    pendingCount: classStudents.length - classSubmittedCount,
                    completionRate: classCompletionRate,
                    students: filteredStudents,
                    rawStudentsCount: processedStudents.length
                };
            }).filter(clsData => {
                // Keep class if search term matches mentor name or class has matching students
                if (searchLower) {
                    return mentor.name.toLowerCase().includes(searchLower) || clsData.students.length > 0;
                }
                return true;
            });

            const mentorCompletionRate = mentorTotalStudents > 0 
                ? Math.round((mentorSubmittedCount / mentorTotalStudents) * 100) 
                : 0;

            return {
                mentor,
                totalClasses: mentorClasses.length,
                totalStudents: mentorTotalStudents,
                submittedCount: mentorSubmittedCount,
                pendingCount: mentorTotalStudents - mentorSubmittedCount,
                completionRate: mentorCompletionRate,
                classes: processedClasses
            };
        }).filter(mentorData => {
            if (searchLower) {
                return mentorData.mentor.name.toLowerCase().includes(searchLower) || mentorData.classes.length > 0;
            }
            return mentorData.classes.length > 0 || mentorData.totalStudents > 0;
        }).sort((a, b) => b.completionRate - a.completionRate || a.mentor.name.localeCompare(b.mentor.name));

        return result;
    }, [mentors, classes, studentPool, relevantSubmissionsMap, searchTerm, statusFilter]);

    // Top Mentors Bar Chart Data
    const mentorBarChartData = useMemo(() => {
        return hierarchicalData
            .filter(m => m.totalStudents > 0)
            .slice(0, 10)
            .map(m => ({
                name: m.mentor.name.split(' ')[0] + ' ' + (m.mentor.name.split(' ')[1] || ''),
                submitted: m.submittedCount,
                pending: m.pendingCount,
                rate: m.completionRate
            }));
    }, [hierarchicalData]);

    // Toggle Accordion Handlers
    const toggleMentorExpand = (mentorId) => {
        setExpandedMentorIds(prev => {
            const next = new Set(prev);
            if (next.has(mentorId)) next.delete(mentorId);
            else next.add(mentorId);
            return next;
        });
    };

    const toggleClassExpand = (classId) => {
        setExpandedClassIds(prev => {
            const next = new Set(prev);
            if (next.has(classId)) next.delete(classId);
            else next.add(classId);
            return next;
        });
    };

    const handleExpandAll = () => {
        const allMentorIds = new Set(hierarchicalData.map(m => m.mentor.id));
        const allCIds = new Set();
        hierarchicalData.forEach(m => {
            m.classes.forEach(c => allCIds.add(c.classObj.id));
        });
        setExpandedMentorIds(allMentorIds);
        setExpandedClassIds(allCIds);
    };

    const handleCollapseAll = () => {
        setExpandedMentorIds(new Set());
        setExpandedClassIds(new Set());
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. TOP HEADER & FORM SELECTOR CARD */}
            <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users className="w-5 h-5" />
                            </span>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                Student Parent Feedback Submission Tracker
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                            Track submission status for each feedback form across Mentors, Classes, and Individual Students.
                        </p>
                    </div>

                    {/* Form Selector Dropdown */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <label className="text-xs font-bold text-gray-700 shrink-0 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            Select Feedback Form:
                        </label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-gray-900 shadow-xs cursor-pointer min-w-[240px]"
                        >
                            <option value="all">All Feedback Forms (Combined)</option>
                            {activeTemplates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.title} {t.status === 'Published' ? '🟢 [Active]' : '⚪ [Draft]'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* 2. SUMMARY STATS & RECHARTS VISUALIZATIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side KPI Cards */}
                <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
                    <Card className="p-5 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 border border-indigo-100 shadow-2xs rounded-2xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Total Active Students</p>
                                <h4 className="text-3xl font-black text-gray-900 mt-1">{overallStats.totalTarget}</h4>
                            </div>
                            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 border border-emerald-200/60 shadow-2xs rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-800">Submitted</span>
                            </div>
                            <h4 className="text-2xl font-black text-emerald-900">{overallStats.submittedCount}</h4>
                            <p className="text-[11px] font-bold text-emerald-700 mt-0.5">{overallStats.completionRate}% completion</p>
                        </Card>

                        <Card className="p-4 bg-gradient-to-br from-rose-50/70 to-rose-100/30 border border-rose-200/60 shadow-2xs rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                <span className="text-xs font-bold text-rose-800">Remaining</span>
                            </div>
                            <h4 className="text-2xl font-black text-rose-900">{overallStats.pendingCount}</h4>
                            <p className="text-[11px] font-bold text-rose-700 mt-0.5">{100 - overallStats.completionRate}% pending</p>
                        </Card>
                    </div>

                    <Card className="p-5 bg-white border border-gray-100 shadow-2xs rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-600">Overall Submission Progress</span>
                            <span className="text-sm font-black text-indigo-600">{overallStats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-3 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${overallStats.completionRate}%` }}
                            />
                        </div>
                    </Card>
                </div>

                {/* Center Donut Chart: Submitted vs Remaining */}
                <div className="lg:col-span-3">
                    <Card className="p-5 bg-white border border-gray-100 shadow-2xs rounded-2xl h-full flex flex-col justify-between items-center text-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 w-full text-left">
                            Submission Ratio
                        </h4>

                        <div className="w-full h-44 my-auto relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val, name) => [`${val} students`, name]}
                                        contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-gray-900">{overallStats.completionRate}%</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Rate</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 justify-center text-xs font-bold">
                            <div className="flex items-center gap-1.5 text-emerald-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                Submitted ({overallStats.submittedCount})
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                Remaining ({overallStats.pendingCount})
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Bar Chart: Top Mentors Completion */}
                <div className="lg:col-span-5">
                    <Card className="p-5 bg-white border border-gray-100 shadow-2xs rounded-2xl h-full flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Mentors Submission Breakdown
                            </h4>
                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                Top Mentors
                            </span>
                        </div>

                        <div className="w-full h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mentorBarChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB', fontWeight: 'bold' }} />
                                    <Bar dataKey="submitted" name="Submitted" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="pending" name="Remaining" fill="#F43F5E" radius={[4, 4, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>

            {/* 3. SEARCH, FILTERS & BULK CONTROLS */}
            <Card className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by mentor or student name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 text-sm font-medium bg-gray-50 border-gray-200 focus:bg-white"
                        />
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                statusFilter === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            All Students
                        </button>
                        <button
                            onClick={() => setStatusFilter('submitted')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                statusFilter === 'submitted' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        >
                            Submitted Only ({overallStats.submittedCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                statusFilter === 'pending' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                        >
                            Not Submitted Only ({overallStats.pendingCount})
                        </button>

                        <div className="h-4 w-px bg-gray-200 mx-1 shrink-0" />

                        {/* Bulk Accordion Controls */}
                        <Button
                            variant="secondary"
                            onClick={handleExpandAll}
                            className="px-3 py-1.5 text-xs font-bold gap-1 shrink-0 bg-gray-50 hover:bg-gray-100 text-gray-700"
                        >
                            <Maximize2 className="w-3.5 h-3.5" /> Expand All
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleCollapseAll}
                            className="px-3 py-1.5 text-xs font-bold gap-1 shrink-0 bg-gray-50 hover:bg-gray-100 text-gray-700"
                        >
                            <Minimize2 className="w-3.5 h-3.5" /> Collapse All
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 4. HIERARCHICAL NESTED EXPANDABLE LIST (MENTOR -> CLASS -> STUDENT) */}
            <div className="space-y-4">
                {hierarchicalData.length === 0 ? (
                    <Card className="p-12 text-center bg-white border border-gray-100 rounded-2xl">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-900">No matching mentors or students found</h3>
                        <p className="text-xs text-gray-500 mt-1">Try clearing your search term or adjusting status filter tabs.</p>
                    </Card>
                ) : (
                    hierarchicalData.map(mGroup => {
                        const isMentorExpanded = expandedMentorIds.has(mGroup.mentor.id);
                        const mentorAvatarBg = mGroup.completionRate >= 50 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-100 text-amber-800 border-amber-200';

                        return (
                            <Card key={mGroup.mentor.id} className="overflow-hidden border border-gray-200/80 shadow-xs rounded-2xl transition-all">
                                {/* LEVEL 1: MENTOR ROW HEADER */}
                                <div 
                                    onClick={() => toggleMentorExpand(mGroup.mentor.id)}
                                    className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                                        isMentorExpanded ? 'bg-indigo-50/40 border-b border-indigo-100' : 'bg-white hover:bg-gray-50/80'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <button className="p-1 text-gray-400 hover:text-indigo-600 transition-colors">
                                            {isMentorExpanded ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5" />}
                                        </button>

                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 border ${mentorAvatarBg}`}>
                                            {mGroup.mentor.name ? mGroup.mentor.name.charAt(0) : 'M'}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-extrabold text-base text-gray-900 truncate">
                                                    {mGroup.mentor.name}
                                                </h4>
                                                <span className="text-[11px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                                    {mGroup.totalClasses} {mGroup.totalClasses === 1 ? 'Class' : 'Classes'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium truncate">
                                                {mGroup.mentor.email || mGroup.mentor.username || 'No email registered'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mentor Stats & Progress Pill */}
                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end pl-9 sm:pl-0">
                                        <div className="text-right">
                                            <div className="text-sm font-black text-gray-900">
                                                {mGroup.submittedCount} / {mGroup.totalStudents} <span className="text-xs font-normal text-gray-400">Submitted</span>
                                            </div>
                                            <div className="text-xs font-bold text-gray-500">
                                                {mGroup.pendingCount} Pending
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
                                                mGroup.completionRate >= 50 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                mGroup.completionRate >= 20 ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                'bg-rose-100 text-rose-800 border-rose-200'
                                            }`}>
                                                {mGroup.completionRate}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* LEVEL 2: EXPANDED CLASSES UNDER MENTOR */}
                                {isMentorExpanded && (
                                    <div className="p-4 bg-gray-50/50 space-y-3">
                                        {mGroup.classes.length === 0 ? (
                                            <p className="text-xs text-gray-500 italic py-2 px-4">No active classes or students assigned to this mentor.</p>
                                        ) : (
                                            mGroup.classes.map(clsData => {
                                                const isClassExpanded = expandedClassIds.has(clsData.classObj.id);

                                                return (
                                                    <div key={clsData.classObj.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                                                        {/* CLASS HEADER */}
                                                        <div 
                                                            onClick={() => toggleClassExpand(clsData.classObj.id)}
                                                            className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                                                                isClassExpanded ? 'bg-blue-50/30 border-b border-blue-100' : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <button className="p-0.5 text-gray-400 hover:text-blue-600">
                                                                    {isClassExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4" />}
                                                                </button>
                                                                
                                                                <School className="w-4 h-4 text-indigo-600" />
                                                                <span className="font-extrabold text-sm text-gray-900">
                                                                    Class {clsData.classObj.name} - {clsData.classObj.division}
                                                                </span>

                                                                <span className="text-xs font-bold text-gray-400">
                                                                    ({clsData.totalStudents} Active Students)
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-extrabold text-gray-700">
                                                                    <span className="text-emerald-600">{clsData.submittedCount} Submitted</span>
                                                                    <span className="text-gray-300 mx-1.5">•</span>
                                                                    <span className="text-rose-600">{clsData.pendingCount} Remaining</span>
                                                                </span>

                                                                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                                                                    clsData.completionRate >= 50 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {clsData.completionRate}%
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* LEVEL 3: STUDENTS ROSTER TABLE UNDER CLASS */}
                                                        {isClassExpanded && (
                                                            <div className="overflow-x-auto bg-white">
                                                                {clsData.students.length === 0 ? (
                                                                    <p className="text-xs text-gray-400 italic p-4">No matching students in this class for selected filters.</p>
                                                                ) : (
                                                                    <table className="w-full text-left border-collapse text-xs">
                                                                        <thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                                                            <tr>
                                                                                <th className="p-3 w-12 text-center">#</th>
                                                                                <th className="p-3">Student Name</th>
                                                                                <th className="p-3">Register No</th>
                                                                                <th className="p-3 text-center">Academic Status</th>
                                                                                <th className="p-3 text-right">Feedback Submission Status</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100">
                                                                            {clsData.students.map((student, idx) => {
                                                                                const isSub = student.isSubmitted;
                                                                                const subData = student.submissionData;

                                                                                return (
                                                                                    <tr key={student.id} className={`hover:bg-gray-50/80 transition-colors ${isSub ? 'bg-emerald-50/10' : ''}`}>
                                                                                        <td className="p-3 text-center font-bold text-gray-400">{idx + 1}</td>
                                                                                        <td className="p-3 font-bold text-gray-900">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-[10px]">
                                                                                                    {student.name.charAt(0)}
                                                                                                </div>
                                                                                                {student.name}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-3 font-mono text-gray-500 font-bold">
                                                                                            {student.registerNo || 'N/A'}
                                                                                        </td>
                                                                                        <td className="p-3 text-center">
                                                                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                                                                student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                                                            }`}>
                                                                                                {student.status || 'Active'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="p-3 text-right">
                                                                                            {isSub ? (
                                                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-black text-[11px]">
                                                                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                                                    <span>Submitted</span>
                                                                                                    {subData?.submittedAt && (
                                                                                                        <span className="text-[10px] font-normal text-emerald-700 ml-1">
                                                                                                            ({format(new Date(subData.submittedAt), 'MMM d, h:mm a')})
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px]">
                                                                                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                                                                                    <span>Not Submitted</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ParentFeedbackTracker;
