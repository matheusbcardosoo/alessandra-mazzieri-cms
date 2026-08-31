import { Media, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

type ListOptions = { search?: string; tag?: string };

export class MediaRepository {
  list({ search, tag }: ListOptions = {}): Promise<Media[]> {
    const where: Prisma.MediaWhereInput = {};

    if (tag) {
      where.tags = { has: tag.toLowerCase() };
    }

    if (search) {
      const s = search.toLowerCase();
      where.OR = [
        { alt: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: s } }
      ];
    }

    return prisma.media.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string): Promise<Media | null> {
    return prisma.media.findUnique({ where: { id } });
  }

  create(data: Prisma.MediaCreateInput): Promise<Media> {
    return prisma.media.create({ data });
  }

  update(id: string, data: Prisma.MediaUpdateInput): Promise<Media> {
    return prisma.media.update({ where: { id }, data });
  }

  delete(id: string): Promise<Media> {
    return prisma.media.delete({ where: { id } });
  }
}
