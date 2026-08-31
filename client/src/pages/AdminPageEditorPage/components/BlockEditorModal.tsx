import React, { useEffect, useState, type ComponentProps } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faCircleDot,
  faFileLines,
  faGrip,
  faIdCard,
  faImage,
  faLayerGroup,
  faLink,
  faList,
  faNewspaper,
  faRectangleList,
  faShareNodes,
  faSquare,
  faTableCellsLarge,
  faWandMagicSparkles
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { Modal } from '@/components/AdminUI';
import { blockRegistry } from '@/blocks/registry';
import { validateBlockDraft } from '@/utils/validateBlockDraft';
import type {
  PageBlock,
  BlockType
} from '@/types';
import type { BlockDraft, BlockModalState } from '../hooks/useBlockManager';

const blockTypeIcons: Partial<Record<BlockType, ComponentProps<typeof FontAwesomeIcon>['icon']>> = {
  text: faFileLines,
  image: faImage,
  button: faCircleDot,
  span: faSquare,
  pills: faList,
  buttonGroup: faLink,
  cta: faBullhorn,
  'media-text': faTableCellsLarge,
  cards: faLayerGroup,
  form: faRectangleList,
  hero: faWandMagicSparkles,
  'recent-posts': faNewspaper,
  'social-links': faShareNodes,
  'whatsapp-cta': faWhatsapp,
  'contact-info': faIdCard,
  services: faGrip
};

const toBlockDraft = (block?: PageBlock): BlockDraft | null =>
  block
    ? {
        id: block.id,
        type: block.type,
        colSpan: block.colSpan ?? 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: block.data as any,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt
      }
    : null;

export function BlockEditorModal(_props: {
  state: BlockModalState | null;
  onClose: () => void;
  onSave: (draft: BlockDraft) => void;
  onUploadingChange?: (uploading: boolean) => void;
  columnCount?: number;
}) {
  const { state, onClose, onSave, onUploadingChange, columnCount = 2 } = _props;
  return (
    <Modal
      isOpen={!!state?.open}
      onClose={onClose}
      title={state?.mode === 'edit' ? 'Editar bloco' : 'Adicionar bloco'}
      description="Selecione o tipo e configure o conteúdo."
      width="80vw"
      maxHeight="80vh"
    >
      <BlockEditorModalContent
        key={`${state?.block?.id ?? 'new'}:${state?.open ? 1 : 0}`}
        state={state}
        onClose={onClose}
        onSave={onSave}
        onUploadingChange={onUploadingChange}
        columnCount={columnCount}
      />
    </Modal>
  );
}

