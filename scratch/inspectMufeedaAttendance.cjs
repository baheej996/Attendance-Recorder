const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function inspectMufeeda() {
  console.log("Searching for Mufeeda in students collection...");
  const sSnap = await getDocs(collection(db, 'students'));
  const mufeeda = sSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(s => 
    s.name && (s.name.toLowerCase().includes('mufeed') || s.registerNo === '23M04B020')
  );

  if (!mufeeda) {
    console.log("Mufeeda student not found!");
    process.exit(0);
  }

  console.log("Found Mufeeda:", mufeeda.id, mufeeda.name, "ClassId:", mufeeda.classId, "RegNo:", mufeeda.registerNo);

  const q = query(collection(db, 'attendance'), where('studentId', '==', mufeeda.id));
  const aSnap = await getDocs(q);
  console.log(`Total attendance records for Mufeeda (${aSnap.size}):`);

  aSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Doc ID: ${doc.id} | Date: ${data.date} | Status: ${data.status} | classId: ${data.classId} | mentorId: ${data.mentorId}`);
  });

  // Check how many total attendance docs exist in DB missing classId
  const allAtt = await getDocs(collection(db, 'attendance'));
  let missingClassIdCount = 0;
  allAtt.docs.forEach(d => {
    if (!d.data().classId) missingClassIdCount++;
  });
  console.log(`Total attendance docs in DB: ${allAtt.size}, Missing classId: ${missingClassIdCount}`);

  process.exit(0);
}

inspectMufeeda().catch(console.error);
