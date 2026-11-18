import { AppError } from '../errors/app-error.js';

export function notFound(req, res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'A rota solicitada não foi encontrada.'));
}
