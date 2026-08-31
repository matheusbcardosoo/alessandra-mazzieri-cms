import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal, ConfirmModal } from '@/components/AdminUI';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import { PageBlockView } from '@/components/PageRenderer';
import { IconButton } from '@/components/AdminUI';
import { TextBlockForm } from '@/blocks/text/Form';
import { ImageBlockForm } from '@/blocks/image/Form';
import { ButtonBlockForm } from '@/blocks/button/Form';
import { CtaBlockForm } from '@/blocks/cta/Form';
import { MediaTextBlockForm } from '@/blocks/media-text/Form';
import { PillsBlockForm } from '@/blocks/pills/Form';
import { SpanBlockForm } from '@/blocks/span/Form';
import { ButtonGroupBlockForm } from '@/blocks/button-group/Form';
import { CardsBlockForm } from '@/blocks/cards/Form';
import { isHeroV1, isHeroV2 } from '@/utils/heroMigration';
import type {
  HeroBlockData,
  HeroBlockDataV1,
  HeroBlockDataV2,
  HeroCard,
  HeroMediaMode,
  CardBlockData,
  PageBlock,
  TextBlockData,
  ImageBlockData,
  ButtonBlockData,
  MediaTextBlockData,
  PillsBlockData,
  SpanBlockData,
  ButtonGroupBlockData,
  CtaBlockData
} from '@/types';
import type { BlockFormProps } from '../_shared/types';
import { LinkPicker, type LinkPickerValue } from '@/components/LinkPicker';

// ================= DEFAULT DATA =================

const defaultCardData: CardBlockData = {
  title: 'Nossos Serviços',
  subtitle: null,
  items: [
    { id: uuidv4(), icon: '⚡', iconType: 'emoji', title: 'Rápido', text: 'Resultados em tempo recorde', ctaLabel: null, ctaHref: null },
    { id: uuidv4(), icon: '🎯', iconType: 'emoji', title: 'Preciso', text: 'Qualidade garantida', ctaLabel: null, ctaHref: null },
    { id: uuidv4(), icon: '✨', iconType: 'emoji', title: 'Profissional', text: 'Atendimento especializado', ctaLabel: null, ctaHref: null }
  ],
  layout: 'auto',
  variant: 'feature'
};

const defaultHeroData: HeroBlockDataV1 = {
  heading: '[Título de impacto sobre o seu negócio]',
  subheading: '[Descreva em 1-2 frases o que você oferece e para quem]',
  ctaLabel: 'Agendar sessão',
  ctaHref: '/contato',
  ctaLinkMode: 'page' as const,
  ctaPageKey: 'contato',
  secondaryCta: 'Conhecer a abordagem',
  secondaryHref: '/sobre',
  secondaryLinkMode: 'page' as const,
  secondaryPageKey: 'sobre',
  badges: ['Diferencial 1', 'Diferencial 2', 'Diferencial 3'],
  mediaMode: 'four_cards' as const,
  singleImage: null,
  singleCard: {
    quote:
      'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.',
    author: 'Autor'
  },
  fourCards: {
    medium: {
      title:
        'Cada sessão é um espaço seguro para você compreender suas emoções, criar novas rotas e caminhar com leveza.',
      text: 'Texto',
      icon: null,
      imageId: null,
      url: null,
      alt: null
    },
    small: [
      { title: 'Equilíbrio emocional', text: 'Ferramentas práticas para o dia a dia.', icon: null, imageId: null, url: null, alt: null },
      { title: 'Relações saudáveis', text: 'Comunicação e limites claros.', icon: null, imageId: null, url: null, alt: null },
      { title: 'Autoconhecimento', text: 'Reconectar-se com quem você é.', icon: null, imageId: null, url: null, alt: null }
    ]
  }
};

