import { Page, PageStatus, Prisma } from '@prisma/client';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { HttpError } from '../utils/errors';
import { PageRepository } from '../repositories/page.repository';
import { defaultBlogLayout, normalizeBlogLayout, type BlogSection } from '../utils/blogLayout';

const repository = new PageRepository();

export type BlogAdminConfig = {
  id: string;
  title: string;
  description: string;
  sections: BlogSection[];
};

export type BlogPublicConfig = Omit<BlogAdminConfig, 'id'>;

export class BlogService {
  private async upsertBlog(): Promise<Page> {
    const existing = await repository.findBySlugOrKey('blog');

    if (!existing) {
      const created = await repository.create({
        slug: 'blog',
        pageKey: 'blog',
        title: 'Jornadas e reflexões',
        description: 'Leituras rápidas, aplicáveis e cuidadosas.',
        layout: defaultBlogLayout() as Prisma.InputJsonValue,
        status: PageStatus.published,
        publishedAt: new Date()
      });
      await this.syncCache(created);
      return created;
    }

    const needsUpdate =
      existing.slug !== 'blog' ||
      existing.pageKey !== 'blog' ||
      existing.status !== PageStatus.published ||
      !existing.publishedAt;

    if (!needsUpdate) return existing;

    const updated = await repository.update(existing.id, {
      slug: 'blog',
      pageKey: 'blog',
      status: PageStatus.published,
      publishedAt: existing.publishedAt ?? new Date()
    });
    await this.syncCache(updated);
    return updated;
  }

  async ensureBlog(): Promise<Page> {
    return this.upsertBlog();
  }

  private toPublicConfig(page: Page): BlogPublicConfig {
    const layout = normalizeBlogLayout(page.layout);
    return {
      title: page.title,
      description: page.description ?? '',
      sections: layout.sections
    };
  }

  private toAdminConfig(page: Page): BlogAdminConfig {
    return { id: page.id, ...this.toPublicConfig(page) };
  }

  async getAdmin(): Promise<BlogAdminConfig> {
    const page = await this.ensureBlog();
    return this.toAdminConfig(page);
  }

  async getPublic(): Promise<BlogPublicConfig> {
    return cacheProvider.wrap(cacheKeys.blog, cacheTTL.blog, async () => {
      const page = await this.ensureBlog();
      return this.toPublicConfig(page);
    });
  }

  async updateBlog(
    id: string,
    payload: { title?: string; description?: string | null; sections?: unknown }
  ): Promise<BlogAdminConfig> {
    const existing = await repository.findById(id);
    if (!existing || (existing.pageKey !== 'blog' && existing.slug !== 'blog')) {
      throw new HttpError(404, 'Blog não encontrado');
    }

    const currentLayout = normalizeBlogLayout(existing.layout);
    const nextLayout = normalizeBlogLayout({
      version: 1,
      sections: payload.sections ?? currentLayout.sections
    });

    const updated = await repository.update(id, {
      slug: 'blog',
      pageKey: 'blog',
      title: payload.title?.trim() || existing.title || 'Jornadas e reflexões',
      description: payload.description === undefined ? (existing.description ?? null) : (payload.description ?? null),
      layout: nextLayout as Prisma.InputJsonValue,
      status: PageStatus.published,
      publishedAt: existing.publishedAt ?? new Date()
    });
    await this.syncCache(updated);
    return this.toAdminConfig(updated);
  }

  private async syncCache(page: Page): Promise<void> {
    await cacheProvider.set(cacheKeys.blog, this.toPublicConfig(page), cacheTTL.blog);
  }
}
