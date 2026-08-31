import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Modal } from './AdminUI';
import { cropImageToBlob, type CropMetadata } from '../utils/cropImageToBlob';
import { COVER_OUTPUT_MIME, COVER_OUTPUT_QUALITY } from '../constants';

type ImageCropModalProps = {
  open: boolean;
  imageSrc?: string | null;
  imageFile?: File | null;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  onCancel: () => void;
  onConfirm: (file: File, meta: CropMetadata) => Promise<void> | void;
  title?: string;
  confirmLabel?: string;
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
};

function sanitizeName(name?: string) {
  if (!name) return 'cover';
  const base = name.replace(/\.[^.]+$/, '');
  const normalized = base.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'cover';
}

export function ImageCropModal({
  open,
  imageSrc,
  imageFile,
  aspect,
  outputWidth,
  outputHeight,
  onCancel,
  onConfirm,
  title = 'Ajustar imagem de capa',
  confirmLabel = 'Confirmar recorte',
  mimeType = COVER_OUTPUT_MIME
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedSrc = useMemo(() => {
    if (imageSrc) return imageSrc;
    if (imageFile) return URL.createObjectURL(imageFile);
    return null;
  }, [imageSrc, imageFile]);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!imageSrc && imageFile && resolvedSrc) {
      return () => URL.revokeObjectURL(resolvedSrc);
    }
    return undefined;
  }, [resolvedSrc, imageSrc, imageFile]);

  const handleConfirm = async () => {
    if (!resolvedSrc || !croppedAreaPixels) {
      setError('Selecione uma área para recortar.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const safeName = sanitizeName(imageFile?.name ?? imageSrc ?? undefined);
      const { blob, meta } = await cropImageToBlob(resolvedSrc, croppedAreaPixels, {
        outputWidth,
        outputHeight,
        mimeType,
        quality: COVER_OUTPUT_QUALITY,
        zoom,
        originalSize: imageSize ?? undefined
      });

      const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
      const file = new File([blob], `${safeName}-cropped-${Date.now()}.${extension}`, { type: mimeType });

      await onConfirm(file, meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao recortar a imagem');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  };

  return (
    <Modal
      isOpen={open}
      onClose={processing ? () => {} : onCancel}
      title={title}
      description="Ajuste o enquadramento antes de salvar."
      width={860}
    >
      <div className="cropper-shell">
        <div className="cropper-preview" aria-label="Area de recorte">
          {resolvedSrc ? (
            <Cropper
              image={resolvedSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              onMediaLoaded={({ naturalWidth, naturalHeight }) => setImageSize({ width: naturalWidth, height: naturalHeight })}
              showGrid
              restrictPosition
            />
          ) : (
            <div className="cropper-placeholder">Selecione uma imagem para recortar.</div>
          )}
        </div>
        <div className="cropper-controls">
          <div className="cropper-help">
            <strong>Zoom</strong>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Controlar zoom do recorte"
              disabled={processing}
            />
          </div>
          <div className="cropper-actions">
            <span className="muted">
              Proporcao fixa {aspect.toFixed(2)} • Saida {outputWidth}x{outputHeight}
            </span>
            <button className="btn btn-outline" type="button" onClick={handleReset} disabled={processing}>
              Resetar
            </button>
          </div>
        </div>
        {error && <div className="admin-empty" role="alert">{error}</div>}
      </div>
      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={onCancel} disabled={processing}>
          Cancelar
        </button>
        <button className="btn btn-primary" type="button" onClick={handleConfirm} disabled={processing || !resolvedSrc}>
          {processing ? 'Processando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
