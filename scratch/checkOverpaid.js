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

    const excelByStudent = new Map();
    excelRows.forEach((row, idx) => {
        const inst1 = parseFloat(row.Installment1) || 0;
        const inst2 = parseFloat(row.Installment2) || 0;
        const inst3 = parseFloat(row.Installment3) || 0;
        const rowPaid = inst1 + inst2 + inst3;
        const regNo = String(row.RegisterNo || "").trim();
        const name = String(row.StudentName || "").trim();
        const key = regNo || name.toLowerCase();
        if (key) {
            excelByStudent.set(key, { regNo, name, excelPaid: rowPaid, rowIndex: idx + 2 });
        }
    });

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

    const dbPaidByStudentId = new Map();
    paymentsSnap.docs.forEach(doc => {
        const p = doc.data();
        const amt = Number(p.amountPaid || p.amount || 0);
        const sId = p.studentId || p.studentUID || p.uid;
        if (sId) {
            dbPaidByStudentId.set(sId, (dbPaidByStudentId.get(sId) || 0) + amt);
        }
    });

    const overpaidStudents = [];
    excelByStudent.forEach((item, key) => {
        let student = null;
        if (item.regNo && studentsByRegNo.has(item.regNo)) student = studentsByRegNo.get(item.regNo);
        else if (item.name && studentsByName.has(item.name.toLowerCase())) student = studentsByName.get(item.name.toLowerCase());

        if (student) {
            const sitePaid = dbPaidByStudentId.get(student.id) || 0;
            if (sitePaid > item.excelPaid) {
                overpaidStudents.push({
                    row: item.rowIndex,
                    regNo: item.regNo,
                    name: item.name,
                    excelPaid: item.excelPaid,
                    sitePaid,
                    extraOnSite: sitePaid - item.excelPaid
                });
            }
        }
    });

    console.log("Students with extra payments on site:");
    console.table(overpaidStudents);
    process.exit(0);
}

analyze().catch(console.error);
