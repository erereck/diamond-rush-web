# Diamond Rush — port web S700

Implementação nativa em TypeScript e Canvas 2D, usando os dados da versão Sony Ericsson S700 1.2.0, non-padlock. **Build experimental: o jogo completo ainda não está portado.** Não usa J2ME no navegador.

## Testar online

[Abrir o jogo no GitHub Pages](https://erereck.github.io/diamond-rush-web/).

A publicação é automática a cada push em `main`, pelo workflow `.github/workflows/pages.yml`. O workflow extrai os recursos da referência fixada, executa os testes e publica a pasta `dist`. O código-fonte não inclui os arquivos gerados; eles entram no site durante a build. No celular, use o controle abaixo da tela. Toque em **Ajustar** para alternar direcional/analógico, trocar de mão, redimensionar, alterar transparência e zona morta, ligar vibração e arrastar os grupos de botões. Há botões próprios para confirmar, voltar, pausar e retornar ao checkpoint.

## Executar nesta máquina

Abra um terminal nesta pasta:

```powershell
npm run dev -- --port 5173
```

Acesse http://127.0.0.1:5173. Os recursos já foram extraídos para `public/assets`. O servidor atende apenas a máquina local. Para gerar a versão estática: `npm run build`; para conferir essa versão: `npm run preview`.

O jogo abre no menu S700. Escolha **New Game** para assistir à abertura de Angkor e entrar no mapa, ou **Continue** para voltar ao mapa salvo. Use setas ou WASD para seguir as ligações entre fases e Enter/Espaço para entrar; Escape abre a seleção de mundos. No celular, o direcional e o botão de ação também navegam no menu e no mapa. Durante a fase, Escape pausa, R inicia o retorno ao checkpoint (consumindo uma vida quando o personagem está longe dele), e o botão de ação restaura o checkpoint quando o personagem está sobre ele; armas ainda não foram portadas. O jogo tem tela lógica de 240 × 320 e roda a simulação a 20 Hz; a interface usa escala inteira de pixels.

No **Laboratório de preservação** é possível:

- Inspecionar os 41 mapas e abrir qualquer um na simulação parcial.
- Ver os frames e paletas dos 98 recursos de sprites, incluindo os três da abertura.
- Ouvir as 21 faixas MIDI com timbres de prévia.
- Pausar, avançar um tick e exportar/importar replays de desenvolvimento.
- Renderizar todos os recursos para detectar erros de acesso.
- Inspecionar e exportar o modelo do record 1 do save RMS original.

O navegador salva o progresso do mapa e os recursos obtidos ao concluir uma fase. **Continue** retorna ao mapa; a partida dentro de uma fase não é retomada automaticamente. O replay experimental exportável continua separado do progresso do mapa e do save canônico RMS. Replays de versões anteriores do motor são rejeitados para evitar restauração divergente.

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

Concluídos nesta etapa: auditoria e hashes das fontes, decodificação dos packs/sprites/mapas/strings/MIDI, renderização de recursos, menu e mapa interativos com os sprites originais, progresso local de campanha, relógio fixo, câmera, controles, simulação inicial, replays versionados e codec estrutural do save original.

A simulação contém somente um subconjunto: movimento, paredes, vegetação, coleta, gravidade/empurrão de pedras, patrulha básica de cobras, alcance e dano do fogo de Angkor, baús com prêmios distintos, checkpoints e retorno após morte. A morte leva a câmera de volta ao último checkpoint antes de reaparecer o herói; R e o botão mobile de retorno também usam essa lógica. A cobra esmagada por uma pedra solta a fumaça do recurso original. O cadeado é desenhado como frame composto completo, e tijolos imóveis não repetem sua animação de quebra. A pedra apoiada sobre o personagem ativa a animação de esforço e o esmaga se ele permanecer sob ela. O desenho do personagem ao andar para a esquerda usa os deslocamentos dos frames originais; a pedra em rolagem usa o mesmo sentido visual do deslocamento físico. A entrada usa o portão do recurso original em vez do sprite incorreto que parecia uma poção. A abertura de Angkor percorre agora os seis roteiros do tutorial presentes em `demo.f`: falas iniciais, baú e bússola, lições das pedras e do círculo, selo e saída para o mapa. Os comandos originais fornecem os textos, retratos, movimentos de câmera, passos e flashes; os trechos de exploração entre gatilhos são guiados automaticamente porque o tutorial jogável completo ainda depende de mecânicas não portadas. A entrada nas fases mostra mundo e nome. A conclusão revela automaticamente diamantes, diamantes vermelhos, dano e tentativas; um toque antecipa o fim da animação e outro avança. O mapa segue as ligações extraídas, mas as regras de desbloqueio ainda são simplificadas. Portas e mecanismos restantes, água, armas, chefes, os demais roteiros de cena e integração com o save RMS ainda precisam ser portados. Algumas representações de objetos são provisórias. Uma fase carregar não significa que pode ser concluída corretamente.

Um JAR original fornecido para a pesquisa teve seus 40 recursos comparados byte a byte com a referência S700: todos coincidem. O binário fica apenas na área local de pesquisa, fora deste repositório. A identidade do bytecode com a decompilação e o modelo de aparelho não são comprovados apenas por essa comparação. Veja [`docs/ORIGINAL_JAR.md`](docs/ORIGINAL_JAR.md), `docs/STATUS.md` e `docs/VERIFICATION.md`.

## Créditos e fontes

- **Diamond Rush e recursos originais:** Gameloft. Os mapas, sprites, textos e músicas vêm da versão Sony Ericsson S700 1.2.0 *non-padlock* preservada no projeto [Diamond-Rush-Decomp, de palaceswitcher](https://github.com/palaceswitcher/Diamond-Rush-Decomp). A extração e os testes deste port usam o [commit fixado `5e05c42`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7), especialmente [`cGame.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/cGame.java), [`DemoInterpreter.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/DemoInterpreter.java) e os [dados em `res/`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7/res).
- **Fontes de comparação da pesquisa:** [DiamondRushSource](https://github.com/kubikaugustyn/DiamondRushSource) e [diamondRush](https://github.com/kubikaugustyn/diamondRush), de kubikaugustyn. A matriz de versões e os hashes ficam em [`docs/VERSION_MATRIX.md`](docs/VERSION_MATRIX.md). Esses projetos não são a base de código deste port.
- **Port web:** implementação independente em TypeScript/Canvas deste repositório. A pasta gerada `public/assets` fica fora do Git e é produzida na build. Este projeto não atribui uma nova licença ao código e aos recursos de referência e não é afiliado à Gameloft nem aos autores das decompilações.
