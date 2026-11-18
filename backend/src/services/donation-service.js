import { AppError } from '../errors/app-error.js';

const DONATION_TYPES = new Set(['Alimentos', 'Roupas', 'Higiene', 'Remédios', 'Outros', 'Objetos']);

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function invalid(message) {
  throw new AppError(400, 'VALIDATION_ERROR', message);
}

function validateDonations(items) {
  if (!Array.isArray(items)) invalid('A lista de arrecadações deve ser um array.');
  const ids = new Set();

  return items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      invalid(`A arrecadação ${index + 1} tem formato inválido.`);
    }
    if (!Number.isSafeInteger(item.id) || item.id < 0) {
      invalid(`O identificador da arrecadação ${index + 1} é inválido.`);
    }
    if (ids.has(String(item.id))) invalid('A lista contém identificadores de arrecadação duplicados.');
    ids.add(String(item.id));
    if (!DONATION_TYPES.has(item.tipo)) invalid(`O tipo da arrecadação ${index + 1} é inválido.`);
    if (typeof item.nome !== 'string' || !item.nome.trim() || item.nome.length > 100) {
      invalid(`Informe um nome válido para a arrecadação ${index + 1} (até 100 caracteres).`);
    }
    if (typeof item.qtd !== 'number' || !Number.isFinite(item.qtd) || item.qtd <= 0) {
      invalid(`A quantidade da arrecadação ${index + 1} deve ser maior que zero.`);
    }
    if (!isDate(item.data)) invalid(`A data da arrecadação ${index + 1} é inválida.`);
    if (item.validade && !isDate(item.validade)) invalid(`A validade da arrecadação ${index + 1} é inválida.`);
    if (item.size != null && typeof item.size !== 'string') invalid(`O tamanho da arrecadação ${index + 1} é inválido.`);
    if (item.obs != null && typeof item.obs !== 'string') invalid(`As observações da arrecadação ${index + 1} são inválidas.`);
    if (item.baixa != null && typeof item.baixa !== 'boolean') invalid(`A situação da arrecadação ${index + 1} é inválida.`);

    return {
      id: item.id,
      tipo: item.tipo,
      nome: item.nome.trim(),
      qtd: item.qtd,
      data: item.data,
      size: item.size || '',
      validade: item.validade || '',
      obs: item.obs || '',
      baixa: item.baixa === true,
    };
  });
}

function validateDeletedIds(ids, upserts) {
  if (!Array.isArray(ids)) invalid('A lista de identificadores excluídos é inválida.');
  const upsertIds = new Set(upserts.map((item) => String(item.id)));
  const seen = new Set();

  ids.forEach((id) => {
    if (!Number.isSafeInteger(id) || id < 0) invalid('Um identificador de arrecadação excluído é inválido.');
    const key = String(id);
    if (seen.has(key) || upsertIds.has(key)) {
      invalid('A alteração contém identificadores de arrecadação duplicados.');
    }
    seen.add(key);
  });
  return ids;
}

export class DonationService {
  constructor(repository) {
    this.repository = repository;
  }

  list() {
    return this.repository.list();
  }

  async applyChanges(upserts, deletedIds) {
    const items = validateDonations(upserts);
    const ids = validateDeletedIds(deletedIds, items);
    return this.repository.applyChanges(items, ids);
  }
}
