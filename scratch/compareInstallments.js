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

    let excelInstallmentTotal = 0;
    let excelRowTotals = new Map(); // regNo -> total paid in excel

    excelRows.forEach((row, i) => {
        const inst1 = parseFloat(row.Installment1) || 0;
        const inst2 = parseFloat(row.Installment2) || 0;
        const inst3 = parseFloat(row.Installment3) || 0;
        const totalPaidInRow = inst1 + inst2 + inst3;
        excelInstallmentTotal += totalPaidInRow;

        const regNo = String(row.RegisterNo || "").trim();
        const name = String(row.StudentName || "").trim();
        const key = regNo || name.toLowerCase();

        excelRowTotals.set(key, {
            rowIndex: i + 2,
            regNo,
            studentName: name,
            inst1,
            inst2,
            inst3,
            excelPaid: totalPaidInRow,
            applicable: parseFloat(row.ApplicableAmount) || 0
        });
    });

    console.log(`Excel Sum of (Installment1 + Installment2 + Installment3): ₹${excelInstallmentTotal.toLocaleString()}`);

    // Fetch Firestore feePayments and students
    const [paymentsSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, "feePayments")),
        getDocs(collection(db, "students"))
    ]);

    const studentsByRegNo = new Map();
    const studentsByName = new Map();

    studentsSnap.docs.forEach(doc => {
        const s = { id: doc.id, ...doc.data() };
        if (s.registerNo) studentsByRegNo.set(String(s.registerNo).trim(), s);
        if (s.name) studentsByName.set(String(s.name).trim().toLowerCase(), s);
    });

    // Sum payments per student in Firestore
    const dbPaymentsByStudentId = new Map();
    let dbGrandTotal = 0;

    paymentsSnap.docs.forEach(doc => {
        const p = doc.data();
        const amt = Number(p.amountPaid || p.amount || 0);
        dbGrandTotal += amt;
        const sId = p.studentId || p.studentUID || p.uid;
        if (sId) {
            dbPaymentsByStudentId.set(sId, (dbPaymentsByStudentId.get(sId) || 0) + amt);
        }
    });

    console.log(`Firestore Total Fee Collected: ₹${dbGrandTotal.toLocaleString()}`);
    console.log(`Exact Shortfall (Excel - Firestore): ₹${(excelInstallmentTotal - dbGrandTotal).toLocaleString()}`);

    // Identify student discrepancies
    const missingStudents = [];

    excelRowTotals.forEach((item, key) => {
        let student = null;
        if (item.regNo && studentsByRegNo.has(item.regNo)) student = studentsByRegNo.get(item.regNo);
        else if (item.studentName && studentsByName.has(item.studentName.toLowerCase())) student = studentsByName.get(item.studentName.toLowerCase());

        const dbPaid = student ? (dbPaymentsByStudentId.get(student.id) || 0) : 0;
        const diff = item.excelPaid - dbPaid;

        if (diff > 0.01) { // Excel has more paid amount than DB
            missingStudents.push({
                rowIndex: item.rowIndex,
                regNo: item.regNo || student?.registerNo || "N/A",
                studentName: item.studentName || student?.name || "Unknown",
                excelPaid: item.excelPaid,
                dbPaid: dbPaid,
                missingAmount: diff,
                inDb: !!student,
                inst1: item.inst1,
                inst2: item.inst2,
                inst3: item.inst3
            });
        }
    });

    missingStudents.sort((a, b) => b.missingAmount - a.missingAmount);

    console.log(`\nFound ${missingStudents.length} student rows where Excel Paid Amount > Database Uploaded Amount:`);
    console.table(missingStudents.map((m, idx) => ({
        "#": idx + 1,
        "Excel Row": m.rowIndex,
        "Reg No": m.regNo,
        "Student Name": m.studentName,
        "Excel Paid": `₹${m.excelPaid.toLocaleString()}`,
        "Site (DB) Paid": `₹${m.dbPaid.toLocaleString()}`,
        "Unuploaded Amount": `₹${m.missingAmount.toLocaleString()}`,
        "Student Exists in DB": m.inDb ? "Yes" : "NO (Not Found)"
    })));

    process.exit(0);
}

analyze().catch(console.error);
