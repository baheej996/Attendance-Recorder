const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    projectId: "samasthaelearning-1487e",
    appId: "1:907209634397:web:d41031a3ad96103fae13b4",
    storageBucket: "samasthaelearning-1487e.firebasestorage.app",
    apiKey: "AIzaSyC-02qiwgqEtF1UpHvUkE2FNPm1iqGLPP0",
    authDomain: "samasthaelearning-1487e.firebaseapp.com",
    messagingSenderId: "907209634397"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectClassAndMentor() {
  const classDoc = await getDoc(doc(db, 'classes', 'R3UDWTqsHrAKpoT9kEak'));
  console.log("Class R3UDWTqsHrAKpoT9kEak:", classDoc.exists() ? classDoc.data() : "NOT FOUND");

  const cSnap = await getDocs(collection(db, 'classes'));
  cSnap.docs.forEach(d => {
    if (d.data().name === '7' && d.data().division === 'C') {
      console.log("Class 7-C ID:", d.id, d.data());
    }
  });

  const mSnap = await getDocs(collection(db, 'mentors'));
  mSnap.docs.forEach(d => {
    const data = d.data();
    if (d.id === 'pOLu4PwEuiRtDuehasWU' || (data.assignedClassIds && data.assignedClassIds.includes('R3UDWTqsHrAKpoT9kEak'))) {
      console.log("Mentor:", d.id, data.name, "assignedClassIds:", data.assignedClassIds);
    }
  });

  process.exit(0);
}

inspectClassAndMentor().catch(console.error);
