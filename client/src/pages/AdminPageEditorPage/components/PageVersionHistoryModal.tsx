import { useState } from 'react';
import { Modal, ConfirmModal } from '@/components/AdminUI';
import { usePageVersions, useRevertPageVersion } from '@/hooks/queries/usePages';
import type { MissingMediaRef, Page } from '@/types';

type PageVersionHistoryModalProps = {
  isOpen: boolean;
  pageId: string | undefined;
  onClose: () => void;
  onReverted: (page: Page) => void;
};

const formatPublishedAt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Conta imagens únicas (por mediaId) ao invés de referências: a mesma imagem
// pode ter sido usada em vários blocos da mesma versão, e nesse caso o aviso
// deve contar "1 imagem", não uma vez por bloco que a referencia.
function missingMediaCount(missingMedia?: MissingMediaRef[]): number {
  if (!missingMedia?.length) return 0;
  return new Set(missingMedia.map((m) => m.mediaId)).size;
}

function missingMediaWarning(count: number): string {
  if (count === 1) return '⚠ 1 imagem desta versão não existe mais';
  return `⚠ ${count} imagens desta versão não existem mais`;
}

function confirmDescriptionFor(missingCount: number): string {
  const base = 'O conteúdo atual será substituído por esta versão e ela será publicada imediatamente.';
  if (missingCount === 0) return base;
  const plural = missingCount > 1;
  return `${base} Atenção: ${missingCount} ${plural ? 'imagens' : 'imagem'} desta versão não existe${plural ? 'm' : ''} mais e precisar${plural ? 'ão' : 'á'} ser reenviada${plural ? 's' : ''} depois de reverter.`;
}

export function PageVersionHistoryModal({ isOpen, pageId, onClose, onReverted }: PageVersionHistoryModalProps) {
  const { data: versions, isLoading } = usePageVersions(pageId, isOpen);
  const revertMutation = useRevertPageVersion();
  const [confirmVersionId, setConfirmVersionId] = useState<string | null>(null);

  const confirmVersion = versions?.find((v) => v.id === confirmVersionId);
  const confirmDescription = confirmDescriptionFor(missingMediaCount(confirmVersion?.missingMedia));

  const handleConfirmRevert = () => {
    if (!pageId || !confirmVersionId) return;
    revertMutation.mutate(
      { pageId, versionId: confirmVersionId },
      {
        onSuccess: (page) => {
          setConfirmVersionId(null);
          onReverted(page);
          onClose();
        }
      }
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} title="Histórico de versões" description="Últimas publicações desta página" onClose={onClose} width={560}>
        {isLoading && <p className="muted">Carregando histórico...</p>}
        {!isLoading && (!versions || versions.length === 0) && (
          <p className="muted">Nenhuma versão publicada ainda.</p>
        )}
        {!isLoading && versions && versions.length > 0 && (
          <ul className="page-version-history-list">
            {versions.map((version) => (
              <li key={version.id} className="page-version-history-item">
                <div>
                  <strong>{version.title}</strong>
                  <div className="muted">
                    {formatPublishedAt(version.publishedAt)} · {version.actorName}
                  </div>
                  {missingMediaCount(version.missingMedia) > 0 && (
                    <div className="page-version-history-warning">
                      {missingMediaWarning(missingMediaCount(version.missingMedia))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setConfirmVersionId(version.id)}
                >
                  Reverter
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmVersionId}
        title="Reverter para esta versão?"
        description={confirmDescription}
        confirmLabel="Reverter"
        onClose={() => setConfirmVersionId(null)}
        onConfirm={handleConfirmRevert}
        loading={revertMutation.isPending}
      />
    </>
  );
}
