import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Video, Clock, CalendarDays, ExternalLink, Users, AlertTriangle, ChevronRight, PlayCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../../components/ui/Card';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to convert an HH:MM string and add 1 hour
const addOneHour = (timeStr) => {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    h = (h + 1) % 24;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
};

// Convert standard HH:MM to 12-hour format with AM/PM
const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return '?';
    let [h, m] = timeStr.split(':');
    let hr = parseInt(h);
    let am = hr >= 12 ? 'PM' : 'AM';
    let formattedHr = hr % 12 || 12;
    return `${formattedHr}:${m} ${am}`;
};

// Helper: Check if targetTime (HH:MM) falls between startTime and endTime inclusive of start
const isTimeInRange = (targetTime, startTime, endTime) => {
    if (!targetTime || !startTime) return false;
    if (!endTime) endTime = addOneHour(startTime);

    // Simple string comparison works for HH:MM unless crossing midnight. 
    // We assume classes don't wrap tightly around midnight for simple comparison.
    if (endTime < startTime) {
        // Crosses midnight (e.g. 23:00 to 01:00)
        return targetTime >= startTime || targetTime < endTime;
    }
    return targetTime >= startTime && targetTime < endTime;
};

const AdminLiveClasses = () => {
    const { classes, liveClasses, mentors, students } = useData();

    // Default to current date and time (IST is ideal, but using local system time is practical for the picker default)
    const now = new Date();
    const defaultDate = now.toISOString().split('T')[0];
    const defaultTime = now.toTimeString().split(':').slice(0, 2).join(':');

    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [selectedTime, setSelectedTime] = useState(defaultTime);

    const targetDayOfWeek = useMemo(() => {
        if (!selectedDate) return '';
        const d = new Date(selectedDate);
        return DAYS_OF_WEEK[d.getDay()];
    }, [selectedDate]);

    // Derived active classes based on selection
    const activeClasses = useMemo(() => {
        if (!classes) return [];

        const filtered = classes.map(cls => {
            const liveConfig = (liveClasses || []).find(lc => lc.classId === cls.id);
            
            // Effective Schedule Calculation
            // Priority: LiveClass overrides > Class Defaults
            const effectiveDays = liveConfig?.selectedDays && liveConfig.selectedDays.length > 0 
                                    ? liveConfig.selectedDays 
                                    : (cls.days || []);
            const effectiveTime = liveConfig?.time || cls.startTime || '';
            const effectiveEndTime = liveConfig?.time ? addOneHour(liveConfig.time) : cls.endTime || addOneHour(cls.startTime);
            const isConfigEnabled = liveConfig?.isEnabled === true;
            const link = liveConfig?.link || '';

            // Get Mentors
            const assignedMentors = mentors.filter(m => (m.assignedClassIds || []).includes(cls.id));
            const mentorName = assignedMentors.length > 0 ? assignedMentors.map(m => m.name).join(', ') : 'Unassigned';

            // Get Student Count
            const studentCount = students.filter(s => s.classId === cls.id).length;

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
                                setSelectedDate(resetNow.toISOString().split('T')[0]);
                                setSelectedTime(resetNow.toTimeString().split(':').slice(0, 2).join(':'));
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
        </div>
    );
};

export default AdminLiveClasses;
