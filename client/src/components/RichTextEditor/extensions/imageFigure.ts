import { Node, mergeAttributes } from '@tiptap/core';

const allowedSizes = ['25', '50', '75', '100'] as const;
const allowedAligns = ['left', 'center', 'right'] as const;

type Size = (typeof allowedSizes)[number];
type Align = (typeof allowedAligns)[number];

const isValidSize = (value?: string | null): value is Size => allowedSizes.includes((value ?? '') as Size);
const isValidAlign = (value?: string | null): value is Align => allowedAligns.includes((value ?? '') as Align);

function readSize(figure: HTMLElement): Size {
  const dataSize = figure.getAttribute('data-size');
  if (isValidSize(dataSize)) return dataSize;
  const fromClass = Array.from(figure.classList)
    .find((cls) => cls.startsWith('rte-image--size-'))
    ?.replace('rte-image--size-', '');
  if (isValidSize(fromClass)) return fromClass;
  return '100';
}

function readAlign(figure: HTMLElement): Align {
  const dataAlign = figure.getAttribute('data-align');
  if (isValidAlign(dataAlign)) return dataAlign;
  const fromClass =
    Array.from(figure.classList).find((cls) => cls.startsWith('rte-image--align-'))?.replace('rte-image--align-', '') ??
    Array.from(figure.classList).find((cls) => cls.startsWith('img-align-'))?.replace('img-align-', '');
  if (isValidAlign(fromClass)) return fromClass;
  return 'center';
}

export type ImageFigureAttrs = {
  src: string;
  alt: string;
  size: Size;
  align: Align;
  status: 'idle' | 'uploading' | 'error';
};

export const ImageFigure = Node.create({
  name: 'imageFigure',
  group: 'block',
  content: 'inline*',
  isolating: true,

  addAttributes() {
    return {
      src: { default: '', rendered: false },
      alt: { default: '', rendered: false },
      size: { default: '100', rendered: false },
      align: { default: 'center', rendered: false },
      status: { default: 'idle', rendered: false }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
        getAttrs: (element) => {
          if (typeof element === 'string' || typeof element.querySelector !== 'function') return false;
          const img = element.querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src') ?? '',
            alt: img.getAttribute('alt') ?? '',
            size: readSize(element),
            align: readAlign(element),
            status: 'idle'
          };
        }
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, size, align, status } = node.attrs as ImageFigureAttrs;
    const figureClass = [
      'rte-image',
      `rte-image--size-${size}`,
      `rte-image--align-${align}`,
      `img-align-${align}`,
      status === 'uploading' ? 'is-uploading' : '',
      status === 'error' ? 'has-error' : ''
    ]
      .filter(Boolean)
      .join(' ');

    const children: unknown[] = [
      ['img', { src, alt }],
      ['figcaption', { contenteditable: 'true' }, 0]
    ];
    if (status === 'uploading') {
      children.push(['div', { class: 'rte-image-overlay' }, 'Enviando...']);
    } else if (status === 'error') {
      children.push(['div', { class: 'rte-image-overlay error' }, 'Falha no upload']);
    }

    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        class: figureClass,
        'data-type': 'image',
        'data-size': size,
        'data-align': align
      }),
      ...children
    ];
  }
});
