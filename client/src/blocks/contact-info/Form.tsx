import { RichTextEditor } from '@/components/RichTextEditor';
import type { ContactInfoBlockData } from '@/types';
import type { BlockFormProps } from '../_shared/types';

export function ContactInfoForm({ value, onChange }: BlockFormProps<ContactInfoBlockData>) {
  return (
    <div className="page-block-form">
      <div className="page-block-form-grid">
        <div className="editor-field" style={{ gridColumn: '1 / -1' }}>
          <label>Título e descrição (HTML)</label>
          <RichTextEditor
            value={value.titleHtml || '<h2>Preferiu falar direto?</h2><p>Escolha a forma de contato que preferir:</p>'}
            onChange={(html) => onChange({ ...value, titleHtml: html })}
            placeholder="Ex: <h2>Entre em contato</h2><p>Escolha a melhor forma de falar comigo</p>"
          />
        </div>

        <div className="editor-field">
          <label>Texto do botão WhatsApp</label>
          <input
            type="text"
            value={value.whatsappLabel || 'Enviar mensagem'}
            onChange={(e) => onChange({ ...value, whatsappLabel: e.target.value })}
            placeholder="Enviar mensagem"
          />
        </div>

        <div className="editor-field">
          <label>Estilo do botão WhatsApp</label>
          <select
            value={value.whatsappVariant || 'primary'}
            onChange={(e) => onChange({ ...value, whatsappVariant: e.target.value as 'primary' | 'secondary' | 'tertiary' })}
          >
            <option value="primary">Primário (destaque)</option>
            <option value="secondary">Secundário</option>
            <option value="tertiary">Terciário (discreto)</option>
          </select>
        </div>

        <div className="editor-field">
          <label>Título das redes sociais</label>
          <input
            type="text"
            value={value.socialLinksTitle || 'Redes Sociais'}
            onChange={(e) => onChange({ ...value, socialLinksTitle: e.target.value })}
            placeholder="Redes Sociais"
          />
        </div>

        <div className="editor-field">
          <label>Estilo das redes sociais</label>
          <select
            value={value.socialLinksVariant || 'list'}
            onChange={(e) => onChange({ ...value, socialLinksVariant: e.target.value as 'list' | 'icons' })}
          >
            <option value="list">Lista (com texto)</option>
            <option value="icons">Apenas ícones</option>
          </select>
        </div>
      </div>

      <div className="editor-help" style={{ marginTop: '1rem' }}>
        <p><strong>Dica:</strong> O número do WhatsApp e as redes sociais são configurados em <strong>Configurações → Informações do Site</strong>.</p>
      </div>
    </div>
  );
}
