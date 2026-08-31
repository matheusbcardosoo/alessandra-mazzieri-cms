# web-cms-template

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5">
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 14+">
  <img src="https://img.shields.io/badge/Supabase-Storage-3FCF8E?logo=supabase&logoColor=white" alt="Supabase Storage">
  <img src="https://img.shields.io/badge/Redis-cache_opcional-DC382D?logo=redis&logoColor=white" alt="Redis (opcional)">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT">
</p>

Template Node.js de site institucional com CMS próprio baseado em blocos. Permite criar e editar páginas através de um editor visual com seções, colunas e blocos de conteúdo — pronto para ser adaptado a partir de um projeto simples (HTML/CSS/JS) por uma IA assistente de código.

Este repositório é um **GitHub template repository**: use o botão "Use this template" no GitHub (ou `gh repo create --template <owner>/web-cms-template`) para gerar um novo projeto a partir dele, em vez de fazer fork.

## Sumário

- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Rodando localmente (desenvolvimento)](#rodando-localmente-desenvolvimento)
- [Deploy em produção (VPS / EasyPanel)](#deploy-em-produção-vps--easypanel)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Para uma IA assistente: migrando um projeto simples para este template](#para-uma-ia-assistente-migrando-um-projeto-simples-para-este-template)
- [CI](#ci)
- [Checklist ao gerar um repositório a partir deste template](#checklist-ao-gerar-um-repositório-a-partir-deste-template)
- [Documentação](#documentação)

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Query |
| Backend | Express 5, TypeScript, Prisma |
| Banco | PostgreSQL |
| Storage | Supabase Storage |
| Cache | Redis (opcional) |
| Auth | JWT (cookie `httpOnly`) |

## Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- Conta no [Supabase](https://supabase.com) (para storage de imagens)
- Docker (para subir o Redis local via `docker-compose.yml`) — opcional, o app funciona sem Redis

## Rodando localmente (desenvolvimento)

### 1. Clonar e instalar dependências

```bash
git clone <url-do-repositorio>
cd web-cms-template
npm install
```

`npm install` na raiz já instala `server/` e `client/` automaticamente (hook `postinstall`) e gera o Prisma Client — não é preciso rodar `npm install` dentro de cada pasta manualmente.

### 2. Variáveis de ambiente

```bash
cp .env.example .env
cp client/.env.example client/.env.local
```

Preencher no `.env`:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `JWT_SECRET` | String aleatória (mín. 16 chars) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Credenciais do painel Supabase |
| `SUPABASE_STORAGE_BUCKET` | Nome do bucket criado no Supabase |
| `SITE_URL` | URL pública canônica (usada em `robots.txt`, `sitemap.xml`, `llms.txt` e no redirect 301 www/non-www) |

### 3. Banco de dados

```bash
npx prisma migrate dev
```

### 4. Subir em modo desenvolvimento

`npm run dev` (raiz) já sobe o Redis via Docker automaticamente (hook `predev` roda `docker compose up -d`; se o Docker não estiver disponível, o app segue sem cache):

```bash
npm run dev   # server + client concorrentes, com Redis via Docker
```

Alternativamente, para rodar server e client em terminais separados:

```bash
npm run docker:up    # sobe o Redis manualmente (opcional)

# Terminal 1 — servidor (porta 4000)
cd server && npm run dev

# Terminal 2 — cliente (porta 5173)
cd client && npm run dev
```

Acesse:
- Site público: http://localhost:5173
- Admin: http://localhost:5173/admin

## Deploy em produção (VPS / EasyPanel)

O projeto não possui `Dockerfile` próprio — em produção ele roda como uma aplicação Node.js padrão (build + `npm start`), o que é compatível com builders automáticos como **Nixpacks** (usado pelo EasyPanel, Railway, etc.).

### Passo a passo no EasyPanel

1. **Criar um serviço App** apontando para este repositório Git (branch de produção).
2. **Build command:**
   ```bash
   npm run build
   ```
   Esse script instala e builda `client` (Vite) e `server` (TypeScript + `prisma generate`) em sequência.
3. **Start command:**
   ```bash
   npm start
   ```
   Equivale a `node server.js`, que serve a API e o client buildado (SSR) na mesma porta.
4. **Variáveis de ambiente:** configurar as mesmas chaves do `.env.example` (seção "VPS/PRODUCTION CONFIGURATION") direto no painel do EasyPanel — nunca commitar o `.env` real. Não é necessário definir `PORT`: a plataforma injeta a porta automaticamente.
5. **Banco de dados PostgreSQL:** provisionar uma instância (serviço gerenciado do EasyPanel ou externo) e apontar `DATABASE_URL` para ela. Rodar as migrações antes do primeiro start:
   ```bash
   npx prisma migrate deploy
   ```
6. **Redis (opcional, recomendado):** provisionar um serviço Redis no EasyPanel e apontar `REDIS_URL` para ele (formato `rediss://:senha@host:porta`). Sem Redis o app funciona normalmente, apenas sem cache permanente das configurações públicas.
7. **Supabase Storage:** garantir que `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET` apontem para o projeto/bucket corretos de produção.
8. **Domínio:** configurar o domínio/HTTPS no EasyPanel e definir `SITE_URL` (e `VITE_PUBLIC_URL`/`VITE_API_URL` no client, via `client/.env.production` antes do build) com a URL pública final.

> O mesmo fluxo se aplica a qualquer VPS gerenciada por builder Nixpacks-compatível ou a um deploy manual (Node 20+, `npm run build` seguido de `npm start` atrás de um reverse proxy como Nginx/Caddy).

## Scripts disponíveis

| Script (raiz) | Descrição |
|---|---|
| `npm run dev` | Sobe server + client em modo desenvolvimento (com Redis via Docker) |
| `npm run build` | Builda client e server para produção |
| `npm start` | Inicia o servidor em produção (`node server.js`) |
| `npm test` | Roda os testes de client e server |
| `npm run docker:up` / `npm run docker:down` | Sobe/derruba o Redis local manualmente |

## Estrutura do projeto

```
/
├── client/          Frontend React (Vite)
├── server/          Backend Express (TypeScript)
├── prisma/          Schema do banco e migrações
└── docs/            Documentação e planos de execução
```

Detalhes de arquitetura, sistema de blocos e convenções de código estão em [`CLAUDE.md`](./CLAUDE.md).

## Para uma IA assistente: migrando um projeto simples para este template

Se você é uma IA de código encarregada de adaptar um site estático (HTML/CSS/JS) para este template, siga esta ordem:

1. **Leia `docs/contrato-de-conteudo.md`** — é a referência de qual campo do banco (`SiteSettings`, `Page`, `Article`, tema, blocos) corresponde a cada tipo de conteúdo do projeto simples. Não invente novos campos de schema antes de checar se já existe um genérico equivalente lá.
2. **Inventarie o projeto simples** antes de escrever qualquer código: liste páginas (`.html`), seções de cada página, textos fixos de header/footer (contato, redes sociais, horário), imagens e a paleta de cores/tipografia usada no CSS.
3. **Suba o app com o banco recém-migrado (`npx prisma migrate dev`, sem rodar seed) e complete o assistente em `/admin/setup`.** Ele só fica disponível uma vez, enquanto não existe nenhum admin — não precisa (e não deve) editar `server/src/prisma/seed.ts` à mão nem configurar `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` para isso. O assistente cria a conta admin e preenche o essencial de `SiteSettings` (nome do site, contato, WhatsApp, redes sociais, horários) e os rótulos de Home/Blog no menu.
4. **Mapeie o restante das configurações globais** que o assistente não cobre (logo, paleta de cores/tipografia do tema, CNPJ, registro profissional, endereço, SEO) via `/admin/settings` ou chamadas diretas a `/api/admin/site-settings`.
5. **Mapeie cada página estática** para um registro `Page` com `layout` (`sections[].cols[].blocks[]`), escolhendo sempre o bloco mais específico disponível em `client/src/blocks/` (ex.: uma seção "nossos serviços" vira bloco `services`, não `text` solto) — só assim o conteúdo fica editável no admin depois.
6. **Nunca copie HTML/CSS bruto do projeto simples para dentro do template.** O layout visual final é resultado do tema (`SiteSettings.theme`) + blocos existentes, não de markup importado.
7. **Rode `npm run build && npm test`** (raiz) ao final para garantir que o build SSR e os testes existentes continuam passando antes de considerar a migração concluída.
8. Documente qualquer campo realmente específico do nicho (sem equivalente genérico) no `CLAUDE.md` do projeto gerado — nunca neste template.
9. **Regenere os prints do guia do cliente final** (`/admin/ajuda`) contra a instância já populada com o conteúdo migrado: suba o app (`npm run dev`, ou build + start), defina `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` com as credenciais da conta admin criada no passo 3 (o script de screenshots loga com esses valores) e rode `npm run generate:help-screenshots` (Playwright — na primeira vez rode também `npx playwright install chromium`). O texto de cada tutorial não muda entre projetos (descreve a mecânica do admin, sempre igual); só as imagens em `client/public/help/` são sobrescritas, agora refletindo a logo, as cores e o conteúdo reais do cliente em vez dos dados genéricos do template. Ver Fase 8 em `docs/plano-template.md`.

`server/src/prisma/seed.ts` continua existindo, mas só para popular a instância de demonstração usada pelo Lighthouse CI (`.github/workflows/lighthouse-ci.yml`) — não é mais o caminho recomendado para configurar um site novo.

## CI

Todo PR roda o workflow `.github/workflows/lighthouse-ci.yml`: builda o app em modo produção (client + SSR + server), sobe-o contra um Postgres efêmero com dados de seed e roda o Lighthouse (`lhci`) em `/`, `/sobre`, `/blog` e `/contato`. Notas mínimas de performance/acessibilidade/SEO/boas práticas estão em `lighthouserc.json` — o PR falha se alguma página regredir abaixo delas.

## Checklist ao gerar um repositório a partir deste template

- [ ] No GitHub, em **Settings → General**, marcar **Template repository** (só precisa ser feito uma vez, no repositório `web-cms-template` original — quem gera um novo projeto a partir dele já não precisa repetir esse passo).
- [ ] Renomear `name`/`description` em `package.json`, `client/package.json` e `server/package.json`.
- [ ] Preencher `.env` e `client/.env.production` com os valores reais (Supabase, `SITE_URL`, etc.) e rodar `npx prisma migrate dev`.
- [ ] Completar o assistente em `/admin/setup` (conta admin + configurações essenciais + menu) — disponível só uma vez, antes de qualquer outro passo de conteúdo.
- [ ] Rodar a migração de conteúdo do projeto simples (ver seção ["Para uma IA assistente"](#para-uma-ia-assistente-migrando-um-projeto-simples-para-este-template) acima).
- [ ] Confirmar que o workflow de Lighthouse CI passa antes do primeiro merge.

## Documentação

- Arquitetura e convenções técnicas: [`CLAUDE.md`](./CLAUDE.md)
- Plano de evolução do template: [`docs/plano-template.md`](./docs/plano-template.md)
- Contrato de conteúdo (migração de projeto simples → template): [`docs/contrato-de-conteudo.md`](./docs/contrato-de-conteudo.md)

## Licença

[MIT](./LICENSE)
