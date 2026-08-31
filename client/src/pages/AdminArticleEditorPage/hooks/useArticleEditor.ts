import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useArticles,
  useCreateArticle,
  usePublishArticle,
  useUnpublishArticle,
  useUpdateArticle
} from '@/hooks/queries/useArticles';
import type { Article } from '@/types';

export type ArticleForm = Partial<Article>;

const emptyArticle: ArticleForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  status: 'draft',
  tags: [],
  isFeatured: false
};

export function useArticleEditor(id: string | undefined) {
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { data: articles } = useArticles();
  const current = useMemo(() => articles?.find((a) => a.id === id), [articles, id]);
  const [article, setArticle] = useState<ArticleForm>(current || emptyArticle);
  const [draftAlert, setDraftAlert] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<ArticleForm | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<ArticleForm | null>(null);
  const [hasUploadingBlocks, setHasUploadingBlocks] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [tagLimitWarning, setTagLimitWarning] = useState<string | null>(null);

  const [prevCurrentId, setPrevCurrentId] = useState(current?.id);
  if (current?.id !== prevCurrentId) {
    setPrevCurrentId(current?.id);
    if (current) {
      setArticle({
        ...current,
        isFeatured: current.isFeatured ?? false
      });
      setTagsText(current.tags?.join(', ') ?? '');
    }
  }

  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();
  const publishMutation = usePublishArticle();
  const unpublishMutation = useUnpublishArticle();

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    hasUploadingBlocks;

  const normalizeTags = (input: string) => {
    const seen = new Set<string>();
    let list = input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (list.length > 10) {
      list = list.slice(0, 10);
      setTagLimitWarning('Máximo de 10 tags; extras foram ignoradas.');
    } else {
      setTagLimitWarning(null);
    }
    return list;
  };

  const formatTagsText = (input: string) => normalizeTags(input).join(', ');

  const validate = () => {
    const trimmedTitle = (article.title ?? '').trim();
    const trimmedSlug = (article.slug ?? '').trim();
    const trimmedExcerpt = (article.excerpt ?? '').trim();
    const trimmedContent = (article.content ?? '').trim();
    if (trimmedTitle.length < 3) return 'Informe um título com ao menos 3 caracteres.';
    if (trimmedSlug.length < 3) return 'Informe um slug com ao menos 3 caracteres.';
    if (trimmedExcerpt.length < 10) return 'Resumo precisa de ao menos 10 caracteres.';
    if (trimmedContent.length < 10) return 'Conteúdo precisa de ao menos 10 caracteres.';
    return null;
  };

  const handleSaveDraft = () => {
    if (hasUploadingBlocks) {
      setDraftAlert('Finalize os uploads de imagem antes de salvar.');
      return;
    }
    const tags = normalizeTags(tagsText);
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    const payloadBase: Partial<Article> = {
      ...article,
      tags,
      status: 'draft'
    };
    setArticle((prev) => ({ ...prev, ...payloadBase }));
    if (isNew) {
      createMutation.mutate(payloadBase, {
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
          setFormError(message ?? 'Falha ao salvar o artigo.');
        },
        onSuccess: (data) => navigate(`/admin/articles/${data.id}/edit`, { replace: true })
      });
    } else if (article.id) {
      updateMutation.mutate(
        { id: article.id, payload: payloadBase },
        {
          onError: (err: unknown) => {
            const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
            setFormError(message ?? 'Falha ao atualizar o artigo.');
          },
          onSuccess: (data) => {
            const wasFeatured = !!article.isFeatured;
            const alerts: string[] = [];
            if (data.changedToDraft) {
              alerts.push('Este artigo voltou para rascunho. Publique novamente para atualizar no site.');
            }
            if (data.post) {
              setArticle(data.post);
              if (wasFeatured && !data.post.isFeatured) {
                alerts.push('Posts em destaque precisam estar publicados.');
              }
            }
            if (alerts.length) {
              setDraftAlert(alerts.join(' '));
            }
          }
        }
      );
    }
  };

  const handlePublish = () => {
    if (!article.id) return;
    publishMutation.mutate(article.id, {
      onSuccess: (updatedArticle) => {
        setArticle(updatedArticle);
        setPublishTarget(null);
      }
    });
  };

  const handleRequestPublish = () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    const tags = normalizeTags(tagsText);
    setArticle((prev) => ({ ...prev, tags }));
    setPublishTarget({ ...article, tags });
  };

  const handleMoveToDraft = () => {
    if (!article.id) return;
    unpublishMutation.mutate(article.id, {
      onSuccess: (updatedArticle) => {
        setArticle(updatedArticle);
        setUnpublishTarget(null);
      }
    });
  };

  return {
    article,
    setArticle,
    current,
    isNew,
    tagsText,
    setTagsText,
    tagLimitWarning,
    formError,
    draftAlert,
    publishTarget,
    setPublishTarget,
    unpublishTarget,
    setUnpublishTarget,
    hasUploadingBlocks,
    setHasUploadingBlocks,
    busy,
    isPublishing: publishMutation.isPending,
    isUnpublishing: unpublishMutation.isPending,
    normalizeTags,
    formatTagsText,
    handleSaveDraft,
    handlePublish,
    handleRequestPublish,
    handleMoveToDraft
  };
}
