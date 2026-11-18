import { getAuth } from 'firebase-admin/auth';
import { AppError } from '../errors/app-error.js';

const MAX_AUTHORIZATION_LENGTH = 8192;

const allowedEmails = new Set(
  (process.env.API_ALLOWED_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function extractBearerToken(authorization) {
  if (typeof authorization !== 'string' || authorization.length > MAX_AUTHORIZATION_LENGTH) {
    return null;
  }
  if (authorization.slice(0, 6).toLowerCase() !== 'bearer') return null;

  let tokenStart = 6;
  while (tokenStart < authorization.length) {
    const character = authorization.charCodeAt(tokenStart);
    if (character !== 32 && (character < 9 || character > 13)) break;
    tokenStart++;
  }
  if (tokenStart === 6 || tokenStart === authorization.length) return null;

  for (let index = tokenStart; index < authorization.length; index++) {
    const character = authorization.charCodeAt(index);
    if (character === 32 || (character >= 9 && character <= 13)) return null;
  }

  return authorization.slice(tokenStart);
}

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = extractBearerToken(authorization);

  if (!token) {
    return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Entre no sistema para continuar.'));
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
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
