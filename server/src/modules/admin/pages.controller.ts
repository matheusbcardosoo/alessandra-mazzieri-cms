import { Request, Response } from 'express';
import { z } from 'zod';
import { PageService } from '../../services/page.service';
import { sendSuccess } from '../../utils/responses';
import { pageLayoutSchema } from '../../utils/pageLayout';
import { HomeService } from '../../services/home.service';
import { pageVersionService } from '../../services/pageVersion.service';
import { HttpError } from '../../utils/errors';
import { uuidParamSchema } from '../../utils/validation';
import { getAccessiblePageIds } from '../../middleware/permissions';
import { prisma } from '../../config/prisma';
import { findMissingMedia } from '../../services/mediaReferences.service';
import type { PageLayoutV2 } from '../../utils/pageLayout';

const service = new PageService();
const homeService = new HomeService();

const versionParamsSchema = z.object({ id: z.string().uuid(), versionId: z.string().uuid() });

const baseSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras, números e hifens para o slug'),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  layout: pageLayoutSchema.default({ version: 1, columns: 1, cols: [] }),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().nullable().optional()
});

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware (ver server/src/middleware/error.ts) — não é preciso
// repetir try/catch + next(error) em cada handler (Fase 5 do plano de
// template: docs/plano-template.md).

export async function listPages(req: Request, res: Response) {
  // Flag opcional pro picker de páginas do admin de usuários (Usuários >
  // conceder acesso), que precisa oferecer a home como opção — a listagem
  // normal de Páginas continua sem ela (tem link fixo próprio na sidebar).
  const includeHome = req.query.includeHome === 'true';
  const restrictToIds = req.user!.role === 'admin' ? undefined : await getAccessiblePageIds(req.user!.id);
  const data = await service.listAdmin(includeHome, restrictToIds);
  return sendSuccess(res, data);
}

export async function createPage(req: Request, res: Response) {
  const payload = baseSchema.parse(req.body);
  const data = await service.create(
    {
      ...payload,
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null
    },
    req.user!
  );
  if (req.user!.role !== 'admin') {
    await prisma.userPageAccess.create({ data: { userId: req.user!.id, pageId: data.id } });
  }
  return sendSuccess(res, data, 201);
}

export async function updatePage(req: Request, res: Response) {
  const payload = baseSchema.partial().parse(req.body);
  const { id } = uuidParamSchema.parse(req.params);

  const existing = await service.getAdminById(id);
  const isHome = existing.pageKey === 'home' || existing.slug === 'home';
  if (isHome) {
    const { page } = await homeService.updateHome(
      id,
      {
        title: payload.title,
        description: payload.description,
        layout: payload.layout
      },
      req.user!
    );
    return sendSuccess(res, { page, changedToDraft: false });
  }
  if (existing.pageKey === 'blog' || existing.slug === 'blog') {
    throw new HttpError(400, 'Esta página é reservada pelo sistema. Use o endpoint /api/admin/blog.');
  }

  const { page, changedToDraft } = await service.update(
    id,
    {
      ...payload,
      publishedAt: payload.publishedAt === undefined ? undefined : payload.publishedAt ? new Date(payload.publishedAt) : null
    },
    req.user!
  );
  return sendSuccess(res, { page, changedToDraft });
}

export async function getPageAdmin(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const data = await service.getAdminById(id);
  if (data.pageKey === 'home' || data.slug === 'home') {
    const home = await homeService.getAdmin();
    return sendSuccess(res, home);
  }
  if (data.pageKey === 'blog' || data.slug === 'blog') {
    throw new HttpError(400, 'Esta página é reservada pelo sistema. Use o endpoint /api/admin/blog.');
  }
  return sendSuccess(res, data);
}

export async function publishPage(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  if (page.pageKey === 'home' || page.slug === 'home') {
    throw new HttpError(400, 'A home já fica publicada automaticamente.');
  }
  if (page.pageKey === 'blog' || page.slug === 'blog') {
    throw new HttpError(400, 'O blog já fica publicado automaticamente.');
  }
  const data = await service.publish(id, req.user!);
  return sendSuccess(res, data);
}

export async function unpublishPage(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  if (page.pageKey === 'home' || page.slug === 'home') {
    throw new HttpError(400, 'A home não pode ser despublicada.');
  }
  if (page.pageKey === 'blog' || page.slug === 'blog') {
    throw new HttpError(400, 'O blog não pode ser despublicado.');
  }
  const data = await service.unpublish(id, req.user!);
  return sendSuccess(res, data);
}

export async function listPageVersions(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const data = await pageVersionService.list(id);
  return sendSuccess(res, data);
}

export async function getPageMissingMedia(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  const data = await findMissingMedia(page.layout as unknown as PageLayoutV2);
  return sendSuccess(res, data);
}

export async function revertPageVersion(req: Request, res: Response) {
  const { id, versionId } = versionParamsSchema.parse(req.params);
  const page = await service.getAdminById(id);
  const version = await pageVersionService.getForRevert(id, versionId);
  const content = { title: version.title, description: version.description, layout: version.layout };

  if (page.pageKey === 'home' || page.slug === 'home') {
    const data = await homeService.revertToVersion(id, content, req.user!);
    return sendSuccess(res, data);
  }
  if (page.pageKey === 'blog' || page.slug === 'blog') {
    throw new HttpError(400, 'Esta página é reservada pelo sistema e não possui histórico de versões.');
  }
  const data = await service.revertToVersion(id, content, req.user!);
  return sendSuccess(res, data);
}

export async function deletePage(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const page = await service.getAdminById(id);
  if (page.pageKey === 'home' || page.slug === 'home') {
    throw new HttpError(400, 'A home não pode ser removida.');
  }
  if (page.pageKey === 'blog' || page.slug === 'blog') {
    throw new HttpError(400, 'O blog não pode ser removido.');
  }
  await service.delete(id, req.user!);
  return sendSuccess(res, { deleted: true });
}
