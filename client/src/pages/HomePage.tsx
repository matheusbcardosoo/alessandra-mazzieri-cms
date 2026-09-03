import { useQuery } from '@tanstack/react-query';
import { fetchHomePage } from '../api/queries';
import { SeoHead } from '../components/SeoHead';
import { PageRenderer } from '../components/PageRenderer';
import { TagMarquee } from '../components/TagMarquee';
import type { Page, PageLayoutV2 } from '../types';

export function HomePage() {
  const {
    data: homePage,
    isLoading: isLoadingHome,
    isError: isHomeError,
    refetch: refetchHome
  } = useQuery<Page>({ queryKey: ['home', 'page-builder'], queryFn: fetchHomePage });

  const seoTitle = homePage?.title ?? 'Início';
  const seoDescription = homePage?.description ?? '[Descreva em 1-2 frases o que você oferece e para quem]';

  const sections = (homePage?.layout as PageLayoutV2 | undefined)?.sections ?? [];
  const heroSection = sections[0];
  const restSections = sections.slice(1);

  return (
    <>
      <SeoHead title={seoTitle} description={seoDescription} appendSiteName={false} />

      <section className="section-block" style={{ paddingTop: 0 }}>
        <div className="container" style={{ display: 'grid', gap: '1rem' }}>
          {isLoadingHome && (
            <div className="admin-card" style={{ padding: '1.5rem' }}>
              <div className="skeleton" style={{ height: '18px', width: '180px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '12px', width: '60%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: '240px', width: '100%' }} />
            </div>
          )}

          {isHomeError && (
            <div className="admin-card" style={{ padding: '1.5rem' }}>
              <div className="admin-empty">
                <h3>Erro ao carregar a Home</h3>
                <p className="muted">Não foi possível recuperar o conteúdo dinâmico.</p>
                <button className="btn btn-primary" type="button" onClick={() => refetchHome()}>
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {!isLoadingHome && !isHomeError && homePage && heroSection && (
            <PageRenderer layout={{ version: 2, sections: [heroSection] }} pageSlug="home" />
          )}
        </div>
      </section>

      {!isLoadingHome && !isHomeError && homePage && restSections.length > 0 && <TagMarquee />}

      {!isLoadingHome && !isHomeError && homePage && restSections.length > 0 && (
        <PageRenderer layout={{ version: 2, sections: restSections }} pageSlug="home" />
      )}
      {!isLoadingHome && !isHomeError && !homePage && (
        <div className="container">
          <div className="admin-card admin-empty">Nenhum conteúdo publicado para a Home.</div>
        </div>
      )}
    </>
  );
}
