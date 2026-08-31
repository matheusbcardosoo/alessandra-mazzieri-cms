import { Request, Response } from 'express';
import { SeoService } from '../../services/seo.service';

const service = new SeoService();

export function getRobotsTxt(_req: Request, res: Response) {
  res.type('text/plain').send(service.getRobotsTxt());
}

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) (Fase 5
// do plano de template: docs/plano-template.md).

export async function getSitemapXml(_req: Request, res: Response) {
  const xml = await service.getSitemapXml();
  res.type('application/xml').send(xml);
}

export async function getLlmsTxt(_req: Request, res: Response) {
  const txt = await service.getLlmsTxt();
  res.type('text/markdown').send(txt);
}
