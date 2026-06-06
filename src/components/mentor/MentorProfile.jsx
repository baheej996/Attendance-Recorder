import React from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { User, Mail, Phone, BookOpen, Layers, Key, GraduationCap } from 'lucide-react';

const MentorProfile = () => {
    const { currentUser, classes } = useData();

    if (!currentUser) return null;

    const assignedClasses = classes.filter(c => currentUser.assignedClassIds?.includes(c.id));

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-purple-600 pl-4">My Profile</h2>
            
            <Card className="p-6 md:p-8 border-t-4 border-t-purple-600 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -z-10 opacity-60"></div>
                
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center space-y-4 shrink-0">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                            {currentUser.profilePhoto ? (
                                <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-16 h-16 text-purple-400" />
                            )}
                        </div>
                        <div className="text-center">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                Mentor
                            </span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <User className="w-3 h-3" /> Full Name
                            </label>
                            <p className="font-bold text-gray-900 text-lg">{currentUser.name || 'Not Provided'}</p>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email Address
                            </label>
                            <p className="font-medium text-gray-800">{currentUser.email || 'Not Provided'}</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Key className="w-3 h-3" /> Password
                            </label>
                            <p className="font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-100 inline-block">
                                {currentUser.password || '••••••••'}
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Contact Number
                            </label>
                            <p className="font-medium text-gray-800">
                                {currentUser.contactNumber || currentUser.contactNo || currentUser.phone || 'Not Provided'}
                            </p>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> Qualifications
                            </label>
                            <p className="font-medium text-gray-800">
                                {currentUser.qualification || currentUser.qualifications || 'Not Provided'}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-8 mb-4">
                <Layers className="w-5 h-5 text-indigo-500" /> Assigned Classes
            </h3>

            {assignedClasses.length === 0 ? (
                <Card className="p-8 text-center text-gray-400 border-dashed">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No classes currently assigned.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedClasses.map(cls => (
                        <Card key={cls.id} className="p-5 border border-indigo-50 hover:border-indigo-200 transition-colors group">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 leading-tight">{cls.name}</h4>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                        Div {cls.division}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                                <div className="text-gray-500">
                                    <span className="block text-[10px] uppercase font-black tracking-widest mb-0.5 text-gray-400">Day</span>
                                    <span className="font-medium">
                                        {Array.isArray(cls.days) ? cls.days.join(', ') : (cls.day || 'N/A')}
                                    </span>
                                </div>
                                <div className="text-gray-500 text-right">
                                    <span className="block text-[10px] uppercase font-black tracking-widest mb-0.5 text-gray-400">Time</span>
                                    <span className="font-medium">
                                        {(cls.startTime && cls.endTime) ? `${cls.startTime} - ${cls.endTime}` : (cls.time || 'N/A')}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MentorProfile;
