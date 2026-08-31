import DOMPurify from 'dompurify';

export function RichText({ html }: { html: string }) {
  // DOMPurify precisa de um `window` real — não existe em SSR (Node). O
  // conteúdo já chega sanitizado do backend (sanitizeContent/sanitize-html
  // em server/src/utils/sanitize.ts antes de salvar), então no server
  // renderizamos o HTML como veio e deixamos a sanitização extra (defesa em
  // profundidade) para o client, onde `window` existe.
  const clean =
    typeof window === 'undefined'
      ? html
      : DOMPurify.sanitize(html, {
          ADD_TAGS: ['figure', 'iframe'],
          ADD_ATTR: [
            'class',
            'data-type',
            'data-size',
            'data-align',
            'data-platform',
            'data-orientation',
            'data-url',
            'allow',
            'allowfullscreen',
            'referrerpolicy',
            'frameborder',
            'loading',
            'title'
          ],
          ALLOW_DATA_ATTR: true
        });
  return <div className="rich-content" dangerouslySetInnerHTML={{ __html: clean }} />;
}
