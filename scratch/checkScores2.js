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

async function checkScores() {
    const responsesSnap = await getDocs(collection(db, 'studentResponses'));
    const mismatched = [];

    responsesSnap.forEach(doc => {
        const data = doc.data();
        if (data.autoScore === 0 && Object.keys(data.answers || {}).length > 0) {
            mismatched.push(data);
        }
    });

    console.log(`Found ${mismatched.length} responses with autoScore = 0 but HAVE ANSWERS`);
    fs.writeFileSync('scratch/mismatched_responses_with_answers.json', JSON.stringify(mismatched, null, 2));
}

checkScores().then(() => {
    process.exit(0);
}).catch(console.error);
