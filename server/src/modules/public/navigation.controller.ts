import { Request, Response } from 'express';
import { NavigationService } from '../../services/navigation.service';
import { sendSuccess } from '../../utils/responses';

const service = new NavigationService();

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) (Fase 5
// do plano de template: docs/plano-template.md).
export async function getNavigation(_req: Request, res: Response) {
  const data = await service.getPublic();
  return sendSuccess(res, data);
}
