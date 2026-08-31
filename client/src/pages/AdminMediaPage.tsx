import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { ConfirmModal, Modal } from '../components/AdminUI';
import { useDeleteMedia, useMedia, useUpdateMedia, useUploadMedia } from '../hooks/queries/useMedia';
import { SeoHead } from '../components/SeoHead';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faUpload, faMagnifyingGlass, faTag, faTimes, faPencil, faTrash, faArrowUpFromBracket, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { toast } from '../components/toastStore';
import { getApiErrorMessage } from '../utils/apiError';
import type { Media } from '../types';

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = (raw: string) => {
    const newTags = raw.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t && !tags.includes(t));
    if (newTags.length) onChange([...tags, ...newTags]);
    setInput('');
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="media-tag-input">
      {tags.map((tag) => (
        <span key={tag} className="media-tag-chip">
          <FontAwesomeIcon icon={faTag} style={{ fontSize: '0.65rem' }} />
          {tag}
          <button type="button" onClick={() => remove(tag)} aria-label={`Remover tag ${tag}`}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </span>
      ))}
      <input
        className="media-tag-inner-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
          if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1]);
        }}
        onBlur={() => input && add(input)}
        placeholder={tags.length ? '' : 'Adicionar tags (Enter ou vírgula)'}
      />
    </div>
  );
}

