import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { fetchMedia, uploadMedia } from '@/api/queries';
import type { Media } from '@/types';
import { positionFloating } from '@/utils/positionFloating';

const allowedSizes = ['25', '50', '75', '100'] as const;
const allowedAligns = ['left', 'center', 'right'] as const;

const isValidSize = (size?: string | null): size is (typeof allowedSizes)[number] =>
  allowedSizes.includes((size ?? '') as (typeof allowedSizes)[number]);

const isValidAlign = (align?: string | null): align is (typeof allowedAligns)[number] =>
  allowedAligns.includes((align ?? '') as (typeof allowedAligns)[number]);

function findImageFigurePos(editor: Editor, dom: HTMLElement): number | null {
  let pos: number | null = null;
  editor.state.doc.descendants((node, nodePos) => {
    if (pos !== null) return false;
    if (node.type.name !== 'imageFigure') return true;
    if (editor.view.nodeDOM(nodePos) === dom) {
      pos = nodePos;
      return false;
    }
    return true;
  });
  return pos;
}

type UseImageManagerArgs = {
  editor: Editor | null;
};

export function useImageManager({ editor }: UseImageManagerArgs) {
  const imagePopoverRef = useRef<HTMLDivElement | null>(null);
  const imageAltInputRef = useRef<HTMLInputElement | null>(null);
  // Tracks the active figure by document position (not DOM identity): Tiptap
  // re-renders a node's DOM whenever its attrs change (e.g. when a background
  // upload finishes while the edit modal is still open), which would silently
  // orphan a captured DOM reference. Position survives attr-only updates and
  // is remapped through `transaction.mapping` for structural edits elsewhere.
  const activeFigurePosRef = useRef<number | null>(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState('');
  const [imagePopover, setImagePopover] = useState<{ open: boolean; rect: DOMRect | null; target?: HTMLElement | null }>(
    { open: false, rect: null, target: null }
  );
  const [activeFigure, setActiveFigure] = useState<HTMLElement | null>(null);
  const [imageMeta, setImageMeta] = useState<{ src: string; alt: string; size: string; align: string } | null>(null);
  const [imagePlacement, setImagePlacement] = useState<'top' | 'bottom'>('top');
  const [imageArrowLeft, setImageArrowLeft] = useState(0);
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string } | null>(null);
  const [editImageModal, setEditImageModal] = useState<{
    open: boolean;
    src: string;
    alt: string;
    size: string;
    align: string;
    baseAlt: string;
    baseSize: string;
    baseAlign: string;
  }>({ open: false, src: '', alt: '', size: '100', align: 'center', baseAlt: '', baseSize: '100', baseAlign: 'center' });
  const [confirmRemoveImage, setConfirmRemoveImage] = useState(false);

  useEffect(() => {
    if (!showImageModal || media.length) return;
    fetchMedia().then(setMedia).catch(() => {});
  }, [showImageModal, media.length]);

  useEffect(() => {
    if (!editor) return;
    const remapActiveFigurePos = ({ transaction }: { transaction: { mapping: { map: (pos: number) => number } } }) => {
      if (activeFigurePosRef.current !== null) {
        activeFigurePosRef.current = transaction.mapping.map(activeFigurePosRef.current);
      }
    };
    editor.on('transaction', remapActiveFigurePos);
    return () => {
      editor.off('transaction', remapActiveFigurePos);
    };
  }, [editor]);

  const openImageModal = () => {
    setShowImageModal(true);
    setActiveTab('library');
    setUploadAlt('');
  };

  const insertImage = (src: string, alt?: string, status: 'idle' | 'uploading' | 'error' = 'idle') => {
    if (!editor) return null;
    let insertedPos: number | null = null;
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        insertedPos = tr.selection.from;
        const node = state.schema.nodes.imageFigure.create(
          { src, alt: alt ?? '', size: '100', align: 'center', status },
          alt ? state.schema.text(alt) : undefined
        );
        tr.replaceSelectionWith(node);
        return true;
      })
      .run();
    return insertedPos;
  };

  const handleSelectFromLibrary = (item: Media) => {
    insertImage(item.url, item.alt ?? item.id);
    setShowImageModal(false);
  };

  const handleUploadNow = async (file: File, alt?: string) => {
    if (!editor) return;
    const objectUrl = URL.createObjectURL(file);
    const insertedPos = insertImage(objectUrl, alt, 'uploading');
    setShowImageModal(false);
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadMedia({ file, alt });
      if (insertedPos !== null) {
        const node = editor.state.doc.nodeAt(insertedPos);
        if (node && node.type.name === 'imageFigure') {
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(insertedPos, undefined, {
                ...node.attrs,
                src: uploaded.url,
                alt: uploaded.alt ?? alt ?? '',
                status: 'idle'
              });
              return true;
            })
            .run();
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha no upload');
      if (insertedPos !== null) {
        const node = editor.state.doc.nodeAt(insertedPos);
        if (node && node.type.name === 'imageFigure') {
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(insertedPos, undefined, { ...node.attrs, status: 'error' });
              return true;
            })
            .run();
        }
      }
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const highlightFigure = (figure: HTMLElement | null) => {
    const figures = editor?.view.dom.querySelectorAll('figure[data-type="image"]') ?? [];
    figures.forEach((f) => f.classList.remove('is-active'));
    if (figure) figure.classList.add('is-active');
  };

  const positionImagePopover = (rect: DOMRect | null) => {
    if (!rect || !imagePopoverRef.current) return;
    const { top, left, placement, arrowLeft } = positionFloating(rect, imagePopoverRef.current);
    setImageArrowLeft(arrowLeft);
    setImagePlacement(placement);
    setImagePopover((prev) => ({ ...prev, rect: new DOMRect(left, top, rect.width, rect.height) }));
  };

  useLayoutEffect(() => {
    if (imagePopover.open) {
      positionImagePopover(imagePopover.target?.getBoundingClientRect() ?? imagePopover.rect);
    }
  }, [imagePopover.open]);

  useEffect(() => {
    if (!imagePopover.open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (imagePopoverRef.current && !imagePopoverRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('figure[data-type="image"]')) return;
        setImagePopover({ open: false, rect: null, target: null });
        highlightFigure(null);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImagePopover({ open: false, rect: null, target: null });
        highlightFigure(null);
      }
    };
    const handleScroll = () => setImagePopover((prev) => ({ ...prev, open: false }));
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [imagePopover.open]);

  const openFromFigureClick = (figure: HTMLElement) => {
    const img = figure.querySelector('img');
    const size = figure.getAttribute('data-size') ?? '100';
    const align = figure.getAttribute('data-align') ?? 'center';
    setActiveFigure(figure);
    activeFigurePosRef.current = editor ? findImageFigurePos(editor, figure) : null;
    setImageMeta({ src: img?.getAttribute('src') ?? '', alt: img?.getAttribute('alt') ?? '', size, align });
    const rect = figure.getBoundingClientRect();
    positionImagePopover(rect);
    setImagePopover({ open: true, rect, target: figure });
    highlightFigure(figure);
  };

  const closeImagePopover = () => {
    setActiveFigure(null);
    activeFigurePosRef.current = null;
    setImagePopover({ open: false, rect: null, target: null });
  };

  const openImageLightbox = () => {
    if (imageMeta?.src) {
      setLightbox({ open: true, src: imageMeta.src, alt: imageMeta.alt });
    }
  };

  const openImageEditModal = () => {
    if (!imageMeta) return;
    setEditImageModal({
      open: true,
      src: imageMeta.src,
      alt: imageMeta.alt,
      size: imageMeta.size,
      align: imageMeta.align,
      baseAlt: imageMeta.alt,
      baseSize: imageMeta.size,
      baseAlign: imageMeta.align
    });
    setImagePopover((prev) => ({ ...prev, open: false }));
  };

  const applyImageEdits = () => {
    if (!editor) return;
    const pos = activeFigurePosRef.current;
    if (pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'imageFigure') return;
    const size = isValidSize(editImageModal.size) ? editImageModal.size : '100';
    const align = isValidAlign(editImageModal.align) ? editImageModal.align : 'center';
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt: editImageModal.alt, size, align });
        return true;
      })
      .run();
    setImageMeta((prev) => (prev ? { ...prev, alt: editImageModal.alt, size, align } : prev));
    setEditImageModal((prev) => ({ ...prev, open: false }));
  };

  const requestRemoveImage = () => {
    if (!activeFigure) return;
    setImagePopover({ open: false, rect: null, target: null });
    setConfirmRemoveImage(true);
  };

  const executeRemoveImage = () => {
    if (!editor) return;
    const pos = activeFigurePosRef.current;
    if (pos !== null) {
      const node = editor.state.doc.nodeAt(pos);
      if (node && node.type.name === 'imageFigure') {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      }
    }
    activeFigurePosRef.current = null;
    highlightFigure(null);
    setConfirmRemoveImage(false);
  };

  return {
    imagePopoverRef,
    imageAltInputRef,
    showImageModal,
    setShowImageModal,
    media,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    uploading,
    uploadError,
    uploadAlt,
    setUploadAlt,
    imagePopover,
    imageMeta,
    imagePlacement,
    imageArrowLeft,
    lightbox,
    setLightbox,
    editImageModal,
    setEditImageModal,
    confirmRemoveImage,
    setConfirmRemoveImage,
    openImageModal,
    handleSelectFromLibrary,
    handleUploadNow,
    openFromFigureClick,
    closeImagePopover,
    openImageLightbox,
    openImageEditModal,
    applyImageEdits,
    requestRemoveImage,
    executeRemoveImage
  };
}
