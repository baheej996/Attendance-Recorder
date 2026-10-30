/**
 * Attendance read helpers.
 *
 * `attendanceLogs/{studentId}` is a per-student roll-up of every `attendance` document
 * (maintained by the `syncAttendanceLog` Cloud Function):
 *   { studentId, classIds: [...], records: { [attendanceDocId]: <attendance doc data> } }
 *
 * Reading one log doc costs 1 read instead of 1 read per attendance record. Logs are only
 * used once the backfill has completed (settings/attendanceLogs.ready === true); until then
 * every helper runs exactly the same raw `attendance` query the app used before.
 */
import { collection, documentId, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const IN_LIMIT = 30; // Firestore 'in' / 'array-contains-any' limit

const chunk = (arr, size = IN_LIMIT) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const uniqueIds = (ids) => [...new Set((ids || []).filter(Boolean))];

/** Converts a log document into attendance records shaped like `{ ...attendanceDoc.data(), id }`. */
export const flattenAttendanceLog = (logData) =>
    Object.entries(logData?.records || {}).map(([id, record]) => ({ ...record, id }));

// Ordered by attendance doc id, matching the order a raw `attendance` query returns
const flattenSnapshot = (snap) => snap.docs
    .flatMap(d => flattenAttendanceLog(d.data()))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const rawSnapshot = (snap) => snap.docs.map(d => ({ ...d.data(), id: d.id }));

const studentChunkQuery = (ids, useLogs) => (useLogs
    ? query(collection(db, 'attendanceLogs'), where(documentId(), 'in', ids))
    : query(collection(db, 'attendance'), where('studentId', 'in', ids)));

/** One-time fetch of every attendance record for the given students (all classes, all dates). */
export const fetchAttendanceForStudents = async (studentIds, useLogs) => {
    const records = [];
    for (const ids of chunk(uniqueIds(studentIds))) {
        const snap = await getDocs(studentChunkQuery(ids, useLogs));
        records.push(...(useLogs ? flattenSnapshot(snap) : rawSnapshot(snap)));
    }
    return records;
};

/**
 * Live subscription to every attendance record of the given students.
 * `onData` receives the combined list each time any chunk changes. Returns an unsubscribe fn.
 */
export const subscribeAttendanceForStudents = (studentIds, useLogs, onData, onError) => {
    const batches = chunk(uniqueIds(studentIds));
    const batchMap = new Map();
    const unsubs = batches.map((ids, index) => onSnapshot(studentChunkQuery(ids, useLogs),
        (snap) => {
            batchMap.set(index, useLogs ? flattenSnapshot(snap) : rawSnapshot(snap));
            const combined = [];
            batchMap.forEach(list => combined.push(...list));
            onData(combined);
        },
        (err) => onError?.(err)
    ));
    return () => unsubs.forEach(u => u());
};

/** One-time fetch of every attendance record whose classId is `classId`. */
export const fetchAttendanceForClass = async (classId, useLogs) => {
    if (!classId) return [];
    if (!useLogs) {
        const snap = await getDocs(query(collection(db, 'attendance'), where('classId', '==', classId)));
        return rawSnapshot(snap);
    }
    const snap = await getDocs(query(collection(db, 'attendanceLogs'), where('classIds', 'array-contains', classId)));
    return flattenSnapshot(snap).filter(r => r.classId === classId);
};

/**
 * Same numbers as count(attendance where studentId) and
 * count(attendance where studentId and status == 'Present'), keyed by student id.
 */
export const fetchAttendanceCounts = async (studentIds, useLogs, getCount) => {
    const ids = uniqueIds(studentIds);
    const counts = {};
    if (useLogs) {
        const records = await fetchAttendanceForStudents(ids, true);
        ids.forEach(id => { counts[id] = { total: 0, present: 0 }; });
        records.forEach(r => {
            const c = counts[r.studentId];
            if (!c) return;
            c.total += 1;
            if (r.status === 'Present') c.present += 1;
        });
        return counts;
    }
    await Promise.all(ids.map(async (id) => {
        const total = await getCount('attendance', where('studentId', '==', id));
        const present = await getCount('attendance', where('studentId', '==', id), where('status', '==', 'Present'));
        counts[id] = { total, present };
    }));
    return counts;
};
