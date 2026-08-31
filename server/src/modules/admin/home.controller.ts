import { Request, Response } from 'express';
import { z } from 'zod';
import { HomeService } from '../../services/home.service';
import { sendSuccess } from '../../utils/responses';
import { uuidParamSchema } from '../../utils/validation';

const service = new HomeService();

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) em cada
// handler (Fase 5 do plano de template: docs/plano-template.md).

export async function ensureHome(_req: Request, res: Response) {
  const page = await service.ensureHome();
  return sendSuccess(res, { pageId: page.id, pageKey: page.pageKey });
}

export async function getHomeAdmin(_req: Request, res: Response) {
  const page = await service.getAdmin();
  return sendSuccess(res, page);
}

export async function updateHomeContent(req: Request, res: Response) {
  const payload = z
    .object({
      title: z.string().optional(),
      description: z.string().optional().nullable(),
      layout: z.unknown().optional()
    })
    .parse(req.body);
  const { id } = uuidParamSchema.parse(req.params);

  const { page } = await service.updateHome(id, payload, req.user!);
  return sendSuccess(res, { page, changedToDraft: false });
}
