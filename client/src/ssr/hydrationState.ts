import type { DehydratedState } from '@tanstack/react-query';

declare global {
  interface Window {
    __REACT_QUERY_STATE__?: DehydratedState;
  }
}

/**
 * Lê (uma única vez) o estado do React Query que o SSR embutiu no HTML via
 * `<script>window.__REACT_QUERY_STATE__ = ...</script>`. Undefined no
 * server e em qualquer página que não passou pelo SSR (não deveria
 * acontecer, mas fica defensivo).
 */
export function getInitialDehydratedState(): DehydratedState | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__REACT_QUERY_STATE__;
}
