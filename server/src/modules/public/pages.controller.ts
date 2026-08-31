import { Request, Response } from 'express';
import { z } from 'zod';
import { PageService } from '../../services/page.service';
import { sendSuccess } from '../../utils/responses';

const service = new PageService();

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) (Fase 5
// do plano de template: docs/plano-template.md).
export async function getPage(req: Request, res: Response) {
  const { slug } = z.object({ slug: z.string().min(2).regex(/^[a-z0-9-]+$/i) }).parse(req.params);
  const data = await service.getPublishedBySlug(slug);
  return sendSuccess(res, data);
}
