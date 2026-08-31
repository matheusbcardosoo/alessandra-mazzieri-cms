import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faImage, faImages, faUpload, faTag, faTimes } from '@fortawesome/free-solid-svg-icons';
import { fetchMedia, uploadMedia, saveCropData } from '../api/queries';
import type { Media } from '../types';
import { FlexibleImageCropModal, type CropData, type CropRatio } from './FlexibleImageCropModal';
import { Modal } from './AdminUI';
import { toast } from './toastStore';
import { getApiErrorMessage } from '../utils/apiError';

type ImagePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (image: { mediaId: string; src: string; alt: string; width?: number | null; height?: number | null; cropData?: CropData; avifSrc?: string | null }) => void;
  currentMediaId?: string | null;
  enableCrop?: boolean;
  cropRatio?: CropRatio;
  cropTitle?: string;
  initialCropData?: CropData | null;
};

type TabMode = 'upload' | 'library';

export function ImagePickerModal({ 
  open, 
  onClose, 
  onSelect, 
  currentMediaId,
  enableCrop = false,
  cropRatio = 'free',
  cropTitle = 'Recortar Imagem',
  initialCropData = null,
}: ImagePickerModalProps) {
  const [tab, setTab] = useState<TabMode>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<Media | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setTab('library');
      setSearchQuery('');
      setActiveTag(null);
      setUploadFile(null);
      setUploadPreview(null);
      setIsDragging(false);
    }
  }

  const queryOpts = activeTag
    ? { tag: activeTag }
    : searchQuery
    ? { search: searchQuery }
    : undefined;

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['admin', 'media', searchQuery, activeTag ?? ''],
    queryFn: () => fetchMedia(queryOpts),
    enabled: open
  });

  // Collect tags from current results for quick-filter chips
  const availableTags = [...new Set(media.flatMap((m) => m.tags ?? []))].sort();

  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: (newMedia) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      if (enableCrop) {
        const mediaForCrop: Media = {
          id: newMedia.mediaId,
          url: newMedia.url,
          avifUrl: newMedia.avifUrl ?? null,
          alt: newMedia.alt,
          mimeType: 'image/jpeg',
          size: 0,
          width: newMedia.width,
          height: newMedia.height
        };
        setSelectedImageForCrop(mediaForCrop);
        setCropModalOpen(true);
      } else {
        onSelect({
          mediaId: newMedia.mediaId,
          src: newMedia.url,
          alt: newMedia.alt || '',
          width: newMedia.width ?? null,
          height: newMedia.height ?? null,
          avifSrc: newMedia.avifUrl ?? null
        });
        onClose();
      }
    },
    onError: (error: unknown) => {
      const msg = getApiErrorMessage(error, 'Nao foi possivel fazer o upload da imagem.');
      toast.error('Falha no upload', { message: msg, code: 'MEDIA-001' });
    }
  });

  const cropMutation = useMutation({
    mutationFn: ({ mediaId, cropData }: { mediaId: string; cropData: CropData }) =>
      saveCropData(mediaId, {
        cropX: cropData.x,
        cropY: cropData.y,
        cropWidth: cropData.width,
        cropHeight: cropData.height,
        cropRatio: cropData.ratio,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
  });

  const resolveInitialCropData = (m: Media | null): CropData | null => {
    if (!m) return null;
    const has = m.cropX != null && m.cropY != null && m.cropWidth != null && m.cropHeight != null;
    if (has) {
      return {
        x: Number(m.cropX), y: Number(m.cropY),
        width: Number(m.cropWidth), height: Number(m.cropHeight),
        ratio: (m.cropRatio as CropRatio | null | undefined) ?? initialCropData?.ratio ?? cropRatio,
      };
    }
    if (initialCropData && currentMediaId && m.id === currentMediaId) return { ...initialCropData };
    return null;
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.warning('Arquivo invalido', { message: 'Selecione um arquivo de imagem (PNG, JPG, WEBP).', code: 'MEDIA-002' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('Arquivo muito grande', { message: 'O tamanho maximo permitido e 5 MB.', code: 'MEDIA-003' });
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!uploadFile) return;
    uploadMutation.mutate({ file: uploadFile, alt: '' });
  };

  const handleSelectImage = (image: Media) => {
    if (enableCrop) {
      setSelectedImageForCrop(image);
      setCropModalOpen(true);
    } else {
      onSelect({
        mediaId: image.id,
        src: image.url,
        alt: image.alt || '',
        width: image.width ?? null,
        height: image.height ?? null,
        avifSrc: image.avifUrl ?? null
      });
      onClose();
    }
  };

  const handleCropConfirm = async (cropData: CropData) => {
    if (!selectedImageForCrop) return;
    try {
      await cropMutation.mutateAsync({ mediaId: selectedImageForCrop.id, cropData });
      onSelect({
        mediaId: selectedImageForCrop.id,
        src: selectedImageForCrop.url,
        alt: selectedImageForCrop.alt || '',
        width: selectedImageForCrop.width ?? null,
        height: selectedImageForCrop.height ?? null,
        cropData,
        avifSrc: selectedImageForCrop.avifUrl ?? null
      });
      setCropModalOpen(false);
      setSelectedImageForCrop(null);
      onClose();
    } catch {
      toast.error('Falha ao salvar recorte', { message: 'Nao foi possivel salvar a configuracao de recorte.', code: 'MEDIA-004' });
    }
  };

  const handleCropCancel = () => { setCropModalOpen(false); setSelectedImageForCrop(null); };

  const initialCropForSelected = resolveInitialCropData(selectedImageForCrop);

  return (
    <>
      <Modal isOpen={open} onClose={onClose} title="Selecionar Imagem"
        description="Escolha uma imagem da biblioteca ou envie uma nova" width={820}>
        <div className="image-picker-tabs" style={{ marginBottom: '1rem' }}>
          <button type="button" className={`image-picker-tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>
            <FontAwesomeIcon icon={faImages} /><span>Biblioteca</span>
          </button>
          <button type="button" className={`image-picker-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
            <FontAwesomeIcon icon={faUpload} /><span>Enviar Nova</span>
          </button>
        </div>

        {tab === 'upload' && (
          <div className="image-upload-area" style={{ marginTop: '1rem' }}>
            <div className={`image-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
              onDragOver={handleDragOver} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}>
              {uploadPreview ? (
                <div className="upload-preview">
                  <img src={uploadPreview} alt="Preview" />
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadPreview(null); }}>
                    Trocar imagem
                  </button>
                </div>
              ) : (
                <div className="dropzone-placeholder">
                  <div className="dropzone-icon" aria-hidden="true"><FontAwesomeIcon icon={faImage} /></div>
                  <p className="dropzone-title">Arraste uma imagem aqui</p>
                  <p className="dropzone-subtitle">ou clique para selecionar</p>
                  <p className="dropzone-hint">PNG, JPG, WEBP (max. 5MB)</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} style={{ display: 'none' }} />
            {uploadFile && (
              <div className="upload-actions">
                <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? 'Enviando...' : 'Enviar e Usar Imagem'}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'library' && (
          <div className="image-library">
            <div className="image-library-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar por titulo, alt ou tag..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setActiveTag(null); }}
                className="search-input"
              />
              {(searchQuery || activeTag) && (
                <button type="button" style={{ position: 'absolute', right: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: '0.25rem' }}
                  onClick={() => { setSearchQuery(''); setActiveTag(null); }} aria-label="Limpar busca">
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>

            {availableTags.length > 0 && (
              <div className="media-tag-filters" style={{ marginBottom: '0.75rem' }}>
                {availableTags.map((tag) => (
                  <button key={tag} type="button"
                    className={`media-tag-filter-chip ${activeTag === tag ? 'is-active' : ''}`}
                    onClick={() => { setActiveTag(activeTag === tag ? null : tag); setSearchQuery(''); }}>
                    <FontAwesomeIcon icon={faTag} style={{ fontSize: '0.65rem' }} />{tag}
                  </button>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="library-loading">Carregando imagens...</div>
            ) : media.length === 0 ? (
              <div className="library-empty">
                <p>Nenhuma imagem encontrada.</p>
                {!searchQuery && !activeTag && (
                  <button type="button" className="btn btn-outline" onClick={() => setTab('upload')}>
                    Enviar primeira imagem
                  </button>
                )}
              </div>
            ) : (
              <div className="image-library-grid">
                {media.map((image) => (
                  <div key={image.id}
                    className={`library-image-item ${currentMediaId === image.id ? 'selected' : ''}`}
                    onClick={() => handleSelectImage(image)}>
                    <div className="library-image-thumb">
                      <img src={image.url} alt={image.alt || ''} loading="lazy" />
                      {currentMediaId === image.id && (
                        <div className="library-image-badge">
                          <FontAwesomeIcon icon={faCheck} /><span>Atual</span>
                        </div>
                      )}
                    </div>
                    <div className="library-image-info">
                      <p className="library-image-title" title={image.title ?? image.alt ?? 'Sem titulo'}>
                        {image.title ?? image.alt ?? 'Sem titulo'}
                      </p>
                      {(image.tags ?? []).length > 0 && (
                        <div className="media-grid-tags" style={{ marginTop: '0.25rem' }}>
                          {(image.tags ?? []).slice(0, 2).map((t) => (
                            <span key={t} className="media-tag-chip media-tag-chip--sm">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {selectedImageForCrop && (
        <FlexibleImageCropModal
          open={cropModalOpen}
          imageSrc={selectedImageForCrop.url}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
          title={cropTitle}
          initialRatio={initialCropForSelected?.ratio ?? cropRatio}
          initialCropData={initialCropForSelected}
          allowRatioChange={true}
        />
      )}
    </>
  );
}
