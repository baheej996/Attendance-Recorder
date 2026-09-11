import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Video, Clock, CalendarDays, ExternalLink, Users, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../../components/ui/Card';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Convert any time string (HH:MM or 12-hour AM/PM) to standard 24-hour "HH:MM"
const normalizeTime24 = (timeStr) => {
    if (!timeStr) return '';
    let str = String(timeStr).trim().toUpperCase();
    
    const isPM = str.includes('PM');
    const isAM = str.includes('AM');
    str = str.replace(/(AM|PM)/g, '').trim();
    
    const parts = str.split(':');
    if (parts.length < 2) return '';
    
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes)) return '';
    
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Helper to convert an HH:MM string and add 1 hour
const addOneHour = (timeStr) => {
    const norm = normalizeTime24(timeStr);
    if (!norm) return '';
    let [hours, minutes] = norm.split(':');
    let h = parseInt(hours, 10);
    h = (h + 1) % 24;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
};

// Convert standard HH:MM or raw time to 12-hour format with AM/PM
const formatTimeAMPM = (timeStr) => {
    const norm = normalizeTime24(timeStr);
    if (!norm) return '?';
    let [h, m] = norm.split(':');
    let hr = parseInt(h, 10);
    let am = hr >= 12 ? 'PM' : 'AM';
    let formattedHr = hr % 12 || 12;
    return `${formattedHr}:${m} ${am}`;
};

// Helper: Check if targetTime (HH:MM) falls between startTime and endTime inclusive of start
const isTimeInRange = (targetTime, startTime, endTime) => {
    const target = normalizeTime24(targetTime);
    const start = normalizeTime24(startTime);
    let end = normalizeTime24(endTime);

    if (!target || !start) return false;
    if (!end) end = addOneHour(start);

    if (end < start) {
        // Crosses midnight (e.g. 23:00 to 01:00)
        return target >= start || target < end;
    }
    return target >= start && target < end;
};

