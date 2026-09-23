# Seleção do JAR original fornecido para pesquisa

Os cinco arquivos recebidos têm nomes semelhantes, mas três são ZIPs que contêm múltiplos JARs diferentes. Comparei o SHA-256 dos 40 arquivos de `res/` do [Diamond-Rush-Decomp no commit fixado](https://github.com/palaceswitcher/Diamond-Rush-Decomp/commit/5e05c42aa1aae3377790600eb6d27497101b79e7) com cada entrada de mesmo nome em todos os JARs. A quantidade de acertos abaixo é a melhor encontrada **dentro de cada arquivo recebido**.

| Arquivo recebido | JAR mais próximo dentro dele | Recursos idênticos |
|---|---|---:|
| `Diamond-Rush_J2ME_EN_v120-DIAMOND-Dopod-S1.jar` | O próprio JAR | 0/40 |
| `Diamond-Rush_J2ME_EN_v120-DIAMOND-Dopod-S1 (1).jar` | O próprio JAR | 6/40 |
| `Diamond-Rush_J2ME_EN_v120-DIAMOND-Dopod-S1.zip` | JAR com sufixo `(a2)` | **40/40** |
| `Diamond-Rush_J2ME_EN_v120-DIAMOND-Dopod-S1 (1).zip` | JAR com sufixo `(a)` | 29/40 |
| `Diamond-Rush_J2ME_EN_v120-DIAMOND-Dopod-S1 (2).zip` | Ambos os JARs | 0/40 |

**Referência escolhida:** `Diamond Rush (2006)(Gameloft SA)(v1.2.0)( DIAMOND Dopod S1)(a2).jar`, extraído do ZIP maior. Tamanho: 303.373 bytes. SHA-256: `305e5f778014500833377953e60c2074ada5c1f15abf7a99c83d830ceda50d49`. O manifest declara `MIDlet-Version: 1.2.0`, `MIDlet-Vendor: Gameloft SA`, `CLDC-1.0` e `MIDP-2.0`. Uma cópia de pesquisa está em `work/reference-s700-original.jar`, fora deste repositório e fora da publicação no GitHub Pages.

O JAR sem sufixo dentro do mesmo ZIP coincide em 39/40 recursos; somente `icon.png` difere. Seus arquivos `e.class` e `i.class` também diferem da referência `(a2)`, então não é seguro tratá-lo como o mesmo executável. Os nomes de arquivo mencionam “Dopod S1”, mas o manifest não identifica um aparelho. A coincidência completa dos recursos torna `(a2)` a melhor referência disponível para os mapas, sprites, músicas e textos S700; **não comprova sozinha** que todo o bytecode seja idêntico ao da decompilação Sony Ericsson S700. Nenhum desses JARs foi incluído no código ou distribuído pelo port.
