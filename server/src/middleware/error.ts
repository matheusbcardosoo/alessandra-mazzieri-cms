import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors';
import { Sentry } from '../config/sentry';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    // Erro de validação esperado (400) — não é um incidente, fica em warn.
    req.log.warn({ issues: err.issues }, 'Zod validation error');
    // Monta uma mensagem legível com campo + motivo de cada problema.
    const readable = err.issues.slice(0, 6).map((issue) => {
      const path = issue.path.filter((p) => typeof p === 'string').join(' › ');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    return res.status(400).json({
      data: null,
      error: {
        message: readable.length ? readable.join(' • ') : 'Não foi possível validar os dados enviados.',
        issues: err.flatten()
      }
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      data: null,
      error: {
        message: err.message,
        details: err.details
      }
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(400).json({
        data: null,
        error: {
          message: 'Conflito de ordenação detectado. Tente novamente.',
          details: err.meta
        }
      });
    }
  }

  Sentry.captureException(err);
  req.log.error({ err }, 'Unhandled error');
  return res.status(500).json({ data: null, error: { message: 'Internal server error' } });
}
