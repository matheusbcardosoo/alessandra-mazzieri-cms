import { describe, expect, it } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { VideoEmbed, parseVideoUrl } from './videoEmbed';

const extensions = [Document, Paragraph, Text, VideoEmbed];
const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('parseVideoUrl', () => {
  it('parses a standard YouTube watch URL as landscape', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      platform: 'youtube',
      orientation: 'landscape',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    });
  });

  it('parses a youtu.be short link', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      platform: 'youtube',
      orientation: 'landscape',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    });
  });

  it('parses a YouTube embed URL', () => {
    expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({
      platform: 'youtube',
      orientation: 'landscape',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    });
  });

  it('parses a YouTube Shorts URL as vertical', () => {
    expect(parseVideoUrl('https://www.youtube.com/shorts/abc12345678')).toEqual({
      platform: 'youtube-shorts',
      orientation: 'vertical',
      embedUrl: 'https://www.youtube-nocookie.com/embed/abc12345678'
    });
  });

  it('parses a TikTok video URL as vertical', () => {
    expect(parseVideoUrl('https://www.tiktok.com/@someuser/video/7123456789012345678')).toEqual({
      platform: 'tiktok',
      orientation: 'vertical',
      embedUrl: 'https://www.tiktok.com/embed/v2/7123456789012345678'
    });
  });

  it('parses an Instagram Reel URL as vertical', () => {
    expect(parseVideoUrl('https://www.instagram.com/reel/Cabc123XYZ/')).toEqual({
      platform: 'instagram',
      orientation: 'vertical',
      embedUrl: 'https://www.instagram.com/reel/Cabc123XYZ/embed'
    });
  });

  it('parses an Instagram post URL', () => {
    expect(parseVideoUrl('https://www.instagram.com/p/Cabc123XYZ/')).toEqual({
      platform: 'instagram',
      orientation: 'vertical',
      embedUrl: 'https://www.instagram.com/p/Cabc123XYZ/embed'
    });
  });

  it('returns null for a vm.tiktok.com short link (not resolvable client-side)', () => {
    expect(parseVideoUrl('https://vm.tiktok.com/ZMabc123/')).toBeNull();
  });

  it('returns null for an unrecognized URL', () => {
    expect(parseVideoUrl('https://example.com/video/123')).toBeNull();
  });

  it('returns null for a non-URL string', () => {
    expect(parseVideoUrl('not a url')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseVideoUrl('   ')).toBeNull();
  });
});

describe('VideoEmbed round-trip', () => {
  it('preserves a landscape video embed', () => {
    const html =
      '<div class="rte-video rte-video--youtube rte-video--landscape rte-video--size-50 rte-video--align-center" data-type="video-embed" data-platform="youtube" data-orientation="landscape" data-size="50" data-align="center" data-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"><div class="rte-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Vídeo incorporado" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="true" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" frameborder="0"></iframe></div></div>';
    expect(roundTrip(html)).toBe(html);
  });

  it('preserves a vertical video embed without a size class', () => {
    const html =
      '<div class="rte-video rte-video--tiktok rte-video--vertical rte-video--align-left" data-type="video-embed" data-platform="tiktok" data-orientation="vertical" data-size="100" data-align="left" data-url="https://www.tiktok.com/@user/video/123"><div class="rte-video-frame"><iframe src="https://www.tiktok.com/embed/v2/123" title="Vídeo incorporado" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="true" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" frameborder="0"></iframe></div></div>';
    expect(roundTrip(html)).toBe(html);
  });

  it('defaults size/align/platform when missing', () => {
    const html = '<div data-type="video-embed"><div class="rte-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe></div></div>';
    const expected =
      '<div class="rte-video rte-video--youtube rte-video--landscape rte-video--size-100 rte-video--align-center" data-type="video-embed" data-platform="youtube" data-orientation="landscape" data-size="100" data-align="center" data-url="https://www.youtube-nocookie.com/embed/abc"><div class="rte-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/abc" title="Vídeo incorporado" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="true" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" frameborder="0"></iframe></div></div>';
    expect(roundTrip(html)).toBe(expected);
  });
});
