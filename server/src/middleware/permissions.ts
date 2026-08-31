import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/errors';

export const SECTION_KEYS = ['blog', 'menu', 'media', 'forms', 'settings'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export type SectionAccess = Record<SectionKey, boolean>;

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Você não tem permissão para acessar este recurso.'));
    }
    return next();
  };
}

export function requireSection(key: SectionKey) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Unauthorized'));
    if (req.user.role === 'admin') return next();
    if (req.user.sectionAccess?.[key] === true) return next();
    return next(new HttpError(403, 'Você não tem acesso a esta seção.'));
  };
}

export function requirePageAccess(resolvePageId: (req: Request) => Promise<string>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Unauthorized'));
    if (req.user.role === 'admin') return next();
    // Express 5 encaminha automaticamente uma rejeição desta função async pro
    // error middleware — sem try/catch, igual ao resto do codebase (Fase 5,
    // docs/plano-template.md).
    const pageId = await resolvePageId(req);
    const allowed = await hasPageAccess(req.user.id, pageId);
    if (!allowed) return next(new HttpError(403, 'Você não tem acesso a esta página.'));
    return next();
  };
}

export async function hasPageAccess(userId: string, pageId: string): Promise<boolean> {
  const row = await prisma.userPageAccess.findUnique({ where: { userId_pageId: { userId, pageId } } });
  return !!row;
}

export async function getAccessiblePageIds(userId: string): Promise<string[]> {
  const rows = await prisma.userPageAccess.findMany({ where: { userId }, select: { pageId: true } });
  return rows.map((r) => r.pageId);
}
