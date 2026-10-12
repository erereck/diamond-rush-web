# Áudio do Diamond Rush (S700) no navegador

Este documento descreve como o jogo original toca sons, o que o port reproduz, o SoundFont usado
e como reconstruí-lo.

## Os 21 sons

O pacote `snd.f` contém 21 arquivos Standard MIDI (formato 0), extraídos por
`npm run extract-assets` para `public/assets/snd-0.mid` … `snd-20.mid`. São arranjos General MIDI
completos: vários programas por arquivo (cordas 48, metais 56–60, flauta 73, cítara 104, koto 107,
shamisen 106, taiko 116, tímpano 47…), bateria GM no canal 9, canais 10–12 usados de forma
melódica, volume (CC7), pan (CC10) e pitch bend (snd-16 e snd-18). Não há sysex nem bank select.

| id | prioridade | "longo" | duração (s) | notas | programas GM |
|---:|---:|:---:|---:|---:|---|
| 0 interruptor | 10 | não | 1.75 | 15 | 12, 23 + bateria |
| 1 enigma | 30 | sim | 2.89 | 46 | 9, 34, 46, 89 |
| 2 morte | 30 | sim | 1.80 | 95 | 9, 48, 73, 81, 116 + bateria |
| 3 baú 1 | 20 | sim | 2.18 | 13 | 0, 9, 48 + bateria |
| 4 baú 2 | 30 | sim | 1.66 | 70 | 9, 48, 56, 119 + bateria |
| 5 herói ferido | 10 | não | 0.28 | 14 | 17, 118, 119 + bateria |
| 6 martelo (inquebrável) | 10 | não | 0.42 | 10 | 11, 116 + bateria |
| 7 mina | 20 | não | 0.50 | 18 | 116 + bateria |
| 8 trabalhando | 20 | não | 1.76 | 43 | 8, 91, 102, 116, 117, 119 + bateria |
| 9 checkpoint | 20 | sim | 0.81 | 53 | 9, 46, 52 + bateria |
| 10 inimigo ferido | 10 | não | 0.22 | 17 | 68 + bateria |
| 11 quebra | 20 | não | 0.58 | 38 | 11, 87, 116 + bateria |
| 12 gancho | 20 | não | 0.55 | 5 | 119, 120 + bateria |
| 13 água | 20 | não | 0.75 | 37 | 122 + bateria |
| 14 rocha | 10 | não | 0.23 | 23 | 116, 117 + bateria |
| 15 fase concluída | 30 | sim | 4.85 | 166 | 9, 32, 44, 47, 48, 56, 57, 72 + bateria |
| 16 abertura dos mundos | 30 | sim | 6.50 | 153 | 46, 48, 104, 116, 117 + bateria |
| 17 Baviera | 30 | sim | 8.35 | 279 | 47, 48, 56, 57, 58, 60, 73, 116 + bateria |
| 18 Tibete | 30 | sim | 7.54 | 294 | 14, 33, 47, 48, 53, 77, 106, 107, 116 + bateria |
| 19 título | 30 | sim | 23.72 | 865 | 0, 12, 45, 46, 47, 48, 60, 73 + bateria |
| 20 game over | 30 | sim | 8.61 | 233 | 9, 46, 47, 48, 71, 73, 81, 116 + bateria |

Os sons 15–20 são música/vinhetas (volume "música" no port); 0–14 são efeitos.

## Como o motor original funciona (`cSoundEngine.java`)

- **Um único player.** Cada som tem um `Player` MMAPI, mas só um fica "prefetched" e tocando por
  vez (`previousSoundId`). Uma thread de baixa prioridade executa os pedidos.
- **`playSound(id)`** é ignorado se o som atual tiver prioridade maior, ou a mesma prioridade e
  tiver começado há 50 ms ou menos:
  `if (crtSoundPriority >= p && (crtSoundPriority != p || |agora - início| <= 50)) return;`
  Caso contrário o som atual é liberado e o novo começa.
- **Prioridades:** 10 para 0, 5, 6, 10, 14; 20 para 3, 7, 8, 9, 11, 12, 13; 30 para 1, 2, 4 e
  15–20.
- **Liberação (`freeCrtPlayerResource`)**, chamada pelo jogo entre cenas, ao fim da mídia
  (`playerUpdate("endOfMedia")`) e antes de trocar de som: zera `crtSoundId` e a prioridade. Só os
  sons "longos" (`isLongDurationSFX`: 1, 2, 3, 4, 9 e 15–20) recebem `deallocate()`, que para o
  player. Efeitos curtos são apenas esquecidos e terminam sozinhos — até que um som *diferente*
  comece, porque aí o player anterior é desalocado.
