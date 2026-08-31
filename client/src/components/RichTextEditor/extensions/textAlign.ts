import { Extension } from '@tiptap/core';

const allowedAligns = ['left', 'center', 'right', 'justify'] as const;
type Align = (typeof allowedAligns)[number];

const isValidAlign = (value?: string | null): value is Align => allowedAligns.includes((value ?? '') as Align);

function readAlign(element: { classList: DOMTokenList; getAttribute: (name: string) => string | null; style: CSSStyleDeclaration }): Align | null {
  const fromClass = allowedAligns.find((a) => element.classList.contains(`align-${a}`));
  if (fromClass) return fromClass;
  const dataAlign = element.getAttribute('data-align');
  if (isValidAlign(dataAlign)) return dataAlign;
  const style = (element.style.textAlign || '').toLowerCase();
  if (style === 'start') return 'left';
  if (style === 'end') return 'right';
  if (isValidAlign(style)) return style;
  return null;
}

export type TextAlignOptions = {
  types: string[];
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: Align) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

export const TextAlign = Extension.create<TextAlignOptions>({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote', 'listItem']
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          align: {
            default: null,
            parseHTML: (element) => readAlign(element),
            renderHTML: (attrs) => {
              const align = attrs.align as Align | null;
              if (!align) return {};
              return { class: `align-${align}`, 'data-align': align };
            }
          }
        }
      }
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: Align) =>
        ({ commands }) =>
          this.options.types.every((type) => commands.updateAttributes(type, { align: alignment })),
      unsetTextAlign:
        () =>
        ({ commands }) =>
          this.options.types.every((type) => commands.resetAttributes(type, 'align'))
    };
  }
});
