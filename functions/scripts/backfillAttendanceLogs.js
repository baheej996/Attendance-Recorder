/**
 * One-time backfill for attendanceLogs/{studentId} (see syncAttendanceLog in ../index.js).
 *
 * Run AFTER deploying the syncAttendanceLog function, so no attendance write is missed:
 *   cd functions && npm install
 *   gcloud auth application-default login        (or set GOOGLE_APPLICATION_CREDENTIALS)
 *   node scripts/backfillAttendanceLogs.js            # build logs (does not switch the app over)
 *   node scripts/backfillAttendanceLogs.js --verify   # compare every student's log with raw attendance
 *   node scripts/backfillAttendanceLogs.js --enable   # verify, then set settings/attendanceLogs.ready = true
 *   node scripts/backfillAttendanceLogs.js --disable  # switch the app back to raw attendance queries
 *
 * Safe to re-run: records already written by the Cloud Function (tracked in `times`) are never overwritten.
 */
const admin = require("firebase-admin");

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "samasthaelearning-1487e" });
const { FieldPath, FieldValue } = require("firebase-admin/firestore");
const db = admin.firestore();

const PAGE_SIZE = 2000;
const BATCH_LIMIT = 400;

async function loadAllAttendance() {
    const byStudent = new Map();
    let last = null;
    let total = 0;
    for (;;) {
        let q = db.collection("attendance").orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        snap.docs.forEach(d => {
            const data = d.data();
            if (!data.studentId) return;
            if (!byStudent.has(data.studentId)) byStudent.set(data.studentId, {});
            byStudent.get(data.studentId)[d.id] = data;
        });
        total += snap.size;
        last = snap.docs[snap.docs.length - 1];
        console.log(`  read ${total} attendance docs...`);
    }
    return { byStudent, total };
}

async function backfill() {
    console.log("Loading attendance...");
    const { byStudent, total } = await loadAllAttendance();
    console.log(`Loaded ${total} docs for ${byStudent.size} students. Writing logs...`);

    let batch = db.batch();
    let ops = 0;
    let written = 0;
    for (const [studentId, records] of byStudent) {
        const ref = db.collection("attendanceLogs").doc(studentId);
        const existing = await ref.get();
        const handled = existing.exists ? (existing.get("times") || {}) : {};

        const toAdd = {};
        const classIds = new Set();
        Object.entries(records).forEach(([id, data]) => {
            if (handled[id]) return; // the Cloud Function already applied a (newer) event for this record
            toAdd[id] = data;
            if (data.classId) classIds.add(data.classId);
        });
        if (Object.keys(toAdd).length === 0) continue;

        const payload = { studentId, records: toAdd, updatedAt: FieldValue.serverTimestamp() };
        if (classIds.size > 0) payload.classIds = FieldValue.arrayUnion(...classIds);
        batch.set(ref, payload, { merge: true });
        ops += 1;
        written += 1;
        if (ops >= BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
            console.log(`  wrote ${written} logs...`);
        }
    }
    if (ops > 0) await batch.commit();
    console.log(`Backfill complete: ${written} student logs written/updated.`);
}

async function verify() {
    console.log("Verifying logs against raw attendance...");
    const { byStudent } = await loadAllAttendance();
    let mismatches = 0;
    for (const [studentId, records] of byStudent) {
        const log = await db.collection("attendanceLogs").doc(studentId).get();
        const logRecords = log.exists ? (log.get("records") || {}) : {};
        const rawIds = Object.keys(records);
        const missing = rawIds.filter(id => !logRecords[id] || logRecords[id].status !== records[id].status);
        const extra = Object.keys(logRecords).filter(id => !records[id]);
        if (missing.length || extra.length) {
            mismatches += 1;
            if (mismatches <= 20) {
                console.log(`  ${studentId}: ${missing.length} missing/different, ${extra.length} extra`);
            }
        }
    }
    // Logs for students who no longer have any attendance must be empty
    const allLogs = await db.collection("attendanceLogs").get();
    allLogs.docs.forEach(d => {
        if (byStudent.has(d.id)) return;
        if (Object.keys(d.get("records") || {}).length > 0) {
            mismatches += 1;
            console.log(`  ${d.id}: log has records but no attendance exists`);
        }
    });
    console.log(mismatches === 0 ? "Verify OK: every log matches." : `Verify FAILED: ${mismatches} students differ.`);
    return mismatches === 0;
}

async function setReady(ready) {
    await db.collection("settings").doc("attendanceLogs").set({
        ready,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`settings/attendanceLogs.ready = ${ready}`);
}

(async () => {
    const args = process.argv.slice(2);
    if (args.includes("--disable")) {
        await setReady(false);
    } else if (args.includes("--verify")) {
        await verify();
    } else if (args.includes("--enable")) {
        if (await verify()) await setReady(true);
        else console.log("Not enabling: fix mismatches (re-run the backfill) and try again.");
    } else {
        await backfill();
    }
    process.exit(0);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