- **`Player.start()` é ignorado enquanto o player está tocando**: um efeito curto pedido de novo
  continua de onde estava (só a janela de 50 ms recomeça); depois do fim da mídia ele recomeça do
  início.
- **Nada repete:** `setLoopCount` nunca é chamado; música toca uma vez e o fim da mídia libera o
  player.
- **Volume fixo** em 100 (`VolumeControl.setLevel(100)`).

## O que o port reproduz

`src/platform/audio/SoundArbiter.ts` é uma tradução direta da máquina de estados acima
(`crtSoundId`, `crtSoundPriority`, `soundLoopStartTime`, `previousSoundId`), sem DOM, com relógio e
player injetáveis; `tests/audio.test.ts` cobre prioridades, a janela de 50 ms, o fim da mídia, o
`cut` e o "continua tocando" dos efeitos curtos.

`src/platform/GameSound.ts` é a fachada usada pela interface:

```ts
const gameSound=new GameSound(import.meta.env.BASE_URL);
gameSound.unlock();            // num gesto do usuário: cria/retoma o AudioContext e começa a carregar o SoundFont
gameSound.play(id);            // pedido do jogo (cSoundEngine.playSound): regras acima
gameSound.cut();               // freeCrtPlayerResource(): esquece o som atual (para músicas e sons longos)
gameSound.stop();              // interface do port: para tudo (troca de cena, pausa, aba oculta)
gameSound.setEnabled(on);
gameSound.setVolumes({master,music,effects}); // 0..1; música = 15–20
gameSound.setEngine('samples'|'synth');       // troca de motor (interrompe o som atual)
await gameSound.preview(id);   // laboratório: toca direto, sem prioridades; devolve {notes,duration,tracks}
gameSound.engine; gameSound.status;           // status: 'idle' | 'loading' | 'ready' | 'fallback'
gameSound.onstatuschange=status=>...;         // opcional
```

Detalhes:

- Antes de `unlock()` (sem `AudioContext`) e com o som desligado, `play()` não faz nada e não muda
  o estado — como `soundEnabled == false` no original.
- O fim da mídia é medido pela duração do arquivo MIDI (até o fim da trilha), igual para os dois
  motores; ao terminar, o árbitro libera o player como `playerUpdate("endOfMedia")`.
- Um corte (troca de som, `cut`, `stop`) faz um fade de ~10–30 ms e mata as vozes, para que caudas
  de release não se sobreponham ao próximo som (o aparelho também desalocava o player).
- Enquanto o SoundFont carrega (`status === 'loading'`), um som aceito espera o carregamento.
  Música e `preview` começam assim que o banco fica pronto; um efeito que esperou mais de 250 ms é
  descartado (tocaria fora de sincronia) e o árbitro o libera.
- Volumes por categoria e o volume geral são extensões do port (o original usa volume fixo 100).
  Há um limitador suave no fim da cadeia.
- `setEngine` com o mesmo valor não faz nada; trocar de motor interrompe o som atual. Voltar para
  `'samples'` depois de uma falha tenta baixar o SoundFont de novo.

## Motores

### `'samples'` (padrão): SoundFont via spessasynth

`src/platform/audio/SampleEngine.ts` usa `spessasynth_lib` (AudioWorklet) e o banco
`public/soundfont/diamond-rush-gm.sf3`. O `Sequencer` do spessasynth toca o arquivo MIDI original
(programas, CC7/CC10/CC11, RPN, pitch bend, bateria no canal 9), uma vez (`loopCount = 0`) e sem
pular o silêncio inicial. Ao carregar, todos os 21 arquivos são pré-carregados para decodificar
as amostras Vorbis enquanto nada toca. Reverb e chorus ficam moderados e o limite de vozes é 96.

O módulo é carregado por `import()` dinâmico: o chunk `SampleEngine-*.js` (~210 KB, ~84 KB gzip)
e o processador do worklet (~400 KB) só são baixados quando o motor `'samples'` é usado. O
processador é importado com `?url`, então o Vite o serve em `npm run dev` e o emite com hash e com
o caminho base em `npm run build` (por exemplo `/diamond-rush-web/assets/spessasynth_processor.min-*.js`
no GitHub Pages). O SoundFont é buscado em `${BASE_URL}soundfont/diamond-rush-gm.sf3`.

