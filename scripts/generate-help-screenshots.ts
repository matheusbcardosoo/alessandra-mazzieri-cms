/**
 * Gera os prints usados pelo guia do cliente final (/admin/ajuda), navegando
 * uma instância real e já rodando do admin (não mocka nada). Roda contra
 * QUALQUER projeto gerado a partir deste template — inclusive um recém
 * migrado de um site simples — porque o texto dos tutoriais fica no
 * manifesto (client/src/data/helpManifest.ts) e nunca muda; só a imagem é
 * regerada aqui, refletindo o conteúdo real (logo, cores, páginas) daquela
 * instância. Ver Fase 8 em docs/plano-template.md.
 *
 * Um tutorial pode ter mais de um print (um por passo que tiver `capture`
 * no manifesto) — os passos de um mesmo tutorial rodam em sequência sobre a
 * MESMA página, então um `click`/`fill` de um passo continua valendo (ex.:
 * um modal aberto no passo 1 ainda está aberto no passo 2) até o próximo
 * passo com `route` navegar para outro lugar.
 *
 * Nunca clica em ações que gravam ou apagam dado real (Salvar, Publicar,
 * confirmar exclusão, o botão final de "Adicionar"/"Enviar" dentro de um
 * modal) — só abre modais/abas e preenche campo de exemplo. Isso é
 * intencional: o script roda direto contra o site do cliente.
 *
 * Uso:
 *   1. Suba o app (npm run dev, ou build + start) e garanta que ADMIN_EMAIL/
 *      ADMIN_PASSWORD no .env correspondem a um usuário existente.
 *   2. Na primeira vez, instale o navegador do Playwright:
 *      npx playwright install chromium
 *   3. npm run generate:help-screenshots
 *      (opcional: HELP_SCREENSHOTS_BASE_URL=https://staging... na frente do comando)
 */
import path from 'node:path';
import fs from 'node:fs';
import { chromium, type Page } from 'playwright';
import dotenv from 'dotenv';
import { HELP_TUTORIALS } from '../client/src/data/helpManifest';

dotenv.config();

const BASE_URL = process.env.HELP_SCREENSHOTS_BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const OUTPUT_DIR = path.resolve(process.cwd(), 'client/public/help');

async function waitForScreenReady(page: Page) {
  // Várias telas do admin mostram um texto "Carregando..." enquanto buscam
  // dados (React Query). Espera esse texto sumir antes do print, em vez de
  // uma pausa fixa que captura a tela ainda em loading.
  //
  // Ordem importa: `waitFor({ state: 'detached' })` resolve IMEDIATAMENTE se
  // o elemento ainda não existe no DOM (já está "ausente" tecnicamente) — se
  // o print for tirado logo após a navegação, o React pode nem ter montado
  // o "Carregando..." ainda, e essa espera vira um no-op silencioso, saindo
  // o print com a tela em branco. Por isso espera primeiro o texto aparecer
  // (best-effort — algumas telas nunca chegam a mostrá-lo, se a query já
  // resolveu rápido) e só depois espera ele sumir.
  const loading = page.getByText(/Carregando/i).first();
  await loading.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  await loading.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(300);
}

async function bestEffortClick(page: Page, text: string, tutorialId: string) {
  try {
    await page.getByRole('button', { name: text, exact: false }).first().click({ timeout: 2500 });
  } catch {
    try {
      await page.getByText(text, { exact: false }).first().click({ timeout: 2500 });
    } catch {
      console.warn(`  [${tutorialId}] clique em "${text}" não encontrado — print sem essa interação.`);
      return;
    }
  }
  await page.waitForTimeout(400);
}

async function bestEffortFill(page: Page, placeholder: string, value: string, tutorialId: string) {
  try {
    await page.getByPlaceholder(placeholder, { exact: false }).first().fill(value, { timeout: 2500 });
  } catch {
    console.warn(`  [${tutorialId}] campo "${placeholder}" não encontrado — print sem esse preenchimento.`);
  }
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD (no .env da raiz) antes de rodar este script.');
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  // Limpa todos os prints existentes antes de gerar de novo — evita tanto
  // arquivo órfão (de um tutorial removido do manifesto) quanto, mais
  // importante, deixar prints de exemplo (gerados contra o seed genérico)
  // misturados com os de uma instância real depois que o projeto é migrado.
  // Sozinho isso não elimina conflito de merge em client/public/help/**
  // (dois branches que geram+commitam prints em paralelo ainda "adicionam"
  // os mesmos caminhos com bytes diferentes) — mas garante que uma única
  // rodada deste script sempre produz o conjunto completo e atual, nunca uma
  // mistura de gerações antigas e novas.
  const stalePrints = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));
  console.log(`Removendo ${stalePrints.length} print(s) anterior(es)...`);
  stalePrints.forEach((f) => fs.rmSync(path.join(OUTPUT_DIR, f)));

  const browser = await chromium.launch();
  const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((ctx) => ctx.newPage());

  console.log(`Base: ${BASE_URL}`);
  console.log('Fazendo login no admin...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'load' });
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page
    .waitForURL(`${BASE_URL}/admin`, { timeout: 15000 })
    .catch(() => console.warn('  Aviso: URL não confirmou /admin após o login — seguindo mesmo assim.'));

  let ok = 0;
  let failed = 0;

  for (const tutorial of HELP_TUTORIALS) {
    for (let stepIndex = 0; stepIndex < tutorial.steps.length; stepIndex++) {
      const capture = tutorial.steps[stepIndex].capture;
      if (!capture) continue;

      const shotId = `${tutorial.id}--s${stepIndex + 1}`;
      try {
        if (capture.route) {
          await page.goto(`${BASE_URL}${capture.route}`, { waitUntil: 'load' });
          await waitForScreenReady(page);
        }

        for (const text of capture.click ?? []) {
          await bestEffortClick(page, text, shotId);
        }
        for (const { placeholder, value } of capture.fill ?? []) {
          await bestEffortFill(page, placeholder, value, shotId);
        }
        // Um clique pode abrir um modal que busca dados (ex.: seletor de
        // mídia) sem navegação de página — reaplica a mesma espera aqui.
        if (capture.click?.length) {
          await waitForScreenReady(page);
        }

        await page.screenshot({ path: path.join(OUTPUT_DIR, `${shotId}.png`) });
        console.log(`  ok  ${shotId}`);
        ok++;
      } catch (error) {
        console.error(`  falhou  ${shotId}:`, error instanceof Error ? error.message : error);
        failed++;
      }
    }
  }

  await browser.close();
  console.log(`\n${ok} prints gerados em ${OUTPUT_DIR} (${failed} falharam).`);
  if (failed > 0) process.exitCode = 1;
}

main();
