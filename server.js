// ============================================
// 🟢 SERVER.JS INICIADO!
// ============================================
console.log('\n╔════════════════════════════════════════╗');
console.log('║  🟢 SERVER.JS EXECUTANDO!              ║');
console.log('╚════════════════════════════════════════╝');
console.log('⏰ Data/Hora:', new Date().toISOString());
console.log('📁 Working Directory:', process.cwd());
console.log('🔧 Node Version:', process.version);
console.log('📋 Argumentos:', process.argv.join(' '));
console.log('════════════════════════════════════════\n');

/**
 * PRODUCTION SERVER - Hostinger Node.js Addon (SEM TERMINAL SSH)
 *
 * Este arquivo e o entrypoint principal para producao.
 * Serve os arquivos estaticos do build do Vite (client/dist)
 * e redireciona as requisicoes /api para o servidor Express compilado.
 * 
 * IMPORTANTE: Este servidor se auto-configura na primeira execução!
 * Não é necessário acesso ao terminal SSH.
 */

// CRITICAL: Carregar variaveis de ambiente ANTES de importar qualquer outro modulo
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('========================================');
console.log('🚀 INICIANDO SERVIDOR - HOSTINGER');
console.log('========================================\n');

// Log para diagnóstico
console.log('=== ENVIRONMENT CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'production');
console.log('PORT:', process.env.PORT || '(usando fallback 4000)');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ configurado' : '✗ FALTANDO');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ configurado' : '✗ FALTANDO');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ configurado' : '✗ FALTANDO');
console.log('========================\n');

// AUTO-CONFIGURAÇÃO: Executar migrations na primeira inicialização
const installedFlagPath = path.join(__dirname, '.installed');
const isFirstRun = !fs.existsSync(installedFlagPath);

if (isFirstRun) {
  console.log('🔧 PRIMEIRA EXECUÇÃO DETECTADA!');
  console.log('Executando configuração inicial...\n');
  
  try {
    // Definir caminho absoluto do schema
    const schemaPath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');
    console.log('📄 Schema Prisma:', schemaPath);
    
    // Verificar se Prisma Client foi gerado (deve ter sido pelo npm install)
    console.log('\n1/2 Verificando Prisma Client...');
    const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma', 'client');
    if (!fs.existsSync(prismaClientPath)) {
      console.log('   ⚠️  Prisma Client não encontrado, gerando...');
      execSync(`npx prisma generate --schema "${schemaPath}"`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      console.log('   ✓ Prisma Client gerado com sucesso!');
    } else {
      console.log('   ✓ Prisma Client já existe');
    }

    // Executar migrations do banco de dados (ASYNC para não travar)
    console.log('\n2/2 Executando migrations do banco de dados...');
    console.log('   (Isso pode demorar alguns segundos...)');
    
    try {
      execSync(`npx prisma migrate deploy --schema "${schemaPath}"`, { 
        stdio: 'inherit',
        cwd: __dirname,
        timeout: 30000 // 30 segundos timeout
      });
      console.log('   ✓ Migrations aplicadas com sucesso!');
      
      // Criar arquivo de flag apenas se migrations funcionaram
      fs.writeFileSync(installedFlagPath, new Date().toISOString());
      console.log('\n✅ CONFIGURAÇÃO INICIAL CONCLUÍDA!\n');
    } catch (migrationError) {
      console.error('   ⚠️  Erro ao executar migrations:');
      console.error('   ', migrationError.message);
      console.error('\n   ⚠️  O servidor continuará, mas o banco pode não estar configurado.');
      console.error('   Verifique DATABASE_URL e tente reiniciar a aplicação.\n');
      // Não criar .installed se migrations falharam (tentará novamente no próximo restart)
    }
    
  } catch (error) {
    console.error('\n❌ ERRO na configuração inicial:');
    console.error(error.message);
    console.error('\n⚠️  A aplicação continuará, mas pode não funcionar corretamente.');
    console.error('Verifique as variáveis de ambiente e a conexão com o banco de dados.\n');
    // Não fazer exit para tentar continuar mesmo com erro
  }
} else {
  console.log('✓ Aplicação já configurada (arquivo .installed encontrado)\n');
}

console.log('📦 Carregando módulos do servidor...\n');

// Verificar integridade das dependências antes de carregar
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ ERRO: node_modules não encontrado!');
  console.error('Execute npm install primeiro.');
  process.exit(1);
}

// Verificar se express está instalado corretamente
const expressPath = path.join(nodeModulesPath, 'express');
if (!fs.existsSync(expressPath)) {
  console.error('❌ ERRO: Express não encontrado em node_modules!');
  console.error('Reinstalando dependências...');
  try {
    execSync('npm install --prefer-offline', { stdio: 'inherit', cwd: __dirname });
  } catch (error) {
    console.error('❌ Falha ao reinstalar. Verifique package.json e package-lock.json');
    process.exit(1);
  }
}