function UploadDropzone({ onFile }: { onFile: (f: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const validate = (f: File): boolean => {
    if (!f.type.startsWith('image/')) {
      toast.warning('Arquivo inválido', { message: 'Selecione PNG, JPG ou WEBP.', code: 'MEDIA-002' });
      return false;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.warning('Arquivo muito grande', { message: 'Máximo 5 MB.', code: 'MEDIA-003' });
      return false;
    }
    return true;
  };

  const pick = (f: File) => {
    if (!validate(f)) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    onFile(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  };

  return (
    <div
      className={`media-dropzone ${isDragging ? 'is-dragging' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
    >
      {preview ? (
        <div className="media-dropzone-preview">
          <img src={preview} alt="Preview" />
          <button type="button" className="media-dropzone-change btn btn-outline btn-sm"
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
          >
            Trocar imagem
          </button>
        </div>
      ) : (
        <div className="media-dropzone-placeholder">
          <span className="media-dropzone-icon"><FontAwesomeIcon icon={faImage} /></span>
          <p className="media-dropzone-title">Arraste uma imagem aqui</p>
          <p className="media-dropzone-hint">ou <span>clique para selecionar</span></p>
          <p className="media-dropzone-formats">PNG, JPG, WEBP (máx. 5 MB)</p>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
    </div>
  );
}

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [alt, setAlt] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const uploadMutation = useUploadMedia();

  const reset = () => { setFile(null); setTitle(''); setAlt(''); setDescription(''); setTags([]); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!file) return;
    uploadMutation.mutate({ file, alt, title, description, tags }, {
      onSuccess: () => {
        toast.success('Imagem enviada com sucesso');
        handleClose();
      },
      onError: (error: unknown) => {
        toast.error('Falha no upload', {
          message: getApiErrorMessage(error, 'Não foi possível enviar a imagem.'),
          code: 'MEDIA-001',
        });
      }
    });
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Enviar imagem" width={640}>
      <div className="media-upload-form">
        <UploadDropzone onFile={setFile} />

        <div className="form-field">
          <label htmlFor="mu-title">Título</label>
          <input id="mu-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da imagem" />
        </div>

        <div className="form-field">
          <label htmlFor="mu-alt">Texto alternativo (alt)</label>
          <input id="mu-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Descreva a imagem para acessibilidade" />
        </div>

        <div className="form-field">
          <label htmlFor="mu-desc">Descrição</label>
          <textarea id="mu-desc" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição interna opcional" rows={2} style={{ resize: 'vertical' }} />
        </div>

        <div className="form-field">
          <label>Tags</label>
          <TagInput tags={tags} onChange={setTags} />
          <p className="form-hint">Use tags para facilitar a busca. Ex: hero, capa, blog</p>
        </div>
      </div>

      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={handleClose}>Cancelar</button>
        <button className="btn btn-primary" type="button"
          disabled={!file || uploadMutation.isPending} onClick={handleSubmit}>
          {uploadMutation.isPending ? 'Enviando...' : 'Enviar imagem'}
        </button>
      </div>
    </Modal>
  );
}

function EditModal({ item, onClose }: { item: Media; onClose: () => void }) {
  const [title, setTitle] = useState(item.title ?? '');
  const [alt, setAlt] = useState(item.alt ?? '');
  const [description, setDescription] = useState(item.description ?? '');
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [file, setFile] = useState<File | null>(null);
  const updateMutation = useUpdateMedia();

  const handleSave = () => {
    updateMutation.mutate({ id: item.id, payload: { alt, title, description, tags, file } }, {
      onSuccess: () => {
        toast.success('Imagem atualizada');
        onClose();
      },
      onError: (error: unknown) => {
        toast.error('Falha ao salvar', {
          message: getApiErrorMessage(error, 'Não foi possível salvar.'),
          code: 'MEDIA-005',
        });
      }
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Editar imagem" width={640}>
      <div className="media-upload-form">
        <div className="media-edit-preview">
          <img src={item.url} alt={item.alt ?? ''} />
        </div>

        <div className="form-field">
          <label>Substituir arquivo</label>
          <label className={`media-file-picker${file ? ' has-file' : ''}`}>
            <input type="file" accept="image/*" className="media-file-picker-input"
              onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            <span className="media-file-picker-icon">
              <FontAwesomeIcon icon={file ? faCircleCheck : faArrowUpFromBracket} />
            </span>
            <span className="media-file-picker-text">
              <span className="media-file-picker-title">
                {file ? 'Imagem selecionada' : 'Escolher nova imagem'}
              </span>
              <span className="media-file-picker-sub">
                {file ? file.name : 'Clique para procurar · PNG, JPG ou WEBP'}
              </span>
            </span>
            <span className="media-file-picker-action">{file ? 'Trocar' : 'Procurar'}</span>
          </label>
        </div>

        <div className="form-field">
          <label htmlFor="me-title">Título</label>
          <input id="me-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da imagem" />
        </div>

        <div className="form-field">
          <label htmlFor="me-alt">Texto alternativo (alt)</label>
          <input id="me-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Descreva a imagem para acessibilidade" />
        </div>

        <div className="form-field">
          <label htmlFor="me-desc">Descrição</label>
          <textarea id="me-desc" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição interna opcional" rows={2} style={{ resize: 'vertical' }} />
        </div>

        <div className="form-field">
          <label>Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>
      </div>

      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" type="button"
          disabled={updateMutation.isPending} onClick={handleSave}>
          {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}

export function AdminMediaPage() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<Media | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);

  const { data: media = [], isLoading } = useMedia(
    activeTag ? { tag: activeTag } : search ? { search } : undefined
  );
  const deleteMutation = useDeleteMedia();

  // Collect all tags from current results for filter chips
  const allTags = [...new Set((media).flatMap((m) => m.tags ?? []))].sort();

  return (
    <div className="admin-page admin-media-page">
      <SeoHead title="Imagens" />
      <div className="admin-page-header admin-media-header">
        <div>
          <h1>Biblioteca de imagens</h1>
          <p>Envie capas e imagens inline.</p>
        </div>
        <button className="btn btn-primary admin-media-upload-button" type="button" onClick={() => setShowUpload(true)}>
          <FontAwesomeIcon icon={faUpload} />
          Enviar imagem
        </button>
      </div>

      <div className="admin-card admin-media-toolbar">
        <div className="media-search-bar">
          <span className="media-search-icon"><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
          <input
            className="media-search-input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveTag(null); }}
            placeholder="Buscar por título, alt ou tag..."
          />
          {(search || activeTag) && (
            <button className="media-search-clear" type="button"
              onClick={() => { setSearch(''); setActiveTag(null); }} aria-label="Limpar busca">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="media-tag-filters">
            {allTags.map((tag) => (
              <button key={tag} type="button"
                className={`media-tag-filter-chip ${activeTag === tag ? 'is-active' : ''}`}
                onClick={() => { setActiveTag(activeTag === tag ? null : tag); setSearch(''); }}>
                <FontAwesomeIcon icon={faTag} style={{ fontSize: '0.65rem' }} />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card">
        {isLoading ? (
          <div className="admin-empty">Carregando imagens...</div>
        ) : media.length === 0 ? (
          <div className="admin-empty admin-media-empty">
            <FontAwesomeIcon icon={faImage} />
            <p>
              {search || activeTag ? 'Nenhuma imagem encontrada para esta busca.' : 'Nenhuma imagem cadastrada'}
            </p>
            {!search && !activeTag && (
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowUpload(true)}>
                Enviar primeira imagem
              </button>
            )}
          </div>
        ) : (
          <div className="media-grid">
            {media.map((item) => (
              <div key={item.id} className="media-grid-item">
                <div className="media-grid-thumb">
                  <img src={item.url} alt={item.alt ?? ''} loading="lazy" />
                  <div className="media-grid-overlay">
                    <button className="media-grid-action" type="button" onClick={() => setEditing(item)} aria-label="Editar">
                      <FontAwesomeIcon icon={faPencil} />
                    </button>
                    <button className="media-grid-action media-grid-action--danger" type="button"
                      onClick={() => setDeleteTarget(item)} aria-label="Excluir">
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
                <div className="media-grid-info">
                  <p className="media-grid-title" title={item.title ?? item.alt ?? ''}>
                    {item.title ?? item.alt ?? <em style={{ opacity: 0.5 }}>Sem título</em>}
                  </p>
                  {(item.tags ?? []).length > 0 && (
                    <div className="media-grid-tags">
                      {(item.tags ?? []).slice(0, 3).map((t) => (
                        <span key={t} className="media-tag-chip media-tag-chip--sm"
                          onClick={() => { setActiveTag(t); setSearch(''); }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
      {editing && <EditModal item={editing} onClose={() => setEditing(null)} />}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover imagem"
        description={`Deseja remover "${deleteTarget?.title ?? deleteTarget?.alt ?? 'sem nome'}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, {
          onSuccess: () => {
            toast.success('Imagem removida');
            setDeleteTarget(null);
          }
        })}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
