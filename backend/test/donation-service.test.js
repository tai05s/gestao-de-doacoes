import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../src/errors/app-error.js';
import { DonationService } from '../src/services/donation-service.js';

function createService() {
  let saved;
  let savedDeletedIds;
  return {
    service: new DonationService({
      list: async () => [],
      applyChanges: async (items, deletedIds) => {
        saved = items;
        savedDeletedIds = deletedIds;
        return { items, deletedIds };
      },
    }),
    getSaved: () => saved,
    getSavedDeletedIds: () => savedDeletedIds,
  };
}

test('validates and normalizes donation records before repository writes', async () => {
  const { service, getSaved, getSavedDeletedIds } = createService();
  const result = await service.applyChanges([{
    id: 5,
    tipo: 'Alimentos',
    nome: ' Arroz ',
    qtd: 2.5,
    data: '2026-11-18',
  }], []);

  assert.deepEqual(result, {
    items: [{
      id: 5,
      tipo: 'Alimentos',
      nome: 'Arroz',
      qtd: 2.5,
      data: '2026-11-18',
      size: '',
      validade: '',
      obs: '',
      baixa: false,
    }],
    deletedIds: [],
  });
  assert.deepEqual(getSaved(), result.items);
  assert.deepEqual(getSavedDeletedIds(), []);
});

test('rejects invalid quantities with a client error', async () => {
  const { service } = createService();
  await assert.rejects(
    service.applyChanges([{
      id: 1,
      tipo: 'Alimentos',
      nome: 'Arroz',
      qtd: 0,
      data: '2026-11-18',
    }], []),
    (error) => error instanceof AppError && error.status === 400 && error.code === 'VALIDATION_ERROR',
  );
});

test('rejects invalid dates and duplicate identifiers', async () => {
  const { service } = createService();
  const item = { id: 1, tipo: 'Roupas', nome: 'Camisa', qtd: 1, data: '2026-02-30' };
  await assert.rejects(service.applyChanges([item], []), AppError);
  await assert.rejects(service.applyChanges([
    { ...item, data: '2026-02-28' },
    { ...item, data: '2026-02-28' },
  ], []), AppError);
});
