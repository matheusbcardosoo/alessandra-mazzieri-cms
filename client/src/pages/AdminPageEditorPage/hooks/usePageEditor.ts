import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureLayoutV2 } from '@/utils/pageLayoutHelpers';
import { ensureHeroInSection } from '@/utils/heroMigration';
import { useAdminHomePage, useAdminPage } from '@/hooks/queries/usePage';
import { useCreatePage, usePublishPage, useUnpublishPage, useUpdatePage } from '@/hooks/queries/usePages';
import type { PageLayout, PageLayoutV2, PageStatus } from '@/types';

export type PageForm = {
  id?: string;
  title: string;
  slug: string;
  pageKey?: string | null;
  description?: string | null;
  layout: PageLayoutV2;
  status: PageStatus;
  publishedAt?: string | null;
};

const emptyLayout: PageLayoutV2 = { version: 2, sections: [] };

const emptyPage: PageForm = {
  title: '',
  slug: '',
  pageKey: null,
  description: '',
  layout: emptyLayout,
  status: 'draft'
};

const serializeForDirty = (p: PageForm) =>
  JSON.stringify({ t: p.title, s: p.slug, d: p.description ?? '', l: p.layout });

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const validatePage = (current: PageForm, isHomePage: boolean): string | null => {
  if (!current.title.trim() || current.title.trim().length < 3)
    return 'Informe um titulo com ao menos 3 caracteres.';
  if (!isHomePage && (!current.slug.trim() || current.slug.trim().length < 2))
    return 'Informe um slug para a pagina.';
  return null;
};

