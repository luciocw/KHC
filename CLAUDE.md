# KHC — notas para o Claude

- Ao mudar qualquer regra, cálculo ou critério (Pontos KHC, chances, Power Ranking, chaveamento, fechamento de temporada…), atualize no mesmo PR a explicação no site (aba Regras, `js/tabs/regras.js`, e as notas da própria aba) e o `README.md`. Pedido do dono do site.
- Textos visíveis em português do Brasil; "o Sleeper" (masculino).
- Antes de integrar mudanças visuais, mande um preview (print) quando o dono pedir.
- Antes de integrar mudanças em contas (Pontos KHC, Copa, Chances, chaveamento…), rode `node --test tests/*.test.mjs` e acrescente um teste quando a regra mudar.
