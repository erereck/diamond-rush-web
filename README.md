# Diamond Rush Web

Port independente de **Diamond Rush** para navegador, feito em TypeScript e Canvas 2D a partir da versão J2ME **Sony Ericsson S700 1.2.0 (non-padlock)**. A simulação roda a 20 ticks por segundo e desenha os recursos originais em uma tela lógica de 240 × 320 pixels. Não executa J2ME no navegador.

**[Jogar no GitHub Pages](https://erereck.github.io/diamond-rush-web/)** · [Cobertura fase a fase](docs/PLAYABILITY.md) · [Como verificamos as fases](docs/VERIFICACAO_DAS_FASES.md)

> **Em desenvolvimento.** Menu, mapa, loja, introdução, equipamentos, checkpoints, chefes e muitas mecânicas já funcionam. Ainda não existe um percurso certificado que zere todos os mundos, segredos e chefes em sequência. Uma fase carregar e aceitar controles não significa que sua saída esteja verificada.

## O que já dá para experimentar

- Começar pelo menu original, assistir à introdução de Angkor, navegar pelo selo e pelos mapas e salvar progresso no formato RMS estudado.
- Jogar com teclado, gamepad ou toque. No celular, **Ajustar** permite trocar direcional e analógico, inverter o lado, dimensionar e reposicionar botões, ajustar transparência e zona morta e configurar a vibração. Há botões para agir, confirmar, voltar, pausar e retornar ao checkpoint.
- Encontrar martelo, gancho e martelo de gelo nos baús das fases correspondentes; usar pedras, chaves, placas, portões e outros mecanismos implementados. A loja oferece quatro melhorias de energia persistidas no save.
- Escolher inglês original ou traduções do port para português brasileiro e espanhol. O pacote S700 estudado contém apenas o inglês.
- Abrir o **Laboratório de preservação** para inspecionar os 41 mapas, testar uma fase isolada com equipamento escolhido, ver sprites e paletas, ouvir prévias das 21 faixas MIDI e importar/exportar replays e o record RMS.

No teclado, use **setas/WASD** para mover e navegar, **Enter/Espaço** para confirmar ou agir, **Escape** para pausar/voltar e **R** para retornar ao checkpoint. O botão de ação sobre um checkpoint também o restaura. O menu de pausa permite retomar, reiniciar, consultar a ajuda, voltar ao mapa ou sair. A síntese MIDI do navegador ainda não reproduz os timbres do aparelho J2ME.

## Estado da verificação

O [inventário gerado automaticamente](docs/PLAYABILITY.md) cobre **41 mapas** (a introdução e 40 fases), **47 objetivos de conclusão** quando contamos saídas alternativas, **22 percursos completos por controles** e **18 mapas com todos os seus objetivos aprovados**, incluindo os três chefes. Há também mapas com tentativas reproduzíveis ainda sem saída concluída. Esses números são da revisão atual; [PLAYABILITY.json](docs/PLAYABILITY.json) é a fonte legível por máquina.

Um percurso aprovado começa no spawn original e fornece somente direções, ação e retorno ao checkpoint. Seus recursos iniciais, como equipamento e energia, ficam explícitos. O verificador reproduz os comandos e exige o resultado registrado; para uma saída, exige que a fase termine, e para um chefe, também exige sua derrota. Tentativas incompletas ficam separadas e **não contam** como conclusão. O [guia de verificação](docs/VERIFICACAO_DAS_FASES.md) explica o método, seus limites e como reproduzir os testes.

Há um percurso de campanha desde **New Game** que encadeia a introdução, Angkor 1–8 e o chefe de Angkor, transferindo recursos, recompensas e save entre fases. Percursos isolados dos chefes posteriores e de algumas saídas secretas começam com equipamento predefinido: comprovam aquele trecho no port, mas não a aquisição do equipamento nem o desbloqueio durante uma campanha completa. A [varredura das 40 fases](docs/STAGE_SMOKE.md) testa inicialização, movimento e reconstrução do replay; não certifica puzzles ou saídas.

## Rodar localmente

É necessário Node.js **22.18+**, npm e Git. Extração e testes esperam este layout de pesquisa:

```text
workspace/
├─ outputs/diamond-rush-web/    ← este repositório
└─ work/reference-s700/         ← referência fixada
```

No terminal, dentro de `outputs/diamond-rush-web`:

```powershell
New-Item -ItemType Directory -Force ../../work | Out-Null
git clone https://github.com/palaceswitcher/Diamond-Rush-Decomp ../../work/reference-s700
git -C ../../work/reference-s700 checkout 5e05c42aa1aae3377790600eb6d27497101b79e7
npm ci
npm run extract-assets
npm run dev -- --port 5173
```

Abra `http://127.0.0.1:5173/`. Se o clone de referência já existir, pule o `git clone`; a extração também aceita outro caminho para `res/` com `npm run extract-assets -- C:/caminho/para/res`. Os testes que comparam a referência continuam esperando o clone fixado no layout acima.

```powershell
npm run verify:routes       # saídas, chefes, tentativas e campanha registrada
npm run verify:stages       # varredura exploratória dos 40 spawns
npm test                    # mecânicas, dados, saves, cenas e percursos
npm run build               # TypeScript e build estática
```

Para regenerar as tabelas e JSONs, acrescente `-- --write-report` aos comandos `verify:routes` e `verify:stages`. O GitHub Pages executa extração, testes e build a cada push para `main` antes de publicar. Os recursos extraídos em `public/assets` e o JAR original usado na pesquisa não são guardados neste repositório.

## Documentação para continuar o port

| Assunto | Onde ler |
|---|---|
| Método de verificação e reprodução dos replays | [VERIFICACAO_DAS_FASES.md](docs/VERIFICACAO_DAS_FASES.md) |
| Estado e bloqueios de cada saída | [PLAYABILITY.md](docs/PLAYABILITY.md) |
| Teste exploratório de todos os mapas | [STAGE_SMOKE.md](docs/STAGE_SMOKE.md) |
| Versão S700, JAR pesquisado e diferenças de fontes | [VERSION_MATRIX.md](docs/VERSION_MATRIX.md), [ORIGINAL_JAR.md](docs/ORIGINAL_JAR.md) |
| Formatos extraídos e relação com o Java | [SOURCE_MAP.md](docs/SOURCE_MAP.md), [LEVEL_FORMAT.md](docs/LEVEL_FORMAT.md), [SAVE_FORMAT.md](docs/SAVE_FORMAT.md) |
| Mecânicas comparadas com métodos Java isolados | [STAGE_MECHANISMS.md](docs/STAGE_MECHANISMS.md), [PRESSURE_PLATES.md](docs/PRESSURE_PLATES.md), [RIDDLES.md](docs/RIDDLES.md), [BOSSES.md](docs/BOSSES.md) |
| Histórico detalhado de auditorias e revisões | [VERIFICATION.md](docs/VERIFICATION.md), [FIDELITY_REVIEW.md](docs/FIDELITY_REVIEW.md) |

As comparações com Java executam trechos da **decompilação S700 recompilada** ou métodos isolados em harnesses. São evidência dos estados comparados, não prova de equivalência integral com o JAR ou com todas as animações do aparelho. O [JAR fornecido para a pesquisa](docs/ORIGINAL_JAR.md) teve 40/40 recursos iguais aos da referência escolhida; isso não estabelece, por si só, identidade do bytecode.

## Créditos e origem dos dados

- **Jogo, mapas, sprites, textos e músicas originais:** Gameloft. A referência principal de dados e lógica é [Diamond-Rush-Decomp, de palaceswitcher](https://github.com/palaceswitcher/Diamond-Rush-Decomp), fixada no [commit `5e05c42`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7). A pesquisa consulta sobretudo [`cGame.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/cGame.java), [`DemoInterpreter.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/DemoInterpreter.java) e [`res/`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7/res).
- **Fontes comparativas:** [DiamondRushSource](https://github.com/kubikaugustyn/DiamondRushSource) e [diamondRush](https://github.com/kubikaugustyn/diamondRush), de kubikaugustyn. A [matriz de versões](docs/VERSION_MATRIX.md) registra seus papéis; recursos de outras versões não são misturados ao jogo publicado.
- **Port web e traduções PT-BR/ES:** trabalho independente deste repositório. As traduções foram feitas a partir dos textos ingleses de `lang.f` e `demo.f`; não são traduções oficiais da versão S700.

Este é um projeto de preservação feito por fãs, sem afiliação com a Gameloft ou com os autores das decompilações. O port não concede uma licença nova aos recursos originais nem aos códigos de referência.
