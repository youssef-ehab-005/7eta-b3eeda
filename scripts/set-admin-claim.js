import { readFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/set-admin-claim.js YOUR_ADMIN_UID');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(await readFile(new URL('../serviceAccountKey.json', import.meta.url), 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  await getAuth().setCustomUserClaims(uid, { admin: true });
  console.log(`Admin claim assigned to UID: ${uid}`);
  console.log('Sign out and sign in again in the website to refresh the ID token.');
} catch (error) {
  console.error('Could not assign admin claim:', error.message);
  process.exit(1);
}
