import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";

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

async function clearPayments() {
    console.log("Fetching feePayments documents...");
    const snap = await getDocs(collection(db, "feePayments"));
    console.log(`Found ${snap.docs.length} payment documents to delete.`);

    if (snap.docs.length === 0) {
        console.log("No payment documents found.");
        process.exit(0);
    }

    let deleted = 0;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 450);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += chunk.length;
        console.log(`Deleted ${deleted} / ${docs.length} payments...`);
    }

    console.log("All payment records successfully deleted from Firestore!");
    process.exit(0);
}

clearPayments().catch(err => {
    console.error("Error deleting payments:", err);
    process.exit(1);
});
