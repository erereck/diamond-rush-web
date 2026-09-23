# Verificações da build experimental

Em 23/09/2026, no Windows, Node 26.7 e navegador Chromium integrado:

- `npm test`: 174 testes passaram, sem testes ignorados. Incluem codecs, todos os 95 sprites, 41 mapas, 21 MIDIs, hashes, relógio, câmera, movimento, pedras, limites de colisão, equipamento, replay e RMS.
- `npm run build`: TypeScript e build de produção passaram.
- Validação no navegador: 2664 combinações de módulo/paleta, 1888 combinações de frame/paleta e 41 mapas renderizados sem exceção. As três referências de animação inválidas `mmv` são documentadas, não corrigidas artificialmente.
- Início de Angkor, pausa, movimento por teclado e avanço individual de tick verificados no navegador. Um toque curto capturado entre ticks foi aplicado na próxima leitura.
- Recarregar restaurou a sessão pausada no mesmo tick 6 e posição (5,17).
- Layout e direcional de toque conferidos em viewport 390 × 844; avanço até (6,17) confirmado.
- Caminhada à esquerda conferida no navegador até (3,17), com o sprite espelhado dentro da célula. Testes novos verificam a origem dos frames esquerdo e direito, o sentido visual das pedras em rolagem, o alcance do fogo, a abertura do baú, a restauração do checkpoint e os tempos de dano/morte.
- O início da fase foi conferido no navegador após trocar o sprite equivocado que parecia uma poção pelo portão `cm.f/1` (frames 2 e 5). Os testes de comportamento cobrem a animação de esforço e a morte sob pedra, a saída debaixo dela e o momento em que o prêmio vermelho aparece acima do personagem.
- Modelo RMS inspecionado na UI: 994 bytes, 5 vidas, vida máxima 4 e primeira secreta 9/10/11.
- Galeria `cm-2` conferida nas paletas roxa e vermelha; mapa de Bavaria aberto pelo inspetor.
- Faixa MIDI de abertura carregou 865 notas / 23,7 segundos; os controles de reproduzir e parar foram acionados sem erro de console. Timbres e saída acústica não foram comparados ao aparelho.
- A abertura foi percorrida automaticamente em teste pelos seis gatilhos jogáveis, verificando grama destruída nos passos roteirizados, baú, bússola e retorno ao checkpoint após morte. No navegador, a pausa da abertura mostrou e retomou a cena; o botão de retorno ficou disponível na exploração e desativado durante a pausa. Não houve erro no console nessa verificação.
- Os mapas canônicos contêm os baús de martelo, gancho e martelo de gelo nas fases esperadas. Testes exercitam a coleta permanente, o ataque em tijolos/cobras, a mira automática, o puxão dos dois lados, gelo em cobras/diamantes, a queda do bloco congelado, perseguição da cobra vermelha, persistência na campanha, byte correspondente no codec RMS e replay determinístico com gancho.
- A build local atual abriu no Chromium integrado sem erros de console. O menu S700 foi conferido visualmente. No laboratório, iniciar Angkor 4 com **Martelo de gelo** exibiu o equipamento ativo e aceitou o comando de ataque. Os efeitos das armas ainda não foram comparados visualmente com a execução J2ME original.

Os testes de simulação verificam invariantes do subconjunto implementado. Não são comparação diferencial contra execução Java. O validador de recursos detecta falhas de acesso/renderização, mas não prova que cada objeto tem o desenho, comportamento ou ordem exatos. Nenhum percurso completo de campanha foi aprovado.
