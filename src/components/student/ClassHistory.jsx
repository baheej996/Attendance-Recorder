import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { History, BookOpen, Filter, Calendar, Info } from 'lucide-react';

const ClassHistory = () => {
    const { currentUser, logEntries, classes, subjects, logLimit, loadMoreLogs } = useData();
    const [selectedSubject, setSelectedSubject] = useState('all');

    // 1. Identify Student's Class
    const studentClass = useMemo(() => {
        return classes.find(c => c.id === currentUser?.classId);
    }, [classes, currentUser]);

    // 2. Filter Logs for THIS Class
    const classLogs = useMemo(() => {
        if (!currentUser?.classId) return [];
        return logEntries
            .filter(log => log.classId === currentUser.classId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [logEntries, currentUser]);

    // 3. Filter by Subject (if selected)
    const displayedLogs = useMemo(() => {
        if (selectedSubject === 'all') return classLogs;
        return classLogs.filter(log => log.subjectId === selectedSubject);
    }, [classLogs, selectedSubject]);

    // 4. Get Unique Subjects present in the logs (for filter dropdown)
    const availableSubjects = useMemo(() => {
        const subjectIds = [...new Set(classLogs.map(l => l.subjectId))];
        return subjects.filter(s => subjectIds.includes(s.id));
    }, [classLogs, subjects]);

    if (!studentClass) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
                <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Class Not Assigned</h3>
                <p className="text-gray-500 mt-2">Please contact your administrator to assign you to a class.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2 md:gap-3">
                        <History className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" />
                        Class Log
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium mt-0.5 md:mt-1">
                        Recent entries for <span className="font-black text-indigo-600">{studentClass.name}-{studentClass.division}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="bg-transparent text-xs font-black uppercase tracking-widest border-none focus:ring-0 p-0 text-gray-700 min-w-[120px] flex-1 md:flex-none"
                    >
                        <option value="all">Every Subject</option>
                        {availableSubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                {displayedLogs.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">No Logs Found</h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                            {selectedSubject === 'all'
                                ? "No entries have been recorded yet."
                                : "No entries for this subject."}
                        </p>
                    </div>
                ) : (
                    displayedLogs.map((log) => (
                        <div key={log.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
                            <div className="flex flex-row gap-5">
                                {/* Date Box */}
                                <div className="shrink-0">
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-2.5 text-center min-w-[70px]">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                            {new Date(log.timestamp).toLocaleString('default', { month: 'short' })}
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 leading-none">
                                            {new Date(log.timestamp).getDate()}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                                            {log.subjectName}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                {log.chapter}
                                            </span>
                                            {log.heading && (
                                                <span className="text-xs font-bold text-gray-400">{log.heading}</span>
                                            )}
                                        </div>
                                    </div>

                                    {log.remarks && (
                                        <div className="relative bg-amber-50/50 p-4 rounded-2xl border border-amber-100/30 text-gray-600 text-xs italic leading-relaxed">
                                            {log.remarks}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {logEntries.length >= logLimit && (
                    <div className="pt-4 flex justify-center">
                        <button 
                            onClick={loadMoreLogs} 
                            className="w-full py-4 bg-white hover:bg-indigo-50 border-2 border-indigo-100 text-indigo-600 font-black text-xs uppercase tracking-widest rounded-3xl transition-all duration-300 shadow-sm"
                        >
                            Load More Entries
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassHistory;
