import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { 
    Search, 
    Calendar, 
    ClipboardCheck, 
    Activity, 
    AlertCircle, 
    CheckCircle, 
    Clock, 
    BarChart2, 
    Mail,
    ChevronRight,
    Star,
    Award
} from 'lucide-react';
import { clsx } from 'clsx';

const MentorEvaluation = () => {
    const { 
        mentors, 
        classes, 
        attendance, 
        activities, 
        logEntries, 
        quranRecitations,
        addNotification,
        currentUser,
        requireFeature
    } = useData();

    const [search, setSearch] = useState('');

    React.useEffect(() => {
        const un1 = requireFeature('attendance');
        const un2 = requireFeature('activities');
        const un3 = requireFeature('quran');
        const un4 = requireFeature('logs');
        const un5 = requireFeature('evaluation');
        return () => {
            un1();
            un2();
            un3();
            un4();
            un5();
        };
    }, [requireFeature]);

    const mentorStats = useMemo(() => {
        return mentors.filter(m => 
            m.name?.toLowerCase().includes(search.toLowerCase()) || 
            m.email?.toLowerCase().includes(search.toLowerCase())
        ).map(mentor => {
            const mentorClasses = classes.filter(c => (mentor.assignedClassIds || []).includes(c.id));
            
            // 1. Attendance Stats
            const mentorAttendance = attendance.filter(a => 
                a.mentorId === mentor.id || (mentor.assignedClassIds || []).includes(a.classId)
            );
            const sortedAttendance = [...mentorAttendance].sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastAttendanceDate = sortedAttendance[0]?.date;
            
            // Calc recency score (Green if today/yesterday, Yellow if < 3 days, Red if > 3 days)
            let attendanceStatus = 'red';
            if (lastAttendanceDate) {
                const diffDays = Math.floor((new Date() - new Date(lastAttendanceDate)) / (1000 * 60 * 60 * 24));
                if (diffDays <= 1) attendanceStatus = 'green';
                else if (diffDays <= 3) attendanceStatus = 'yellow';
            }

            // 2. Activity Stats
            // Activities usually belong to a class, but we check creators or class assignments
            const mentorActivities = activities.filter(act => 
                act.mentorId === mentor.id || (mentor.assignedClassIds || []).includes(act.classId)
            );

            // 3. Logbook Stats
            const mentorLogs = logEntries.filter(log => log.mentorId === mentor.id);

            // 4. Quran Stats
            const mentorClassIds = mentor.assignedClassIds || [];
            const mentorQuranEntries = quranRecitations.filter(q => 
                mentorClassIds.includes(q.classId)
            );

            // overall Engagement score (0-100)
            const engagementScore = Math.min(100, (
                (lastAttendanceDate ? 40 : 0) + 
                (mentorActivities.length > 0 ? 30 : 0) + 
                (mentorLogs.length > 0 ? 15 : 0) + 
                (mentorQuranEntries.length > 0 ? 15 : 0)
            ));

            return {
                ...mentor,
                classes: mentorClasses,
                lastAttendanceDate,
                attendanceStatus,
                activitiesCount: mentorActivities.length,
                logsCount: mentorLogs.length,
                quranCount: mentorQuranEntries.length,
                engagementScore
            };
        }).sort((a, b) => b.engagementScore - a.engagementScore);
    }, [mentors, search, attendance, activities, logEntries, quranRecitations, classes]);

    const handleRemind = async (mentor) => {
        try {
            await addNotification({
                title: 'Attendance & Activity Reminder',
                message: `Assalamu alaikum ${mentor.name}. We noticed you haven't updated your class records recently. Please ensure students' attendance and activities are recorded daily.`,
                audience: 'specific_mentor',
                targetId: mentor.id,
                senderId: 'admin',
                senderName: 'Administrator',
                senderRole: 'Admin', // Capitalized for UI consistency
                type: 'admin'
            });
            alert(`✅ Reminder successfully sent to ${mentor.name}. They will see this in their Inbox.`);
        } catch (err) {
            console.error("Failed to send reminder:", err);
            alert("Failed to send reminder. Please check your internet connection.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mentor Evaluation Hub</h2>
                    <p className="text-gray-500 text-sm">Monitor feature utilization and engagement levels</p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        placeholder="Search mentors..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 border-none shadow-sm ring-1 ring-gray-100 focus:ring-indigo-500 bg-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-indigo-600 text-white shadow-indigo-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Top Performing</p>
                        <h3 className="text-2xl font-black">{mentorStats.filter(m => m.engagementScore > 80).length}</h3>
                    </div>
                    <Award className="w-8 h-8 opacity-40" />
                </Card>
                <Card className="p-4 bg-green-500 text-white shadow-green-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Daily Active</p>
                        <h3 className="text-2xl font-black">{mentorStats.filter(m => m.attendanceStatus === 'green').length}</h3>
                    </div>
                    <CheckCircle className="w-8 h-8 opacity-40" />
                </Card>
                <Card className="p-4 bg-amber-500 text-white shadow-amber-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Need Attention</p>
                        <h3 className="text-2xl font-black">{mentorStats.filter(m => m.attendanceStatus === 'red').length}</h3>
                    </div>
                    <AlertCircle className="w-8 h-8 opacity-40" />
                </Card>
                <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Mentors</p>
                        <h3 className="text-2xl font-black text-gray-900">{mentors.length}</h3>
                    </div>
                    <BarChart2 className="w-8 h-8 text-indigo-100 group-hover:text-indigo-200 transition-colors" />
                </Card>
            </div>

            <Card className="overflow-hidden border-none shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Mentor / Classes</th>
                                <th className="px-6 py-4">Attendance</th>
                                <th className="px-6 py-4">Activities</th>
                                <th className="px-6 py-4">Quran/Log</th>
                                <th className="px-6 py-4">Engagement</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {mentorStats.map(mentor => (
                                <tr key={mentor.id} className="hover:bg-indigo-50/10 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center font-black text-indigo-400 shadow-sm">
                                                {mentor.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{mentor.name}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">
                                                    {mentor.classes.map(c => `${c.name}-${c.division}`).join(', ') || 'No classes'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className={clsx(
                                                    "w-2 h-2 rounded-full",
                                                    mentor.attendanceStatus === 'green' ? "bg-green-500 animate-pulse" :
                                                    mentor.attendanceStatus === 'yellow' ? "bg-amber-500" : "bg-red-500"
                                                )} />
                                                <span className="font-bold text-gray-700 text-xs uppercase">
                                                    {mentor.attendanceStatus === 'green' ? 'Active' : 
                                                     mentor.attendanceStatus === 'yellow' ? 'Delayed' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {mentor.lastAttendanceDate ? new Date(mentor.lastAttendanceDate).toLocaleDateString() : 'Never'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                                <Activity className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-gray-900">{mentor.activitiesCount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5" title="Quran Tracking Entries">
                                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-xs font-bold text-gray-600">{mentor.quranCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Logbook Entries">
                                                <ClipboardCheck className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-xs font-bold text-gray-600">{mentor.logsCount}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="w-full max-w-[100px]">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-gray-400">{mentor.engagementScore}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={clsx(
                                                        "h-full transition-all duration-1000",
                                                        mentor.engagementScore > 80 ? "bg-green-500" :
                                                        mentor.engagementScore > 50 ? "bg-indigo-500" : "bg-amber-500"
                                                    )}
                                                    style={{ width: `${mentor.engagementScore}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <button 
                                            onClick={() => handleRemind(mentor)}
                                            className="p-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"
                                            title="Send Reminder Notification"
                                        >
                                            <Mail className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 flex items-center gap-6">
                <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <Star className="w-8 h-8 text-amber-500 animate-slow-spin" />
                </div>
                <div>
                    <h4 className="font-bold text-indigo-900">How is this calculated?</h4>
                    <p className="text-sm text-indigo-600/70 max-w-2xl mt-1 leading-relaxed">
                        Engagement is a weighted average of **Attendance recency (40%)**, **Activities assigned (30%)**, and **Daily logs/Quran tracking (30%)**. Use the reminder tool to nudge mentors who haven't updated their records in over 3 days.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MentorEvaluation;
