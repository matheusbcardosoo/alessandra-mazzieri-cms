import { Request, Response } from 'express';
import { z } from 'zod';
import { PostService } from '../../services/post.service';
import { sendSuccess } from '../../utils/responses';
import { uuidParamSchema } from '../../utils/validation';

const service = new PostService();

const baseSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  excerpt: z.string().min(10),
  content: z.string().min(10),
  coverMediaId: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional()
});

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) em cada
// handler (Fase 5 do plano de template: docs/plano-template.md).

export async function listPostsAdmin(_req: Request, res: Response) {
  const data = await service.listAdmin();
  return sendSuccess(res, data);
}

export async function createPost(req: Request, res: Response) {
  const payload = baseSchema.parse(req.body);
  const data = await service.create(
    {
      ...payload,
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null
    },
    req.user!
  );
  return sendSuccess(res, data, 201);
}

export async function updatePost(req: Request, res: Response) {
  const payload = baseSchema.partial().parse(req.body);
  const { id } = uuidParamSchema.parse(req.params);
  const data = await service.update(
    id,
    {
      ...payload,
      publishedAt: payload.publishedAt === undefined ? undefined : payload.publishedAt ? new Date(payload.publishedAt) : null
    },
    req.user!
  );
  const changedToDraft = data.status === 'draft' && payload.status !== 'published';
  return sendSuccess(res, { post: data, changedToDraft });
}

export async function deletePost(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  await service.delete(id, req.user!);
  return sendSuccess(res, { deleted: true });
}

export async function publishPost(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const data = await service.publish(id, req.user!);
  return sendSuccess(res, data);
}

export async function unpublishPost(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const data = await service.unpublish(id, req.user!);
  return sendSuccess(res, data);
}
