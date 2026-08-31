import { Prisma, NavItem } from '@prisma/client';
import { prisma } from '../config/prisma';

type ReorderInput = { id: string; parentId?: string | null; order: number };

export class NavRepository {
  findById(id: string): Promise<NavItem | null> {
    return prisma.navItem.findUnique({ where: { id } });
  }

  findByIds(ids: string[]): Promise<NavItem[]> {
    return prisma.navItem.findMany({ where: { id: { in: ids } } });
  }

  findChildren(parentId: string): Promise<NavItem[]> {
    return prisma.navItem.findMany({
      where: { parentId },
      orderBy: [{ orderNavbar: 'asc' }, { createdAt: 'asc' }]
    });
  }

  findPublic(): Promise<NavItem[]> {
    return prisma.navItem.findMany({
      where: {
        isVisible: true,
        OR: [{ showInNavbar: true }, { showInFooter: true }]
      },
      orderBy: [{ parentId: 'asc' }, { orderNavbar: 'asc' }, { orderFooter: 'asc' }, { createdAt: 'asc' }]
    });
  }

  findAll(): Promise<NavItem[]> {
    return prisma.navItem.findMany({
      orderBy: [{ parentId: 'asc' }, { orderNavbar: 'asc' }, { orderFooter: 'asc' }, { createdAt: 'asc' }]
    });
  }

  create(data: Prisma.NavItemUncheckedCreateInput): Promise<NavItem> {
    return prisma.navItem.create({ data });
  }

  update(id: string, data: Prisma.NavItemUncheckedUpdateInput): Promise<NavItem> {
    return prisma.navItem.update({ where: { id }, data });
  }

  delete(id: string): Promise<NavItem> {
    return prisma.navItem.delete({ where: { id } });
  }

  deleteMany(ids: string[]): Promise<Prisma.BatchPayload> {
    return prisma.navItem.deleteMany({ where: { id: { in: ids } } });
  }

  updateChildren(parentId: string, data: Prisma.NavItemUncheckedUpdateManyInput): Promise<Prisma.BatchPayload> {
    return prisma.navItem.updateMany({ where: { parentId }, data });
  }

  async getNextOrder(context: 'navbar' | 'footer', parentId: string | null): Promise<number> {
    const aggregated = await prisma.navItem.aggregate({
      where: { parentId: parentId ?? null },
      _max: {
        orderNavbar: context === 'navbar' ? true : undefined,
        orderFooter: context === 'footer' ? true : undefined
      }
    });
    const max = context === 'navbar' ? aggregated._max.orderNavbar : aggregated._max.orderFooter;
    return (max ?? -1) + 1;
  }

  async reorder(context: 'navbar' | 'footer', items: ReorderInput[]): Promise<NavItem[]> {
    // Otimização: usar batch update com todos os items em uma transação única
    // Evita 2N queries (antes: N updates em temp + N updates finais)
    return prisma.$transaction(async (tx) => {
      // Atualizar todos em uma passagem única
      await Promise.all(
        items.map((item) =>
          tx.navItem.update({
            where: { id: item.id },
            data: {
              parentId: item.parentId ?? null,
              orderNavbar: context === 'navbar' ? item.order : undefined,
              orderFooter: context === 'footer' ? item.order : undefined
            }
          })
        )
      );

      const orderBy =
        context === 'navbar'
          ? [{ orderNavbar: 'asc' as const }, { createdAt: 'asc' as const }]
          : [{ orderFooter: 'asc' as const }, { createdAt: 'asc' as const }];

      return tx.navItem.findMany({ orderBy });
    });
  }
}
