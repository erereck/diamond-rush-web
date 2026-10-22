# Opções do port

A página mostra só o jogo. O botão ⚙ no canto (tecla **O**) abre as configurações; ele some durante a partida e volta ao mover o ponteiro ou tocar a tela. Enquanto o painel está aberto, o jogo fica suspenso. Tudo é guardado no navegador (`diamond-rush:settings:v1`), e os padrões reproduzem o jogo original.

As opções que **alteram o jogo** (velocidade, retroceder, estados salvos e trapaças) são extras do port, no espírito de ports como o Ship of Harkinian. Os percursos verificados e os testes de fidelidade não usam nenhuma delas.

## Jogo

| Opção | O que faz |
|---|---|
| Idioma | Inglês original ou traduções do port (PT-BR, ES) dos textos de `lang.f` e `demo.f` |
| Velocidade do jogo | 0,5× a 2× sobre os 20 quadros por segundo do aparelho |
| Avanço rápido | Segurar **Tab** (ou o botão de toque **»**) acelera 3× |
| Retroceder | Segurar **Backspace** (ou o botão de toque **«**) volta no tempo, cinco vezes mais rápido que o jogo: um retrato a cada meio segundo, até 30 s atrás. A sessão é cortada no ponto de retorno, então o replay continua exato |
| Estado salvo | **F5** salva e **F7** carrega, por fase. Na mesma visita, o retorno é exato (inclui trapaças); depois de recarregar a página, o estado é reconstruído pelo replay da sessão |
| Trapaças | Vidas infinitas (as vidas não caem abaixo das do início da fase), vida infinita (a energia volta ao máximo) e todos os equipamentos (martelo de gelo e mergulho). O resultado entra no save da campanha |

## Vídeo

| Opção | O que faz |
|---|---|
| Tela cheia | Botão, ou tecla **F** |
| Escala | **Pixels inteiros** (cada pixel do jogo ocupa o mesmo número de pixels da tela), **Ajustar** (o maior tamanho que cabe) ou **Esticar** (preenche a janela, deformando) |
| Filtro | **Nítido**, **Suave** (interpolado) ou **CRT** (linhas de varredura e vinheta) |
| Ao redor da tela original | O que aparece quando a janela é mais larga ou mais alta que 3:4: **Preto**; **Fundo infinito** (o fundo do mundo continua em todas as direções, acompanhando a câmera); **Cenário** (a fase continua além da câmera original, com paredes, portas, placas e decoração); **Cenário e objetos** (também diamantes, pedras, baús, chaves e criaturas) |
| Interface do jogo | **Acompanha a janela** (padrão): as barras do HUD original vão de ponta a ponta, com vidas e bússola presas à esquerda, chaves, caldeirões e diamantes à direita e a energia no meio. **Original**: o HUD fica dentro dos 240 × 320 |
| Mostrar FPS e tick | Quadros por segundo, velocidade, tick e estado do jogo |

A área ao redor segue o mapa vivo da fase e a câmera original (`cGame.field_201/202`). O cenário de fundo (paredes e fundo do mundo) é desenhado pelo port com os sprites originais. Em **Cenário e objetos**, tudo o que se mexe é desenhado pelo próprio código do jogo: a rotina que pinta pedras, diamantes, criaturas, portas e interruptores (`method_151`), a decoração da frente e as explosões de `method_153`. Ela roda sobre o estado do quadro, logo antes da pintura dele, em blocos que cobrem a janela inteira, e o jogo é restaurado em seguida (essa pintura mexe em estados que a lógica lê). Assim, as cobras e as outras criaturas fora da tela andam e se animam como dentro dela, e o que cruza a borda da tela original continua sem emenda. Com a interface original, as faixas do HUD continuam escurecidas pela largura da janela.

Os efeitos de tela inteira do original também passam a cobrir a janela toda: o tremor (o jogo sobe a câmera em até 11 pixels enquanto desenha a fase, e o cenário ao redor treme junto), as faixas pretas das cenas, as barras que fecham a tela quando o herói morre e o escurecimento total.

Na interface que acompanha a janela, o jogo original continua desenhando cada peça do HUD com os sprites originais; o port só desloca cada grupo para a borda e completa as barras com o próprio módulo metálico delas (`ui.f`, sprite 2, módulo 20). O conteúdo das barras desvia dos controles de toque visíveis e do botão ⚙, e respeita as áreas seguras da tela (como o entalhe de celulares).

## Áudio

| Opção | O que faz |
|---|---|
| Som | Liga e desliga; é a mesma opção do menu Options do jogo |
| Sintetizador | **Amostras GM** (instrumentos do GeneralUser GS, como o sintetizador de tabela de ondas do aparelho) ou **Simples** (osciladores, sem download) |
| Volumes | Geral, músicas (faixas 15 a 20) e efeitos |
| Vibração do jogo | A vibração que o jogo pede; é a mesma opção do menu Options |

O jogo continua tocando um som por vez, pelas prioridades do original (veja [AUDIO.md](AUDIO.md)).

## Controles

O teclado usa setas ou WASD para mover, Espaço/Enter para agir, Esc para pausar e voltar, e R para voltar ao checkpoint. Com o painel aberto, Esc o fecha. Os controles de toque aparecem sozinhos em telas de toque (ou sempre, ou nunca) e ficam sobre a imagem; com avanço rápido e retroceder ligados, o grupo de comandos ganha os botões **»** e **«**. Em **Posição na tela → Ajustar**, cada grupo pode ser arrastado; há predefinições para destro, canhoto e compacto, além de tamanho, opacidade, zona morta do analógico e vibração ao tocar.

## Lab

As ferramentas de preservação continuam no painel: inspetor de mapas e sprites, faixas MIDI, jogar uma fase isolada, avançar um tick, exportar e importar replays e sessões, e o save original (RMS).
