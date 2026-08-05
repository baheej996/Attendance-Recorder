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

async function checkMentorClasses() {
    const mentorsSnap = await getDocs(collection(db, 'mentors'));
    let maxResults = 0;
    let mentorWithMost = null;
    let assignedClasses = [];

    for (const doc of mentorsSnap.docs) {
        const data = doc.data();
        const classes = data.assignedClassIds || (data.classId ? [data.classId] : []);
        if (classes.length > 0) {
            // Because Firestore 'in' queries support max 30, we chunk them
            const chunks = [];
            for (let i = 0; i < classes.length; i += 30) {
                chunks.push(classes.slice(i, i + 30));
            }
            
            let total = 0;
            for (const chunk of chunks) {
                const q = query(collection(db, 'results'), where('classId', 'in', chunk));
                const snap = await getCountFromServer(q);
                total += snap.data().count;
            }

            if (total > maxResults) {
                maxResults = total;
                mentorWithMost = { name: data.name, username: data.username, id: doc.id };
                assignedClasses = classes;
            }
        }
    }

    console.log(`Mentor with most results: ${mentorWithMost?.name} (${maxResults} results)`);
    console.log(`Assigned classes: ${assignedClasses.length}`);
}

checkMentorClasses().then(() => {
    process.exit(0);
}).catch(console.error);
