import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

// Read config from src/firebase.js (basic parsing)
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
    console.log("Fetching studentResponses...");
    const responsesSnap = await getDocs(collection(db, 'studentResponses'));
    let count = 0;
    
    const mismatched = [];

    responsesSnap.forEach(doc => {
        const data = doc.data();
        if (data.autoScore === 0) {
            // Check if there are MCQs with answers that should be > 0
            count++;
            mismatched.push(data);
        }
    });

    console.log(`Found ${count} responses with autoScore = 0`);
    if (mismatched.length > 0) {
        fs.writeFileSync('scratch/mismatched_responses.json', JSON.stringify(mismatched.slice(0, 5), null, 2));
        console.log("Saved top 5 to scratch/mismatched_responses.json");
    }
}

checkScores().then(() => {
    console.log("Done");
    process.exit(0);
}).catch(console.error);
