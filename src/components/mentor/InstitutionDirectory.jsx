import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { 
    Users, 
    UserCheck, 
    Layers, 
    Search, 
    Filter, 
    User, 
    IdCard, 
    Clock, 
    ArrowRight,
    ExternalLink,
    ChevronRight,
    Briefcase
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { clsx } from 'clsx';

const InstitutionDirectory = () => {
    const { 
        allStudents, mentors, classes, currentUser, studentStatuses, 
        allStudentsLimit, loadMoreAllStudents, setAllStudentsLimit,
        allMentorsLimit, loadMoreAllMentors, setAllMentorsLimit,
        allClassesLimit, loadMoreAllClasses, setAllClassesLimit,
        totalCounts
    } = useData();
    const [activeTab, setActiveTab] = useState('students'); // 'students', 'mentors', 'classes'
    const [searchQuery, setSearchQuery] = useState('');
    
    // Auto-increase limit when searching to satisfy "but while searching it should be shown"
    React.useEffect(() => {
        if (searchQuery.length > 2) {
            if (activeTab === 'students' && allStudentsLimit < 10000) setAllStudentsLimit(10000);
            if (activeTab === 'mentors' && allMentorsLimit < 10000) setAllMentorsLimit(10000);
            if (activeTab === 'classes' && allClassesLimit < 10000) setAllClassesLimit(10000);
        }
    }, [searchQuery, activeTab, allStudentsLimit, allMentorsLimit, allClassesLimit, setAllStudentsLimit, setAllMentorsLimit, setAllClassesLimit]);

    // Filters
    const [filters, setFilters] = useState({
        studentClass: 'all',
        studentStatus: 'all',
        studentMentor: 'all',
        mentorStatus: 'all',
        classMentor: 'all'
    });

    const [selectedClassId, setSelectedClassId] = useState(null);

    // --- Helper Data ---
    const mentorMap = useMemo(() => {
        const map = {};
        mentors.forEach(m => map[m.id] = m);
        return map;
    }, [mentors]);

    const classMap = useMemo(() => {
        const map = {};
        classes.forEach(c => map[c.id] = c);
        return map;
    }, [classes]);

    const getMentorForClass = (classId) => {
        return mentors.find(m => m.assignedClassIds?.includes(classId));
    };

    // --- Tab Data Calculation ---

    // 1. Students List
    const studentsList = useMemo(() => {
        return allStudents.map(s => {
            const cls = classMap[s.classId];
            const mentor = getMentorForClass(s.classId);
            return {
                ...s,
                className: cls ? `${cls.name} ${cls.division}` : 'Unassigned',
                mentorName: mentor ? mentor.name : 'No Mentor',
                mentorId: mentor?.id
            };
        });
    }, [allStudents, classMap, mentors]);

    // 2. Mentors List
    const mentorsList = useMemo(() => {
        return mentors.map(m => {
            const assignedClasses = classes.filter(c => m.assignedClassIds?.includes(c.id));
            const mentorStudents = allStudents.filter(s => m.assignedClassIds?.includes(s.classId));
            return {
                ...m,
                totalClasses: assignedClasses.length,
                totalStudents: mentorStudents.length,
                classNames: assignedClasses.map(c => `${c.name}-${c.division}`).join(', ') || 'None'
            };
        });
    }, [mentors, classes, allStudents]);

    // 3. Classes List
    const classesList = useMemo(() => {
        return classes.map(c => {
            const classStudents = allStudents.filter(s => s.classId === c.id);
            const mentor = getMentorForClass(c.id);
            return {
                ...c,
                totalStudents: classStudents.length,
                mentorName: mentor ? mentor.name : 'No Mentor',
                mentorId: mentor?.id
            };
        });
    }, [classes, allStudents, mentors]);

    // --- Search & Filter Logic ---
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();

        if (activeTab === 'students') {
            return studentsList.filter(s => {
                const matchesSearch = 
                    String(s.name || '').toLowerCase().includes(query) ||
                    String(s.uid || '').toLowerCase().includes(query) ||
                    String(s.registerNo || '').toLowerCase().includes(query) ||
                    String(s.className || '').toLowerCase().includes(query) ||
                    String(s.mentorName || '').toLowerCase().includes(query);
                
                const matchesClass = filters.studentClass === 'all' || s.classId === filters.studentClass;
                const matchesStatus = filters.studentStatus === 'all' || s.status === filters.studentStatus;
                const matchesMentor = filters.studentMentor === 'all' || s.mentorId === filters.studentMentor;

                return matchesSearch && matchesClass && matchesStatus && matchesMentor;
            });
        }

        if (activeTab === 'mentors') {
            return mentorsList.filter(m => {
                const matchesSearch = 
                    m.name?.toLowerCase().includes(query) ||
                    m.classNames?.toLowerCase().includes(query);
                
                return matchesSearch;
            });
        }

        if (activeTab === 'classes') {
            return classesList.filter(c => {
                const matchesSearch = 
                    c.name?.toLowerCase().includes(query) ||
                    c.division?.toLowerCase().includes(query) ||
                    c.mentorName?.toLowerCase().includes(query);
                
                const matchesMentor = filters.classMentor === 'all' || c.mentorId === filters.classMentor;

                return matchesSearch && matchesMentor;
            });
        }

        return [];
    }, [activeTab, searchQuery, filters, studentsList, mentorsList, classesList]);

    // --- Sub-View: Students for a specific class ---
    const selectedClassStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return allStudents.filter(s => s.classId === selectedClassId);
    }, [selectedClassId, allStudents]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Layers className="w-8 h-8" />
                        </div>
                        Institution Directory
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Comprehensive overview of students, mentors, and academic groups.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    <button 
                        onClick={() => {
                            setActiveTab('students');
                            setSearchQuery('');
                        }}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                            activeTab === 'students' ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <Users className="w-4 h-4" /> Students
                    </button>
                    <button 
                        onClick={() => {
                            setActiveTab('mentors');
                            setSearchQuery('');
                        }}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                            activeTab === 'mentors' ? "bg-purple-600 text-white shadow-md shadow-purple-200" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <UserCheck className="w-4 h-4" /> Mentors
                    </button>
                    <button 
                        onClick={() => {
                            setActiveTab('classes');
                            setSearchQuery('');
                        }}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                            activeTab === 'classes' ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <Layers className="w-4 h-4" /> Classes
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Total Students</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{totalCounts.students}</h3>
                        </div>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-purple-600 uppercase tracking-widest">Total Mentors</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{totalCounts.mentors}</h3>
                        </div>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
                            <UserCheck className="w-6 h-6" />
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Active Classes</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{totalCounts.classes}</h3>
                        </div>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <Layers className="w-6 h-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
                {/* Search & Filter Header */}
                <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row gap-4 items-center justify-between bg-gray-50/50">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTab}... (Name, UID, Class, Mentor)`}
                            className="pl-12 bg-white rounded-2xl border-gray-200 h-12 font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <Filter className="w-4 h-4 text-gray-400 mr-1" />
                        
                        {activeTab === 'students' && (
                            <>
                                <select 
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    value={filters.studentClass}
                                    onChange={(e) => setFilters({...filters, studentClass: e.target.value})}
                                >
                                    <option value="all">All Classes</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}-{c.division}</option>)}
                                </select>
                                <select 
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    value={filters.studentMentor}
                                    onChange={(e) => setFilters({...filters, studentMentor: e.target.value})}
                                >
                                    <option value="all">All Mentors</option>
                                    {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <select 
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    value={filters.studentStatus}
                                    onChange={(e) => setFilters({...filters, studentStatus: e.target.value})}
                                >
                                    <option value="all">All Statuses</option>
                                    {studentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </>
                        )}

                        {activeTab === 'classes' && (
                            <select 
                                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500"
                                value={filters.classMentor}
                                onChange={(e) => setFilters({...filters, classMentor: e.target.value})}
                            >
                                <option value="all">All Mentors</option>
                                {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                {/* Data Table / Grid */}
                <div className="flex-1 overflow-x-auto relative">
                    {searchQuery.length > 2 && filteredData.length === 0 && (
                        <div className="absolute top-0 left-0 right-0 p-4 bg-indigo-50 text-indigo-600 text-center text-xs font-bold animate-pulse z-10">
                            Searching across records...
                        </div>
                    )}
                    {filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                <Search className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">No results found</h3>
                            <p className="text-gray-500 max-w-xs mt-1">Try adjusting your search query or filters to find what you're looking for.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    {activeTab === 'students' && (
                                        <>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Student Name</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">UID</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Reg No</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Class</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Mentor</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                                        </>
                                    )}
                                    {activeTab === 'mentors' && (
                                        <>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Mentor Name</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Stats</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Assigned Classes</th>
                                        </>
                                    )}
                                    {activeTab === 'classes' && (
                                        <>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Class Name</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Details</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Mentor Allotted</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Actions</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, idx) => (
                                    <tr key={item.id} className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50 last:border-0">
                                        {activeTab === 'students' && (
                                            <>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-sm">
                                                            {item.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">{item.name}</div>
                                                            <div className="text-[9px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                                                                <Clock className="w-3 h-3" /> Joined: {item.joiningDate || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <IdCard className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs font-bold text-indigo-600">{item.uid || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Layers className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs font-bold text-gray-700">{item.registerNo || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs font-black text-gray-900">{item.className}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block border border-indigo-100">
                                                        {item.mentorName}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={clsx(
                                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                        item.status === 'Active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                                    )}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'mentors' && (
                                            <>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-black text-sm">
                                                            {item.name?.charAt(0)}
                                                        </div>
                                                        <div className="font-bold text-gray-900">{item.name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-4">
                                                        <div className="text-center px-3 py-1 bg-gray-50 rounded-lg">
                                                            <div className="text-lg font-black text-gray-900">{item.totalClasses}</div>
                                                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Classes</div>
                                                        </div>
                                                        <div className="text-center px-3 py-1 bg-gray-50 rounded-lg">
                                                            <div className="text-lg font-black text-gray-900">{item.totalStudents}</div>
                                                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Students</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs font-medium text-gray-600 max-w-md italic">
                                                        {item.classNames}
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'classes' && (
                                            <>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black text-sm">
                                                            {item.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-gray-900">{item.name}</div>
                                                            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Div: {item.division}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                                            <Users className="w-3 h-3 text-gray-400" /> {item.totalStudents} Students
                                                        </div>
                                                        <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                                            <Clock className="w-3 h-3 text-gray-400" /> {item.time || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">
                                                            {item.mentorName?.charAt(0)}
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-700">{item.mentorName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm"
                                                        onClick={() => setSelectedClassId(item.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest h-8"
                                                    >
                                                        View Students <ChevronRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer / Load More */}
                <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex items-center justify-center">
                    {activeTab === 'students' && (
                        <Button 
                            variant="secondary" 
                            onClick={loadMoreAllStudents}
                            className="bg-white border-gray-200 text-indigo-600 font-bold px-8 shadow-sm hover:bg-indigo-50"
                        >
                            <Briefcase className="w-4 h-4 mr-2" />
                            Load More Students
                        </Button>
                    )}
                    {activeTab === 'mentors' && (
                        <Button 
                            variant="secondary" 
                            onClick={loadMoreAllMentors}
                            className="bg-white border-gray-200 text-purple-600 font-bold px-8 shadow-sm hover:bg-purple-50"
                        >
                            <Briefcase className="w-4 h-4 mr-2" />
                            Load More Mentors
                        </Button>
                    )}
                    {activeTab === 'classes' && (
                        <Button 
                            variant="secondary" 
                            onClick={loadMoreAllClasses}
                            className="bg-white border-gray-200 text-emerald-600 font-bold px-8 shadow-sm hover:bg-emerald-50"
                        >
                            <Briefcase className="w-4 h-4 mr-2" />
                            Load More Classes
                        </Button>
                    )}
                </div>
            </div>

            {/* Modal: Class Student List */}
            {selectedClassId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedClassId(null)}></div>
                    <Card className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">
                                        {classMap[selectedClassId]?.name}-{classMap[selectedClassId]?.division}
                                    </h2>
                                    <p className="text-indigo-600 font-bold text-sm">Class Student List ({selectedClassStudents.length})</p>
                                </div>
                                <Button variant="secondary" onClick={() => setSelectedClassId(null)} className="rounded-full w-10 h-10 p-0">
                                    <ExternalLink className="w-4 h-4 rotate-45" />
                                </Button>
                            </div>

                            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {selectedClassStudents.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 italic">No students allotted to this class.</div>
                                ) : (
                                    selectedClassStudents.map((student, idx) => (
                                        <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{student.name}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 tracking-wider">UID: {student.uid || 'N/A'} | Reg: {student.registerNo || 'N/A'}</div>
                                                </div>
                                            </div>
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                                                student.status === 'Active' ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                                            )}>
                                                {student.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default InstitutionDirectory;
