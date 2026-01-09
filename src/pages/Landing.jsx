import React from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCog, GraduationCap, LayoutGrid } from 'lucide-react';

const Landing = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <LayoutGrid className="w-16 h-16 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Attendance Recorder</h1>
                    <p className="text-xl text-gray-600">Select your role to continue</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Link to="/admin" className="group relative p-6 bg-white rounded-xl border-2 border-transparent hover:border-indigo-500 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col items-center">
                            <div className="p-4 bg-indigo-100 rounded-full mb-4 group-hover:bg-indigo-600 transition-colors">
                                <UserCog className="w-8 h-8 text-indigo-600 group-hover:text-white" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Admin</h2>
                            <p className="text-center text-gray-500 mt-2 text-sm">Manage classes, mentors, and students</p>
                        </div>
                    </Link>

                    <Link to="/mentor" className="group relative p-6 bg-white rounded-xl border-2 border-transparent hover:border-indigo-500 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col items-center">
                            <div className="p-4 bg-purple-100 rounded-full mb-4 group-hover:bg-purple-600 transition-colors">
                                <Users className="w-8 h-8 text-purple-600 group-hover:text-white" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Mentor</h2>
                            <p className="text-center text-gray-500 mt-2 text-sm">Record attendance and view stats</p>
                        </div>
                    </Link>

                    <Link to="/student" className="group relative p-6 bg-white rounded-xl border-2 border-transparent hover:border-indigo-500 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col items-center">
                            <div className="p-4 bg-pink-100 rounded-full mb-4 group-hover:bg-pink-600 transition-colors">
                                <GraduationCap className="w-8 h-8 text-pink-600 group-hover:text-white" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Student</h2>
                            <p className="text-center text-gray-500 mt-2 text-sm">View your attendance history</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Landing;
