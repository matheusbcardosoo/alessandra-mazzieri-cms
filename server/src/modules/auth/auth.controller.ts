import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/responses';
import { env } from '../../config/env';
import { HttpError } from '../../utils/errors';
import { HomeService } from '../../services/home.service';
import { hasPageAccess } from '../../middleware/permissions';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const setupAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

export const SESSION_COOKIE_NAME = 'user_session';

const homeService = new HomeService();

const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 2 * 60 * 60 * 1000, // 2h, matches the JWT expiry in auth.service.ts
  path: '/'
};

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) (Fase 5
// do plano de template: docs/plano-template.md).

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data.email, data.password);
  res.cookie(SESSION_COOKIE_NAME, result.token, sessionCookieOptions);
  return sendSuccess(res, { user: result.user });
}

export async function getSetupStatus(_req: Request, res: Response) {
  const status = await authService.getSetupStatus();
  return sendSuccess(res, status);
}

export async function createFirstAdmin(req: Request, res: Response) {
  const data = setupAdminSchema.parse(req.body);
  const result = await authService.createFirstAdmin(data);
  res.cookie(SESSION_COOKIE_NAME, result.token, sessionCookieOptions);
  return sendSuccess(res, { user: result.user });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return sendSuccess(res, { ok: true });
}

export async function getCurrentUser(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  const canAccessHome = user.role === 'admin' ? true : await hasPageAccess(user.id, (await homeService.getAdmin()).id);
  return sendSuccess(res, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sectionAccess: user.sectionAccess,
    canAccessHome
  });
}
