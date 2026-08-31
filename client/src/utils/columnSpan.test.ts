import { describe, expect, it } from 'vitest';
import {
  calculateBlockColStart,
  calculateBlockSpan,
  calculateMaxFittingSpan,
  findNextAvailableRow,
  getBlockGridColumnStyle,
  isCellOccupied,
  isFullWidthBlock
} from './columnSpan';
import type { PageBlock, PageSection } from '../types';

describe('calculateBlockColStart', () => {
  it('mantém a coluna nativa quando o span já cabe a partir dela', () => {
    // Coluna 1 (colIndex 0), span 2, seção de 3 colunas -> cabe normalmente (1-2)
    expect(calculateBlockColStart(0, 2, 3)).toBe(1);
    // Coluna 2 (colIndex 1), span 1, seção de 3 colunas -> permanece na coluna 2
    expect(calculateBlockColStart(1, 1, 3)).toBe(2);
  });

  it('desloca o início para trás quando o bloco está na coluna 2 mas span = 3 (todas as colunas)', () => {
    // Bloco na Coluna 2 (colIndex 1) configurado para ocupar as 3 colunas: não cabe começando em 2,
    // então deve iniciar na coluna 1 e cobrir 1-3.
    expect(calculateBlockColStart(1, 3, 3)).toBe(1);
  });

  it('desloca o início para trás quando o bloco está na coluna 3 mas span = 2', () => {
    // Bloco na Coluna 3 (colIndex 2) configurado para ocupar 2 colunas: não cabe começando em 3,
    // então deve iniciar na coluna 2 e cobrir 2-3.
    expect(calculateBlockColStart(2, 2, 3)).toBe(2);
  });

  it('nunca desloca para além da coluna 1', () => {
    expect(calculateBlockColStart(0, 3, 3)).toBe(1);
    expect(calculateBlockColStart(2, 3, 3)).toBe(1);
  });

  it('funciona em seções de 2 colunas', () => {
    // Coluna 2 (colIndex 1), span 2 -> desloca para começar na coluna 1
    expect(calculateBlockColStart(1, 2, 2)).toBe(1);
    // Coluna 1 (colIndex 0), span 1 -> permanece
    expect(calculateBlockColStart(0, 1, 2)).toBe(1);
  });

  it('nunca estoura a grade: colStart + span - 1 <= totalColumns', () => {
    for (let totalColumns = 1; totalColumns <= 3; totalColumns++) {
      for (let colIndex = 0; colIndex < totalColumns; colIndex++) {
        for (let span = 1; span <= totalColumns; span++) {
          const colStart = calculateBlockColStart(colIndex, span, totalColumns);
          expect(colStart).toBeGreaterThanOrEqual(1);
          expect(colStart + span - 1).toBeLessThanOrEqual(totalColumns);
        }
      }
    }
  });
});

describe('getBlockGridColumnStyle', () => {
  it('gera "start / span N" a partir do colStart já resolvido', () => {
    expect(getBlockGridColumnStyle(1, 3, false)).toEqual({ gridColumn: '1 / span 3' });
    expect(getBlockGridColumnStyle(2, 2, false)).toEqual({ gridColumn: '2 / span 2' });
  });

  it('ignora colStart/span quando isFullWidth', () => {
    expect(getBlockGridColumnStyle(2, 2, true)).toEqual({ gridColumn: '1 / -1' });
  });
});

describe('cenário completo: coluna nativa + span + colStart', () => {
  function textBlock(colSpan?: number): PageBlock {
    return { id: 'b1', type: 'text', colSpan, data: { contentHtml: 'x' } } as PageBlock;
  }

  it('bloco na Coluna 2 configurado para 3 colunas cobre 1-3', () => {
    const block = textBlock(3);
    const span = calculateBlockSpan(block, 3);
    const colStart = calculateBlockColStart(1, span, 3);
    expect(span).toBe(3);
    expect(colStart).toBe(1);
    expect(getBlockGridColumnStyle(colStart, span, isFullWidthBlock(block))).toEqual({
      gridColumn: '1 / span 3'
    });
  });

  it('bloco na Coluna 3 configurado para 2 colunas cobre 2-3', () => {
    const block = textBlock(2);
    const span = calculateBlockSpan(block, 3);
    const colStart = calculateBlockColStart(2, span, 3);
    expect(span).toBe(2);
    expect(colStart).toBe(2);
    expect(getBlockGridColumnStyle(colStart, span, isFullWidthBlock(block))).toEqual({
      gridColumn: '2 / span 2'
    });
  });
});

