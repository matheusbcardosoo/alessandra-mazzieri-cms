import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type PercentCrop,
  type PixelCrop
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal } from './AdminUI';

export type CropRatio = '16:9' | '9:16' | '1:1' | '4:3' | 'free';

export type CropData = {
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: CropRatio;
};

type FlexibleImageCropModalProps = {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (cropData: CropData) => void;
  title?: string;
  initialRatio?: CropRatio;
  initialCropData?: CropData | null;
  allowRatioChange?: boolean;
};

const RATIO_OPTIONS: CropRatio[] = ['16:9', '9:16', '1:1', '4:3', 'free'];

const ratioToNumber = (ratio: CropRatio): number | undefined => {
  switch (ratio) {
    case '16:9':
      return 16 / 9;
    case '9:16':
      return 9 / 16;
    case '1:1':
      return 1;
    case '4:3':
      return 4 / 3;
    default:
      return undefined; // livre
  }
};

/**
 * Crop percentual centralizado que já respeita a proporção escolhida (ou a
 * imagem inteira, no modo livre) para o tamanho atualmente renderizado da
 * imagem. Usado tanto ao trocar de proporção quanto como padrão para uma
 * imagem sem crop salvo — assim o retângulo de seleção nunca fica "preso"
 * numa forma da proporção anterior nem sai da área real da imagem.
 */
function buildCenteredCrop(ratio: CropRatio, renderedWidth: number, renderedHeight: number): PercentCrop {
  const aspect = ratioToNumber(ratio);
  if (!aspect) {
    return { unit: '%', x: 0, y: 0, width: 100, height: 100 };
  }
  return centerCrop(makeAspectCrop({ unit: '%', width: 100 }, aspect, renderedWidth, renderedHeight), renderedWidth, renderedHeight);
}

export function FlexibleImageCropModal({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  title = 'Recortar Imagem',
  initialRatio = 'free',
  initialCropData = null,
  allowRatioChange = true
}: FlexibleImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number } | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<CropRatio>(initialCropData?.ratio ?? initialRatio);
  const [crop, setCrop] = useState<PercentCrop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const aspect = useMemo(() => ratioToNumber(selectedRatio), [selectedRatio]);

  // Reseta o estado sempre que o modal abre (ou troca de imagem), pra não
  // vazar o crop/tamanho de uma imagem anterior pra próxima.
  useEffect(() => {
    if (!open) return;
    setSelectedRatio(initialCropData?.ratio ?? initialRatio);
    setNaturalSize(null);
    setRenderedSize(null);
    setCrop(undefined);
    setCompletedCrop(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageSrc]);

  const applyCropForSize = useCallback(
    (renderedWidth: number, renderedHeight: number, natural: { width: number; height: number }, ratio: CropRatio) => {
      let percentCrop: PercentCrop;

      if (initialCropData) {
        const toPercent = (value: number, total: number) => (value / total) * 100;
        percentCrop = {
          unit: '%',
          x: toPercent(initialCropData.x, natural.width),
          y: toPercent(initialCropData.y, natural.height),
          width: toPercent(initialCropData.width, natural.width),
          height: toPercent(initialCropData.height, natural.height)
        };
      } else {
        // Sem crop salvo: seleciona a imagem inteira (ou o máximo possível
        // dentro da proporção escolhida) em vez de um quadrado arbitrário —
        // se o usuário confirmar sem mexer em nada, o resultado é a imagem
        // completa, não um recorte aleatório do meio.
        percentCrop = buildCenteredCrop(ratio, renderedWidth, renderedHeight);
      }

      setCrop(percentCrop);
      setCompletedCrop(convertToPixelCrop(percentCrop, renderedWidth, renderedHeight));
    },
    [initialCropData]
  );

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    const natural = { width: target.naturalWidth, height: target.naturalHeight };
    const rendered = { width: target.clientWidth, height: target.clientHeight };
    setNaturalSize(natural);
    setRenderedSize(rendered);
    applyCropForSize(rendered.width, rendered.height, natural, selectedRatio);
  };

  // Mantém o tamanho renderizado sincronizado com o real (a imagem pode
  // mudar de tamanho — resize da janela, fonte carregando, etc.). Sem isso,
  // a seleção de recorte podia ficar desalinhada até alguma interação do
  // usuário forçar um recálculo (ex.: arrastar uma aresta).
  useEffect(() => {
    if (!open) return;
    const el = imgRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setRenderedSize((prev) => {
        if (prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) return prev;
        return { width, height };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, imageSrc]);

  const handleRatioChange = (ratio: CropRatio) => {
    setSelectedRatio(ratio);
    if (!renderedSize) return;
    const percentCrop = buildCenteredCrop(ratio, renderedSize.width, renderedSize.height);
    setCrop(percentCrop);
    setCompletedCrop(convertToPixelCrop(percentCrop, renderedSize.width, renderedSize.height));
  };

  const handleCropChange = (_pixelCrop: PixelCrop, percentCrop: PercentCrop) => {
    setCrop(percentCrop);
  };

  const handleCropComplete = (pixelCrop: PixelCrop) => {
    setCompletedCrop(pixelCrop);
  };

  const handleConfirm = () => {
    if (!completedCrop || !renderedSize || !naturalSize) return;

    const scaleX = naturalSize.width / renderedSize.width;
    const scaleY = naturalSize.height / renderedSize.height;

    const cropData: CropData = {
      x: Math.round(completedCrop.x * scaleX),
      y: Math.round(completedCrop.y * scaleY),
      width: Math.round(completedCrop.width * scaleX),
      height: Math.round(completedCrop.height * scaleY),
      ratio: selectedRatio
    };

    onConfirm(cropData);
  };

  const handleReset = () => {
    if (!renderedSize) return;
    const percentCrop = buildCenteredCrop(selectedRatio, renderedSize.width, renderedSize.height);
    setCrop(percentCrop);
    setCompletedCrop(convertToPixelCrop(percentCrop, renderedSize.width, renderedSize.height));
  };

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      description="Ajuste o enquadramento da imagem."
      width={1040}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="button" onClick={handleConfirm} disabled={!completedCrop}>
            Aplicar Recorte
          </button>
        </>
      }
    >
      <div className="flexible-cropper-shell">
        {allowRatioChange && (
          <div className="flexible-cropper-ratio-controls">
            <label className="flexible-cropper-ratio-label">Proporção:</label>
            <div className="flexible-cropper-ratio-options">
              {RATIO_OPTIONS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  className={`btn btn-sm ${selectedRatio === ratio ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleRatioChange(ratio)}
                >
                  {ratio === 'free' ? 'Livre' : ratio}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flexible-cropper-preview" aria-label="Área de recorte">
          <ReactCrop crop={crop} onChange={handleCropChange} onComplete={handleCropComplete} aspect={aspect} keepSelection>
            <img ref={imgRef} src={imageSrc} alt="Imagem para recorte" onLoad={handleImageLoad} className="flexible-cropper-image" />
          </ReactCrop>
        </div>

        <div className="flexible-cropper-controls">
          <div className="flexible-cropper-help">
            <strong>{selectedRatio === 'free' ? 'Proporção livre' : `Proporção ${selectedRatio}`}</strong>
            <p className="muted small">Arraste o retângulo para ajustar o recorte.</p>
          </div>
          <div className="flexible-cropper-actions">
            <button className="btn btn-outline" type="button" onClick={handleReset}>
              Resetar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
