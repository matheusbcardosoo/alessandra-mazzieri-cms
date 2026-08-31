import React from 'react';
import { blockRegistry } from '@/blocks/registry';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BackgroundPicker } from '@/components/StyleControls';
import type { BlockType, PageBlock } from '@/types';
import type { BackgroundConfig } from '@/utils/backgroundHelpers';

// Blocos que sempre ocupam a largura total da seção — sem controle de colunas.
const FULL_WIDTH_TYPES: ReadonlySet<string> = new Set(['hero', 'recent-posts', 'services', 'contact-info']);

// Blocos que nunca podem "spannar" colunas vizinhas — ficam sempre confinados à própria coluna.
const NO_COLSPAN_TYPES: ReadonlySet<string> = new Set(['form']);

export function BlockInspector(_props: {
  block: PageBlock;
  columnCount: number;
  /**
   * Maior span que o bloco pode assumir sem sobrepor conteúdo já existente em colunas
   * vizinhas (ver calculateMaxFittingSpan). Se omitido, assume-se columnCount (comportamento antigo).
   */
  maxSpan?: number;
  onChangeData: (data: PageBlock['data']) => void;
  onChangeColSpan: (colSpan: number) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onChangeBlockBackground: (bg: BackgroundConfig) => void;
}) {
  const { block, columnCount, maxSpan, onChangeData, onChangeColSpan, onUploadingChange, onChangeBlockBackground } =
    _props;
  const config = blockRegistry[block.type as BlockType];

  if (!config) {
    return (
      <div className="block-inspector">
        <p className="inspector-hint">Tipo de bloco desconhecido: {block.type}</p>
      </div>
    );
  }

  const Form = config.form as React.ComponentType<{
    value: unknown;
    onChange: (value: unknown) => void;
    onUploadingChange?: (uploading: boolean) => void;
  }>;

  const showColSpan = columnCount > 1 && !FULL_WIDTH_TYPES.has(block.type) && !NO_COLSPAN_TYPES.has(block.type);
  const effectiveMaxSpan = Math.max(1, Math.min(maxSpan ?? columnCount, columnCount));
  const currentSpan = Math.max(1, Math.min(block.colSpan ?? 1, effectiveMaxSpan));
  const isLimitedByNeighbors = effectiveMaxSpan < columnCount;

  return (
    <div className="block-inspector">
      <h3 className="inspector-section-title">{config.label}</h3>

      {showColSpan && (
        <div className="inspector-field">
          <label className="inspector-label">Largura (colunas)</label>
          <SegmentedControl<string>
            block
            ariaLabel="Largura em colunas"
            value={String(currentSpan)}
            options={Array.from({ length: effectiveMaxSpan }).map((_, idx) => ({
              value: String(idx + 1),
              label: `${idx + 1} col${idx + 1 > 1 ? 's' : ''}`
            }))}
            onChange={(v) => onChangeColSpan(Number(v))}
          />
          {isLimitedByNeighbors && (
            <p className="inspector-hint">
              Largura máxima limitada pelo conteúdo já presente nas colunas vizinhas. Remova ou mova esse conteúdo
              para liberar mais espaço.
            </p>
          )}
        </div>
      )}

      <div className="inspector-field">
        <Form
          value={block.data}
          onChange={(data) => onChangeData(data as PageBlock['data'])}
          onUploadingChange={onUploadingChange}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Fundo do bloco</label>
        <BackgroundPicker
          value={block.blockBackground ?? { mode: 'none' }}
          onChange={onChangeBlockBackground}
        />
      </div>
    </div>
  );
}
