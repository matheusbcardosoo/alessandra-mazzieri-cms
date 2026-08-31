import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createFirstAdminAccount } from '@/api/queries';
import { AUTH_FLAG_KEY } from '@/api/client';
import { SeoHead } from '@/components/SeoHead';
import { ContentLoader } from '@/components/ContentLoader';
import { Switch } from '@/components/AdminUI';
import { SocialLinksEditor } from '@/components/SocialLinksEditor';
import { OfficeHoursEditor } from '@/components/OfficeHoursEditor';
import { useSetupStatus } from '@/hooks/queries/useSetupStatus';
import { useAdminSiteSettings, useUpdateSiteSettings } from '@/hooks/queries/useSiteSettings';
import { useCreateNavbarItem } from '@/hooks/queries/useNavbar';
import type { SiteSettings } from '@/types';

type Step = 1 | 2 | 3;

function AccountStep({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createFirstAdminAccount(form);
      queryClient.clear();
      localStorage.setItem(AUTH_FLAG_KEY, '1');
      onDone();
    } catch {
      setError('Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-card" style={{ display: 'grid', gap: '1rem' }}>
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Crie sua conta de administrador</h1>
        <p className="muted" style={{ margin: 0 }}>Esta conta terá acesso total ao painel.</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <label>
          Nome
          <input
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label>
          E-mail
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </label>
        {error && <span style={{ color: 'var(--color-burnt)' }}>{error}</span>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Continuar'}
        </button>
      </form>
    </div>
  );
}

function SettingsStep({ onDone }: { onDone: () => void }) {
  const { data, isLoading } = useAdminSiteSettings();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const mutation = useUpdateSiteSettings();

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  if (isLoading || !settings) {
    return <ContentLoader message="Carregando configurações..." />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await mutation.mutateAsync(settings);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card" style={{ display: 'grid', gap: '1rem' }}>
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Configurações essenciais</h1>
        <p className="muted" style={{ margin: 0 }}>
          Você pode ajustar o resto depois em Configurações.
        </p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Nome do site
          <input
            name="siteName"
            required
            value={settings.siteName}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, siteName: e.target.value } : prev))}
          />
        </label>
        <label>
          E-mail de contato
          <input
            name="contactEmail"
            type="email"
            value={settings.contactEmail ?? ''}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, contactEmail: e.target.value } : prev))}
          />
        </label>
        <Switch
          checked={!!settings.whatsappEnabled}
          onChange={(checked) => setSettings((prev) => (prev ? { ...prev, whatsappEnabled: checked } : prev))}
          label="Botão flutuante de WhatsApp"
        />
        {settings.whatsappEnabled && (
          <label>
            Link do WhatsApp
            <input
              name="whatsappLink"
              value={settings.whatsappLink ?? ''}
              onChange={(e) => setSettings((prev) => (prev ? { ...prev, whatsappLink: e.target.value } : prev))}
              placeholder="https://wa.me/55DDDNUMERO"
            />
          </label>
        )}
        <SocialLinksEditor
          socials={settings.socials ?? []}
          onChange={(socials) => setSettings((prev) => (prev ? { ...prev, socials } : prev))}
        />
        <OfficeHoursEditor
          value={settings.officeHours ?? []}
          onChange={(officeHours) => setSettings((prev) => (prev ? { ...prev, officeHours } : prev))}
        />
        <button className="btn btn-primary" type="submit" disabled={saving || mutation.isPending}>
          {saving || mutation.isPending ? 'Salvando...' : 'Continuar'}
        </button>
      </form>
    </div>
  );
}

function MenuStep({ onDone }: { onDone: () => void }) {
  const [homeLabel, setHomeLabel] = useState('Home');
  const [blogLabel, setBlogLabel] = useState('Blog');
  const [saving, setSaving] = useState(false);
  const createNavItem = useCreateNavbarItem();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        createNavItem.mutateAsync({
          label: homeLabel,
          type: 'INTERNAL_PAGE',
          pageKey: 'home',
          isParent: true,
          showInNavbar: true,
          showInFooter: true,
          orderNavbar: 0,
          orderFooter: 0,
          isVisible: true
        }),
        createNavItem.mutateAsync({
          label: blogLabel,
          type: 'INTERNAL_PAGE',
          pageKey: 'blog',
          isParent: true,
          showInNavbar: true,
          showInFooter: false,
          orderNavbar: 1,
          orderFooter: null,
          isVisible: true
        })
      ]);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card" style={{ display: 'grid', gap: '1rem' }}>
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Menu</h1>
        <p className="muted" style={{ margin: 0 }}>
          Rótulos exibidos na navegação. Você pode adicionar mais itens depois.
        </p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <label>
          Página inicial
          <input name="homeLabel" required value={homeLabel} onChange={(e) => setHomeLabel(e.target.value)} />
        </label>
        <label>
          Blog
          <input name="blogLabel" required value={blogLabel} onChange={(e) => setBlogLabel(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Concluindo...' : 'Concluir'}
        </button>
      </form>
    </div>
  );
}

export function AdminSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const { data: status, isLoading: statusLoading } = useSetupStatus();

  useEffect(() => {
    if (step === 1 && !statusLoading && status && !status.needsSetup) {
      navigate('/admin/login', { replace: true });
    }
  }, [step, statusLoading, status, navigate]);

  if (step === 1 && (statusLoading || !status || !status.needsSetup)) {
    return <ContentLoader message="Carregando..." />;
  }

  return (
    <div className="container" style={{ padding: '3rem 0', maxWidth: '640px' }}>
      <SeoHead title="Configuração inicial" />
      {step === 1 && <AccountStep onDone={() => setStep(2)} />}
      {step === 2 && <SettingsStep onDone={() => setStep(3)} />}
      {step === 3 && <MenuStep onDone={() => navigate('/admin')} />}
    </div>
  );
}
