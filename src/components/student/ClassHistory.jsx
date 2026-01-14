import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { History, BookOpen, Filter, Calendar, Info } from 'lucide-react';

const ClassHistory = () => {
    const { currentUser, logEntries, classes, subjects } = useData();
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-8 h-8 text-indigo-600" />
                        Class History
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Log book entries for <span className="font-semibold text-indigo-600">Class {studentClass.name}-{studentClass.division}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="bg-transparent text-sm border-none focus:ring-0 p-0 text-gray-700 font-medium min-w-[150px]"
                    >
                        <option value="all">All Subjects</option>
                        {availableSubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                {displayedLogs.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No Logs Found</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {selectedSubject === 'all'
                                ? "Your mentors haven't added any log entries yet."
                                : "No entries found for this subject."}
                        </p>
                    </div>
                ) : (
                    displayedLogs.map((log) => (
                        <div key={log.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden">
                            {/* Decorative left border */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Date Box */}
                                <div className="flex-shrink-0">
                                    <div className="bg-indigo-50 rounded-lg p-3 text-center min-w-[80px]">
                                        <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                                            {new Date(log.timestamp).toLocaleString('default', { month: 'short' })}
                                        </div>
                                        <div className="text-2xl font-bold text-indigo-700 leading-none mt-1">
                                            {new Date(log.timestamp).getDate()}
                                        </div>
                                        <div className="text-xs text-indigo-400 mt-1">
                                            {new Date(log.timestamp).getFullYear()}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                {log.subjectName}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                    {log.chapter}
                                                </span>
                                                {log.heading && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{log.heading}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {log.remarks && (
                                        <div className="relative bg-yellow-50/50 p-4 rounded-lg border border-yellow-100/50 text-gray-700 text-sm italic">
                                            <span className="absolute top-2 left-2 text-yellow-200 text-4xl leading-none -z-10 select-none">"</span>
                                            {log.remarks}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ClassHistory;
