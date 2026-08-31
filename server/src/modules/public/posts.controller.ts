import { Request, Response } from 'express';
import { z } from 'zod';
import { PostService } from '../../services/post.service';
import { BlogService } from '../../services/blog.service';
import { sendSuccess } from '../../utils/responses';
import { uuidParamSchema } from '../../utils/validation';

const service = new PostService();
const blogService = new BlogService();

function parseExcludeIds(raw: string | undefined): string[] | undefined {
  return raw
    ? raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : undefined;
}

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) em cada
// handler (Fase 5 do plano de template: docs/plano-template.md).

export async function listPosts(req: Request, res: Response) {
  const query = z
    .object({
      search: z.string().optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      excludeIds: z.string().optional()
    })
    .parse(req.query);

  const data = await service.listPaginated({
    search: query.search,
    page: query.page,
    limit: query.limit,
    excludeIds: parseExcludeIds(query.excludeIds)
  });

  return sendSuccess(res, data);
}

export async function listFeaturedPosts(req: Request, res: Response) {
  const { limit } = z.object({ limit: z.coerce.number().optional() }).parse(req.query);
  const parsedLimit = Math.min(Math.max(limit ?? 3, 0), 3);
  const data = await service.listFeatured(parsedLimit || 3);
  return sendSuccess(res, data);
}

export async function getBlogHome(_req: Request, res: Response) {
  const [posts, config] = await Promise.all([service.getBlogHome(), blogService.getPublic()]);
  return sendSuccess(res, { ...posts, ...config });
}

export async function listMostViewedPosts(req: Request, res: Response) {
  const query = z
    .object({
      limit: z.coerce.number().optional(),
      excludeIds: z.string().optional()
    })
    .parse(req.query);
  const parsedLimit = Math.min(Math.max(query.limit ?? 3, 0), 3);
  const data = await service.listMostViewed(parsedLimit || 3, parseExcludeIds(query.excludeIds));
  return sendSuccess(res, data);
}

export async function getPost(req: Request, res: Response) {
  const { slug } = z.object({ slug: z.string() }).parse(req.params);
  const data = await service.getPublicBySlug(slug);
  return sendSuccess(res, data);
}

export async function incrementView(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  res.setHeader('Cache-Control', 'no-store');
  // Responder imediatamente — não bloquear o usuário esperando o DB
  sendSuccess(res, { queued: true });
  // Atualizar em background (sem await)
  service.incrementViews(id, req.ip ?? 'unknown').catch(() => {
    // falha silenciosa — views é não-crítico
  });
}
