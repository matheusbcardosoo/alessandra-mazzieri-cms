import { describe, expect, it } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ImageFigure } from './imageFigure';

const extensions = [Document, Paragraph, Text, ImageFigure];

const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('ImageFigure round-trip', () => {
  it('preserves a figure that already has data-size/data-align (current normalized format)', () => {
    const html =
      '<figure class="rte-image rte-image--size-50 rte-image--align-right img-align-right" data-type="image" data-size="50" data-align="right"><img src="https://x.com/a.png" alt="Foto"><figcaption contenteditable="true">Foto</figcaption></figure>';
    expect(roundTrip(html)).toBe(html);
  });

  it('falls back to classes when data-size/data-align are missing (legacy pre-normalization content)', () => {
    const html =
      '<figure class="rte-image rte-image--size-25 rte-image--align-left" data-type="image"><img src="https://x.com/b.png" alt="B"><figcaption contenteditable="true">B</figcaption></figure>';
    const expected =
      '<figure class="rte-image rte-image--size-25 rte-image--align-left img-align-left" data-type="image" data-size="25" data-align="left"><img src="https://x.com/b.png" alt="B"><figcaption contenteditable="true">B</figcaption></figure>';
    expect(roundTrip(html)).toBe(expected);
  });

  it('defaults to size 100 / align center when nothing is present', () => {
    const html = '<figure data-type="image"><img src="https://x.com/c.png" alt=""><figcaption contenteditable="true"></figcaption></figure>';
    const expected =
      '<figure class="rte-image rte-image--size-100 rte-image--align-center img-align-center" data-type="image" data-size="100" data-align="center"><img src="https://x.com/c.png" alt=""><figcaption contenteditable="true"></figcaption></figure>';
    expect(roundTrip(html)).toBe(expected);
  });
});
