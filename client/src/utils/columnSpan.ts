import type { PageBlock, PageSection } from '../types';
import { getBlockRowIndex, getSectionColumnCount } from './pageLayoutHelpers';

/**
 * Calcula o span efetivo de um bloco baseado no número de colunas da seção.
 * 
 * @param block - O bloco para calcular o span
 * @param sectionColumns - Número total de colunas na seção (1, 2 ou 3)
 * @returns Span efetivo (clamped entre 1 e sectionColumns)
 */
export function calculateBlockSpan(block: PageBlock, sectionColumns: number): number {
  // Blocos full-width (hero, recent-posts, services) sempre ocupam todas as colunas
  if (block.type === 'hero' || block.type === 'recent-posts' || block.type === 'services') {
    return sectionColumns;
  }

  // Formulário nunca "estoura" para colunas vizinhas: fica sempre confinado à sua própria coluna.
  // (colStart + colSpan > sectionColumns quebraria o grid quando o form não está na 1ª coluna)
  if (block.type === 'form') {
    return 1;
  }

  // Pegar colSpan do bloco (default = 1)
  const requestedSpan = block.colSpan ?? 1;

  // Clamp: garantir que está entre 1 e sectionColumns
  return Math.max(1, Math.min(requestedSpan, sectionColumns));
}

/**
 * Calcula a coluna inicial (1-indexed) onde um bloco deve começar no grid,
 * ajustando automaticamente para trás quando o span configurado não caberia
 * a partir da coluna "nativa" do bloco (colIndex).
 *
 * Exemplo: bloco está na coluna 2 (colIndex = 1) de uma seção de 3 colunas,
 * mas foi configurado com span = 3. Começando em "2" ele estouraria até a
 * coluna 4 (inexistente). O algoritmo reconhece que span = 3 só cabe se
 * começar na coluna 1, então desloca o início para trás automaticamente.
 * O mesmo vale para span = 2 numa coluna 3: desloca o início para a coluna 2.
 *
 * @param colIndex - Índice da coluna onde o bloco está (0-based)
 * @param span - Número de colunas que o bloco deve ocupar (já clampado por calculateBlockSpan)
 * @param totalColumns - Número total de colunas da seção
 * @returns Coluna inicial ajustada (1-indexed)
 */
export function calculateBlockColStart(colIndex: number, span: number, totalColumns: number): number {
  const naturalStart = colIndex + 1; // posição "nativa" do bloco, 1-indexed
  // Última posição inicial (1-indexed) em que um bloco com esse span ainda cabe sem estourar a grid
  const lastValidStart = Math.max(1, totalColumns - span + 1);

  // Se a posição nativa já ultrapassaria o limite, desloca para trás até a última posição válida.
  // Nunca desloca para frente (naturalStart já é o início preferido quando cabe).
  return Math.max(1, Math.min(naturalStart, lastValidStart));
}

/**
 * Gera o estilo CSS grid-column inline para um bloco.
 * Usa inline style para garantir que funciona sem depender de classes dinâmicas do Tailwind.
 *
 * @param colStart - Coluna inicial já resolvida (1-indexed), normalmente vinda de calculateBlockColStart
 * @param span - Número de colunas que o bloco deve ocupar
 * @param isFullWidth - Se true, bloco ocupa toda a largura (1 / -1)
 * @returns Objeto de estilo React para gridColumn
 */
export function getBlockGridColumnStyle(
  colStart: number,
  span: number,
  isFullWidth = false
): React.CSSProperties {
  if (isFullWidth) {
    return { gridColumn: '1 / -1' };
  }

  // grid-column: start / span count
  // Ex: início na coluna 2 com span 2 = "2 / span 2"
  return { gridColumn: `${colStart} / span ${span}` };
}

/**
 * Verifica se um bloco é do tipo full-width (deve sempre ocupar todas as colunas)
 */
export function isFullWidthBlock(block: PageBlock): boolean {
  return block.type === 'hero' || block.type === 'recent-posts' || block.type === 'services';
}

/**
 * Verifica se a célula (colIndex, rowIndex) de uma seção já está ocupada por algum bloco —
 * seja um bloco "nativo" dessa coluna nessa linha, seja um bloco de uma coluna vizinha que
 * invade essa coluna por causa do seu colSpan (já considerando o ajuste de calculateBlockColStart).
 *
 * Base para impedir dois tipos de sobreposição no editor:
 * 1. Adicionar um novo bloco numa coluna já coberta por um bloco vizinho com span > 1.
 * 2. Aumentar o colSpan de um bloco de forma a invadir uma coluna que já tem conteúdo.
 *
 * @param excludeBlockId - ignora esse bloco na verificação (útil ao redimensionar/mover o próprio bloco)
 */
export function isCellOccupied(
  section: PageSection,
  colIndex: number,
  rowIndex: number,
  excludeBlockId?: string
): boolean {
  const totalColumns = getSectionColumnCount(section);

  return section.cols.some((col, originColIndex) =>
    col.blocks.some((block, idx) => {
      if (excludeBlockId && block.id === excludeBlockId) return false;
      if (getBlockRowIndex(block, idx) !== rowIndex) return false;

      const span = calculateBlockSpan(block, totalColumns);
      const colStart0 = calculateBlockColStart(originColIndex, span, totalColumns) - 1; // 0-based
      const colEnd0 = colStart0 + span - 1;

      return colIndex >= colStart0 && colIndex <= colEnd0;
    })
  );
}

/**
 * Encontra a próxima linha livre numa coluna, pulando linhas já ocupadas por um bloco nativo
 * dessa coluna OU por um bloco vizinho que invade essa coluna via colSpan. Usado ao clicar em
 * "+ Adicionar bloco": garante que o novo bloco nunca nasce sobreposto a um bloco existente.
 */
export function findNextAvailableRow(section: PageSection, colIndex: number): number {
  const SAFETY_LIMIT = 500; // evita loop infinito em caso de dados corrompidos
  let row = 0;
  while (row < SAFETY_LIMIT && isCellOccupied(section, colIndex, row)) {
    row++;
  }
  return row;
}

/**
 * Calcula o maior colSpan que um bloco pode assumir a partir da sua coluna nativa sem
 * sobrepor outro bloco já posicionado na mesma linha (considerando o deslocamento automático
 * de calculateBlockColStart). Usado pelo inspector para não oferecer larguras que causariam
 * sobreposição visual.
 */
export function calculateMaxFittingSpan(
  section: PageSection,
  colIndex: number,
  rowIndex: number,
  blockId: string
): number {
  const totalColumns = getSectionColumnCount(section);
  let maxSpan = 1;

  for (let span = 2; span <= totalColumns; span++) {
    const colStart0 = calculateBlockColStart(colIndex, span, totalColumns) - 1;
    let fits = true;

    for (let c = colStart0; c < colStart0 + span; c++) {
      if (isCellOccupied(section, c, rowIndex, blockId)) {
        fits = false;
        break;
      }
    }

    if (!fits) break;
    maxSpan = span;
  }

  return maxSpan;
}
