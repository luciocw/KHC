// Testes das contas que decidem resultado (rodar: node --test tests/).
// Carregam o mesmo código do site (scripts globais) com node:vm, sem rede.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ console });
vm.runInContext(
    (await readFile(resolve(ROOT, 'js/config.js'), 'utf8')) + '\n' +
    (await readFile(resolve(ROOT, 'js/derivations.js'), 'utf8')) +
    '\n;globalThis.__t = { drawUclLeague, resolveUcl, uclTable, KHC_POINTS, pointsFor, pointsKindOf, drawCup, cupPhases, resolveCup, legendsAggregator, careerForUser, simulateOdds, seedFrom, buildOddsInput, KHC_CONFIG, zonesForTest: null };',
    ctx
);
const T = ctx.__t;
// objetos do vm vêm de outro "realm": compara via JSON
const plain = v => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// Pontos KHC
// ---------------------------------------------------------------------------

test('Pontos KHC: séries 12/8/6/4/3/2/1, Elite 14/10/7/5, Copa 10/7/5/2, Guilhotina 0', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(r => T.pointsFor('serie', r)), [12, 8, 6, 4, 3, 2, 1, 0]);
    assert.deepEqual([1, 2, 3, 4, 5].map(r => T.pointsFor('elite', r)), [14, 10, 7, 5, 0]);
    assert.deepEqual([1, 2, 3, 4, 5].map(r => T.pointsFor('copa', r)), [10, 7, 5, 2, 0]);
    assert.equal(T.pointsFor('guilhotina', 1), 0);
    assert.equal(T.pointsFor('serie', 0), 0);
    assert.equal(T.pointsKindOf({ id: 'Elite' }), 'elite');
    assert.equal(T.pointsKindOf({ id: 'G', kind: 'guillotine' }), 'guilhotina');
    assert.equal(T.pointsKindOf({ id: 'Copa', kind: 'cup' }), 'copa');
    assert.equal(T.pointsKindOf({ id: 'C' }), 'serie');
});

const row = (rank, user, w, l, extra = {}) => ({ rank, user, team: `T-${user}`, w, l, pts: 1000, ...extra });

test('Lendas: soma por colocação, Guilhotina fora, desempate títulos → aproveitamento → recente', () => {
    const seasons = [{
        id: 2025, status: 'final', series: [
            { id: 'A', name: 'A', teams: [row(1, 'ana', 10, 4, { trophy: 'gold' }), row(2, 'bia', 12, 2, { trophy: 'silver' }), row(8, 'caio', 5, 9)] },
            { id: 'B', name: 'B', teams: [row(1, 'dani', 8, 6, { trophy: 'gold' }), row(5, 'edu', 7, 7)] },
            { id: 'G', name: 'G', kind: 'guillotine', teams: [{ rank: 1, user: 'caio', team: 'x', pts: 900, cut: 0 }] }
        ]
    }];
    const list = plain(T.legendsAggregator(seasons));
    assert.deepEqual(list.map(e => [e.user, e.points]), [['ana', 12], ['dani', 12], ['bia', 8], ['edu', 3]]);
    // ana e dani: 1 título cada → ana tem melhor aproveitamento (10–4 × 8–6)
    assert.ok(list[0].winPct > list[1].winPct);
    assert.ok(!list.some(e => e.user === 'caio'), 'Guilhotina e 8º não pontuam');
});

test('Lendas e perfil: troca de nome continua ligada pelo userId', () => {
    const seasons = [
        { id: 2026, status: 'final', series: [{ id: 'A', name: 'A', teams: [row(1, 'novoNome', 10, 4, { trophy: 'gold', userId: '42' })] }] },
        { id: 2025, status: 'final', series: [{ id: 'B', name: 'B', teams: [row(2, 'nomeVelho', 9, 5, { trophy: 'silver', userId: '42' })] }] }
    ];
    const list = plain(T.legendsAggregator(seasons, { 42: 'nomeAtual' }));
    assert.equal(list.length, 1);
    assert.equal(list[0].user, 'nomeAtual');
    assert.equal(list[0].points, 12 + 8);
    const career = plain(T.careerForUser('nomeAtual', seasons, ['42']));
    assert.equal(career.history.length, 2);
});

// ---------------------------------------------------------------------------
// Copa KHC
// ---------------------------------------------------------------------------

const keys = n => Array.from({ length: n }, (_, i) => `t${String(i).padStart(2, '0')}`);

