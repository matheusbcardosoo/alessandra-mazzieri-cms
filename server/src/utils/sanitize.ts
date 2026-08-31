import sanitizeHtml, { Attributes } from 'sanitize-html';

export function sanitizeContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'blockquote', 'iframe']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'data-align', 'data-type', 'data-size'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class', 'data-type', 'data-size', 'data-align'],
      figure: ['class', 'data-type', 'data-size', 'data-align'],
      div: ['class', 'data-type', 'data-platform', 'data-orientation', 'data-size', 'data-align', 'data-url'],
      iframe: ['src', 'title', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'frameborder'],
      a: ['href', 'name', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.tiktok.com', 'www.instagram.com'],
    allowIframeRelativeUrls: false,
    transformTags: {
      a: (tagName: string, attribs: Attributes) => ({
        tagName,
        attribs: { ...attribs, rel: 'noopener noreferrer' }
      })
    }
  });
}
