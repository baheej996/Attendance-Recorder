
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const useTour = () => {

    const getSteps = (role) => {
        const adminSteps = [
            { element: 'header', popover: { title: 'Admin Portal', description: 'Welcome to your command center. Access all school management tools here.' } },
            { element: 'nav', popover: { title: 'Navigation', description: 'Switch between Dashboard, Classes, Mentors, and Settings.' } },
            { element: '[href*="bulk-transfer"]', popover: { title: 'New: Bulk Transfer', description: 'Promote students to the next academic year in bulk.' } },
            { element: '.grid-cols-3', popover: { title: 'Quick Stats', description: 'See live counts of Classes, Mentors, and Students.' } },
        ];

        const mentorSteps = [
            { element: 'header', popover: { title: 'Mentor Dashboard', description: 'Manage your class, attendance, and student performance.' } },
            { element: '[href*="attendance"]', popover: { title: 'Attendance', description: 'Mark daily attendance for your students.' } },
            { element: '[href*="activities"]', popover: { title: 'Homework & Activities', description: 'Assign and grade homework.' } },
            { element: '[href*="chat"]', popover: { title: 'Chat', description: 'Communicate with your students directly.' } },
        ];

        const studentSteps = [
            { element: 'header', popover: { title: 'Student Portal', description: 'Track your progress and stay updated.' } },
            { element: '.recharts-responsive-container', popover: { title: 'Attendance Chart', description: 'Monitor your attendance percentage.' } },
            { element: '[href*="activities"]', popover: { title: 'My Activities', description: 'View pending homework and submit your work.' } },
            { element: '[href*="exams"]', popover: { title: 'Online Exams', description: 'Take scheduled exams and view results.' } },
        ];

        switch (role) {
            case 'admin': return adminSteps;
            case 'mentor': return mentorSteps;
            case 'student': return studentSteps;
            default: return [];
        }
    };

    const startTour = (role) => {
        const steps = getSteps(role);

        const tourDriver = driver({
            showProgress: true,
            steps: steps,
            overlayColor: 'red',
            onDestroyed: () => console.log('Tour finished') // Optional cleanup
        });

        tourDriver.drive();
    };

    return { startTour };
};
