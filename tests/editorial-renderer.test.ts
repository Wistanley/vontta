import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { renderEditorial, choosePhoto, loadPhoto } from '../server/editorial-renderer';
import { reviewInstructions } from '../server/post-creator';
import { MAX_POST_BRIEF, scheduleSchema, profileSchema, defaultProfile } from '../lib/post-creator';

test('briefings longos são aceitos sem corte e os limites são explícitos', () => {
  const brief = 'a'.repeat(12000) + ' FIM DO ROTEIRO';
  const schedule = {
    id: crypto.randomUUID(),
    enabled: true,
    days: [1],
    time: '09:00',
    timezone: 'America/Sao_Paulo',
    format: 'Carrossel',
    slides: 8,
    brief,
  };
  assert.equal(scheduleSchema.parse(schedule).brief, brief);
  assert.equal(
    scheduleSchema.safeParse({ ...schedule, brief: 'a'.repeat(MAX_POST_BRIEF + 1) }).success,
    false,
  );
  const spec = { ...defaultProfile(), name: 'Perfil', audience: 'Gestores', imageModel: 'modelo' };
  assert.equal(profileSchema.parse(spec).renderMode, 'generated');
  assert.equal(profileSchema.parse({ ...spec, renderMode: 'editorial' }).renderMode, 'editorial');
});

test('fotografias têm procedência, não se repetem no carrossel e rejeitam URL fora do acervo', async () => {
  const slide = {
    heading: 'Integrar sistemas',
    body: 'Conectar informações e pessoas.',
    imagePrompt: 'Uma fotografia real.',
  };
  const first = choosePhoto(slide, 0, []);
  const second = choosePhoto(slide, 1, [first.id]);
  assert.notEqual(first.id, second.id);
  assert.equal(first.author, 'Albert Stoynov');
  assert.equal(first.license, 'https://unsplash.com/license');
  await assert.rejects(loadPhoto('http://127.0.0.1/private'), /acervo autorizado/);
  await assert.rejects(
    loadPhoto('https://images.unsplash.com.evil.example/photo-test'),
    /acervo autorizado/,
  );
});

test('renderização incorpora Poppins, mantém formato exato e não cria faixas brancas', async () => {
  const photoBytes = await sharp({
    create: { width: 1800, height: 1200, channels: 3, background: '#789785' },
  })
    .jpeg()
    .toBuffer();
  for (const story of [false, true]) {
    const rendered = await renderEditorial({
      slide: {
        heading: 'Integração começa pelo processo.',
        body: 'Conectar sistemas exige dados confiáveis, regras e responsabilidades definidas.',
        imagePrompt: 'Foto real.',
      },
      index: 0,
      total: 8,
      handle: '@eusouwill.dev',
      story,
      photoBytes,
    });
    const meta = await sharp(rendered.png).metadata();
    assert.equal(meta.width, 1080);
    assert.equal(meta.height, story ? 1920 : 1350);
    assert.deepEqual(
      await sharp(rendered.png)
        .extract({ left: 0, top: 500, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer(),
      Buffer.from([16, 17, 20]),
    );
    assert.equal(rendered.layout.font, 'Poppins');
    assert.equal(rendered.layout.headingWeight, 600);
    assert.equal(rendered.layout.bodyWeight, 400);
    assert(rendered.photo.source.startsWith('https://unsplash.com/photos/'));
  }
});

test('texto que não cabe é recusado em vez de ser cortado', async () => {
  const photoBytes = await sharp({
    create: { width: 1800, height: 1200, channels: 3, background: '#789785' },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(
    renderEditorial({
      slide: {
        heading: 'Uma ideia por tela.',
        body: 'Uma operação com contexto. '.repeat(100),
        imagePrompt: 'Foto real.',
      },
      index: 0,
      total: 1,
      handle: '@eusouwill.dev',
      story: false,
      photoBytes,
    }),
    /não cabe/,
  );
});

test('revisores têm escopos separados e não exigem imagens antes da produção', () => {
  assert(reviewInstructions('Português').includes('Não reprove pela ausência de imagens'));
  assert(!reviewInstructions('Português').includes('Examine TODAS'));
  assert(reviewInstructions('Editorial').includes('Não avalie tipografia'));
  assert(reviewInstructions('Visual').includes('Examine TODAS'));
});
