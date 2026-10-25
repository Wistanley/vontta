import { mkdir, writeFile } from 'node:fs/promises';
const flows = [
  ['collect', '01 · Coleta de referências', 8, 0],
  ['rank', '02 · Classificação dos destaques', 8, 15],
  ['analyze', '03 · Análise dos destaques', 8, 30],
  ['scripts', '04 · Fila de roteiros', 9, 0],
  ['daily', '05 · Resumo diário', 9, 0],
  ['weekly', '06 · Resumo semanal', 9, 15],
  ['operations', '07 · Operações e retenção', 3, 0],
];
await mkdir('integrations/n8n', { recursive: true });
for (const [action, name, hour, minute] of flows) {
  const id = `vonttaRadar${action}`;
  const workflow = {
    id,
    name: `Vontta Radar · ${name}`,
    active: false,
    nodes: [
      {
        id: `${action}-trigger`,
        name: 'Agenda',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [0, 0],
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: `${minute} ${hour} * * ${action === 'weekly' ? '1' : action === 'scripts' ? '1,3,5' : '*'}`,
              },
            ],
          },
        },
      },
      {
        id: `${action}-internal`,
        name: 'Chamada interna',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [0, 180],
        parameters: { inputSource: 'passthrough' },
      },
      {
        id: `${action}-request`,
        name: 'Radar protegido',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [260, 0],
        parameters: {
          method: 'POST',
          url: 'http://vontta-radar:8795/internal/radar',
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: JSON.stringify({ action }),
          options: { timeout: 30000 },
        },
        credentials: {
          httpHeaderAuth: { id: 'vonttaRadarInternal', name: 'Vontta Radar · Worker' },
        },
      },
    ],
    connections: {
      Agenda: { main: [[{ node: 'Radar protegido', type: 'main', index: 0 }]] },
      'Chamada interna': { main: [[{ node: 'Radar protegido', type: 'main', index: 0 }]] },
    },
    settings: {
      executionOrder: 'v1',
      timezone: 'America/Sao_Paulo',
      saveDataSuccessExecution: 'none',
      saveDataErrorExecution: 'all',
    },
    tags: [],
  };
  await writeFile(`integrations/n8n/${action}.json`, JSON.stringify(workflow, null, 2) + '\n');
}
console.log('Sete workflows importáveis gerados, sem segredos.');
