import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { BookOpen, Search, Calendar, CheckCircle, Clock, CheckSquare, Square, ChevronDown, ChevronRight, Users, School } from 'lucide-react';
import clsx from 'clsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ProgressBar = ({ value }) => (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
            className={clsx('h-2 rounded-full transition-all duration-500',
                value === 100 ? 'bg-emerald-500' : value > 50 ? 'bg-amber-400' : 'bg-rose-400'
            )}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

const SyllabusTracker = () => {
    const { classes, subjects, syllabi, syllabusStatuses, mentors } = useData();
    const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGrade, setFilterGrade] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expanded, setExpanded] = useState({});

    const uniqueGrades = useMemo(() =>
        [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [classes]
    );

    // Build: Mentor → Class → Subject → Divisions
    const mentorData = useMemo(() => {
        const monthlySyllabi = syllabi.filter(s => s.month === selectedMonth);
        const mentorMap = {};

        monthlySyllabi.forEach(syl => {
            const gradeName = syl.gradeName;
            const subjectName = syl.subjectName;
            const requiredChapters = (syl.chapters || []).map(String);
            
            if (filterGrade !== 'all' && gradeName !== filterGrade) return;

            const gradeClasses = classes.filter(c => c.name === gradeName);
            
            gradeClasses.forEach(cls => {
                const sub = subjects.find(s => s.classId === cls.id && s.name.toLowerCase() === subjectName.toLowerCase());
                if (!sub) return;

                const statusId = `${cls.id}_${sub.id}`;
                const status = syllabusStatuses.find(s => s.id === statusId);
                
                const normalizeChapter = ch => String(ch).toLowerCase().replace(/chapter\s*/g, '').replace(/ch\.*\s*/g, '').trim();
                const completedChapters = (status?.completedChapters || []).map(normalizeChapter);
                
                const completedRequired = requiredChapters.filter(ch => completedChapters.includes(normalizeChapter(ch)));
                const progress = requiredChapters.length > 0 ? Math.round((completedRequired.length / requiredChapters.length) * 100) : 0;

                const mentor = mentors.find(m => (m.assignedClassIds || []).includes(cls.id));
                const mentorKey = mentor ? mentor.id : '__unassigned__';
                const mentorName = mentor ? mentor.name : 'Unassigned';

                if (!mentorMap[mentorKey]) {
                    mentorMap[mentorKey] = { mentorId: mentorKey, mentorName, classRowsMap: {} };
                }
                const mObj = mentorMap[mentorKey];

                if (!mObj.classRowsMap[gradeName]) {
                    mObj.classRowsMap[gradeName] = { gradeName, subjectRowsMap: {} };
                }
                const cObj = mObj.classRowsMap[gradeName];

                if (!cObj.subjectRowsMap[subjectName]) {
                    cObj.subjectRowsMap[subjectName] = { subjectName, requiredChapters, divisions: [] };
                }
                const sObj = cObj.subjectRowsMap[subjectName];

                sObj.divisions.push({
                    classId: cls.id,
                    division: cls.division,
                    completedRequired,
                    requiredChapters,
                    progress,
                    isCompleted: requiredChapters.length > 0 && completedRequired.length === requiredChapters.length,
                });
            });
        });

        const result = [];
        
        Object.values(mentorMap).forEach(mObj => {
            const classRows = [];

            Object.values(mObj.classRowsMap).forEach(cObj => {
                const subjectRows = [];
                Object.values(cObj.subjectRowsMap).forEach(sObj => {
                    const allDone = sObj.divisions.length > 0 && sObj.divisions.every(d => d.isCompleted);
                    
                    if (filterStatus === 'completed' && !allDone) return;
                    if (filterStatus === 'pending' && allDone) return;

                    sObj.completedDivs = sObj.divisions.filter(d => d.isCompleted).length;
                    sObj.totalDivs = sObj.divisions.length;
                    subjectRows.push(sObj);
                });

                if (subjectRows.length > 0) {
                    // Sort subjects alphabetically for consistent order
                    subjectRows.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
                    classRows.push({
                        gradeName: cObj.gradeName,
                        subjectRows,
                    });
                }
            });

            if (classRows.length > 0) {
                // Sort classes
                classRows.sort((a, b) => a.gradeName.localeCompare(b.gradeName, undefined, { numeric: true }));

                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const mMatch = mObj.mentorName.toLowerCase().includes(q);
                    const gMatch = classRows.some(cr => cr.gradeName.toLowerCase().includes(q));
                    if (mMatch || gMatch) {
                        result.push({ mentorId: mObj.mentorId, mentorName: mObj.mentorName, classRows });
                    }
                } else {
                    result.push({ mentorId: mObj.mentorId, mentorName: mObj.mentorName, classRows });
                }
            }
        });

        result.sort((a, b) => a.mentorName.localeCompare(b.mentorName));
        return result;
    }, [syllabi, classes, subjects, syllabusStatuses, mentors, selectedMonth, filterGrade, filterStatus, searchQuery]);

    const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));
    const isOpen = (key) => key in expanded ? expanded[key] : true;

    // Summary
    const allDivs = mentorData.flatMap(m => m.classRows.flatMap(c => c.subjectRows.flatMap(s => s.divisions)));
    const completedCount = allDivs.filter(d => d.isCompleted).length;

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 sticky top-[64px] z-20 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Syllabus Tracker</h2>
                    <p className="text-sm text-gray-500">Track mentor-wise subject completion per class & month</p>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative col-span-2 md:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Search class or mentor..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Classes</option>
                    {uniqueGrades.map(g => <option key={g} value={g}>Class {g}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Divisions Tracked', value: allDivs.length, icon: School, color: 'indigo' },
                    { label: 'Completed', value: completedCount, icon: CheckCircle, color: 'emerald' },
                    { label: 'Pending', value: allDivs.length - completedCount, icon: Clock, color: 'amber' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                        <div className={`w-10 h-10 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center shrink-0`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                            <p className="text-xl font-extrabold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content */}
            {mentorData.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No syllabus data for {selectedMonth}.</p>
                    <p className="text-sm text-gray-400 mt-1">Create syllabus plans in the Syllabus Manager first.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {mentorData.map(mentor => (
                        <div key={mentor.mentorId} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            {/* Mentor Header */}
                            <button
                                onClick={() => toggle(`mentor_${mentor.mentorId}`)}
                                className="w-full flex items-center justify-between px-5 py-4 bg-indigo-50 border-b border-indigo-100 hover:bg-indigo-100/60 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                                        <Users className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-gray-900 text-base">{mentor.mentorName}</h3>
                                        <p className="text-xs text-indigo-500 font-medium">{mentor.classRows.length} class{mentor.classRows.length !== 1 ? 'es' : ''} assigned</p>
                                    </div>
                                </div>
                                {isOpen(`mentor_${mentor.mentorId}`)
                                    ? <ChevronDown className="w-5 h-5 text-indigo-400" />
                                    : <ChevronRight className="w-5 h-5 text-indigo-400" />
                                }
                            </button>

                            {isOpen(`mentor_${mentor.mentorId}`) && (
                                <div className="divide-y divide-gray-100">
                                    {mentor.classRows.map(cls => (
                                        <div key={cls.gradeName} className="bg-gray-50/50">
                                            {/* Grade Header */}
                                            <button
                                                onClick={() => toggle(`cls_${mentor.mentorId}_${cls.gradeName}`)}
                                                className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-gray-100/50 transition-colors text-left border-b border-gray-100"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                                        <School className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-sm">Class {cls.gradeName}</p>
                                                        <p className="text-[11px] text-gray-400 font-medium">
                                                            {cls.subjectRows.length} subject{cls.subjectRows.length !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isOpen(`cls_${mentor.mentorId}_${cls.gradeName}`)
                                                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                                    : <ChevronRight className="w-4 h-4 text-gray-400" />
                                                }
                                            </button>

                                            {isOpen(`cls_${mentor.mentorId}_${cls.gradeName}`) && (
                                                <div className="divide-y divide-gray-100 bg-white">
                                                    {cls.subjectRows.map(sub => (
                                                        <div key={sub.subjectName}>
                                                            {/* Subject Header */}
                                                            <button
                                                                onClick={() => toggle(`sub_${mentor.mentorId}_${cls.gradeName}_${sub.subjectName}`)}
                                                                className="w-full flex items-center justify-between px-8 py-3 hover:bg-gray-50 transition-colors text-left"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 rounded-md bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                                                                        <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-gray-800 text-sm">{sub.subjectName}</p>
                                                                        <p className="text-[10px] text-gray-400 font-medium">
                                                                            {sub.completedDivs}/{sub.totalDivs} divisions completed
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="hidden md:flex gap-1">
                                                                        {sub.requiredChapters.slice(0, 6).map(ch => (
                                                                            <span key={ch} className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center border bg-gray-50 text-gray-400 border-gray-200">
                                                                                {ch}
                                                                            </span>
                                                                        ))}
                                                                        {sub.requiredChapters.length > 6 && (
                                                                            <span className="text-[10px] text-gray-400 font-bold self-center">+{sub.requiredChapters.length - 6}</span>
                                                                        )}
                                                                    </div>
                                                                    {isOpen(`sub_${mentor.mentorId}_${cls.gradeName}_${sub.subjectName}`)
                                                                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                                                        : <ChevronRight className="w-4 h-4 text-gray-400" />
                                                                    }
                                                                </div>
                                                            </button>

                                                            {isOpen(`sub_${mentor.mentorId}_${cls.gradeName}_${sub.subjectName}`) && (
                                                                <div className="px-8 pb-4 pt-1 space-y-3">
                                                                    {/* Target chapters */}
                                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest self-center mr-1">Chapters:</span>
                                                                        {sub.requiredChapters.map(ch => (
                                                                            <span key={ch} className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold">
                                                                                Ch {ch}
                                                                            </span>
                                                                        ))}
                                                                    </div>

                                                                    {/* Division rows */}
                                                                    <div className="space-y-2">
                                                                        {sub.divisions.map(div => (
                                                                            <div key={div.classId} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                                {/* Division chip */}
                                                                                <div className={clsx(
                                                                                    'w-20 shrink-0 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-extrabold border',
                                                                                    div.isCompleted
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                                                        : 'bg-white text-gray-500 border-gray-200'
                                                                                )}>
                                                                                    {div.isCompleted && <CheckCircle className="w-3 h-3 shrink-0" />}
                                                                                    Div {div.division}
                                                                                </div>

                                                                                {/* Progress bar */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <ProgressBar value={div.progress} />
                                                                                </div>

                                                                                {/* Percentage */}
                                                                                <span className={clsx(
                                                                                    'text-xs font-extrabold w-10 text-right shrink-0',
                                                                                    div.progress === 100 ? 'text-emerald-600' : div.progress > 50 ? 'text-amber-600' : 'text-rose-500'
                                                                                )}>
                                                                                    {div.progress}%
                                                                                </span>

                                                                                {/* Chapter chips for this division */}
                                                                                <div className="hidden lg:flex gap-1 shrink-0">
                                                                                    {sub.requiredChapters.map(ch => {
                                                                                        const done = div.completedRequired.includes(String(ch));
                                                                                        return (
                                                                                            <span key={ch} className={clsx(
                                                                                                'w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center border',
                                                                                                done ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-gray-300 border-gray-200'
                                                                                            )}>
                                                                                                {ch}
                                                                                            </span>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SyllabusTracker;
