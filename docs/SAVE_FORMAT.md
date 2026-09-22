# S700: save de campanha e sessão de desenvolvimento

## Record RMS original

Evidência: `cGame.method_109–128`, `method_426`, commit canônico indicado em FORENSIC_AUDIT.md. `CanonicalSave.ts` interpreta o **payload do record 1** do RecordStore `DiamondRush`. Não interpreta arquivos contêiner de emuladores nem o RecordStore separado `Preferences`.

O Java aloca 1000 bytes, mas grava apenas `field_382` bytes usados. A reconstrução com os mapas canônicos produz **994 bytes**. Não foi obtido um save extraído do aparelho/JAR para comparação binária externa.

| Offset | Conteúdo confirmado |
|---|---|
| 0 | Soma em byte dos diamantes vermelhos presentes nas fases |
| 1–2 | Flags de progresso; preservadas sem reinterpretação completa |
| 3 | Vidas: byte Java com sinal; inicial 5 |
| 4–5 | Diamantes coletados, little-endian |
| 6–7 | Diamantes vermelhos, little-endian |
| 8 | Vida máxima; inicial 4 |
| 9–13 | Estado/equipamentos/preferências; preservados sem mutadores nesta etapa |
| 14–19 | Três ponteiros u16 LE para os blocos dos mundos |

Cada bloco de mundo contém: quantidade de fases (byte), maior fase liberada (byte), primeira fase secreta (byte), e um ponteiro u16 LE por fase. A primeira fase secreta é o menor índice dos nós de mapa de tipo 1, ou 100 quando não há nenhum. Nos recursos canônicos: 9 / 10 / 11.

Cada bloco de fase contém: status (byte), quantidade original de diamantes vermelhos (byte), **flags** (byte), baús abertos (byte), quantidade de baús (byte), e pares x/y por baú. O terceiro byte é combinado com OR em `method_117`; não é um contador de diamantes coletados. Os baús são os objetos 14 e 33, enumerados de cima para baixo e da esquerda para a direita. Abrir um baú substitui seu par por (0,0) e incrementa a contagem.

O codec preserva bytes desconhecidos e cauda, valida limites e sobreposições, retorna cópias de bytes e não grava automaticamente na sessão experimental. A criação de modelo segue o código canônico; a integração de campanha permanece pendente.

## Replay experimental

JSON com `version: 2`, `target: "1.2.0-s700"`, `engine: "experimental-2"`, mundo, fase, impressão FNV-1a dos três planos/dimensões e entradas por tick. A impressão detecta diferenças de dados; não é assinatura de segurança. Entradas são reconstruídas executando a mesma simulação desde o começo. Máximo importado: 144000 ticks, ou duas horas a 20 Hz.

Qualquer alteração semântica no motor exige alterar `ENGINE_REVISION`. Arquivos de outra revisão são rejeitados. O armazenamento local usa `diamond-rush:experimental-session:v2`; não altera saves anteriores. O replay não substitui o formato RMS nem comprova determinismo em relação ao Java.