test('Copa: sorteio reproduzível e com todos os times (40 e 60)', () => {
    for (const n of [40, 60]) {
        const a = plain(T.drawCup(keys(n), 'semente'));
        const b = plain(T.drawCup(keys(n), 'semente'));
        assert.deepEqual(a, b, 'mesma semente = mesmo sorteio');
        assert.notDeepEqual(a, plain(T.drawCup(keys(n), 'outra')));
        const used = new Set([...a.prelim.flat(), ...a.slots.filter(s => s.team).map(s => s.team)]);
        assert.equal(used.size, n);
        assert.equal(a.slots.length, 32);
    }
});

test('Copa: classificatória (32 melhores, empate pela semana anterior) e mata-mata até o pódio', () => {
    const cfg = { qualifying: 12, bracket: 32, seed: 'teste' };
    const ids = keys(40);
    const scores = {};
    for (let w = 11; w <= 17; w++) {
        scores[w] = {};
        ids.forEach((k, i) => { scores[w][k] = 100 + ((i * 37 + w * 11) % 97); });
    }
    // empate no corte: t30 e t31 iguais na 12, t31 melhor na 11
    scores[12].t30 = scores[12].t31 = 50;
    scores[11].t30 = 10; scores[11].t31 = 20;
    const cup = T.resolveCup(cfg, ids, scores, { leg: 17, lastScored: 17 });
    assert.equal(cup.qualifying.status, 'final');
    const ranked = plain(cup.qualifying.ranked);
    assert.ok(ranked.indexOf('t31') < ranked.indexOf('t30'), 'desempate pela semana anterior');
    const qualified = ranked.slice(0, 32);
    const r16 = cup.rounds[0];
    assert.equal(r16.games.length, 16);
    assert.deepEqual(new Set(plain(r16.games).flatMap(g => [g.a, g.b])), new Set(qualified));
    const final = cup.rounds[cup.rounds.length - 1];
    assert.deepEqual(plain(final.games).map(g => g.label), ['Final', 'Disputa do 3º lugar']);
    assert.equal(new Set(plain(cup.podium)).size, 4, 'pódio com 4 times diferentes');
    // vencedor de cada jogo = maior pontuação da semana
    plain(cup.rounds).forEach(r => r.games.forEach(g => {
        if (g.pa !== g.pb) assert.equal(g.winner, g.pa > g.pb ? 'a' : 'b');
    }));
});

test('Copa: antes da classificatória fechar não há chave', () => {
    const cup = T.resolveCup({ qualifying: 12, bracket: 32, seed: 's' }, keys(40), {}, { leg: 12, lastScored: 11 });
    assert.equal(cup.qualifying.status, 'live');
    assert.equal(cup.rounds.length, 0);
    assert.equal(cup.podium, null);
});

// ---------------------------------------------------------------------------
// Chances (Monte Carlo)
// ---------------------------------------------------------------------------

test('Chances: mesma semente = mesmo resultado; soma das chances = vagas', () => {
    const rosterIds = Array.from({ length: 10 }, (_, i) => i + 1);
    const weeks = 14, scored = 6;
    const scores = Array.from({ length: scored }, (_, w) => Object.fromEntries(rosterIds.map(r => [r, 90 + ((r * 13 + w * 7) % 60)])));
    const pairs = Array.from({ length: weeks }, (_, w) => [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]].map(([a, b]) => [((a + w) % 10) + 1, ((b + w) % 10) + 1]));
    const { teams, schedule } = T.buildOddsInput(rosterIds, scores, pairs, scored);
    const run = () => plain(T.simulateOdds({ teams, schedule, spots: 6, relegate: 3, seed: T.seedFrom('liga|6') }));
    const a = run(), b = run();
    assert.deepEqual(a, b);
    const sumPlayoffs = Object.values(a).reduce((s, o) => s + o.playoffs, 0);
    const sumReleg = Object.values(a).reduce((s, o) => s + o.releg, 0);
    assert.ok(Math.abs(sumPlayoffs - 6) < 1e-6, `playoffs somam ${sumPlayoffs}`);
    assert.ok(Math.abs(sumReleg - 3) < 1e-6, `queda soma ${sumReleg}`);
});

// ---------------------------------------------------------------------------
// Copa KHC · formato Champions
// ---------------------------------------------------------------------------

