import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faEnvelope, faEye, faEyeSlash, faGlobe, faGripVertical, faLink as faLinkSolid, faPencil, faPhone, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faFacebook, faLinkedin, faYoutube, faTiktok, faXTwitter, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { ConfirmModal, Modal } from './AdminUI';
import type { SocialLink } from '../types';

const socialPlatforms: SocialLink['platform'][] = [
  'instagram',
  'whatsapp',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'x',
  'email',
  'site',
  'telefone',
  'custom'
] as const;

const platformLabels: Record<SocialLink['platform'], string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  email: 'Email',
  site: 'Website',
  telefone: 'Telefone',
  custom: 'Custom'
};

function normalizeSocialLink(link: SocialLink): SocialLink {
  let url = link.url.trim();
  if (link.platform === 'email') {
    url = url.startsWith('mailto:') ? url : `mailto:${url}`;
  } else if (link.platform === 'whatsapp') {
    const digits = url.replace(/\D/g, '');
    url = `https://wa.me/${digits}`;
  } else if (link.platform === 'telefone') {
    const digits = url.replace(/\D/g, '');
    url = `tel:${digits}`;
  } else if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return { ...link, url };
}

function SocialIcon({ platform }: { platform: SocialLink['platform'] }) {
  const iconMap: Record<SocialLink['platform'], IconDefinition> = {
    instagram: faInstagram,
    facebook: faFacebook,
    linkedin: faLinkedin,
    youtube: faYoutube,
    tiktok: faTiktok,
    x: faXTwitter,
    whatsapp: faWhatsapp,
    email: faEnvelope,
    site: faGlobe,
    telefone: faPhone,
    custom: faLinkSolid
  };

  return <FontAwesomeIcon icon={iconMap[platform] || faLinkSolid} />;
}

type SocialLinksEditorProps = {
  socials: SocialLink[];
  onChange: (socials: SocialLink[]) => void;
};

