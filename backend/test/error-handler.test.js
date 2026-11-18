import assert from 'node:assert/strict';
import test from 'node:test';
import { mock } from 'node:test';
import { AppError } from '../src/errors/app-error.js';
import { errorHandler } from '../src/middleware/error-handler.js';

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('returns a consistent client error response', () => {
  mock.method(console, 'error', () => {});
  const response = createResponse();
  errorHandler(new AppError(400, 'VALIDATION_ERROR', 'Quantidade inválida.'), {
    method: 'PATCH',
    originalUrl: '/api/doacoes',
  }, response, () => {});

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: { code: 'VALIDATION_ERROR', message: 'Quantidade inválida.' },
  });
  mock.restoreAll();
});

test('hides unexpected error details from the response', () => {
  mock.method(console, 'error', () => {});
  const response = createResponse();
  errorHandler(new Error('private database details'), {
    method: 'GET',
    originalUrl: '/api/doacoes',
  }, response, () => {});

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro interno. Tente novamente mais tarde.',
    },
  });
  mock.restoreAll();
});
