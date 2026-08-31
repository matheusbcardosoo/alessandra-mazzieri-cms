import { Suspense, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AUTH_FLAG_KEY } from '../api/client';
import { ContentLoader } from '../components/ContentLoader';
import { useCurrentUser } from '../hooks/queries/useCurrentUser';
import type { SectionKey, UserRole } from '../types';

export function AdminSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ContentLoader message="Carregando..." />}>{children}</Suspense>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  // No servidor (SSR) não há localStorage: tratamos como não autenticado e
  // deixamos o client re-hidratar/redirecionar corretamente após checar o
  // cookie httpOnly real. O admin nunca depende do HTML gerado por SSR para
  // decidir a UI de autenticação — isso é só o shell inicial.
  const authed = typeof window !== 'undefined' ? localStorage.getItem(AUTH_FLAG_KEY) : null;
  if (!authed) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <ContentLoader message="Carregando..." />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

// Espelha o requireSection do servidor (server/src/middleware/permissions.ts):
// admin sempre passa, independente de sectionAccess; demais papéis precisam
// ter a seção liberada. Sem isso, um editor sem acesso a uma seção consegue
// navegar direto pra URL e só recebe um 403 cru da API — esta guarda dá um
// redirect limpo antes de a tela sequer tentar chamar a API.
export function RequireSection({ section, children }: { section: SectionKey; children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <ContentLoader message="Carregando..." />;
  if (!user || (user.role !== 'admin' && user.sectionAccess?.[section] !== true)) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