export function SocialLinksEditor({ socials, onChange }: SocialLinksEditorProps) {
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialModal, setSocialModal] = useState<{ open: boolean; value: SocialLink | null }>({ open: false, value: null });
  const [deleteSocial, setDeleteSocial] = useState<SocialLink | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [fromIndex, setFromIndex] = useState<number | null>(null);

  const sortedSocials = useMemo(
    () => [...(socials ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [socials]
  );

  const handleReorder = (toId: string) => {
    if (fromIndex === null) return;
    const list = [...sortedSocials];
    const targetIndex = list.findIndex((item) => item.id === toId);
    if (targetIndex === -1 || targetIndex === fromIndex) {
      setDragging(null);
      setFromIndex(null);
      return;
    }
    const [removed] = list.splice(fromIndex, 1);
    list.splice(targetIndex, 0, removed);
    const updated = list.map((item, index) => ({ ...item, order: index }));
    onChange(updated);
    setDragging(null);
    setFromIndex(null);
  };

  const openSocialModal = (social?: SocialLink) => {
    setSocialError(null);
    setSocialModal({ open: true, value: social ?? null });
  };

  const closeSocialModal = () => {
    setSocialError(null);
    setSocialModal({ open: false, value: null });
  };

  const applySocial = (value: SocialLink) => {
    setSocialError(null);
    const normalized = normalizeSocialLink(value);
    const list = [...(socials ?? [])];
    const idx = list.findIndex((item) => item.id === value.id);
    if (idx >= 0) {
      list[idx] = normalized;
    } else {
      list.push(normalized);
    }
    const reordered = list
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item, index) => ({ ...item, order: index }));
    onChange(reordered);
    closeSocialModal();
  };

  const modalValue = socialModal.value ?? {
    id: uuid(),
    platform: 'instagram' as SocialLink['platform'],
    label: '',
    url: '',
    order: sortedSocials.length,
    isVisible: true
  };

  return (
    <>
      <div>
        <div className="admin-grid">
          <div className="admin-drag-list">
            <div className="admin-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Redes sociais</strong>
                <p className="muted" style={{ margin: 0 }}>
                  Ordene via arrastar e defina visibilidade.
                </p>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => openSocialModal()}>
                Adicionar rede
              </button>
            </div>

            {sortedSocials.length === 0 && <div className="admin-empty">Nenhuma rede adicionada ainda.</div>}

            {sortedSocials.map((item, index) => (
              <div
                key={item.id}
                className={`admin-drag-item ${dragging === item.id ? 'is-dragging' : ''}`}
                draggable
                onDragStart={() => {
                  setDragging(item.id);
                  setFromIndex(index);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleReorder(item.id)}
                onDragEnd={() => {
                  setDragging(null);
                  setFromIndex(null);
                }}
              >
                <div className="admin-drag-handle" aria-label="Mover rede">
                  <FontAwesomeIcon icon={faGripVertical} />
                </div>
                <div className="admin-drag-content" style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SocialIcon platform={item.platform} />
                    <strong style={{ whiteSpace: 'nowrap' }}>{platformLabels[item.platform]}</strong>
                    {item.label && <span className="muted">· {item.label}</span>}
                  </div>
                  <span className="muted" style={{ wordBreak: 'break-word' }}>{item.url}</span>
                </div>
                <div className="admin-actions" style={{ gap: '0.35rem', marginLeft: 'auto' }}>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => {
                      const next = socials.map((s) =>
                        s.id === item.id ? { ...s, isVisible: !s.isVisible } : s
                      );
                      onChange(next);
                    }}
                    aria-label={item.isVisible ? 'Ocultar rede' : 'Mostrar rede'}
                    title={item.isVisible ? 'Ocultar rede' : 'Mostrar rede'}
                  >
                    <FontAwesomeIcon icon={item.isVisible ? faEye : faEyeSlash} />
                  </button>
                  <button className="icon-button" type="button" onClick={() => openSocialModal(item)} aria-label="Editar rede" title="Editar rede">
                    <FontAwesomeIcon icon={faPencil} />
                  </button>
                  <button className="icon-button tone-danger" type="button" onClick={() => setDeleteSocial(item)} aria-label="Remover rede" title="Remover rede">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={socialModal.open}
        onClose={closeSocialModal}
        title={socialModal.value ? 'Editar rede' : 'Adicionar rede'}
        width={520}
      >
        <div className="admin-grid">
          <label className="form-field">
            Plataforma
            <select
              value={modalValue.platform}
              onChange={(e) => setSocialModal((prev) => ({ ...prev, value: { ...modalValue, platform: e.target.value as SocialLink['platform'] } }))}
            >
              {socialPlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platformLabels[platform]}
                </option>
              ))}
            </select>
          </label>
          {modalValue.platform === 'custom' && (
            <label className="form-field">
              Nome / Label
              <input
                value={modalValue.label ?? ''}
                onChange={(e) => setSocialModal((prev) => ({ ...prev, value: { ...modalValue, label: e.target.value } }))}
                placeholder="Ex.: Portfólio, Blog"
              />
            </label>
          )}
          <label className="form-field">
            URL
            <input
              value={modalValue.url}
              onChange={(e) => setSocialModal((prev) => ({ ...prev, value: { ...modalValue, url: e.target.value } }))}
              placeholder="https://"
            />
          </label>
        </div>
        <div className="admin-modal-footer">
          <button className="btn btn-outline" type="button" onClick={closeSocialModal}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              if (!modalValue.url.trim()) {
                setSocialError('URL é obrigatória para a rede');
                return;
              }
              applySocial(modalValue);
            }}
          >
            Salvar rede
          </button>
        </div>
        {socialError && <div className="admin-empty" role="alert">{socialError}</div>}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteSocial}
        onClose={() => setDeleteSocial(null)}
        title="Remover rede social"
        description={`Deseja remover "${deleteSocial?.label || (deleteSocial ? platformLabels[deleteSocial.platform] : '')}"?`}
        onConfirm={() => {
          if (!deleteSocial) return;
          const remaining = (socials ?? []).filter((item) => item.id !== deleteSocial.id);
          onChange(remaining);
          setDeleteSocial(null);
        }}
        confirmLabel="Remover"
      />
    </>
  );
}
