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

    // 1. Group Excel paid amounts by Register No / Student Name
    let excelGrandTotal = 0;
    const excelByStudent = new Map();

    excelRows.forEach((row, idx) => {
        const inst1 = parseFloat(row.Installment1) || 0;
        const inst2 = parseFloat(row.Installment2) || 0;
        const inst3 = parseFloat(row.Installment3) || 0;
        const rowPaid = inst1 + inst2 + inst3;

        excelGrandTotal += rowPaid;

        const regNo = String(row.RegisterNo || "").trim();
        const name = String(row.StudentName || "").trim();
        const key = regNo || name.toLowerCase();

        if (key) {
            excelByStudent.set(key, {
                regNo,
                name,
                excelPaid: rowPaid,
                rowIndex: idx + 2
            });
        }
    });

    // 2. Fetch current Firestore feePayments and students
    const [paymentsSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, "feePayments")),
        getDocs(collection(db, "students"))
    ]);

    const studentsByRegNo = new Map();
    const studentsByName = new Map();
    const studentsById = new Map();

    studentsSnap.docs.forEach(doc => {
        const s = { id: doc.id, ...doc.data() };
        if (s.registerNo) studentsByRegNo.set(String(s.registerNo).trim(), s);
        if (s.id) studentsById.set(String(s.id).trim(), s);
        if (s.name) studentsByName.set(String(s.name).trim().toLowerCase(), s);
    });

    let dbGrandTotal = 0;
    let db2026Total = 0;
    const dbPaidByStudentId = new Map();

    paymentsSnap.docs.forEach(doc => {
        const p = doc.data();
        const amt = Number(p.amountPaid || p.amount || 0);
        dbGrandTotal += amt;
        if ((p.academicYear || '2026-2027') === '2026-2027') {
            db2026Total += amt;
        }
        const sId = p.studentId || p.studentUID || p.uid;
        if (sId) {
            dbPaidByStudentId.set(sId, (dbPaidByStudentId.get(sId) || 0) + amt);
        }
    });

    console.log("================ CURRENT LIVE STATS ================");
    console.log(`Excel Grand Total (Inst 1+2+3):     ₹${excelGrandTotal.toLocaleString()}`);
    console.log(`Firestore DB Current Total (2026):   ₹${db2026Total.toLocaleString()}`);
    console.log(`Firestore DB Current Total (All):    ₹${dbGrandTotal.toLocaleString()}`);
    console.log(`Net Shortfall (Excel - DB Current): ₹${(excelGrandTotal - db2026Total).toLocaleString()}`);

    // 3. Categorize every Excel student record into categories:
    // Category A: Student NOT found in DB (Not Registered)
    // Category B: Student IS in DB, but DB Paid < Excel Paid (Partially uploaded / shortfall)
    // Category C: Student IS in DB, and DB Paid === Excel Paid (Fully matched)
    // Category D: Student IS in DB, and DB Paid > Excel Paid (Overpaid in DB / manual entry)

    let notFoundCount = 0;
    let notFoundPaidSum = 0;
    const notFoundStudents = [];

    let underpaidInDbCount = 0;
    let underpaidInDbShortfall = 0;
    let underpaidInDbExcelSum = 0;
    let underpaidInDbSiteSum = 0;
    const underpaidStudents = [];

    let matchedCount = 0;
    let matchedSum = 0;

    let overpaidInDbCount = 0;
    let overpaidInDbSurplus = 0;
    const overpaidStudents = [];

    excelByStudent.forEach((item, key) => {
        let student = null;
        if (item.regNo && studentsByRegNo.has(item.regNo)) student = studentsByRegNo.get(item.regNo);
        else if (item.name && studentsByName.has(item.name.toLowerCase())) student = studentsByName.get(item.name.toLowerCase());

        if (!student) {
            notFoundCount++;
            notFoundPaidSum += item.excelPaid;
            notFoundStudents.push(item);
        } else {
            const sitePaid = dbPaidByStudentId.get(student.id) || 0;
            const diff = item.excelPaid - sitePaid;

            if (Math.abs(diff) < 0.01) {
                matchedCount++;
                matchedSum += item.excelPaid;
            } else if (diff > 0.01) {
                // Excel paid is higher than Site paid
                underpaidInDbCount++;
                underpaidInDbShortfall += diff;
                underpaidInDbExcelSum += item.excelPaid;
                underpaidInDbSiteSum += sitePaid;
                underpaidStudents.push({
                    ...item,
                    sitePaid,
                    shortfall: diff
                });
            } else {
                // Site paid is higher than Excel paid
                overpaidInDbCount++;
                const surplus = sitePaid - item.excelPaid;
                overpaidInDbSurplus += surplus;
                overpaidStudents.push({
                    ...item,
                    sitePaid,
                    surplus
                });
            }
        }
    });

    console.log("\n================ BREAKDOWN BY CATEGORY ================");
    console.log(`Category 1 [Not Found in Site DB]:`);
    console.log(`  Count: ${notFoundCount} students`);
    console.log(`  Total Paid Amount in Excel for these students: ₹${notFoundPaidSum.toLocaleString()}`);

    console.log(`\nCategory 2 [Found in Site DB, but Payment Incomplete/Shortfall]:`);
    console.log(`  Count: ${underpaidInDbCount} students`);
    console.log(`  Excel Total: ₹${underpaidInDbExcelSum.toLocaleString()} | Site Total: ₹${underpaidInDbSiteSum.toLocaleString()}`);
    console.log(`  Shortfall:   ₹${underpaidInDbShortfall.toLocaleString()}`);

    console.log(`\nCategory 3 [Found in Site DB & 100% Matched]:`);
    console.log(`  Count: ${matchedCount} students`);
    console.log(`  Total Paid Amount: ₹${matchedSum.toLocaleString()}`);

    console.log(`\nCategory 4 [Site DB Paid Amount is HIGHER than Excel]:`);
    console.log(`  Count: ${overpaidInDbCount} students`);
    console.log(`  Surplus in DB: ₹${overpaidInDbSurplus.toLocaleString()}`);

    console.log("\n================ MATHEMATICAL PROOF ================");
    console.log(`Formula: Net Difference = (Not Found Paid Sum) + (Existing Students Shortfall) - (Overpaid/Extra Payments in DB)`);
    console.log(`  Not Found Sum:                   +₹${notFoundPaidSum.toLocaleString()}`);
    console.log(`  Existing Students Shortfall:      +₹${underpaidInDbShortfall.toLocaleString()}`);
    console.log(`  Overpaid/Extra on Site:           -₹${overpaidInDbSurplus.toLocaleString()}`);
    const calculatedNetDiff = notFoundPaidSum + underpaidInDbShortfall - overpaidInDbSurplus;
    console.log(`  Calculated Net Difference:         ₹${calculatedNetDiff.toLocaleString()}`);
    console.log(`  Actual Net Difference (Excel-Site):₹${(excelGrandTotal - db2026Total).toLocaleString()}`);

    console.log("\nNot Found Students List (First 15):");
    console.table(notFoundStudents.slice(0, 15).map(s => ({
        Row: s.rowIndex,
        RegNo: s.regNo,
        Name: s.name,
        ExcelPaid: `₹${s.excelPaid.toLocaleString()}`
    })));

    process.exit(0);
}

analyze().catch(console.error);
