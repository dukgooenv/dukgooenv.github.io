import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import admin from 'firebase-admin';

const outputPath = path.resolve(process.cwd(), 'rank-snapshot.js');

function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON secret.');
  }

  const credential = admin.credential.cert(JSON.parse(raw));
  admin.initializeApp({ credential });
  return admin.firestore();
}

function readCurrentSnapshotEntries() {
  if (!fs.existsSync(outputPath)) return [];
  const source = fs.readFileSync(outputPath, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  const snapshot = sandbox.window && sandbox.window.RANK_SNAPSHOT;
  return snapshot && Array.isArray(snapshot.entries) ? snapshot.entries : [];
}

function formatSnapshot(entries) {
  const savedAt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()).replace(' ', 'T') + '+09:00';

  const body = entries
    .map((entry) => `    { key: ${JSON.stringify(entry.key)}, count: 0 }`)
    .join(',\n');

  return `window.RANK_SNAPSHOT = {\n  savedAt: ${JSON.stringify(savedAt)},\n  entries: [\n${body}\n  ]\n};\n`;
}

async function resetFirestoreCounts(db) {
  const snapshot = await db.collection('imageViews').get();
  const refs = [];
  snapshot.forEach((doc) => refs.push(doc.ref));

  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) => {
      batch.set(ref, { count: 0 }, { merge: true });
    });
    await batch.commit();
  }

  return refs.length;
}

async function main() {
  const db = initFirebase();
  const resetCount = await resetFirestoreCounts(db);
  const currentEntries = readCurrentSnapshotEntries();
  fs.writeFileSync(outputPath, formatSnapshot(currentEntries), 'utf8');
  console.log(`Reset ${resetCount} Firestore imageViews docs and rewrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
