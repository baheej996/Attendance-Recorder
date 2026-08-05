import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

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

async function checkResults() {
    const resultsSnap = await getDocs(collection(db, 'results'));
    const studentsSnap = await getDocs(collection(db, 'students'));
    const students = [];
    studentsSnap.forEach(s => students.push({...s.data(), id: s.id}));
    
    // Find Atik Zayan
    const atik = students.find(s => s.name && s.name.toLowerCase().includes('atik zayan'));
    console.log("Found student:", atik ? atik.id : "No");

    if (atik) {
        const atikResults = [];
        resultsSnap.forEach(doc => {
            const data = doc.data();
            if (data.studentId === atik.id) {
                atikResults.push(data);
            }
        });
        console.log("Atik's Results in 'results' collection:");
        console.log(JSON.stringify(atikResults, null, 2));

        const resSnap = await getDocs(collection(db, 'studentResponses'));
        const atikResponses = [];
        resSnap.forEach(doc => {
            const data = doc.data();
            if (data.studentId === atik.id) {
                atikResponses.push(data);
            }
        });
        console.log("Atik's Responses in 'studentResponses' collection:");
        console.log(JSON.stringify(atikResponses, null, 2));
    }
}

checkResults().then(() => {
    process.exit(0);
}).catch(console.error);