const uclTeams = divs => divs.flatMap(t => Array.from({ length: 10 }, (_, i) => ({ key: `${t}:${i}`, tier: t })));
const UCL_KO = { playoff: [9, 10], r16: [11, 12], qf: [13, 14], sf: [15, 16], final: [17] };

for (const [label, divs, pots, perPot] of [
    ['40 times, 2 potes', ['serie-a', 'serie-b', 'serie-c', 'serie-d'], [['serie-a', 'serie-b'], ['serie-c', 'serie-d']], 3],
    ['60 times, 3 potes', ['serie-a', 'serie-b', 'serie-c', 'serie-d', 'serie-e', 'serie-f'], [['serie-a', 'serie-b'], ['serie-c', 'serie-d'], ['serie-e', 'serie-f']], 2]
]) {
    test(`Champions: sorteio da fase de liga (${label})`, () => {
        const teams = uclTeams(divs);
        const tierOf = Object.fromEntries(teams.map(t => [t.key, t.tier]));
        const potOf = k => pots.findIndex(p => p.includes(tierOf[k]));
        const weeks = plain(T.drawUclLeague(teams, { pots, perPot, seed: 's' }));
        assert.deepEqual(weeks, plain(T.drawUclLeague(teams, { pots, perPot, seed: 's' })), 'reproduzível');
        assert.equal(weeks.length, pots.length * perPot);
        const opp = {};
        weeks.forEach(week => {
            const seen = new Set(week.flat());
            assert.equal(seen.size, teams.length, 'todos jogam toda semana, uma vez');
            week.forEach(([a, b]) => {
                assert.notEqual(tierOf[a], tierOf[b], 'nunca a própria divisão');
                (opp[a] = opp[a] || []).push(b);
                (opp[b] = opp[b] || []).push(a);
            });
        });
        teams.forEach(t => {
            assert.equal(new Set(opp[t.key]).size, opp[t.key].length, 'sem repetir adversário');
            pots.forEach((_, i) => assert.equal(opp[t.key].filter(o => potOf(o) === i).length, perPot, 'cota por pote'));
        });
    });
}

test('Champions: tabela, playoff 9×24…16×17, chave pela posição e pódio', () => {
    const divs = ['serie-a', 'serie-b', 'serie-c', 'serie-d'];
    const teams = uclTeams(divs);
    const cfg = { pots: [['serie-a', 'serie-b'], ['serie-c', 'serie-d']], perPot: 3, seed: 's', leagueWeeks: [3, 4, 5, 6, 7, 8], knockout: UCL_KO };
    // força: quanto menor o índice, mais pontos (resultado previsível)
    const strength = Object.fromEntries(teams.map((t, i) => [t.key, 200 - i * 3]));
    const scores = {};
    for (let w = 3; w <= 17; w++) scores[w] = Object.fromEntries(teams.map(t => [t.key, strength[t.key] + (w % 3)]));
    const cup = plain(T.resolveUcl(cfg, teams, scores, { leg: 17, lastScored: 17 }));
    assert.equal(cup.leagueStatus, 'final');
    assert.equal(cup.table.length, 40);
    cup.table.forEach(r => assert.equal(r.j, 6));
    const seeds = cup.table.map(r => r.key);
    const playoff = cup.rounds.find(r => r.key === 'playoff');
    assert.deepEqual(playoff.games.map(g => [g.a, g.b]), Array.from({ length: 8 }, (_, i) => [seeds[8 + i], seeds[23 - i]]));
    const r16 = cup.rounds.find(r => r.key === 'r16');
    assert.deepEqual(r16.games.map(g => g.a), [1, 8, 4, 5, 2, 7, 3, 6].map(s => seeds[s - 1]));
    // 1º e 2º em lados opostos: só podem se cruzar na final
    const sf = cup.rounds.find(r => r.key === 'sf');
    assert.equal(sf.games[0].a, seeds[0]);
    assert.equal(sf.games[1].a, seeds[1]);
    assert.equal(new Set(cup.podium).size, 4);
    assert.equal(cup.podium[0], seeds[0], 'o mais forte vence');
    // empate no agregado: melhor posição na fase de liga
    const g = cup.rounds.flatMap(r => r.games).find(x => x.ta === x.tb && x.winner);
    if (g) {
        const pos = k => seeds.indexOf(k);
        assert.equal(g.winner, pos(g.a) < pos(g.b) ? 'a' : 'b');
    }
});