// Reproduz o cenário reportado: seção de 3 colunas onde a Coluna 2 tem uma tag (pills)
// configurada para ocupar as colunas 2 e 3, e a Coluna 3 está vazia.
function buildScenarioSection(extraColThreeBlocks: PageBlock[] = []): PageSection {
  return {
    id: 'section-1',
    columns: 3,
    cols: [
      {
        id: 'col-0',
        blocks: [{ id: 'text1', type: 'text', rowIndex: 0, data: { contentHtml: 'aaa' } } as PageBlock]
      },
      {
        id: 'col-1',
        blocks: [{ id: 'tag1', type: 'pills', colSpan: 2, rowIndex: 0, data: {} } as unknown as PageBlock]
      },
      { id: 'col-2', blocks: extraColThreeBlocks }
    ],
    settings: { columnsLayout: 3 }
  };
}

describe('isCellOccupied', () => {
  it('reconhece que a Coluna 3 (linha 0) está ocupada pelo span da tag na Coluna 2', () => {
    const section = buildScenarioSection();
    // colIndex 2 = Coluna 3
    expect(isCellOccupied(section, 2, 0)).toBe(true);
  });

  it('considera a linha 1 livre em todas as colunas quando só existe conteúdo na linha 0', () => {
    const section = buildScenarioSection();
    expect(isCellOccupied(section, 0, 1)).toBe(false);
    expect(isCellOccupied(section, 1, 1)).toBe(false);
    expect(isCellOccupied(section, 2, 1)).toBe(false);
  });

  it('ignora o próprio bloco quando excludeBlockId é passado', () => {
    const section = buildScenarioSection();
    expect(isCellOccupied(section, 1, 0, 'tag1')).toBe(false);
  });
});

describe('findNextAvailableRow — corrige o bug de "+ Adicionar bloco" sobrepondo a tag', () => {
  it('pula a linha 0 na Coluna 3, pois está coberta pelo span da tag, e usa a linha 1', () => {
    const section = buildScenarioSection();
    // Antes da correção, o botão usava sortedBlocks.length (0, coluna vazia) e colidia com a tag.
    expect(findNextAvailableRow(section, 2)).toBe(1);
  });

  it('numa coluna sem nenhuma sobreposição, continua se comportando como "próxima linha livre = fim da coluna"', () => {
    const section = buildScenarioSection();
    // Coluna 1 (colIndex 0) já tem 1 bloco na linha 0 e nada mais a invade -> próxima livre é a linha 1
    expect(findNextAvailableRow(section, 0)).toBe(1);
  });

  it('se a Coluna 3 já tiver conteúdo na linha 0 (estado de bug já existente), ainda assim aponta para a próxima linha livre', () => {
    const cardBlock = { id: 'card1', type: 'cards', rowIndex: 0, data: { items: [] } } as unknown as PageBlock;
    const section = buildScenarioSection([cardBlock]);
    expect(findNextAvailableRow(section, 2)).toBe(1);
  });
});

describe('calculateMaxFittingSpan — limita a largura oferecida no inspector', () => {
  it('a tag não pode crescer para 3 colunas porque a Coluna 1 já tem outro bloco', () => {
    const section = buildScenarioSection();
    expect(calculateMaxFittingSpan(section, 1, 0, 'tag1')).toBe(2);
  });

  it('sem bloco vizinho ocupando a Coluna 1, a tag poderia crescer para as 3 colunas', () => {
    const section = buildScenarioSection();
    section.cols[0].blocks = [];
    expect(calculateMaxFittingSpan(section, 1, 0, 'tag1')).toBe(3);
  });

  it('um bloco sozinho na própria coluna pode crescer livremente até o limite da seção', () => {
    const section: PageSection = {
      id: 's2',
      columns: 3,
      cols: [
        { id: 'col-0', blocks: [{ id: 'solo', type: 'text', rowIndex: 0, data: { contentHtml: 'x' } } as PageBlock] },
        { id: 'col-1', blocks: [] },
        { id: 'col-2', blocks: [] }
      ],
      settings: { columnsLayout: 3 }
    };
    expect(calculateMaxFittingSpan(section, 0, 0, 'solo')).toBe(3);
  });
});
