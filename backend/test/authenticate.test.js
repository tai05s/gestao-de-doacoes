import assert from 'node:assert/strict';
import test from 'node:test';
import { extractBearerToken } from '../src/middleware/authenticate.js';

test('extracts bearer tokens with supported whitespace and casing', () => {
  assert.equal(extractBearerToken('Bearer token-value'), 'token-value');
  assert.equal(extractBearerToken('bearer\t token-value'), 'token-value');
});

test('rejects malformed or oversized authorization headers', () => {
  assert.equal(extractBearerToken('Basic token-value'), null);
  assert.equal(extractBearerToken('Bearer'), null);
  assert.equal(extractBearerToken('Bearer   '), null);
  assert.equal(extractBearerToken('Bearer token value'), null);
  assert.equal(extractBearerToken(`Bearer ${'a'.repeat(8192)}`), null);
});
