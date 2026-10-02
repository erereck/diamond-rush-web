# Menu, selo e loja S700

Esta implementação segue a referência S700 1.2.0 fixada no commit [`5e05c42`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7). Os métodos abaixo são de [`cGame.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/cGame.java), e as tabelas de [`Define.java`](https://github.com/palaceswitcher/Diamond-Rush-Decomp/blob/5e05c42aa1aae3377790600eb6d27497101b79e7/src/Define.java).

| Comportamento | Referência Java | Port |
|---|---|---|
| Ordem do título: New Game, Continue, More Games, Options, Help, About, Exit | `menuData[0]`, `method_175` | `FrontEndRenderer.MENU_ITEMS` |
| Opções: som e vibração | `menuData[5]`, `method_84` | `main.ts`, `MobileControls.setHaptics` |
| Selo: Angkor, Bavaria, Tibet, loja; movimento cardinal sem salto entre posições | `method_75`, `Define.sealMoveDirection` | `Store.SEAL_MOVE`, `main.ts` |
| Bavaria requer 10 diamantes vermelhos, Tibet 25; nenhum é gasto | `method_73`, `Define.worldPrices` | `Store.WORLD_RED_PRICES`, `Campaign.unlockedWorld` |
| Entrada em Bavaria assegura martelo; entrada em Tibet assegura gancho | `method_75` | `main.ts` |
| Loja: quatro preços 150/400/1000/3000, compra direta se houver saldo, tier adquirido suprime os inferiores | `method_212–215`, `Define.itemPrices` | `Store.purchaseArmor` |
| Energia máxima 4–8 fica no byte 8 do record 1; diamantes normais ficam nos bytes 4–5 | `method_214`, `method_109–128` | `CanonicalSave`, `CanonicalCampaign`, `Simulation` |
| Idiomas | O pacote S700 contém só `lang.f` em inglês | `Localization.ts` fornece traduções web PT-BR/ES dos 115 textos e de todos os diálogos presentes em `demo.f` |

O mapa usa as ligações de `map_*.out` e o contador `coletados/total` do RMS. A marca de uma fase usa os diamantes vermelhos da própria fase, não a conclusão dela. A introdução continua entrando em Angkor pelo tutorial original. O seletor de idioma fica fora do Canvas para manter os dois itens da tela original de opções.

As camadas base do selo e da loja vêm de `0.f/3`, `mmv.f/0–5`, `ms.f/0` e `ui.f/2–3`. As transições e os efeitos específicos dessas telas ainda carecem de comparação quadro a quadro com a execução J2ME. `More Games!` originalmente sai para um catálogo externo que não acompanha o JAR; no port, a opção mostra que o catálogo está indisponível.
