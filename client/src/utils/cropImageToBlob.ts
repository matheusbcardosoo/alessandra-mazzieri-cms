import type { Area } from 'react-easy-crop';

export type CropMetadata = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  aspect: number;
  originalWidth: number;
  originalHeight: number;
};

type CropOptions = {
  outputWidth: number;
  outputHeight: number;
  mimeType?: string;
  quality?: number;
  zoom?: number;
  originalSize?: { width: number; height: number };
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.crossOrigin = 'anonymous';
    image.src = src;
  });
}

export async function cropImageToBlob(
  imageSrc: string,
  pixelCrop: Area,
  options: CropOptions
): Promise<{ blob: Blob; meta: CropMetadata }> {
  const {
    outputWidth,
    outputHeight,
    mimeType = 'image/jpeg',
    quality = 0.85,
    zoom = 1,
    originalSize
  } = options;

  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported in this browser');
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (file) => {
        if (!file) {
          reject(new Error('Falha ao gerar imagem cortada'));
          return;
        }
        resolve(file);
      },
      mimeType,
      quality
    );
  });

  const meta: CropMetadata = {
    x: pixelCrop.x,
    y: pixelCrop.y,
    width: pixelCrop.width,
    height: pixelCrop.height,
    zoom,
    aspect: outputWidth / outputHeight,
    originalWidth: originalSize?.width ?? image.naturalWidth ?? image.width,
    originalHeight: originalSize?.height ?? image.naturalHeight ?? image.height
  };

  return { blob, meta };
}
