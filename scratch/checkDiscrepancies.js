import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkDiscrepancies() {
    const resultsSnap = await getDocs(collection(db, 'results'));
    const responsesSnap = await getDocs(collection(db, 'studentResponses'));
    
    const resultsMap = new Map();
    resultsSnap.forEach(doc => {
        const d = doc.data();
        const key = `${d.examId}_${d.subjectId}_${d.studentId}`;
        resultsMap.set(key, d.marks);
    });

    const discrepancies = [];
    
    responsesSnap.forEach(doc => {
        const d = doc.data();
        const key = `${d.examId}_${d.subjectId}_${d.studentId}`;
        const resultMarks = resultsMap.get(key);
        
        if (resultMarks === 0 && d.autoScore > 0) {
            discrepancies.push({
                studentId: d.studentId,
                subjectId: d.subjectId,
                examId: d.examId,
                resultMarks,
                autoScore: d.autoScore
            });
        }
    });

    console.log(`Found ${discrepancies.length} discrepancies`);
    if (discrepancies.length > 0) {
        console.log(JSON.stringify(discrepancies, null, 2));
    }
}

checkDiscrepancies().then(() => {
    process.exit(0);
}).catch(console.error);