function BlockEditorModalContent({
  state,
  onClose,
  onSave,
  onUploadingChange,
  columnCount
}: {
  state: BlockModalState | null;
  onClose: () => void;
  onSave: (draft: BlockDraft) => void;
  onUploadingChange?: (uploading: boolean) => void;
  columnCount: number;
}) {
  const initialDraft = toBlockDraft(state?.block);
  const [draft, setDraft] = useState<BlockDraft | null>(initialDraft);
  const [selectedType, setSelectedType] = useState<PageBlock['type'] | null>(initialDraft?.type ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const handleSelectType = (type: PageBlock['type']) => {
    setSelectedType(type);
    if (!draft || draft.type !== type) {
      const config = blockRegistry[type as BlockType];
      const defaults = config?.defaultData ?? {};
      const span =
        type === 'hero' || type === 'recent-posts' || type === 'services'
          ? columnCount
          : Math.min(columnCount, 1);
      setDraft({ type, data: defaults as PageBlock['data'], colSpan: span });
    }
  };

  const handleSave = () => {
    const validationError = validateBlockDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const clampedDraft = {
      ...draft!,
      colSpan: Math.max(1, Math.min(draft!.colSpan ?? 1, columnCount))
    };
    onSave(clampedDraft);
  };

  return (
    <>
      {!selectedType && (() => {
        const blockCategories: Array<{ category: string; blocks: Array<{ type: BlockType; description: string }> }> = [
          {
            category: 'Conteúdo',
            blocks: [
              { type: 'text', description: 'Parágrafos, listas e títulos.' },
              { type: 'image', description: 'Selecione da biblioteca ou envie nova.' },
              { type: 'cards', description: 'Grade de recursos ou serviços.' },
              { type: 'pills', description: 'Tags ou badges inline.' },
              { type: 'span', description: 'Barra de destaque ou texto discreto.' },
              { type: 'buttonGroup', description: 'Até 2 botões lado a lado.' }
            ]
          },
          {
            category: 'Layout / Destaque',
            blocks: [
              { type: 'hero', description: 'Imagem de fundo com conteúdo sobreposto.' },
              { type: 'media-text', description: 'Imagem lateral com texto na lateral.' }
            ]
          },
          {
            category: 'Interação',
            blocks: [
              { type: 'form', description: 'Captura de leads e contato.' },
              { type: 'whatsapp-cta', description: 'Botão de contato via WhatsApp.' },
              { type: 'contact-info', description: 'Bloco unificado com título, WhatsApp e redes sociais.' },
              { type: 'social-links', description: 'Links para redes sociais configuradas.' }
            ]
          },
          {
            category: 'Dinâmico',
            blocks: [
              { type: 'recent-posts', description: 'Lista automática de artigos.' },
              { type: 'services', description: 'Seção com ícones fixos e CTA.' }
            ]
          }
        ];

        const q = query.trim();
        const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const filtered = blockCategories
          .map((cat) => ({
            category: cat.category,
            blocks: cat.blocks.filter((item) => {
              if (!q) return true;
              const lbl = blockRegistry[item.type]?.label ?? item.type;
              return norm(lbl).includes(norm(q)) || norm(item.description).includes(norm(q));
            })
          }))
          .filter((cat) => cat.blocks.length > 0);

        return (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <input
              type="search"
              className="block-search-input"
              placeholder="Buscar bloco..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {filtered.length === 0 && (
              <p className="muted">Nenhum bloco encontrado para “{q}”.</p>
            )}
            {filtered.map((cat) => (
              <section key={cat.category}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#4b5563' }}>
                  {cat.category}
                </h4>
                <div className="block-type-grid">
                  {cat.blocks.map((item) => {
                    const config = blockRegistry[item.type];
                    const icon = blockTypeIcons[item.type];
                    return (
                      <button
                        key={item.type}
                        type="button"
                        className="block-type-card"
                        onClick={() => handleSelectType(item.type)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '1rem' }}
                      >
                        {icon && (
                          <div className="block-type-card-icon" aria-hidden="true">
                            <FontAwesomeIcon icon={icon} />
                          </div>
                        )}
                        <strong>{config?.label || item.type}</strong>
                        <p className="muted small" style={{ margin: 0 }}>{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        );
      })()}

      {selectedType && selectedType !== 'hero' && selectedType !== 'recent-posts' && selectedType !== 'services' && selectedType !== 'contact-info' && selectedType !== 'form' && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="page-columns-toggle compact">
            {Array.from({ length: columnCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={(draft?.colSpan ?? 1) === idx + 1 ? 'active' : ''}
                onClick={() => setDraft((d) => (d ? { ...d, colSpan: idx + 1 } : d))}
              >
                {idx + 1} col{idx + 1 > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <small className="muted">Define quantas colunas este bloco ocupa dentro da seção.</small>
        </div>
      )}

      {draft && (() => {
        const config = blockRegistry[selectedType as BlockType];
        if (!config) return null;
        const Form = config.form as React.ComponentType<{
          value: unknown;
          onChange: (value: unknown) => void;
          onUploadingChange?: (uploading: boolean) => void;
        }>;
        return (
          <Form
            value={draft.data}
            onChange={(data) => setDraft((prev) => (prev ? { ...prev, data: data as PageBlock['data'] } : prev))}
            onUploadingChange={setUploading}
          />
        );
      })()}

      {error && <div className="admin-empty" role="alert">{error}</div>}

      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={uploading}>
          {state?.mode === 'edit' ? 'Salvar alterações' : 'Adicionar bloco'}
        </button>
      </div>
    </>
  );
}
