import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "samasthaelearning-1487e",
  appId: "1:907209634397:web:d41031a3ad96103fae13b4",
  storageBucket: "samasthaelearning-1487e.firebasestorage.app",
  apiKey: "AIzaSyC-02qiwgqEtF1UpHvUkE2FNPm1iqGLPP0",
  authDomain: "samasthaelearning-1487e.firebaseapp.com",
  messagingSenderId: "907209634397",
  measurementId: "G-GBKJL2VF0D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    const [classesSnap, mentorsSnap] = await Promise.all([
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "mentors"))
    ]);

    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const mentors = mentorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`Total Classes: ${classes.length}`);
    console.log(`Total Mentors: ${mentors.length}`);

    console.log("Sample Class 0:", classes[0]);
    console.log("Sample Mentor 0:", mentors[0]);

    let matchedCount = 0;
    classes.forEach(c => {
        let mentorName = c.mentorName || null;
        if (!mentorName) {
            const m = mentors.find(men => 
                (men.assignedClassIds || []).includes(c.id) ||
                (men.assignedClasses || []).includes(c.name) ||
                (men.assignedClasses || []).includes(`${c.name}-${c.division}`) ||
                men.id === c.mentorId ||
                men.classId === c.id
            );
            if (m) mentorName = m.name;
        }

        if (mentorName) matchedCount++;
        else console.log(`Unmatched Class: ${c.name}-${c.division} (ID: ${c.id})`);
    });

    console.log(`Matched ${matchedCount} / ${classes.length} classes to mentors.`);
    process.exit(0);
}

test().catch(console.error);
