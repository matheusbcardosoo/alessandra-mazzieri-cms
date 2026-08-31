import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCalendarDays,
  faCheck,
  faCircleExclamation,
  faClipboard,
  faDatabase,
  faEnvelope,
  faExternalLink,
  faFileLines,
  faHashtag,
  faRotateRight,
  faTrash,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import {
  deleteFormSubmission,
  fetchFormSubmission,
  fetchPage,
  type FormSubmission
} from '../api/queries';
import { ConfirmModal } from '../components/AdminUI';
import { toast } from '../components/toastStore';
import type { PageLayoutV2 } from '../types';
import { ensureLayoutV2 } from '../utils/pageLayoutHelpers';

type FormValue = string | number | boolean | null | undefined | string[] | Record<string, unknown>;

export function AdminFormSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<FormSubmission>({
    queryKey: ['formSubmission', id],
    queryFn: () => {
      if (!id) throw new Error('NOT_FOUND');
      return fetchFormSubmission(id);
    },
    enabled: !!id,
    retry: false
  });

  const { data: pageDetail } = useQuery({
    queryKey: ['page', data?.page?.slug],
    queryFn: () => fetchPage(data?.page?.slug || ''),
    enabled: !!data?.page?.slug
  });

  const fieldLabelMap = (() => {
    if (!pageDetail?.layout || !data?.formBlockId) return {};
    const layout = ensureLayoutV2(pageDetail.layout) as PageLayoutV2;
    for (const section of layout.sections) {
      for (const col of section.cols) {
        for (const block of col.blocks) {
          if (block.type === 'form' && block.id === data.formBlockId) {
            const map: Record<string, { label: string; type?: string }> = {};
            block.data.fields?.forEach((field) => {
              if (field?.id) map[field.id] = { label: field.label || '', type: field.type };
            });
            return map;
          }
        }
      }
    }
    return {};
  })();

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => setConfirmDeleteOpen(true);

  const handleConfirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteFormSubmission(id);
      navigate('/admin/form-submissions');
    } catch (error) {
      toast.error('Falha ao excluir', {
        message: error instanceof Error ? error.message : 'Não foi possível excluir a resposta.',
        code: 'FORM-001'
      });
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const formatFieldLabel = (key: string): string => {
    const snap = fieldLabelMap[key];
    if (snap?.label && snap.label.trim()) return snap.label;
    const fallback = key.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    return fallback || `Campo (${key.substring(0, 6)}...)`;
  };

  const normalizePhone = (value: unknown): string | null => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const digits = String(value).replace(/\D/g, '');
    if (digits.length < 10) return null;
    if (digits.startsWith('55')) return digits;
    return `55${digits}`;
  };

  const normalizeEmail = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const email = value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  };

  const getLikelyFieldValue = (names: string[]) => {
    if (!data?.data) return null;
    const entry = Object.entries(data.data).find(([key]) =>
      names.some((name) => key.toLowerCase().includes(name))
    );
    return entry?.[1] ?? null;
  };

  const getValueByFieldType = (type: string) => {
    if (!data?.data) return null;
    const entry = Object.entries(data.data).find(([key]) => fieldLabelMap[key]?.type === type);
    return entry?.[1] ?? null;
  };

  // Renderiza o botão de ação (WhatsApp/e-mail) de um campo conforme o tipo definido no formulário.
  // Faz fallback para a detecção pelo valor quando o schema do campo não está disponível.
  const renderFieldAction = (key: string, value: FormValue): React.ReactElement | null => {
    const fieldType = fieldLabelMap[key]?.type;
    const phone = normalizePhone(value);
    const email = normalizeEmail(value);
    const isPhone = fieldType === 'tel' || (!fieldType && !!phone && !email);
    const isEmail = fieldType === 'email' || (!fieldType && !!email);

    if (isPhone && phone) {
      return (
        <a
          className="btn btn-sm submission-field-action submission-field-action-whatsapp"
          href={`https://wa.me/${phone}`}
          target="_blank"
          rel="noreferrer"
        >
          <FontAwesomeIcon icon={faWhatsapp} />
          WhatsApp
        </a>
      );
    }

    if (isEmail && email) {
      return (
        <a
          className="btn btn-sm submission-field-action submission-field-action-email"
          href={`mailto:${email}`}
        >
          <FontAwesomeIcon icon={faEnvelope} />
          Enviar e-mail
        </a>
      );
    }

    return null;
  };

  const leadName = String(getLikelyFieldValue(['nome', 'name']) || data?.summary || 'Resposta recebida');
  const leadMessage = String(getLikelyFieldValue(['mensagem', 'message', 'observacao', 'comentario']) || data?.summary || '');
  const leadPhone = normalizePhone(getValueByFieldType('tel') ?? getLikelyFieldValue(['telefone', 'phone', 'whatsapp', 'celular']));
  const leadEmail = normalizeEmail(getValueByFieldType('email') ?? getLikelyFieldValue(['email', 'e-mail']));
  const whatsappLink = leadPhone ? `https://wa.me/${leadPhone}` : null;
  const mailtoLink = leadEmail ? `mailto:${leadEmail}` : null;

  const renderValue = (value: FormValue): React.ReactElement => {
    if (value === null || value === undefined || value === '') {
      return <span className="submission-detail-empty-value">Não informado</span>;
    }

    if (typeof value === 'boolean') {
      return <span>{value ? 'Sim' : 'Não'}</span>;
    }

    if (typeof value === 'string') {
      if (value.includes('\n')) {
        return <pre className="submission-detail-code-block">{value}</pre>;
      }
      return <span>{value}</span>;
    }

    if (Array.isArray(value)) {
      return <span>{value.join(', ')}</span>;
    }

    if (typeof value === 'object') {
      return <pre className="submission-detail-code-block">{JSON.stringify(value, null, 2)}</pre>;
    }

    return <span>{String(value)}</span>;
  };

  if (isLoading) {
    return (
      <div className="admin-page form-submissions-page submission-detail-page">
        <div className="form-submissions-state">
          <span className="form-submissions-spinner" aria-hidden="true" />
          <p>Carregando resposta...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isNotFound = error instanceof Error && error.message === 'NOT_FOUND';

    return (
      <div className="admin-page form-submissions-page submission-detail-page">
        <div className="admin-page-header form-submissions-header">
          <div>
            <h1>{isNotFound ? 'Resposta não encontrada' : 'Erro ao carregar resposta'}</h1>
            <p>
              {isNotFound
                ? 'Esta resposta não existe ou foi removida.'
                : 'Não foi possível carregar os detalhes desta resposta.'}
            </p>
          </div>
        </div>

        <div className="admin-card form-submissions-card">
          <div className="form-submissions-state form-submissions-state-error" role="alert">
            <FontAwesomeIcon icon={faCircleExclamation} />
            <p>{isNotFound ? 'Resposta não encontrada' : 'Erro ao carregar resposta'}</p>
            <div className="submission-detail-error-actions">
              <Link to="/admin/form-submissions" className="btn btn-outline">
                <FontAwesomeIcon icon={faArrowLeft} />
                Voltar para lista
              </Link>
              {!isNotFound && (
                <button className="btn btn-outline" onClick={() => refetch()}>
                  <FontAwesomeIcon icon={faRotateRight} />
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(data.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="admin-page form-submissions-page submission-detail-page">
      <div className="admin-page-header form-submissions-header submission-detail-header">
        <div>
          <Link to="/admin/form-submissions" className="submission-detail-back">
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar para respostas
          </Link>
          <h1>Detalhes da resposta</h1>
          <p>Confira os dados enviados pelo visitante e os metadados do envio.</p>
        </div>

        <div className="submission-detail-actions">
          {whatsappLink && (
            <a
              className="btn btn-outline"
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon icon={faWhatsapp} />
              WhatsApp
            </a>
          )}
          {mailtoLink && (
            <a className="btn btn-outline" href={mailtoLink}>
              <FontAwesomeIcon icon={faEnvelope} />
              Enviar e-mail
            </a>
          )}
          <button className="btn btn-outline" onClick={handleCopy}>
            <FontAwesomeIcon icon={copied ? faCheck : faClipboard} />
            {copied ? 'Copiado' : 'Copiar JSON'}
          </button>
          <button className="btn btn-outline submission-detail-danger" onClick={handleDelete}>
            <FontAwesomeIcon icon={faTrash} />
            Excluir
          </button>
        </div>
      </div>

      <section className="admin-card submission-detail-hero">
        <div className="submission-detail-lead">
          <span className="submission-detail-eyebrow">Lead</span>
          <h2>{leadName}</h2>
          <p>{leadMessage || 'Sem mensagem registrada.'}</p>
        </div>

        <div className="submission-detail-facts">
          <div className="submission-detail-fact">
            <FontAwesomeIcon icon={faCalendarDays} />
            <span>Data do envio</span>
            <strong>{formattedDate}</strong>
          </div>
          <div className="submission-detail-fact">
            <FontAwesomeIcon icon={faFileLines} />
            <span>Página</span>
            <strong>{data.page?.title || 'Não vinculada'}</strong>
          </div>
          <div className="submission-detail-fact">
            <FontAwesomeIcon icon={faHashtag} />
            <span>Campos</span>
            <strong>{Object.keys(data.data).length}</strong>
          </div>
        </div>
      </section>

      {data.summary && (
        <section className="admin-card submission-detail-section submission-detail-summary">
          <div className="submission-detail-section-title">
            <FontAwesomeIcon icon={faClipboard} />
            <h2>Resumo</h2>
          </div>
          <p>{data.summary}</p>
        </section>
      )}

      <section className="admin-card submission-detail-section">
        <div className="submission-detail-section-title">
          <FontAwesomeIcon icon={faUser} />
          <h2>Dados do formulário</h2>
        </div>

        {Object.entries(data.data).length > 0 ? (
          <div className="submission-detail-fields">
            {Object.entries(data.data).map(([key, value]) => (
              <article className="submission-detail-field" key={key}>
                <span>{formatFieldLabel(key)}</span>
                <div>{renderValue(value as FormValue)}</div>
                {renderFieldAction(key, value as FormValue)}
              </article>
            ))}
          </div>
        ) : (
          <div className="form-submissions-state">
            <FontAwesomeIcon icon={faFileLines} />
            <p>Nenhum dado registrado.</p>
          </div>
        )}
      </section>

      <section className="admin-card submission-detail-section">
        <div className="submission-detail-section-title">
          <FontAwesomeIcon icon={faDatabase} />
          <h2>Metadados técnicos</h2>
        </div>

        <div className="submission-detail-meta-grid">
          <div className="submission-detail-meta-item">
            <span>ID da resposta</span>
            <code>{data.id}</code>
          </div>
          <div className="submission-detail-meta-item">
            <span>ID do bloco</span>
            <code>{data.formBlockId}</code>
          </div>
          {data.page && (
            <div className="submission-detail-meta-item">
              <span>Link da página</span>
              <Link to={`/p/${data.page.slug}`} target="_blank">
                /p/{data.page.slug}
                <FontAwesomeIcon icon={faExternalLink} />
              </Link>
            </div>
          )}
          {data.ip && (
            <div className="submission-detail-meta-item">
              <span>Endereço IP</span>
              <strong>{data.ip}</strong>
            </div>
          )}
          {data.userAgent && (
            <div className="submission-detail-meta-item submission-detail-meta-item-wide">
              <span>User agent</span>
              <code>{data.userAgent}</code>
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        title="Excluir resposta"
        description="Esta ação não pode ser desfeita. Tem certeza que deseja excluir esta resposta?"
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteOpen(false)}
        loading={deleting}
      />
    </div>
  );
}