let express, compression;
try {
  express = require('express');
  compression = require('compression');
} catch (error) {
  console.error('❌ ERRO ao carregar módulos:', error.message);
  console.error('📍 Stack:', error.stack);
  console.error('\n⚠️  Detectado problema de dependências.');
  console.error('🔧 Tentando reinstalar...\n');
  
  try {
    execSync('npm install --prefer-offline --force', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Reinstalação concluída. Tentando carregar novamente...\n');
    express = require('express');
    compression = require('compression');
  } catch (reinstallError) {
    console.error('❌ FALHA CRÍTICA: Não foi possível resolver dependências.');
    console.error('Por favor, verifique os logs acima e contate o suporte.');
    process.exit(1);
  }
}

// Verificar se os arquivos compilados existem
console.log('🔍 Verificando arquivos necessários...');
console.log('📁 __dirname:', __dirname);

const serverDistPath = path.join(__dirname, 'server', 'dist', 'app.js');
const clientDistPath = path.join(__dirname, 'client', 'dist', 'client', 'index.html');
const ssrEntryPath = path.join(__dirname, 'client', 'dist', 'server', 'entry-server.js');

console.log('🔎 Procurando server/dist/app.js em:', serverDistPath);
console.log('🔎 Procurando client/dist/client/index.html em:', clientDistPath);
console.log('🔎 Procurando client/dist/server/entry-server.js em:', ssrEntryPath);

// AUTO-BUILD: se o dist não veio no pacote (ZIP gerado sem rodar o build, ou
// gerado por uma ferramenta que ignora pastas do .gitignore), builda aqui
// mesmo. Reaproveita o script "build" da raiz (npm ci --include=dev + build
// de client e server), pois em produção o postinstall pula a instalação de
// devDependencies de client/server assumindo que um CI externo já buildou.
const distMissing =
  !fs.existsSync(serverDistPath) || !fs.existsSync(clientDistPath) || !fs.existsSync(ssrEntryPath);

if (distMissing) {
  console.log('\n⚠️  Build não encontrado. Tentando build automático (npm run build)...');
  console.log('   Isso pode demorar alguns minutos na primeira execução.\n');

  // "npm run build" faz "npm ci" em client/ e server/, que às vezes falha com
  // ENOTEMPTY em filesystems overlay (Docker) quando node_modules já existe
  // de uma tentativa anterior parcial/interrompida. Começar de um node_modules
  // limpo evita esse erro de forma confiável.
  for (const dir of ['client', 'server']) {
    const nodeModulesDir = path.join(__dirname, dir, 'node_modules');
    if (fs.existsSync(nodeModulesDir)) {
      try {
        fs.rmSync(nodeModulesDir, { recursive: true, force: true });
      } catch (cleanError) {
        console.warn(`⚠️  Não foi possível limpar ${dir}/node_modules:`, cleanError.message);
      }
    }
  }

  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Build automático concluído!\n');
  } catch (buildError) {
    console.error('\n❌ Build automático falhou:', buildError.message);
    console.error('   O servidor continuará e reportará abaixo quais arquivos ainda faltam.\n');
  }
}

// Listar conteúdo do diretório server
const serverDir = path.join(__dirname, 'server');
console.log('\n📂 Conteúdo de server/:');
if (fs.existsSync(serverDir)) {
  const serverContents = fs.readdirSync(serverDir);
  console.log('   ', serverContents.join(', '));
  
  // Se dist existe, listar seu conteúdo
  const distDir = path.join(serverDir, 'dist');
  if (fs.existsSync(distDir)) {
    console.log('\n📂 Conteúdo de server/dist/:');
    const distContents = fs.readdirSync(distDir);
    console.log('   ', distContents.slice(0, 10).join(', '));
  } else {
    console.log('   ⚠️ server/dist/ NÃO EXISTE!');
  }
} else {
  console.log('   ⚠️ server/ NÃO EXISTE!');
}

if (!fs.existsSync(serverDistPath)) {
  console.error('\n❌ ERRO: server/dist/app.js não encontrado!');
  console.error('O build do servidor não foi feito ou o ZIP foi extraído incorretamente.');
  console.error('Caminho esperado:', serverDistPath);
  process.exit(1);
}

if (!fs.existsSync(clientDistPath)) {
  console.error('❌ ERRO: client/dist/client/index.html não encontrado!');
  console.error('O build do frontend não foi feito ou o ZIP foi extraído incorretamente.');
  console.error('Caminho esperado:', clientDistPath);
  process.exit(1);
}

if (!fs.existsSync(ssrEntryPath)) {
  console.error('❌ ERRO: client/dist/server/entry-server.js não encontrado!');
  console.error('O build de SSR não foi feito (npm run build:ssr dentro de client/).');
  console.error('Caminho esperado:', ssrEntryPath);
  process.exit(1);
}

console.log('✓ server/dist/app.js encontrado');
console.log('✓ client/dist/client/index.html encontrado');
console.log('✓ client/dist/server/entry-server.js encontrado\n');

