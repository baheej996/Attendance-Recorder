import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader } from '../ui/Card';
import { SearchableSelect } from '../ui/SearchableSelect';
import { AlertCircle, CheckCircle2, XCircle, FileQuestion, BookOpen, Calculator, Percent } from 'lucide-react';
import clsx from 'clsx';

const ExamQuestionTracker = () => {
    const { exams, classes, subjects, questions, examSettings } = useData();
    const [selectedExamId, setSelectedExamId] = useState('');

    const activeExams = exams.filter(e => e.status !== 'Archived');
    
    // Exam Select Options
    const examOptions = activeExams.map(e => ({
        id: e.id,
        label: e.name + (e.status === 'Draft' ? ' (Draft)' : '')
    }));

    // Filter out subjects not used for exams
    const examSubjects = subjects.filter(s => s.isExamSubject !== false);

    // Get unique class names
    const uniqueClassNames = [...new Set(classes.map(c => c.name))].sort();

    const getSetting = (examId, className, subjectName) => {
        return examSettings.find(s => s.examId === examId && s.classId === className && s.subjectId === subjectName) || { isActive: false, isPublished: false };
    };

    const trackerData = useMemo(() => {
        if (!selectedExamId) return [];

        return uniqueClassNames.map(className => {
            const classIdsForName = classes.filter(c => c.name === className).map(c => c.id);
            const relevantSubjects = examSubjects.filter(s => classIdsForName.includes(s.classId));
            const uniqueSubjectNames = [...new Set(relevantSubjects.map(s => s.name))];

            const subjectData = uniqueSubjectNames.map(subjectName => {
                // Find questions for this exam, class name, and subject name
                const subjectQuestions = questions.filter(q => 
                    q.examId === selectedExamId && 
                    q.classId === className && 
                    q.subjectId === subjectName
                );

                const totalMarksAdded = subjectQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
                const questionCount = subjectQuestions.length;

                // Determine Max Marks
                const setting = getSetting(selectedExamId, className, subjectName);
                
                // Fallback to subject's maxMarks if not defined in exam setting
                // Find a relevant subject doc just for fallback
                const subFallback = relevantSubjects.find(s => s.name === subjectName);
                const maxMarks = setting.maxMarks ? Number(setting.maxMarks) : (subFallback && subFallback.maxMarks ? Number(subFallback.maxMarks) : 100);

                let status = 'Missing'; // Default: No questions
                if (questionCount > 0) {
                    if (totalMarksAdded === maxMarks) {
                        status = 'Complete';
                    } else if (totalMarksAdded > maxMarks) {
                        status = 'Exceeded';
                    } else {
                        status = 'Partial';
                    }
                }

                return {
                    name: subjectName,
                    questionCount,
                    totalMarksAdded,
                    maxMarks,
                    status
                };
            });

            return {
                className,
                subjects: subjectData
            };
        }).filter(c => c.subjects.length > 0); // Only show classes that have exam subjects

    }, [selectedExamId, uniqueClassNames, classes, examSubjects, questions, examSettings]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/95 backdrop-blur-sm py-4 lg:sticky lg:top-[64px] z-20 border-b border-gray-200 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Question Tracking</h2>
                    <p className="text-sm text-gray-500">Monitor the status of question paper creation across classes</p>
                </div>
                <div className="w-full md:w-80">
                    <SearchableSelect
                        options={examOptions}
                        value={selectedExamId}
                        onChange={setSelectedExamId}
                        placeholder="Select Exam..."
                    />
                </div>
            </div>

            {!selectedExamId ? (
                <Card>
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <FileQuestion className="w-16 h-16 text-gray-300" />
                        <h3 className="text-xl font-medium text-gray-700">Select an Exam to track</h3>
                        <p className="text-sm max-w-md">Choose an active exam from the dropdown above to view the question tracking status for all classes and subjects.</p>
                    </div>
                </Card>
            ) : trackerData.length === 0 ? (
                <Card>
                    <div className="p-12 text-center text-gray-500">
                        <p>No subjects found for this exam.</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-8">
                    {trackerData.map((classGroup) => {
                        
                        // Calculate class summary stats
                        const totalSubjects = classGroup.subjects.length;
                        const completeSubjects = classGroup.subjects.filter(s => s.status === 'Complete').length;
                        const progressPercentage = totalSubjects > 0 ? Math.round((completeSubjects / totalSubjects) * 100) : 0;

                        return (
                            <Card key={classGroup.className} className="overflow-hidden border border-gray-200/60 shadow-sm">
                                <div className="bg-gradient-to-r from-indigo-50/50 to-white border-b border-gray-100 p-5">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-100/50 text-indigo-700 rounded-lg shrink-0">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 leading-tight">Class {classGroup.className}</h3>
                                                <p className="text-sm text-gray-500 font-medium">
                                                    {totalSubjects} Subjects Total
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className="flex-1 sm:w-48">
                                                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5 px-0.5">
                                                    <span>Completion</span>
                                                    <span>{progressPercentage}%</span>
                                                </div>
                                                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                                    <div 
                                                        className={clsx(
                                                            "h-full rounded-full transition-all duration-1000",
                                                            progressPercentage === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                                        )}
                                                        style={{ width: `${progressPercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {classGroup.subjects.map(subject => {
                                            
                                            const statusConfig = {
                                                'Complete': { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, badge: 'Complete' },
                                                'Partial': { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Calculator, badge: 'In Progress' },
                                                'Missing': { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertCircle, badge: 'No Questions' },
                                                'Exceeded': { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, badge: 'Marks Exceeded' }
                                            };

                                            const config = statusConfig[subject.status];
                                            const StatusIcon = config.icon;

                                            return (
                                                <div 
                                                    key={subject.name} 
                                                    className={clsx(
                                                        "relative p-4 rounded-xl border transition-all duration-200",
                                                        config.bg,
                                                        config.border,
                                                        "hover:shadow-md"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className="font-bold text-gray-900 truncate pr-2" title={subject.name}>{subject.name}</h4>
                                                        <span className={clsx(
                                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                                                            config.color,
                                                            "bg-white/60 backdrop-blur-sm"
                                                        )}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {config.badge}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                        <div className="bg-white/50 rounded-lg p-2 border border-white/50">
                                                            <p className="text-xs text-gray-500 font-medium mb-0.5 flex items-center gap-1">
                                                                <Percent className="w-3 h-3" /> 
                                                                Marks Added
                                                            </p>
                                                            <p className="text-lg font-black text-gray-900">
                                                                {subject.totalMarksAdded} <span className="text-xs text-gray-500 font-medium">/ {subject.maxMarks}</span>
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/50 rounded-lg p-2 border border-white/50">
                                                            <p className="text-xs text-gray-500 font-medium mb-0.5 flex items-center gap-1">
                                                                <FileQuestion className="w-3 h-3" /> 
                                                                Questions
                                                            </p>
                                                            <p className="text-lg font-black text-gray-900">
                                                                {subject.questionCount}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {subject.status === 'Partial' && (
                                                        <div className="w-full bg-black/5 rounded-full h-1.5 mt-3 overflow-hidden">
                                                            <div 
                                                                className="bg-amber-500 h-1.5 rounded-full" 
                                                                style={{ width: `${Math.min(100, (subject.totalMarksAdded / subject.maxMarks) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                    {subject.status === 'Complete' && (
                                                        <div className="w-full bg-black/5 rounded-full h-1.5 mt-3 overflow-hidden">
                                                            <div className="bg-emerald-500 h-1.5 rounded-full w-full"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExamQuestionTracker;
