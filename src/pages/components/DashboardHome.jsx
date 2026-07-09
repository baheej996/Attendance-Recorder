import React, { useState } from 'react';
import { School, Users, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { Card, CardHeader } from '../../components/ui/Card';
import CountryStatsChart from '../../components/admin/CountryStatsChart';

const DashboardHome = ({ onTabChange }) => {
    const { classes, mentors, students } = useData();
    const { showAlert } = useUI();
    const [expandedBatches, setExpandedBatches] = useState({});

    const activeStudents = React.useMemo(() => students.filter(s => s.status === 'Active'), [students]);

    const classStats = React.useMemo(() => {
        return classes.map(cls => {
            const classStudents = activeStudents.filter(s => s.classId === cls.id);
            const boys = classStudents.filter(s => s.gender === 'Male').length;
            const girls = classStudents.filter(s => s.gender === 'Female').length;
            return {
                ...cls,
                boys,
                girls,
                total: classStudents.length
            };
        }).sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true });
            if (nameCompare !== 0) return nameCompare;
            return a.division.localeCompare(b.division);
        });
    }, [classes, activeStudents]);

    const groupedStats = React.useMemo(() => {
        const groups = {};
        classStats.forEach(cls => {
            if (!groups[cls.name]) {
                groups[cls.name] = {
                    name: cls.name,
                    boys: 0,
                    girls: 0,
                    total: 0,
                    classes: []
                };
            }
            groups[cls.name].boys += cls.boys;
            groups[cls.name].girls += cls.girls;
            groups[cls.name].total += cls.total;
            groups[cls.name].classes.push(cls);
        });
        return Object.values(groups).sort((a, b) => {
            const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return a.name.localeCompare(b.name);
        });
    }, [classStats]);

    const toggleBatch = (batchName) => {
        setExpandedBatches(prev => ({
            ...prev,
            [batchName]: !prev[batchName]
        }));
    };

    const totalBoys = activeStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
    const totalGirls = activeStudents.filter(s => s.gender?.toLowerCase() === 'female').length;

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-300">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
                <p className="text-gray-500 mt-2">Welcome back, Administrator</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                <Card 
                    onClick={() => onTabChange('classes')}
                    className="flex items-center gap-3 sm:gap-4 border-l-4 border-l-indigo-500 cursor-pointer hover:bg-indigo-50/30 transition-colors group p-4 sm:p-6"
                >
                    <div className="p-2 sm:p-3 bg-indigo-50 rounded-full text-indigo-600 group-hover:scale-110 transition-transform">
                        <School className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Classes</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{classes.length}</h3>
                    </div>
                </Card>
                <Card 
                    onClick={() => onTabChange('mentors')}
                    className="flex items-center gap-3 sm:gap-4 border-l-4 border-l-purple-500 cursor-pointer hover:bg-purple-50/30 transition-colors group p-4 sm:p-6"
                >
                    <div className="p-2 sm:p-3 bg-purple-50 rounded-full text-purple-600 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Mentors</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{mentors.length}</h3>
                    </div>
                </Card>
                <Card 
                    onClick={() => onTabChange('students')}
                    className="flex items-center gap-3 sm:gap-4 border-l-4 border-l-pink-500 cursor-pointer hover:bg-pink-50/30 transition-colors group p-4 sm:p-6 col-span-2 md:col-span-1"
                >
                    <div className="p-2 sm:p-3 bg-pink-50 rounded-full text-pink-600 group-hover:scale-110 transition-transform">
                        <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Students</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{activeStudents.length}</h3>
                    </div>
                </Card>
                <Card 
                    onClick={() => onTabChange('students')}
                    className="flex items-center gap-3 sm:gap-4 border-l-4 border-l-blue-500 cursor-pointer hover:bg-blue-50/30 transition-colors group p-4 sm:p-6"
                >
                    <div className="p-2 sm:p-3 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Boys</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{totalBoys}</h3>
                    </div>
                </Card>
                <Card 
                    onClick={() => onTabChange('students')}
                    className="flex items-center gap-3 sm:gap-4 border-l-4 border-l-rose-500 cursor-pointer hover:bg-rose-50/30 transition-colors group p-4 sm:p-6"
                >
                    <div className="p-2 sm:p-3 bg-rose-50 rounded-full text-rose-600 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Girls</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{totalGirls}</h3>
                    </div>
                </Card>
            </div>

            <div>
                <CardHeader title="Batch-wise Enrollment Statistics" description="Click on a batch to see class breakdown" />
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-semibold z-10">
                                <tr>
                                    <th className="px-6 py-4 w-24 whitespace-nowrap">Sl No</th>
                                    <th className="px-6 py-4">Batch / Class Name</th>
                                    <th className="px-6 py-4">Boys</th>
                                    <th className="px-6 py-4">Girls</th>
                                    <th className="px-6 py-4">Total Students</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {groupedStats.length > 0 ? groupedStats.map((batch, index) => (
                                    <React.Fragment key={batch.name}>
                                        <tr 
                                            className="hover:bg-indigo-50/30 transition-colors cursor-pointer group bg-white"
                                            onClick={() => toggleBatch(batch.name)}
                                        >
                                            <td className="px-6 py-4 font-medium text-gray-400">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1 rounded-md bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                        {expandedBatches[batch.name] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                    Batch {batch.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-blue-600">{batch.boys}</td>
                                            <td className="px-6 py-4 font-semibold text-pink-600">{batch.girls}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold text-xs border border-indigo-100">
                                                    {batch.total} Combined
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedBatches[batch.name] && batch.classes.map((cls, cIdx) => (
                                            <tr key={cls.id} className="bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                                <td className="px-6 py-3 text-right pr-10 text-[10px] font-bold text-indigo-300">
                                                    {index + 1}.{cIdx + 1}
                                                </td>
                                                <td className="px-12 py-3 border-l-2 border-indigo-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-200"></span>
                                                        <span className="font-medium text-gray-700">Division {cls.division}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-500">{cls.boys}</td>
                                                <td className="px-6 py-3 text-gray-500">{cls.girls}</td>
                                                <td className="px-6 py-3">
                                                    <span className="text-gray-900 font-bold">{cls.total}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                                            No enrollment data available yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <div className="w-full">
                <CountryStatsChart students={activeStudents} />
            </div>
        </div >
    );
};


export default DashboardHome;
