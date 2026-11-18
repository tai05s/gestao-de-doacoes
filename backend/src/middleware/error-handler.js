export function errorHandler(error, req, res, next) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  const code = error.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  const message = status === 500
    ? 'Ocorreu um erro interno. Tente novamente mais tarde.'
    : error.message;

  if (status >= 500) {
    console.error('[api:error]', {
      method: req.method,
      path: req.path,
      status,
      code,
      error: error.stack || error,
    });
  }

  if (res.headersSent) return next(error);
  return res.status(status).json({ error: { code, message } });
}
