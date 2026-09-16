import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "dummy",
    authDomain: "samasthaelearning-1487e.firebaseapp.com",
    projectId: "samasthaelearning-1487e",
    storageBucket: "samasthaelearning-1487e.appspot.com",
    messagingSenderId: "dummy",
    appId: "dummy"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAugustData() {
    const mentorsSnap = await getDocs(collection(db, 'mentors'));
    const mentors = mentorsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    const activitiesSnap = await getDocs(collection(db, 'activities'));
    const activities = activitiesSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    const subsSnap = await getDocs(collection(db, 'activitySubmissions'));
    const submissions = subsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    const studentsSnap = await getDocs(collection(db, 'students'));
    const students = studentsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    console.log(`Total Mentors: ${mentors.length}`);
    console.log(`Total Activities: ${activities.length}`);
    console.log(`Total Submissions: ${submissions.length}`);
    console.log(`Total Students: ${students.length}`);

    // August 2026 filter
    const augustActivities = activities.filter(act => {
        const actDate = act.createdAt ? new Date(act.createdAt) : (act.dueDate ? new Date(act.dueDate) : null);
        if (!actDate || isNaN(actDate.getTime())) return false;
        return actDate.getFullYear() === 2026 && actDate.getMonth() === 7; // Month 7 = August (0-indexed)
    });

    console.log(`\n--- Activities Created/Due in August 2026 (${augustActivities.length} total) ---`);
    augustActivities.forEach(a => {
        console.log(`ID: ${a.id} | Title: "${a.title}" | ClassId: ${a.classId} | CreatedAt: ${a.createdAt} | DueDate: ${a.dueDate}`);
    });

    console.log(`\n--- Mentor Analysis for August 2026 ---`);
    mentors.forEach(m => {
        const assignedClassIds = m.assignedClassIds || (m.classId ? [m.classId] : []);
        const mentorStudents = students.filter(s => assignedClassIds.includes(s.classId) && s.status === 'Active');
        const mentorAugActivities = augustActivities.filter(a => assignedClassIds.includes(a.classId));
        
        let expected = 0;
        let completed = 0;

        mentorAugActivities.forEach(act => {
            const classStudents = mentorStudents.filter(s => s.classId === act.classId);
            expected += classStudents.length;

            const completedForAct = submissions.filter(sub => 
                sub.activityId === act.id && 
                sub.status === 'Completed' &&
                classStudents.some(cs => cs.id === sub.studentId)
            ).length;

            completed += completedForAct;
        });

        const pct = expected > 0 ? Math.round((completed / expected) * 100) : 0;
        console.log(`Mentor: "${m.name}" | Classes: [${assignedClassIds.join(', ')}] | Aug Activities: ${mentorAugActivities.length} | Active Students: ${mentorStudents.length} | Expected: ${expected} | Completed: ${completed} => ${pct}%`);
    });
}

checkAugustData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
