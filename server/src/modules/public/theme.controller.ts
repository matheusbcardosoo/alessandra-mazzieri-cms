import { Request, Response } from 'express';
import { SiteSettingsService } from '../../services/siteSettings.service';
import { sendSuccess } from '../../utils/responses';
import { HttpError } from '../../utils/errors';

const service = new SiteSettingsService();

/**
 * GET /api/public/theme
 * Retorna a configuração pública do site (tema, branding, sociais, WhatsApp, etc).
 *
 * Reaproveita o mesmo cache genérico de SiteSettingsService.getPublic() usado por
 * /api/public/settings — não existe mais um cache Redis paralelo específico de
 * "tema" (ver Fase 3 do plano de template: docs/plano-template.md).
 *
 * Express 5 encaminha automaticamente erros lançados (throw) ou rejeições de
 * handlers async para o error middleware — não é preciso try/catch + next(error)
 * (Fase 5 do plano de template: docs/plano-template.md).
 */
export async function getTheme(_req: Request, res: Response) {
  const settings = await service.getPublic();

  if (!settings) {
    throw new HttpError(404, 'Site settings not found');
  }

  res.set('Cache-Control', 'public, max-age=86400');

  return sendSuccess(res, settings);
}
