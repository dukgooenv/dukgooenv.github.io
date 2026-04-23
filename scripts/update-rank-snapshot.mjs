import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

const rankLimit = Number.parseInt(process.env.RANK_LIMIT || '10', 10);
const outputPath = path.resolve(process.cwd(), 'rank-snapshot.js');

function normalizeKey(src) {
  return String(src || '')
    .replace(/^.*images\//i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 120);
}

function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON secret.');
  }

  const credential = admin.credential.cert(JSON.parse(raw));
  admin.initializeApp({ credential });
  return admin.firestore();
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
    .map((entry) => `    { key: ${JSON.stringify(entry.key)}, count: ${entry.count} }`)
    .join(',\n');

  return `window.RANK_SNAPSHOT = {\n  savedAt: ${JSON.stringify(savedAt)},\n  entries: [\n${body}\n  ]\n};\n`;
}

async function main() {
  const db = initFirebase();
  const snapshot = await db
    .collection('imageViews')
    .orderBy('count', 'desc')
    .limit(Math.max(30, rankLimit * 3))
    .get();

  const seen = new Set();
  const entries = [];

  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const key = data.key || normalizeKey(data.src || doc.id);
    const count = Number(data.count || 0);
    if (!key || seen.has(key)) return;
    seen.add(key);
    entries.push({ key, count });
  });

  if (!entries.length) {
    throw new Error('No rank entries were found in Firestore.');
  }

  fs.writeFileSync(outputPath, formatSnapshot(entries.slice(0, rankLimit)), 'utf8');
  console.log(`Wrote ${Math.min(entries.length, rankLimit)} rank entries to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
