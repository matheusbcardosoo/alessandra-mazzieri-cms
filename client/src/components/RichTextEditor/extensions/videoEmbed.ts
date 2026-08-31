import { Node, mergeAttributes } from '@tiptap/core';

const allowedSizes = ['25', '50', '75', '100'] as const;
const allowedAligns = ['left', 'center', 'right'] as const;
const allowedPlatforms = ['youtube', 'youtube-shorts', 'tiktok', 'instagram'] as const;
const allowedOrientations = ['landscape', 'vertical'] as const;

type Size = (typeof allowedSizes)[number];
type Align = (typeof allowedAligns)[number];
export type VideoPlatform = (typeof allowedPlatforms)[number];
export type VideoOrientation = (typeof allowedOrientations)[number];

const isValidSize = (value?: string | null): value is Size => allowedSizes.includes((value ?? '') as Size);
const isValidAlign = (value?: string | null): value is Align => allowedAligns.includes((value ?? '') as Align);
const isValidPlatform = (value?: string | null): value is VideoPlatform => allowedPlatforms.includes((value ?? '') as VideoPlatform);
const isValidOrientation = (value?: string | null): value is VideoOrientation =>
  allowedOrientations.includes((value ?? '') as VideoOrientation);

export type ParsedVideo = {
  platform: VideoPlatform;
  orientation: VideoOrientation;
  embedUrl: string;
};

/**
 * Recognizes YouTube (watch/youtu.be/embed), YouTube Shorts, TikTok and
 * Instagram Reels/posts links and turns them into an official embed URL.
 * Anything else (including tiktok's vm.tiktok.com short links, which need a
 * server-side redirect resolve we don't do) returns null.
 */
export function parseVideoUrl(rawUrl: string): ParsedVideo | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    if (!id) return null;
    return { platform: 'youtube', orientation: 'landscape', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) {
      return {
        platform: 'youtube-shorts',
        orientation: 'vertical',
        embedUrl: `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`
      };
    }
    const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) {
      return { platform: 'youtube', orientation: 'landscape', embedUrl: `https://www.youtube-nocookie.com/embed/${embedMatch[1]}` };
    }
    const id = url.searchParams.get('v');
    if (id) {
      return { platform: 'youtube', orientation: 'landscape', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    return null;
  }

  if (host === 'tiktok.com') {
    const match = url.pathname.match(/\/video\/(\d+)/);
    if (!match) return null;
    return { platform: 'tiktok', orientation: 'vertical', embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}` };
  }

  if (host === 'instagram.com') {
    const match = url.pathname.match(/^\/(reel|p|tv)\/([^/]+)/);
    if (!match) return null;
    return { platform: 'instagram', orientation: 'vertical', embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed` };
  }

  return null;
}

function readData<T extends string>(element: HTMLElement, name: string, isValid: (v?: string | null) => v is T, fallback: T): T {
  const value = element.getAttribute(name);
  return isValid(value) ? value : fallback;
}

export type VideoEmbedAttrs = {
  url: string;
  platform: VideoPlatform;
  embedUrl: string;
  orientation: VideoOrientation;
  size: Size;
  align: Align;
};

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: '', rendered: false },
      platform: { default: 'youtube', rendered: false },
      embedUrl: { default: '', rendered: false },
      orientation: { default: 'landscape', rendered: false },
      size: { default: '100', rendered: false },
      align: { default: 'center', rendered: false }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-embed"]',
        getAttrs: (element) => {
          if (typeof element === 'string' || typeof element.querySelector !== 'function') return false;
          const iframe = element.querySelector('iframe');
          if (!iframe) return false;
          return {
            url: element.getAttribute('data-url') ?? iframe.getAttribute('src') ?? '',
            platform: readData(element, 'data-platform', isValidPlatform, 'youtube'),
            embedUrl: iframe.getAttribute('src') ?? '',
            orientation: readData(element, 'data-orientation', isValidOrientation, 'landscape'),
            size: readData(element, 'data-size', isValidSize, '100'),
            align: readData(element, 'data-align', isValidAlign, 'center')
          };
        }
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { url, platform, embedUrl, orientation, size, align } = node.attrs as VideoEmbedAttrs;
    const wrapperClass = [
      'rte-video',
      `rte-video--${platform}`,
      `rte-video--${orientation}`,
      orientation === 'landscape' ? `rte-video--size-${size}` : '',
      `rte-video--align-${align}`
    ]
      .filter(Boolean)
      .join(' ');

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: wrapperClass,
        'data-type': 'video-embed',
        'data-platform': platform,
        'data-orientation': orientation,
        'data-size': size,
        'data-align': align,
        'data-url': url
      }),
      [
        'div',
        { class: 'rte-video-frame' },
        [
          'iframe',
          {
            src: embedUrl,
            title: 'Vídeo incorporado',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            allowfullscreen: 'true',
            loading: 'lazy',
            referrerpolicy: 'strict-origin-when-cross-origin',
            frameborder: '0'
          }
        ]
      ]
    ];
  }
});