export function usePageEditor(id: string | undefined, pageKey?: string) {
  const isHomePage = pageKey === 'home';
  const isNew = !isHomePage && (!id || id === 'new');
  const navigate = useNavigate();

  const homeQuery = useAdminHomePage(isHomePage);
  const pageQuery = useAdminPage(id, !isHomePage && !isNew && !!id);
  const existingPage = isHomePage ? homeQuery.data : pageQuery.data;
  const isLoadingPage = isHomePage ? homeQuery.isLoading : pageQuery.isLoading;
  const isPageError = isHomePage ? homeQuery.isError : pageQuery.isError;
  const refetchPage = isHomePage ? homeQuery.refetch : pageQuery.refetch;

  const [page, setPage] = useState<PageForm>(emptyPage);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(serializeForDirty(emptyPage));
  const [formError, setFormError] = useState<string | null>(null);
  const [draftAlert, setDraftAlert] = useState<string | null>(null);

  const existingPageKey = existingPage ? `${existingPage.id}:${isHomePage}` : undefined;
  // Inicializado sempre como `undefined` (não com `existingPageKey`) para que,
  // se a query já vier resolvida no primeiro render (cache do React Query
  // "quente" de uma visita anterior), a comparação abaixo ainda detecte uma
  // mudança e sincronize `page` — senão `prev` nasce igual a `existingPageKey`
  // nesse mesmo render e o bloco nunca roda, deixando o form vazio até um
  // hard refresh (que zera o QueryClient) forçar o carregamento assíncrono.
  const [prevExistingPageKey, setPrevExistingPageKey] = useState<string | undefined>(undefined);
  if (existingPageKey !== prevExistingPageKey) {
    setPrevExistingPageKey(existingPageKey);
    if (existingPage) {
      const normalizedLayout = ensureLayoutV2(existingPage.layout);
      let finalLayout = normalizedLayout;
      if (isHomePage && normalizedLayout.sections.length > 0) {
        const firstSection = normalizedLayout.sections[0];
        const hasHero = firstSection.cols?.some((col) =>
          col.blocks?.some((block) => block.type === 'hero')
        );
        if (!hasHero) {
          const sectionWithHero = ensureHeroInSection(firstSection);
          finalLayout = {
            ...normalizedLayout,
            sections: [sectionWithHero, ...normalizedLayout.sections.slice(1)]
          };
        }
      }
      const loaded: PageForm = {
        id: existingPage.id,
        title: existingPage.title,
        slug: isHomePage ? 'home' : existingPage.slug,
        pageKey: existingPage.pageKey ?? (isHomePage ? 'home' : null),
        description: existingPage.description ?? '',
        layout: finalLayout,
        status: isHomePage ? 'published' : existingPage.status ?? 'draft',
        publishedAt: existingPage.publishedAt ?? null
      };
      setPage(loaded);
      setSavedSnapshot(serializeForDirty(loaded));
    }
  }

  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();
  const publishMutation = usePublishPage();
  const unpublishMutation = useUnpublishPage();

  const handleMutationError = (err: unknown, fallback: string) => {
    const responseMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
    // O interceptor do axios já normaliza erros de validação em err.message.
    const directMsg = err instanceof Error && err.message && err.message !== 'NOT_FOUND' ? err.message : undefined;
    setFormError(responseMsg ?? directMsg ?? fallback);
  };

  const busyMutations =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending;

  const saveDraft = async (): Promise<{ id: string } | null> => {
    const error = validatePage(page, isHomePage);
    if (error) {
      setFormError(error);
      return null;
    }
    setFormError(null);
    const payload: PageForm = {
      ...page,
      slug: isHomePage ? 'home' : slugify(page.slug),
      pageKey: isHomePage ? 'home' : page.pageKey ?? null,
      status: isHomePage ? 'published' : 'draft',
      layout: ensureLayoutV2(page.layout)
    };
    const applyUpdate = async (pageId: string) => {
      try {
        const data = await updateMutation.mutateAsync({ id: pageId, payload });
        setPage((prev) => ({
          ...prev,
          ...data.page,
          layout: ensureLayoutV2(data.page.layout),
          status: data.page.status ?? 'draft'
        }));
        setSavedSnapshot(serializeForDirty({ ...payload, layout: ensureLayoutV2(data.page.layout) }));
        if (data.changedToDraft) {
          setDraftAlert('Esta página voltou para rascunho. Publique novamente para atualizar no site.');
        }
        return data.page;
      } catch (err) {
        handleMutationError(err, 'Falha ao atualizar página.');
        throw err;
      }
    };

    if (isHomePage) {
      if (!page.id) {
        setFormError('Home não carregada. Tente novamente.');
        return null;
      }
      return applyUpdate(page.id);
    }
    if (isNew || !page.id) {
      try {
        const data = await createMutation.mutateAsync(payload);
        const created: PageForm = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          description: data.description ?? '',
          layout: ensureLayoutV2(data.layout),
          status: data.status ?? 'draft',
          publishedAt: data.publishedAt ?? null
        };
        setPage(created);
        setSavedSnapshot(serializeForDirty(created));
        setTimeout(() => navigate(`/admin/pages/${data.id}/edit`, { replace: true }), 0);
        return data;
      } catch (err) {
        handleMutationError(err, 'Falha ao salvar página.');
        throw err;
      }
    }
    return applyUpdate(page.id);
  };

  const publish = async (pageId: string) => {
    const data = await publishMutation.mutateAsync(pageId);
    setPage((prev) => ({
      ...prev,
      ...data,
      layout: ensureLayoutV2(data.layout),
      status: data.status ?? 'published'
    }));
    setDraftAlert(null);
    return data;
  };

  // Chamado após um revert bem-sucedido (PageVersionHistoryModal já disparou
  // a mutation) — sincroniza o form local com o conteúdo restaurado, igual
  // publish() faz, e atualiza o snapshot "salvo" pra não marcar a página como
  // suja (o conteúdo já está persistido no servidor).
  const applyRevertedPage = (data: { id: string; title: string; description?: string | null; layout: PageLayout; status?: PageStatus }) => {
    const loaded: PageForm = {
      ...page,
      ...data,
      layout: ensureLayoutV2(data.layout),
      status: data.status ?? 'published'
    };
    setPage(loaded);
    setSavedSnapshot(serializeForDirty(loaded));
    setDraftAlert(null);
  };

  const handleMoveToDraft = () => {
    if (!page.id || isHomePage) return;
    unpublishMutation.mutate(page.id, {
      onSuccess: (data) => {
        setPage((prev) => ({
          ...prev,
          ...data,
          layout: ensureLayoutV2(data.layout),
          status: 'draft'
        }));
      }
    });
  };

  const isDirty = serializeForDirty(page) !== savedSnapshot;

  return {
    page,
    setPage,
    isDirty,
    formError,
    draftAlert,
    busyMutations,
    isNew,
    isHomePage,
    isLoadingPage,
    isPageError,
    refetchPage,
    saveDraft,
    publish,
    handleMoveToDraft,
    applyRevertedPage
  };
}
