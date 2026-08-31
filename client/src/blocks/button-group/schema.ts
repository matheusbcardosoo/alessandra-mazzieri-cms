export type { ButtonGroupBlockData } from '@/types';
import type { ButtonGroupBlockData } from '@/types';

export const buttonGroupDefault: ButtonGroupBlockData = {
  buttons: [
    { label: 'Agendar sessão', href: '/contato', variant: 'primary', linkMode: 'manual' },
    { label: 'Saiba mais', href: '/sobre', variant: 'secondary', linkMode: 'manual' }
  ],
  align: 'start',
  stackOnMobile: true
};
