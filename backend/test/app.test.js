import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'gestao-de-doacoes-test' });
const { default: app } = await import('../src/app.js');

test('exposes health and standardized API errors over HTTP', async (t) => {
  const server = app.listen(0);
  server.keepAliveTimeout = 1;
  await once(server, 'listening');
  t.after(async () => {
    const closed = new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    server.closeAllConnections();
    await closed;
    await getFirestore().terminate();
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const unauthorized = await fetch(`${baseUrl}/api/doacoes`);
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await unauthorized.json(), {
    error: {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Entre no sistema para continuar.',
    },
  });

  const missingRoute = await fetch(`${baseUrl}/api/missing`);
  assert.equal(missingRoute.status, 404);
  assert.deepEqual(await missingRoute.json(), {
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'A rota solicitada não foi encontrada.',
    },
  });
});
