
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const useTour = () => {

    // Helper to create step
    const step = (element, title, description, featureKey = null) => ({
        element,
        popover: { title, description, popoverClass: 'driverjs-theme' },
        featureKey // Custom property to track feature dependency
    });

    const getSteps = (role) => {
        const adminSteps = [
            step('header', 'Admin Portal', 'Welcome to the main command center. From here you can oversee the entire institution.'),
            step('[data-tour="sidebar-overview"]', 'Dashboard Overview', 'View real-time statistics of students, mentors, and classes.'),
            step('[data-tour="sidebar-classes"]', 'Class Management', 'Create new classes, manage divisions, and assign class teachers.'),
            step('[data-tour="sidebar-mentors"]', 'Mentor Management', 'Add new mentors, assign them to classes, and track their performance.'),
            step('[data-tour="sidebar-students"]', 'Student Management', 'Register new students, manage admissions, and update student profiles.'),
            step('[data-tour="sidebar-bulk-transfer"]', 'Bulk Transfer', 'Promote batches of students to the next academic year (e.g., Class 1 to Class 2).'),
            step('[data-tour="sidebar-subjects"]', 'Subject Configuration', 'Define the subjects taught in your institution and assign them to classes.'),
            step('[data-tour="sidebar-exams"]', 'Exam Manager', 'Create exam schedules, publish results, and manage grading systems.'),
            step('[data-tour="sidebar-settings"]', 'System Settings', 'Configure global application settings and preferences.'),
            step('[data-tour="sidebar-help"]', 'Help & Support', 'Access guides (like this one!) and troubleshooting resources.')
        ];

        const mentorSteps = [
            step('header', 'Mentor Dashboard', 'This is your daily workspace for managing your class and students.'),
            step('[data-tour="sidebar-attendance"]', 'Attendance Recorder', 'Mark daily attendance for your students with a single click.'),
            step('[data-tour="sidebar-leaves"]', 'Leave Management', 'Review and approve/reject leave applications from your students.'),
            step('[data-tour="sidebar-chat"]', 'Student Chat', 'Direct communication channel with your students for doubts and announcements.'),
            step('[data-tour="sidebar-activities"]', 'Activities & Homework', 'Assign homework, projects, and track student submissions.'),
            step('[data-tour="sidebar-logbook"]', 'Daily Log Book', 'Record daily classroom activities and lesson progress.'),
            step('[data-tour="sidebar-prayer"]', 'Prayer Tracking', 'Monitor the daily prayer records of your students.', 'prayerChart'),
            step('[data-tour="sidebar-print"]', 'Reports & Registers', 'Generate and print monthly attendance registers.'),
            step('[data-tour="sidebar-questions"]', 'Question Bank', 'Create and manage a repository of questions for exams.'),
            step('[data-tour="sidebar-marks"]', 'Marks Entry', 'Enter and update student marks for offline exams.'),
            step('[data-tour="sidebar-stats"]', 'Class Statistics', 'View analytical insights about your class performance.'),
            step('[data-tour="sidebar-batches"]', 'Batch Info', 'View details about the batches you handle.'),
            step('[data-tour="sidebar-settings"]', 'Profile Settings', 'Update your profile and application preferences.'),
            step('[data-tour="sidebar-help"]', 'Help Center', 'Need assistance? access guides here.')
        ];

        const studentSteps = [
            step('header', 'Student Portal', 'Your personal space to track attendance, homework, and exams.'),
            step('[data-tour="sidebar-overview"]', 'Dashboard', 'See your attendance percentage, rank, and recent updates at a glance.'),
            step('[data-tour="sidebar-activities"]', 'Activities', 'View and submit your homework assignments. Check what is pending.'),
            step('[data-tour="sidebar-online-exams"]', 'Online Exams', 'Participate in scheduled online exams and view past papers.'),
            step('[data-tour="sidebar-report-card"]', 'Report Card', 'Check your exam results and download detailed report cards.'),
            step('[data-tour="sidebar-leave-applications"]', 'Apply for Leave', 'Submit leave requests to your mentor directly from here.'),
            step('[data-tour="sidebar-chat-with-mentor"]', 'Chat with Mentor', 'Message your class teacher for any help or doubts.'),
            step('[data-tour="sidebar-prayer-chart"]', 'Prayer Chart', 'Log your daily prayers to maintain your spiritual record.', 'prayerChart'),
            step('[data-tour="sidebar-class-history"]', 'Class History', 'View your academic history and past records.'),
            step('[data-tour="sidebar-leaderboard"]', 'Leaderboard', 'Check your academic rank and performance compared to peers.'),
            step('[data-tour="sidebar-help"]', 'Help', 'Access guides on how to use the portal.')
        ];

        switch (role) {
            case 'admin': return adminSteps;
            case 'mentor': return mentorSteps;
            case 'student': return studentSteps;
            default: return [];
        }
    };

    const startTour = (role, options = {}) => {
        let steps = getSteps(role);

        // Filter based on features if provided
        if (options.features) {
            steps = steps.filter(s => {
                // If step has no featureKey, keep it
                if (!s.featureKey) return true;
                // If it has featureKey, check if it is enabled (default to true if not specified in options, but false usually means disabled explicitly)
                // We assume features object has boolean values like { prayerChart: false }
                return options.features[s.featureKey] !== false;
            });
        }

        const tourDriver = driver({
            showProgress: true,
            steps: steps,
            overlayColor: 'rgba(0,0,0,0.6)', // Darker overlay
            animate: true,
            allowClose: true,
            doneBtnText: 'Finish',
            nextBtnText: 'Next',
            prevBtnText: 'Previous',
            onDestroyed: () => console.log('Tour finished')
        });

        tourDriver.drive();
    };

    return { startTour };
};
