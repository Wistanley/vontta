import { test, expect } from '@playwright/test';

test('briefing longo fica completo; excesso é informado sem cortar e modo editorial persiste', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await page.evaluate(() => {
    location.hash = 'posts';
  });
  await page.getByRole('button', { name: 'Novo perfil', exact: true }).click();
  await page.getByLabel('Nome do perfil', { exact: true }).fill('Will editorial');
  await page.getByLabel('@ do perfil').fill('@eusouwill.dev');
  await page.getByLabel('Público e nicho').fill('Gestores');
  await page.getByLabel('Produção das artes').selectOption('editorial');
  await page.getByLabel('Modelo de imagem OpenAI').fill('modelo');
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Nova publicação', exact: true }).click();
  const field = page.getByRole('textbox', {
    name: 'Pauta e instruções da publicação',
    exact: true,
  });
  const over = 'a'.repeat(30001);
  await field.fill(over);
  await expect(field).toHaveValue(over);
  await expect(page.getByRole('button', { name: 'Criar rascunho' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('O conteúdo não foi cortado');
  const brief = 'Uma pauta completa. '.repeat(360) + 'FIM ORIGINAL';
  await field.fill(brief);
  await page.getByRole('button', { name: 'Criar rascunho' }).click();
  await expect(page.getByRole('dialog')).toContainText('FIM ORIGINAL');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('vontta-post-creator-demo-v1')!),
  );
  expect(saved.posts[0].data.brief).toBe(brief);
  expect(saved.profiles[0].spec.renderMode).toBe('editorial');
});
test('perfis, agendas, rascunhos e memória persistem; demo não chama APIs e cabe no mobile', async ({
  page,
}) => {
  const calls: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/post-')) calls.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await page.evaluate(() => {
    location.hash = 'posts';
  });
  await expect(page.getByRole('heading', { name: 'Criador de posts.' })).toBeVisible();
  await page.getByRole('button', { name: 'Novo perfil', exact: true }).click();
  await page.getByLabel('Nome do perfil', { exact: true }).fill('Marca de teste');
  await page.getByLabel('@ do perfil').fill('@marca');
  await page.getByLabel('Público e nicho').fill('Gestores de pequenas empresas');
  await page.getByLabel('Modelo de imagem OpenAI').fill('modelo-imagens');
  await page.getByLabel('Aprovação e envio ao Telegram').selectOption('automatic');
  await page.getByRole('button', { name: 'Adicionar agenda' }).click();
  await page.getByLabel('Pauta da agenda').fill('Crie uma dica sobre processos comerciais.');
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nova publicação', exact: true }).click();
  await page.getByRole('button', { name: 'Carrossel', exact: true }).click();
  await page.getByLabel('Quantidade de telas', { exact: true }).fill('4');
  await page.getByLabel('Pauta e instruções da publicação').fill('Como organizar o comercial');
  await page.getByRole('button', { name: 'Criar rascunho' }).click();
  await page.getByRole('button', { name: 'Iniciar / continuar produção' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'demonstração não chama APIs',
  );
  await page.getByLabel('O que deve mudar?').fill('Use frases curtas e CTA em pergunta.');
  await page.getByRole('button', { name: 'Registrar orientação e criar nova versão' }).click();
  await expect(page.getByRole('dialog')).toContainText('versão 2');
  await page
    .getByLabel('Iniciar criação em (fuso do dispositivo)', { exact: true })
    .fill('2030-10-28T09:00');
  await page.getByRole('button', { name: 'Salvar horário de criação', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Antecipar e produzir agora', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Seções do criador' })
    .getByRole('button', { name: 'Perfis', exact: true })
    .click();
  await page.getByText('Memória do perfil', { exact: true }).click();
  await expect(
    page.getByText('Use frases curtas e CTA em pergunta.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Envio automático após revisores', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Explorar demonstração' }).click();
  await page.evaluate(() => {
    location.hash = 'posts';
  });
  await expect(page.locator('.post-card')).toContainText('Como organizar o comercial');
  await expect(page.locator('.post-card')).toContainText('Criação agendada');
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['Publicações', 'Perfis', 'Agendas', 'Conexões']) {
      await page
        .getByRole('navigation', { name: 'Seções do criador' })
        .getByRole('button', { name, exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (width === 1440 && name === 'Publicações')
        await page.screenshot({
          path: 'artifacts/diagnostics/post-creator-desktop.png',
          fullPage: true,
        });
      if (width === 390 && name === 'Perfis')
        await page.screenshot({
          path: 'artifacts/diagnostics/post-creator-mobile.png',
          fullPage: true,
        });
    }
  }
  await page
    .getByRole('navigation', { name: 'Seções do criador' })
    .getByRole('button', { name: 'Perfis', exact: true })
    .click();
  await page.getByRole('button', { name: 'Editar perfil e agendas' }).click();
  await expect(page.getByLabel('Aprovação e envio ao Telegram')).toHaveValue('automatic');
  await expect(page.getByLabel('Pauta da agenda')).toHaveValue(
    'Crie uma dica sobre processos comerciais.',
  );
  await expect
    .poll(() => page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth))
    .toBe(true);
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});
