import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "samasthaelearning-1487e",
  appId: "1:907209634397:web:d41031a3ad96103fae13b4",
  storageBucket: "samasthaelearning-1487e.firebasestorage.app",
  apiKey: "AIzaSyC-02qiwgqEtF1UpHvUkE2FNPm1iqGLPP0",
  authDomain: "samasthaelearning-1487e.firebaseapp.com",
  messagingSenderId: "907209634397",
  measurementId: "G-GBKJL2VF0D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const searchString = "1523050854058";
const collectionsToSearch = [
  "admins", "settings", "leaderboardRules", "subjects", "liveClasses",
  "syllabi", "questions", "examSettings", "studentEvaluationTemplates",
  "parentFeedbackTemplates"
];
async function search() {
  console.log(`Searching Firestore for '${searchString}'...`);
  let found = false;
  for (const colName of collectionsToSearch) {
    const snap = await getDocs(collection(db, colName));
    snap.forEach(doc => {
      const data = doc.data();
      const json = JSON.stringify(data);
      if (json.includes(searchString)) {
        found = true;
        console.log(`\n✅ FOUND in collection [${colName}], Document ID: [${doc.id}]`);
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string' && value.includes(searchString)) {
            console.log(` -> Field: ${key} = ${value}`);
          }
        }
      }
    });
  }
  if (!found) {
    console.log("\n❌ Not found in students, mentors, or classes.");
  }
  console.log("\nSearch complete.");
  process.exit(0);
}

search();
