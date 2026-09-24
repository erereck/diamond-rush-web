# Revisão de fidelidade — 24/09/2026

Referência: versão S700 1.2.0 do [Diamond-Rush-Decomp](https://github.com/palaceswitcher/Diamond-Rush-Decomp/tree/5e05c42aa1aae3377790600eb6d27497101b79e7), fixada no commit `5e05c42aa1aae3377790600eb6d27497101b79e7`. A comparação usa os recursos e o Java locais dessa revisão. O JAR fornecido corresponde byte a byte aos 40 recursos da referência; a identidade do bytecode ainda não foi demonstrada. Não houve execução diferencial em emulador nesta revisão.

| Sistema | Evidência e verificação atual | Limite de paridade |
|---|---|---|
| Recursos, mapas e texto | `npm run audit`, 41 níveis, 98 sprites, 21 MIDI; parsers e testes de dados canônicos | Há objetos decodificados que ainda não têm regra de jogo |
| Menu, mapa e cenas | Recursos S700, links dos três mapas, seis roteiros da abertura, dois retornos ao círculo, oito gatilhos nas fases e quatro eventos de baú de `demo.f`; diálogo da câmara final de Angkor visto no navegador | Seis roteiros sem gatilho ativo nesta versão; tempos e enquadramento ainda sem comparação quadro a quadro |
| Movimento e colisão | Casos transitáveis de `cGame.method_288`, relógio de 20 Hz, câmera, empurrão, queda e animação esquerda/rolagem cobertos por testes | Sem trace por tick contra o executável J2ME |
| Coleta e baús | `method_321/322`: recompensa específica do baú; cura do chão com vida cheia rende dez diamantes e aumenta o total da fase; vida extra no limite de 99 segue a mesma conversão | Momento exato da animação de coleta precisa de trace |
| Inimigos, fogo e armas | Colisões e efeitos principais das cobras, fogo, martelo, gancho e gelo têm testes de cenário; o martelo acerta no frame 2 da animação 13–16 de `o.f`, como em `cGame.method_260` | Alvos especiais, água, chefes e parte dos puzzles permanecem parciais |
| Perigos de fases posteriores | `method_206/312/325/334/264/336/337/338/314`: movimento inicial dos inimigos 45/46/49, projétil 21, clocks dos espinhos, rolagem, armadilhas duplas de Bavaria e pedras de Tibet; testes em mapas reais e cenários controlados | Sem trace J2ME; IA completa dos novos inimigos, água, outras armadilhas e interações especiais ainda faltam |
| Morte, checkpoint e save | `method_109–128/346/347`: restaura planos mutáveis e câmera; campanha sincroniza recursos, progresso, baús, segredos e prêmios no record 1 RMS | Compras, vida máxima e comparação de bytes/estado com execução J2ME real ainda faltam |
| Tela de resultado | `method_249(11)` e `method_250`: quatro flags de prêmio independentes, teto de 99 vidas, revelação automática e pulo por ação | Recursos do resultado vêm de contador da simulação; paridade visual fina ainda depende de captura J2ME |
| Mobile e layout | Controles configuráveis por grupo; diálogo verificado no navegador sem erro de console nem aumento da largura horizontal | Faltou comparar em aparelho físico e tamanhos variados de viewport nesta revisão |

Os testes locais cobrem comportamentos reproduzíveis do port, mas não certificam que uma fase inteira tem a mesma solução ou sequência de frames do jogo original. Para isso, o próximo passo confiável é registrar no emulador uma sequência de entradas, posição, tiles e estados por tick e compará-la com o replay web. As limitações por sistema continuam em [`STATUS.md`](STATUS.md).
