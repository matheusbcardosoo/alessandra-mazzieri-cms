import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess } from '../../utils/responses';

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) em cada
// handler (Fase 5 do plano de template: docs/plano-template.md).

export async function getDashboardMetrics(_req: Request, res: Response) {
  const [
    pagesPublished,
    pagesDraft,
    articlesPublished,
    articlesDraft,
    totalArticleViews,
    totalImages,
    totalArticles,
    totalPages
  ] = await Promise.all([
    prisma.page.count({ where: { status: 'published' } }),
    prisma.page.count({ where: { status: 'draft' } }),
    prisma.post.count({ where: { status: 'published' } }),
    prisma.post.count({ where: { status: 'draft' } }),
    prisma.post.aggregate({ _sum: { views: true }, where: { status: 'published' } }),
    prisma.media.count(),
    prisma.post.count(),
    prisma.page.count()
  ]);

  return sendSuccess(res, {
    pagesPublished,
    pagesDraft,
    articlesPublished,
    articlesDraft,
    totalArticleViews: totalArticleViews._sum?.views ?? 0,
    totalImages,
    totalArticles,
    totalPages
  });
}
