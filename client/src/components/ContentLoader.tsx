import type { CSSProperties } from 'react';
import './ContentLoader.css';

type ContentLoaderProps = {
  message?: string;
  minHeight?: string | number;
};

export function ContentLoader({ message = 'Carregando conteúdo...', minHeight = '400px' }: ContentLoaderProps) {
  return (
    <div
      className="content-loader"
      style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight } as CSSProperties}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="content-loader-spinner" aria-hidden="true">
        <div className="spinner-ring" />
      </div>
      <p className="content-loader-text">{message}</p>
    </div>
  );
}
