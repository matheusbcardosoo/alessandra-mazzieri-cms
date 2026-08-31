import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout';
import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { BlogPage } from '../pages/BlogPage';
import { ArticlePage } from '../pages/ArticlePage';
import { DynamicPage } from '../pages/DynamicPage';

/**
 * Só as rotas públicas — usadas exclusivamente pelo entry-server.tsx (SSR).
 *
 * Por quê duplicar em vez de reaproveitar o bloco público de AppRoutes.tsx:
 * o admin (Tiptap, dnd-kit, react-image-crop, react-easy-crop...) importa
 * pacotes que fazem `import 'algo.css'` direto de dentro de node_modules.
 * Em dev, o SSR carrega dependências de node_modules "externalizadas" (via
 * require/import nativo do Node, fora do pipeline do Vite) — e o loader
 * nativo do Node não sabe processar `.css`, o que quebra o SSR mesmo em
 * páginas que nunca renderizam nada do admin. Como o admin também não tem
 * ganho de SEO com SSR (é autenticado, não indexado), a rota mais simples e
 * robusta é nem importar esse código no bundle de SSR.
 *
 * Se adicionar/remover uma rota pública aqui, replique a mudança em
 * AppRoutes.tsx (client) — as duas listas precisam ficar em sincronia.
 */
export function PublicRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/p/:slug" element={<DynamicPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<ArticlePage />} />
      </Route>
    </Routes>
  );
}
