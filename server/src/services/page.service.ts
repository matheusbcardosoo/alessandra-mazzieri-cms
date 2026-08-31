import { Page, PageStatus, Prisma } from '@prisma/client';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PageRepository } from '../repositories/page.repository';
import { normalizePageLayout, validateHeroLayout } from '../utils/pageLayout';
import { SeoService } from './seo.service';
import { isReservedPage, isReservedKeyOrSlug, RESERVED_PAGE_KEYS } from '../utils/reservedPages';
import { AuditActor, auditLogService } from './auditLog.service';
import { pageVersionService } from './pageVersion.service';

const repository = new PageRepository();
const seoService = new SeoService();

export type PageInput = {
  slug: string;
  pageKey?: string | null;
  title: string;
  description?: string | null;
  layout: unknown;
  status?: PageStatus;
  publishedAt?: Date | null;
};

export class PageService {
  async getPublishedBySlug(slug: string): Promise<Page> {
    if (isReservedKeyOrSlug(slug)) throw new HttpError(404, 'Page not found');
    return cacheProvider.wrap(cacheKeys.page(slug), cacheTTL.page, async () => {
      const page = await repository.findPublishedBySlug(slug);
      if (!page || isReservedKeyOrSlug(page.pageKey)) throw new HttpError(404, 'Page not found');
      return page;
    });
  }

  async getPublishedByKey(pageKey: string): Promise<Page> {
    if (isReservedKeyOrSlug(pageKey)) throw new HttpError(404, 'Page not found');
    const page = await repository.findPublishedByPageKey(pageKey);
    if (!page) throw new HttpError(404, 'Page not found');
    return page;
  }

  async getAdminById(id: string): Promise<Page> {
    const page = await repository.findById(id);
    if (!page) throw new HttpError(404, 'Page not found');
    return page;
  }

  async listAdmin(includeHome = false, restrictToIds?: string[]): Promise<Page[]> {
    // `includeHome` deliberately still excludes `blog` — o picker de páginas
    // do admin de usuários precisa oferecer a home pra conceder acesso, mas
    // blog nunca é concedido por página (é só um toggle de sectionAccess).
    const pages = includeHome
      ? await repository.findAll({ excludePageKeys: ['blog'], excludeSlugs: ['blog'] })
      : await repository.findAll({ excludePageKeys: [...RESERVED_PAGE_KEYS], excludeSlugs: [...RESERVED_PAGE_KEYS] });
    if (!restrictToIds) return pages;
    const allowed = new Set(restrictToIds);
    return pages.filter((p) => allowed.has(p.id));
  }

  async create(payload: PageInput, actor: AuditActor): Promise<Page> {
    validateHeroLayout(payload.layout);
    const layout = normalizePageLayout(payload.layout);
    const status: PageStatus = payload.status ?? PageStatus.draft;
    const publishedAt = status === PageStatus.published ? payload.publishedAt ?? new Date() : null;
    const slug = payload.slug.trim().toLowerCase();
    const pageKey = payload.pageKey?.trim().toLowerCase() || null;
    if (isReservedKeyOrSlug(pageKey) || isReservedKeyOrSlug(slug)) {
      throw new HttpError(400, 'Este slug/pageKey é reservado pelo sistema. Use o endpoint dedicado.');
    }

    const created = await repository.create({
      slug,
      pageKey,
      title: payload.title,
      description: payload.description ?? null,
      layout: layout as Prisma.InputJsonValue,
      status,
      publishedAt
    });
    await this.syncCache(created);
    await auditLogService.record({ actor, action: 'create', entity: 'page', entityId: created.id, entityLabel: created.title });
    return created;
  }

  async update(id: string, payload: Partial<PageInput>, actor: AuditActor): Promise<{ page: Page; changedToDraft: boolean }> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    const isReserved = isReservedPage(existing);

    if (payload.pageKey && payload.pageKey !== existing.pageKey) {
      throw new HttpError(400, 'pageKey não pode ser alterada por este endpoint');
    }

    const hasContentChange =
      payload.slug !== undefined ||
      payload.title !== undefined ||
      payload.description !== undefined ||
      payload.layout !== undefined;

    const statusBefore = existing.status;
    const nextStatus: PageStatus =
      statusBefore === PageStatus.published && hasContentChange ? PageStatus.draft : payload.status ?? existing.status;

    const slug = payload.slug ? payload.slug.trim().toLowerCase() : undefined;
    if (isReservedKeyOrSlug(slug)) {
      throw new HttpError(400, 'Este slug é reservado pelo sistema.');
    }
    if (isReserved && slug && slug !== existing.slug) {
      throw new HttpError(400, 'O slug desta página reservada não pode ser alterado por este endpoint.');
    }

    const nextPublishedAt =
      nextStatus === PageStatus.published
        ? payload.publishedAt ?? existing.publishedAt ?? new Date()
        : payload.publishedAt ?? (statusBefore === PageStatus.published && hasContentChange ? existing.publishedAt : null);

