import { describe, expect, it } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import Text from '@tiptap/extension-text';
import { TextAlign } from './textAlign';

const extensions = [Document, Paragraph, Heading, Blockquote, Text, TextAlign];

const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('TextAlign round-trip', () => {
  it('preserves a paragraph already using the class+data-align format', () => {
    const html = '<p class="align-center" data-align="center">Centralizado</p>';
    expect(roundTrip(html)).toBe(html);
  });

  it('normalizes a legacy inline style="text-align" into the class+data-align format', () => {
    const html = '<p style="text-align: right">Direita</p>';
    const expected = '<p class="align-right" data-align="right">Direita</p>';
    expect(roundTrip(html)).toBe(expected);
  });

  it('applies to headings and blockquotes too', () => {
    const html = '<h2 class="align-justify" data-align="justify">Titulo</h2><blockquote class="align-left" data-align="left">Citacao</blockquote>';
    const expected = '<h2 class="align-justify" data-align="justify">Titulo</h2><blockquote class="align-left" data-align="left"><p>Citacao</p></blockquote>';
    expect(roundTrip(html)).toBe(expected);
  });

  it('leaves unaligned blocks without the attribute', () => {
    const html = '<p>Sem alinhamento</p>';
    expect(roundTrip(html)).toBe(html);
  });
});
