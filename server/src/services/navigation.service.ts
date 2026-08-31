import { NavItem, NavItemType, Prisma } from '@prisma/client';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { HttpError } from '../utils/errors';
import { NavRepository } from '../repositories/nav.repository';
import { AuditActor, auditLogService } from './auditLog.service';

const repository = new NavRepository();

export type NavigationItemInput = {
  label?: string;
  type?: NavItemType;
  pageKey?: string | null;
  url?: string | null;
  isParent?: boolean;
  showInNavbar?: boolean;
  showInFooter?: boolean;
  parentId?: string | null;
  orderNavbar?: number | null;
  orderFooter?: number | null;
  isVisible?: boolean;
};

type NormalizedNavItem = {
  label: string;
  type: NavItemType;
  pageKey: string | null;
  url: string | null;
  isParent: boolean;
  showInNavbar: boolean;
  showInFooter: boolean;
  parentId: string | null;
  orderNavbar: number;
  orderFooter: number | null;
  isVisible: boolean;
};

type NormalizedResult = {
  state: NormalizedNavItem;
  autoOrderNavbar: boolean;
  autoOrderFooter: boolean;
};

export class NavigationService {
  async getPublic(): Promise<NavItem[]> {
    return cacheProvider.wrap(cacheKeys.nav, cacheTTL.nav, () => repository.findPublic());
  }

  async listAdmin(): Promise<NavItem[]> {
    return repository.findAll();
  }

  async create(input: NavigationItemInput, actor: AuditActor): Promise<NavItem> {
    const { state, autoOrderNavbar, autoOrderFooter } = await this.normalizeInput(input);
    const payload = { ...state };
    if (autoOrderNavbar) {
      payload.orderNavbar = await repository.getNextOrder('navbar', payload.parentId);
    }
    if (autoOrderFooter) {
      payload.orderFooter = await repository.getNextOrder('footer', payload.parentId);
    }
    const created = await repository.create(payload as Prisma.NavItemUncheckedCreateInput);
    await this.regenerateCache();
    await auditLogService.record({ actor, action: 'create', entity: 'navItem', entityId: created.id, entityLabel: created.label });
    return created;
  }

  async update(id: string, input: NavigationItemInput, actor: AuditActor): Promise<NavItem> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Navigation item not found');

    const { state, autoOrderNavbar, autoOrderFooter } = await this.normalizeInput(input, existing);
    const payload = { ...state };
    if (autoOrderNavbar) {
      payload.orderNavbar = await repository.getNextOrder('navbar', payload.parentId);
    }
    if (autoOrderFooter) {
      payload.orderFooter = await repository.getNextOrder('footer', payload.parentId);
    }

    const updated = await repository.update(id, payload as Prisma.NavItemUncheckedUpdateInput);

    const childrenUpdate: Prisma.NavItemUncheckedUpdateManyInput = {};
    if ((!payload.showInNavbar || !payload.isVisible) && existing.showInNavbar) {
      childrenUpdate.showInNavbar = false;
    }
    if ((!payload.showInFooter || !payload.isVisible) && existing.showInFooter) {
      childrenUpdate.showInFooter = false;
    }
    if (!payload.isVisible && existing.isVisible) {
      childrenUpdate.isVisible = false;
    }
    if (Object.keys(childrenUpdate).length) {
      await repository.updateChildren(id, childrenUpdate);
    }

