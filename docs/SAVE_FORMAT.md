# S700: save de campanha e sessão de desenvolvimento

## Record RMS original

Evidência: `cGame.method_109–128`, `method_426`, commit canônico indicado em FORENSIC_AUDIT.md. `CanonicalSave.ts` interpreta o **payload do record 1** do RecordStore `DiamondRush`. Não interpreta arquivos contêiner de emuladores nem o RecordStore separado `Preferences`.

O Java aloca 1000 bytes, mas grava apenas `field_382` bytes usados. A reconstrução com os mapas canônicos produz **994 bytes**. O record que o núcleo gerado escreve no New Game é idêntico, byte a byte, ao gravado pelo FreeJ2ME ao executar a decompilação (um artefato local de pesquisa, `rms/`, fora do Git); `CanonicalSave.create` difere dele só no byte 12, o contador de carregamentos de fase, que o tutorial incrementa ao carregar (teste em `tests/core.test.ts`).

| Offset | Conteúdo confirmado |
|---|---|
| 0 | Soma em byte dos diamantes vermelhos presentes nas fases |
| 1 | Mundos já anunciados no selo: bit 0 Bavaria, bit 1 Tibet (`sealFlags`) |
| 2 | Bits 0–2: cristais; bits 3–4 (valores 8/16): mundos liberados; bits 5–7: nível de armadura anunciado (`worldFlags`, `armorUnlockTier`) |
| 3 | Vidas: byte Java com sinal; inicial 5 |
| 4–5 | Diamantes coletados, little-endian |
| 6–7 | Diamantes vermelhos, little-endian |
| 8 | Vida máxima; inicial 4 |
| 9 | Nível do equipamento (0/1/2/8), com getter e setter no codec |
| 10 | Item de mergulho (1 quando obtido) |
| 11 | Valor de `field_366`, preservado |
| 12 | Carregamentos de fase da sessão, gravados até 3 (`method_104`); o contador volta a 1 a cada múltiplo de 8 e reinicia em New Game e Continue |
| 13 | Flag de `method_106` (1 ao terminar o tutorial) |
| 14–19 | Três ponteiros u16 LE para os blocos dos mundos |

Cada bloco de mundo contém: quantidade de fases (byte), maior fase liberada (byte), primeira fase secreta (byte), e um ponteiro u16 LE por fase. A primeira fase secreta é o valor de `field_515` quando `method_113` cria o bloco: o menor índice de nó de tipo 1 visto até aquele mundo (o campo não é reiniciado entre os mundos), ou 100 se não houver nenhum. Nos recursos canônicos o jogo grava 9 / 9 / 9; o mapa do port calcula os títulos "SECRET STAGE" pelos nós de cada mundo, como o original faz ao abrir o mapa.

Cada bloco de fase contém: diamantes vermelhos coletados na fase (byte; no codec, `status`), quantidade original de diamantes vermelhos (byte), **flags** (byte), baús abertos (byte), quantidade de baús (byte), e pares x/y por baú. O terceiro byte é combinado com OR em `method_117`; não é um contador de diamantes coletados. Os baús são os objetos 14 e 33, enumerados de cima para baixo e da esquerda para a direita. Abrir um baú substitui seu par por (0,0) e incrementa a contagem.

O codec preserva bytes desconhecidos e cauda, valida limites e sobreposições e retorna cópias de bytes. A criação de modelo segue o código canônico.

## Quem escreve o record

Desde o núcleo gerado ([NUCLEO_S700.md](NUCLEO_S700.md)), **o próprio jogo original escreve o record** durante a fase e na tela de resultados (`method_249`): diamantes e vermelhos somados, vidas e bônus de vida, flag de conclusão (2), flags de recompensa (4/8/16/32) e de liberação (64), baús abertos, equipamento obtido em baús e liberação das fases seguintes e secretas. O port entrega à fase o record da campanha (`Simulation` com `record`), lê o resultado com `Simulation.record()` (os `field_382` bytes usados) e o converte para o modelo do mapa com `campaignFromRecord`. Os avisos de mundo liberado (bits 3 e 4 do byte 2, valores 8 e 16; o de Tibet grava os dois) e de armadura que o original mostraria no mapa são aplicados por `takeMapNotice()`, porque o mapa exibido é o do port.

O progresso do mapa fica em `diamond-rush:campaign:v1` (`localStorage`), que guarda a cópia do record 1 em `canonicalRecord` junto com o modelo usado pela interface: fases concluídas, ramos secretos revelados, recompensas por fase, acesso aos mundos e recursos. Escolher Bavaria ou Tibet no selo e as compras da loja continuam sendo da interface do port e são gravados no mesmo record (`campaignRecord`). O laboratório importa e exporta o payload do record 1; não interpreta o contêiner RMS de emuladores.

## Replay de sessão

JSON com `version: 4`, `engine` (`CORE_REVISION`: revisão do host, dos patches e do tradutor), `source` (16 primeiros dígitos hexadecimais do SHA-256 dos fontes da decompilação depois dos patches), mundo, fase e, opcionalmente, os recursos iniciais (fases de teste) ou o record RMS da campanha em base64 (a sessão do tutorial não traz nenhum dos dois), e os controles comprimidos em sequências `{ticks, direction, action, reset?, back?}` (`back` é a tecla direita do aparelho, usada nas telas do próprio jogo). O campo opcional `locale` guarda o idioma da sessão: as falas traduzidas paginam de outro jeito, então a restauração usa o idioma gravado. Restaurar significa criar a mesma sessão e reexecutar os controles no núcleo; o resultado é idêntico porque o núcleo é determinístico. Arquivos de outra revisão ou de outros fontes são recusados. Máximo importado: 144000 ticks (duas horas a 20 Hz).

A sessão em andamento é gravada em `diamond-rush:session:v4` ao iniciar a fase, ao pausar ou retomar, ao esconder a página e em `pagehide`. O port não lê essa chave de volta; para restaurar uma sessão, use a exportação e a importação do laboratório, que usam o mesmo formato. Os percursos certificados em `tests/fixtures/core-routes` usam um formato próximo (`version: 2`, com `expected` e `provenance`), descrito em [VERIFICACAO_DAS_FASES.md](VERIFICACAO_DAS_FASES.md).
