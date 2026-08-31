import { useEffect, useState } from 'react';
import type React from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ConfirmModal, Modal } from '../AdminUI';
import {
  faBold,
  faItalic,
  faHeading,
  faListUl,
  faListOl,
  faQuoteLeft,
  faLink,
  faImage,
  faVideo,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify
} from '@fortawesome/free-solid-svg-icons';
import { TextAlign } from './extensions/textAlign';
import { ImageFigure } from './extensions/imageFigure';
import { VideoEmbed } from './extensions/videoEmbed';
import { AuthorAttribution } from './extensions/authorAttribution';
import { useLinkManager } from './hooks/useLinkManager';
import { useImageManager } from './hooks/useImageManager';
import { useVideoManager } from './hooks/useVideoManager';
import { RteLinkPopover } from './RteLinkPopover';
import { RteImagePopover } from './RteImagePopover';
import { RteLinkModal } from './RteLinkModal';
import { RteImageModal } from './RteImageModal';
import { RteVideoModal } from './RteVideoModal';
import { RteVideoPopover } from './RteVideoPopover';
import { RteVideoEditModal } from './RteVideoEditModal';
import { RteLightbox } from './RteLightbox';
import { RteImageEditModal } from './RteImageEditModal';

type Props = {
  value: string;
  onChange: (val: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, onUploadingChange }: Props) {
  const [authorModal, setAuthorModal] = useState<{ open: boolean; value: string }>({ open: false, value: '' });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
        },
        codeBlock: false,
        code: false,
        strike: false,
        underline: false,
        horizontalRule: false
      }),
      TextAlign,
      ImageFigure,
      VideoEmbed,
      AuthorAttribution
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'rte-editor' }
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML())
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  const linkManager = useLinkManager({ editor });
  const imageManager = useImageManager({ editor });
  const videoManager = useVideoManager({ editor });

  useEffect(() => {
    onUploadingChange?.(imageManager.uploading);
  }, [imageManager.uploading, onUploadingChange]);

  const blockAlign =
    useEditorState({
      editor,
      selector: ({ editor: ed }) => {
        if (!ed) return 'left' as const;
        if (ed.isActive({ align: 'center' })) return 'center' as const;
        if (ed.isActive({ align: 'right' })) return 'right' as const;
        if (ed.isActive({ align: 'justify' })) return 'justify' as const;
        return 'left' as const;
      }
    }) ?? 'left';

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const figure = target.closest('figure[data-type="image"]') as HTMLElement | null;
    if (figure) {
      linkManager.closeLinkPopover();
      videoManager.closeVideoPopover();
      imageManager.openFromFigureClick(figure);
      return;
    }

    const videoNode = target.closest('div[data-type="video-embed"]') as HTMLElement | null;
    if (videoNode) {
      linkManager.closeLinkPopover();
      imageManager.closeImagePopover();
      videoManager.openFromNodeClick(videoNode);
      return;
    }

    imageManager.closeImagePopover();
    videoManager.closeVideoPopover();
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (anchor) {
      linkManager.openFromAnchorClick(anchor);
    } else {
      linkManager.closeLinkPopover();
    }
  };

  const requestInsertQuoteAuthor = () => {
    setAuthorModal({ open: true, value: '' });
  };

  const applyQuoteAuthor = () => {
    if (!editor) return;
    const author = authorModal.value.trim();
    if (!author) return;

    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const { $from } = state.selection;
        let target: { node: ReturnType<typeof $from.node>; pos: number; depth: number } | null = null;
        for (let depth = $from.depth; depth >= 0; depth--) {
          const node = $from.node(depth);
          if (['heading', 'paragraph', 'blockquote', 'listItem'].includes(node.type.name)) {
            target = { node, pos: $from.before(depth), depth };
            break;
          }
        }
        if (!target) return false;

        const variant: 'heading' | 'inline' = target.node.type.name === 'heading' ? 'heading' : 'inline';
        const authorNode = state.schema.nodes.authorAttribution.create({ variant }, state.schema.text(author));
        const endPos = $from.end(target.depth);

        if (variant === 'heading') {
          let existingFrom: number | null = null;
          let existingTo: number | null = null;
          target.node.forEach((child, offset) => {
            if (existingFrom === null && child.type.name === 'authorAttribution' && child.attrs.variant === 'heading') {
              existingFrom = target!.pos + 1 + offset;
              existingTo = existingFrom + child.nodeSize;
            }
          });
          if (existingFrom !== null && existingTo !== null) {
            tr.replaceWith(existingFrom, existingTo, authorNode);
            return true;
          }
          tr.insert(endPos, authorNode);
          return true;
        }

        const needsSpace = target.node.textContent.length > 0 && !/\s$/.test(target.node.textContent);
        if (needsSpace) tr.insertText(' ', endPos);
        tr.insert(needsSpace ? endPos + 1 : endPos, authorNode);
        return true;
      })
      .run();

    setAuthorModal({ open: false, value: '' });
  };

  const toolbarGroups: {
    key: string;
    label: React.ReactNode;
    title: string;
    action: () => void;
  }[][] = [
    [
      { key: 'bold', label: <FontAwesomeIcon icon={faBold} />, title: 'Negrito', action: () => editor?.chain().focus().toggleBold().run() },
      { key: 'italic', label: <FontAwesomeIcon icon={faItalic} />, title: 'Itálico', action: () => editor?.chain().focus().toggleItalic().run() }
    ],
    [
      { key: 'p', label: <span className="rte-heading-icon">P</span>, title: 'Parágrafo / Texto normal', action: () => editor?.chain().focus().setParagraph().run() },
      {
        key: 'h2',
        label: (
          <span className="rte-heading-icon">
            <FontAwesomeIcon icon={faHeading} />
            <small>2</small>
          </span>
        ),
        title: 'Título 2',
        action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
      },
      {
        key: 'h3',
        label: (
          <span className="rte-heading-icon">
            <FontAwesomeIcon icon={faHeading} />
            <small>3</small>
          </span>
        ),
        title: 'Título 3',
        action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run()
      }
    ],
    [
      { key: 'ul', label: <FontAwesomeIcon icon={faListUl} />, title: 'Lista', action: () => editor?.chain().focus().toggleBulletList().run() },
      { key: 'ol', label: <FontAwesomeIcon icon={faListOl} />, title: 'Lista numerada', action: () => editor?.chain().focus().toggleOrderedList().run() }
    ],
    [{ key: 'quote', label: <FontAwesomeIcon icon={faQuoteLeft} />, title: 'Citação', action: () => editor?.chain().focus().toggleBlockquote().run() }],
    [
      { key: 'align-left', label: <FontAwesomeIcon icon={faAlignLeft} />, title: 'Alinhar à esquerda', action: () => editor?.chain().focus().setTextAlign('left').run() },
      { key: 'align-center', label: <FontAwesomeIcon icon={faAlignCenter} />, title: 'Centralizar', action: () => editor?.chain().focus().setTextAlign('center').run() },
      { key: 'align-right', label: <FontAwesomeIcon icon={faAlignRight} />, title: 'Alinhar à direita', action: () => editor?.chain().focus().setTextAlign('right').run() },
      { key: 'align-justify', label: <FontAwesomeIcon icon={faAlignJustify} />, title: 'Justificar', action: () => editor?.chain().focus().setTextAlign('justify').run() }
    ],
    [{ key: 'link', label: <FontAwesomeIcon icon={faLink} />, title: 'Inserir link', action: linkManager.openLinkModal }],
    [{ key: 'author', label: <span className="rte-heading-icon">Au</span>, title: 'Inserir autor da frase', action: requestInsertQuoteAuthor }],
    [{ key: 'image', label: <FontAwesomeIcon icon={faImage} />, title: 'Inserir imagem', action: imageManager.openImageModal }],
    [{ key: 'video', label: <FontAwesomeIcon icon={faVideo} />, title: 'Inserir vídeo', action: videoManager.openVideoModal }]
  ];

  return (
    <div className="rte-shell">
      <div className="rte-toolbar">
        {toolbarGroups.map((group) => (
          <div key={group.map((g) => g.key).join('-')} className="rte-toolbar-group">
            {group.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rte-btn ${item.key === `align-${blockAlign}` ? 'is-active' : ''}`}
                aria-label={item.title}
                title={item.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={item.action}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div onClick={handleEditorClick}>
        <EditorContent editor={editor} />
      </div>

      <RteImagePopover imageManager={imageManager} />
      <RteVideoPopover videoManager={videoManager} />
      <RteLinkPopover linkManager={linkManager} />
      <RteImageModal imageManager={imageManager} captureSelection={() => {}} />
      <RteVideoModal videoManager={videoManager} />
      <RteLinkModal linkManager={linkManager} />
      <RteLightbox imageManager={imageManager} />
      <RteImageEditModal imageManager={imageManager} />
      <RteVideoEditModal videoManager={videoManager} />

      <ConfirmModal
        isOpen={imageManager.confirmRemoveImage}
        title="Remover imagem"
        description="Tem certeza que deseja remover esta imagem do editor?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={imageManager.executeRemoveImage}
        onClose={() => imageManager.setConfirmRemoveImage(false)}
      />

      <ConfirmModal
        isOpen={videoManager.confirmRemoveVideo}
        title="Remover vídeo"
        description="Tem certeza que deseja remover este vídeo do editor?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={videoManager.executeRemoveVideo}
        onClose={() => videoManager.setConfirmRemoveVideo(false)}
      />

      <Modal
        isOpen={authorModal.open}
        title="Inserir autor"
        description="O nome será inserido como atribuição após o texto selecionado."
        onClose={() => setAuthorModal({ open: false, value: '' })}
        width={400}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" type="button" onClick={() => setAuthorModal({ open: false, value: '' })}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="button" onClick={applyQuoteAuthor} disabled={!authorModal.value.trim()}>
              Inserir
            </button>
          </div>
        }
      >
        <input
          className="rte-input"
          style={{ width: '100%' }}
          placeholder="Ex: Carl Jung"
          value={authorModal.value}
          autoFocus
          onChange={(e) => setAuthorModal((prev) => ({ ...prev, value: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyQuoteAuthor();
            }
            if (e.key === 'Escape') {
              setAuthorModal({ open: false, value: '' });
            }
          }}
        />
      </Modal>
    </div>
  );
}
