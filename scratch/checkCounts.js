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

async function checkCounts() {
    const classId = "6yfyuqaxRXBK5309jugH";
    const q1 = query(collection(db, 'results'), where('classId', '==', classId));
    const snap1 = await getCountFromServer(q1);
    
    const q2 = query(collection(db, 'studentResponses'), where('classId', '==', classId));
    const snap2 = await getCountFromServer(q2);
    
    console.log(`Results for class ${classId}:`, snap1.data().count);
    console.log(`Responses for class ${classId}:`, snap2.data().count);
}

checkCounts().then(() => {
    process.exit(0);
}).catch(console.error);
