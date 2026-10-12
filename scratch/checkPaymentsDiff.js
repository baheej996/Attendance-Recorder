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
    const excelStudentPayments = new Map(); // regNo or studentId -> array of rows

    excelRows.forEach((row, i) => {
        let amount = 0;
        let regNo = "";
        let studentId = "";
        let name = "";

        Object.keys(row).forEach(k => {
            const kl = k.trim().toLowerCase();
            const val = String(row[k]).trim();
            if (kl.includes("amount") || kl.includes("paid")) {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) amount = parsed;
            }
            if (kl.includes("reg") || kl.includes("admission")) regNo = val;
            if (kl === "studentid" || kl === "student id" || kl === "id") studentId = val;
            if (kl.includes("name") || kl.includes("student")) {
                if (!name) name = val;
            }
        });

        excelSum += amount;

        const key = regNo || studentId || name.toLowerCase();
        if (key) {
            if (!excelStudentPayments.has(key)) excelStudentPayments.set(key, []);
            excelStudentPayments.get(key).push({
                rowIndex: i + 2,
                amount,
                regNo,
                studentId,
                name,
                raw: row
            });
        }
    });

    console.log(`Excel Total Sum: ₹${excelSum.toLocaleString()}`);

    // Fetch Firestore feePayments and students
    const [paymentsSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, "feePayments")),
        getDocs(collection(db, "students"))
    ]);

    let firestoreAllTotal = 0;
    let firestore2026Total = 0;
    const dbPayments = [];

    paymentsSnap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amountPaid || d.amount || 0);
        firestoreAllTotal += amt;
        if ((d.academicYear || '2026-2027') === '2026-2027') {
            firestore2026Total += amt;
        }
        dbPayments.push({
            id: doc.id,
            amt,
            studentId: d.studentId || d.studentUID || d.uid,
            registerNo: d.registerNo,
            studentName: d.studentName,
            academicYear: d.academicYear
        });
    });

    console.log(`Firestore ALL Payments Total:       ₹${firestoreAllTotal.toLocaleString()}`);
    console.log(`Firestore 2026-2027 Payments Total: ₹${firestore2026Total.toLocaleString()}`);
    console.log(`Difference (Excel - Firestore 2026): ₹${(excelSum - firestore2026Total).toLocaleString()}`);
    console.log(`Difference (Excel - Firestore ALL):  ₹${(excelSum - firestoreAllTotal).toLocaleString()}`);

    // Group dbPayments by RegisterNo / StudentId
    const dbPaymentsByRegNo = new Map();
    const dbPaymentsByStudentId = new Map();
    const dbPaymentsByName = new Map();

    dbPayments.forEach(p => {
        if (p.registerNo) {
            const k = String(p.registerNo).trim();
            if (!dbPaymentsByRegNo.has(k)) dbPaymentsByRegNo.set(k, []);
            dbPaymentsByRegNo.get(k).push(p);
        }
        if (p.studentId) {
            const k = String(p.studentId).trim();
            if (!dbPaymentsByStudentId.has(k)) dbPaymentsByStudentId.set(k, []);
            dbPaymentsByStudentId.get(k).push(p);
        }
        if (p.studentName) {
            const k = String(p.studentName).trim().toLowerCase();
            if (!dbPaymentsByName.has(k)) dbPaymentsByName.set(k, []);
            dbPaymentsByName.get(k).push(p);
        }
    });

    // Map students in DB
    const dbStudentsByRegNo = new Map();
    const dbStudentsById = new Map();
    const dbStudentsByName = new Map();

    studentsSnap.docs.forEach(doc => {
        const s = { id: doc.id, ...doc.data() };
        if (s.registerNo) dbStudentsByRegNo.set(String(s.registerNo).trim(), s);
        if (s.id) dbStudentsById.set(String(s.id).trim(), s);
        if (s.name) dbStudentsByName.set(String(s.name).trim().toLowerCase(), s);
    });

    // Check each Excel entry to see if it exists in DB
    const unuploadedExcelRows = [];
    let unuploadedTotal = 0;

    excelRows.forEach((row, i) => {
        let amount = 0;
        let regNo = "";
        let studentId = "";
        let name = "";

        Object.keys(row).forEach(k => {
            const kl = k.trim().toLowerCase();
            const val = String(row[k]).trim();
            if (kl.includes("amount") || kl.includes("paid")) {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) amount = parsed;
            }
            if (kl.includes("reg") || kl.includes("admission")) regNo = val;
            if (kl === "studentid" || kl === "student id" || kl === "id") studentId = val;
            if (kl.includes("name") || kl.includes("student")) {
                if (!name) name = val;
            }
        });

        if (amount === 0) return; // Skip zero amount rows

        // Find student in DB
        let student = null;
        if (studentId && dbStudentsById.has(studentId)) student = dbStudentsById.get(studentId);
        else if (regNo && dbStudentsByRegNo.has(regNo)) student = dbStudentsByRegNo.get(regNo);
        else if (name && dbStudentsByName.has(name.toLowerCase())) student = dbStudentsByName.get(name.toLowerCase());

        // Find payment for student in DB
        let foundPayment = false;
        let dbStudentPayments = [];
        if (student) {
            dbStudentPayments = dbPaymentsByStudentId.get(student.id) || [];
        } else if (regNo && dbPaymentsByRegNo.has(regNo)) {
            dbStudentPayments = dbPaymentsByRegNo.get(regNo);
        } else if (name && dbPaymentsByName.has(name.toLowerCase())) {
            dbStudentPayments = dbPaymentsByName.get(name.toLowerCase());
        }

        // Check if there is an available matching payment
        const matchIdx = dbStudentPayments.findIndex(p => Math.abs(p.amt - amount) < 0.01 && !p.matched);
        if (matchIdx !== -1) {
            dbStudentPayments[matchIdx].matched = true;
            foundPayment = true;
        }

        if (!foundPayment) {
            unuploadedExcelRows.push({
                rowIndex: i + 2,
                regNo: regNo || student?.registerNo || "N/A",
                name: name || student?.name || "Unknown",
                amount,
                studentInDb: !!student,
                dbTotalForStudent: dbStudentPayments.reduce((a, b) => a + b.amt, 0)
            });
            unuploadedTotal += amount;
        }
    });

    console.log(`\n================ UNUPLOADED / MISSING EXCEL PAYMENTS ================`);
    console.log(`Total missing payment rows (amount > 0): ${unuploadedExcelRows.length}`);
    console.log(`Total missing amount: ₹${unuploadedTotal.toLocaleString()}`);

    unuploadedExcelRows.sort((a, b) => b.amount - a.amount);

    console.table(unuploadedExcelRows.map((r, idx) => ({
        "#": idx + 1,
        "Excel Row": r.rowIndex,
        "Reg No": r.regNo,
        "Student Name": r.name,
        "Missing Paid Amount": `₹${r.amount.toLocaleString()}`,
        "Student in DB": r.studentInDb ? "Yes" : "No",
        "Total DB Paid for Student": `₹${r.dbTotalForStudent.toLocaleString()}`
    })));

    process.exit(0);
}

analyze().catch(err => {
    console.error(err);
    process.exit(1);
});
