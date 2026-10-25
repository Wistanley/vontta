import fs from 'node:fs';
import path from 'node:path';
import { createElement as h, type CSSProperties, type ReactNode } from 'react';
import satori from 'satori';
import sharp from 'sharp';
import catalog from '../content/editorial-photos.js';
import type { PostSlide } from '../lib/post-creator.js';
import { PublicError } from './http.js';

const tags = [
  'software código programar desenvolver sistema tecnologia',
  'sistema ferramenta computador software digital',
  'planilha retrabalho duplicidade fragmentada ferramentas contexto',
  'problema processo diagnóstico operação pessoas informação trabalho',
  'integrar integração conectar conexão sistemas dados',
  'automação automatizar fluxo etapas repetidas regras logística',
  'agente inteligência artificial supervisão equipe desenvolvimento',
  'pessoas empresa tecnologia meio equipe colaboração',
  'gestão indicadores números resultado decisão relatório',
  'conversa pergunta melhorar empresa gestor comentários',
];
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function choosePhoto(slide: PostSlide, index: number, used: string[]) {
  const text = normalize(`${slide.heading} ${slide.body}`);
  return (
    catalog
      .map((photo, i) => ({
        photo,
        score: tags[i]
          .split(' ')
          .reduce((n, tag) => n + (text.includes(normalize(tag)) ? 1 : 0), 0),
        order: (i - index + catalog.length) % catalog.length,
      }))
      .filter(({ photo }) => !used.includes(photo.id))
      .sort((a, b) => b.score - a.score || a.order - b.order)[0]?.photo ||
    catalog[index % catalog.length]
  );
}

