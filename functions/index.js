const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

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
                const tokenPromises = studentIds.map(id => admin.firestore().collection("userTokens").doc(id).get());
                const tokenDocs = await Promise.all(tokenPromises);
                tokenDocs.forEach(doc => {
                    if (doc.exists) {
                        tokens = tokens.concat(doc.data().fcmTokens || []);
                    }
                });
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
                body: message || "You have a new update in Attendance Recorder.",
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
