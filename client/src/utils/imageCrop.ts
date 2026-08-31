import type { Media } from '../types';

export type ImageCropData = {
  x: number;
  y: number;
  width: number;
  height: number;
  ratio?: string;
};

/**
 * Calcula os estilos CSS para aplicar crop em uma imagem
 * Usa object-position e object-fit para simular o recorte
 */
export function getCroppedImageStyles(
  originalWidth: number,
  originalHeight: number,
  cropData: ImageCropData,
  targetWidth?: number,
  targetHeight?: number
): React.CSSProperties {
  if (!originalWidth || !originalHeight) {
    return {
      objectFit: 'cover',
      objectPosition: 'center',
    };
  }

  // Calcular as porcentagens de posição para object-position
  const xPercent = ((cropData.x + cropData.width / 2) / originalWidth) * 100;
  const yPercent = ((cropData.y + cropData.height / 2) / originalHeight) * 100;

  // Calcular o zoom necessário para que a área cropada preencha o container
  const cropAspectRatio = cropData.width / cropData.height;
  const containerAspectRatio = targetWidth && targetHeight ? targetWidth / targetHeight : 1;
  
  let scaleX = 1;
  let scaleY = 1;

  if (containerAspectRatio > cropAspectRatio) {
    // Container é mais largo que o crop - escalar baseado na largura
    scaleX = originalWidth / cropData.width;
    scaleY = scaleX;
  } else {
    // Container é mais alto que o crop - escalar baseado na altura
    scaleY = originalHeight / cropData.height;
    scaleX = scaleY;
  }

  return {
    objectFit: 'cover',
    objectPosition: `${xPercent}% ${yPercent}%`,
    transform: `scale(${Math.max(scaleX, scaleY)})`,
    transformOrigin: `${xPercent}% ${yPercent}%`,
  };
}

/**
 * Aplica crop data de uma mídia em estilos de imagem
 */
export function getMediaCropStyles(
  media: Media,
  targetWidth?: number,
  targetHeight?: number
): React.CSSProperties {
  if (!media.cropX || !media.cropY || !media.cropWidth || !media.cropHeight || !media.width || !media.height) {
    return {
      objectFit: 'cover',
      objectPosition: 'center',
    };
  }

  return getCroppedImageStyles(
    media.width,
    media.height,
    {
      x: media.cropX,
      y: media.cropY,
      width: media.cropWidth,
      height: media.cropHeight,
      ratio: media.cropRatio || undefined,
    },
    targetWidth,
    targetHeight
  );
}

/**
 * Aplica crop data de um bloco de imagem
 */
export function getBlockImageCropStyles(
  imageWidth: number | undefined,
  imageHeight: number | undefined,
  cropX?: number,
  cropY?: number,
  cropWidth?: number,
  cropHeight?: number,
  targetWidth?: number,
  targetHeight?: number
): React.CSSProperties {
  if (
    cropX == null ||
    cropY == null ||
    cropWidth == null ||
    cropHeight == null ||
    imageWidth == null ||
    imageHeight == null
  ) {
    return {
      objectFit: 'cover',
      objectPosition: 'center',
    };
  }

  return getCroppedImageStyles(
    imageWidth,
    imageHeight,
    {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    },
    targetWidth,
    targetHeight
  );
}

/**
 * Versão do getBlockImageCropStyles SEM transform (para Hero)
 * Usa apenas object-fit e object-position, sem scale
 */
export function getBlockImageCropStylesNoTransform(
  imageWidth: number | undefined,
  imageHeight: number | undefined,
  cropX?: number,
  cropY?: number,
  cropWidth?: number,
  cropHeight?: number
): React.CSSProperties {
  if (
    cropX == null ||
    cropY == null ||
    cropWidth == null ||
    cropHeight == null ||
    imageWidth == null ||
    imageHeight == null
  ) {
    return {
      objectFit: 'cover',
      objectPosition: 'center',
    };
  }

  // Calcular as porcentagens de posição para object-position
  const xPercent = ((cropX + cropWidth / 2) / imageWidth) * 100;
  const yPercent = ((cropY + cropHeight / 2) / imageHeight) * 100;

  return {
    objectFit: 'cover',
    objectPosition: `${xPercent}% ${yPercent}%`,
    // SEM transform - o Hero deve enquadrar apenas com object-fit/position
  };
}
