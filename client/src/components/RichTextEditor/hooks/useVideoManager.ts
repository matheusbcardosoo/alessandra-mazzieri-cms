import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { positionFloating } from '@/utils/positionFloating';
import { parseVideoUrl, type VideoOrientation, type VideoPlatform } from '../extensions/videoEmbed';

const allowedSizes = ['25', '50', '75', '100'] as const;
const allowedAligns = ['left', 'center', 'right'] as const;

const isValidSize = (size?: string | null): size is (typeof allowedSizes)[number] =>
  allowedSizes.includes((size ?? '') as (typeof allowedSizes)[number]);

const isValidAlign = (align?: string | null): align is (typeof allowedAligns)[number] =>
  allowedAligns.includes((align ?? '') as (typeof allowedAligns)[number]);

function findVideoEmbedPos(editor: Editor, dom: HTMLElement): number | null {
  let pos: number | null = null;
  editor.state.doc.descendants((node, nodePos) => {
    if (pos !== null) return false;
    if (node.type.name !== 'videoEmbed') return true;
    if (editor.view.nodeDOM(nodePos) === dom) {
      pos = nodePos;
      return false;
    }
    return true;
  });
  return pos;
}

type VideoMeta = { platform: VideoPlatform; orientation: VideoOrientation; size: string; align: string };

type UseVideoManagerArgs = {
  editor: Editor | null;
};