// Importar o servidor Express compilado
console.log('📥 Importando módulo da API...');
let apiApp;
try {
  const appModule = require('./server/dist/app');
  apiApp = appModule.app;
  console.log('✅ API module carregado com sucesso\n');
} catch (error) {
  console.error('❌ ERRO ao carregar módulo da API:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  console.error('\n🔍 Verifique se:');
  console.error('1. O build foi feito corretamente (build-production.bat)');
  console.error('2. Todas as variáveis de ambiente estão configuradas');
  console.error('3. O DATABASE_URL está correto\n');
  process.exit(1);
}

const app = express();

// Necessario atras de proxy (Hostinger/NGINX) para req.protocol/req.ip corretos
app.set('trust proxy', 1);

// Canonicaliza o host (www ↔ non-www) antes de servir qualquer coisa,
// incluindo /assets — mesmo middleware usado dentro da API (server/src/app.ts),
// reaproveitado aqui via build compilado para não duplicar a lógica
// (Fase 4, docs/plano-template.md).
try {
  const { canonicalHostRedirect } = require('./server/dist/middleware/canonicalHost');
  app.use(canonicalHostRedirect);
} catch (error) {
  console.warn('⚠️  Não foi possível carregar canonicalHostRedirect:', error.message);
}

// Usar compressao para otimizar performance
app.use(compression());

// IMPORTANTE: A porta DEVE vir do process.env.PORT (Hostinger define isso)
const PORT = process.env.PORT || 4000;
const distPath = path.join(__dirname, 'client', 'dist', 'client');

// SSR chama a própria API por HTTP (mesmo processo, mesma porta) em vez de
// reimplementar a busca de dados — ver client/src/api/client.ts.
process.env.INTERNAL_API_URL = process.env.INTERNAL_API_URL || `http://127.0.0.1:${PORT}`;

// 1. Servir assets com hash e cache longo
app.use(
  '/assets',
  express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    etag: true,
    immutable: true
  })
);

// 2. Servir demais arquivos estaticos sem cache longo
app.use(
  express.static(distPath, {
    etag: true,
    lastModified: true,
    maxAge: 0,
    index: false // index.html é sempre gerado via SSR, nunca servido estático
  })
);

// 3. Montar as rotas da API (vindas do servidor Express)
app.use(apiApp);

// 4. SSR - renderiza a árvore React no servidor para qualquer rota pública
// não tratada acima. Template e módulo de render são lidos uma vez e
// reaproveitados a cada requisição (arquivos de build não mudam em runtime).
const htmlTemplate = fs.readFileSync(clientDistPath, 'utf-8');
const ssrEntryUrl = require('url').pathToFileURL(ssrEntryPath).href;
const ssrRenderPromise = import(ssrEntryUrl).then((mod) => mod.render);

app.use(async (req, res) => {
  // Arquivo estático não encontrado (ex: /assets/algo-que-nao-existe.png)
  if (path.extname(req.path)) {
    res.status(404).end();
    return;
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // /admin é sempre um shell CSR: autenticação depende do cookie httpOnly +
  // localStorage, que só existem no browser. Renderizar no servidor não traria
  // ganho de SEO (painel não é indexado) e adicionaria risco sem benefício.
  if (req.path.startsWith('/admin')) {
    res.status(200).sendFile(clientDistPath);
    return;
  }

  try {
    const render = await ssrRenderPromise;
    const origin = `${req.protocol}://${req.get('host')}`;
    const { appHtml, headHtml, stateScript, statusCode } = await render(req.originalUrl, origin);

    const html = htmlTemplate
      .replace('<!--ssr-head-->', headHtml)
      .replace('<!--ssr-outlet-->', appHtml)
      .replace('<!--ssr-state-->', stateScript);

    res.status(statusCode).send(html);
  } catch (error) {
    console.error('❌ Erro ao renderizar SSR, servindo shell estático:', error);
    // Página ainda funciona via CSR (hidrata no cliente), por isso 200 é o
    // status correto para o visitante/bots — mas isso mascara a falha em
    // qualquer monitoramento que só olhe status HTTP. Este header deixa a
    // degradação detectável (log de acesso do proxy, regra de alerta, etc.)
    // sem mudar o comportamento visível pro usuário.
    res.setHeader('X-SSR-Fallback', 'error');
    res.status(200).sendFile(clientDistPath);
  }
});

// Iniciar servidor
console.log('🚀 Iniciando servidor HTTP...\n');

app.listen(PORT, () => {
  console.log('========================================');
  console.log('✅ SERVIDOR INICIADO COM SUCESSO!');
  console.log('========================================');
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📁 Arquivos estáticos: ${distPath}`);
  console.log(`🔌 API: ./server/dist/app.js`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'production'}`);
  console.log('========================================\n');
  console.log('✅ Aplicação pronta para receber requisições!');
  console.log(`📍 Teste: http://localhost:${PORT}/api/health\n`);
});

// Tratamento de erros nao capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
