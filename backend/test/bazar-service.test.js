import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../src/errors/app-error.js';
import { BazarService } from '../src/services/bazar-service.js';

function createService() {
  return new BazarService({
    list: async () => [],
    applyChanges: async (items, deletedIds) => ({ items, deletedIds }),
  });
}

test('accepts a bazar item with a string identifier', async () => {
  const service = createService();
  const { items } = await service.applyChanges([{
    id: 'random-id',
    nome: 'Vaso',
    tipo: 'Objetos',
    qtd: 2,
  }], []);
  const [saved] = items;

  assert.deepEqual(saved, {
    id: 'random-id',
    nome: 'Vaso',
    tipo: 'Objetos',
    qtd: 2,
    size: '',
    baixa: false,
  });
});

test('rejects invalid bazar quantities', async () => {
  const service = createService();
  await assert.rejects(
    service.applyChanges([{ id: 'id-1', nome: 'Vaso', tipo: 'Objetos', qtd: 1.5 }], []),
    (error) => error instanceof AppError && error.status === 400,
  );
});
