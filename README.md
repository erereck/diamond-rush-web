# Diamond Rush — port web S700

Implementação nativa em TypeScript e Canvas 2D, usando os dados da versão Sony Ericsson S700 1.2.0, non-padlock. **Build experimental: o jogo completo ainda não está portado.** Não usa J2ME no navegador.

## Testar online

[Abrir o jogo no GitHub Pages](https://erereck.github.io/diamond-rush-web/).

A publicação é automática a cada push em `main`, pelo workflow `.github/workflows/pages.yml`. O workflow extrai os recursos da referência fixada, executa os testes e publica a pasta `dist`. O código-fonte não inclui os arquivos gerados; eles entram no site durante a build. No celular, use o direcional abaixo da tela.

## Executar nesta máquina

Abra um terminal nesta pasta:

```powershell
npm run dev -- --port 5173
```

Acesse http://127.0.0.1:5173. Os recursos já foram extraídos para `public/assets`. O servidor atende apenas a máquina local. Para gerar a versão estática: `npm run build`; para conferir essa versão: `npm run preview`.

Use **Iniciar teste de Angkor**, setas ou WASD, Escape para pausar e R para reiniciar. Em tela pequena há direcional de toque. Espaço ou o botão de ação restaura o último checkpoint quando o personagem está sobre ele; armas ainda não foram portadas. O jogo tem tela lógica de 240 × 320 e roda a simulação a 20 Hz; a interface usa escala inteira de pixels.

No **Laboratório de preservação** é possível:

- Inspecionar os 41 mapas e abrir qualquer um na simulação parcial.
- Ver os frames e paletas dos 95 recursos de sprites.
- Ouvir as 21 faixas MIDI com timbres de prévia.
- Pausar, avançar um tick e exportar/importar replays de desenvolvimento.
- Renderizar todos os recursos para detectar erros de acesso.
- Inspecionar e exportar o modelo do record 1 do save RMS original.

O navegador salva a sessão experimental ao pausar ou sair. Ela retorna pausada. Essa sessão é um replay de entradas, **separado do save de campanha RMS**. Replays de versões anteriores do motor são rejeitados para evitar restauração divergente.

## Reproduzir a extração

Requer Node.js 22.18+ com suporte a execução de TypeScript (verificado aqui no Node 26.7), npm e Git. A estrutura esperada é `outputs/diamond-rush-web` e `work/reference-s700` dentro da mesma pasta de trabalho.

```powershell
git clone https://github.com/palaceswitcher/Diamond-Rush-Decomp ../../work/reference-s700
git -C ../../work/reference-s700 checkout 5e05c42aa1aae3377790600eb6d27497101b79e7
npm ci
npm run extract-assets
npm test
npm run build
```

Se o clone já existe, não repita `git clone`. Para outra localização: `npm run extract-assets -- C:/caminho/para/res`. Os testes de integração usam o clone canônico em `../../work/reference-s700`.

`npm run audit` também requer os dois clones comparativos descritos em `docs/VERSION_MATRIX.md`. O resultado dessa auditoria já está salvo em `docs/*INVENTORY.json` e `docs/RESOURCE_COMPARISON.json`.

## Estado real

Concluídos nesta etapa: auditoria e hashes das fontes, decodificação dos packs/sprites/mapas/strings/MIDI, renderização de recursos, relógio fixo, câmera, controles, simulação inicial, replays versionados e codec estrutural do save original.

A simulação contém somente um subconjunto: movimento, paredes, vegetação, coleta, gravidade/empurrão de pedras, patrulha básica de cobras, alcance e dano do fogo de Angkor, abertura do baú vermelho, checkpoints e retorno após morte. O desenho do personagem ao andar para a esquerda usa os deslocamentos dos frames originais; a pedra em rolagem usa o mesmo sentido visual do deslocamento físico. Portas e mecanismos restantes, água, armas, chefes, cenas, menus e progressão ainda precisam ser portados. Algumas representações de objetos são provisórias. Uma fase carregar não significa que pode ser concluída corretamente.

O JAR executável S700 correspondente ainda não foi validado. Não há alegação de equivalência completa com o original. Consulte `docs/STATUS.md` para os próximos marcos e `docs/VERIFICATION.md` para as verificações feitas.

Os recursos originais pertencem à Gameloft. A pasta gerada `public/assets` está excluída do Git e é extraída durante a publicação. O projeto não atribui uma nova licença aos recursos e ao código de referência. Projeto experimental independente, sem afiliação com a Gameloft.