const defaultTextData: TextBlockData = { contentHtml: '<p>Digite seu conteúdo</p>', width: 'normal', background: 'none' };
const defaultImageData: ImageBlockData = {
  mediaId: null,
  src: '',
  alt: '',
  caption: '',
  size: 100,
  align: 'center',
  naturalWidth: null,
  naturalHeight: null
};
const defaultButtonData: ButtonBlockData = { label: 'Chamada para ação', href: 'https://', newTab: true, variant: 'primary' };
const defaultCtaData: CtaBlockData = {
  title: 'Vamos conversar?',
  text: 'Entre em contato para caminharmos juntos.',
  ctaLabel: 'Descobrir como',
  ctaHref: '/contato',
  ctaLinkMode: 'page',
  ctaPageKey: 'contato',
  imageId: null,
  imageUrl: null,
  imageAlt: ''
};
const defaultMediaTextData: MediaTextBlockData = {
  contentHtml: '<p>Texto ao lado da imagem.</p>',
  imageId: null,
  imageUrl: '',
  imageAlt: '',
  imageSide: 'left',
  imageWidth: 50,
  imageHeight: 75
};
const defaultPillsData: PillsBlockData = {
  pills: [
    { text: 'ARTETERAPIA', href: null, linkMode: null, articleSlug: null },
    { text: 'ORIENTAÇÃO VOCACIONAL', href: null, linkMode: null, articleSlug: null },
    { text: 'CERÂMICA', href: null, linkMode: null, articleSlug: null }
  ],
  size: 'sm',
  variant: 'neutral'
};
const defaultSpanData: SpanBlockData = {
  kind: 'accent-bar'
};
const defaultButtonGroupData: ButtonGroupBlockData = {
  buttons: [
    { label: 'Botão primário', href: '', variant: 'primary', linkMode: 'manual' },
    { label: 'Botão secundário', href: '', variant: 'secondary', linkMode: 'manual' }
  ],
  align: 'start',
  stackOnMobile: true
};

// ================= TYPES FOR BLOCK DRAFT =================

type BlockDraft = {
  id?: string;
  type: PageBlock['type'];
  colSpan?: number;
  data: PageBlock['data'];
  createdAt?: string;
  updatedAt?: string;
};

const toBlockDraft = (block?: PageBlock): BlockDraft | null =>
  block
    ? {
        id: block.id,
        type: block.type,
        colSpan: block.colSpan ?? 1,
        data: block.data,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt
      }
    : null;

// ================= NESTED BLOCK EDITOR MODAL =================

type NestedBlockModalState = {
  open: boolean;
  mode: 'add' | 'edit';
  block?: PageBlock;
};

interface NestedBlockEditorModalProps {
  state: NestedBlockModalState | null;
  onClose: () => void;
  onSave: (draft: BlockDraft) => void;
  allowedTypes?: PageBlock['type'][];
}

function NestedBlockEditorModal({ state, onClose, onSave, allowedTypes }: NestedBlockEditorModalProps) {
  return (
    <Modal
      isOpen={!!state?.open}
      onClose={onClose}
      title={state?.mode === 'edit' ? 'Editar bloco' : 'Adicionar bloco'}
      description="Configure o conteúdo do bloco."
      width="80vw"
      maxHeight="80vh"
    >
      <NestedBlockEditorForm
        key={`${state?.block?.id ?? 'new'}:${state?.open ? 1 : 0}`}
        state={state}
        onClose={onClose}
        onSave={onSave}
        allowedTypes={allowedTypes}
      />
    </Modal>
  );
}

