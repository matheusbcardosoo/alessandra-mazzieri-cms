import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

// Redireciona 301 entre a variante com e sem "www" do mesmo domínio para a
// forma canônica definida em SITE_URL — resolve o item do Seobility "Use 301
// redirects to drive traffic to URLs with the same domain and sub domain
// (www and non-www subdomain)" (Fase 4, docs/plano-template.md).
//
// Não mexe em protocolo (http/https): isso é responsabilidade do
// proxy/load balancer na frente da aplicação. Se SITE_URL não estiver
// configurada com uma URL válida, não faz nada (evita redirect loop em
// ambientes locais/mal configurados).
export function canonicalHostRedirect(req: Request, res: Response, next: NextFunction) {
  let canonicalHost: string;
  try {
    canonicalHost = new URL(env.SITE_URL).host;
  } catch {
    return next();
  }

  const requestHost = req.hostname;
  if (!requestHost || requestHost === canonicalHost) return next();

  const isWwwVariant = requestHost === `www.${canonicalHost}` || `www.${requestHost}` === canonicalHost;
  if (!isWwwVariant) return next();

  const redirectUrl = `${req.protocol}://${canonicalHost}${req.originalUrl}`;
  return res.redirect(301, redirectUrl);
}
