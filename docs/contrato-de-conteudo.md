# Contrato de conteúdo — projeto simples → template

Referência para uma IA assistente migrar um projeto simples (HTML/CSS/JS estático) para
este template, mapeando o conteúdo existente para os campos abaixo. Não descreve como
gerar o design/estilo (isso é feito à parte, usando o tema em `SiteSettings.theme`) — só
onde cada tipo de conteúdo deve ser salvo.

## 1. Configurações do site (`SiteSettings`, singleton)

Tudo que hoje é fixo no HTML do projeto simples (`<title>`, rodapé, contato, redes sociais)
deve virar um destes campos, editável no admin (`/admin/configuracoes`):

| Campo | Tipo | Extrair de... |
|---|---|---|
| `siteName` | string | `<title>` / logo em texto |
| `brandTagline` | string (≤80) | subtítulo/slogan perto do logo |
| `logoUrl` | string | `<img>` do logo |
| `contactEmail`, `phone` | string | rodapé / seção de contato |
| `address` | `{street, neighborhood, city, state, zip}` | rodapé / seção de contato |
| `officeHours` | `Array<{label, hours}>` | horário de atendimento, se houver |
| `socials` | `Array<SocialLink>` | ícones de redes sociais |
| `whatsappEnabled`, `whatsappLink`, `whatsappMessage`, `whatsappPosition` | — | botão flutuante de WhatsApp, se houver |
| `cnpj` | string | CNPJ no rodapé |
| `professionalRegistration` | string | registro profissional (CRP/CRM/OAB/CRECI/CRC...), se aplicável ao nicho |
| `metaDescription`, `ogImageUrl`, `gaId`, `gscVerification` | — | `<meta>` tags e scripts de analytics do `<head>` |
| `theme` | `SiteTheme` | paleta de cores e tipografia do projeto simples (ver seção 3) |

## 2. Páginas e Home (`Page`, `HomeSection`)

- Cada página estática do projeto simples (`sobre.html`, `contato.html` etc.) vira um
  registro `Page` com `slug` correspondente e `layout` (`PageLayoutV2`: `sections[].cols[].blocks[]`).
- A seção hero da home vira um bloco `hero` isolado (ver seção 4); as demais seções da
  home (serviços, sobre resumido, depoimentos, CTA) viram `sections` adicionais na página
  `home` — não use mais `HomeSection` para conteúdo novo, é o modelo legado.
- Blog/artigos do projeto simples viram `Article` (`title`, `slug`, `excerpt`, `content`
  HTML, `tags`, `coverMediaId`).

## 3. Tema visual (`SiteSettings.theme`)

`SiteTheme.colors` tem só 4 chaves (`background`, `text`, `primary`, `accent`) — todo o
resto da paleta (`--color-forest`, `--color-shell` etc.) é **derivado** dessas 4 em
`siteThemeToCssVars()` (`client/src/utils/siteTheme.ts`). Para migrar a identidade visual
do projeto simples: identificar a cor de fundo dominante, a cor de texto principal, a cor
de destaque/CTA (primary) e uma cor secundária (accent), e preencher só essas 4 — não
tente reproduzir cada hex do CSS original um a um.

`typography.headingFont`/`bodyFont` aceitam qualquer fonte da lista em
`client/src/constants/googleFonts.ts`.

## 4. Blocos disponíveis (`PageBlock`)

`text`, `image`, `button`, `buttonGroup`, `cards`, `cta`, `form`, `hero`, `media-text`,
`pills`, `recent-posts`, `services`, `social-links`, `span`, `whatsapp-cta`, `contact-info`.

Cada bloco tem `renderer.tsx` (exibição), `Form.tsx` (edição no admin) e `schema.ts`
(validação) em `client/src/blocks/<tipo>/`. Ao mapear conteúdo do projeto simples, prefira
o bloco mais específico disponível (ex.: uma seção de "nossos serviços" vira um bloco
`services`, não um bloco `text` genérico com HTML solto) — isso é o que garante que o
conteúdo fique editável no admin depois da migração.

## 5. Fora do escopo deste contrato

Regras de negócio específicas do domínio original (ex.: um campo "CRP" só faz sentido
para psicólogos) não devem ser adicionadas ao schema padrão do template — ver
`professionalRegistration`, que já é genérico o suficiente para qualquer registro
profissional. Se o projeto simples tiver um campo realmente específico do nicho sem
equivalente genérico, ele deve ser adicionado como extensão pontual, documentada no
`CLAUDE.md` do projeto derivado — não neste template.
