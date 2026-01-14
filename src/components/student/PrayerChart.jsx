import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, CheckCircle, XCircle, ChevronLeft, ChevronRight, Moon, Sun, Sunrise, Sunset, Clock, Save, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const PRAYERS = [
    { id: 'fajr', label: 'Fajr', icon: Sunrise, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'dhuhr', label: 'Dhuhr', icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { id: 'asr', label: 'Asr', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'maghrib', label: 'Maghrib', icon: Sunset, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'isha', label: 'Isha', icon: Moon, color: 'text-purple-500', bg: 'bg-purple-50' }
];

const PrayerChart = () => {
    const { currentUser, addPrayerRecord, getPrayerRecordsByStudent } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [stats, setStats] = useState({ f: false, d: false, a: false, m: false, i: false });
    const [loading, setLoading] = useState(true);

    const records = getPrayerRecordsByStudent(currentUser?.id || '');

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const record = records.find(r => r.date === dateStr);

        if (record && record.prayers) {
            setStats(record.prayers);
        } else {
            setStats({ f: false, d: false, a: false, m: false, i: false });
        }
        setLoading(false);
    }, [selectedDate, currentUser, records]);

    const handleToggle = (prayerId) => {
        setStats(prev => ({ ...prev, [prayerId.charAt(0)]: !prev[prayerId.charAt(0)] }));
    };

    const handleSave = () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        addPrayerRecord({
            studentId: currentUser.id,
            date: dateStr,
            prayers: stats
        });
        // We can add a toast notification here if we had a toast system
    };

    const getWeeklyProgress = () => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = records.find(r => r.date === dateStr);
            const count = record ? Object.values(record.prayers).filter(Boolean).length : 0;
            return { date: day, count };
        });
    };

    const weeklyData = getWeeklyProgress();

    if (!currentUser) return <div>Loading...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prayer Chart</h1>
                    <p className="text-gray-500">Track your daily prayers</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setSelectedDate(curr => subDays(curr, 1))}
                        className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 px-4 font-medium text-gray-900 min-w-[140px] justify-center">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
                    </div>
                    <button
                        onClick={() => setSelectedDate(curr => addDays(curr, 1))}
                        className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
                        disabled={isSameDay(selectedDate, new Date())} // Optional: prevent future dates?
                    >
                        <ChevronRight className={`w-5 h-5 ${isSameDay(selectedDate, new Date()) ? 'text-gray-300' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Daily Checklist */}
                <div className="md:col-span-2 space-y-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Daily Checklist</h2>
                            <span className="text-sm font-medium px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                {Object.values(stats).filter(Boolean).length} / 5 Completed
                            </span>
                        </div>

                        <div className="grid gap-4">
                            {PRAYERS.map((prayer) => {
                                const Icon = prayer.icon;
                                const isCompleted = stats[prayer.id.charAt(0)];
                                return (
                                    <div
                                        key={prayer.id}
                                        onClick={() => handleToggle(prayer.id)}
                                        className={clsx(
                                            "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                            isCompleted
                                                ? "border-green-500 bg-green-50"
                                                : "border-transparent bg-gray-50 hover:bg-gray-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={clsx("p-2 rounded-lg", prayer.bg, prayer.color)}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{prayer.label}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {isCompleted ? 'Completed' : 'Not marked yet'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={clsx(
                                            "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                                            isCompleted ? "bg-green-500 border-green-500" : "border-gray-300"
                                        )}>
                                            {isCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                            <Button onClick={handleSave} className="gap-2">
                                <Save className="w-4 h-4" />
                                Save Changes
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Weekly Summary */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Weekly Progress</h2>
                        <div className="space-y-4">
                            {weeklyData.map((day) => {
                                const isToday = isSameDay(day.date, new Date());
                                const isSelected = isSameDay(day.date, selectedDate);
                                return (
                                    <div
                                        key={day.date.toString()}
                                        onClick={() => setSelectedDate(day.date)}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                                            isSelected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                                day.count === 5 ? "bg-green-100 text-green-700" :
                                                    day.count > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {format(day.date, 'EE').charAt(0)}
                                            </div>
                                            <div>
                                                <p className={clsx("text-sm font-medium", isToday ? "text-indigo-600" : "text-gray-900")}>
                                                    {format(day.date, 'EEEE')}
                                                </p>
                                                <p className="text-xs text-gray-500">{format(day.date, 'MMM d')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={clsx(
                                                        "w-1.5 h-6 rounded-full",
                                                        i < day.count ? "bg-green-400" : "bg-gray-200"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Fun Stats */}
                    <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-5 h-5 text-yellow-300" />
                            <h3 className="font-bold">Streak Master</h3>
                        </div>
                        <p className="text-indigo-100 text-sm mb-4">You have completed all 5 prayers for {weeklyData.filter(d => d.count === 5).length} days this week!</p>
                        <div className="w-full bg-white/20 rounded-full h-2">
                            <div
                                className="bg-yellow-400 h-2 rounded-full"
                                style={{ width: `${(weeklyData.filter(d => d.count === 5).length / 7) * 100}%` }}
                            ></div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PrayerChart;
