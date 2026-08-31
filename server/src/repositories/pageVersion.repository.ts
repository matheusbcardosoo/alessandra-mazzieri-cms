import { PageVersion, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export type PageVersionCreateData = {
  pageId: string;
  title: string;
  description: string | null;
  layout: Prisma.InputJsonValue;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
};

export class PageVersionRepository {
  create(data: PageVersionCreateData): Promise<PageVersion> {
    return prisma.pageVersion.create({ data });
  }

  listByPage(pageId: string): Promise<PageVersion[]> {
    return prisma.pageVersion.findMany({ where: { pageId }, orderBy: { publishedAt: 'desc' } });
  }

  findLatest(pageId: string): Promise<PageVersion | null> {
    return prisma.pageVersion.findFirst({ where: { pageId }, orderBy: { publishedAt: 'desc' } });
  }

  findById(id: string): Promise<PageVersion | null> {
    return prisma.pageVersion.findUnique({ where: { id } });
  }

  // Mantém só as `limit` versões mais recentes da página, apagando o resto.
  async trim(pageId: string, limit: number): Promise<void> {
    const excess = await prisma.pageVersion.findMany({
      where: { pageId },
      orderBy: { publishedAt: 'desc' },
      skip: limit,
      select: { id: true }
    });
    if (excess.length === 0) return;
    await prisma.pageVersion.deleteMany({ where: { id: { in: excess.map((v) => v.id) } } });
  }
}
