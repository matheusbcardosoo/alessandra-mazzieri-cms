/**
 * Fonte única de conteúdo do guia do cliente final (/admin/ajuda).
 *
 * Regras não óbvias:
 * - O texto de cada passo descreve a MECÂNICA do admin (sempre igual, é o
 *   mesmo código em qualquer projeto gerado a partir do template) — nunca
 *   pode citar um valor de conteúdo específico (ex.: nome de uma página do
 *   seed), senão para de valer assim que o cliente edita o site.
 * - `capture` é o que `scripts/generate-help-screenshots.ts` usa pra tirar
 *   o print daquele passo específico contra a instância real do cliente —
 *   nem todo passo tem um (alguns são só explicação, sem tela nova pra
 *   mostrar). `click`/`fill` são melhor-esforço (o script ignora
 *   silenciosamente um alvo que não encontrar) — só `route` é garantido.
 * - O script NUNCA clica em ações que gravam ou apagam dado real (Salvar,
 *   Publicar, Adicionar/Enviar final, confirmar exclusão) — só abre
 *   modais/abas e preenche campo de exemplo, pra poder rodar em produção
 *   sem sujar o conteúdo do cliente. Ver a doc no topo do script.
 *
 * Ver Fase 8 em `docs/plano-template.md`.
 */

export type HelpFill = {
  /** Placeholder do campo (melhor-esforço, ver nota acima). */
  placeholder: string;
  value: string;
};

export type HelpCapture = {
  /** Rota do admin visitada antes do print. Omitido = continua da tela do passo anterior. */
  route?: string;
  /** Textos (nome acessível) clicados em sequência antes do print. */
  click?: string[];
  /** Campos preenchidos (por placeholder) antes do print. */
  fill?: HelpFill[];
};

export type HelpStep = {
  text: string;
  /** Ausente = passo só explicativo, sem tela nova para ilustrar. */
  capture?: HelpCapture;
};

export type HelpTutorial = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  recommended: boolean;
  steps: HelpStep[];
};

export type HelpCategory = {
  id: string;
  order: number;
  title: string;
  description: string;
};

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'inicio', order: 1, title: 'Primeiros passos', description: 'O básico para entrar e se localizar no painel.' },
  { id: 'painel', order: 2, title: 'Painel', description: 'A tela inicial ao logar.' },
  { id: 'paginas', order: 3, title: 'Páginas', description: 'Criar, editar e publicar páginas do site.' },
  { id: 'blocos', order: 4, title: 'Blocos de conteúdo', description: 'As peças usadas dentro de cada página.' },
  { id: 'blog', order: 5, title: 'Blog', description: 'A página /blog e os artigos publicados nela.' },
  { id: 'menu', order: 6, title: 'Menu de navegação', description: 'Os links que aparecem no topo do site.' },
  { id: 'midia', order: 7, title: 'Mídia', description: 'A biblioteca de imagens do site.' },
  { id: 'formularios', order: 8, title: 'Formulários', description: 'As mensagens que os visitantes enviam pelo site.' },
  {
    id: 'config',
    order: 9,
    title: 'Configurações do site',
    description: 'Identidade, aparência e dados que valem para o site inteiro.'
  }
];

