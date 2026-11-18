import { getAuth } from 'firebase-admin/auth';
import { AppError } from '../errors/app-error.js';

const allowedEmails = new Set(
  (process.env.API_ALLOWED_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  if (!match) {
    return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Entre no sistema para continuar.'));
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(match[1]);
    const email = decodedToken.email?.toLowerCase();

    if (!email || !allowedEmails.has(email)) {
      return next(new AppError(403, 'ACCESS_DENIED', 'Esta conta não está autorizada a acessar os dados.'));
    }

    req.user = { uid: decodedToken.uid, email };
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    const invalidTokenCodes = new Set([
      'auth/argument-error',
      'auth/id-token-expired',
      'auth/id-token-revoked',
      'auth/invalid-id-token',
      'auth/invalid-argument',
    ]);
    if (invalidTokenCodes.has(error.code)) {
      return next(new AppError(401, 'INVALID_TOKEN', 'Sua sessão expirou. Entre novamente.'));
    }
    return next(error);
  }
}
