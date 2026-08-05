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

async function checkSubjects() {
    const classId = "6yfyuqaxRXBK5309jugH";
    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    const fiqhSubjects = [];
    
    subjectsSnap.forEach(doc => {
        const data = doc.data();
        if (data.classId === classId && (data.name.toLowerCase() === 'fiqh' || data.name.includes('Fiqh'))) {
            fiqhSubjects.push({ id: doc.id, ...data });
        }
    });

    console.log("Fiqh subjects in class:");
    console.log(JSON.stringify(fiqhSubjects, null, 2));
}

checkSubjects().then(() => {
    process.exit(0);
}).catch(console.error);
