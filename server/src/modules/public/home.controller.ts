import { Request, Response } from 'express';
import { HomeService } from '../../services/home.service';
import { sendSuccess } from '../../utils/responses';

const service = new HomeService();

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) (Fase 5
// do plano de template: docs/plano-template.md).
export async function getHome(_req: Request, res: Response) {
  const data = await service.getPublic();
  return sendSuccess(res, data);
}
