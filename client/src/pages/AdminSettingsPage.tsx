import React, { useEffect, useRef, useState, useMemo, type Dispatch, type KeyboardEvent, type RefObject, type SetStateAction } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faTrash, faUpload } from '@fortawesome/free-solid-svg-icons';
import { ConfirmModal, Switch } from '../components/AdminUI';
import { toast } from '../components/toastStore';
import { SeoHead } from '../components/SeoHead';
import { ImageCropModal } from '../components/ImageCropModal';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { SocialLinksEditor } from '../components/SocialLinksEditor';
import { FontPicker } from '../components/FontPicker';
import { OfficeHoursEditor } from '../components/OfficeHoursEditor';
import { ColorField } from '../blocks/_shared/ColorField';
import { uploadMedia } from '../api/queries';
import { useAdminSiteSettings, useUpdateSiteSettings } from '../hooks/queries/useSiteSettings';
import { getApiErrorMessage } from '../utils/apiError';
import type { SiteSettings, SiteTheme, SiteThemeColors, SiteThemeElements, SiteThemePreset } from '../types';
import { GOOGLE_FONTS_HEADINGS, GOOGLE_FONTS_BODY } from '../constants/googleFonts';
import {
  DEFAULT_SITE_THEME,
  SITE_THEME_PRESETS,
  getDerivedElementColors,
  getPresetTheme,
  normalizeSiteTheme,
  siteThemeToCssVars,
  updateSiteThemeColor,
  updateSiteThemeElementColor
} from '../utils/siteTheme';
import {
  ALLOWED_LOGO_TYPES,
  LOGO_ASPECT,
  LOGO_HEIGHT,
  LOGO_MAX_FILE_SIZE_MB,
  LOGO_OUTPUT_MIME,
  LOGO_WIDTH
} from '../constants';
import '../public.css';
import '../admin.css';

type CropTask = { src: string; file: File };
type SettingsSetter = Dispatch<SetStateAction<SiteSettings>>;
type SettingsSectionId = 'identity' | 'appearance' | 'elements' | 'contact' | 'professional' | 'seo';

const maxLogoBytes = LOGO_MAX_FILE_SIZE_MB * 1024 * 1024;

const SETTINGS_SECTIONS: Array<{ id: SettingsSectionId; label: string; icon: string }> = [
  { id: 'identity', label: 'Identidade', icon: '◈' },
  { id: 'appearance', label: 'Aparência', icon: '⬡' },
  { id: 'elements', label: 'Elementos', icon: '▤' },
  { id: 'contact', label: 'Contato e redes', icon: '⌘' },
  { id: 'professional', label: 'Dados profissionais', icon: '⊡' },
  { id: 'seo', label: 'SEO e integrações', icon: '◎' }
];

const colorLabels: Record<keyof SiteThemeColors, string> = {
  background: 'Fundo',
  text: 'Texto principal',
  primary: 'Cor primária',
  accent: 'Destaque'
};

function createDefaultSettings(): SiteSettings {
  return {
    siteName: '',
    cnpj: '',
    professionalRegistration: '',
    contactEmail: '',
    logoUrl: null,
    phone: null,
    address: null,
    officeHours: null,
    socials: [],
    whatsappEnabled: false,
    whatsappLink: '',
    whatsappMessage: '',
    whatsappPosition: 'right',
    hideScheduleCta: false,
    brandTagline: '',
    theme: DEFAULT_SITE_THEME,
    metaDescription: null,
    ogImageUrl: null,
    gaId: null,
    gscVerification: null
  };
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function validateLogo(file: File) {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) return 'Use PNG, WEBP ou JPG.';
  if (file.size > maxLogoBytes) return `Arquivo maior que ${LOGO_MAX_FILE_SIZE_MB}MB.`;
  return null;
}

