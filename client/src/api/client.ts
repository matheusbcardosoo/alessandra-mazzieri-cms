import axios from 'axios';

const apiUrlFromEnv = import.meta.env.VITE_API_URL?.trim();

// No browser, '/api' relativo funciona porque client e server são servidos
// do mesmo domínio. Já durante o SSR (Node, sem origin de request) uma URL
// relativa não tem como ser resolvida — precisamos de um host absoluto
// apontando para a própria API (loopback), lido de uma env var setada pelo
// processo do servidor (ver server.js / dev-server.js).
const ssrApiBase = import.meta.env.SSR
  ? `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000'}/api`
  : undefined;

// Permite configurar API absoluta em VPS/CDN quando necessario.
// Sem configuracao, mantem /api relativo ao mesmo dominio (browser) ou
// resolve para o loopback interno (SSR).
export const API_BASE = apiUrlFromEnv || ssrApiBase || '/api';
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

export const AUTH_FLAG_KEY = 'admin_authed';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  // Timeout explícito: sem isso, uma API lenta/fora do ar trava a requisição
  // indefinidamente. No SSR isso é ainda mais crítico — sem timeout, uma
  // falha na API deixa a página inteira pendurada em vez de cair no
  // fallback (ver prefetchRoute.ts) e responder rápido.
  timeout: import.meta.env.SSR ? 5000 : 15000,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Interceptor de resposta para tratamento global de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401: Nao autenticado - redirecionar para login (apenas no browser; em
    // SSR não há para onde redirecionar, só propagamos o erro).
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.includes('/admin/login')
    ) {
      localStorage.removeItem(AUTH_FLAG_KEY);
      window.location.href = '/admin/login';
      return Promise.reject(new Error('Sessao expirada. Faca login novamente.'));
    }

    // 403: Sem permissao
    if (error.response?.status === 403) {
      return Promise.reject(new Error('Voce nao tem permissao para esta acao.'));
    }

    // 404: Nao encontrado
    if (error.response?.status === 404) {
      return Promise.reject(new Error('NOT_FOUND'));
    }

    // 400/422: Erro de validacao - passar mensagem detalhada do servidor
    if (error.response?.status === 400 || error.response?.status === 422) {
      const data = error.response?.data;
      const errObj = data?.error ?? {};
      let message: string = errObj.message || data?.message || 'Dados invalidos.';
      // Quando o servidor envia issues de validação (Zod), detalhar campo a campo.
      const issues = errObj.issues;
      if (issues) {
        const details = [
          ...(issues.formErrors ?? []),
          ...Object.values((issues.fieldErrors ?? {}) as Record<string, string[]>).flat()
        ].filter(Boolean) as string[];
        if (details.length) {
          message = details.join(' • ');
        }
      }
      console.error('Validation error details:', data);
      return Promise.reject(new Error(message));
    }

    // 500+: Erro do servidor
    if (error.response?.status >= 500) {
      return Promise.reject(new Error('Erro no servidor. Tente novamente mais tarde.'));
    }

    // Erro de rede ou timeout
    if (!error.response) {
      return Promise.reject(new Error('Erro de conexao. Verifique sua internet.'));
    }

    return Promise.reject(error);
  }
);