**Fallback automático:** se o AudioWorklet não existir (contexto inseguro, por exemplo `http://`
fora de `localhost`), se o download falhar ou se o banco não carregar, `status` vira `'fallback'`
e o sintetizador embutido é usado.

### `'synth'`: sintetizador embutido

`src/platform/audio/OscillatorEngine.ts` + `gmPatches.ts`, só Web Audio:

- timbres por família GM (piano, percussão cromática, órgão/acordeão, guitarra, baixo, cordas,
  ensemble/coro, metais, palhetas, flautas, leads, pads, efeitos, étnicos, percussivos, efeitos
  sonoros) com formas de onda, envelopes ADSR, filtros com envelope, vibrato/tremolo e ruído de
  sopro/arco; ajustes específicos para os programas usados pelo jogo (glockenspiel, marimba,
  tubular bells, tímpano, cítara, koto, shamisen, shakuhachi, taiko, reverse cymbal, seashore…);
- bateria GM no canal 9 sintetizada por tecla: bumbo 35/36, caixas 38/40, toms 41–50, chimbais
  42/44/46, pratos 49/51/52/55/57, e as teclas latinas/diversas presentes nos arquivos (bongôs,
  congas, cabasa, maracas, guiro, wood block, triângulo, shaker, jingle bell, surdo…);
- volume (CC7) e expressão (CC11) com a curva GM, pan (CC10), pitch bend com faixa via RPN 0
  (padrão 2 semitons);
- agendamento com antecedência de 1,2 s (não cria milhares de nós de uma vez).

Não é uma emulação do sintetizador do aparelho; serve como alternativa leve e como fallback.

## MIDI

`parseMidi` (`src/platform/Midi.ts`) devolve as notas (com o programa vigente no instante da
nota: eventos no mesmo tick valem na ordem do arquivo — em snd-3, as duas primeiras notas do canal
0 saem antes da troca de programa e usam o programa 0) e `controls`: trocas de programa, volume,
pan, expressão e pitch bend em semitons, já no tempo em segundos do mapa de andamento.
O antigo `MidiPreview` foi removido: o laboratório usa `GameSound.preview`.

## SoundFont

**Escolha:** [GeneralUser GS](https://www.schristiancollins.com/generaluser) v2.0.3, de
S. Christian Collins — banco GM/GS completo, pequeno e bem programado, compatível com o
spessasynth. Fonte fixada no commit
[`684543d5e5efaef08d02be50dcda8d552478fa60`](https://github.com/mrbumpy409/GeneralUser-GS/tree/684543d5e5efaef08d02be50dcda8d552478fa60)
do repositório oficial (SHA-256 do `GeneralUser-GS.sf2`:
`9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe`).

**Licença:** a licença v2.0 do GeneralUser GS permite usar o banco sem restrição, inclusive
comercialmente, usá-lo em projetos de software ("feel free to use it in your software projects") e
modificar o banco ou o empacotamento.
Pede apenas que não se faça link direto para os downloads do site do autor — o port distribui a
própria cópia recortada. O texto completo está em `public/soundfont/LICENSE-GeneralUser-GS.txt`
(copiado do mesmo commit) e também no campo de comentário do próprio `.sf3`. Créditos: GeneralUser
GS © 1997–2025 S. Christian Collins.

**Recorte:** `tools/build-soundfont.ts` mantém apenas os presets, teclas e velocidades usados pelos
21 arquivos (resolvidos como o sintetizador resolve; o kit 102 de snd-6 cai no kit padrão 0):
42 de 287 presets e 192 de 920 amostras (10,2 MB de PCM). As amostras são comprimidas em Ogg
Vorbis (qualidade 5) com um codificador WebAssembly (`wasm-media-encoders`, sem ferramentas
nativas), gerando um SF3 de **2,24 MB** (2 243 996 bytes). Os números de série Vorbis são fixos, então
o resultado é reproduzível byte a byte.

## Como reconstruir

```sh
npm run extract-assets     # gera public/assets/snd-*.mid
npm run build-soundfont    # baixa (uma vez), recorta, comprime e grava public/soundfont/
npm test                   # tests/audio.test.ts confere programas, teclas e velocidades
```

O download (32 MB) fica em cache fora do repositório, em `../../work/soundfont-cache/` (ou na pasta
de `SOUNDFONT_CACHE`), e é conferido por SHA-256. O `.sf3` e a licença ficam versionados em
`public/soundfont/`, então a CI não baixa nada. Para trocar de versão do GeneralUser GS, atualize o
commit e os SHA-256 em `tools/build-soundfont.ts`.