function NestedBlockEditorForm({ state, onClose, onSave, allowedTypes }: NestedBlockEditorModalProps) {
  const initialDraft = toBlockDraft(state?.block);
  const [draft, setDraft] = useState<BlockDraft | null>(initialDraft);
  const [selectedType, setSelectedType] = useState<PageBlock['type'] | null>(initialDraft?.type ?? null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectType = (type: PageBlock['type']) => {
    setSelectedType(type);
    if (!draft || draft.type !== type) {
      const defaults: BlockDraft['data'] =
        type === 'text' ? defaultTextData :
        type === 'image' ? defaultImageData :
        type === 'button' ? defaultButtonData :
        type === 'cta' ? defaultCtaData :
        type === 'media-text' ? defaultMediaTextData :
        type === 'cards' ? defaultCardData :
        type === 'pills' ? defaultPillsData :
        type === 'span' ? defaultSpanData :
        type === 'buttonGroup' ? defaultButtonGroupData :
        defaultTextData;
      setDraft({ type, data: defaults, colSpan: 1 });
    }
  };

  const handleSave = () => {
    if (!draft || !selectedType) {
      setError('Escolha um tipo de bloco.');
      return;
    }
    setError(null);
    onSave(draft);
  };

  const availableTypes = allowedTypes || ['text', 'image', 'button', 'cta', 'media-text', 'cards', 'pills', 'span', 'buttonGroup', 'social-links', 'whatsapp-cta'];

  return (
    <>
      {!selectedType && (
        <div className="block-type-grid">
          {availableTypes.includes('text') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('text')}>
              <strong>Texto</strong>
              <p className="muted small">Parágrafos, listas e títulos.</p>
            </button>
          )}
          {availableTypes.includes('image') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('image')}>
              <strong>Imagem</strong>
              <p className="muted small">Imagem ou foto.</p>
            </button>
          )}
          {availableTypes.includes('button') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('button')}>
              <strong>Botão</strong>
              <p className="muted small">Link com estilo.</p>
            </button>
          )}
          {availableTypes.includes('cta') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('cta')}>
              <strong>CTA</strong>
              <p className="muted small">Título, texto e botão com imagem.</p>
            </button>
          )}
          {availableTypes.includes('media-text') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('media-text')}>
              <strong>Imagem + Texto</strong>
              <p className="muted small">Imagem lateral com texto na lateral.</p>
            </button>
          )}
          {availableTypes.includes('cards') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('cards')}>
              <strong>Cards</strong>
              <p className="muted small">Grade de recursos.</p>
            </button>
          )}
          {availableTypes.includes('pills') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('pills')}>
              <strong>Pills</strong>
              <p className="muted small">Tags inline.</p>
            </button>
          )}
          {availableTypes.includes('span') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('span')}>
              <strong>Elemento</strong>
              <p className="muted small">Barra ou texto.</p>
            </button>
          )}
          {availableTypes.includes('buttonGroup') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('buttonGroup')}>
              <strong>Grupo de Botões</strong>
              <p className="muted small">Até 2 botões lado a lado.</p>
            </button>
          )}
          {availableTypes.includes('social-links') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('social-links')}>
              <strong>Redes Sociais</strong>
              <p className="muted small">Links para redes sociais configuradas.</p>
            </button>
          )}
          {availableTypes.includes('whatsapp-cta') && (
            <button type="button" className="block-type-card" onClick={() => handleSelectType('whatsapp-cta')}>
              <strong>WhatsApp</strong>
              <p className="muted small">Botão de contato via WhatsApp.</p>
            </button>
          )}
        </div>
      )}

      {selectedType === 'text' && draft && (
        <TextBlockForm
          value={draft.data as TextBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'text', data }))}
          onUploadingChange={() => {}}
        />
      )}

      {selectedType === 'image' && draft && (
        <ImageBlockForm
          value={draft.data as ImageBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'image', data }))}
          onUploadingChange={() => {}}
          context="hero"
        />
      )}

      {selectedType === 'button' && draft && (
        <ButtonBlockForm
          value={draft.data as ButtonBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'button', data }))}
        />
      )}

      {selectedType === 'cta' && draft && (
        <CtaBlockForm
          value={draft.data as CtaBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'cta', data }))}
        />
      )}

      {selectedType === 'media-text' && draft && (
        <MediaTextBlockForm
          value={draft.data as MediaTextBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'media-text', data }))}
          onUploadingChange={() => {}}
        />
      )}

      {selectedType === 'cards' && draft && (
        <CardsBlockForm
          value={draft.data as CardBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'cards', data }))}
        />
      )}

      {selectedType === 'pills' && draft && (
        <PillsBlockForm
          value={draft.data as PillsBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'pills', data }))}
        />
      )}

      {selectedType === 'span' && draft && (
        <SpanBlockForm
          value={draft.data as SpanBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'span', data }))}
        />
      )}

      {selectedType === 'buttonGroup' && draft && (
        <ButtonGroupBlockForm
          value={draft.data as ButtonGroupBlockData}
          onChange={(data) => setDraft((prev) => (prev ? { ...prev, data } : { type: 'buttonGroup', data }))}
        />
      )}

      {error && <div className="admin-empty" role="alert">{error}</div>}

      <div className="admin-modal-footer">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          {state?.mode === 'edit' ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </>
  );
}

