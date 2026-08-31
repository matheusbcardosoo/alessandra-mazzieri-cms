import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageVersionHistoryModal } from './PageVersionHistoryModal';
import * as usePagesModule from '@/hooks/queries/usePages';
import type { PageVersion } from '@/types';

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const versions: PageVersion[] = [
  {
    id: 'v2',
    pageId: 'p1',
    title: 'Sobre (mais recente)',
    layout: { version: 2, sections: [] },
    publishedAt: '2026-08-20T12:00:00.000Z',
    actorName: 'Ana',
    actorEmail: 'ana@example.com',
    missingMedia: []
  },
  {
    id: 'v1',
    pageId: 'p1',
    title: 'Sobre (mais antiga)',
    layout: { version: 2, sections: [] },
    publishedAt: '2026-08-01T12:00:00.000Z',
    actorName: 'Bruno',
    actorEmail: 'bruno@example.com',
    missingMedia: []
  }
];

describe('PageVersionHistoryModal', () => {
  it('lists each version with title and author', () => {
    vi.spyOn(usePagesModule, 'usePageVersions').mockReturnValue(
      { data: versions, isLoading: false } as unknown as ReturnType<typeof usePagesModule.usePageVersions>
    );
    vi.spyOn(usePagesModule, 'useRevertPageVersion').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof usePagesModule.useRevertPageVersion>
    );

    render(wrapper(<PageVersionHistoryModal isOpen pageId="p1" onClose={vi.fn()} onReverted={vi.fn()} />));

    expect(screen.getByText('Sobre (mais recente)')).toBeInTheDocument();
    expect(screen.getByText('Ana', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Sobre (mais antiga)')).toBeInTheDocument();
    expect(screen.getByText('Bruno', { exact: false })).toBeInTheDocument();
  });

  it('reverts to the chosen version after confirming, and notifies the caller', () => {
    vi.spyOn(usePagesModule, 'usePageVersions').mockReturnValue(
      { data: versions, isLoading: false } as unknown as ReturnType<typeof usePagesModule.usePageVersions>
    );
    const mutate = vi.fn((_vars, opts) => opts?.onSuccess?.({ id: 'p1', title: 'Sobre (mais antiga)' }));
    vi.spyOn(usePagesModule, 'useRevertPageVersion').mockReturnValue(
      { mutate, isPending: false } as unknown as ReturnType<typeof usePagesModule.useRevertPageVersion>
    );
    const onReverted = vi.fn();
    const onClose = vi.fn();

    render(wrapper(<PageVersionHistoryModal isOpen pageId="p1" onClose={onClose} onReverted={onReverted} />));

    const revertButtons = screen.getAllByRole('button', { name: 'Reverter' });
    fireEvent.click(revertButtons[1]); // versão mais antiga

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Reverter' }));

    expect(mutate).toHaveBeenCalledWith({ pageId: 'p1', versionId: 'v1' }, expect.any(Object));
    expect(onReverted).toHaveBeenCalledWith({ id: 'p1', title: 'Sobre (mais antiga)' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a warning for a version with missing media and reflects it in the confirm dialog', () => {
    const versionsWithMissing: PageVersion[] = [
      versions[0],
      { ...versions[1], missingMedia: [{ blockId: 'b1', mediaId: 'm1' }] }
    ];
    vi.spyOn(usePagesModule, 'usePageVersions').mockReturnValue(
      { data: versionsWithMissing, isLoading: false } as unknown as ReturnType<typeof usePagesModule.usePageVersions>
    );
    vi.spyOn(usePagesModule, 'useRevertPageVersion').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof usePagesModule.useRevertPageVersion>
    );

    render(wrapper(<PageVersionHistoryModal isOpen pageId="p1" onClose={vi.fn()} onReverted={vi.fn()} />));

    expect(screen.getByText('⚠ 1 imagem desta versão não existe mais')).toBeInTheDocument();

    const revertButtons = screen.getAllByRole('button', { name: 'Reverter' });
    fireEvent.click(revertButtons[1]); // versão mais antiga, a com missingMedia

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    expect(within(confirmDialog).getByText(/precisará ser reenviada depois de reverter/)).toBeInTheDocument();
  });

  it('shows a pluralized warning for a version with multiple missing media and reflects it in the confirm dialog', () => {
    const versionsWithMissing: PageVersion[] = [
      versions[0],
      {
        ...versions[1],
        missingMedia: [
          { blockId: 'b1', mediaId: 'm1' },
          { blockId: 'b2', mediaId: 'm2' }
        ]
      }
    ];
    vi.spyOn(usePagesModule, 'usePageVersions').mockReturnValue(
      { data: versionsWithMissing, isLoading: false } as unknown as ReturnType<typeof usePagesModule.usePageVersions>
    );
    vi.spyOn(usePagesModule, 'useRevertPageVersion').mockReturnValue(
      { mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof usePagesModule.useRevertPageVersion>
    );

    render(wrapper(<PageVersionHistoryModal isOpen pageId="p1" onClose={vi.fn()} onReverted={vi.fn()} />));

    expect(screen.getByText('⚠ 2 imagens desta versão não existem mais')).toBeInTheDocument();

    const revertButtons = screen.getAllByRole('button', { name: 'Reverter' });
    fireEvent.click(revertButtons[1]); // versão mais antiga, a com missingMedia

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    expect(
      within(confirmDialog).getByText(/2 imagens desta versão não existem mais e precisarão ser reenviadas depois de reverter/)
    ).toBeInTheDocument();
  });
});
