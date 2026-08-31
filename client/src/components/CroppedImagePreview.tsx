import type { CSSProperties } from 'react';

export type CroppedImagePreviewProps = {
  src: string;
  alt?: string;
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  className?: string;
  style?: CSSProperties;
  /**
   * Altura máxima do preview, em px. Sem isso, um crop bem vertical (ex.:
   * 9:16) ocupando 100% da largura do painel vira uma caixa enorme —
   * limitamos a altura e deixamos a largura encolher junto (ver cálculo de
   * `width` abaixo), não o contrário, porque um <div> comum (ao contrário
   * de <img>) não recalcula a largura sozinho quando só a altura é limitada.
   */
  maxHeight?: number;
};

/**
 * Preview de imagem que reflete o recorte salvo (cropX/Y/Width/Height, em
 * pixels da imagem original) sem precisar gerar um arquivo cortado à parte
 * — a mesma imagem original é escalada e deslocada via CSS pra revelar só
 * a janela do recorte. Genérico o suficiente pra qualquer lugar que
 * mostre uma imagem com crop salvo (bloco de imagem, capa de artigo,
 * settings), não só o form do bloco de imagem.
 *
 * Sem crop salvo (ou sem as dimensões naturais pra fazer as contas), cai
 * de volta pra um <img> normal.
 */
export function CroppedImagePreview({
  src,
  alt = '',
  naturalWidth,
  naturalHeight,
  cropX,
  cropY,
  cropWidth,
  cropHeight,
  className,
  style,
  maxHeight = 320
}: CroppedImagePreviewProps) {
  const hasCrop =
    naturalWidth != null &&
    naturalHeight != null &&
    naturalWidth > 0 &&
    naturalHeight > 0 &&
    cropX != null &&
    cropY != null &&
    cropWidth != null &&
    cropHeight != null &&
    cropWidth > 0 &&
    cropHeight > 0;

  if (!hasCrop) {
    // <img> é um elemento substituído: com max-width e max-height juntos e
    // sem width/height explícitos, o navegador já escolhe o menor dos dois
    // preservando a proporção natural — não precisa de object-fit aqui.
    return <img src={src} alt={alt} className={className} style={{ maxHeight: `${maxHeight}px`, ...style }} />;
  }

  // Escala a imagem pra que a janela do crop (cropWidth x cropHeight, em px
  // naturais) preencha 100% do container, depois desloca pra essa janela
  // ficar visível. `height: auto` no <img> mantém a proporção natural, o
  // que garante a mesma escala nos dois eixos sem distorcer a imagem.
  const widthPct = (naturalWidth! / cropWidth!) * 100;
  const leftPct = -(cropX! / cropWidth!) * 100;
  const topPct = -(cropY! / cropHeight!) * 100;

  // O container é um <div> comum, não um elemento substituído — max-height
  // sozinho não recalcula a largura (diferente de <img>), e como o offset
  // do recorte acima é todo em % relativo à largura, deixar a altura
  // "quebrar" a proporção bagunçaria a janela visível. Em vez de limitar a
  // altura diretamente, limitamos a LARGURA ao valor que produziria essa
  // altura máxima dada a proporção do crop — a altura cai junto,
  // corretamente, porque continua sendo derivada da largura via aspect-ratio.
  const ratio = cropWidth! / cropHeight!;
  const widthForMaxHeight = maxHeight * ratio;

  return (
    <div
      className={className ? `cropped-image-preview ${className}` : 'cropped-image-preview'}
      style={{ aspectRatio: `${cropWidth} / ${cropHeight}`, width: `min(100%, ${widthForMaxHeight}px)`, ...style }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${widthPct}%`,
          maxWidth: 'none',
          height: 'auto',
          display: 'block'
        }}
      />
    </div>
  );
}