    await this.regenerateCache();
    await auditLogService.record({ actor, action: 'update', entity: 'navItem', entityId: updated.id, entityLabel: updated.label });
    return updated;
  }

  async delete(id: string, actor: AuditActor): Promise<void> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Navigation item not found');
    await repository.delete(id);
    await this.regenerateCache();
    await auditLogService.record({ actor, action: 'delete', entity: 'navItem', entityId: existing.id, entityLabel: existing.label });
  }

  async reorder(
    context: 'navbar' | 'footer',
    items: { id: string; parentId?: string | null; order: number }[],
    actor: AuditActor
  ): Promise<NavItem[]> {
    if (!items.length) throw new HttpError(400, 'Nenhum item informado');

    const ids = items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) throw new HttpError(400, 'Itens duplicados na reordenação');
    const existingItems = await repository.findByIds(ids);
    if (existingItems.length !== ids.length) throw new HttpError(404, 'Alguns itens não foram encontrados');

    const parentIds = Array.from(new Set(items.map((i) => i.parentId).filter((id): id is string => Boolean(id))));
    const parents = parentIds.length ? await repository.findByIds(parentIds) : [];
    const parentsMap = new Map(parents.map((p) => [p.id, p]));
    const pairKeys = new Set<string>();

    for (const item of items) {
      if (item.order < 0) throw new HttpError(400, 'Ordem precisa ser positiva');

      const key = `${item.parentId ?? 'root'}-${item.order}`;
      if (pairKeys.has(key)) throw new HttpError(400, 'Ordem duplicada para o mesmo nível');
      pairKeys.add(key);

      const current = existingItems.find((i) => i.id === item.id);
      if (!current) throw new HttpError(404, 'Item não encontrado');

      const parent = item.parentId ? parentsMap.get(item.parentId) : null;
      if (item.parentId && !parent) throw new HttpError(400, 'Item pai não encontrado');
      if (parent && parent.parentId) throw new HttpError(400, 'Profundidade máxima é de 2 níveis');
      if (item.parentId === item.id) throw new HttpError(400, 'Um item não pode ser pai de si mesmo');
      if (parent && parent.isVisible === false) throw new HttpError(400, 'O item pai está oculto');
      if (parent && !parent.isParent) throw new HttpError(400, 'O item pai não aceita submenus');

      if (context === 'navbar') {
        if (!current.showInNavbar) throw new HttpError(400, `O item "${current.label}" não está marcado para a navbar`);
        if (parent && !parent.showInNavbar) throw new HttpError(400, 'O item pai não está marcado para navbar');
      }

      if (context === 'footer') {
        if (!current.showInFooter) throw new HttpError(400, `O item "${current.label}" não está marcado para o rodapé`);
        if (parent && !parent.showInFooter) throw new HttpError(400, 'O item pai não está marcado para rodapé');
      }
    }

    const updated = await repository.reorder(context, items);
    await this.regenerateCache();
    await auditLogService.record({
      actor,
      action: 'reorder',
      entity: 'navItem',
      entityId: null,
      entityLabel: `Reordenação de ${items.length} item(ns) — ${context}`
    });
    return updated;
  }

  private async normalizeInput(input: NavigationItemInput, existing?: NavItem): Promise<NormalizedResult> {
    const label = input.label ?? existing?.label;
    if (!label) throw new HttpError(400, 'Label é obrigatório');

    const type = input.type ?? existing?.type;
    if (!type) throw new HttpError(400, 'Tipo é obrigatório');

    const showInNavbar = input.showInNavbar ?? existing?.showInNavbar ?? false;
    const showInFooter = input.showInFooter ?? existing?.showInFooter ?? false;
    const isVisible = input.isVisible ?? existing?.isVisible ?? true;
    let isParent = input.isParent ?? existing?.isParent ?? false;
    let parentId = input.parentId !== undefined ? input.parentId : existing?.parentId ?? null;

    if (isParent) parentId = null;
    if (parentId) isParent = false;

    const parent = parentId ? await repository.findById(parentId) : null;
    if (parentId && !parent) throw new HttpError(400, 'Item pai não encontrado');
    if (parentId && existing && parentId === existing.id) throw new HttpError(400, 'Um item não pode ser pai de si mesmo');
    if (parent && parent.parentId) throw new HttpError(400, 'Apenas um nível de submenu é permitido');
    if (parent && !parent.isParent) throw new HttpError(400, 'O item selecionado não permite submenus');
    if (parent && parent.isVisible === false && (showInNavbar || showInFooter)) {
      throw new HttpError(400, 'O item pai está oculto');
    }
    if (showInNavbar && parent && !parent.showInNavbar) throw new HttpError(400, 'O item pai não está visível na navbar');
    if (showInFooter && parent && !parent.showInFooter) throw new HttpError(400, 'O item pai não está visível no rodapé');
    if (parentId && !showInNavbar) throw new HttpError(400, 'Submenus só são permitidos para itens da navbar');

    if (!isParent && existing?.isParent && !parentId) {
      const children = await repository.findChildren(existing.id);
      if (children.length) {
        throw new HttpError(400, 'Remova ou mova os subitens antes de desativar como item pai');
      }
    }

    if (isVisible && !showInNavbar && !showInFooter) {
      throw new HttpError(400, 'Itens visíveis precisam aparecer na navbar ou rodapé');
    }

    const pageKey = type === 'INTERNAL_PAGE' ? input.pageKey ?? existing?.pageKey ?? null : null;
    const url = type === 'EXTERNAL_URL' ? input.url ?? existing?.url ?? null : null;

    if (type === 'INTERNAL_PAGE' && !pageKey) throw new HttpError(400, 'pageKey é obrigatório para páginas internas');
    if (type === 'EXTERNAL_URL' && !url) throw new HttpError(400, 'url é obrigatório para links externos');

    const hasNavbarOrder = input.orderNavbar !== undefined && input.orderNavbar !== null;
    const hasFooterOrder = input.orderFooter !== undefined;
    const orderNavbar = hasNavbarOrder ? (input.orderNavbar as number) : existing?.orderNavbar ?? 0;
    const orderFooter = hasFooterOrder ? (input.orderFooter as number | null) : existing?.orderFooter ?? null;

    const autoOrderNavbar = !hasNavbarOrder && (!existing || (showInNavbar && existing.showInNavbar === false));
    const autoOrderFooter = !hasFooterOrder && showInFooter && (!existing || existing.showInFooter === false);

    return {
      state: {
        label,
        type,
        pageKey,
        url,
        isParent,
        showInNavbar,
        showInFooter,
        parentId: parentId ?? null,
        orderNavbar,
        orderFooter,
        isVisible
      },
      autoOrderNavbar,
      autoOrderFooter
    };
  }

  // Regenera o cache público de navegação na mesma request em vez de só
  // invalidar: o próximo visitante já encontra o cache quente (Fase 3 do
  // plano de template: docs/plano-template.md).
  private async regenerateCache() {
    const items = await repository.findPublic();
    await cacheProvider.set(cacheKeys.nav, items, cacheTTL.nav);
  }
}