// Local date helpers to avoid UTC offset issues with ISO strings
const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLocalTimeString = (d = new Date()) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const AdminLiveClasses = () => {
    const { classes, liveClasses, mentors, students } = useData();

    // Default to current local date and time
    const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
    const [selectedTime, setSelectedTime] = useState(() => getLocalTimeString());

    const targetDayOfWeek = useMemo(() => {
        if (!selectedDate) return '';
        const parts = selectedDate.split('-').map(Number);
        if (parts.length < 3) return '';
        const [year, month, day] = parts;
        const d = new Date(year, month - 1, day);
        return DAYS_OF_WEEK[d.getDay()];
    }, [selectedDate]);

    // Derived active classes based on selection
    const activeClasses = useMemo(() => {
        if (!classes) return [];

        const filtered = classes.map(cls => {
            const liveConfig = (liveClasses || []).find(lc => lc.classId === cls.id);
            
            // Effective Schedule Calculation
            // Priority: Class Defaults (authoritative schedule from Class Management) > LiveClass overrides
            const effectiveDays = (cls.days && cls.days.length > 0)
                                    ? cls.days 
                                    : (liveConfig?.selectedDays && liveConfig.selectedDays.length > 0 ? liveConfig.selectedDays : []);

            const effectiveTime = cls.startTime ? cls.startTime : (liveConfig?.time || '');

            let effectiveEndTime = '';
            if (cls.endTime) {
                effectiveEndTime = cls.endTime;
            } else if (effectiveTime) {
                effectiveEndTime = addOneHour(effectiveTime);
            }

            const isConfigEnabled = liveConfig?.isEnabled === true;
            const link = liveConfig?.link || '';

            // Get Mentors
            const assignedMentors = mentors.filter(m => (m.assignedClassIds || []).includes(cls.id));
            const mentorName = assignedMentors.length > 0 ? assignedMentors.map(m => m.name).join(', ') : 'Unassigned';

            // Get Student Count
            const studentCount = students.filter(s => s.classId === cls.id && s.status === 'Active').length;

            return {
                ...cls,
                liveConfig,
                effectiveDays,
                effectiveTime,
                effectiveEndTime,
                isConfigEnabled,
                link,
                mentorName,
                studentCount
            };
        }).filter(cls => {
            // Strictly filter by Day AND Time
            if (!targetDayOfWeek) return false;
            
            const matchesDay = cls.effectiveDays.includes(targetDayOfWeek);
            const matchesTime = selectedTime && cls.effectiveTime ? isTimeInRange(selectedTime, cls.effectiveTime, cls.effectiveEndTime) : false;

            return matchesDay && matchesTime;
        }).sort((a, b) => {
            // Sort by standard sorting logic
            const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true });
            if (nameCompare !== 0) return nameCompare;
            return a.division.localeCompare(b.division);
        });

        return filtered;
    }, [classes, liveClasses, mentors, students, selectedDate, selectedTime, targetDayOfWeek]);

    // Derived available mentors based on active classes
    const availableMentors = useMemo(() => {
        if (!mentors || !activeClasses) return [];
        
        const busyMentorIds = new Set();
        activeClasses.forEach(cls => {
            const assignedMentors = mentors.filter(m => (m.assignedClassIds || []).includes(cls.id));
            assignedMentors.forEach(m => busyMentorIds.add(m.id));
        });

        return mentors.filter(m => !busyMentorIds.has(m.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [mentors, activeClasses]);

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-300">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <Video className="w-6 h-6" />
                        </div>
                        Live Classes Monitor
                    </h2>
                    <p className="text-gray-500 mt-2 max-w-xl">
                        View real-time active classes or use the picker below to forecast schedules for specific days and times across the institution.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 w-full md:w-auto">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Selected Date</label>
                        <div className="relative">
                            <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-[160px]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Selected Time</label>
                        <div className="relative">
                            <Clock className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input 
                                type="time" 
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-[130px]"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                        <button 
                            onClick={() => {
                                const resetNow = new Date();
                                setSelectedDate(getLocalDateString(resetNow));
                                setSelectedTime(getLocalTimeString(resetNow));
                            }}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors border border-indigo-100 mt-5"
                        >
                            Reset to Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Header */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        Classes Running on <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-4">{targetDayOfWeek}</span> at <span className="text-indigo-600">{formatTimeAMPM(selectedTime)}</span>
                    </h3>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                        {activeClasses.length} Match{activeClasses.length !== 1 ? 'es' : ''}
                    </span>
                </div>

                {activeClasses.length === 0 ? (
                    <div className="w-full bg-white border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Video className="w-10 h-10 text-gray-300" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-700 mb-1">No Classes Scheduled</h4>
                        <p className="text-gray-500 max-w-sm">
                            There are currently no classes scheduled to run during the selected day and time period.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeClasses.map((cls) => {
                            const showLiveLink = cls.isConfigEnabled && cls.link;
                            
                            return (
                                <Card key={cls.id} className={clsx("overflow-hidden group hover:border-indigo-200 transition-all shadow-sm border-2", showLiveLink ? 'border-gray-100' : 'border-amber-100/50')}>
                                    <div className={clsx("p-4 border-b", showLiveLink ? "bg-gradient-to-r from-gray-50 to-white border-gray-100" : "bg-amber-50/30 border-amber-50")}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-lg font-black text-gray-900 leading-tight">Class {cls.name}</h4>
                                                <div className="inline-block px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded mt-1 uppercase tracking-widest">
                                                    Division {cls.division}
                                                </div>
                                            </div>
                                            {showLiveLink ? (
                                                <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold border border-red-100 shadow-sm animate-pulse-slow">
                                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                    LIVE
                                                </div>
                                            ) : (
                                                <div className="text-amber-500 p-1 bg-amber-50 rounded-md border border-amber-100" title="Link not enabled or missing">
                                                    <AlertTriangle className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                                <Users className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mentor</p>
                                                <p className="font-semibold text-gray-800 truncate">{cls.mentorName}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Schedule</p>
                                                <p className="font-semibold text-gray-800">
                                                    {formatTimeAMPM(cls.effectiveTime)} - {formatTimeAMPM(cls.effectiveEndTime)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {[...Array(Math.min(3, cls.studentCount))].map((_, i) => (
                                                    <div key={i} className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                        <Users className="w-3 h-3" />
                                                    </div>
                                                ))}
                                                {cls.studentCount > 3 && (
                                                    <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                        +{cls.studentCount - 3}
                                                    </div>
                                                )}
                                                {cls.studentCount === 0 && (
                                                    <span className="text-xs font-semibold text-gray-400 ml-2">No Students</span>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                                {cls.studentCount} Total
                                            </span>
                                        </div>
                                    </div>

                                    {showLiveLink ? (
                                        <a
                                            href={cls.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full text-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm group-hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] duration-300"
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                Join Live Session <ExternalLink className="w-4 h-4" />
                                            </span>
                                        </a>
                                    ) : (
                                        <div className="w-full text-center px-4 py-3 bg-gray-50 text-gray-500/70 font-semibold text-sm border-t border-gray-100 flex items-center justify-center gap-2 select-none">
                                            <Info className="w-4 h-4" /> Link Not Configured
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Available Mentors Section */}
            <div className="mt-8 border-t border-gray-100 pt-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        Available Mentors (No classes at this time)
                    </h3>
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                        {availableMentors.length} Mentor{availableMentors.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {availableMentors.length === 0 ? (
                    <div className="w-full bg-white border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-10 h-10 text-gray-300" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-700 mb-1">No Available Mentors</h4>
                        <p className="text-gray-500 max-w-sm">
                            All mentors are currently assigned to running classes during the selected time.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {availableMentors.map((mentor) => (
                            <Card key={mentor.id} className="p-4 border border-gray-100 shadow-sm hover:border-indigo-100 transition-all flex items-center gap-4 bg-white hover:bg-indigo-50/30">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                                    <Users className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{mentor.name}</h4>
                                    <p className="text-[11px] text-gray-500 font-semibold truncate">{mentor.email || 'Mentor'}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLiveClasses;
