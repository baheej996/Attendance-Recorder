const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateVersion() {
  await db.collection('settings').doc('system').set({
    latestVersion: 1777391306000
  }, { merge: true });
  console.log('Firestore version updated to 1777391306000');
  process.exit(0);
}

updateVersion();
