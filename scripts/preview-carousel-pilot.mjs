import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('output/carrosseis/eusouwill-quem-e-will');
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/visao-geral.png', ['visao-geral.png', 'image/png']],
  ['/legenda.txt', ['legenda.txt', 'text/plain; charset=utf-8']],
  ...Array.from({ length: 10 }, (_, i) => {
    const name = `slides/slide-${String(i + 1).padStart(2, '0')}.png`;
    return [`/${name}`, [name, 'image/png']];
  }),
]);
const server = createServer((req, res) => {
  const route = routes.get(new URL(req.url || '/', 'http://localhost').pathname);
  if (!route || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', route[1]);
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(path.join(root, route[0])).pipe(res);
});
server.listen(4318, '127.0.0.1', () => console.log('Prévia do carrossel: http://127.0.0.1:4318/'));
