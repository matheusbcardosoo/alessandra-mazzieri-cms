import { describe, expect, it } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import Text from '@tiptap/extension-text';
import { AuthorAttribution } from './authorAttribution';

const extensions = [Document, Paragraph, Heading, Text, AuthorAttribution];

const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('AuthorAttribution round-trip', () => {
  it('preserves the heading variant (span.rte-author)', () => {
    const html = '<h2>Uma frase<span class="rte-author" data-type="quote-author">Carl Jung</span></h2>';
    expect(roundTrip(html)).toBe(html);
  });

  it('preserves the inline variant (strong.rte-author-inline)', () => {
    const html = '<p>Uma frase <strong class="rte-author-inline" data-type="quote-author-inline">Carl Jung</strong></p>';
    expect(roundTrip(html)).toBe(html);
  });
});
