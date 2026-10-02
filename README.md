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

O jogo abre no menu S700. Escolha **New Game** para assistir à abertura de Angkor e entrar no selo, ou **Continue** para voltar ao selo e escolher um mundo. No mapa, use setas ou WASD para seguir as ligações entre fases e Enter/Espaço para entrar; Escape retorna ao selo. No celular, o direcional e o botão de ação também navegam no menu e no mapa. Durante a fase, Escape pausa, R inicia o retorno ao checkpoint (consumindo uma vida quando o personagem está longe dele), e Espaço/Enter ou **AGIR** usa o equipamento obtido; sobre o checkpoint, a ação o restaura. A opção **Sobre** reproduz os créditos originais de `cr.f` em rolagem. O jogo tem tela lógica de 240 × 320 e roda a simulação a 20 Hz; a interface usa escala inteira de pixels.

No selo, Angkor está disponível desde o começo, Bavaria exige 10 diamantes vermelhos e Tibet exige 25; essas gemas não são gastas. A quarta posição abre a loja, que vende as quatro melhorias originais de energia por 150, 400, 1000 e 3000 diamantes normais. Compra, energia máxima e recarga no checkpoint são gravadas no save RMS. A opção de som aciona as faixas MIDI originais em eventos de menu e gameplay; o sintetizador do navegador ainda não reproduz os timbres J2ME. O seletor **Idioma do jogo** troca textos de interface e diálogos entre inglês original, português brasileiro e espanhol. Os dois últimos são traduções feitas para este port: o pacote S700 contém só o inglês.

No **Laboratório de preservação** é possível:

- Inspecionar os 41 mapas e abrir qualquer um na simulação parcial, escolhendo o equipamento inicial para testar martelo, gancho ou martelo de gelo sem alterar a campanha.
- Ver os frames e paletas dos 98 recursos de sprites, incluindo os três da abertura.
- Ouvir as 21 faixas MIDI com timbres de prévia.
- Pausar, avançar um tick e exportar/importar replays de desenvolvimento.
- Renderizar todos os recursos para detectar erros de acesso.
- Inspecionar, importar e exportar o record 1 do save RMS original; a campanha sincroniza recursos, progresso e baús com esse formato.

O navegador salva o progresso do mapa e os recursos obtidos ao concluir uma fase. **Continue** abre o selo para escolher mundo e mapa; a partida dentro de uma fase não é retomada automaticamente. Durante a fase, Escape ou o botão de pausa abre o menu original, com opções de retomar, reiniciar, ajuda, mapa e saída. As saídas secretas revelam seus próprios ramos; concluir uma fase pela saída comum não os abre. O replay experimental exportável continua separado do progresso do mapa e do save canônico RMS. Replays de versões anteriores do motor são rejeitados para evitar restauração divergente.

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

Para medir estados da abertura no Java S700, `tools/trace-s700.ts` copia a decompilação fixada para um diretório temporário, injeta um hook de log, recompila com JDK 21 e a executa no FreeJ2ME. Exemplo com caminhos locais:

```powershell
node tools/trace-s700.ts ../../work/reference-s700 ../../work/reference-runtime/jdk/jdk-21.0.12.1+1/bin ../../work/reference-runtime/freej2me/freej2me.jar ../../work/reference-runtime/reproduced
```

