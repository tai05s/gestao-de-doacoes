import { applicationDefault, initializeApp } from 'firebase-admin/app';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(backendDir, '../../.env') });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) {
  throw new Error('Defina FIREBASE_ADMIN_PROJECT_ID no arquivo .env da raiz.');
}

if (process.env.FIRESTORE_EMULATOR_HOST) {
  initializeApp({ projectId });
} else {
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

const { default: app } = await import('./app.js');
const port = Number(process.env.API_PORT) || 3000;
app.listen(port, () => {
  console.log(`API de Gestão de Doações disponível na porta ${port}.`);
});
