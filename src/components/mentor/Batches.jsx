import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Users, BookOpen, GraduationCap, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { StudentProfileModal } from './StudentProfileModal';

const Batches = () => {
    const { currentUser, classes, students } = useData();
    const [expandedClasses, setExpandedClasses] = useState({});
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [currentPreviewStudentId, setCurrentPreviewStudentId] = useState(null);

    // Memoize the filtering to avoid recalculation on every render
    const assignedClasses = useMemo(() => {
        if (!currentUser?.assignedClassIds) return [];
        return classes.filter(c => currentUser.assignedClassIds.includes(c.id));
    }, [classes, currentUser]);

    // Group students by classId for efficient lookup
    const studentsByClass = useMemo(() => {
        const grouped = {};
        students.forEach(student => {
            if (!grouped[student.classId]) {
                grouped[student.classId] = [];
            }
            grouped[student.classId].push(student);
        });

        // Sort students within each class (e.g., by Register No or Name)
        Object.keys(grouped).forEach(classId => {
            grouped[classId].sort((a, b) => a.registerNo.localeCompare(b.registerNo, undefined, { numeric: true }));
        });

        return grouped;
    }, [students]);

    const toggleClass = (classId) => {
        setExpandedClasses(prev => ({
            ...prev,
            [classId]: !prev[classId]
        }));
    };

    // Initialize all classes as expanded by default (optional, can stay as empty object for collapsed)
    // useEffect(() => {
    //      const initial = {};
    //      assignedClasses.forEach(c => initial[c.id] = true);
    //      setExpandedClasses(initial);
    // }, [assignedClasses]);


    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-600" />
                    My Batches
                </h1>
                <p className="text-gray-500 mt-1">
                    Manage and view details of your assigned classes and students.
                </p>
            </div>

            {assignedClasses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No Batches Assigned</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">
                        You haven't been assigned to any classes yet. Please contact the administrator.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {assignedClasses.map((cls) => {
                        const classStudents = studentsByClass[cls.id] || [];
                        const isExpanded = expandedClasses[cls.id];

                        return (
                            <Card key={cls.id} className="overflow-hidden border border-gray-200 shadow-sm transition-all duration-300">
                                <div
                                    className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 transition-colors"
                                    onClick={() => toggleClass(cls.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                            <GraduationCap className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Class {cls.name}-{cls.division}</h2>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {classStudents.length} Students Enrolled
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                            Active Batch
                                        </div>
                                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-0 animate-in slide-in-from-top-2 duration-200">
                                        {classStudents.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500 italic">
                                                No students added to this class yet.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-white border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-6 py-4 font-semibold text-gray-600 w-24">Reg No</th>
                                                            <th className="px-6 py-4 font-semibold text-gray-600">Student Name</th>
                                                            <th className="px-6 py-4 font-semibold text-gray-600">Gender</th>
                                                            <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                                            <th className="px-6 py-4 font-semibold text-center text-gray-600">Details</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {classStudents.map((student, index) => (
                                                            <tr
                                                                key={student.id}
                                                                className={clsx(
                                                                    "hover:bg-gray-50/80 transition-colors",
                                                                    index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                                                                )}
                                                            >
                                                                <td className="px-6 py-4 font-mono text-gray-500">{student.registerNo}</td>
                                                                <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                                                                <td className="px-6 py-4 text-gray-600">{student.gender}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className={clsx(
                                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                                        student.status === 'Active'
                                                                            ? "bg-green-100 text-green-800"
                                                                            : "bg-red-100 text-red-800"
                                                                    )}>
                                                                        {student.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setCurrentPreviewStudentId(student.id);
                                                                            setIsProfileModalOpen(true);
                                                                        }}
                                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                                        title="View Detailed Profile"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <StudentProfileModal
                studentId={currentPreviewStudentId}
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
};

export default Batches;
