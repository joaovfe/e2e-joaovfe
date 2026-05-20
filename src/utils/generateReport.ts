/**
 * generateReport.ts
 * -----------------------------------------------------------------------------
 * Gera um PDF (`artifacts/test-report.pdf`) sumarizando a última execução da
 * suite Playwright. Lê o JSON produzido pelo reporter `json`
 * (`artifacts/test-results.json`), monta um HTML formatado e usa o próprio
 * Playwright (`page.pdf()`) para exportar.
 *
 * Uso:
 *   npx ts-node src/utils/generateReport.ts
 *   (ou via npm run report, definido em package.json)
 */

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { join } from 'path';

// -------------------------------------------------------------- tipos mínimos
type JsonTestResult = {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  error?: { message?: string };
};

type JsonTest = {
  results: JsonTestResult[];
};

type JsonSpec = {
  title: string;
  ok: boolean;
  tests: JsonTest[];
};

type JsonSuite = {
  title: string;
  specs: JsonSpec[];
  suites?: JsonSuite[];
};

type JsonReport = {
  config: { rootDir: string };
  suites: JsonSuite[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    skipped: number;
    unexpected: number;
    flaky: number;
  };
};

// ------------------------------------------------------------ planos de teste
// Mapa título-do-teste → objetivo + passos. Usado para enriquecer o relatório
// (o JSON do Playwright só traz título e status, não a documentação humana).
const TEST_PLANS: Record<string, { objetivo: string; passos: string[] }> = {
  'Verificar homepage carregada com título, header e logo': {
    objetivo:
      'Garantir que a página inicial do Automation Exercise renderiza corretamente, com título, header e carousel principal visíveis.',
    passos: [
      'Abrir https://automationexercise.com/',
      "Validar que o <title> da página é 'Automation Exercise'",
      'Validar que o header (#header) está visível',
      'Validar que o logo está visível',
      'Validar que o carousel principal (#slider) está visível'
    ]
  },
  'Buscar produto "T-Shirt" na página de produtos': {
    objetivo:
      'Confirmar que a busca por palavra-chave na página de produtos retorna ao menos um resultado.',
    passos: [
      "Acessar https://automationexercise.com/ e clicar em 'Products' no menu superior",
      "Validar que a URL termina em '/products'",
      "Preencher o campo de busca (#search_product) com 'T-Shirt'",
      "Clicar no botão de busca (#submit_search)",
      "Validar que o heading 'Searched Products' fica visível",
      'Validar que pelo menos 1 produto é exibido na grade de resultados'
    ]
  },
  'Enviar formulário de contato e validar mensagem de sucesso': {
    objetivo:
      'Verificar o fluxo de envio do formulário Contact Us, incluindo o confirm() nativo do navegador e a mensagem de sucesso pós-submit.',
    passos: [
      "Acessar https://automationexercise.com/ e clicar em 'Contact us' no menu",
      "Validar que a URL termina em '/contact_us' e o heading 'GET IN TOUCH' está visível",
      'Registrar handler de page.on("dialog") aceitando o confirm() nativo',
      'Preencher nome, email, assunto e mensagem com dados gerados via @faker-js/faker',
      "Clicar em 'Submit'",
      "Validar que a mensagem 'Success! Your details have been submitted successfully.' aparece visível na página"
    ]
  }
};

// --------------------------------------------------------------- coleta dados
function flattenSpecs(suites: JsonSuite[]): JsonSpec[] {
  const out: JsonSpec[] = [];
  for (const s of suites) {
    if (s.specs) out.push(...s.specs);
    if (s.suites) out.push(...flattenSpecs(s.suites));
  }
  return out;
}