export async function loadPhoto(url: string): Promise<Buffer> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'images.unsplash.com' ||
    !parsed.pathname.startsWith('/photo-')
  )
    throw new PublicError(400, 'A fotografia precisa pertencer ao acervo autorizado.');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(25000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
    throw new PublicError(502, 'A fonte da fotografia está indisponível. Tente novamente.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  const reader = response.body!.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8 * 1024 * 1024)
        throw new PublicError(502, 'Fotografia excedeu o limite de tamanho.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

const fonts = () =>
  ([400, 500, 600] as const).map((weight) => ({
    name: 'Poppins',
    weight,
    style: 'normal' as const,
    data: fs.readFileSync(
      path.join(process.cwd(), 'server/assets/poppins', `poppins-latin-${weight}-normal.woff`),
    ),
  }));
const box = (style: CSSProperties, ...children: ReactNode[]) =>
  h('div', { style: { display: 'flex', boxSizing: 'border-box', ...style } }, ...children);

export async function renderEditorial(options: {
  slide: PostSlide;
  index: number;
  total: number;
  handle: string;
  story: boolean;
  usedPhotos?: string[];
  photoBytes?: Buffer;
}) {
  const { slide, index, total, handle, story } = options;
  const photo = choosePhoto(slide, index, options.usedPhotos || []);
  const original = options.photoBytes || (await loadPhoto(photo.imageUrl));
  const metadata = await sharp(original, { limitInputPixels: 24000000 }).metadata();
  if (!metadata.width || metadata.width < 1080 || !metadata.height || metadata.height < 600)
    throw new PublicError(502, 'A fotografia selecionada não tem resolução suficiente.');
  const height = story ? 1920 : 1350;
  const photoTop = story ? 230 : 140;
  const photoHeight = story ? 620 : 460;
  const contentTop = photoTop + photoHeight + 52;
  const contentBottom = height - (story ? 230 : 140);
  const mint = index > 0 && index === Math.floor(total / 2);
  const light = index % 2 === 1;
  const background = mint ? '#A5E7C2' : light ? '#F3F4F2' : '#101114';
  const ink = mint || light ? '#17221D' : '#F3F4F2';
  const accent = mint || light ? '#245E43' : '#A5E7C2';
  const secondary = mint || light ? '#56645C' : '#B4BFBA';
  const image = await sharp(original)
    .resize(936, photoHeight, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 90 })
    .toBuffer();
  for (let step = 0; step < 9; step++) {
    const headingSize = Math.max(48, 88 - step * 5);
    const bodySize = Math.max(28, 38 - step * 2);
    let textBottom = 0;
    const text = box(
      { flexDirection: 'column', width: 936, position: 'absolute', left: 72, top: contentTop },
      box(
        { fontSize: 15, fontWeight: 500, letterSpacing: 2, color: secondary, marginBottom: 24 },
        index === 0
          ? 'O PONTO DE PARTIDA'
          : index === total - 1
            ? 'PARA PENSAR NA SUA OPERAÇÃO'
            : `UMA IDEIA POR VEZ / ${String(index + 1).padStart(2, '0')}`,
      ),
      h(
        'div',
        {
          'data-measure': 'heading',
          style: {
            fontWeight: 600,
            fontSize: headingSize,
            lineHeight: 1.1,
            letterSpacing: -0.8,
            color: index === total - 1 ? accent : ink,
            marginBottom: 28,
            whiteSpace: 'pre-wrap',
          },
        },
        slide.heading,
      ),
      h(
        'div',
        {
          'data-measure': 'body',
          style: {
            fontWeight: 400,
            fontSize: bodySize,
            lineHeight: 1.48,
            color: secondary,
            whiteSpace: 'pre-wrap',
          },
        },
        slide.body,
      ),
    );
    const svg = await satori(
      box(
        {
          width: 1080,
          height,
          background,
          fontFamily: 'Poppins',
          color: ink,
          position: 'relative',
        },
        box({ position: 'absolute', top: 0, left: 0, width: 1080, height: 7, background: accent }),
        box(
          {
            position: 'absolute',
            left: 72,
            right: 72,
            top: story ? 135 : 48,
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 18,
            fontWeight: 500,
          },
          box(
            { gap: 18, alignItems: 'center' },
            box({ fontSize: 25, fontWeight: 600 }, 'W.'),
            handle,
          ),
          box({ fontSize: 12, letterSpacing: 2, color: secondary }, 'SOFTWARE · OPERAÇÃO · IA'),
        ),
        h('img', {
          src: `data:image/jpeg;base64,${image.toString('base64')}`,
          width: 936,
          height: photoHeight,
          style: { position: 'absolute', top: photoTop, left: 72 },
        }),
        box(
          {
            position: 'absolute',
            top: photoTop + photoHeight - 36,
            left: 72,
            width: 936,
            height: 36,
            alignItems: 'center',
            paddingLeft: 16,
            background: '#101114B8',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 400,
          },
          `Foto: ${photo.author} / Unsplash`,
        ),
        text,
        box(
          {
            position: 'absolute',
            left: 72,
            top: height - (story ? 180 : 58),
            width: 936,
            alignItems: 'center',
            gap: 24,
          },
          box(
            { width: 836, height: 3, background: light || mint ? '#CFDAD2' : '#34453B' },
            box({ width: `${((index + 1) / total) * 100}%`, height: 3, background: accent }),
          ),
          box(
            { fontSize: 17, color: secondary },
            `${String(index + 1).padStart(2, '0')} / ${total}`,
          ),
        ),
      ),
      {
        width: 1080,
        height,
        fonts: fonts(),
        onNodeDetected: (node) => {
          if (node.props?.['data-measure'])
            textBottom = Math.max(textBottom, node.top + node.height);
        },
      },
    );
    if (textBottom <= contentBottom && textBottom > contentTop) {
      return {
        png: await sharp(Buffer.from(svg)).png().toBuffer(),
        photo: {
          id: photo.id,
          author: photo.author,
          source: photo.source,
          license: photo.license,
          alt: photo.alt,
        },
        layout: { font: 'Poppins', headingWeight: 600, bodyWeight: 400, headingSize, bodySize },
      };
    }
  }
  throw new PublicError(
    422,
    'O texto desta tela não cabe com legibilidade. Encurte o título ou o corpo em Editar textos.',
  );
}
