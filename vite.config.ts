import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Apenas o processo Node recebe os segredos. Nenhuma chave é injetada no bundle.
  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'AI_PROVIDER',
    'AI_MODEL',
    'AI_MODEL_OPENAI',
    'AI_MODEL_ANTHROPIC',
    'AI_MODEL_GOOGLE',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'AI_SETTINGS_ENCRYPTION_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
  ])
    if (env[name]) process.env[name] = env[name];
  return {
    server: { port: 3000, host: '127.0.0.1' },
    plugins: [
      react(),
      {
        name: 'vontta-local-api',
        configureServer(server) {
          server.middlewares.use('/api/radar', async (req, res) => {
            const { default: handler } = await import('./api/radar');
            await handler(req, res);
          });
          server.middlewares.use('/api/post-creator', async (req, res) => {
            const { default: handler } = await import('./api/post-creator');
            await handler(req, res);
          });
          server.middlewares.use('/api/post-worker', async (req, res) => {
            const { default: handler } = await import('./api/post-worker');
            await handler(req, res);
          });
          server.middlewares.use('/api/pluggy', async (req, res) => {
            try {
              const { default: handler } = await import('./api/pluggy');
              await handler(req, res);
            } catch {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Não foi possível iniciar a conexão Pluggy.' }));
            }
          });
          server.middlewares.use('/api/ai-settings', async (req, res) => {
            try {
              const { default: handler } = await import('./api/ai-settings');
              await handler(req, res);
            } catch {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Não foi possível abrir as configurações de IA.' }));
            }
          });
          server.middlewares.use('/api/assistant', async (req, res) => {
            try {
              const { default: handler } = await import('./api/assistant');
              await handler(req, res);
            } catch {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Não foi possível iniciar a API local.' }));
            }
          });
        },
      },
    ],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, '.') } },
  };
});
