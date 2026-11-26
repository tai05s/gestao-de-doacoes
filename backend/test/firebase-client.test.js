import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const clientSource = await readFile(new URL('../firebase.js', import.meta.url), 'utf8');

function startClient(response) {
  const errors = [];
  let resolveReportedErrors;
  const reportedErrors = new Promise((resolve) => {
    resolveReportedErrors = resolve;
  });
  const user = { getIdToken: () => Promise.resolve('test-token') };
  const auth = {
    currentUser: user,
    onAuthStateChanged(callback) {
      callback(user);
    },
    signOut: () => Promise.resolve(),
  };
  const window = {
    FIREBASE_CONFIG: {
      apiKey: 'test',
      authDomain: 'test',
      projectId: 'test',
      appId: 'test',
    },
    FIREBASE_LOGIN_EMAIL: 'test@example.com',
    firebase: {
      apps: [{}],
      app: () => ({}),
      auth: () => auth,
    },
  };

  runInNewContext(clientSource, {
    window,
    fetch: () => Promise.resolve(response),
    setInterval: () => 1,
    clearInterval: () => {},
  });
  window.DonationBackend.start({
    onError(message) {
      errors.push(message);
      if (errors.length === 2) resolveReportedErrors();
    },
    onGate() {},
    onItems() {},
    onBazarItems() {},
    onProfile() {},
  });

  return { errors, reportedErrors };
}

test('reports the HTTP status when the server responds with non-JSON', async () => {
  const { errors, reportedErrors } = startClient({
    ok: false,
    status: 502,
    text: () => Promise.resolve('<html>Bad Gateway</html>'),
  });

  await reportedErrors;

  assert.deepEqual(errors, [
    'O servidor retornou uma resposta inválida (HTTP 502). Verifique a URL da API e se o servidor está disponível.',
    'O servidor retornou uma resposta inválida (HTTP 502). Verifique a URL da API e se o servidor está disponível.',
  ]);
});

test('rejects successful API responses that do not match the endpoint contract', async () => {
  const { errors, reportedErrors } = startClient({
    ok: true,
    status: 200,
    text: () => Promise.resolve('{"unexpected":true}'),
  });

  await reportedErrors;

  assert.equal(errors.length, 2);
  assert.ok(errors.every((message) => message.includes('(HTTP 200)')));
});
