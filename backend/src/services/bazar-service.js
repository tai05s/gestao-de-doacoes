import { AppError } from '../errors/app-error.js';

function invalid(message) {
  throw new AppError(400, 'VALIDATION_ERROR', message);
}

function validateItems(items) {
  if (!Array.isArray(items)) invalid('A lista de itens do bazar deve ser um array.');
  const ids = new Set();

  return items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      invalid(`O item do bazar ${index + 1} tem formato inválido.`);
    }
    const id = item.id;
    if (!((typeof id === 'string' && id.trim() && id.length <= 128 && !id.includes('/')) ||
        (Number.isSafeInteger(id) && id >= 0))) {
      invalid(`O identificador do item do bazar ${index + 1} é inválido.`);
    }
    if (ids.has(String(id))) invalid('A lista contém identificadores de itens do bazar duplicados.');
    ids.add(String(id));
    if (typeof item.nome !== 'string' || !item.nome.trim() || item.nome.length > 100) {
      invalid(`Informe um nome válido para o item do bazar ${index + 1} (até 100 caracteres).`);
    }
    if (item.tipo !== 'Roupas' && item.tipo !== 'Objetos') {
      invalid(`O tipo do item do bazar ${index + 1} é inválido.`);
    }
    if (!Number.isSafeInteger(item.qtd) || item.qtd < 1) {
      invalid(`A quantidade do item do bazar ${index + 1} deve ser um inteiro maior que zero.`);
    }
    if (item.size != null && typeof item.size !== 'string') {
      invalid(`O tamanho do item do bazar ${index + 1} é inválido.`);
    }
    if (item.baixa != null && typeof item.baixa !== 'boolean') {
      invalid(`A situação do item do bazar ${index + 1} é inválida.`);
    }

    return {
      id,
      nome: item.nome.trim(),
      tipo: item.tipo,
      qtd: item.qtd,
      size: item.size || '',
      baixa: item.baixa === true,
    };
  });
}

function validateDeletedIds(ids, upserts) {
  if (!Array.isArray(ids)) invalid('A lista de identificadores excluídos do bazar é inválida.');
  const upsertIds = new Set(upserts.map((item) => String(item.id)));
  const seen = new Set();

  ids.forEach((id) => {
    if (!((typeof id === 'string' && id.trim() && id.length <= 128 && !id.includes('/')) ||
        (Number.isSafeInteger(id) && id >= 0))) {
      invalid('Um identificador de item do bazar excluído é inválido.');
    }
    const key = String(id);
    if (seen.has(key) || upsertIds.has(key)) {
      invalid('A alteração contém identificadores de itens do bazar duplicados.');
    }
    seen.add(key);
  });
  return ids;
}

export class BazarService {
  constructor(repository) {
    this.repository = repository;
  }

  list() {
    return this.repository.list();
  }

  async applyChanges(upserts, deletedIds) {
    const items = validateItems(upserts);
    const ids = validateDeletedIds(deletedIds, items);
    return this.repository.applyChanges(items, ids);
  }
}
