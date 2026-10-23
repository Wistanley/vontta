import { test, expect, Page } from '@playwright/test';
async function demo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await expect(page.getByRole('heading', { name: 'Vamos fazer acontecer.' })).toBeVisible();
}
async function navigate(page: Page, hash: string) {
  await page.evaluate((value) => {
    location.hash = value;
  }, hash);
}
test('casamento centraliza orçamento, gastos de todo o período e classificações persistentes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  await navigate(page, 'projects');
  await page.getByRole('button', { name: 'Meu casamento', exact: true }).click();
  await expect(page.getByLabel('Tipo de projeto', { exact: true })).toHaveValue('personal');
  await expect(page.getByLabel('Cliente', { exact: true })).toHaveCount(0);
  await page.getByLabel('Orçamento de gastos (R$)').fill('1000');
  await page.getByRole('button', { name: 'Salvar projeto', exact: true }).click();
  await page
    .locator('.project-card')
    .filter({ has: page.getByRole('heading', { name: 'Meu casamento', exact: true }) })
    .click();
  await page.getByRole('button', { name: 'Adicionar gasto', exact: true }).click();
  await expect(page.getByLabel('Tipo', { exact: true })).toHaveValue('expense');
  await page.getByLabel('Título', { exact: true }).fill('Buffet de casamento');
  await page.getByLabel('Valor (R$)').fill('1200.33');
  await page.getByLabel('Categoria', { exact: true }).fill('Fornecedores');
  await page.getByLabel('Vencimento', { exact: true }).fill('2027-05-10');
  await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
  await expect(page.locator('.project-cost-stats')).toContainText('Acima do orçamento');
  await expect(page.locator('.project-cost-stats')).toContainText('200,33');
  await expect(page.locator('.cost-categories')).toContainText('Fornecedores');
  await expect(page.getByRole('progressbar', { name: 'Orçamento comprometido' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({
    path: 'artifacts/diagnostics/personal-project-mobile.png',
    fullPage: true,
  });
  await navigate(page, 'finance');
  await page.getByLabel('Filtrar lançamentos por projeto').selectOption({ label: 'Meu casamento' });
  await page.getByLabel('Todo o período', { exact: true }).check();
  await expect(page.locator('.transaction-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Editar lançamento Buffet de casamento' }).click();
  await page.getByLabel('Excluir dos totais', { exact: false }).check();
  await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
  await expect(page.locator('.finance-stats')).not.toContainText('1.200,33');
  await page.reload();
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await navigate(page, 'projects');
  await page.getByLabel('Filtrar tipo de projeto').selectOption('personal');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.locator('.project-card').click();
  await expect(page.locator('.project-expense-row')).toContainText('Fora dos totais');
});
test('importados mantêm metadados e permitem classificar sem alterar valores; demo não chama Pluggy', async ({
  page,
}) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/pluggy')) calls.push(request.url());
  });
  await demo(page);
  await page.evaluate(() => {
    const key = 'vontta-workspace-demo-v1';
    const entries = JSON.parse(localStorage.getItem(key) || '[]');
    const date = new Date();
    const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-15`;
    entries.push({
      id: crypto.randomUUID(),
      kind: 'transaction',
      title: 'Compra importada de teste',
      createdAt: date.toISOString(),
      type: 'expense',
      amount: 98.11,
      date: local,
      paid: false,
      category: 'Sem categoria',
      projectId: '',
      recurrence: 'none',
      bank: {
        provider: 'pluggy',
        accountId: crypto.randomUUID(),
        transactionId: crypto.randomUUID(),
        accountName: 'Banco fictício · Cartão',
        accountType: 'CREDIT',
        status: 'POSTED',
        originalDate: date.toISOString(),
        syncedAt: date.toISOString(),
        installmentNumber: 2,
        totalInstallments: 6,
      },
    });
    localStorage.setItem(key, JSON.stringify(entries));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await navigate(page, 'finance');
  const row = page.locator('.transaction-row').filter({ hasText: 'Compra importada de teste' });
  await expect(row).toContainText('2/6');
  await row.getByRole('button', { name: 'Editar lançamento Compra importada de teste' }).click();
  await expect(page.getByLabel('Valor (R$)')).toBeDisabled();
  await expect(page.getByLabel('Vencimento')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Excluir', exact: true })).toHaveCount(0);
  await page.getByLabel('Categoria', { exact: true }).fill('Materiais');
  await page.getByLabel('Já foi pago').check();
  await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
  await expect(row).toContainText('Materiais');
  await expect(row).toContainText('Pago');
  await page.getByRole('button', { name: 'Conectar bancos', exact: true }).click();
  await expect(page.getByText('A demonstração não acessa bancos.', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'artifacts/diagnostics/pluggy-demo-mobile.png', fullPage: true });
  expect(calls).toEqual([]);
});
test('rascunho é preservado ao abrir e fechar a assistência de roteiro', async ({ page }) => {
  await demo(page);
  await navigate(page, 'content');
  await page.getByRole('button', { name: 'Novo conteúdo', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Como a IA organiza uma operação B2B');
  await page
    .getByLabel('Gancho · primeiros 3 segundos')
    .fill('Sua equipe responde a mesma pergunta todo dia?');
  await page.getByRole('button', { name: 'Criar roteiro com IA a partir deste rascunho' }).click();
  await page.getByRole('button', { name: 'Gerar sugestões', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('sessão autenticada');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue(
    'Como a IA organiza uma operação B2B',
  );
  await expect(page.getByLabel('Gancho · primeiros 3 segundos')).toHaveValue(
    'Sua equipe responde a mesma pergunta todo dia?',
  );
  await page.getByRole('button', { name: 'Salvar conteúdo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Como a IA organiza uma operação B2B' }),
  ).toBeVisible();
});
test('rotina, clientes e projetos são editáveis e persistem', async ({ page }) => {
  await demo(page);
  await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Revisar briefing de teste');
  await page.getByRole('button', { name: 'Salvar atividade' }).click();
  await expect(
    page.getByRole('button', { name: 'Revisar briefing de teste Pessoal · 30 min' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Concluir Revisar briefing de teste' }).click();
  await expect(
    page.getByRole('button', { name: 'Reabrir Revisar briefing de teste' }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await expect(
    page.getByRole('button', { name: 'Reabrir Revisar briefing de teste' }),
  ).toBeVisible();
  await navigate(page, 'clients');
  await page.getByRole('button', { name: 'Novo cliente', exact: true }).click();
  await page.getByLabel('Nome do contato').fill('Cliente Teste');
  await page.getByLabel('Empresa', { exact: true }).fill('Empresa B2B Teste');
  await page.getByLabel('E-mail', { exact: true }).fill('cliente@example.com');
  await page.getByRole('button', { name: 'Salvar cliente' }).click();
  await expect(page.getByRole('heading', { name: 'Empresa B2B Teste' })).toBeVisible();
  await navigate(page, 'projects');
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Portal B2B de teste');
  await page.getByLabel('Cliente', { exact: true }).selectOption({ label: 'Empresa B2B Teste' });
  await page
    .getByLabel('Documentação, links e critérios de aceite')
    .fill('Formulário validado e telas responsivas.');
  await page.getByRole('button', { name: 'Salvar projeto' }).click();
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: 'Portal B2B de teste' }) })
    .click();
  await expect(page.getByText('Formulário validado e telas responsivas.')).toBeVisible();
  await page.getByRole('button', { name: 'Concluir Descoberta e briefing', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Reabrir Descoberta e briefing', exact: true }),
  ).toBeVisible();
});

test('agenda mantém roteiro completo e permite atividades com horário e duração a definir', async ({
  page,
}) => {
  await demo(page);
  await navigate(page, 'planner');
  await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Publicar carrossel de operações');
  const notes =
    'Objetivo: autoridade B2B.\nSlide 1: gancho.\nSlide 2: integração.\nCTA: em qual nível sua empresa está?';
  await page.getByLabel('Detalhes e roteiro da atividade').fill(notes);
  await page.getByLabel('Horário (opcional)', { exact: true }).fill('');
  await page.getByLabel('Duração (minutos)', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Salvar atividade', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Publicar carrossel de operações Pessoal · Duração a definir',
    }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await navigate(page, 'planner');
  await page
    .getByRole('button', { name: 'Publicar carrossel de operações Pessoal · Duração a definir' })
    .click();
  await expect(page.getByLabel('Detalhes e roteiro da atividade')).toHaveValue(notes);
  await expect(page.getByLabel('Horário (opcional)', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Salvar atividade', exact: true }).click();
  await expect(page.getByText('Sem horário', { exact: true })).toBeVisible();
});
test('conteúdo percorre roteiro, gravação e edição', async ({ page }) => {
  await demo(page);
  await navigate(page, 'content');
  await page.getByRole('button', { name: 'Novo conteúdo', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Processos B2B de teste');
  await page.getByLabel('Etapa', { exact: true }).selectOption('Gravar');
  await page
    .getByLabel('Gancho · primeiros 3 segundos')
    .fill('Sua empresa perde tempo com tarefas repetidas?');
  await page
    .getByLabel('Roteiro / slides')
    .fill('Mapeie um processo, meça o retrabalho e automatize a etapa mais repetida.');
  await page.getByRole('button', { name: 'Salvar conteúdo' }).click();
  const card = page.locator('.content-card').filter({ hasText: 'Processos B2B de teste' });
  await card.getByRole('button', { name: 'Modo de gravação' }).click();
  await expect(page.locator('.teleprompter')).toContainText('Mapeie um processo');
  await page.getByRole('button', { name: 'Ensaiar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Já gravei · enviar para edição' }).click();
  await expect(
    page
      .locator('.content-column')
      .filter({ has: page.getByRole('heading', { name: 'Editar', exact: false }) })
      .getByRole('heading', { name: 'Processos B2B de teste' }),
  ).toBeVisible();
});
test('financeiro registra pagamento e gera recorrência sem duplicar', async ({ page }) => {
  await demo(page);
  await navigate(page, 'finance');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Mensalidade Teste');
  await page.getByLabel('Valor (R$)').fill('1500.55');
  await page.getByLabel('Recorrência', { exact: true }).selectOption('monthly');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  const row = page.locator('.transaction-row').filter({ hasText: 'Mensalidade Teste' });
  await expect(row.getByRole('button', { name: 'Pendente', exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Pendente', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Recebido', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar recorrências', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('1 lançamento');
  await page.getByRole('button', { name: 'Gerar recorrências', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Nenhuma recorrência');
  await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
  await expect(
    page.locator('.transaction-row').filter({ hasText: 'Mensalidade Teste' }),
  ).toHaveCount(1);
  await expect(
    page
      .locator('.transaction-row')
      .filter({ hasText: 'Mensalidade Teste' })
      .getByRole('button', { name: 'Pendente', exact: true }),
  ).toBeVisible();
});
test('layout se ajusta a desktop e mobile sem rolagem horizontal na página', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await demo(page);
  await page.screenshot({ path: 'artifacts/desktop-overview.png', fullPage: true });
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const hash of [
      'overview',
      'planner',
      'content',
      'projects',
      'finance',
      'clients',
      'settings',
    ]) {
      await navigate(page, hash);
      await expect(page.locator('main')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (width === 390 && ['overview', 'content', 'finance'].includes(hash))
        await page.screenshot({ path: `artifacts/mobile-${hash}.png`, fullPage: true });
    }
    if (width === 390) {
      await navigate(page, 'finance');
      const bar = page.locator('.topbar');
      expect(await bar.evaluate((e) => getComputedStyle(e).position)).toBe('static');
      await page.getByRole('button', { name: 'Novo lançamento', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect
        .poll(() => page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth))
        .toBe(true);
      await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    }
  }
  expect(errors).toEqual([]);
});

test('subprojetos persistem, podem ser movidos e protegem o projeto principal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  await navigate(page, 'projects');
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Entrega principal de teste');
  await page.getByRole('button', { name: 'Salvar projeto', exact: true }).click();
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: 'Entrega principal de teste', exact: true }) })
    .click();
  await page.getByRole('button', { name: 'Novo subprojeto', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Módulo comercial de teste');
  await page.getByLabel('Prazo de entrega').fill('2026-12-15');
  await page
    .getByLabel('Documentação, links e critérios de aceite')
    .fill('Funil comercial e integração com CRM.');
  await page.getByRole('button', { name: 'Salvar subprojeto', exact: true }).click();
  await page
    .getByRole('button')
    .filter({ has: page.locator('strong', { hasText: 'Módulo comercial de teste' }) })
    .click();
  await expect(page.getByRole('navigation', { name: 'Hierarquia do projeto' })).toContainText(
    'Entrega principal de teste',
  );
  await expect(
    page.getByText('Funil comercial e integração com CRM.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Concluir Descoberta e briefing', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Hierarquia do projeto' })
    .getByRole('button', { name: 'Entrega principal de teste', exact: true })
    .click();
  await page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
  await expect(page.getByLabel('Projeto pai').locator('option')).not.toContainText([
    'Módulo comercial de teste',
  ]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('possui subprojetos');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await navigate(page, 'projects');
  await page.getByLabel('Buscar projeto').fill('Módulo comercial');
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: 'Módulo comercial de teste', exact: true }) })
    .click();
  await expect(
    page.getByRole('button', { name: 'Reabrir Descoberta e briefing', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
  await page.getByLabel('Projeto pai').selectOption('');
  await page.getByRole('button', { name: 'Salvar projeto', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Hierarquia do projeto' })).toHaveCount(0);
});
