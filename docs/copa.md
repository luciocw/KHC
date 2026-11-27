# Copa KHC e Champions KHC

Mata-mata do site em paralelo às divisões. Não conta para playoffs nem rebaixamento e usa a pontuação de cada time na sua liga na semana. Fica em Ligas → aba Copa (`#/ligas/2026/copa`); em Ligas, as abas são Elite, Copa e as Séries.

Configuração em `KHC_CONFIG[ano].copa` (`js/config.js`). Tela em `js/tabs/copa.js` (formato clássico) e `js/tabs/copa-ucl.js` (formato Champions). As contas ficam em `js/derivations.js` (`drawCup`, `resolveCup`, `resolveUcl`) e são as mesmas que o fechamento da temporada usa.

## Formato clássico (o de 2026)

- **Semana classificatória (12):** os 32 maiores pontuadores avançam.
- **Chave por sorteio livre:** `drawCup` com a semente de `copa.seed`. A mesma semente dá o mesmo sorteio, então qualquer um pode conferir.
- 16 avos até a final nas semanas 13–17. Na semana 17: final e disputa do 3º lugar.
- **Empate:** pontos da semana anterior.
- Em **teste** em 2026 (`copa.test: true`) e valendo em 2027. Com `test: false`, o fechamento (`scripts/derive-season.mjs`) grava o pódio da Copa (Pontos KHC: 10/7/5/2) com a mesma conta do site. `--so-copa` confere a Copa sem fechar a temporada.

## Formato Champions (proposta para 2027)

`copa.format: 'ucl'`, em `js/tabs/copa-ucl.js` e `resolveUcl`.

- **Potes por divisão** (`pots`). Fase de liga nas semanas `leagueWeeks`, com `perPot` jogos contra cada pote, nunca contra a própria divisão.
- **Tabela única:** vitória 3, empate 1; desempate por saldo e depois pontos feitos.
- 1º–8º direto às oitavas, 9º–24º no playoff, 25º em diante eliminado.
- **Mata-mata em 2 semanas** (soma dos pontos; empate: melhor posição na fase de liga). Final e 3º lugar na semana 17.

Exemplo para 2027:

```js
copa: {
  format: 'ucl', seed: 'Copa KHC 2027',
  pots: [['serie-a', 'serie-b'], ['serie-c', 'serie-d'], ['serie-e', 'serie-f']], perPot: 2,
  leagueWeeks: [3, 4, 5, 6, 7, 8],
  knockout: { playoff: [9, 10], r16: [11, 12], qf: [13, 14], sf: [15, 16], final: [17] }
}
```

## Champions KHC (simulação)

Página `#/copa-champions`, aberta pelo card **Champions KHC** da página Início (e pela aba Regras): mostra como a Copa de 2026 seria no formato Champions, com os jogos reais da temporada. A configuração fica em `KHC_CONFIG[ano].copaSim`. Não é oficial nem soma Pontos KHC. Tem escudo próprio, o da Copa com o nome novo: `assets/logo/svg/escudo-champions.svg` e os PNGs `escudo-champions.png` (constante `CHAMPIONS_CREST`).

## De onde vêm os placares

- **Temporada em andamento:** do Sleeper, ao vivo. A Copa só calcula com todas as divisões carregadas ao vivo; senão mostra "Copa indisponível", para não exibir classificados ou confrontos errados.
- **Temporada fechada:** dos confrontos gravados no `data/<ano>.json` (`rounds`, ver [`dados.md`](dados.md)), pela função `archivedCopaScores`. Não depende do Sleeper. Um arquivo sem `rounds` volta a buscar no Sleeper.

Exporta a fase aberta em PNG.
