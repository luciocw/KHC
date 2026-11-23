# KHC Awards · Semana 11 (a montar depois do fim da rodada 11)

## Gancho da Prévia S11

A Prévia S11 abriu com "faltam 4 rodadas para quem cai" e as zonas de queda das Séries A, B e C. O Awards responde a esse gancho.

## Ideia do usuário: quem já está decidido

Com o fim da rodada 11 faltam só **3 rodadas** (12, 13 e 14). Levantar por série:

- **Matematicamente rebaixados** (A, B e C, caem 3): mesmo vencendo os 3 jogos que faltam, o time não consegue sair do 8º lugar.
- **Matematicamente nos playoffs** (top 4 na Elite e top 6 nas séries): mesmo perdendo os 3, o time não sai da zona de classificação.
- **Matematicamente fora dos playoffs:** o time não alcança o último lugar de playoffs nem vencendo tudo.

### "Matematicamente" = 100% de certeza (definição do usuário)

Não é 99% nem 1%: ou é **100%**, ou não entra como decidido. Exemplos dados pelo usuário:
- Faltam 3 rodadas e se classificam 6. O líder tem **4 vitórias** de vantagem sobre o 7º: já está classificado, porque mesmo perdendo tudo o 7º não o alcança.
- O lanterna (10º) não consegue mais alcançar o 7º, o primeiro fora da zona: já está rebaixado.

Conta que vou usar, após a rodada 11 (R = 3 rodadas restantes):
- **Classificado (top k):** mesmo que o time X perca os 3, no máximo k−1 rivais conseguem chegar a **igualar ou passar** as vitórias atuais dele (rival: vitórias + 3). Empate conta como "pode passar", porque o desempate por pontos não dá 100%.
- **Rebaixado:** mesmo que X vença os 3 (vitórias + 3), ainda há pelo menos 7 times com **mais** vitórias que isso **hoje**. Empate conta como "pode escapar".
- **Fora dos playoffs:** mesmo vencendo os 3, pelo menos k rivais já têm **mais** vitórias hoje.
- **Confrontos diretos contam (observação do usuário):** se dois perseguidores se enfrentam numa das rodadas restantes, os dois não podem ganhar os 3 jogos. Assim, 3 vitórias de vantagem podem bastar para classificar.
- **Método:** testar **todos os resultados possíveis** das rodadas 12–14. São 5 jogos por rodada, 15 jogos e 2^15 = 32.768 cenários por série, então o cálculo é rápido e exato.
  - **Classificado:** fica no top k em **todos** os cenários, mesmo com cada empate em vitórias decidido **contra** ele.
  - **Rebaixado:** fica entre os 3 últimos em **todos** os cenários, mesmo com cada empate decidido **a favor** dele.
  - Assim os confrontos diretos entram na conta, e o desempate por pontos nunca é presumido. Resultado: 100% ou nada.

### Dados estatísticos do site (o usuário pediu para usar)

- As **chances** do site (playoffs e queda após a rodada 11) e o **Power Ranking** entram no vídeo como complemento, para os times "ainda em jogo".
- Pedir ao usuário os prints da rodada 11 (Elite, A, B, C e D) e do Power Ranking.
- O site ajuda a apontar candidatos, mas um time só é "decidido" pela conta de 100% acima.

## Visual sugerido

- Por série, duas colunas: **CLASSIFICADOS ✓** e **REBAIXADOS ✗**. Mais o grupo "**ainda em jogo**" com a % do site.
- Carimbos "CLASSIFICADO" (verde) e "REBAIXADO" (vermelho), com selo de "matematicamente".
- Gancho para a Prévia S12: "Faltam 3. Quem ainda escapa?".
- **Copa KHC 2027:** avisar que em 2027 terá a **Copa KHC**, então os times já decididos (classificados ou rebaixados) devem seguir escalados pelos donos, porque podem estar na disputa. **Não explicar como será a Copa**, só que ela existe e que vale continuar escalando.
- Lembrar também: Guilhotina, NBA e Cocoricó; zoar os donos; o Vigarista só se houver fato marcante; nomes de time, não de pessoa.

## Também na KHC (prints do usuário)

### National Burgundy Association · após a rodada 5

1. **Cruise Basketball 5–0** (2133,7 PF), o único invicto. A vaca segue no alto da árvore.
2. **Public Enemy #1 4–1**, que **perdeu a invencibilidade**. Na S10 estava 4–0 "lado a lado com a vaca".
3. Panela do Lebrão 3–2 · 4. joaoW7 3–2 · 5. Caipiracicaba 2–3 · 6. Dogmans 13 2–3 · 7. VitorM05 1–4 · 8. **rdomok 0–5**, o único sem vitória.
- Eficiência: Cruise e Caipiracicaba têm 95%, a melhor da liga.
- **Citar que a vaca segue em cima da árvore** (Cruise 5–0), pedido do usuário.
- O Ditador não joga a NBA nesta temporada. Não precisa citar isso em todo vídeo (pedido do usuário).

### Cocoricó Premier League · após a rodada 10

1. Forest Ceará 7–0–3 · 2. ThreeColor dos Pampas 7–0–3 · 3. Cruise Sport Club 7–0–3, **três empatados no topo**.
4. Alvinegro Praiano 6–0–4 · 5. **North London Dictator 6–0–4**. É o Ditador, com o **menor PC da liga** (827,0): defesa de ditador.
6. Up the Irons!! 4–0–6 · 7. Caipiracicaba 4–0–6 · 8. Arena do Grêmio 4–0–6 · 9. Inaciombn18 3–0–7 · 10. **Gumagol971 2–0–8**, lanterna. Ele também está em 10º na Série B, com 99% de queda: lanterna em duas ligas.
- O Rodolfo92 lidera a NBA (5–0) e está no trio de cima da Cocoricó.

## Especial: "PARABÉNS, DITADOR!" (aprovado pelo usuário)

Fato (Sleeper, após a rodada 11 da Cocoricó): o North London Dictator está em **2º com 7–0–4**, empatado em vitórias com o ThreeColor dos Pampas e o Cruise Sport Club. Fica à frente só pelos pontos (1.113,5 contra 1.067,75 e 1.057,75). O líder, Forest Ceará, está com 8–0–3. **Rodar o fetch de novo antes de montar.**

Roteiro (cerca de 5 s, tom de homenagem irônica):
1. Festa exagerada: confete 8-bit, fanfarra e faixa dourada "HOMENAGEM OFICIAL DA KHC". O North London Dictator em destaque: **2º lugar · Cocoricó PL**.
2. Medalha de **prata** sobe e trava no meio do caminho. Legenda: **"Para um torcedor do Tottenham, é praticamente um título."**
3. Carimbo menor no canto: **"\*empatado com mais dois. Vice no desempate."**, com a tabelinha 7–0–4, 7–0–4 e 7–0–4.
4. Fecho (opção A): **"Henrique I decreta: vice agora conta como título."** e, em seguida, **"Mesmo faltando 27 rodadas."** A Premier League tem 38 rodadas: 38 − 11 = 27. Retoma o decreto da Prévia S9.

