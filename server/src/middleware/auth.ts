import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/errors';
import { prisma } from '../config/prisma';
import { SectionAccess } from './permissions';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.controller';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return next(new HttpError(401, 'Unauthorized'));
  }

  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
  } catch {
    return next(new HttpError(401, 'Invalid token'));
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) {
    return next(new HttpError(401, 'Invalid session'));
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sectionAccess: (user.sectionAccess ?? {}) as SectionAccess
  };
  return next();
}
