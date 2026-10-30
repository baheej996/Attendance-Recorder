/**
 * One-time migration: moves inline base64 images out of Firestore into Firebase Storage.
 *   mentors.profilePhoto, mentors.signature, questions.image, settings/institution.signatureImage
 *
 *   cd functions && npm install
 *   gcloud auth application-default login        (or set GOOGLE_APPLICATION_CREDENTIALS)
 *   node scripts/migrateInlineImages.js           # dry run: only reports what would change
 *   node scripts/migrateInlineImages.js --apply   # uploads and replaces the fields with URLs
 *
 * New uploads from the app are already stored in Storage; this only converts older data.
 * <img> tags render both forms, so the app works the same before and after.
 */
const crypto = require("crypto");
const admin = require("firebase-admin");
const { getDownloadURL } = require("firebase-admin/storage");

const projectId = process.env.GCLOUD_PROJECT || "samasthaelearning-1487e";
admin.initializeApp({ projectId, storageBucket: `${projectId}.firebasestorage.app` });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const APPLY = process.argv.includes("--apply");

const TARGETS = [
    { collection: "mentors", fields: ["profilePhoto", "signature"], folder: "mentor-images" },
    { collection: "questions", fields: ["image"], folder: "question-images" },
    { collection: "settings", docId: "institution", fields: ["signatureImage"], folder: "institution" },
];

const isDataUrl = (v) => typeof v === "string" && v.startsWith("data:");

async function upload(dataUrl, folder) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
    if (!match) throw new Error("Unsupported data URL");
    const [, contentType, b64] = match;
    const file = bucket.file(`${folder}/${Date.now()}_${crypto.randomBytes(5).toString("hex")}`);
    await file.save(Buffer.from(b64, "base64"), { contentType, resumable: false });
    return getDownloadURL(file);
}

(async () => {
    let found = 0;
    let bytes = 0;
    for (const target of TARGETS) {
        const docs = target.docId
            ? [await db.collection(target.collection).doc(target.docId).get()].filter(d => d.exists)
            : (await db.collection(target.collection).get()).docs;
        for (const d of docs) {
            const updates = {};
            for (const field of target.fields) {
                const value = d.get(field);
                if (!isDataUrl(value)) continue;
                found += 1;
                bytes += value.length;
                if (APPLY) updates[field] = await upload(value, target.folder);
            }
            if (APPLY && Object.keys(updates).length > 0) {
                await d.ref.update(updates);
                console.log(`  migrated ${target.collection}/${d.id}: ${Object.keys(updates).join(", ")}`);
            }
        }
    }
    console.log(`${APPLY ? "Migrated" : "Would migrate"} ${found} inline images (~${(bytes / 1024 / 1024).toFixed(1)} MB of base64).`);
    process.exit(0);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
