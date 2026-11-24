# Lendas KHC e Pontos KHC

Hall da Fama (`js/tabs/lendas.js`, conta em `legendsAggregator` / `careerForUser` em `js/derivations.js`).

## Pontos KHC

Tabela em `KHC_POINTS` (`js/config.js`), em discussão até 2027. Os pontos saem da colocação final:

| Competição | 1º | 2º | 3º | 4º | 5º | 6º | 7º |
|---|---|---|---|---|---|---|---|
| Séries A–F (todas iguais) | 12 | 8 | 6 | 4 | 3 | 2 | 1 |
| Elite | 14 | 10 | 7 | 5 | | | |
| Copa KHC | 10 | 7 | 5 | 2 | | | |

- Guilhotina, Premier e NBA não pontuam.
- 5º e 6º saem da disputa do 5º lugar.
- Só contam temporadas fechadas (`data/<ano>.json`).

## Desempate

Títulos, depois aproveitamento V–D, depois título mais recente.

O aproveitamento das Lendas conta só a temporada regular das divisões nas temporadas fechadas (14 jogos por ano para todos); playoffs, Elite e Copa ficam fora. O "aproveitamento geral" do perfil é outro número: inclui a temporada atual e a Elite.

## Exibição

- Medalha só para 1º–3º.
- Baixar e Compartilhar geram PNG do top 10.
- O jogador é identificado pelo id do Sleeper (`userId`), então trocar de nome não perde histórico nem medalhas.

Ao mudar qualquer regra aqui, atualize também a aba Regras (`js/tabs/regras.js`) e acrescente um teste (`tests/contas.test.mjs`).