export const HELP_TUTORIALS: HelpTutorial[] = [
  // ── Primeiros passos ──────────────────────────────────────────────
  {
    id: 'inicio-login',
    title: 'Fazer login no painel administrativo',
    description: 'Acessar o admin com e-mail e senha e entender a sessão.',
    categoryId: 'inicio',
    recommended: true,
    steps: [
      {
        text: 'Acesse /admin/login no navegador (ou clique em “Entrar” se o site tiver um link visível para o admin).',
        capture: { route: '/admin/login' }
      },
      { text: 'Digite o e-mail e a senha cadastrados para o painel.' },
      {
        text: 'Clique em “Entrar”. Você será levado direto para o Painel.',
        capture: { route: '/admin' }
      },
      { text: 'A sessão fica salva no navegador — não é preciso fazer login de novo a cada visita, só depois de clicar em “Sair”.' }
    ]
  },
  {
    id: 'inicio-menu',
    title: 'Conhecendo o menu lateral do admin',
    description: 'Onde fica cada área: páginas, blog, mídia, menu, configurações.',
    categoryId: 'inicio',
    recommended: false,
    steps: [
      {
        text: 'No menu à esquerda, os itens estão agrupados por área: Conteúdo, Formulários, Mídia e Suporte.',
        capture: { route: '/admin' }
      },
      {
        text: 'Clique na seta no topo do menu para recolher a barra lateral e ganhar mais espaço de tela.',
        capture: { click: ['Expandir/colapsar menu'] }
      },
      { text: 'Clique em “Visualizar site”, no topo da tela, para abrir o site publicado em uma nova aba.' },
      { text: 'Use “Sair”, no rodapé do menu, para encerrar a sessão com segurança.' }
    ]
  },

  // ── Painel ─────────────────────────────────────────────────────────
  {
    id: 'painel-numeros',
    title: 'Entendendo os números do painel',
    description: 'O que cada métrica mostrada na tela inicial significa.',
    categoryId: 'painel',
    recommended: false,
    steps: [
      {
        text: 'A tela inicial (Painel) mostra métricas gerais do site assim que você entra no admin.',
        capture: { route: '/admin' }
      },
      { text: 'Esses números são só uma visão rápida — para editar algo, use o menu lateral ou os atalhos logo abaixo deles.' }
    ]
  },
  {
    id: 'painel-atalhos',
    title: 'Atalhos rápidos do painel',
    description: 'Ir direto para menu, página inicial, artigos ou mídia.',
    categoryId: 'painel',
    recommended: false,
    steps: [
      {
        text: 'Abaixo das métricas, um grupo de cards leva direto a áreas comuns: barra de navegação, página inicial, artigos e imagens.',
        capture: { route: '/admin' }
      },
      { text: 'Clique em qualquer card para pular direto para aquela área, sem precisar usar o menu lateral.' }
    ]
  },

  // ── Páginas ────────────────────────────────────────────────────────
  {
    id: 'paginas-lista',
    title: 'Ver todas as páginas do site',
    description: 'Lista de páginas, status de publicação e busca.',
    categoryId: 'paginas',
    recommended: false,
    steps: [
      {
        text: 'Abra “Páginas” no menu lateral para ver a lista de todas as páginas criadas.',
        capture: { route: '/admin/pages' }
      },
      { text: 'Cada linha mostra o título, o endereço (slug), o status — rascunho ou publicada — e a data da última atualização.' }
    ]
  },
  {
    id: 'paginas-criar',
    title: 'Criar uma página nova',
    description: 'Do zero: escolher um modelo pronto e começar a editar.',
    categoryId: 'paginas',
    recommended: false,
    steps: [
      {
        text: 'Em “Páginas”, clique em “Nova página”.',
        capture: { route: '/admin/pages', click: ['Nova página'] }
      },
      { text: 'Escolha um dos modelos prontos na galeria que se abre — cada um já vem com uma estrutura de seções pré-montada.' },
      { text: 'A página é criada como rascunho e você já é levado direto para o editor dela.' }
    ]
  },
  {
    id: 'paginas-editar-conteudo',
    title: 'Editar um texto ou imagem existente',
    description: 'O fluxo mais comum: abrir uma página e trocar conteúdo.',
    categoryId: 'paginas',
    recommended: true,
    steps: [
      {
        text: 'Em “Páginas”, clique no ícone de editar (lápis) na página que você quer alterar.',
        capture: { route: '/admin/pages', click: ['Editar'] }
      },
      { text: 'Clique sobre o texto ou a imagem, dentro do bloco, para abrir as opções de edição daquele bloco.' },
      { text: 'Faça a alteração e confirme — a mudança fica salva como rascunho até você publicar.' }
    ]
  },
  {
    id: 'paginas-secoes-colunas-blocos',
    title: 'Entendendo seções, colunas e blocos',
    description: 'Como o editor organiza o conteúdo de uma página.',
    categoryId: 'paginas',
    recommended: false,
    steps: [
      {
        text: 'Uma página é dividida em seções — faixas horizontais empilhadas de cima para baixo.',
        capture: { route: '/admin/home' }
      },
      { text: 'Cada seção tem uma ou mais colunas lado a lado.' },
      { text: 'Dentro de cada coluna ficam os blocos (texto, imagem, botão, etc) — as peças de conteúdo que aparecem de fato na página.' }
    ]
  },
  {
    id: 'paginas-secao-pronta',
    title: 'Adicionar uma seção usando um modelo pronto',
    description: 'Usar a galeria de presets em vez de montar do zero.',
    categoryId: 'paginas',
    recommended: true,
    steps: [
      {
        text: 'Dentro do editor de uma página, clique em “+ Adicionar seção”.',
        capture: { route: '/admin/home', click: ['Adicionar seção'] }
      },
      { text: 'Escolha um modelo pronto na galeria — cada um já vem com colunas e blocos sugeridos para aquele tipo de conteúdo.' },
      { text: 'A seção nova entra no fim da página e pode ser reordenada ou editada normalmente depois.' }
    ]
  },
  {
    id: 'paginas-reordenar',
    title: 'Reordenar seções e blocos',
    description: 'Arrastar e soltar para mudar a ordem do conteúdo.',
    categoryId: 'paginas',
    recommended: false,
    steps: [
      {
        text: 'No editor da página, segure o ícone de arrastar de uma seção ou bloco.',
        capture: { route: '/admin/home' }
      },
      { text: 'Arraste para a posição desejada e solte — a nova ordem é salva junto com o resto da página.' }
    ]
  },
  {
    id: 'paginas-pre-visualizar',
    title: 'Pré-visualizar antes de publicar',
    description: 'Ver como a página vai ficar antes de o público ver.',
    categoryId: 'paginas',
    recommended: true,
    steps: [
      {
        text: 'No editor da página, use a opção de pré-visualizar no topo da tela.',
        capture: { route: '/admin/home' }
      },
      { text: 'A pré-visualização abre a página exatamente como ela vai aparecer para o visitante, mesmo antes de publicar.' }
    ]
  },
  {
    id: 'paginas-publicar',
    title: 'Publicar ou despublicar uma página',
    description: 'Tornar uma página visível ou tirá-la do ar.',
    categoryId: 'paginas',
    recommended: false,
    steps: [
      {
        text: 'Em “Páginas”, cada linha tem um ícone para publicar (se a página está em rascunho) ou mover de volta para rascunho (se já está publicada).',
        capture: { route: '/admin/pages' }
      },
      { text: 'Uma página publicada fica acessível a qualquer visitante do site; em rascunho, só é visível dentro do admin.' }
    ]
  },
  {
    id: 'paginas-seo',
    title: 'Ajustar SEO de uma página',
    description: 'Título, descrição e URL que aparecem no Google.',
    categoryId: 'paginas',
    recommended: false,
    steps: [
      {
        text: 'No editor da página, abra as configurações da página (fora dos blocos, nas opções gerais).',
        capture: { route: '/admin/home' }
      },
      { text: 'Preencha o título e a descrição que devem aparecer nos resultados de busca.' },
      { text: 'O endereço (slug) da página também é definido ali — evite mudar depois de divulgado, para não quebrar links já compartilhados.' }
    ]
  },

  // ── Blocos de conteúdo ────────────────────────────────────────────
  {
    id: 'blocos-texto-imagem',
    title: 'Blocos de texto e imagem',
    description: 'Os blocos mais simples, usados em quase toda página.',
    categoryId: 'blocos',
    recommended: false,
    steps: [
      {
        text: 'O bloco de texto aceita formatação básica (negrito, links, listas) igual a um editor de texto comum.',
        capture: { route: '/admin/home' }
      },
      { text: 'O bloco de imagem permite escolher uma imagem já enviada ou subir uma nova, além de ajustar tamanho, alinhamento e legenda.' }
    ]
  },
  {
    id: 'blocos-botoes',
    title: 'Botões e grupo de botões',
    description: 'Chamadas de ação simples, uma ou várias juntas.',
    categoryId: 'blocos',
    recommended: false,
    steps: [
      {
        text: 'O bloco de botão cria um link com aparência de botão — defina o texto, o destino e se abre em nova aba.',
        capture: { route: '/admin/home' }
      },
      { text: 'O bloco de grupo de botões junta dois ou mais botões lado a lado, útil para oferecer mais de uma ação na mesma seção.' }
    ]
  },
  {
    id: 'blocos-cards-servicos',
    title: 'Cards e serviços',
    description: 'Listas visuais — cards genéricos ou grade de serviços.',
    categoryId: 'blocos',
    recommended: false,
    steps: [
      {
        text: 'O bloco de cards mostra uma lista de itens com título, texto e imagem opcional, um ao lado do outro.',
        capture: { route: '/admin/home' }
      },
      { text: 'O bloco de serviços é parecido, mas pensado especificamente para listar o que o cliente oferece.' }
    ]
  },
  {
    id: 'blocos-cta-hero',
    title: 'Chamada para ação (CTA) e destaque (hero)',
    description: 'Os blocos de maior impacto visual da página.',
    categoryId: 'blocos',
    recommended: false,
    steps: [
      {
        text: 'O bloco de destaque (hero) costuma abrir a página, com um título grande, texto de apoio e um botão principal.',
        capture: { route: '/admin/home' }
      },
      { text: 'O bloco de CTA (chamada para ação) reforça um convite no meio ou no fim da página — um texto curto seguido de um botão.' }
    ]
  },
  {
    id: 'blocos-formulario',
    title: 'Formulário dentro da página',
    description: 'Inserir um formulário de contato num bloco.',
    categoryId: 'blocos',
    recommended: true,
    steps: [
      {
        text: 'O bloco de formulário adiciona um formulário de contato diretamente na página.',
        capture: { route: '/admin/home' }
      },
      { text: 'As mensagens enviadas por esse formulário aparecem depois em “Respostas dos formulários”, no menu lateral.' }
    ]
  },
  {
    id: 'blocos-apoio',
    title: 'Mídia + texto, pills e informações de contato',
    description: 'Blocos de apoio menos usados no dia a dia.',
    categoryId: 'blocos',
    recommended: false,
    steps: [
      {
        text: 'O bloco de mídia + texto junta uma imagem e um texto lado a lado, bom para explicar algo com apoio visual.',
        capture: { route: '/admin/home' }
      },
      { text: 'O bloco de pills mostra uma lista curta de palavras ou tags em destaque (ex.: especialidades, diferenciais).' },
      { text: 'O bloco de informações de contato exibe telefone, endereço e horário — os mesmos dados cadastrados em Configurações.' }
    ]
  },
  {
    id: 'blocos-posts-recentes',
    title: 'Posts recentes do blog',
    description: 'Bloco que puxa os últimos artigos automaticamente.',
    categoryId: 'blocos',
    recommended: false,
    steps: [
      {
        text: 'O bloco de posts recentes lista os últimos artigos publicados no blog, atualizando sozinho conforme novos artigos saem.',
        capture: { route: '/admin/home' }
      },
      { text: 'Não é preciso escolher os artigos manualmente — o bloco sempre mostra os mais recentes.' }
    ]
  },
  {
    id: 'blocos-redes-whatsapp',
    title: 'Redes sociais e botão flutuante do WhatsApp',
    description: 'Ícones de rede social e o botão flutuante de WhatsApp.',
    categoryId: 'blocos',
    recommended: true,
    steps: [
      {
        text: 'O bloco de redes sociais mostra os ícones das redes cadastradas em Configurações — não é preciso repetir os links aqui.',
        capture: { route: '/admin/home' }
      },
      { text: 'O botão flutuante do WhatsApp é configurado à parte, em Configurações do site, e aparece em todas as páginas quando ativado — não é um bloco inserido manualmente.' }
    ]
  },

  // ── Blog ───────────────────────────────────────────────────────────
  {
    id: 'blog-configurar-pagina',
    title: 'Configurar a página do blog',
    description: 'Escolher e ordenar as seções: destaques, mais vistos, todos.',
    categoryId: 'blog',
    recommended: false,
    steps: [
      {
        text: 'Abra “Blog” no menu lateral.',
        capture: { route: '/admin/blog' }
      },
      { text: 'Edite o título e a descrição exibidos no topo da página /blog.' },
      { text: 'Nas Seções, adicione, remova ou reordene os blocos “Em destaque”, “Mais vistos” e “Todos os artigos” — cada um pode ser mostrado ou ocultado.' },
      { text: 'Clique em “Salvar” para aplicar as mudanças na página pública.' }
    ]
  },
  {
    id: 'blog-criar-artigo',
    title: 'Criar e publicar um artigo',
    description: 'Do rascunho à publicação de um novo post.',
    categoryId: 'blog',
    recommended: true,
    steps: [
      {
        text: 'Abra “Artigos” no menu lateral.',
        capture: { route: '/admin/articles' }
      },
      {
        text: 'Clique em “Novo artigo” e preencha título, resumo e o conteúdo do artigo.',
        capture: { click: ['Novo artigo'] }
      },
      { text: 'Clique em “Salvar rascunho” para guardar sem publicar, ou em “Publicar” quando estiver pronto para ir ao ar.' }
    ]
  },
  {
    id: 'blog-editor-rico',
    title: 'Usar o editor de texto rico',
    description: 'Formatação, links e imagens dentro do artigo.',
    categoryId: 'blog',
    recommended: false,
    steps: [
      {
        text: 'No editor de artigo, o corpo do texto usa uma barra de ferramentas com negrito, itálico, títulos, listas e links.',
        capture: { route: '/admin/articles/new' }
      },
      { text: 'Também é possível inserir imagens diretamente no meio do texto, além da imagem de capa do artigo.' }
    ]
  },
  {
    id: 'blog-rascunho-publicado-destaque',
    title: 'Rascunho, publicado e destaque',
    description: 'Os estados possíveis de um artigo e o que cada um faz.',
    categoryId: 'blog',
    recommended: false,
    steps: [
      {
        text: 'Um artigo em rascunho só é visível dentro do admin; publicado, fica acessível no /blog.',
        capture: { route: '/admin/articles' }
      },
      { text: 'Marcar um artigo como destaque faz com que ele apareça na seção “Em destaque” da página do blog, se essa seção estiver ativa.' }
    ]
  },

  // ── Menu de navegação ────────────────────────────────────────────
  {
    id: 'menu-adicionar-item',
    title: 'Adicionar um item ao menu',
    description: 'Criar um novo link de navegação apontando para uma página.',
    categoryId: 'menu',
    recommended: true,
    steps: [
      {
        text: 'Abra “Barra de navegação” no menu lateral e clique em “Adicionar item”.',
        capture: {
          route: '/admin/navbar',
          click: ['Adicionar item'],
          fill: [{ placeholder: 'Rótulo do item', value: 'Portfólio' }]
        }
      },
      { text: 'Escolha o destino: uma página interna do site ou uma URL externa.' },
      { text: 'Escolha se o item deve aparecer na navbar, no rodapé, ou nos dois, e confirme.' }
    ]
  },
  {
    id: 'menu-submenu',
    title: 'Criar um submenu',
    description: 'Agrupar itens relacionados dentro de um item pai.',
    categoryId: 'menu',
    recommended: false,
    steps: [
      {
        text: 'Ao criar ou editar um item, ative a opção “Permitir submenus” para que ele possa conter outros itens dentro.',
        capture: { route: '/admin/navbar' }
      },
      { text: 'Em outro item, defina esse item como “Submenu de” o item pai — ele passa a aparecer agrupado no menu.' },
      { text: 'A navegação suporta no máximo dois níveis de profundidade.' }
    ]
  },
  {
    id: 'menu-reordenar',
    title: 'Reordenar itens do menu',
    description: 'Mudar a ordem em que os links aparecem.',
    categoryId: 'menu',
    recommended: false,
    steps: [
      {
        text: 'Em “Barra de navegação”, arraste um item para cima ou para baixo na lista para mudar sua posição.',
        capture: { route: '/admin/navbar' }
      },
      { text: 'A pré-visualização ao lado mostra como o menu vai ficar no site em tempo real.' }
    ]
  },

  // ── Mídia ──────────────────────────────────────────────────────────
  {
    id: 'midia-enviar',
    title: 'Enviar uma imagem',
    description: 'Upload de um novo arquivo para a biblioteca de mídia.',
    categoryId: 'midia',
    recommended: true,
    steps: [
      {
        text: 'Abra “Imagens” no menu lateral e clique em “Enviar imagem”.',
        capture: { route: '/admin/media', click: ['Enviar imagem'] }
      },
      { text: 'Arraste o arquivo para a área indicada ou clique para escolher do computador (PNG, JPG ou WEBP, até 5 MB).' },
      {
        text: 'Preencha um título e um texto alternativo (descrição para acessibilidade) e confirme o envio.',
        capture: {
          fill: [
            { placeholder: 'Nome da imagem', value: 'Foto da fachada' },
            { placeholder: 'Descreva a imagem para acessibilidade', value: 'Fachada do escritório vista da rua' }
          ]
        }
      }
    ]
  },
  {
    id: 'midia-cortar',
    title: 'Cortar e ajustar uma imagem',
    description: 'Usar o recorte antes de salvar uma imagem enviada.',
    categoryId: 'midia',
    recommended: false,
    steps: [
      {
        text: 'Em telas que usam imagem com proporção fixa (como a logo do site ou a capa de um artigo), o recorte abre automaticamente após escolher o arquivo.',
        capture: { route: '/admin/media' }
      },
      { text: 'Ajuste a área selecionada e confirme para salvar a imagem já no tamanho certo.' }
    ]
  },
  {
    id: 'midia-reaproveitar',
    title: 'Reaproveitar uma imagem já enviada',
    description: 'Escolher da biblioteca em vez de subir de novo.',
    categoryId: 'midia',
    recommended: false,
    steps: [
      {
        text: 'Em qualquer bloco ou campo que peça uma imagem, use a opção de escolher da biblioteca em vez de enviar um arquivo novo.',
        capture: { route: '/admin/media' }
      },
      { text: 'Use a busca por título, texto alternativo ou tag para encontrar a imagem certa mais rápido.' }
    ]
  },
  {
    id: 'midia-excluir',
    title: 'Excluir mídia não utilizada',
    description: 'Limpar arquivos que não estão mais em uso.',
    categoryId: 'midia',
    recommended: false,
    steps: [
      {
        text: 'Em “Imagens”, passe o mouse sobre uma imagem para ver os ícones de editar e excluir.',
        capture: { route: '/admin/media' }
      },
      {
        text: 'Confirme a exclusão — essa ação não pode ser desfeita, então confira antes se a imagem não está em uso em nenhuma página ou artigo.',
        capture: { click: ['Excluir'] }
      }
    ]
  },

  // ── Formulários ────────────────────────────────────────────────────
  {
    id: 'formularios-ver-mensagens',
    title: 'Ver as mensagens recebidas',
    description: 'A caixa de entrada de todas as submissões de formulário.',
    categoryId: 'formularios',
    recommended: true,
    steps: [
      {
        text: 'Abra “Respostas dos formulários” no menu lateral para ver todas as mensagens enviadas pelo site.',
        capture: { route: '/admin/form-submissions' }
      },
      { text: 'A lista mostra remetente, data e um resumo de cada envio.' }
    ]
  },
  {
    id: 'formularios-detalhe',
    title: 'Ver detalhes de uma mensagem',
    description: 'Abrir uma submissão e ver todos os campos enviados.',
    categoryId: 'formularios',
    recommended: false,
    steps: [
      {
        text: 'Em “Respostas dos formulários”, clique em uma linha para abrir os detalhes completos daquela mensagem.',
        capture: { route: '/admin/form-submissions' }
      },
      { text: 'Veja todos os campos preenchidos e, se disponível, a página de onde a mensagem foi enviada.' }
    ]
  },
  {
    id: 'formularios-excluir',
    title: 'Excluir uma mensagem',
    description: 'Remover uma submissão que não é mais necessária.',
    categoryId: 'formularios',
    recommended: false,
    steps: [
      {
        text: 'Na lista ou nos detalhes de uma mensagem, use o ícone de excluir.',
        capture: { route: '/admin/form-submissions' }
      },
      { text: 'Confirme a exclusão — essa ação não pode ser desfeita.' }
    ]
  },

  // ── Configurações do site ─────────────────────────────────────────
  {
    id: 'config-identidade',
    title: 'Identidade do site',
    description: 'Nome, CNPJ e registro profissional.',
    categoryId: 'config',
    recommended: false,
    steps: [
      {
        text: 'Abra “Configurações do Site” no menu lateral e vá até a aba “Identidade”.',
        capture: { route: '/admin/settings', click: ['Identidade'] }
      },
      { text: 'Preencha nome do site, CNPJ e registro profissional (quando aplicável ao ramo de atuação).' }
    ]
  },
  {
    id: 'config-cores-tipografia',
    title: 'Cores e tipografia do tema',
    description: 'A paleta e as fontes usadas em todo o site.',
    categoryId: 'config',
    recommended: true,
    steps: [
      {
        text: 'Em “Configurações do Site”, vá até a aba “Aparência”.',
        capture: { route: '/admin/settings', click: ['Aparência'] }
      },
      { text: 'Escolha um tema pronto ou ajuste manualmente as cores de fundo, texto, cor primária e destaque.' },
      { text: 'Escolha as fontes de título e de corpo de texto — a mudança se aplica ao site inteiro.' }
    ]
  },
  {
    id: 'config-logo',
    title: 'Trocar a logo',
    description: 'Enviar e ajustar a logo exibida no cabeçalho.',
    categoryId: 'config',
    recommended: true,
    steps: [
      {
        text: 'Em “Configurações do Site”, na aba “Identidade”, use a opção de enviar logo.',
        capture: { route: '/admin/settings', click: ['Identidade'] }
      },
      { text: 'Ajuste o recorte, se necessário, e confirme — a nova logo aparece no cabeçalho de todas as páginas.' }
    ]
  },
  {
    id: 'config-elementos',
    title: 'Elementos visuais',
    description: 'Bordas, sombras e outros detalhes de estilo.',
    categoryId: 'config',
    recommended: false,
    steps: [
      {
        text: 'Em “Configurações do Site”, vá até a aba “Elementos”.',
        capture: { route: '/admin/settings', click: ['Elementos'] }
      },
      { text: 'Ajuste detalhes visuais compartilhados por botões, cards e outros componentes do site.' }
    ]
  },
  {
    id: 'config-contato-redes',
    title: 'Contato e redes sociais',
    description: 'Telefone, endereço, e-mail e links de rede social.',
    categoryId: 'config',
    recommended: true,
    steps: [
      {
        text: 'Em “Configurações do Site”, vá até a aba “Contato e redes”.',
        capture: { route: '/admin/settings', click: ['Contato e redes'] }
      },
      { text: 'Preencha telefone, e-mail, endereço e horário de atendimento.' },
      { text: 'Adicione os links das redes sociais que devem aparecer no site.' }
    ]
  },
  {
    id: 'config-profissionais',
    title: 'Dados profissionais',
    description: 'Informações específicas da atividade do cliente.',
    categoryId: 'config',
    recommended: false,
    steps: [
      {
        text: 'Em “Configurações do Site”, vá até a aba “Dados profissionais”.',
        capture: { route: '/admin/settings', click: ['Dados profissionais'] }
      },
      { text: 'Preencha as informações relacionadas à atuação profissional exibidas no site.' }
    ]
  },
  {
    id: 'config-whatsapp-horario',
    title: 'WhatsApp flutuante e horário de atendimento',
    description: 'Configurar o botão de WhatsApp e os horários exibidos.',
    categoryId: 'config',
    recommended: true,
    steps: [
      {
        text: 'Em “Configurações do Site”, na aba “Contato e redes”, ative o botão flutuante do WhatsApp.',
        capture: { route: '/admin/settings', click: ['Contato e redes'] }
      },
      { text: 'Defina o número, a mensagem inicial e a posição do botão (esquerda ou direita da tela).' },
      { text: 'Cadastre o horário de atendimento exibido no site.' }
    ]
  },
  {
    id: 'config-seo',
    title: 'SEO e integrações',
    description: 'Meta descrição, imagem de compartilhamento e afins.',
    categoryId: 'config',
    recommended: false,
    steps: [
      {
        text: 'Em “Configurações do Site”, vá até a aba “SEO e integrações”.',
        capture: { route: '/admin/settings', click: ['SEO e integrações'] }
      },
      { text: 'Preencha a meta descrição padrão e a imagem usada quando o site é compartilhado em redes sociais.' }
    ]
  }
];
