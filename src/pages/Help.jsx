import React from 'react';
import { BookOpen, Shield, Users, GraduationCap, ClipboardCheck, FileText, BarChart2, CheckCircle, Info, Printer, Layers, PlayCircle, HelpCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useTour } from '../hooks/useTour';

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-gray-600 space-y-2 leading-relaxed">
            {children}
        </div>
    </div>
);

const FeatureItem = ({ icon: Icon, title, description }) => (
    <div className="flex gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
        <div className="mt-1 text-indigo-600">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <h4 className="font-bold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
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
        const isPrayerChartEnabled = (globalFlags.prayer !== false) && (classFlags.prayer !== false);

        switch (role) {
            case 'admin':
                return (
                    <>
                        <div className="mb-12 text-center">
                            <h1 className="text-3xl font-bold text-indigo-900 mb-4">Admin Guide</h1>
                            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                                Complete control over the system. Manage users, classes, and system settings.
                            </p>
                            <button
                                onClick={() => startTour('admin')}
                                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-full font-medium shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all animate-bounce-subtle"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Start Interactive Tour
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

                            <Section title="System Settings" icon={Shield}>
                                <p>Manage critical system configurations.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Factory Reset" description="Wipe all data to start fresh (Requires Admin Password)." />
                                    <FeatureItem icon={CheckCircle} title="Subject Management" description="Create subjects that Mentors can link to their Activities/Homework." />
                                </div>
                            </Section>

                            <Section title="Exam Management" icon={FileText}>
                                <p>Create and schedule exams for different classes. You control the examination timeline and publication of results.</p>
                            </Section>
                        </div>
                    </>
                );

            case 'mentor':
                return (
                    <>
                        <div className="mb-12 text-center">
                            <h1 className="text-3xl font-bold text-purple-900 mb-4">Mentor Guide</h1>
                            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                                Manage your class, record attendance, and evaluate student performance.
                            </p>
                            <button
                                onClick={() => startTour('mentor')}
                                className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-full font-medium shadow-lg hover:bg-purple-700 hover:scale-105 transition-all"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Guide Me
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

                            <Section title="Grading & Marks" icon={BarChart2}>
                                <p>Grade student submissions and enter marks manually if needed. View detailed feedback for every student.</p>
                            </Section>

                            <Section title="Statistics" icon={Info}>
                                <p>View visual analytics of your class performance and attendance trends over time.</p>
                            </Section>

                            <Section title="Print Register" icon={Printer}>
                                <p>Generate and print monthly student attendance registers in an optimized A4 landscape format.</p>
                                <div className="mt-4 space-y-3">
                                    <FeatureItem icon={CheckCircle} title="Working Days" description="Auto-calculated summary of working days for the month." />
                                    <FeatureItem icon={CheckCircle} title="Signatures" description="Dedicated spaces for Mentor, Chief Mentor, and Mufathish signatures." />
                                </div>
                            </Section>
                        </div>
                    </>
                );

            case 'student':
                return (
                    <>
                        <div className="mb-12 text-center">
                            <h1 className="text-3xl font-bold text-teal-900 mb-4">Student Guide</h1>
                            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                                Track your progress, take online exams, and view your results.
                            </p>
                            <button
                                onClick={() => startTour('student', { features: { prayerChart: isPrayerChartEnabled } })}
                                className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-full font-medium shadow-lg hover:bg-teal-700 hover:scale-105 transition-all"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Show Me Around
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

                            <Section title="Results & Reports" icon={BarChart2}>
                                <p>View your graded answer sheets and download your detailed Report Card as a PDF.</p>
                            </Section>

                            {/* Conditionally Render Prayer Chart Help */}
                            {isPrayerChartEnabled && (
                                <Section title="Prayer Chart" icon={BookOpen}>
                                    <p>Track your daily prayers. Mark the prayers you have offered each day to maintain your spiritual record.</p>
                                </Section>
                            )}

                            <Section title="Leaderboard" icon={GraduationCap}>
                                <p>Check your rank and see how you compare with your peers in different subjects.</p>
                            </Section>

                            <Section title="Overview" icon={Info}>
                                <p>See your overall attendance percentage and academic performance summary at a glance.</p>
                            </Section>
                        </div>
                    </>
                );

            default:
                return <div className="text-center p-12">Role not recognized.</div>;
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {getContent()}
        </div>
    );
};

export default Readme;