// ================= BLOCK LIST EDITOR (NESTED BUILDER) =================

interface BlockListEditorProps {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
  allowedTypes?: PageBlock['type'][];
  emptyMessage?: string;
}

function BlockListEditor({ blocks, onChange, allowedTypes, emptyMessage = 'Nenhum bloco ainda. Clique em "Adicionar bloco" para começar.' }: BlockListEditorProps) {
  const [blockModal, setBlockModal] = useState<NestedBlockModalState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAddBlock = () => {
    setBlockModal({ open: true, mode: 'add' });
  };

  const handleEditBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      setBlockModal({ open: true, mode: 'edit', block });
    }
  };

  const handleSaveBlock = (draft: BlockDraft) => {
    if (blockModal?.mode === 'add') {
      const newBlock: PageBlock = {
        id: uuidv4(),
        type: draft.type,
        data: draft.data,
        colSpan: draft.colSpan ?? 1,
        rowIndex: blocks.length
      } as PageBlock;
      onChange([...blocks, newBlock]);
    } else if (blockModal?.mode === 'edit' && blockModal.block) {
      const updated = blocks.map((b) =>
        b.id === blockModal.block!.id
          ? { ...b, type: draft.type, data: draft.data, colSpan: draft.colSpan ?? 1 }
          : b
      ) as PageBlock[];
      onChange(updated);
    }
    setBlockModal(null);
  };

  const handleDeleteBlock = (blockId: string) => {
    setDeleteConfirm(blockId);
  };

  const handleDuplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      const duplicate: PageBlock = { ...block, id: uuidv4() } as PageBlock;
      const index = blocks.findIndex((b) => b.id === blockId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, duplicate);
      onChange(newBlocks);
    }
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {blocks.length === 0 && (
        <div className="admin-empty">
          <p className="muted">{emptyMessage}</p>
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={block.id} className="page-block-card admin-card">
          <div className="page-block-card-header">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {block.type === 'text' ? 'Texto' :
                 block.type === 'image' ? 'Imagem' :
                 block.type === 'button' ? 'Botão' :
                 block.type === 'cta' ? 'CTA' :
                 block.type === 'media-text' ? 'Imagem + Texto' :
                 block.type === 'pills' ? 'Pills' :
                 block.type === 'span' ? 'Elemento' :
                 block.type === 'buttonGroup' ? 'Grupo de Botões' :
                 block.type === 'social-links' ? 'Redes Sociais' :
                 block.type === 'whatsapp-cta' ? 'WhatsApp' :
                 block.type === 'cards' ? 'Cards' :
                 block.type === 'services' ? 'Serviços' : block.type}
              </p>
            </div>
            <div className="admin-actions" style={{ gap: '0.35rem' }}>
              <IconButton
                icon="arrow-up"
                label="Mover para cima"
                onClick={() => handleMoveBlock(block.id, 'up')}
                disabled={idx === 0}
              />
              <IconButton
                icon="arrow-down"
                label="Mover para baixo"
                onClick={() => handleMoveBlock(block.id, 'down')}
                disabled={idx === blocks.length - 1}
              />
              <IconButton icon="edit" label="Editar" tone="info" onClick={() => handleEditBlock(block.id)} />
              <IconButton icon="copy" label="Duplicar" onClick={() => handleDuplicateBlock(block.id)} />
              <IconButton icon="trash" label="Remover" tone="danger" onClick={() => handleDeleteBlock(block.id)} />
            </div>
          </div>
          <div className="page-block-card-body">
            <PageBlockView block={block} />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddBlock}
        className="btn btn-outline"
        style={{ marginTop: blocks.length > 0 ? '0.5rem' : 0 }}
      >
        + Adicionar bloco
      </button>

      <NestedBlockEditorModal
        state={blockModal}
        onClose={() => setBlockModal(null)}
        onSave={handleSaveBlock}
        allowedTypes={allowedTypes}
      />

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Remover bloco"
        description="Tem certeza que deseja remover este bloco?"
        onConfirm={() => {
          if (deleteConfirm) {
            onChange(blocks.filter((b) => b.id !== deleteConfirm));
            setDeleteConfirm(null);
          }
        }}
        confirmLabel="Remover"
      />
    </div>
  );
}

