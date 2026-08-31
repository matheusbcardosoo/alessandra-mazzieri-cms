import type React from 'react';
import type { PageBlock } from '@/types';

export interface BlockFormProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  onUploadingChange?: (uploading: boolean) => void;
  /**
   * Onde este form está sendo renderizado. Alguns blocos têm campos que só
   * fazem sentido (ou só funcionam) fora do contexto do Hero — ex.: o
   * bloco de imagem tem "Tamanho"/"Altura no Hero (%)" que a Hero V2 nunca
   * lê (ela sempre usa a altura definida pela própria estilização). Opcional
   * e ignorado pela maioria dos forms; existe pra permitir esse tipo de
   * ajuste sem duplicar o form inteiro.
   */
  context?: 'default' | 'hero';
}

export interface BlockRendererProps<T = unknown> {
  data: T;
  blockId?: string;
  pageSlug?: string;
  enableFormSubmit?: boolean;
  // Render prop para renderização recursiva do hero (evita dependência circular)
  renderChild?: (block: PageBlock) => React.ReactNode;
}

export interface BlockConfig<T = unknown> {
  label: string;
  defaultData: T;
  renderer: React.ComponentType<BlockRendererProps<T>>;
  form: React.ComponentType<BlockFormProps<T>>;
  icon?: string; // Emoji ou símbolo para exibição no modal
}