export function useVideoManager({ editor }: UseVideoManagerArgs) {
  const videoPopoverRef = useRef<HTMLDivElement | null>(null);
  const activeVideoPosRef = useRef<number | null>(null);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);

  const [videoPopover, setVideoPopover] = useState<{ open: boolean; rect: DOMRect | null; target?: HTMLElement | null }>({
    open: false,
    rect: null,
    target: null
  });
  const [activeVideo, setActiveVideo] = useState<HTMLElement | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [videoPlacement, setVideoPlacement] = useState<'top' | 'bottom'>('top');
  const [videoArrowLeft, setVideoArrowLeft] = useState(0);

  const [editVideoModal, setEditVideoModal] = useState<{
    open: boolean;
    orientation: VideoOrientation;
    size: string;
    align: string;
    baseSize: string;
    baseAlign: string;
  }>({ open: false, orientation: 'landscape', size: '100', align: 'center', baseSize: '100', baseAlign: 'center' });
  const [confirmRemoveVideo, setConfirmRemoveVideo] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const remapActiveVideoPos = ({ transaction }: { transaction: { mapping: { map: (pos: number) => number } } }) => {
      if (activeVideoPosRef.current !== null) {
        activeVideoPosRef.current = transaction.mapping.map(activeVideoPosRef.current);
      }
    };
    editor.on('transaction', remapActiveVideoPos);
    return () => {
      editor.off('transaction', remapActiveVideoPos);
    };
  }, [editor]);

  const openVideoModal = () => {
    setVideoUrlInput('');
    setVideoUrlError(null);
    setShowVideoModal(true);
  };

  const insertVideo = () => {
    if (!editor) return;
    const parsed = parseVideoUrl(videoUrlInput);
    if (!parsed) {
      setVideoUrlError('Não reconheci esse link. Cole um link de vídeo do YouTube (ou Shorts), TikTok ou Instagram Reels.');
      return;
    }
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const node = state.schema.nodes.videoEmbed.create({
          url: videoUrlInput.trim(),
          platform: parsed.platform,
          embedUrl: parsed.embedUrl,
          orientation: parsed.orientation,
          size: '100',
          align: 'center'
        });
        tr.replaceSelectionWith(node);
        return true;
      })
      .run();
    setShowVideoModal(false);
    setVideoUrlInput('');
    setVideoUrlError(null);
  };

  const highlightVideo = (video: HTMLElement | null) => {
    const videos = editor?.view.dom.querySelectorAll('div[data-type="video-embed"]') ?? [];
    videos.forEach((v) => v.classList.remove('is-active'));
    if (video) video.classList.add('is-active');
  };

  const positionVideoPopover = (rect: DOMRect | null) => {
    if (!rect || !videoPopoverRef.current) return;
    const { top, left, placement, arrowLeft } = positionFloating(rect, videoPopoverRef.current);
    setVideoArrowLeft(arrowLeft);
    setVideoPlacement(placement);
    setVideoPopover((prev) => ({ ...prev, rect: new DOMRect(left, top, rect.width, rect.height) }));
  };

  useLayoutEffect(() => {
    if (videoPopover.open) {
      positionVideoPopover(videoPopover.target?.getBoundingClientRect() ?? videoPopover.rect);
    }
  }, [videoPopover.open]);

  useEffect(() => {
    if (!videoPopover.open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (videoPopoverRef.current && !videoPopoverRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('div[data-type="video-embed"]')) return;
        setVideoPopover({ open: false, rect: null, target: null });
        highlightVideo(null);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVideoPopover({ open: false, rect: null, target: null });
        highlightVideo(null);
      }
    };
    const handleScroll = () => setVideoPopover((prev) => ({ ...prev, open: false }));
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [videoPopover.open]);

  const openFromNodeClick = (video: HTMLElement) => {
    const orientation: VideoOrientation = video.getAttribute('data-orientation') === 'vertical' ? 'vertical' : 'landscape';
    const size = video.getAttribute('data-size') ?? '100';
    const align = video.getAttribute('data-align') ?? 'center';
    const platform = (video.getAttribute('data-platform') ?? 'youtube') as VideoPlatform;
    setActiveVideo(video);
    activeVideoPosRef.current = editor ? findVideoEmbedPos(editor, video) : null;
    setVideoMeta({ platform, orientation, size, align });
    const rect = video.getBoundingClientRect();
    positionVideoPopover(rect);
    setVideoPopover({ open: true, rect, target: video });
    highlightVideo(video);
  };

  const closeVideoPopover = () => {
    setActiveVideo(null);
    activeVideoPosRef.current = null;
    setVideoPopover({ open: false, rect: null, target: null });
  };

  const openVideoEditModal = () => {
    if (!videoMeta) return;
    setEditVideoModal({
      open: true,
      orientation: videoMeta.orientation,
      size: videoMeta.size,
      align: videoMeta.align,
      baseSize: videoMeta.size,
      baseAlign: videoMeta.align
    });
    setVideoPopover((prev) => ({ ...prev, open: false }));
  };

  const applyVideoEdits = () => {
    if (!editor) return;
    const pos = activeVideoPosRef.current;
    if (pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'videoEmbed') return;
    const size = isValidSize(editVideoModal.size) ? editVideoModal.size : '100';
    const align = isValidAlign(editVideoModal.align) ? editVideoModal.align : 'center';
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, size, align });
        return true;
      })
      .run();
    setVideoMeta((prev) => (prev ? { ...prev, size, align } : prev));
    setEditVideoModal((prev) => ({ ...prev, open: false }));
  };

  const requestRemoveVideo = () => {
    if (!activeVideo) return;
    setVideoPopover({ open: false, rect: null, target: null });
    setConfirmRemoveVideo(true);
  };

  const executeRemoveVideo = () => {
    if (!editor) return;
    const pos = activeVideoPosRef.current;
    if (pos !== null) {
      const node = editor.state.doc.nodeAt(pos);
      if (node && node.type.name === 'videoEmbed') {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      }
    }
    activeVideoPosRef.current = null;
    highlightVideo(null);
    setConfirmRemoveVideo(false);
  };

  return {
    videoPopoverRef,
    showVideoModal,
    setShowVideoModal,
    videoUrlInput,
    setVideoUrlInput,
    videoUrlError,
    videoPopover,
    videoMeta,
    videoPlacement,
    videoArrowLeft,
    editVideoModal,
    setEditVideoModal,
    confirmRemoveVideo,
    setConfirmRemoveVideo,
    openVideoModal,
    insertVideo,
    openFromNodeClick,
    closeVideoPopover,
    openVideoEditModal,
    applyVideoEdits,
    requestRemoveVideo,
    executeRemoveVideo
  };
}
