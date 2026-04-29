import React from 'react';
import { BookOpen, Shield, Users, GraduationCap, ClipboardCheck, FileText, BarChart2, CheckCircle, Info, Printer, Layers, PlayCircle, HelpCircle, Bell, Settings, Moon, Book, Sparkles, Star, History } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useTour } from '../hooks/useTour';

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center gap-4 mb-5">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-gray-900 leading-tight">{title}</h3>
        </div>
        <div className="text-gray-500 font-medium space-y-3 leading-relaxed text-sm md:text-base">
            {children}
        </div>
    </div>
);

const FeatureItem = ({ icon: Icon, title, description }) => (
    <div className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
        <div className="mt-1 text-indigo-500">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <h4 className="font-black text-gray-900 text-sm">{title}</h4>
            <p className="text-[11px] font-bold text-gray-400 mt-0.5 leading-normal">{description}</p>
        </div>
    </div>
);

const Readme = () => {
    const { currentUser, classes, studentFeatureFlags, classFeatureFlags } = useData();
    const { startTour } = useTour();
    const role = currentUser?.role || 'Guest'; // Fallback

    const getContent = () => {
        // Feature Flags for Student
        const globalFlags = studentFeatureFlags || {};
        const classFlags = classFeatureFlags?.find(f => f.classId === currentUser?.classId) || {};
        // Unified Feature Key logic for the tour
        const activeFeatures = {};
        const availableKeys = ['welcome', 'overview', 'activities', 'subjects', 'exams', 'results', 'leave', 'chat', 'prayer', 'ramadan', 'history', 'attendanceHistory', 'leaderboard', 'star', 'help'];
        
        availableKeys.forEach(k => {
            activeFeatures[k] = (globalFlags[k] !== false) && (classFlags[k] !== false);
        });

        const isPrayerChartEnabled = activeFeatures.prayer;

        switch (role) {
            case 'admin':
                return (
                    <>
                        <div className="mb-12 text-center py-10 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                            <h1 className="text-3xl md:text-5xl font-black mb-4 relative z-10">Admin Center</h1>
                            <p className="text-indigo-200 font-medium max-w-2xl mx-auto mb-8 px-6 text-sm md:text-base relative z-10">
                                Management authority for users, academic structure, and institutional settings.
                            </p>
                            <button
                                onClick={() => startTour('admin')}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all relative z-10"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Launch Interactive Guide
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Section title="User Management" icon={Users}>
                                <p>Create and manage accounts for Mentors and Students. You can add them individually or bulk import via CSV.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Mentors" description="Assign them to classes and subjects." />
                                    <FeatureItem icon={CheckCircle} title="Students" description="Register them with details and parents' info." />
                                </div>
                            </Section>

                            <Section title="Class Management" icon={GraduationCap}>
                                <p>Structure your institution by creating Classes and Divisions. Assign Mentors to specific classes to grant them access.</p>
                            </Section>

                            <Section title="System Settings" icon={Settings}>
                                <p>Manage critical system configurations and global feature availability.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="App Feature Control" description="Toggle features like Ramadan tracking or Attendance History for everyone." />
                                    <FeatureItem icon={CheckCircle} title="Factory Reset" description="Wipe all data to start fresh (Requires Admin Password)." />
                                    <FeatureItem icon={BookOpen} title="Global Subjects" description="Create a master list of subjects for the entire institution." />
                                    <FeatureItem icon={FileText} title="Syllabus/Curriculum" description="Define the academic roadmap for each subject." />
                                </div>
                            </Section>

                            <Section title="Automated Alerts" icon={Bell}>
                                <p>The system automatically dispatches real-time notifications to relevant classes or students during key academic events.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Smart Triggers" description="Attendance, Exam schedules, and Star declarations trigger instant alerts." />
                                </div>
                            </Section>
                        </div>
                    </>
                );

            case 'mentor':
                return (
                    <>
                        <div className="mb-12 text-center py-10 bg-gradient-to-br from-purple-900 to-purple-800 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-20 -mb-20 blur-3xl"></div>
                            <h1 className="text-3xl md:text-5xl font-black mb-4 relative z-10">Mentor Hub</h1>
                            <p className="text-purple-200 font-medium max-w-2xl mx-auto mb-8 px-6 text-sm md:text-base relative z-10">
                                Record attendance, manage academic activities, and track student growth.
                            </p>
                            <button
                                onClick={() => startTour('mentor')}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all relative z-10"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Start Guide
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Section title="Attendance Recorder" icon={ClipboardCheck}>
                                <p>Mark daily attendance for your assigned class. The system automatically tracks present/absent counts.</p>
                            </Section>

                            <Section title="Activity Manager (Homework)" icon={Layers}>
                                <p>Assign homework or tasks to your classes. Track completion and assign points.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Smart Creation" description="Simply select your class and subject. We'll warn you if you try to create a duplicate activity." />
                                    <FeatureItem icon={CheckCircle} title="Edit & Manage" description="Need to change a due date? Use the Edit (Pencil) button. You can also bulk delete multiple activities at once." />
                                    <FeatureItem icon={CheckCircle} title="Student Tracker" description="Click an activity to see who has finished it. Check off students to award points." />
                                </div>
                            </Section>

                            <Section title="Question Bank" icon={FileText}>
                                <p>Create and manage questions for your subjects. You can add Multiple Choice, Short Answer, or Paragraph questions.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Images & Attachments" description="Upload reference images for questions and allow students to attach files." />
                                </div>
                            </Section>

                             <Section title="Statistics & Reports" icon={BarChart2}>
                                <p>View visual analytics and generate reports.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Attendance Register" description="Print monthly registers in landscape format." />
                                    <FeatureItem icon={CheckCircle} title="Performance Stats" description="Visual insights into class trends." />
                                </div>
                            </Section>

                            <Section title="Class Features" icon={Settings}>
                                <p>Customize the student experience for your specific batches.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Batch Controls" description="Enable or disable specific modules like Ramadan or Subjects for each class independently." />
                                    <FeatureItem icon={Book} title="Subject Assignment" description="Assign school subjects to your classes for structured homework tracking." />
                                </div>
                            </Section>

                            <Section title="Automated Alerts" icon={Bell}>
                                <p>When you record attendance or update star students, the system instantly notifies your class through badges and popups.</p>
                            </Section>
                        </div>
                    </>
                );

            case 'student':
                return (
                    <>
                        <div className="mb-12 text-center py-10 bg-gradient-to-br from-teal-900 to-teal-800 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:20px_20px] opacity-10"></div>
                            <h1 className="text-3xl md:text-5xl font-black mb-4 relative z-10">Learning Journey</h1>
                            <p className="text-teal-200 font-medium max-w-2xl mx-auto mb-8 px-6 text-sm md:text-base relative z-10">
                                Track your academic growth, spiritual milestones, and daily participation.
                            </p>
                            <button
                                onClick={() => startTour('student', { features: activeFeatures })}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all relative z-10"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Explore Portal
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Section title="Activities (Homework)" icon={Layers}>
                                <p>Stay on top of your assignments. Your dashboard shows what's pending and what's done.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Split View" description="Pending tasks are on the left, Completed history on the right. Never miss a deadline." />
                                    <FeatureItem icon={CheckCircle} title="Subject Tags" description="Every activity shows its subject (e.g., Maths, Science) so you know which notebook to grab." />
                                    <FeatureItem icon={CheckCircle} title="Attachments" description="You can upload images or files directly to your homework submission." />
                                </div>
                            </Section>

                            <Section title="Online Exams" icon={FileText}>
                                <p>Participate in scheduled online exams. Answer questions and verify your responses before submitting.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Attachments" description="You can upload files/images if the question allows it." />
                                </div>
                            </Section>

                            <Section title="Spiritual & Extra" icon={Sparkles}>
                                <div className="space-y-3">
                                    {isPrayerChartEnabled && <FeatureItem icon={BookOpen} title="Prayer Chart" description="Log your daily prayers to maintain records." />}
                                    <FeatureItem icon={Moon} title="Ramadan" description="Track spiritual goals during the holy month." />
                                    <FeatureItem icon={GraduationCap} title="Leaderboard" description="Check your rank and compare with peers." />
                                </div>
                            </Section>

                            <Section title="Records & Info" icon={CheckCircle}>
                                <div className="space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Attendance History" description="View detailed records and monthly presence rate." />
                                    <FeatureItem icon={History} title="Class History" description="Chronological log of activities, attendance, and events." />
                                    <FeatureItem icon={Book} title="My Subjects" description="See your assigned subjects and their details." />
                                    <FeatureItem icon={Info} title="Overview" description="Your overall performance summary at a glance." />
                                    <FeatureItem icon={Star} title="Star Student" description="Recognize the celebrated student of the month." />
                                </div>
                            </Section>

                            <Section title="Notifications" icon={Bell}>
                                <p>Get real-time updates through floating alerts and red badges on menu items.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Auto Popups" description="Instant alerts for important updates like attendance." />
                                    <FeatureItem icon={CheckCircle} title="Red Badges" description="Visibility on which sections have new updates." />
                                </div>
                            </Section>
                        </div>
                    </>
                );

            default:
                return <div className="text-center p-12">Role not recognized.</div>;
        }
    };

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {getContent()}
        </div>
    );
};

export default Readme;
