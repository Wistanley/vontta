import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('artifacts/diagnostics/carousel-pilot/photos');
fs.mkdirSync(root, { recursive: true });
const photos = [
  { id: 'OqtafYT5kTw', author: 'Ilya Pavlov', alt: 'Fotografia de código em um monitor de computador.', position: '50% 45%' },
  { id: 'hGV2TfOh0ns', author: 'Domenico Loia', alt: 'Computadores em uma mesa de trabalho iluminada.', position: '50% 53%' },
  { id: 'sggw4-qDD54', author: 'Annie Spratt', alt: 'Profissionais trabalhando com computadores em um escritório.', position: '50% 48%' },
  { id: '5QgIuuBxKwM', author: 'Headway', alt: 'Pessoas discutindo o trabalho com notebooks e anotações.', position: '50% 57%' },
  { id: 'dyUp7WPu5q4', author: 'Albert Stoynov', alt: 'Cabos de rede conectados a equipamentos de infraestrutura.', position: '50% 50%' },
  { id: '4nfPgBofTs4', author: 'Trans Russia', alt: 'Visitantes observando uma demonstração de automação logística.', position: '50% 55%' },
  { id: 'QBpZGqEMsKg', author: 'Alex Kotliarskyi', alt: 'Equipe de programação trabalhando com monitores e notebooks.', position: '50% 48%' },
  { id: 'QckxruozjRg', author: 'Annie Spratt', alt: 'Equipe reunida para trabalhar em torno de um notebook.', position: '50% 43%' },
  { id: 'JKUTrJ4vK00', author: 'Luke Chesser', alt: 'Tela de notebook com gráficos e indicadores de desempenho.', position: '50% 50%' },
  { id: 'LRn6do1x6tI', author: 'UK Black Tech', alt: 'Profissionais conversando em uma reunião com notebook.', position: '50% 52%' },
];

const results = await Promise.allSettled(photos.map(async (photo, index) => {
  photo.source = `https://unsplash.com/photos/${photo.id}`;
  photo.license = 'https://unsplash.com/license';
  photo.filename = `photo-${String(index + 1).padStart(2, '0')}.jpg`;
  const response = await fetch(photo.source);
  if (!response.ok) throw new Error(`Fonte indisponível: ${photo.id} (${response.status})`);
  const html = await response.text();
  if (!html.includes('Free to use under') || html.includes('Licensed under the Unsplash+ License')) throw new Error(`Verificar licença da foto ${photo.id}`);
  const image = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/)?.[1]?.split('?')[0];
  if (!image?.startsWith('https://images.unsplash.com/photo-')) throw new Error(`Imagem não encontrada: ${photo.id}`);
  photo.imageUrl = `${image}?auto=format&fit=max&w=2000&q=90&fm=jpg`;
  const file = await fetch(photo.imageUrl);
  if (!file.ok) throw new Error(`Download falhou: ${photo.id} (${file.status})`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (metadata.width < 1080 || metadata.height < 600) throw new Error(`Resolução insuficiente: ${photo.id}`);
  fs.writeFileSync(path.join(root, photo.filename), buffer);
  photo.width = metadata.width;
  photo.height = metadata.height;
  return { id: photo.id, filename: photo.filename, width: photo.width, height: photo.height };
}));
for (const result of results) {
  if (result.status === 'rejected') throw result.reason;
  console.log(JSON.stringify(result.value));
}
fs.writeFileSync(path.join(root, 'sources.json'), JSON.stringify(photos, null, 2));

const thumbs = await Promise.all(photos.map(async (photo) => sharp(path.join(root, photo.filename)).resize(400, 260, { fit: 'cover' }).toBuffer()));
await sharp({ create: { width: 2080, height: 568, channels: 3, background: '#dce3dc' } }).composite(thumbs.map((input, i) => ({ input, left: 16 + (i % 5) * 412, top: 16 + Math.floor(i / 5) * 276 }))).png().toFile(path.join(root, 'selecao.png'));
