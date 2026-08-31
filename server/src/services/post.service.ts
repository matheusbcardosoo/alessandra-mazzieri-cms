import { PostStatus } from '@prisma/client';
import { cacheKeys, cacheTTL, cacheProvider } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PostFilters, PostRepository, PostWithMedia } from '../repositories/post.repository';
import { sanitizeContent } from '../utils/sanitize';
import { SeoService } from './seo.service';
import { AuditActor, auditLogService } from './auditLog.service';

const repository = new PostRepository();
const seoService = new SeoService();

export type PostInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverMediaId?: string | null;
  status?: PostStatus;
  publishedAt?: Date | null;
  tags?: string[];
  isFeatured?: boolean;
};

export class PostService {
  async listPublic(filters?: { search?: string }): Promise<PostWithMedia[]> {
    return repository.listPublished(filters);
  }

  async getPublicBySlug(slug: string): Promise<PostWithMedia> {
    const post = await cacheProvider.wrap(
      cacheKeys.post(slug),
      cacheTTL.post,
      () => repository.findPublishedBySlug(slug)
    );
    if (!post) throw new HttpError(404, 'Post not found');
    return post;
  }

  async listPaginated(filters?: PostFilters) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 9;
    const search = filters?.search ?? '';
    const key = `${cacheKeys.postsList}:p${page}:l${limit}:q${search}`;
    return cacheProvider.wrap(key, cacheTTL.postsList, () =>
      repository.paginatePublished(filters)
    );
  }

  async listFeatured(limit = 3) {
    return cacheProvider.wrap(cacheKeys.postsFeatured, cacheTTL.featuredPosts, () =>
      repository.listFeatured(limit)
    );
  }

  async listMostViewed(limit = 3, excludeIds?: string[]) {
    // Cachear apenas a versão sem exclusão (chamada direta de /public/blog/most-viewed)
    // Deixar o getBlogHome cacheado como um todo para variações com excludeIds
    if (!excludeIds?.length) {
      return cacheProvider.wrap(cacheKeys.postsMostViewed, cacheTTL.mostViewedPosts, () =>
        repository.listMostViewed(limit, [])
      );
    }
    return repository.listMostViewed(limit, excludeIds);
  }

  async getBlogHome() {
    return cacheProvider.wrap(cacheKeys.blogHome, cacheTTL.blogHome, async () => {
      // Paralelizar featured e mostViewed (independentes entre si)
      const [featuredRaw, mostViewed] = await Promise.all([
        repository.listFeatured(3),
        repository.listMostViewed(3, [])
      ]);

      // Fallback: se não há destaques, usar os 3 mais recentes
      // Usar paginatePublished com limit:3 em vez de listPublished() sem limit
      const featured =
        featuredRaw.length > 0
          ? featuredRaw
          : (await repository.paginatePublished({ page: 1, limit: 3 })).items;

      const featuredIds = featured.map((p) => p.id);
      const excludeIds = [...featuredIds, ...mostViewed.map((p) => p.id)];

      const latest = await repository.paginatePublished({ page: 1, limit: 6, excludeIds });

      return {
        featured: featured.slice(0, 3),
        mostViewed: mostViewed,
        latest
      };
    });
  }

  async listAdmin(): Promise<PostWithMedia[]> {
    return repository.listAll();
  }

  async create(payload: PostInput, actor: AuditActor): Promise<PostWithMedia> {
    const status: PostStatus = payload.status ?? PostStatus.draft;
    const publishedAt = status === PostStatus.published ? payload.publishedAt ?? new Date() : null;
    // Permitir isFeatured=true mesmo em DRAFT (só aparece no blog se status=PUBLISHED)
    const isFeatured = payload.isFeatured ?? false;

    // Validar limite apenas se isFeatured=true E status=published
    if (isFeatured && status === PostStatus.published) {
      await this.assertFeaturedLimit(isFeatured);
    }

    const created = await repository.create({
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      content: sanitizeContent(payload.content),
      coverMedia: payload.coverMediaId ? { connect: { id: payload.coverMediaId } } : undefined,
      status,
      isFeatured,
      publishedAt,
      tags: payload.tags ?? []
    });

    await this.syncCacheOnWrite(created);
    await auditLogService.record({ actor, action: 'create', entity: 'post', entityId: created.id, entityLabel: created.title });
    return created;
  }

  async update(id: string, payload: Partial<PostInput>, actor: AuditActor): Promise<PostWithMedia> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Post not found');

    const statusBefore = existing.status;

    const hasRelevantChange =
      payload.title !== undefined ||
      payload.slug !== undefined ||
      payload.excerpt !== undefined ||
      payload.content !== undefined ||
      payload.coverMediaId !== undefined ||
      payload.tags !== undefined;

    const status: PostStatus =
      statusBefore === PostStatus.published && hasRelevantChange ? PostStatus.draft : payload.status ?? existing.status;

    // Preservar isFeatured independente do status (DRAFT pode ter isFeatured=true)
    const isFeatured = payload.isFeatured ?? existing.isFeatured ?? false;

    // Validar limite apenas se isFeatured=true E status=published
    if (isFeatured && status === PostStatus.published) {
      await this.assertFeaturedLimit(isFeatured, id);
    }

    const publishedAt =
      status === PostStatus.published
        ? payload.publishedAt ?? existing.publishedAt ?? new Date()
        : payload.publishedAt ?? (statusBefore === PostStatus.published && hasRelevantChange ? existing.publishedAt : null);

    const updated = await repository.update(id, {
      title: payload.title ?? undefined,
      slug: payload.slug ?? undefined,
      excerpt: payload.excerpt ?? undefined,
      content: payload.content ? sanitizeContent(payload.content) : undefined,
      coverMedia: payload.coverMediaId
        ? { connect: { id: payload.coverMediaId } }
        : payload.coverMediaId === null
          ? { disconnect: true }
          : undefined,
      status,
      isFeatured,
      publishedAt,
      tags: payload.tags ?? undefined
    });

    await this.syncCacheOnWrite(updated, existing.slug);
    await auditLogService.record({ actor, action: 'update', entity: 'post', entityId: updated.id, entityLabel: updated.title });
    return updated;
  }

  async delete(id: string, actor: AuditActor): Promise<void> {
    const post = await repository.findById(id);
    if (!post) throw new HttpError(404, 'Post not found');
    await repository.delete(id);
    await this.invalidateAggregateKeys(post.slug);
    await this.regenerateAggregateCaches();
    await seoService.regeneratePublicIndexes();
    await auditLogService.record({ actor, action: 'delete', entity: 'post', entityId: post.id, entityLabel: post.title });
  }

  async publish(id: string, actor: AuditActor): Promise<PostWithMedia> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Post not found');
    await this.assertFeaturedLimit(existing.isFeatured, id);
    const updated = await repository.update(id, {
      status: PostStatus.published,
      publishedAt: new Date(),
      isFeatured: existing.isFeatured ?? false
    });
    await this.syncCacheOnWrite(updated);
    await auditLogService.record({ actor, action: 'publish', entity: 'post', entityId: updated.id, entityLabel: updated.title });
    return updated;
  }

  async unpublish(id: string, actor: AuditActor): Promise<PostWithMedia> {
    const existing = await repository.findById(id);
    if (!existing) throw new HttpError(404, 'Post not found');
    // Preservar isFeatured ao despublicar - não resetar para false
    const updated = await repository.update(id, {
      status: PostStatus.draft,
      publishedAt: null
    });
    await this.syncCacheOnWrite(updated);
    await auditLogService.record({ actor, action: 'unpublish', entity: 'post', entityId: updated.id, entityLabel: updated.title });
    return updated;
  }

  async incrementViews(id: string, viewerKey: string) {
    const existing = await repository.findPublishedById(id);
    if (!existing) throw new HttpError(404, 'Post not found');

    // Dedupe por (post, viewerKey) numa janela curta: sem isso, todo reload
    // do mesmo visitante conta como view nova E invalida o cache do post que
    // acabou de popular — na prática o cache "permanente" de post nunca
    // segurava sob tráfego normal.
    const dedupeKey = cacheKeys.postViewSeen(id, viewerKey);
    const alreadySeen = await cacheProvider.get<boolean>(dedupeKey);
    if (alreadySeen) return existing.views;
    await cacheProvider.set(dedupeKey, true, cacheTTL.viewDedupe);

    const updated = await repository.incrementViews(id);
    // Caminho de alta frequência (chamado a cada visualização pública nova):
    // só invalida, sem regenerar as listas agregadas na mesma request — a
    // próxima leitura repopula o cache normalmente.
    await this.invalidateAggregateKeys(existing.slug);
    return updated.views;
  }

  private async invalidateAggregateKeys(slug?: string) {
    const keys = [
      cacheKeys.postsFeatured,
      cacheKeys.postsMostViewed,
      cacheKeys.blogHome
    ];
    if (slug) keys.push(cacheKeys.post(slug));
    await Promise.all([
      cacheProvider.del(keys),
      // postsList é cacheado sob uma chave por combinação de page/limit/search
      // (ver listPaginated) — não existe uma entrada exata em cacheKeys.postsList
      // para deletar, por isso precisa de delete por prefixo.
      cacheProvider.delPrefix(`${cacheKeys.postsList}:`)
    ]);
  }

  private async regenerateAggregateCaches(): Promise<void> {
    await Promise.all([this.listFeatured(), this.listMostViewed(), this.getBlogHome()]);
  }

  // Usado pelos endpoints administrativos de escrita (create/update/publish/
  // unpublish): invalida o post e as listas agregadas e já as repopula na
  // mesma request, refletindo a mudança no público imediatamente (Fase 3 do
  // plano de template: docs/plano-template.md). Listas paginadas
  // (postsList) não são regeneradas proativamente — o espaço de combinações
  // de página/limite/busca é grande demais; ficam apenas invalidadas.
  private async syncCacheOnWrite(post: PostWithMedia, previousSlug?: string): Promise<void> {
    await this.invalidateAggregateKeys(previousSlug ?? post.slug);
    if (previousSlug && previousSlug !== post.slug) {
      await cacheProvider.del(cacheKeys.post(post.slug));
    }
    if (post.status === PostStatus.published) {
      await cacheProvider.set(cacheKeys.post(post.slug), post, cacheTTL.post);
    }
    await this.regenerateAggregateCaches();
    // Conjunto de posts publicados pode ter mudado — regenera sitemap.xml e
    // llms.txt na mesma request (Fase 4, docs/plano-template.md).
    await seoService.regeneratePublicIndexes();
  }

  private async assertFeaturedLimit(isFeatured: boolean, excludeId?: string) {
    if (!isFeatured) return;
    const count = await repository.countFeaturedPublished(excludeId);
    if (count >= 3) {
      throw new HttpError(
        400,
        'Você já possui 3 posts em destaque. Remova um destaque antes de adicionar outro.'
      );
    }
  }
}