function SettingsSidebar({
  active,
  isDirty,
  onChange
}: {
  active: SettingsSectionId;
  isDirty: boolean;
  onChange: (section: SettingsSectionId) => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const activeIndex = SETTINGS_SECTIONS.findIndex((s) => s.id === active);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? SETTINGS_SECTIONS.length - 1
          : event.key === 'ArrowDown'
            ? (activeIndex + 1) % SETTINGS_SECTIONS.length
            : (activeIndex - 1 + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length;

    const nextSection = SETTINGS_SECTIONS[nextIndex];
    onChange(nextSection.id);
    requestAnimationFrame(() => {
      document.getElementById(`settings-nav-${nextSection.id}`)?.focus();
    });
  };

  return (
    <nav className="settings-sidebar" aria-label="Seções de configurações" onKeyDown={handleKeyDown}>
      {SETTINGS_SECTIONS.map((section) => (
        <button
          key={section.id}
          id={`settings-nav-${section.id}`}
          type="button"
          className={`settings-sidebar-item ${active === section.id ? 'is-active' : ''}`}
          onClick={() => onChange(section.id)}
          aria-current={active === section.id ? 'page' : undefined}
        >
          <span className="settings-sidebar-icon" aria-hidden="true">
            {section.icon}
          </span>
          <span>{section.label}</span>
          {isDirty && active === section.id && (
            <span className="settings-dirty-dot" aria-label="Alterações não salvas" />
          )}
        </button>
      ))}
    </nav>
  );
}

function SiteLogoCard({
  logoPreview,
  logoError,
  saving,
  logoInputRef,
  onLogoChange,
  onRemoveLogo
}: {
  logoPreview: string | null;
  logoError: string | null;
  saving: boolean;
  logoInputRef: RefObject<HTMLInputElement | null>;
  onLogoChange: (file: File | null) => void;
  onRemoveLogo: () => void;
}) {
  return (
    <div className="settings-section-card">
      <div className="settings-section-card-header">
        <div>
          <strong>Logo do site</strong>
          <p className="muted" style={{ margin: '0.15rem 0 0' }}>
            Proporção 1:1, exportada em {LOGO_WIDTH}x{LOGO_HEIGHT} PNG para preservar transparência.
          </p>
        </div>
        <div className="cover-upload-actions">
          <input
            type="file"
            accept={ALLOWED_LOGO_TYPES.join(',')}
            ref={logoInputRef}
            id="logo-upload"
            style={{ display: 'none' }}
            onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
          />
          <label className="icon-button" htmlFor="logo-upload" aria-label="Trocar logo" title="Trocar logo">
            <FontAwesomeIcon icon={faUpload} />
          </label>
          {logoPreview && (
            <button
              className="icon-button tone-danger"
              type="button"
              onClick={onRemoveLogo}
              disabled={saving}
              aria-label="Remover logo"
              title="Remover logo"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          )}
        </div>
      </div>
      <div className="cover-preview-box settings-logo-preview" style={{ minHeight: '180px' }}>
        {logoPreview ? <img src={logoPreview} alt="Logo do site" /> : <div className="cover-placeholder">Sem logo</div>}
      </div>
      {logoError && <div className="admin-empty" role="alert">{logoError}</div>}
    </div>
  );
}

function IdentitySettingsSection({
  settings,
  setSettings,
  logoPreview,
  logoError,
  saving,
  logoInputRef,
  onLogoChange,
  onRemoveLogo
}: {
  settings: SiteSettings;
  setSettings: SettingsSetter;
  logoPreview: string | null;
  logoError: string | null;
  saving: boolean;
  logoInputRef: RefObject<HTMLInputElement | null>;
  onLogoChange: (file: File | null) => void;
  onRemoveLogo: () => void;
}) {
  const brandTagline = settings.brandTagline ?? '';

  return (
    <div className="settings-tab-grid">
      <div className="admin-card settings-panel-card">
        <h2>Identidade visual</h2>
        <div className="admin-grid columns-2">
          <div className="form-field">
            <label htmlFor="site-name">Nome do site</label>
            <input
              id="site-name"
              value={settings.siteName}
              onChange={(e) => setSettings((prev) => ({ ...prev, siteName: e.target.value }))}
              placeholder="Ex.: John Doe"
            />
          </div>
          <div className="form-field">
            <label htmlFor="brand-tagline">
              <span>Tagline</span>
              <span className="muted small">{brandTagline.length}/80</span>
            </label>
            <input
              id="brand-tagline"
              value={brandTagline}
              onChange={(e) => setSettings((prev) => ({ ...prev, brandTagline: e.target.value.slice(0, 80) }))}
              placeholder="Ex.: Consultoria Financeira"
              maxLength={80}
            />
            <p className="muted small" style={{ margin: 0 }}>Texto pequeno exibido abaixo do nome.</p>
          </div>
        </div>
      </div>
      <SiteLogoCard
        logoPreview={logoPreview}
        logoError={logoError}
        saving={saving}
        logoInputRef={logoInputRef}
        onLogoChange={onLogoChange}
        onRemoveLogo={onRemoveLogo}
      />
    </div>
  );
}

function WhatsAppFloatingCard({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  const position = settings.whatsappPosition === 'left' ? 'left' : 'right';
  const enabled = !!settings.whatsappEnabled;
  const [isExpanded, setIsExpanded] = useState(false);

  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    if (!enabled) setIsExpanded(false);
  }

  return (
    <div className="settings-section-card settings-whatsapp-card">
      <div className="settings-whatsapp-header">
        <button
          type="button"
          className="settings-whatsapp-chevron"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={enabled && isExpanded}
          aria-controls="settings-whatsapp-fields"
          disabled={!enabled}
          title={enabled ? 'Mostrar ou ocultar configurações do WhatsApp' : 'Ative o botão para editar'}
        >
          <FontAwesomeIcon icon={faChevronDown} />
        </button>

        <div className="settings-whatsapp-summary">
          <strong>Botão flutuante WhatsApp</strong>
          <p className="muted">Mostra o botão flutuante em todas as páginas públicas.</p>
        </div>

        <div className="settings-whatsapp-actions">
          <span className={`settings-whatsapp-status ${enabled ? 'is-active' : ''}`}>
            {enabled ? 'Ativo' : 'Inativo'}
          </span>
          <Switch
            checked={enabled}
            onChange={(checked) => setSettings((prev) => ({ ...prev, whatsappEnabled: checked }))}
          />
        </div>
      </div>

      {enabled && isExpanded && (
        <div id="settings-whatsapp-fields" className="settings-whatsapp-fields">
          <div className="form-field settings-whatsapp-link-field">
            <label htmlFor="whatsapp-link">Telefone</label>
            <input
              id="whatsapp-link"
              value={settings.whatsappLink ?? ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, whatsappLink: e.target.value }))}
              placeholder="https://wa.me/55DDDNUMERO"
            />
          </div>

          <div className="form-field settings-whatsapp-message-field">
            <label htmlFor="whatsapp-message">Mensagem padrão (opcional)</label>
            <textarea
              id="whatsapp-message"
              value={settings.whatsappMessage ?? ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, whatsappMessage: e.target.value }))}
              rows={2}
              placeholder="Olá, quero agendar uma sessão..."
            />
          </div>

          <div className="form-field settings-whatsapp-position-field">
            <label>Posição</label>
            <div className="page-columns-toggle compact">
              {(['right', 'left'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={position === pos ? 'active' : ''}
                  onClick={() => setSettings((prev) => ({ ...prev, whatsappPosition: pos }))}
                  aria-pressed={position === pos}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>{pos === 'right' ? 'Direita' : 'Esquerda'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactSettingsSection({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  return (
    <div className="settings-tab-grid">
      <div className="admin-card settings-panel-card settings-contact-card">
        <div className="settings-contact-heading">
          <h2>Contato</h2>
          <p className="muted">ATENÇÃO: As informações de contato são visíveis para todos os visitantes do site.</p>
        </div>
        <div className="form-field">
          <label htmlFor="contact-email">Email de contato</label>
          <input
            id="contact-email"
            type="email"
            value={settings.contactEmail ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
            placeholder="contato@exemplo.com"
          />
        </div>
      </div>
      <WhatsAppFloatingCard settings={settings} setSettings={setSettings} />
      <div className="admin-card settings-panel-card settings-panel-card-full">
        <SocialLinksEditor
          socials={settings.socials ?? []}
          onChange={(socials) => setSettings((prev) => ({ ...prev, socials }))}
        />
      </div>
    </div>
  );
}

function AppearanceSettingsSection({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  const theme = normalizeSiteTheme(settings.theme);

  const setTheme = (nextTheme: SiteTheme) => {
    setSettings((prev) => ({ ...prev, theme: normalizeSiteTheme(nextTheme) }));
  };

  const setPreset = (preset: SiteThemePreset) => {
    setTheme(getPresetTheme(preset));
  };

  const setColor = (key: keyof SiteThemeColors, value: string) => {
    setTheme(updateSiteThemeColor(theme, key, value));
  };

  const cssVars = siteThemeToCssVars(theme);

  return (
    <div className="settings-appearance-layout">
      <div className="settings-appearance-controls">
        <div className="admin-card settings-panel-card settings-panel-card-wide">
          <h2>Paleta de cores</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Escolha uma paleta pronta ou ajuste as cores principais.
          </p>

          <div className="theme-preset-grid" role="radiogroup" aria-label="Paletas do site">
            {Object.values(SITE_THEME_PRESETS).map((presetTheme) => (
              <button
                key={presetTheme.preset}
                type="button"
                className={`theme-preset-card ${theme.preset === presetTheme.preset ? 'active' : ''}`}
                onClick={() => setPreset(presetTheme.preset)}
                role="radio"
                aria-checked={theme.preset === presetTheme.preset}
              >
                <span className="theme-preset-swatches" aria-hidden="true">
                  {Object.values(presetTheme.colors).map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </span>
                <span>{presetLabel(presetTheme.preset)}</span>
              </button>
            ))}
          </div>

          <div className="admin-grid columns-2" style={{ marginTop: '0.35rem' }}>
            {(Object.keys(colorLabels) as Array<keyof SiteThemeColors>).map((key) => (
              <div key={key} className="form-field">
                <label htmlFor={`color-${key}`}>{colorLabels[key]}</label>
                <div className="color-input-wrapper">
                  <input
                    id={`color-${key}`}
                    type="color"
                    value={theme.colors[key]}
                    onChange={(e) => setColor(key, e.target.value)}
                  />
                  <input
                    type="text"
                    value={theme.colors[key]}
                    onChange={(e) => setColor(key, e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card settings-panel-card settings-panel-card-wide">
          <h2>Tipografia</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Fontes carregadas do Google Fonts. Só aparecem no site após salvar.
          </p>

          <div className="admin-grid columns-2">
            <FontPicker
              label="Fonte para títulos"
              value={theme.typography?.headingFont ?? null}
              options={GOOGLE_FONTS_HEADINGS}
              previewText="[Título de impacto sobre o seu negócio]"
              onChange={(font) =>
                setTheme({
                  ...theme,
                  typography: { headingFont: font, bodyFont: theme.typography?.bodyFont ?? null }
                })
              }
            />
            <FontPicker
              label="Fonte para corpo de texto"
              value={theme.typography?.bodyFont ?? null}
              options={GOOGLE_FONTS_BODY}
              previewText="[Descreva em 1-2 frases o que você oferece e para quem]"
              onChange={(font) =>
                setTheme({
                  ...theme,
                  typography: { headingFont: theme.typography?.headingFont ?? null, bodyFont: font }
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="settings-appearance-preview-sticky">
        <div className="admin-card settings-appearance-preview-card">
          <p className="settings-appearance-preview-label">Preview</p>
          <div className="theme-preview" style={cssVars as React.CSSProperties}>

            {/* Nav */}
            <div className="theme-preview-nav">
              <strong>Sua Marca</strong>
              <span>Home · Sobre · Blog</span>
            </div>

            {/* Hero */}
            <div className="theme-preview-hero">
              <p className="theme-preview-eyebrow">[Nome do Serviço]</p>
              <h2 className="theme-preview-heading">[Título de impacto sobre o seu negócio]</h2>
              <p className="theme-preview-body">
                [Descreva em 1-2 frases o que você oferece e para quem]
              </p>
              <div className="theme-preview-actions">
                <button className="theme-preview-btn-primary">Agendar</button>
                <button className="theme-preview-btn-ghost">Saiba mais</button>
              </div>
            </div>

            {/* Pills / tags */}
            <div className="theme-preview-pills">
              <span className="theme-preview-pill">Tag 1</span>
              <span className="theme-preview-pill">Tag 2</span>
              <span className="theme-preview-pill">Tag 3</span>
            </div>

            {/* Card */}
            <div className="theme-preview-card">
              <p className="theme-preview-card-title">Artigo em destaque</p>
              <p className="theme-preview-card-body">
                [Resumo curto do artigo em destaque]
              </p>
              <span className="theme-preview-link">Ler mais →</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const blogElementFields: Array<{ key: keyof SiteThemeElements['blog']; label: string }> = [
  { key: 'titleColor', label: 'Cor do título' },
  { key: 'subtitleColor', label: 'Cor do subtítulo' },
  { key: 'gradientStart', label: 'Linha degradê — início' },
  { key: 'gradientEnd', label: 'Linha degradê — fim' }
];

function BlogElementsCard({
  settings,
  setSettings,
  group,
  title,
  description
}: {
  settings: SiteSettings;
  setSettings: SettingsSetter;
  group: keyof SiteThemeElements;
  title: string;
  description: string;
}) {
  const theme = normalizeSiteTheme(settings.theme);
  const element = theme.elements?.[group];
  const derived = getDerivedElementColors(theme);

  const setColor = (key: keyof SiteThemeElements['blog'], value: string | null) => {
    setSettings((prev) => ({
      ...prev,
      theme: updateSiteThemeElementColor(normalizeSiteTheme(prev.theme), group, key, value)
    }));
  };

  return (
    <div className="admin-card settings-panel-card settings-panel-card-wide">
      <h2>{title}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{description}</p>
      <div className="admin-grid columns-2">
        {blogElementFields.map(({ key, label }) => {
          const color = element?.[key] ?? null;
          return (
            <ColorField
              key={key}
              label={label}
              mode={color ? 'custom' : 'default'}
              color={color}
              fallbackHex={derived[key] ?? '#000000'}
              defaultHint="Usa a cor derivada do tema (Aparência)."
              onChange={(next) => setColor(key, next.color)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ElementsSettingsSection({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  return (
    <div className="settings-tab-grid">
      <BlogElementsCard
        settings={settings}
        setSettings={setSettings}
        group="blog"
        title="Blog na Home"
        description={
          'Cores do bloco "Conteúdos recentes" exibido na Home (título, subtítulo e a linha degradê abaixo do título). ' +
          'Por padrão seguem as cores do tema em Aparência — ajuste aqui só se quiser um valor isolado.'
        }
      />
      <BlogElementsCard
        settings={settings}
        setSettings={setSettings}
        group="blogPage"
        title="Página /blog"
        description={
          'Cores do cabeçalho e das seções "Em destaque", "Mais vistos" e "Todos os artigos" na página /blog. ' +
          'Independente do bloco da Home — ajuste aqui só se quiser um valor isolado.'
        }
      />
    </div>
  );
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

async function fetchCep(cep: string): Promise<{ street: string; neighborhood: string; city: string; state: string } | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch {
    return null;
  }
}

function AddressSection({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  const [cepLoading, setCepLoading] = useState(false);

  const handleCepChange = async (raw: string) => {
    const formatted = formatCep(raw);
    setSettings((prev) => ({ ...prev, address: { ...prev.address, zip: formatted } }));
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      const found = await fetchCep(digits);
      setCepLoading(false);
      if (found) {
        setSettings((prev) => ({
          ...prev,
          address: {
            ...prev.address,
            zip: formatted,
            street: found.street || prev.address?.street || '',
            neighborhood: found.neighborhood || prev.address?.neighborhood || '',
            city: found.city || prev.address?.city || '',
            state: found.state || prev.address?.state || '',
          },
        }));
      } else {
        toast.warning('CEP não encontrado', { message: 'Verifique o CEP e preencha o endereço manualmente.', code: 'CEP-001' });
      }
    }
  };

  return (
    <div className="admin-card settings-panel-card settings-professional-card">
      <div className="settings-card-heading">
        <h2>Endereço</h2>
        <p className="muted small">Local exibido nas áreas públicas de contato.</p>
      </div>
      <div className="settings-professional-fields settings-address-fields">
        {/* Linha 1: CEP + Rua */}
        <div className="form-field settings-addr-zip" style={{ position: 'relative' }}>
          <label htmlFor="settings-zip">CEP</label>
          <input
            id="settings-zip"
            value={settings.address?.zip ?? ''}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            style={{ paddingRight: cepLoading ? '2.2rem' : undefined }}
          />
          {cepLoading && (
            <span style={{
              position: 'absolute', right: '0.7rem', bottom: '0.6rem',
              width: '1rem', height: '1rem', border: '2px solid #ccc',
              borderTopColor: 'var(--color-clay)', borderRadius: '50%',
              display: 'inline-block', animation: 'spin 0.7s linear infinite'
            }} aria-label="Buscando CEP..." />
          )}
        </div>
        <div className="form-field settings-addr-street">
          <label htmlFor="settings-street">Rua / Logradouro</label>
          <input
            id="settings-street"
            value={settings.address?.street ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
            placeholder="Rua das Flores, 123"
          />
        </div>
        {/* Linha 2: Bairro + Cidade + Estado */}
        <div className="form-field settings-addr-neighborhood">
          <label htmlFor="settings-neighborhood">Bairro</label>
          <input
            id="settings-neighborhood"
            value={settings.address?.neighborhood ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, address: { ...prev.address, neighborhood: e.target.value } }))}
            placeholder="Centro"
          />
        </div>
        <div className="form-field settings-addr-city">
          <label htmlFor="settings-city">Cidade</label>
          <input
            id="settings-city"
            value={settings.address?.city ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
            placeholder="São Paulo"
          />
        </div>
        <div className="form-field settings-addr-state">
          <label htmlFor="settings-state">Estado</label>
          <input
            id="settings-state"
            value={settings.address?.state ?? ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, address: { ...prev.address, state: e.target.value.toUpperCase().slice(0, 2) } }))}
            placeholder="SP"
            maxLength={2}
          />
        </div>
      </div>
    </div>
  );
}

function ProfessionalSettingsSection({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  return (
    <div className="settings-tab-grid settings-professional-grid">
      <div className="admin-card settings-panel-card settings-professional-card">
        <div className="settings-card-heading">
          <h2>Identificação</h2>
          <p className="muted small">Dados legais e contato direto do consultório.</p>
        </div>
        <div className="settings-professional-fields">
          <div className="form-field">
            <label htmlFor="settings-cnpj">CNPJ</label>
            <input
              id="settings-cnpj"
              value={formatCnpj(settings.cnpj ?? '')}
              onChange={(e) => setSettings((prev) => ({ ...prev, cnpj: e.target.value }))}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="form-field">
            <label htmlFor="settings-professionalRegistration">Registro profissional</label>
            <input
              id="settings-professionalRegistration"
              value={settings.professionalRegistration ?? ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, professionalRegistration: e.target.value }))}
              placeholder="Ex.: CRP 12/34567, OAB/SP 123456, CRECI 12345 (opcional)"
            />
          </div>
          <div className="form-field settings-field-full">
            <label htmlFor="settings-phone">Telefone de contato</label>
            <input
              id="settings-phone"
              value={settings.phone ?? ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </div>

      <AddressSection settings={settings} setSettings={setSettings} />

      <div className="admin-card settings-panel-card settings-professional-card settings-office-hours-card">
        <div className="settings-card-heading settings-office-hours-heading">
          <div>
            <h2>Horários de atendimento</h2>
            <p className="muted small">Exibidos na página de contato. Adicione um período por linha.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSettings((prev) => ({
              ...prev,
              officeHours: [...(prev.officeHours ?? []), { label: '', hours: '' }]
            }))}
          >
            + Adicionar horário
          </button>
        </div>
        <OfficeHoursEditor
          value={settings.officeHours ?? []}
          onChange={(officeHours) => setSettings((prev) => ({ ...prev, officeHours }))}
        />
      </div>
    </div>
  );
}

function SeoSettingsSection({ settings, setSettings }: { settings: SiteSettings; setSettings: SettingsSetter }) {
  const metaLength = (settings.metaDescription ?? '').length;
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  return (
    <>
      <div className="settings-tab-grid">
        <div className="admin-card settings-panel-card">
          <h2>SEO</h2>
          <div className="form-field">
            <label htmlFor="meta-description">
              <span>Meta description</span>
              <span className="muted small">{metaLength}/320</span>
            </label>
            <textarea
              id="meta-description"
              value={settings.metaDescription ?? ''}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  metaDescription: e.target.value.slice(0, 320)
                }))
              }
              rows={3}
              placeholder="Atendimento psicológico junguiano em São Paulo..."
            />
            <p className="muted small" style={{ margin: 0 }}>
              Texto exibido nos resultados de busca do Google. Ideal: 120–160 caracteres.
            </p>
          </div>

          <div className="form-field">
            <label>Imagem padrão para compartilhamento (OG Image)</label>
            <div className="settings-og-image-picker">
              <div className="settings-og-image-preview">
                {settings.ogImageUrl ? (
                  <img src={settings.ogImageUrl} alt="Imagem padrão de compartilhamento" />
                ) : (
                  <div className="settings-og-image-placeholder">
                    <span>Sem imagem selecionada</span>
                  </div>
                )}
              </div>
              <div className="settings-og-image-actions">
                <button type="button" className="btn btn-outline" onClick={() => setImagePickerOpen(true)}>
                  Selecionar da biblioteca
                </button>
                {settings.ogImageUrl && (
                  <button
                    type="button"
                    className="btn btn-outline tone-danger"
                    onClick={() => setSettings((prev) => ({ ...prev, ogImageUrl: null }))}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              Usada ao compartilhar o site no WhatsApp, LinkedIn, etc. Use uma imagem da biblioteca, preferencialmente 1200×630px.
            </p>
          </div>
        </div>

        <div className="admin-card settings-panel-card">
          <h2>Integrações</h2>
          <div className="form-field">
            <label htmlFor="ga-id">Google Analytics (ID de medição)</label>
            <input
              id="ga-id"
              value={settings.gaId ?? ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, gaId: e.target.value.trim() }))}
              placeholder="G-XXXXXXXXXX"
            />
            <p className="muted small" style={{ margin: 0 }}>
              Formato: G-XXXXXXXXXX ou UA-XXXXX-X
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="gsc-verification">Google Search Console (verificação)</label>
            <input
              id="gsc-verification"
              value={settings.gscVerification ?? ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, gscVerification: e.target.value.trim() }))}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="muted small" style={{ margin: 0 }}>
              Cole apenas o valor do atributo content da meta tag fornecida pelo Search Console.
            </p>
          </div>
        </div>
      </div>

      <ImagePickerModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(image) => {
          setSettings((prev) => ({ ...prev, ogImageUrl: image.src }));
          setImagePickerOpen(false);
        }}
        enableCrop
        cropRatio="16:9"
        cropTitle="Recortar imagem de compartilhamento"
      />
    </>
  );
}

function presetLabel(preset: SiteThemePreset): string {
  const labels: Record<SiteThemePreset, string> = {
    neutro: 'Neutro',
    'terra-oliva': 'Terra e oliva',
    'sereno-azul': 'Sereno azul',
    salvia: 'Salvia',
    'vinho-suave': 'Vinho suave'
  };
  return labels[preset];
}

export function AdminSettingsPage() {
  const { data, isLoading } = useAdminSiteSettings();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('identity');
  const [settings, setSettings] = useState<SiteSettings>(createDefaultSettings());
  const [saving, setSaving] = useState(false);
  const [logoTask, setLogoTask] = useState<CropTask | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showLogoConfirm, setShowLogoConfirm] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const mutation = useUpdateSiteSettings();

  useEffect(() => {
    if (data) {
      setSettings({ ...data, theme: normalizeSiteTheme(data.theme) });
      setLogoPreview(data.logoUrl ?? null);
    }
  }, [data]);

  useEffect(() => {
    if (!logoTask?.src) return undefined;
    return () => URL.revokeObjectURL(logoTask.src);
  }, [logoTask?.src]);

  // Detect unsaved changes
  const isDirty = useMemo(() => {
    if (!data) return false;
    return JSON.stringify(settings) !== JSON.stringify({
      ...data,
      theme: normalizeSiteTheme(data.theme)
    });
  }, [settings, data]);

  const handleLogoChange = (file: File | null) => {
    if (!file) return;
    const error = validateLogo(file);
    if (error) {
      setLogoError(error);
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }
    setLogoError(null);
    setLogoTask({ src: URL.createObjectURL(file), file });
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleLogoConfirm = async (file: File) => {
    setSaving(true);
    try {
      const uploaded = await uploadMedia({ file, alt: `${settings.siteName || 'Logo do site'}` });
      setSettings((prev) => ({ ...prev, logoUrl: uploaded.url }));
      setLogoPreview(uploaded.url);
      setLogoTask(null);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoRemove = () => {
    setSettings((prev) => ({ ...prev, logoUrl: null }));
    setLogoPreview(null);
    setShowLogoConfirm(false);
  };

  const sortedSocials = [...(settings.socials ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const isValid =
    settings.siteName.trim().length > 1 &&
    (!settings.cnpj || settings.cnpj.replace(/\D/g, '').length === 14) &&
    (!settings.contactEmail || settings.contactEmail.includes('@'));

  const handleSubmit = async () => {
    setSaving(true);
    setLogoError(null);
    try {
      const updated = await mutation.mutateAsync({
        ...settings,
        cnpj: settings.cnpj ? settings.cnpj.replace(/\D/g, '') : null,
        contactEmail: settings.contactEmail?.trim() || null,
        socials: sortedSocials,
        theme: normalizeSiteTheme(settings.theme)
      });
      setSettings({ ...updated, theme: normalizeSiteTheme(updated.theme) });
      toast.success('Configurações salvas');
    } catch (error) {
      const msg = getApiErrorMessage(error, 'Não foi possível salvar as configurações.');
      toast.error('Falha ao salvar', { message: msg, code: 'SETTINGS-001' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page settings-page">
      <SeoHead title="Configurações do Site" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Configurações</h1>
        <p className="muted" style={{ margin: 0 }}>
          Ajuste marca, contatos, aparência e dados profissionais exibidos no site.
        </p>
      </div>

      <div className="admin-card settings-shell-v2">
        {isLoading ? (
          <div className="admin-empty">Carregando configurações...</div>
        ) : (
          <>
            <SettingsSidebar active={activeSection} isDirty={isDirty} onChange={setActiveSection} />
            <div className="settings-content">
              {activeSection === 'identity' && (
                <IdentitySettingsSection
                  settings={settings}
                  setSettings={setSettings}
                  logoPreview={logoPreview}
                  logoError={logoError}
                  saving={saving}
                  logoInputRef={logoInputRef}
                  onLogoChange={handleLogoChange}
                  onRemoveLogo={() => setShowLogoConfirm(true)}
                />
              )}
              {activeSection === 'appearance' && <AppearanceSettingsSection settings={settings} setSettings={setSettings} />}
              {activeSection === 'elements' && <ElementsSettingsSection settings={settings} setSettings={setSettings} />}
              {activeSection === 'contact' && <ContactSettingsSection settings={settings} setSettings={setSettings} />}
              {activeSection === 'professional' && <ProfessionalSettingsSection settings={settings} setSettings={setSettings} />}
              {activeSection === 'seo' && <SeoSettingsSection settings={settings} setSettings={setSettings} />}

              <div className="admin-modal-footer settings-save-bar">
                <button
                  className={`btn btn-primary ${isDirty ? 'has-unsaved' : ''}`}
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isValid || saving || mutation.isPending}
                  title={isDirty ? 'Você tem alterações não salvas' : undefined}
                >
                  {saving || mutation.isPending ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ImageCropModal
        open={!!logoTask}
        imageSrc={logoTask?.src}
        imageFile={logoTask?.file}
        aspect={LOGO_ASPECT}
        outputWidth={LOGO_WIDTH}
        outputHeight={LOGO_HEIGHT}
        mimeType={LOGO_OUTPUT_MIME}
        onCancel={() => setLogoTask(null)}
        onConfirm={(file) => handleLogoConfirm(file)}
        title="Recortar logo"
        confirmLabel="Salvar logo"
      />

      <ConfirmModal
        isOpen={showLogoConfirm}
        onClose={() => setShowLogoConfirm(false)}
        title="Remover logo"
        description="Tem certeza que deseja remover o logo? Essa ação não pode ser desfeita."
        onConfirm={handleLogoRemove}
        confirmLabel="Remover"
      />
    </div>
  );
}
