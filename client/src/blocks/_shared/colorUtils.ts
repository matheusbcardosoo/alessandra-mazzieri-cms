export type ColorMode = 'default' | 'custom';

// Cor primária do tema (para pré-preencher o color picker no modo "Personalizado").
export function getPrimaryHex(): string {
  if (typeof window === 'undefined') return '#8a3651';
  const v = getComputedStyle(document.body).getPropertyValue('--color-terracotta').trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#8a3651';
}
