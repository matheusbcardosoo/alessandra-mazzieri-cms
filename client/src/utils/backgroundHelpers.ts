import type { CSSProperties } from 'react';
import type { BackgroundImageConfig } from '@/types';

export type BackgroundConfig = {
  mode: 'none' | 'color' | 'image';
  color?: string;
  image?: BackgroundImageConfig;
};

export type BgStyleResult = {
  wrapperStyle: CSSProperties;
  overlayStyle?: CSSProperties;
};

export function buildBgStyle(config: BackgroundConfig): BgStyleResult {
  if (config.mode === 'color' && config.color) {
    return { wrapperStyle: { background: config.color } };
  }

  if (config.mode === 'image' && config.image?.url) {
    const { url, overlayOpacity = 0, overlayColor = 'dark' } = config.image;
    const wrapperStyle: CSSProperties = {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    };
    const overlayStyle: CSSProperties | undefined =
      overlayOpacity > 0
        ? {
            position: 'absolute',
            inset: 0,
            background:
              overlayColor === 'light'
                ? `rgba(255,255,255,${overlayOpacity / 100})`
                : `rgba(0,0,0,${overlayOpacity / 100})`,
            pointerEvents: 'none'
          }
        : undefined;
    return { wrapperStyle, overlayStyle };
  }

  return { wrapperStyle: {} };
}

export function sectionSettingsToBgConfig(settings: {
  backgroundMode?: 'none' | 'color' | 'image';
  backgroundColor?: string;
  backgroundImage?: BackgroundImageConfig;
}): BackgroundConfig {
  if (settings.backgroundMode === 'color') {
    return { mode: 'color', color: settings.backgroundColor };
  }
  if (settings.backgroundMode === 'image') {
    return { mode: 'image', image: settings.backgroundImage };
  }
  return { mode: 'none' };
}
