import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArticleStatusBadge, ConfirmModal, IconButton } from '../components/AdminUI';
import { SeoHead } from '../components/SeoHead';
import { useArticles, useDeleteArticle, usePublishArticle, useUnpublishArticle } from '../hooks/queries/useArticles';
import type { Article } from '../types';

export function AdminArticlesPage() {
  const navigate = useNavigate();
  const { data: articles } = useArticles();
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [publishTarget, setPublishTarget] = useState<Article | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<Article | null>(null);

  const deleteMutation = useDeleteArticle();
  const publishMutation = usePublishArticle();
  const unpublishMutation = useUnpublishArticle();

  return (
    <div className="admin-page">
      <SeoHead title="Artigos" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Artigos</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>Escreva, formate e publique conteúdos.</p>
      </div>
      <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
        <Link className="btn btn-primary" to="/admin/articles/new">
          Novo artigo
        </Link>
      </div>

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Acessos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {articles?.map((article) => (
              <tr key={article.id}>
                <td>{article.title}</td>
                <td>
                  <ArticleStatusBadge status={article.status} />
                </td>
                <td>{article.views ?? 0}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                    {article.status === 'published' && (
                      <IconButton
                        icon="globe"
                        label="Ver no site"
                        tone="info"
                        onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                      />
                    )}
                    {article.status === 'draft' ? (
                      <IconButton icon="publish" label="Publicar" tone="info" onClick={() => setPublishTarget(article)} />
                    ) : (
                      <IconButton icon="unpublish" label="Mover para rascunho" onClick={() => setUnpublishTarget(article)} />
                    )}
                    <IconButton icon="edit" label="Editar" tone="info" onClick={() => navigate(`/admin/articles/${article.id}/edit`)} />
                    <IconButton icon="trash" label="Remover" tone="danger" onClick={() => setDeleteTarget(article)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover artigo"
        description={`Deseja remover "${deleteTarget?.title}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="Publicar artigo"
        description={`Publicar "${publishTarget?.title}"? Ele ficará visível no site.`}
        onConfirm={() => publishTarget && publishMutation.mutate(publishTarget.id, { onSuccess: () => setPublishTarget(null) })}
        confirmLabel="Publicar"
        loading={publishMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!unpublishTarget}
        onClose={() => setUnpublishTarget(null)}
        title="Mover para rascunho"
        description={`Mover "${unpublishTarget?.title}" para rascunho? Sairá do site até ser publicado novamente.`}
        onConfirm={() => unpublishTarget && unpublishMutation.mutate(unpublishTarget.id, { onSuccess: () => setUnpublishTarget(null) })}
        confirmLabel="Mover"
        loading={unpublishMutation.isPending}
      />
    </div>
  );
}
