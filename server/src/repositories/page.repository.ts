import { Prisma, Page } from '@prisma/client';
import { prisma } from '../config/prisma';
import { RESERVED_PAGE_KEYS } from '../utils/reservedPages';

export class PageRepository {
  findById(id: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { slug } });
  }

  findByPageKey(pageKey: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { pageKey } });
  }

  findBySlugOrKey(key: string): Promise<Page | null> {
    return prisma.page.findFirst({
      where: {
        OR: [{ slug: key }, { pageKey: key }]
      }
    });
  }

  findPublishedBySlug(slug: string): Promise<Page | null> {
    return prisma.page.findFirst({ where: { slug, status: 'published' } });
  }

  findPublishedByPageKey(pageKey: string): Promise<Page | null> {
    return prisma.page.findFirst({ where: { pageKey, status: 'published' } });
  }

  // Todas as páginas publicadas, exceto as páginas reservadas do sistema
  // (home, blog — cada uma vive na sua própria rota fixa e não tem URL de
  // página genérica) — usado para gerar sitemap.xml/llms.txt (Fase 4,
  // docs/plano-template.md).
  findAllPublished(): Promise<Page[]> {
    return prisma.page.findMany({
      where: {
        status: 'published',
        OR: [{ pageKey: null }, { pageKey: { notIn: [...RESERVED_PAGE_KEYS] } }]
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  findAll(options?: { excludePageKeys?: string[]; excludeSlugs?: string[] }): Promise<Page[]> {
    const filters: Prisma.PageWhereInput[] = [];

    // Filtro para pageKey: exclui se for igual a QUALQUER um dos valores especificados (NULL é diferente)
    if (options?.excludePageKeys?.length) {
      filters.push({
        OR: [
          { pageKey: null },
          { pageKey: { notIn: options.excludePageKeys } }
        ]
      });
    }

    // Filtro para slug: exclui se for igual a QUALQUER um dos valores especificados
    if (options?.excludeSlugs?.length) {
      filters.push({ slug: { notIn: options.excludeSlugs } });
    }

    const where: Prisma.PageWhereInput | undefined = filters.length ? { AND: filters } : undefined;

    return prisma.page.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  create(data: Prisma.PageCreateInput): Promise<Page> {
    return prisma.page.create({ data });
  }

  update(id: string, data: Prisma.PageUpdateInput): Promise<Page> {
    return prisma.page.update({ where: { id }, data });
  }

  delete(id: string): Promise<Page> {
    return prisma.page.delete({ where: { id } });
  }
}