O resultado é `trace-s700.csv` com 300 ticks. Os 21 primeiros estados da entrada de Angkor estão em `tests/fixtures/intro-opening-s700.csv` e são comparados automaticamente com o port. O trace executa a decompilação recompilada, não o JAR original; ainda não demonstra equivalência do bytecode nem fidelidade das cenas completas. O runtime local usado foi [Eclipse Temurin 21](https://adoptium.net/temurin/releases?version=21) e [FreeJ2ME-Plus](https://github.com/TASEmulators/freej2me-plus), ambos externos ao repositório.

Para medir o primeiro diálogo, acrescente `--auto-dialogue --ticks=250` e use outro diretório de saída. Esse modo simula uma pressão para caminhar do círculo até o gatilho e avança as falas a cada 20 ticks; o resultado adicional `demo-s700.csv` registra comandos e câmera. Os marcos conferidos ficam em `tests/fixtures/intro-first-trigger-s700.csv` e `tests/fixtures/intro-demo-timeline-s700.csv`. O Java espera o controle do jogador após a caminhada automática, antes de iniciar a primeira fala.

Com `--walk-chest --ticks=298`, o mesmo capturador avança pelas células transitáveis até o primeiro aviso do baú. A amostra em `tests/fixtures/intro-chest-route-s700.csv` compara posições, deslocamento, dois diamantes coletados, início do roteiro e o passo comandado pelo Java. Esse modo usa uma rota fixa de pesquisa; não representa uma solução automática do tutorial completo.

Com `--open-chest --ticks=460`, a rota continua até o baú da bússola e seu aviso. O arquivo adicional `chest-s700.csv` registra animação, índice/tempo do frame, item e estado do baú. A amostra `tests/fixtures/intro-compass-chest-s700.csv` compara 81 estados consecutivos da abertura e apresentação do item, a partir de uma condição inicial isolada no baú. Ela não certifica o percurso inteiro nem a câmera das cenas seguintes. As pressões durante a apresentação são ignoradas, como no Java; o aviso curto usa páginas fixas, sem a animação lateral da caixa de diálogo longa.

Com `--rock-lesson --ticks=665`, a rota segue até a demonstração de empurrar a pedra. `map-s700.csv` registra células relevantes, incluindo grama, pedra e marcadores dos avisos. A amostra `tests/fixtures/intro-rock-lesson-s700.csv` compara os 188 ticks de execução do roteiro 13 (476–663): posição, deslocamento, comandos, câmera, páginas das falas com a fonte S700, queda da pedra e efeito de destruição da grama. O teste começa na condição medida do gatilho; a continuidade entre o baú e esse ponto ainda não é certificada.

Com `--checkpoint-lesson --ticks=1010`, a captura Java continua após a pedra, retorna ao círculo, percorre a lição 16 e executa um segundo retorno manual com o aviso 17. As amostras `intro-checkpoint-lesson-s700.csv` e `intro-checkpoint-return-s700.csv` comparam 125 estados da lição (769–893) e 87 estados do retorno (894–980). `scene-s700.csv` acrescenta saúde, checkpoint, viagem da câmera, coordenadas do retrato e flashes. Os testes web partem das condições iniciais medidas de cada trecho; ainda não certificam o percurso contínuo entre eles.

Com `--seal-scene --ticks=500`, a captura isola o gatilho do roteiro 28 em (57,8) e termina quando o Java sai da introdução para o mapa, após 423 ticks. A amostra `intro-seal-scene-s700.csv` compara 401 estados (22–422): passos, edição de grama, câmera, páginas de texto, crescimento/movimento do retrato e flashes. Os JSONs correspondentes registram a referência, condição inicial e células comparadas. Esse modo não pode ser combinado com as rotas de caminhada.

O retorno ao círculo lembra as lições 13/16 mesmo depois que o personagem sai do gatilho, como `method_284/347`. Ao restaurar, os marcadores são removidos também do checkpoint salvo, e os roteiros 15/17 começam durante o deslocamento da câmera. O retorno manual mantém a saúde e consome uma vida após os 42 ticks da animação 19; dano fatal conserva seu tempo próprio. Testes cobrem ação no círculo, reinício fora dele, morte durante/depois da demonstração e retornos repetidos. A grama destruída usa os 8/6/7 frames originais dos três mundos como objeto de primeiro plano, com avanço pela paridade do relógio; ela não sustenta pedras, mas impede a passagem dos inimigos.

A mesma amostra da pedra também compara animação, índice e tempo do frame do herói nos 188 ticks. A escolha das poses considera apoio sob o personagem, conforme `method_211/260`: caminhada horizontal 24/25 e repouso 34/35 quando suspenso, esforço 8/9 durante o empurrão completo e 26/27 sem apoio. A nova animação avança já no tick em que começa. Isso não certifica as demais transições de equipamento, água ou dano.

Os baús de equipamento, bússola, poção e cristais passam à animação original 47 e usam os brilhos de `cm.f/7`. A cura de baú com vida cheia vira dez diamantes, e uma vida extra no limite de 99 segue a conversão original. Uma vida extra já obtida em baú permanece consumida após retornar ao checkpoint. O intérprete respeita as pausas finais dos comandos e a posição vertical das falas, inclusive as falas junto ao selo.

## Estado real

Concluídos nesta etapa: auditoria e hashes das fontes, decodificação dos packs/sprites/mapas/strings/MIDI, renderização de recursos, menu, mapa, selo e loja interativos com os sprites originais, progresso local de campanha, relógio fixo, câmera, controles, simulação inicial, replays versionados e codec estrutural do save original.

A simulação contém somente um subconjunto: movimento, paredes, vegetação, coleta, gravidade/empurrão de pedras, patrulha básica de cobras comuns e vermelhas, alcance e dano do fogo de Angkor, baús com prêmios distintos, checkpoints e retorno após morte. A morte leva a câmera de volta ao último checkpoint antes de reaparecer o herói; R e o botão mobile de retorno também usam essa lógica. Cobras esmagadas por uma pedra soltam a fumaça do recurso original. O cadeado é desenhado como frame composto completo; tijolos destrutíveis ficam estáticos até um impacto e propagam a quebra aos vizinhos. A pedra apoiada sobre o personagem ativa a animação de esforço e o esmaga se ele permanecer sob ela. O desenho do personagem ao andar para a esquerda usa os deslocamentos dos frames originais; a pedra em rolagem usa o mesmo sentido visual do deslocamento físico. A entrada usa o portão do recurso original em vez do sprite incorreto que parecia uma poção. A abertura de Angkor percorre os seis roteiros do tutorial presentes em `demo.f`: falas iniciais, baú e bússola, lições das pedras e do círculo, selo e saída para o mapa. Entre as cenas, o jogador controla o personagem livremente até os gatilhos do mapa. A física segue ativa durante os passos roteirizados, inclusive destruindo vegetação e movendo pedras; os dois trechos de caminho bloqueado ensinam a usar R ou o botão de retorno ao círculo. A introdução pode ser pausada pelo Escape ou pelo controle mobile, e o retorno ao círculo também funciona pelo botão ao lado do jogo. Os comandos originais fornecem textos, retratos, movimentos de câmera, passos e flashes. Ainda faltam mecânicas e detalhes de tempo para paridade total com a execução J2ME. A entrada nas fases mostra mundo e nome. A conclusão revela automaticamente diamantes, diamantes vermelhos, dano e tentativas; um toque antecipa o fim da animação e outro avança. O mapa segue as ligações extraídas; o selo aplica os limiares S700 de 10 e 25 diamantes vermelhos.

A revisão dos roteiros `demo.f` confirmou a ordem dos 15 trechos de fala da introdução. O retrato agora cresce a partir do personagem, os avisos mostram o título original “Hint:” e a câmera acompanha os passos comandados pelo roteiro. A transição final deixa de acrescentar um flash que não consta do Java. Nos mapas, os nós secretos continuam ocultos até a saída correspondente ser usada; as ligações de cada mundo foram verificadas contra `map_*.out`.

Os outros gatilhos presentes nas fases agora executam os roteiros originais de `demo.f`: porta trancada, apresentações das câmaras finais de Angkor/Bavaria/Tibet, quatro eventos de câmera e os avisos de martelo, gancho, poção e martelo de gelo ao abrir seus baús. Os dois roteiros de retorno ao círculo após as lições de caminho bloqueado também são chamados. Os textos, retratos, passos, panorâmicas, flashes e edições de mapa passam pelo mesmo intérprete da introdução; as edições são registradas no replay. Seis roteiros restantes do pacote não têm gatilho nos mapas nem chamada ativa encontrada no Java S700 desta versão, incluindo o aviso do cadeado mágico. Isso não comprova paridade quadro a quadro com o aparelho original.

Na conclusão, cada uma das quatro recompensas de vida fica registrada separadamente: refazer a fase permite ganhar uma categoria ainda pendente, até o limite de 99 vidas. Uma cura encontrada no chão com a vida cheia vira dez diamantes, como no código S700. O checkpoint restaura também as alterações de objetos e parâmetros feitas pelas cenas. Saves locais antigos são migrados sem duplicar recompensas já concedidas.

Os baús originais de Angkor 4, Bavaria 3 e Tibet 6 concedem martelo, gancho e martelo de gelo, respectivamente. O equipamento acompanha a campanha e os replays; o martelo quebra tijolos e atordoa cobras; destruir vegetação com golpe exige o martelo de gelo, o gancho puxa alguns objetos até perto do herói, e o martelo de gelo congela diamantes e cobras. Alvos próximos são escolhidos automaticamente quando o herói não está voltado para eles. A perseguição curta da cobra vermelha após o atordoamento também funciona.

O primeiro chefe de Angkor agora entra em cena na fase 9, ocupa as três colunas do mapa original e perde três segmentos de vida com pedras empurradas para sua área vulnerável. A sequência inclui deslocamento vertical, ataque de fogo, reposição das pedras superiores, animação de derrota e retorno ao estado inicial após o checkpoint. O baú do Cristal de Fogo exibe o item correto, executa o roteiro `demo.f` 32 e encerra a fase. A implementação foi traçada em `cGame.method_186/274–280/322/347`; veja [BOSSES.md](docs/BOSSES.md) para o alcance exato.

O chefe de Bavaria também aparece na câmara final. Ele desperta quando o herói cruza sua posição, patrulha, investe e salta usando as animações de `b1.f`. Pedras em queda tiram seus quatro pontos de vida e se quebram no impacto; a luta repõe pedras nos pontos superiores da arena. A derrota e o retorno ao checkpoint seguem estados extraídos de `cGame.method_129/269/280/347`.

O guardião de Tibet usa `mm1.f` e cinco segmentos de vida. O martelo de gelo congela os inimigos da arena em blocos empurráveis; os blocos em queda ferem o chefe. Os interruptores alternam as barreiras de gelo e criam novos alvos, enquanto o ataque forte desperta as pedras suspensas do teto, que não reaparecem após cair. Movimento, alcance das investidas, reação aos blocos, derrota e reinício seguem `cGame.method_281/282`. A entrada da arena segue a inicialização original: tile 34 abre como passagem e tile 35 permanece fechado. Um percurso completo por controles congela e puxa inimigos reais, causa os cinco golpes, alterna a ponte cinco vezes, vence e coleta o cristal. Começa com o equipamento de gelo predefinido; obter a arma durante a campanha e comparar os tempos quadro a quadro ainda estão pendentes. O Java solicita o roteiro 31 para esse cristal, mas ele está ausente do pacote `demo.f` canônico; o port não inventa um diálogo final.

Esses sistemas ainda são um subconjunto: faltam alvos e interações especiais, tempos exatos de algumas animações, água e outros puzzles. A loja já compra as quatro melhorias de energia e salva o limite no byte 8 do RMS; falta comparar seus tempos e painéis com uma execução no aparelho. Algumas representações de objetos são provisórias. Uma fase carregar não significa que pode ser concluída corretamente.

Nas fases posteriores, os obstáculos rolantes de Bavaria já caem e percorrem o cenário no sentido codificado pelo mapa; armadilhas duplas atacam após a aproximação do herói. Seus espinhos avançam em dois ciclos independentes, com o sprite correto da referência S700. No Tibet, pedras suspensas são acionadas pela passagem sob elas, avisam antes de cair, atingem o herói ou outros objetos e desaparecem no impacto. Os inimigos 45 e 49 agora se movem; o 46 cai entre plataformas e dispara o projétil 21. O martelo de gelo congela e descongela os três tipos. Esses estados também são restaurados no checkpoint e reproduzidos nos replays. Interações especiais, água e outras armadilhas ainda precisam ser portadas.

Um JAR original fornecido para a pesquisa teve seus 40 recursos comparados byte a byte com a referência S700: todos coincidem. O binário fica apenas na área local de pesquisa, fora deste repositório. A identidade do bytecode com a decompilação e o modelo de aparelho não são comprovados apenas por essa comparação. Veja [`docs/ORIGINAL_JAR.md`](docs/ORIGINAL_JAR.md), [`docs/FIDELITY_REVIEW.md`](docs/FIDELITY_REVIEW.md), `docs/STATUS.md` e `docs/VERIFICATION.md`.

## Verificar quais fases podem ser concluídas

A lista por fase está em [`docs/PLAYABILITY.md`](docs/PLAYABILITY.md), com o inventário completo de 41 mapas: 40 fases jogáveis, incluindo dez secretas, e a introdução. Existem 47 conclusões a conferir quando contamos as saídas alternativas. Os estados distinguem percursos aprovados, tentativas pendentes e fases ainda não verificadas.

Nove percursos foram concluídos desde a entrada usando somente direção, ação e retorno ao checkpoint: introdução completa, saídas comuns de Angkor 1–5 e os três chefes com todos os golpes, derrota e cristal. Os arquivos em `tests/fixtures/routes` registram os controles e recursos iniciais; os chefes começam com equipamento predefinido (martelo/gancho/gelo). Angkor 3 abre as duas fechaduras; Angkor 4 resolve sua sala de combate e as placas com pedras, obtém o martelo e quebra tijolos para sair. Angkor 5 libera a chave dourada ao vencer a cobra vermelha com três golpes novos de martelo. As rotas comprovam a saída, sem exigir todos os coletáveis.

O percurso de campanha em `tests/fixtures/campaign-routes` encadeia New Game, introdução e Angkor 1–7. Cada fase recebe os recursos reais da anterior; conclusão, recompensas, baús, recarga JSON e importação/reexportação RMS usam as mesmas funções do jogo. A fase 4 começa sem equipamento, com saúde 3 e oito vidas; inclui uma morte com retorno ao checkpoint e obtém o martelo pelo baú original. Angkor 6 atravessa o poço das pedras, aciona o checkpoint, assiste à cena 3, abre o baú de diamante vermelho e libera Angkor 7. Angkor 7 vence sua sala de combate, empilha duas pedras para manter a placa acionada, pega a chave dourada e chega à saída comum, liberando Angkor 8 com 70 diamantes, um vermelho, nove vidas e saúde 2. O percurso continua com a recarga JSON; o RMS é conferido separadamente porque registra vida máxima, e sua importação repõe a saúde. O RMS aceita as 14 posições de Angkor, incluindo a introdução oculta. A saída secreta de Angkor 7 ainda precisa de verificação, assim como gancho/gelo na campanha, os chefes encadeados, a campanha inteira e as dez fases secretas.

As placas de pressão usam o sprite original e afundam conforme a aproximação do herói ou de uma pedra. Os portões abrem, fecham e esmagam segundo `method_316/256/258/340`; a pedra termina a descida sobre a placa a um pixel nos ticks ímpares. `tools/trace-pressure-s700.ts` extrai os métodos da referência fixada e executa 137 casos em Java, comparados em `tests/pressure.test.ts`. Som, invalidação visual, efeito de destruição e callback de dano são substituídos no harness; essa comparação de métodos não certifica o jogo inteiro. Veja [PRESSURE_PLATES.md](docs/PRESSURE_PLATES.md) para reproduzir.

As salas de desafio fecham as portas, apresentam o alvo com a câmera e exibem a pista original; eliminar os inimigos ou acender as tochas libera a saída e os prêmios. A revisão também cobre inimigos de parede, resistência da cobra vermelha, minas, escombros explosivos e interruptores de gelo fora da arena. São 667 snapshots adicionais comparados com métodos originais executados em Java, em harnesses isolados. Fontes, reprodução e limites estão em [RIDDLES.md](docs/RIDDLES.md) e [STAGE_MECHANISMS.md](docs/STAGE_MECHANISMS.md).

```powershell
npm run verify:routes
```

O verificador reexecuta os percursos, incluindo os diálogos originais pelos gatilhos normais, e falha se a conclusão, a derrota do chefe ou o resultado gravado mudarem. O arquivo aceita apenas controles; não aceita teleporte, edições de mapa, chaves injetadas ou baús inicialmente consumidos. `npm test` também verifica esses percursos e a reconstrução dos replays. Para regenerar a tabela e seu JSON: `npm run verify:routes -- --write-report`. As tentativas incompletas ficam separadas em `tests/fixtures/route-attempts` e não certificam bloqueios definitivos.

## Créditos e fontes

- **Diamond Rush e recursos originais:** Gameloft. Os mapas, sprites, textos e músicas vêm da versão Sony Ericsson S700 1.2.0 *non-padlock* preservada no projeto [Diamond-Rush-Decomp, de palaceswitcher](https://github.com/palaceswitcher/Diamond-Rush-Decomp). A extração e os testes deste port usam o [commit fixado `5e05c42`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7), especialmente [`cGame.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/cGame.java), [`DemoInterpreter.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/DemoInterpreter.java) e os [dados em `res/`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7/res).
- **Fontes de comparação da pesquisa:** [DiamondRushSource](https://github.com/kubikaugustyn/DiamondRushSource) e [diamondRush](https://github.com/kubikaugustyn/diamondRush), de kubikaugustyn. A matriz de versões e os hashes ficam em [`docs/VERSION_MATRIX.md`](docs/VERSION_MATRIX.md). Esses projetos não são a base de código deste port.
- **Port web:** implementação independente em TypeScript/Canvas deste repositório. A pasta gerada `public/assets` fica fora do Git e é produzida na build. Este projeto não atribui uma nova licença ao código e aos recursos de referência e não é afiliado à Gameloft nem aos autores das decompilações.
- **Traduções português/espanhol:** textos adaptados para este port, a partir dos 115 textos ingleses de `lang.f` e dos diálogos de `demo.f` da versão S700. O inglês continua disponível sem tradução.