// ================= HERO V2 EDITOR =================

interface HeroV2EditorProps {
  value: HeroBlockDataV2;
  onChange: (value: HeroBlockDataV2) => void;
}

function HeroV2Editor({ value, onChange }: HeroV2EditorProps) {
  const layoutVariant = value.layoutVariant ?? 'split';

  const handleLayoutChange = (variant: 'split' | 'stacked') => {
    if (variant === layoutVariant) return;
    let nextRight = [...value.right];
    let nextRightVariant = value.rightVariant;

    if (variant === 'stacked') {
      const existingImage = nextRight.find((b) => b.type === 'image');
      nextRight = existingImage ? [existingImage] : [];
      nextRightVariant = 'image-only';
    }

    onChange({ ...value, layoutVariant: variant, rightVariant: nextRightVariant, right: nextRight });
  };

  const handleVariantChange = (variant: 'image-only' | 'cards-only' | 'cards-with-image') => {
    let newRight = [...value.right];

    // Normalizar estrutura conforme variante
    if (variant === 'image-only') {
      // Manter apenas 1 imagem (primeira image encontrada ou criar nova)
      const existingImage = newRight.find((b) => b.type === 'image');
      newRight = existingImage ? [existingImage] : [];
    } else if (variant === 'cards-only') {
      // 4 cards
      const existingCards = newRight.filter((b) => b.type === 'cards') as Array<PageBlock & { type: 'cards'; data: CardBlockData }>;
      while (existingCards.length < 4) {
        const newCard = {
          id: uuidv4(),
          type: 'cards' as const,
          data: defaultCardData,
          colSpan: 1
        };
        existingCards.push(newCard);
      }
      newRight = existingCards.slice(0, 4);
    } else {
      // cards-with-image: 1 imagem + 4 cards
      const existingImage = newRight.find((b) => b.type === 'image');
      const existingCards = newRight.filter((b) => b.type === 'cards') as Array<PageBlock & { type: 'cards'; data: CardBlockData }>;
      while (existingCards.length < 4) {
        const newCard = {
          id: uuidv4(),
          type: 'cards' as const,
          data: defaultCardData,
          colSpan: 1
        };
        existingCards.push(newCard);
      }
      newRight = existingImage
        ? [existingImage, ...existingCards.slice(0, 4)]
        : [...existingCards.slice(0, 4)];
    }

    onChange({ ...value, rightVariant: variant, right: newRight });
  };

  const allowedLeftTypes: PageBlock['type'][] = ['text', 'pills', 'span', 'buttonGroup'];
  const allowedRightTypes: PageBlock['type'][] =
    layoutVariant === 'stacked'
      ? ['image']
      : value.rightVariant === 'image-only'
        ? ['image']
        : value.rightVariant === 'cards-only'
          ? ['cards']
          : ['image', 'cards'];

  return (
    <div className="page-block-form">
      <div className="editor-field-row">
        <div className="editor-field">
          <label>Layout</label>
          <div className="page-columns-toggle">
            <button
              type="button"
              className={layoutVariant === 'split' ? 'active' : ''}
              onClick={() => handleLayoutChange('split')}
            >
              Imagem ao lado
            </button>
            <button
              type="button"
              className={layoutVariant === 'stacked' ? 'active' : ''}
              onClick={() => handleLayoutChange('stacked')}
            >
              Imagem em cima
            </button>
          </div>
        </div>

        {layoutVariant === 'split' && (
          <div className="editor-field">
            <label>Variante da coluna direita</label>
            <div className="page-columns-toggle">
              <button
                type="button"
                className={value.rightVariant === 'image-only' ? 'active' : ''}
                onClick={() => handleVariantChange('image-only')}
              >
                Somente imagem
              </button>
              <button
                type="button"
                className={value.rightVariant === 'cards-only' ? 'active' : ''}
                onClick={() => handleVariantChange('cards-only')}
              >
                Cards (1 grande + 3 pequenos)
              </button>
              <button
                type="button"
                className={value.rightVariant === 'cards-with-image' ? 'active' : ''}
                onClick={() => handleVariantChange('cards-with-image')}
              >
                Cards com imagem
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
            Coluna Esquerda
          </h4>
          <small className="muted" style={{ display: 'block', marginBottom: '1rem' }}>
            Blocos permitidos: Texto, Pills, Elemento, Grupo de Botões
          </small>
          <BlockListEditor
            blocks={value.left}
            onChange={(left) => onChange({ ...value, left })}
            allowedTypes={allowedLeftTypes}
            emptyMessage="Adicione blocos de texto, pills, etc."
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
            Coluna Direita
          </h4>
          <small className="muted" style={{ display: 'block', marginBottom: '1rem' }}>
            {layoutVariant === 'stacked' && 'Apenas 1 imagem (full-width)'}
            {layoutVariant === 'split' && value.rightVariant === 'image-only' && 'Apenas 1 imagem permitida'}
            {layoutVariant === 'split' && value.rightVariant === 'cards-only' && 'Exatamente 4 cards'}
            {layoutVariant === 'split' && value.rightVariant === 'cards-with-image' && '1 imagem + at?? 4 cards'}
          </small>
          <BlockListEditor
            blocks={value.right}
            onChange={(right) => onChange({ ...value, right })}
            allowedTypes={allowedRightTypes}
            emptyMessage={layoutVariant === 'stacked' ? 'Adicione a imagem do hero.' : 'Adicione imagem ou cards conforme variante.'}
          />
        </div>
      </div>
    </div>
  );
}

// ================= HERO BLOCK FORM =================

export function HeroBlockForm({ value, onChange, onUploadingChange: _onUploadingChange }: BlockFormProps<HeroBlockData>) {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageTarget, setImageTarget] = useState<{ type: 'singleImage' | 'medium' | 'small'; index?: number } | null>(null);

  // Tratar Hero V2 (bloco composto)
  if (isHeroV2(value)) {
    return (
      <HeroV2Editor
        value={value}
        onChange={onChange}
      />
    );
  }

  // Hero V1 (editor legado) - garantir type safety
  if (!isHeroV1(value)) {
    return (
      <div className="page-block-form">
        <p className="muted">Formato de Hero desconhecido. Por favor, recrie o bloco.</p>
      </div>
    );
  }

  // A partir daqui, value é garantidamente HeroBlockDataV1
  const valueV1 = value;
  const badges = Array.isArray(valueV1.badges) ? valueV1.badges : [];
  const mediaMode: HeroMediaMode = (valueV1.mediaMode as HeroMediaMode) ?? 'four_cards';
  const fourCards = valueV1.fourCards ?? defaultHeroData.fourCards!;

  const updateBadge = (index: number, text: string) => {
    const next = [...badges];
    next[index] = text;
    onChange({ ...valueV1, badges: next });
  };

  const removeBadge = (index: number) => {
    const next = badges.filter((_: string, i: number) => i !== index);
    onChange({ ...valueV1, badges: next });
  };

  const addBadge = () => {
    onChange({ ...value, badges: [...badges, 'Nova badge'] });
  };

  const ensureSmall = (): HeroCard[] => {
    const base = fourCards.small ?? defaultHeroData.fourCards!.small;
    return Array.from({ length: 3 }).map((_, i) => base?.[i] ?? defaultHeroData.fourCards!.small[i]);
  };

  const handleSelectImage = (image: { mediaId: string; src: string; alt: string; avifSrc?: string | null }) => {
    if (!imageTarget) return;
    if (imageTarget.type === 'singleImage') {
      onChange({
        ...value,
        singleImage: { imageId: image.mediaId, url: image.src, avifSrc: image.avifSrc ?? null, alt: image.alt }
      });
    } else if (imageTarget.type === 'medium') {
      onChange({
        ...value,
        fourCards: {
          ...fourCards,
          medium: { ...fourCards.medium, imageId: image.mediaId, url: image.src, avifSrc: image.avifSrc ?? null, alt: image.alt }
        }
      });
    } else if (imageTarget.type === 'small') {
      const next = ensureSmall();
      if (imageTarget.index !== undefined) {
        next[imageTarget.index] = {
          ...next[imageTarget.index],
          imageId: image.mediaId,
          url: image.src,
          avifSrc: image.avifSrc ?? null,
          alt: image.alt
        };
      }
      onChange({
        ...value,
        fourCards: {
          ...fourCards,
          small: next
        }
      });
    }
    setImagePickerOpen(false);
    setImageTarget(null);
  };

  const renderSingleImage = () => (
    <div className="editor-field">
      <label>Imagem de capa</label>
      {value.singleImage?.url ? (
        <div className="image-selected-preview">
          <img src={value.singleImage.url} alt={value.singleImage.alt ?? ''} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={value.singleImage.alt ?? ''}
              onChange={(e) => onChange({ ...value, singleImage: { ...(value.singleImage ?? {}), alt: e.target.value } })}
              placeholder="Texto alternativo"
            />
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setImagePickerOpen(true);
                setImageTarget({ type: 'singleImage' });
              }}
            >
              Trocar imagem
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => onChange({ ...value, singleImage: null })}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            setImageTarget({ type: 'singleImage' });
            setImagePickerOpen(true);
          }}
        >
          Selecionar imagem
        </button>
      )}
    </div>
  );

  const renderCardEditor = (card: HeroCard, onUpdate: (next: HeroCard) => void, label: string, allowImages = true) => (
    <div className="admin-card" style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
      <strong>{label}</strong>
      <input
        className="form-control"
        value={card.title}
        onChange={(e) => onUpdate({ ...card, title: e.target.value })}
        placeholder="Título"
      />
      <textarea
        className="form-control"
        rows={2}
        value={card.text}
        onChange={(e) => onUpdate({ ...card, text: e.target.value })}
        placeholder="Texto"
      />
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-control"
          style={{ flex: 1, minWidth: '140px' }}
          value={card.icon ?? ''}
          onChange={(e) => onUpdate({ ...card, icon: e.target.value })}
          placeholder="Emoji/ícone (opcional)"
        />
        {allowImages && (
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setImageTarget({ type: label === 'Card médio' ? 'medium' : 'small', index: label.startsWith('Pequeno') ? Number(label.slice(-1)) - 1 : undefined });
                setImagePickerOpen(true);
              }}
            >
              {card.url ? 'Trocar imagem' : 'Adicionar imagem'}
            </button>
            {card.url && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onUpdate({ ...card, url: null, imageId: null, avifSrc: null, alt: null })}>
                Remover imagem
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderFourCards = () => {
    const smallCards = ensureSmall();
    return (
      <div className="editor-field" style={{ display: 'grid', gap: '0.75rem' }}>
        <label>Grid de 4 cards</label>
        {renderCardEditor(
          fourCards.medium,
          (next) => onChange({ ...value, fourCards: { ...fourCards, medium: next } }),
          'Card médio',
          mediaMode === 'four_cards'
        )}
        {smallCards.map((card, idx) =>
          renderCardEditor(
            card,
            (next) => {
              const list = ensureSmall();
              list[idx] = next;
              onChange({ ...value, fourCards: { ...fourCards, small: list } });
            },
            `Pequeno ${idx + 1}`,
            mediaMode === 'four_cards'
          )
        )}
      </div>
    );
  };

  const linkValueFrom = (
    href?: string | null,
    mode?: 'page' | 'manual' | null,
    pageKey?: string | null,
    pageId?: string | null,
    slug?: string | null
  ): LinkPickerValue => ({
    mode: (mode as 'page' | 'manual') ?? 'manual',
    href: href ?? '',
    pageKey: pageKey ?? null,
    pageId: pageId ?? null,
    slug: slug ?? null
  });

  const handleModeChange = (mode: HeroMediaMode) => {
    const next: HeroBlockData = { ...value, mediaMode: mode };
    if ((mode === 'four_cards' || mode === 'cards_only') && !value.fourCards) {
      next.fourCards = defaultHeroData.fourCards;
    }
    if (mode === 'single_image' && value.singleImage === undefined) {
      next.singleImage = null;
    }
    onChange(next);
  };

  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field">
          <label>Título Principal</label>
          <input
            type="text"
            className="form-control"
            value={value.heading ?? ''}
            onChange={(e) => onChange({ ...value, heading: e.target.value })}
            placeholder="[Título de impacto sobre o seu negócio]"
          />
        </div>

        <div className="editor-field">
          <label>Subtítulo</label>
          <textarea
            className="form-control"
            value={value.subheading ?? ''}
            onChange={(e) => onChange({ ...value, subheading: e.target.value })}
            rows={2}
            placeholder="Caminhadas terapêuticas..."
          />
        </div>

        <div className="editor-field">
          <label>Badges</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {badges.map((badge, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  value={badge}
                  onChange={(e) => updateBadge(index, e.target.value)}
                  placeholder="Badge"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => removeBadge(index)}
                  style={{ flexShrink: 0 }}
                >
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={addBadge}>
              + Adicionar Badge
            </button>
          </div>
        </div>

        <div className="editor-field">
          <label>Texto do Botão Principal</label>
          <input
            type="text"
            className="form-control"
            value={value.ctaLabel ?? ''}
            onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
            placeholder="Agendar sessão"
          />
        </div>

        <div className="editor-field">
          <LinkPicker
            label="Link do Botão Principal"
            value={linkValueFrom(value.ctaHref, value.ctaLinkMode, value.ctaPageKey, value.ctaPageId, value.ctaSlug)}
            onChange={(val) =>
              onChange({
                ...value,
                ctaHref: val.href,
                ctaLinkMode: val.mode,
                ctaPageKey: val.pageKey ?? null,
                ctaPageId: val.pageId ?? null,
                ctaSlug: val.slug ?? null
              })
            }
          />
        </div>

        <div className="editor-field">
          <label>Texto do Botão Secundário</label>
          <input
            type="text"
            className="form-control"
            value={value.secondaryCta ?? ''}
            onChange={(e) => onChange({ ...value, secondaryCta: e.target.value })}
            placeholder="Conhecer a abordagem"
          />
        </div>

        <div className="editor-field">
          <LinkPicker
            label="Link do Botão Secundário"
            value={linkValueFrom(
              value.secondaryHref,
              value.secondaryLinkMode,
              value.secondaryPageKey,
              value.secondaryPageId,
              value.secondarySlug
            )}
            onChange={(val) =>
              onChange({
                ...value,
                secondaryHref: val.href,
                secondaryLinkMode: val.mode,
                secondaryPageKey: val.pageKey ?? null,
                secondaryPageId: val.pageId ?? null,
                secondarySlug: val.slug ?? null
              })
            }
          />
        </div>
      </div>

      <div className="editor-field">
        <label>Conteúdo da coluna direita</label>
          <div className="page-columns-toggle compact">
            {[
              { value: 'single_image', label: 'Somente imagem' },
              { value: 'cards_only', label: 'Cards (1 grande + 3 pequenos)' },
              { value: 'four_cards', label: 'Cards com imagens (1 médio + 3 pequenos)' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
              className={mediaMode === opt.value ? 'active' : ''}
              onClick={() => handleModeChange(opt.value as HeroMediaMode)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {mediaMode === 'single_image' && renderSingleImage()}
      {(mediaMode === 'cards_only' || mediaMode === 'four_cards') && renderFourCards()}

      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(img) => handleSelectImage({ mediaId: img.mediaId, src: img.src, alt: img.alt, avifSrc: img.avifSrc })}
        currentMediaId={
          imageTarget?.type === 'singleImage'
            ? value.singleImage?.imageId ?? undefined
            : imageTarget?.type === 'medium'
              ? fourCards.medium.imageId ?? undefined
              : imageTarget?.type === 'small' && imageTarget.index !== undefined
                ? ensureSmall()[imageTarget.index].imageId ?? undefined
                : undefined
        }
      />
    </div>
  );
}