    if (payload.layout !== undefined) {
      validateHeroLayout(payload.layout);
    }
    const layout = payload.layout !== undefined ? normalizePageLayout(payload.layout) : undefined;

    const updated = await repository.update(id, {
      slug: slug ?? undefined,
      title: payload.title ?? undefined,
      description: payload.description === undefined ? undefined : payload.description ?? null,
      layout: layout as Prisma.InputJsonValue | undefined,
      status: nextStatus,
      publishedAt: nextPublishedAt ?? undefined
    });

    // Invalida sempre o slug anterior (o conteúdo cacheado pode estar
    // desatualizado ou a página pode ter deixado de estar publicada) e, se o
    // slug mudou, invalida o novo slug também antes de decidir se regenera.
    await cacheProvider.del(cacheKeys.page(existing.slug));
    if (slug && slug !== existing.slug) {
      await cacheProvider.del(cacheKeys.page(slug));
    }
    await this.syncCache(updated);
    await auditLogService.record({ actor, action: 'update', entity: 'page', entityId: updated.id, entityLabel: updated.title });

    const changedToDraft = statusBefore === PageStatus.published && updated.status === PageStatus.draft;
    return { page: updated, changedToDraft };
  }

  async delete(id: string, actor: AuditActor): Promise<void> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    if (isReservedPage(existing)) {
      throw new HttpError(400, 'Esta página é reservada pelo sistema e não pode ser removida.');
    }
    await repository.delete(id);
    await cacheProvider.del(cacheKeys.page(existing.slug));
    await seoService.regeneratePublicIndexes();
    await auditLogService.record({ actor, action: 'delete', entity: 'page', entityId: existing.id, entityLabel: existing.title });
  }

  async publish(id: string, actor: AuditActor): Promise<Page> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    if (isReservedPage(existing)) {
      throw new HttpError(400, 'Esta página é reservada pelo sistema e é sempre publicada automaticamente.');
    }
    const updated = await repository.update(id, { status: PageStatus.published, publishedAt: new Date() });
    await this.syncCache(updated);
    await pageVersionService.snapshot(updated, actor);
    await auditLogService.record({ actor, action: 'publish', entity: 'page', entityId: updated.id, entityLabel: updated.title });
    return updated;
  }

  // Aplica o conteúdo de uma versão antiga do histórico e já republica na
  // hora (decisão de produto: reverter deve refletir no site imediatamente,
  // ao contrário de update(), que força rascunho ao editar uma página já
  // publicada). A própria reversão também vira uma nova entrada no
  // histórico, como qualquer publicação.
  async revertToVersion(
    id: string,
    version: { title: string; description: string | null; layout: unknown },
    actor: AuditActor
  ): Promise<Page> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    if (isReservedPage(existing)) {
      throw new HttpError(400, 'Esta página é reservada pelo sistema e não usa este fluxo de reversão.');
    }
    const layout = normalizePageLayout(version.layout);
    const updated = await repository.update(id, {
      title: version.title,
      description: version.description,
      layout: layout as Prisma.InputJsonValue,
      status: PageStatus.published,
      publishedAt: new Date()
    });
    await this.syncCache(updated);
    await pageVersionService.snapshot(updated, actor);
    await auditLogService.record({ actor, action: 'publish', entity: 'page', entityId: updated.id, entityLabel: updated.title });
    return updated;
  }

  async unpublish(id: string, actor: AuditActor): Promise<Page> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Page not found');
    if (isReservedPage(existing)) {
      throw new HttpError(400, 'Esta página é reservada pelo sistema e não pode ser despublicada.');
    }
    const updated = await repository.update(id, { status: PageStatus.draft, publishedAt: null });
    await cacheProvider.del(cacheKeys.page(existing.slug));
    await seoService.regeneratePublicIndexes();
    await auditLogService.record({ actor, action: 'unpublish', entity: 'page', entityId: updated.id, entityLabel: updated.title });
    return updated;
  }

  // Regenera o cache público da página na mesma request em vez de só
  // invalidar: o próximo visitante já encontra o cache quente. Só popula o
  // cache quando a página resultante está de fato publicada — caso
  // contrário apenas invalida, para não vazar rascunho no público
  // (Fase 3 do plano de template: docs/plano-template.md).
  private async syncCache(page: Page): Promise<void> {
    if (page.status === PageStatus.published && !isReservedPage(page)) {
      await cacheProvider.set(cacheKeys.page(page.slug), page, cacheTTL.page);
    } else {
      await cacheProvider.del(cacheKeys.page(page.slug));
    }
    // Conjunto de páginas publicadas pode ter mudado — regenera sitemap.xml
    // e llms.txt na mesma request (Fase 4, docs/plano-template.md).
    await seoService.regeneratePublicIndexes();
  }
}
