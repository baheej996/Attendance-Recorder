const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch } = require('firebase/firestore');

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

async function repairAttendance() {
  console.log("Fetching students map...");
  const sSnap = await getDocs(collection(db, 'students'));
  const studentClassMap = {};
  sSnap.docs.forEach(doc => {
    studentClassMap[doc.id] = doc.data().classId;
  });

  console.log(`Loaded ${Object.keys(studentClassMap).length} students. Fetching attendance docs missing classId...`);
  const aSnap = await getDocs(collection(db, 'attendance'));
  
  let batch = writeBatch(db);
  let batchCount = 0;
  let totalFixed = 0;

  for (const docSnap of aSnap.docs) {
    const data = docSnap.data();
    if (!data.classId) {
      const classId = studentClassMap[data.studentId];
      if (classId) {
        batch.update(docSnap.ref, { classId });
        batchCount++;
        totalFixed++;
        if (batchCount >= 450) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} updates...`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} updates.`);
  }

  console.log(`Repair finished! Total attendance documents fixed with classId: ${totalFixed}`);
  process.exit(0);
}

repairAttendance().catch(console.error);
