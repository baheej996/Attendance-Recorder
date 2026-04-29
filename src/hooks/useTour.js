
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
            step('[data-tour="sidebar-syllabus"]', 'Syllabus/Curriculum', 'Define the academic roadmap and learning objectives for each subject.'),
            step('[data-tour="sidebar-exams"]', 'Exam Manager', 'Create exam schedules, publish results, and manage grading systems.'),
            step('[data-tour="sidebar-notifications"]', 'Automated Alerts', 'Manage system-wide broadcasts. The system also sends automated alerts for attendance and exams.'),
            step('[data-tour="sidebar-app-features"]', 'App Feature Control', 'Enable or disable specific features like Ramadan or Subjects for the whole student app.'),
            step('[data-tour="sidebar-settings"]', 'System Settings', 'Configure global application settings and preferences.'),
            step('[data-tour="sidebar-help"]', 'Help & Support', 'Access guides (like this one!) and troubleshooting resources.')
        ];

        const mentorSteps = [
            step('header', 'Mentor Dashboard', 'This is your daily workspace for managing your class and students.'),
            step('[data-tour="sidebar-attendance"]', 'Attendance Recorder', 'Mark daily attendance. Students receive instant notification popups when you save.'),
            step('[data-tour="sidebar-notifications"]', 'System Notifications', 'View messages from admin or system alerts about your classes.'),
            step('[data-tour="sidebar-leaves"]', 'Leave Management', 'Review and approve/reject leave applications from your students.'),
            step('[data-tour="sidebar-chat"]', 'Student Chat', 'Direct communication channel with your students.'),
            step('[data-tour="sidebar-activities"]', 'Activities & Homework', 'Assign homework, projects, and track student submissions.'),
            step('[data-tour="sidebar-subjects"]', 'Subject Books', 'Manage book records and curriculum for your subjects.'),
            step('[data-tour="sidebar-prayer"]', 'Prayer Tracking', 'Monitor the daily prayer records of your students.', 'prayer'),
            step('[data-tour="sidebar-ramadan"]', 'Ramadan Mode', 'Special spiritual tracking for the holy month.', 'ramadan'),
            step('[data-tour="sidebar-star"]', 'Star Student', 'Declare the star of the month to recognize student achievements.', 'star'),
            step('[data-tour="sidebar-batches"]', 'Batch Info & Controls', 'View batch details and toggle feature access for each class specifically.'),
            step('[data-tour="sidebar-leaderboard"]', 'Performance Rankings', 'Check where your students stand in the overall leaderboard.'),
            step('[data-tour="sidebar-help"]', 'Help Center', 'Need assistance? access guides here.')
        ];

        const studentSteps = [
            step('header', 'Student Portal', 'Your personal space to track attendance, homework, and exams.'),
            step('[data-tour="sidebar-welcome"]', 'Smart Dashboard', 'Get instant alerts via popups and check red badges for new updates.'),
            step('[data-tour="sidebar-activities"]', 'Activities', 'View and submit your homework assignments. Check what is pending.', 'activities'),
            step('[data-tour="sidebar-subjects"]', 'My Subjects', 'View all your assigned subjects and academic books.', 'subjects'),
            step('[data-tour="sidebar-online-exams"]', 'Online Exams', 'Participate in scheduled online exams and view past papers.', 'exams'),
            step('[data-tour="sidebar-report-card"]', 'Report Card', 'Check your exam results and download detailed report cards.', 'results'),
            step('[data-tour="sidebar-leave"]', 'Apply for Leave', 'Submit leave requests to your mentor directly from here.', 'leave'),
            step('[data-tour="sidebar-chat"]', 'Chat with Mentor', 'Message your class teacher for any help or doubts.', 'chat'),
            step('[data-tour="sidebar-attendance"]', 'Attendance Records', 'Track your presence records and view your monthly attendance rate.', 'attendanceHistory'),
            step('[data-tour="sidebar-history"]', 'Class History', 'View a chronological history of all your recorded attendances and events.', 'history'),
            step('[data-tour="sidebar-ramadan"]', 'Ramadan', 'Log your spiritual activities during the blessed month.', 'ramadan'),
            step('[data-tour="sidebar-prayer"]', 'Prayer Chart', 'Log your daily prayers to maintain your spiritual record.', 'prayer'),
            step('[data-tour="sidebar-leaderboard"]', 'Leaderboard', 'Check your academic rank and performance compared to peers.', 'leaderboard'),
            step('[data-tour="sidebar-star"]', 'Star Student', 'View the Star of the Month and celebrated achievements.', 'star'),
            step('[data-tour="sidebar-help"]', 'Help Center', 'Access detailed guides on how to use every portal feature.')
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
                // If it has featureKey, check if it is explicitly set to false
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
