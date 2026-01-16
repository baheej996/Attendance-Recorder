import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { User, Mail, Award, BookOpen, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

const StudentMentorView = () => {
    const { currentUser, mentors, classes } = useData();
    const navigate = useNavigate();

    // Find the mentor(s) assigned to the student's class
    const myMentors = useMemo(() => {
        if (!currentUser?.classId) return [];
        return mentors.filter(m => m.assignedClassIds && m.assignedClassIds.includes(currentUser.classId));
    }, [currentUser, mentors]);

    const studentClass = useMemo(() => {
        return classes.find(c => c.id === currentUser?.classId);
    }, [classes, currentUser]);

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                    <User className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Mentor</h1>
                    <p className="text-gray-500 text-sm">
                        View details of the teacher assigned to your class {studentClass ? `(${studentClass.name}-${studentClass.division})` : ''}
                    </p>
                </div>
            </div>

            {myMentors.length === 0 ? (
                <Card className="p-12 text-center text-gray-500">
                    <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-700">No Mentor Assigned</h3>
                    <p className="mt-2">It seems your class doesn't have an assigned mentor yet.</p>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {myMentors.map((mentor) => (
                        <Card key={mentor.id} className="overflow-hidden border-indigo-100 shadow-md transition-shadow hover:shadow-lg">
                            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                                <div className="absolute -bottom-12 left-6">
                                    <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
                                        {mentor.profilePhoto ? (
                                            <img
                                                src={mentor.profilePhoto}
                                                alt={mentor.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300">
                                                <User className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-16 pb-6 px-6">
                                <h2 className="text-2xl font-bold text-gray-900">{mentor.name}</h2>
                                <p className="text-gray-500 font-medium mb-6">Class Mentor</p>

                                <div className="space-y-4">
                                    {mentor.qualification && (
                                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="p-2 bg-white rounded-md shadow-sm text-indigo-600">
                                                <Award className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Qualification</h4>
                                                <p className="font-semibold text-gray-800">{mentor.qualification}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="p-2 bg-white rounded-md shadow-sm text-indigo-600">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Contact Email</h4>
                                            <p className="font-medium text-gray-800 break-all">{mentor.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="p-2 bg-white rounded-md shadow-sm text-indigo-600">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigned Classes</h4>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {mentor.assignedClassIds.map(cid => {
                                                    const cls = classes.find(c => c.id === cid);
                                                    return cls ? (
                                                        <span key={cid} className={clsx(
                                                            "px-2 py-0.5 rounded text-xs font-bold border",
                                                            cid === currentUser.classId
                                                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                                                : "bg-white text-gray-500 border-gray-200"
                                                        )}>
                                                            {cls.name}-{cls.division}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={() => navigate('/student/chat')}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                        Message Mentor
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentMentorView;
