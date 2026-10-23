# Padrão visual de @eusouwill.dev

Direção escolhida por Will em 22/10/2026 para os próximos posts, carrosséis e stories. Referência: piloto **Quem é o Will?**, em `output/carrosseis/eusouwill-quem-e-will/`.

## Tipografia e composição

- **Poppins** em toda a peça. Títulos em **Semibold 600**, apoio em **Medium 500**, corpo em **Regular 400**. Não usar os pesos 800 ou 900.
- Títulos alinhados à esquerda, com poucas linhas. No feed, referência de 77–92 px, entrelinha de 1,1 e espaçamento de letras de −0,8 px. Ajustar ao conteúdo sem comprimir a fonte.
- Corpo de 35–42 px, entrelinha próxima de 1,48. Uma ideia por tela, texto curto e respiro entre foto, título, corpo e rodapé.
- Feed e carrosséis em **1080 × 1350**, margens laterais de **72 px**, identificação discreta e indicador de progresso. Stories em **1080 × 1920**, com áreas livres para a interface do Instagram.

## Paleta

| Uso                         | Cor       |
| --------------------------- | --------- |
| Fundo grafite               | `#101114` |
| Fundo carvão                | `#191A1F` |
| Branco suave                | `#F3F4F2` |
| Verde menta                 | `#A5E7C2` |
| Texto escuro em fundo claro | `#17221D` |
| Verde em fundo claro        | `#245E43` |

Alternar fundos claros e escuros com unidade visual. Usar o verde como destaque de palavras e, ocasionalmente, como fundo de uma tela central.

## Fotografias

Usar **fotografias reais** coerentes com cada argumento: desenvolvimento, trabalho, reuniões, processos, integração, infraestrutura e operações. Buscar na internet quando necessário, verificar a licença de cada imagem e registrar fotógrafo, página de origem e licença. O piloto usa fotografias gratuitas do Unsplash e mantém esses registros em `fontes-das-imagens.json` e `creditos-das-imagens.txt`.

Não apresentar foto de banco como Will, sua equipe, cliente, projeto ou bastidor. Uma foto de banco é ilustração. Para comprovar um case, usar material real fornecido e autorizado. Não substituir fotos por imagens geradas que apenas pareçam fotografias. Evitar robôs decorativos, hologramas, cérebros neon e imagens genéricas de hype.

Fotografias devem ter presença na composição, com recorte que preserve o assunto. Texto sobre foto exige contraste suficiente e fundo ou degradê de proteção. Não deformar imagens. Diagramas podem complementar uma explicação quando necessários.

## Produção e revisão

Construir a tipografia e os elementos de layout em HTML/CSS e usar as fotografias como arquivos reais. Exportar cada tela em PNG, conferir dimensões, carregamento das fontes e imagens, cortes e legibilidade. Conferir visualmente a visão geral e as telas que exigirem ajustes. A legenda complementa o carrossel e há um CTA principal.

Manter revisores de português, editorial e visual e a aprovação humana configurada no perfil. A preferência de estilo não aprova uma publicação nem autoriza seu envio ao Telegram.

## Reproduzir o piloto

```powershell
npm ci
npx playwright install chromium
npm run carousel:prepare
npm run carousel:render
npm run carousel:preview
```

`carousel:prepare` baixa as dez fotografias a partir das páginas registradas e confere suas licenças e resolução. É a única etapa que precisa acessar as fontes externas. A Poppins vem do pacote `@fontsource/poppins`, fixado no lockfile. O gerador incorpora fontes e imagens no HTML, que também pode ser aberto sem conexão.

O piloto é uma referência editorial local. O criador automático do app usa sua própria etapa de geração de imagens; registrar a direção visual no perfil orienta a criação e revisão, mas não acrescenta busca de fotografias ou renderização HTML a essa API. Antes de produzir automaticamente com fotos de banco, essa composição deve ser integrada ao fluxo de produção.

As preferências, a direção de imagem e os critérios de revisão também foram atualizados no perfil existente em 22/10/2026. O script `scripts/update-will-visual-style.ts` faz essa atualização específica, preserva os demais campos e salva uma cópia anterior em `artifacts/diagnostics/`, fora do Git. Sem `--apply`, apenas valida a proposta; com `--apply`, aplica ao perfil confirmado na conta de Will pela CLI autenticada do Supabase.
