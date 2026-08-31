import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import { positionFloating } from '@/utils/positionFloating';

type UseLinkManagerArgs = {
  editor: Editor | null;
};

export function useLinkManager({ editor }: UseLinkManagerArgs) {
  const clickedLinkRef = useRef<HTMLAnchorElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [hasExistingLink, setHasExistingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPopover, setLinkPopover] = useState<{ open: boolean; href: string; rect: DOMRect | null }>({
    open: false,
    href: '',
    rect: null
  });
  const [linkAnchorRect, setLinkAnchorRect] = useState<{ top: number; left: number } | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const [arrowLeft, setArrowLeft] = useState(0);

  useEffect(() => {
    if (!showLinkModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowLinkModal(false);
        setLinkPopover((prev) => ({ ...prev, open: false }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLinkModal]);

  useEffect(() => {
    if (!linkPopover.open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('a')) return;
        setLinkPopover((prev) => ({ ...prev, open: false }));
      }
    };
    const handleScroll = () => setLinkPopover((prev) => ({ ...prev, open: false }));
    const handleResize = () => setLinkPopover((prev) => ({ ...prev, open: false }));
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [linkPopover.open]);

  const getLinkRangeAtSelection = (): { from: number; to: number } | null => {
    if (!editor) return null;
    const { $from } = editor.state.selection;
    return getMarkRange($from, editor.schema.marks.link) ?? null;
  };

  const openLinkModal = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const selected = empty ? '' : editor.state.doc.textBetween(from, to);
    const range = getLinkRangeAtSelection();
    const href = range
      ? (editor.state.doc.nodeAt(range.from)?.marks.find((m) => m.type.name === 'link')?.attrs.href ?? '')
      : '';
    const anchorText = range ? editor.state.doc.textBetween(range.from, range.to) : '';
    setLinkUrl(href);
    setLinkText(selected || anchorText);
    setSelectedText(selected);
    setHasExistingLink(!!range);
    setLinkError(null);
    setShowLinkModal(true);
  };

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    return `https://${trimmed}`;
  };

  const applyLink = () => {
    if (!editor) return;
    const normalized = normalizeUrl(linkUrl);
    if (!normalized) {
      setLinkError('Informe uma URL.');
      return;
    }
    const { from, to, empty } = editor.state.selection;
    const hasSelection = !empty;
    const textForInsert = hasSelection ? editor.state.doc.textBetween(from, to) : linkText.trim();
    const existingRange = getLinkRangeAtSelection();

    if (existingRange) {
      const currentText = editor.state.doc.textBetween(existingRange.from, existingRange.to);
      if (textForInsert && textForInsert !== currentText) {
        editor
          .chain()
          .focus()
          .insertContentAt(existingRange, {
            type: 'text',
            text: textForInsert,
            marks: [{ type: 'link', attrs: { href: normalized } }]
          })
          .run();
      } else {
        editor.chain().focus().setTextSelection(existingRange).extendMarkRange('link').setLink({ href: normalized }).run();
      }
    } else if (hasSelection) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
    } else {
      if (!textForInsert) {
        setLinkError('Selecione um texto ou informe o texto do link.');
        return;
      }
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: textForInsert, marks: [{ type: 'link', attrs: { href: normalized } }] })
        .run();
    }

    setShowLinkModal(false);
    setLinkError(null);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const removeLink = () => {
    if (!editor) return;
    const range = getLinkRangeAtSelection();
    if (range) {
      editor.chain().focus().setTextSelection(range).unsetLink().run();
    }
    setShowLinkModal(false);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const positionPopover = () => {
    const anchor = clickedLinkRef.current;
    const pop = popoverRef.current;
    if (!anchor || !pop) return;
    const { top, left, placement, arrowLeft: nextArrowLeft } = positionFloating(anchor.getBoundingClientRect(), pop);
    setArrowLeft(nextArrowLeft);
    setPopoverPlacement(placement);
    setLinkAnchorRect({ top, left });
  };

  useLayoutEffect(() => {
    if (linkPopover.open) {
      positionPopover();
    }
  }, [linkPopover.open, linkPopover.href]);

  const openFromAnchorClick = (anchor: HTMLAnchorElement) => {
    if (!editor) return;
    clickedLinkRef.current = anchor;
    const pos = editor.view.posAtDOM(anchor, 0);
    const $pos = editor.state.doc.resolve(pos);
    const range = getMarkRange($pos, editor.schema.marks.link);
    if (range) {
      editor.commands.setTextSelection(range);
    }
    setLinkUrl(anchor.getAttribute('href') ?? '');
    setLinkText(anchor.textContent ?? '');
    setSelectedText(anchor.textContent ?? '');
    setHasExistingLink(true);
    setLinkPopover({ open: true, href: anchor.getAttribute('href') ?? '', rect: anchor.getBoundingClientRect() });
  };

  const closeLinkPopover = () => setLinkPopover((prev) => ({ ...prev, open: false }));

  const handleEditLink = () => {
    setShowLinkModal(true);
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  const handleRemoveLinkFromPopover = () => {
    removeLink();
    setLinkPopover((prev) => ({ ...prev, open: false }));
  };

  return {
    popoverRef,
    showLinkModal,
    setShowLinkModal,
    selectedText,
    hasExistingLink,
    linkUrl,
    setLinkUrl,
    linkText,
    setLinkText,
    linkError,
    linkPopover,
    linkAnchorRect,
    popoverPlacement,
    arrowLeft,
    openLinkModal,
    applyLink,
    removeLink,
    openFromAnchorClick,
    closeLinkPopover,
    handleEditLink,
    handleRemoveLinkFromPopover
  };
}