function statusOf(spec: JsonSpec): {
  passou: boolean;
  rotulo: string;
  duracaoMs: number;
  erro?: string;
} {
  const lastResult = spec.tests[0]?.results[spec.tests[0].results.length - 1];
  const passou = spec.ok;
  return {
    passou,
    rotulo: passou ? 'Passou' : 'Falhou',
    duracaoMs: lastResult?.duration ?? 0,
    erro: lastResult?.error?.message
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ANSI escape codes do Playwright vêm no erro — limpamos para o PDF.
function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1b\[[0-9;]*m/g, '');
}

// ------------------------------------------------------------ geração de HTML
function buildHtml(report: JsonReport | null): string {
  const data = new Date().toLocaleDateString('pt-BR');
  const dataIso = '2026-05-20';
  const website = 'https://automationexercise.com/';

  const allSpecs: JsonSpec[] = report ? flattenSpecs(report.suites) : [];
  const total = allSpecs.length;
  const aprovados = allSpecs.filter((s) => s.ok).length;
  const reprovados = total - aprovados;

  const cards = allSpecs
    .map((spec, idx) => {
      const { passou, rotulo, duracaoMs, erro } = statusOf(spec);
      const plano = TEST_PLANS[spec.title];
      const objetivo = plano?.objetivo ?? '(sem descrição registrada)';
      const passos = plano?.passos ?? [];
      const passosHtml = passos
        .map((p, i) => `<li><span class="step-num">${i + 1}.</span> ${escapeHtml(p)}</li>`)
        .join('');
      const erroHtml = erro
        ? `<div class="error-block"><strong>Erro:</strong><pre>${escapeHtml(stripAnsi(erro))}</pre></div>`
        : '';
      const corBadge = passou ? 'badge-pass' : 'badge-fail';
      const iconeStatus = passou ? '✅' : '❌';
      return `
        <section class="test-card">
          <header class="test-header">
            <div class="test-title">
              <span class="test-index">Teste ${idx + 1}</span>
              <h2>${escapeHtml(spec.title)}</h2>
            </div>
            <span class="badge ${corBadge}">${iconeStatus} ${rotulo}</span>
          </header>
          <div class="test-body">
            <p><strong>Objetivo:</strong> ${escapeHtml(objetivo)}</p>
            <div>
              <strong>Passos executados:</strong>
              <ol class="step-list">${passosHtml}</ol>
            </div>
            <p class="duration"><strong>Duração:</strong> ${(duracaoMs / 1000).toFixed(2)}s</p>
            ${erroHtml}
          </div>
        </section>
      `;
    })
    .join('');

  const sumarioBloco = report
    ? `
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Total</span>
          <span class="summary-value">${total}</span>
        </div>
        <div class="summary-item summary-pass">
          <span class="summary-label">Aprovados</span>
          <span class="summary-value">${aprovados}</span>
        </div>
        <div class="summary-item summary-fail">
          <span class="summary-label">Reprovados</span>
          <span class="summary-value">${reprovados}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Duração total</span>
          <span class="summary-value">${(report.stats.duration / 1000).toFixed(1)}s</span>
        </div>
      </div>
    `
    : `
      <div class="warning-block">
        Nenhum arquivo <code>artifacts/test-results.json</code> encontrado.
        Execute <code>npm test</code> antes de gerar o relatório para obter o
        resumo dos resultados.
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de Testes E2E — Automation Exercise</title>
<style>
  :root {
    --pass: #16a34a;
    --fail: #dc2626;
    --ink: #0f172a;
    --muted: #475569;
    --line: #e2e8f0;
    --bg-soft: #f8fafc;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    color: var(--ink);
    margin: 0;
    padding: 40px 48px;
    background: white;
    font-size: 12px;
    line-height: 1.55;
  }
  h1 {
    font-size: 22px;
    margin: 0 0 4px;
    color: var(--ink);
  }
  h2 {
    font-size: 14px;
    margin: 4px 0 0;
    color: var(--ink);
  }
  header.report-header {
    border-bottom: 2px solid var(--ink);
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .meta {
    color: var(--muted);
    font-size: 11px;
    margin-top: 8px;
  }
  .meta div { margin-top: 2px; }
  .summary {
    display: flex;
    gap: 16px;
    margin: 16px 0 24px;
  }
  .summary-item {
    flex: 1;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 12px 16px;
    background: var(--bg-soft);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .summary-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }
  .summary-value {
    font-size: 22px;
    font-weight: 700;
  }
  .summary-pass .summary-value { color: var(--pass); }
  .summary-fail .summary-value { color: var(--fail); }
  .test-card {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 18px 20px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 12px;
  }
  .test-index {
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .test-title h2 { margin-top: 4px; }
  .badge {
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .badge-pass {
    background: #dcfce7;
    color: var(--pass);
  }
  .badge-fail {
    background: #fee2e2;
    color: var(--fail);
  }
  .step-list {
    margin: 4px 0 8px 0;
    padding-left: 0;
    list-style: none;
  }
  .step-list li {
    padding: 2px 0;
    color: var(--ink);
  }
  .step-num {
    color: var(--muted);
    font-weight: 600;
    margin-right: 4px;
  }
  .duration { color: var(--muted); }
  .error-block {
    margin-top: 8px;
    background: #fef2f2;
    border-left: 3px solid var(--fail);
    padding: 8px 12px;
    border-radius: 4px;
  }
  .error-block pre {
    margin: 4px 0 0;
    white-space: pre-wrap;
    font-size: 10px;
    color: var(--fail);
  }
  .warning-block {
    background: #fef9c3;
    border-left: 3px solid #ca8a04;
    padding: 12px 16px;
    border-radius: 4px;
    margin: 16px 0;
    font-size: 12px;
  }
  footer.report-footer {
    border-top: 1px solid var(--line);
    margin-top: 24px;
    padding-top: 12px;
    font-size: 10px;
    color: var(--muted);
    text-align: center;
  }
  code {
    font-family: 'Menlo', monospace;
    background: var(--bg-soft);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
</head>
<body>
  <header class="report-header">
    <h1>Relatório de Testes E2E — Automation Exercise</h1>
    <div class="meta">
      <div><strong>Data:</strong> ${dataIso} (${data})</div>
      <div><strong>Website testado:</strong> <a href="${website}">${website}</a></div>
      <div><strong>Framework:</strong> Playwright + TypeScript (Page Object Model)</div>
    </div>
  </header>

  <h2>Resumo</h2>
  ${sumarioBloco}

  <h2>Detalhamento dos cenários</h2>
  ${cards || '<p>Nenhum cenário registrado.</p>'}

  <footer class="report-footer">
    Gerado automaticamente por <code>src/utils/generateReport.ts</code> usando Playwright.
  </footer>
</body>
</html>`;
}

// ------------------------------------------------------------------ pipeline
async function main(): Promise<void> {
  const root = join(__dirname, '..', '..');
  const jsonPath = join(root, 'artifacts', 'test-results.json');
  const outDir = join(root, 'artifacts');
  const outPdf = join(outDir, 'test-report.pdf');

  await fs.mkdir(outDir, { recursive: true });

  let report: JsonReport | null = null;
  try {
    const raw = await fs.readFile(jsonPath, 'utf-8');
    report = JSON.parse(raw) as JsonReport;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[generateReport] Não foi possível ler ${jsonPath}: ${msg}`);
    console.warn('[generateReport] Gerando PDF sem dados de execução.');
  }

  const html = buildHtml(report);

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: outPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' }
    });
    console.log(`[generateReport] PDF gerado em: ${outPdf}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[generateReport] Falha ao gerar PDF:', err);
  process.exit(1);
});
