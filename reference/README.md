# reference/ — material de referência visual para a IA

Pasta de **staging**: cole aqui HTML/CSS/JS de referência (mockups, landing pages
prontas, componentes de outros projetos) para a IA usar como inspiração visual
ao criar ou adaptar blocos/componentes deste template.

Nada aqui é consumido automaticamente pela aplicação — é só material de entrada
para uma sessão de IA olhar antes de escrever código de verdade em `client/src/`.
Não referencie arquivos desta pasta em imports do projeto.

## Regras para a IA ao consumir este material

1. **JS: só extrair o que for animação.**
   Aproveite apenas lógica de animação/transição visual (scroll reveal, hover,
   parallax, contadores animados, carrosséis puramente visuais, etc).
   **Ignore** qualquer JS de: fetch/chamadas de API, validação de formulário,
   manipulação de estado, roteamento, storage, autenticação — o projeto já tem
   suas próprias camadas para isso (React Query, Axios, hooks em
   `client/src/hooks/queries/`, etc). Reimplementar essas partes a partir da
   referência cria lógica duplicada e fora do padrão do projeto.

2. **Antes de portar qualquer coisa, verificar se já existe no projeto base.**
   Antes de criar um componente, hook, util ou bloco novo a partir do que está
   nesta pasta, procurar primeiro se uma função equivalente já existe:
   - Componentes reutilizáveis → `client/src/components/`
   - Blocos de página (os 16 tipos) → `client/src/blocks/` e o union
     `PageBlock` em `client/src/types/blocks.ts`
   - Hooks de dados → `client/src/hooks/queries/`
   - Funções puras/utilitárias → `client/src/utils/`

   Se já existir algo equivalente, **reaproveitar/estender**, não duplicar.
   Só criar código novo para o que for genuinamente inédito (normalmente:
   apenas a camada visual/CSS e a animação em si).

3. **Onde o resultado deve ir.**
   - HTML/CSS vira JSX + estilos dentro do padrão do projeto (TypeScript
     strict, componentes em PascalCase, sem `any` sem justificativa).
   - Se o resultado for um novo tipo de bloco de página, seguir o processo
     documentado no `CLAUDE.md` da raiz (seção "Sistema de blocos"): pasta em
     `client/src/blocks/<nome>/` com `renderer.tsx` + `Form.tsx` + `schema.ts`,
     registro em `client/src/blocks/registry.ts`, tipo no union `PageBlock`,
     preset opcional em `sectionPresets.ts`.
   - Se for só um componente de apresentação (não um bloco editável no CMS),
     vai direto em `client/src/components/`.

4. **Placeholders de imagem:** trocar qualquer imagem externa da referência
   por `@/assets/image-placeholder.svg`, nunca manter URLs externas do
   material de origem (ver convenção em `CLAUDE.md`).

Esta pasta não faz parte do template distribuído (está no `.gitignore`) —
sirva-se dela livremente, ela é só um rascunho de entrada.
