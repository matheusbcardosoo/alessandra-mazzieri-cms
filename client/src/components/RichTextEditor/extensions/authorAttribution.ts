import { Node, mergeAttributes } from '@tiptap/core';

export type AuthorVariant = 'heading' | 'inline';

export const AuthorAttribution = Node.create({
  name: 'authorAttribution',
  group: 'inline',
  inline: true,
  content: 'text*',

  addAttributes() {
    return {
      variant: { default: 'inline' as AuthorVariant, rendered: false }
    };
  },

  parseHTML() {
    return [
      { tag: 'span.rte-author[data-type="quote-author"]', attrs: { variant: 'heading' } },
      { tag: 'strong.rte-author-inline[data-type="quote-author-inline"]', attrs: { variant: 'inline' } }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = node.attrs.variant as AuthorVariant;
    const tag = variant === 'heading' ? 'span' : 'strong';
    const className = variant === 'heading' ? 'rte-author' : 'rte-author-inline';
    const dataType = variant === 'heading' ? 'quote-author' : 'quote-author-inline';
    return [tag, mergeAttributes(HTMLAttributes, { class: className, 'data-type': dataType }), 0];
  }
});
