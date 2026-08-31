export type { FormBlockData, FormField } from '@/types';
import type { FormBlockData } from '@/types';

export const formDefault: FormBlockData = {
  title: 'Entre em contato',
  description: null,
  fields: [],
  submitLabel: 'Enviar',
  successMessage: 'Mensagem enviada com sucesso!',
  textColorMode: 'default',
  textColor: null,
  buttonColorMode: 'default',
  buttonColor: null
};
