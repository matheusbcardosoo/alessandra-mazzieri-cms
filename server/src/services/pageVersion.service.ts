import { PageVersion, Prisma } from '@prisma/client';
import { env } from '../config/env';
import { HttpError } from '../utils/errors';
import { PageVersionRepository } from '../repositories/pageVersion.repository';
import { AuditActor } from './auditLog.service';
import { findMissingMedia, type MediaRef } from './mediaReferences.service';
import type { PageLayoutV2 } from '../utils/pageLayout';

const repository = new PageVersionRepository();

export type SnapshotSource = {
  id: string;
  title: string;
  description: string | null;
  layout: unknown;
};

export class PageVersionService {
  // Cria uma entrada de histórico com o conteúdo publicado. Ignorada quando
  // é idêntica à última versão salva, para não encher o histórico com saves
  // sem mudança real de conteúdo (ex.: a home publica a cada "Salvar").
  async snapshot(page: SnapshotSource, actor: AuditActor): Promise<void> {
    const latest = await repository.findLatest(page.id);
    const isUnchanged =
      latest &&
      latest.title === page.title &&
      latest.description === page.description &&
      JSON.stringify(latest.layout) === JSON.stringify(page.layout);
    if (isUnchanged) return;

    await repository.create({
      pageId: page.id,
      title: page.title,
      description: page.description,
      layout: page.layout as Prisma.InputJsonValue,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email
    });
    await repository.trim(page.id, env.PAGE_VERSION_HISTORY_LIMIT);
  }

  async list(pageId: string): Promise<(PageVersion & { missingMedia: MediaRef[] })[]> {
    const versions = await repository.listByPage(pageId);
    return Promise.all(
      versions.map(async (version) => ({
        ...version,
        missingMedia: await findMissingMedia(version.layout as unknown as PageLayoutV2)
      }))
    );
  }

  async getForRevert(pageId: string, versionId: string): Promise<PageVersion> {
    const version = await repository.findById(versionId);
    if (!version || version.pageId !== pageId) {
      throw new HttpError(404, 'Versão não encontrada');
    }
    return version;
  }
}

export const pageVersionService = new PageVersionService();
