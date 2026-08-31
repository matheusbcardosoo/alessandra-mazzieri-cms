import { Prisma, HomeSection } from '@prisma/client';
import { prisma } from '../config/prisma';

export class HomeRepository {
  findById(id: string): Promise<HomeSection | null> {
    return prisma.homeSection.findUnique({ where: { id } });
  }

  findPublic(): Promise<HomeSection[]> {
    return prisma.homeSection.findMany({
      where: { visible: true },
      orderBy: { order: 'asc' }
    });
  }

  findAll(): Promise<HomeSection[]> {
    return prisma.homeSection.findMany({ orderBy: { order: 'asc' } });
  }

  reorder(items: { id: string; order: number }[]): Promise<HomeSection[]> {
    return prisma.$transaction(async (tx) => {
      await Promise.all(items.map((item) => tx.homeSection.update({ where: { id: item.id }, data: { order: item.order } })));
      return tx.homeSection.findMany({ orderBy: { order: 'asc' } });
    });
  }

  create(data: Prisma.HomeSectionCreateInput): Promise<HomeSection> {
    return prisma.homeSection.create({ data });
  }

  update(id: string, data: Prisma.HomeSectionUpdateInput): Promise<HomeSection> {
    return prisma.homeSection.update({ where: { id }, data });
  }

  delete(id: string): Promise<HomeSection> {
    return prisma.homeSection.delete({ where: { id } });
  }
}
