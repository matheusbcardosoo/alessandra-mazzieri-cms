import { describe, it, expect } from 'vitest';
import { buildBgStyle, sectionSettingsToBgConfig } from './backgroundHelpers';

describe('buildBgStyle', () => {
  it('mode none retorna wrapperStyle vazio sem overlayStyle', () => {
    const result = buildBgStyle({ mode: 'none' });
    expect(result.wrapperStyle).toEqual({});
    expect(result.overlayStyle).toBeUndefined();
  });

  it('mode color com cor retorna background inline', () => {
    const result = buildBgStyle({ mode: 'color', color: '#ff0000' });
    expect(result.wrapperStyle).toEqual({ background: '#ff0000' });
    expect(result.overlayStyle).toBeUndefined();
  });

  it('mode color sem cor retorna wrapperStyle vazio', () => {
    const result = buildBgStyle({ mode: 'color' });
    expect(result.wrapperStyle).toEqual({});
  });

  it('mode image com url retorna backgroundImage cover sem overlay quando opacity 0', () => {
    const result = buildBgStyle({
      mode: 'image',
      image: { mediaId: 'abc', url: '/foto.jpg', overlayOpacity: 0 }
    });
    expect(result.wrapperStyle.backgroundImage).toBe('url(/foto.jpg)');
    expect(result.wrapperStyle.backgroundSize).toBe('cover');
    expect(result.wrapperStyle.backgroundPosition).toBe('center');
    expect(result.wrapperStyle.position).toBe('relative');
    expect(result.overlayStyle).toBeUndefined();
  });

  it('mode image com overlay escuro retorna rgba preto', () => {
    const result = buildBgStyle({
      mode: 'image',
      image: { mediaId: 'abc', url: '/foto.jpg', overlayOpacity: 50, overlayColor: 'dark' }
    });
    expect(result.overlayStyle?.background).toBe('rgba(0,0,0,0.5)');
    expect(result.overlayStyle?.position).toBe('absolute');
    expect(result.overlayStyle?.pointerEvents).toBe('none');
  });

  it('mode image com overlay claro retorna rgba branco', () => {
    const result = buildBgStyle({
      mode: 'image',
      image: { mediaId: 'abc', url: '/foto.jpg', overlayOpacity: 40, overlayColor: 'light' }
    });
    expect(result.overlayStyle?.background).toBe('rgba(255,255,255,0.4)');
  });

  it('mode image sem url retorna wrapperStyle vazio', () => {
    const result = buildBgStyle({ mode: 'image' });
    expect(result.wrapperStyle).toEqual({});
  });
});

describe('sectionSettingsToBgConfig', () => {
  it('sem backgroundMode retorna mode none', () => {
    const result = sectionSettingsToBgConfig({});
    expect(result.mode).toBe('none');
  });

  it('backgroundMode color retorna config de cor', () => {
    const result = sectionSettingsToBgConfig({ backgroundMode: 'color', backgroundColor: '#abc' });
    expect(result).toEqual({ mode: 'color', color: '#abc' });
  });

  it('backgroundMode image retorna config de imagem', () => {
    const img = { mediaId: '1', url: '/a.jpg', overlayOpacity: 20, overlayColor: 'dark' as const };
    const result = sectionSettingsToBgConfig({ backgroundMode: 'image', backgroundImage: img });
    expect(result).toEqual({ mode: 'image', image: img });
  });

  it('backgroundMode none retorna mode none', () => {
    const result = sectionSettingsToBgConfig({ backgroundMode: 'none' });
    expect(result.mode).toBe('none');
  });
});
