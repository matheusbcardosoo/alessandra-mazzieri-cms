import { Page, PageStatus, Prisma } from '@prisma/client';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PageRepository } from '../repositories/page.repository';
import { ensureHeroAtTop, normalizePageLayout, validateHeroLayout, type PageLayoutV2 } from '../utils/pageLayout';
import { AuditActor, auditLogService } from './auditLog.service';
import { pageVersionService } from './pageVersion.service';

const repository = new PageRepository();

export class HomeService {
  private normalizeHomeLayout(layout: unknown, now: string): PageLayoutV2 {
    const normalized = normalizePageLayout(layout);
    return ensureHeroAtTop(normalized, now);
  }

  private filterVisibleBlocks(layout: PageLayoutV2): PageLayoutV2 {
    return {
      ...layout,
      sections: (layout.sections || []).map((section) => ({
        ...section,
        cols: section.cols.map((col) => ({
          ...col,
          blocks: col.blocks.filter((block) => block.visible !== false)
        }))
      }))
    };
  }

  private async upsertHome(now: string): Promise<Page> {
    const existing = await repository.findBySlugOrKey('home');
    const baseLayout = existing ? this.normalizeHomeLayout(existing.layout, now) : this.normalizeHomeLayout({ version: 2, sections: [] }, now);

    if (!existing) {
      const created = await repository.create({
        slug: 'home',
        pageKey: 'home',
        title: 'Página Inicial',
        description: 'Página inicial do site',
        layout: baseLayout as Prisma.InputJsonValue,
        status: PageStatus.published,
        publishedAt: new Date()
      });
      await this.syncCache(created);
      return created;
    }

    const needsUpdate =
      existing.slug !== 'home' ||
      existing.pageKey !== 'home' ||
      existing.status !== PageStatus.published ||
      !existing.publishedAt ||
      JSON.stringify(existing.layout) !== JSON.stringify(baseLayout);

    if (!needsUpdate) {
      return existing;
    }

    const updated = await repository.update(existing.id, {
      slug: 'home',
      pageKey: 'home',
      title: existing.title || 'Página Inicial',
      description: existing.description ?? null,
      layout: baseLayout as Prisma.InputJsonValue,
      status: PageStatus.published,
      publishedAt: existing.publishedAt ?? new Date()
    });
    await this.syncCache(updated);
    return updated;
  }

  async ensureHome(): Promise<Page> {
    const now = new Date().toISOString();
    return this.upsertHome(now);
  }

  async getAdmin(): Promise<Page> {
    return this.ensureHome();
  }

  async getPublic(): Promise<Page> {
    return cacheProvider.wrap(cacheKeys.home, cacheTTL.home, async () => {
      const page = await this.ensureHome();
      if (page.status !== PageStatus.published) {
        throw new HttpError(404, 'Home não publicada');
      }
      const layout = this.filterVisibleBlocks(page.layout as PageLayoutV2);
      return { ...page, layout };
    });
  }

  async updateHome(
    id: string,
    payload: Partial<{ title?: string; description?: string | null; layout?: unknown }>,
    actor: AuditActor
  ): Promise<{ page: Page; changedToDraft: boolean }> {
    const existing = await repository.findById(id);
    if (!existing || (existing.pageKey !== 'home' && existing.slug !== 'home')) {
      throw new HttpError(404, 'Home não encontrada');
    }

    const now = new Date().toISOString();
    if (payload.layout !== undefined) {
      validateHeroLayout(payload.layout);
    }
    const nextLayout = this.normalizeHomeLayout(payload.layout ?? existing.layout, now);
    const updated = await repository.update(id, {
      slug: 'home',
      pageKey: 'home',
      title: payload.title ?? existing.title ?? 'Página Inicial',
      description: payload.description === undefined ? existing.description ?? null : payload.description ?? null,
      layout: nextLayout as Prisma.InputJsonValue,
      status: PageStatus.published,
      publishedAt: new Date()
    });
    await this.syncCache(updated);
    await pageVersionService.snapshot(updated, actor);
    await auditLogService.record({ actor, action: 'update', entity: 'page', entityId: updated.id, entityLabel: updated.title });
    return { page: updated, changedToDraft: false };
  }

  // A home publica a cada save (não tem ação de "Publicar" separada), então
  // reverter uma versão antiga é só reaplicar seu conteúdo pelo mesmo fluxo
  // de updateHome — que já republica e gera uma nova entrada no histórico.
  async revertToVersion(
    id: string,
    version: { title: string; description: string | null; layout: unknown },
    actor: AuditActor
  ): Promise<Page> {
    const { page } = await this.updateHome(id, { title: version.title, description: version.description, layout: version.layout }, actor);
    return page;
  }

  // Regenera o cache público da home na mesma request (a home é sempre
  // publicada, então não há caso de "invalidar sem repor" como nas páginas
  // comuns). Também limpa o slot legado cacheKeys.page('home'), que nunca é
  // populado por PageService (a home tem endpoint próprio) mas pode existir
  // de versões antigas do cache (Fase 3 do plano de template).
  private async syncCache(page: Page): Promise<void> {
    const layout = this.filterVisibleBlocks(page.layout as PageLayoutV2);
    await cacheProvider.set(cacheKeys.home, { ...page, layout }, cacheTTL.home);
    await cacheProvider.del(cacheKeys.page('home'));
  }
}
