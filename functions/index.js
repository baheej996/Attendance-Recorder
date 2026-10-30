const {onDocumentCreated, onDocumentWritten} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const {FieldPath, FieldValue} = require("firebase-admin/firestore");

admin.initializeApp();

exports.sendPushNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const notification = snapshot.data();
    const { title, message, audience, classId, targetId } = notification;

    let tokens = [];

    try {
        if (audience === "specific_student" && targetId) {
            // Get tokens for a single student
            const userTokensDoc = await admin.firestore().collection("userTokens").doc(targetId).get();
            if (userTokensDoc.exists) {
                tokens = userTokensDoc.data().fcmTokens || [];
            }
        } else if (audience === "specific_class" && classId) {
            // Get all students in this class
            const studentsSnapshot = await admin.firestore().collection("students")
                .where("classId", "==", classId)
                .get();
            
            const studentIds = studentsSnapshot.docs.map(doc => doc.id);
            
            if (studentIds.length > 0) {
                // Fetch tokens for these students
                // Fetching individual docs might be slow for huge classes, but Firestore supports IN queries for up to 30 items
                // For safety, we iterate or use a combined approach
                // Query in chunks of 30: only students that actually have a token doc are billed,
                // instead of one read per student in the class.
                for (let i = 0; i < studentIds.length; i += 30) {
                    const chunkIds = studentIds.slice(i, i + 30);
                    const tokenSnap = await admin.firestore().collection("userTokens")
                        .where(FieldPath.documentId(), "in", chunkIds)
                        .get();
                    tokenSnap.forEach(doc => {
                        tokens = tokens.concat(doc.data().fcmTokens || []);
                    });
                }
            }
        } else if (audience === "students" || audience === "all") {
            // Fetch ALL user tokens (limited for performance)
            const allTokensSnapshot = await admin.firestore().collection("userTokens").limit(500).get();
            allTokensSnapshot.forEach(doc => {
                tokens = tokens.concat(doc.data().fcmTokens || []);
            });
        }

        // Remove duplicates and empty tokens
        const uniqueTokens = [...new Set(tokens)].filter(t => !!t);

        if (uniqueTokens.length === 0) {
            console.log("No tokens found for audience:", audience);
            return;
        }

        // Construct the multi-cast message
        const payload = {
            notification: {
                title: title || "New Notification",
                body: message || "You have a new update in Samastha E-Learning.",
            },
            data: {
                click_action: "FLUTTER_NOTIFICATION_CLICK", // for mobile if needed
                type: notification.type || "general"
            }
        };

        // Send messages in batches of 500 (FCM limit)
        for (let i = 0; i < uniqueTokens.length; i += 500) {
            const batch = uniqueTokens.slice(i, i + 500);
            const response = await admin.messaging().sendEachForMulticast({
                tokens: batch,
                ...payload
            });
            console.log(`Successfully sent ${response.successCount} messages to ${audience}`);
            
            // Optional: Handle cleanup of invalid tokens
            if (response.failureCount > 0) {
                console.warn(`Failed to send ${response.failureCount} messages`);
            }
        }

    } catch (error) {
        console.error("Error sending push notifications:", error);
    }
});

/**
 * Keeps attendanceLogs/{studentId} in sync with every write to attendance/{attendanceId}:
 *   { studentId, classIds: [...], records: { [attendanceId]: <attendance data> }, times: { [attendanceId]: <event time> } }
 * The web app reads one log doc per student instead of one doc per attendance record.
 * `times` guards against out-of-order event delivery (an older event never overwrites a newer one).
 */
exports.syncAttendanceLog = onDocumentWritten("attendance/{attendanceId}", async (event) => {
    const attendanceId = event.params.attendanceId;
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;
    const eventTime = new Date(event.time).getTime();
    const db = admin.firestore();

    const applyToLog = (studentId, record) => db.runTransaction(async (tx) => {
        const ref = db.collection("attendanceLogs").doc(studentId);
        const snap = await tx.get(ref);
        const lastTime = snap.exists ? (snap.get(new FieldPath("times", attendanceId)) || 0) : 0;
        if (lastTime > eventTime) return; // a newer event was already applied

        if (record) {
            if (!snap.exists) {
                tx.set(ref, {
                    studentId,
                    classIds: record.classId ? [record.classId] : [],
                    records: {[attendanceId]: record},
                    times: {[attendanceId]: eventTime},
                    updatedAt: FieldValue.serverTimestamp(),
                });
                return;
            }
            const updates = [
                new FieldPath("records", attendanceId), record,
                new FieldPath("times", attendanceId), eventTime,
                "updatedAt", FieldValue.serverTimestamp(),
            ];
            if (record.classId) updates.push("classIds", FieldValue.arrayUnion(record.classId));
            tx.update(ref, ...updates);
        } else if (snap.exists) {
            tx.update(ref,
                new FieldPath("records", attendanceId), FieldValue.delete(),
                new FieldPath("times", attendanceId), eventTime,
                "updatedAt", FieldValue.serverTimestamp()
            );
        }
    });

    const tasks = [];
    if (before?.studentId && (!after || after.studentId !== before.studentId)) {
        tasks.push(applyToLog(before.studentId, null));
    }
    if (after?.studentId) {
        tasks.push(applyToLog(after.studentId, after));
    }
    await Promise.all(tasks);
});
