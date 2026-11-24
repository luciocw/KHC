# Dados: de onde vêm e como fechar uma temporada

## Modelo híbrido

- **Temporada em andamento:** vem da API pública do Sleeper em tempo real (`js/api.js`), sem login.
- **Temporada fechada:** vem **só** do `data/<ano>.json` (`js/data.js`). É um registro imutável, com nomes e números da época, e o site abre mesmo com o Sleeper fora do ar. Rodada, Chaveamento, Copa e Champions KHC saem dos confrontos gravados nele (`rounds`). Um arquivo antigo sem `rounds` volta a buscar esses placares no Sleeper.
- O jogador é identificado pelo id do Sleeper (`userId` no JSON, `ownerId` ao vivo), com o nome como reserva: trocar de nome não perde histórico nem medalhas.

## Formato do `data/<ano>.json`

Gerado por `scripts/derive-season.mjs`. Não edite à mão.

```js
{
  id: 2025, status: 'final',
  series: [                       // uma por liga; Guilhotina com kind 'guillotine', Copa com kind 'cup'
    { id: 'A', name: 'KHC Serie A', teams: [
      { rank, rosterId, userId, user, team, avatarId, w, l, t?, pts, ptsAgainst, ppts, trophy?, cut? }
    ] }
  ],
  rounds: {                       // por liga (menos a Guilhotina)
    'serie-a': {
      settings: { leg, lastScored, playoffStart, playoffTeams },
      bracket: [ { m, r, p, t1, t2, w, l, t1_from, t2_from } ],   // winners_bracket do Sleeper
      weeks: { '1': [ [rosterId, matchupId, pontos], … ], … }      // matchupId null = folga
    }
  }
}
```

As funções que leem `rounds` ficam em `js/derivations.js` (`archivedLeague`, `archivedRound`, `archivedBracket`, `archivedCopaScores`) e são testadas em `tests/contas.test.mjs`, inclusive com o `data/2025.json` real.

## Fechar uma temporada

> Passo a passo para leigos (pelo GitHub, sem terminal): [`ENCERRAMENTO-TEMPORADA.md`](../ENCERRAMENTO-TEMPORADA.md). O botão **Actions → Encerrar temporada** (`.github/workflows/encerramento.yml`) roda o mesmo script, confere os testes e grava o arquivo na branch `encerramento-<ano>`. A `main` só muda quando você aprova o pull request.

Quando a final e a disputa do 3º lugar terminam (semana 17), o site já mostra "Temporada encerrada" e abre no Chaveamento (pódio). Para gravar o histórico:

1. Rode:
   ```bash
   node scripts/derive-season.mjs 2026
   ```
   O script lê as ligas de `js/config.js` e o chaveamento do Sleeper:
   - 1º–4º pelos playoffs (troféus), 5º e 6º pela disputa do 5º lugar, o resto pela temporada regular;
   - a Guilhotina sai pela ordem de corte, sem troféu nem Pontos KHC (Premier League e NBA não entram);
   - a Copa entra quando `copa.test` é `false`;
   - grava os confrontos de todas as semanas de cada liga (`rounds`).

   Se alguma final ainda não tiver vencedor, ele para e avisa.
2. Faça commit do `data/2026.json` e merge na `main`. O site passa a tratar 2026 como fechada: mostra medalhas e soma nas Lendas e no perfil.

Para acrescentar só os confrontos a um arquivo que já existe, sem mexer no resto: `node scripts/derive-season.mjs <ano> --so-placares`. Foi assim que o `data/2025.json` ganhou os seus.

## Temporada nova (o Sleeper gera IDs novos todo ano)

1. Configure o ano em `js/config.js`:
   ```js
   '2027': {
     rules: { promote: 3, relegate: 3, playoffTeams: 6, elitePlayoffTeams: 8 },
     leagues: [
       { id: '...', name: 'KHC Elite',      tier: 'elite' },
       { id: '...', name: 'KHC Serie A',    tier: 'serie-a' },
       { id: '...', name: 'KHC Serie B',    tier: 'serie-b' },
       { id: '...', name: 'KHC Serie C',    tier: 'serie-c' },
       { id: '...', name: 'KHC Serie D',    tier: 'serie-d' },
       { id: '...', name: 'KHC Guilhotina', tier: 'guilhotina' },
     ],
   }
   ```
2. O seletor de temporada, as abas de série e as zonas saem da config automaticamente, e o site passa a abrir no ano mais recente. As séries novas (E, F) já têm cor e escudo em `SERIES_META`: use `tier: 'serie-e'` / `'serie-f'`. O chaveamento segue as vagas de playoff do Sleeper (4, 6 ou 8 times).
3. Durante a temporada, o site puxa tudo do Sleeper sozinho.
4. **Textos para revisar à mão:** as regras do ano (`js/tabs/regras.js`) e a landing (`index.html`, "Temporada 2026 em andamento").

## Registro semanal das chances

`scripts/snapshot-chances.mjs` refaz a conta da visão **Chances**, com o mesmo código do site. Ele grava em `data/chances-<ano>.json` as chances de cada time após cada rodada encerrada e, quando a temporada regular fecha, o resultado final (quem foi aos playoffs e quem caiu). Serve para conferir se o modelo acerta.

O GitHub Actions (`.github/workflows/chances.yml`) roda toda terça e quarta. Também dá para rodar à mão em **Actions → Registro das chances → Run workflow** ou com `node scripts/snapshot-chances.mjs 2026`.

## Dados guardados no aparelho

Placares de semanas encerradas ficam no `localStorage` (`khc_wk_*`) para não baixar de novo. Só valem como definitivos `STAT_FIX_DAYS` (10) dias depois do Monday Night; antes disso, o site busca de novo para pegar correções de estatística do Sleeper.

Cada pedido ao Sleeper tem tempo limite (`FETCH_TIMEOUT_MS`, 15 s) e novas tentativas em falha de rede, 429 e 5xx.
