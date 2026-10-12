import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import XLSX from "xlsx";

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

async function analyze() {
    const excelPath = "C:\\Users\\SMART_MADRASA\\Downloads\\fee_payments_upload_template (3) (1).xlsx";
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const excelRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let excelSum = 0;
    excelRows.forEach(row => {
        Object.keys(row).forEach(k => {
            const kl = k.trim().toLowerCase();
            if (kl.includes("amount") || kl.includes("paid")) {
                const parsed = parseFloat(row[k]);
                if (!isNaN(parsed)) excelSum += parsed;
            }
        });
    });

    const [paymentsSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, "feePayments")),
        getDocs(collection(db, "students"))
    ]);

    let firestoreAllTotal = 0;
    let firestore2026Total = 0;

    paymentsSnap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amountPaid || d.amount || 0);
        firestoreAllTotal += amt;
        if ((d.academicYear || '2026-2027') === '2026-2027') {
            firestore2026Total += amt;
        }
    });

    console.log("================ MAIN TOTALS COMPARISON ================");
    console.log(`1. Excel File Total Amount:             ₹${excelSum.toLocaleString()}`);
    console.log(`2. Firestore DB Total (All Payments):    ₹${firestoreAllTotal.toLocaleString()}`);
    console.log(`3. Office Panel Total (2026-2027):       ₹${firestore2026Total.toLocaleString()}`);
    console.log(`--------------------------------------------------------`);
    console.log(`Difference (Excel - Office Panel 2026): ₹${(excelSum - firestore2026Total).toLocaleString()}`);
    console.log(`Difference (Excel - Firestore All):     ₹${(excelSum - firestoreAllTotal).toLocaleString()}`);

    process.exit(0);
}

analyze().catch(console.error);
