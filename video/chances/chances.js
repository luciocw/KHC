// =============================================================================
// Vídeos extras "Corrida aos playoffs" e "Luta contra o rebaixamento".
//
// Dados: cenarios.json (cenarios.py: V–D, PF, os 3 jogos que faltam e o que
// cada time precisa, com 100% de certeza), data.json (logos) e CHANCES (as %
// do site após a rodada 11, dos prints enviados pelo usuário).
// A página define window.MODO = 'playoffs' | 'queda' antes de carregar este arquivo.
// =============================================================================
(async () => {
const C = await (await fetch('cenarios.json')).json();
const data = await (await fetch('data.json')).json();
const { el, set, prog, lerp, ease, enter, blink, LEAGUE } = KHC;
const MODO = window.MODO;
const LBL = { elite: 'Elite', 'serie-a': 'Série A', 'serie-b': 'Série B', 'serie-c': 'Série C', 'serie-d': 'Série D' };
const AV = {};
data.leagues.forEach(l => l.matchups.flat().forEach(t => { AV[l.tier + '|' + t.name] = t.avatar; }));
// chances do site após a rodada 11: [playoffs, queda] (">99%" = 100, "<1%" = 0)
const CH = {
    elite: { 'GORDINHAS AJEITADAS': [100], 'Los Pollos Hermanos': [100], 'Poker do Neymar': [98], 'Diogoashura': [61],
             'Public Enemy #1': [23], 'Fofura e Fé': [17], 'Quack Attack': [2], 'Timbatível': [0] },
    'serie-a': { 'VoliBEARS': [100, 0], 'Public Enemy #1': [100, 0], 'Timbatível': [100, 0], 'Imperius Rex FC': [89, 4],
                 'سانتا کروز': [79, 11], 'Fofura e Fé': [71, 13], 'Los Pollos Hermanos': [30, 44], 'Caipiracicaba': [19, 60],
                 'Diogoashura': [13, 72], 'Cruzeiro do Neymar SFC': [0, 96] },
    'serie-b': { 'RegisCarrara': [100, 0], 'GORDINHAS AJEITADAS': [100, 0], 'Quack Attack': [100, 0], 'Explosion Raiders': [97, 0],
                 'SiaraBigheads': [86, 0], 'alb2106': [74, 2], 'BigFieldMS': [43, 3], 'Ceará Dolphins': [0, 98],
                 'wladspfc': [0, 98], 'Gumagol971': [0, 100] },
    'serie-c': { 'joaoW7': [100, 0], 'San Andreas Chiefs': [100, 0], 'Fogo na Bomba': [99, 0], 'Mangue Chiefs 🦀': [100, 0],
                 '086 Football': [81, 1], 'DMK Steel Curtain': [74, 2], 'Pandemônio FC': [44, 8], 'WI Redentor': [1, 90],
                 'romanerinha': [0, 99], 'Kelce Gremista': [0, 100] },
    'serie-d': { 'LeandroGaucho': [100], 'VitorM05': [100], 'New England Patriotas': [100], 'Green N Gold': [99],
                 'Just Maried': [71], 'polvorje': [51], 'Claudianosilva': [37], 'Elieser': [37], 'DH8 Red&Gold': [4], 'Correia49 KHC': [2] },
};
const pct = v => (v >= 100 ? '>99%' : v <= 0 ? '<1%' : v + '%');

/** O que o time precisa (texto e cor), a partir de cenarios.json. */
function precisa(n, modo) {
    if (!n) return null;
    const { garante_com: g, vivo_a_partir_de: v } = n;
    const alvo = modo === 'playoffs' ? 'DENTRO' : 'SALVO';
    if (g === 0) return [modo === 'playoffs' ? 'JÁ ESTÁ DENTRO' : 'JÁ ESTÁ SALVO', 'ok'];
    if (g !== null && g !== undefined) return [`VENCE ${g} → ${alvo}`, 'go'];
    if (v === null || v === undefined) return [modo === 'playoffs' ? 'ELIMINADO' : 'REBAIXADO', 'no'];
    if (v === 0) return ['DEPENDE DOS OUTROS', 'mid'];
    return [`${v}+ VITÓRIA${v > 1 ? 'S' : ''} E AJUDA`, 'risk'];
}

// ------------------------------------------------------------- estilos
const css = document.createElement('style');
css.textContent = `
.ch-k { position: absolute; left: 60px; top: 236px; font-family: Mono; font-size: 30px; letter-spacing: 4px; color: var(--gold, #F2B705); }
.ch-t { position: absolute; left: 60px; right: 260px; top: 280px; font-weight: 900; font-size: 92px; line-height: .95; letter-spacing: -2px; text-transform: uppercase; color: var(--c); }
.ch-crest { position: absolute; right: 60px; top: 225px; width: 170px; height: 170px; object-fit: contain; }
.ch-sub { position: absolute; left: 60px; right: 260px; top: 382px; font-family: Mono; font-size: 24px; letter-spacing: 2px; color: var(--text-3); white-space: nowrap; }
.ch-h { position: absolute; left: 44px; right: 44px; top: 430px; display: grid; grid-template-columns: 46px 64px 1fr 150px 112px; gap: 12px;
    font-family: Mono; font-size: 20px; letter-spacing: 2px; color: var(--text-3); }
.ch-list { position: absolute; left: 36px; right: 36px; top: 464px; display: flex; flex-direction: column; gap: 6px; }
.ch-r { position: relative; display: grid; grid-template-columns: 46px 64px 1fr 150px 112px; gap: 12px; align-items: center; min-height: 106px;
    padding: 6px 14px; border-radius: 14px; background: rgba(22,19,17,.94); border: 2px solid #2a2420; }
.ch-r .p { font-family: Mono; font-size: 34px; color: var(--text-3); text-align: center; }
.ch-r .av { width: 62px; height: 62px; border-radius: 14px; overflow: hidden; } .ch-r .av img { width: 100%; height: 100%; object-fit: cover; }
.ch-r .mid { min-width: 0; }
.ch-r .nm { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ch-r .nm b { font-weight: 800; font-size: 36px; font-stretch: 85%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ch-r .need { flex: none; margin-left: auto; font-family: Mono; font-weight: 700; font-size: 18px; letter-spacing: 1px; padding: 5px 8px; border-radius: 6px; white-space: nowrap; }
.need.ok { background: #3DD68C; color: #05210f; } .need.go { background: #F2B705; color: #1a1208; } .need.mid { background: #5a4f46; color: #fff; }
.need.risk { background: #F26A1B; color: #120a05; } .need.no { background: #EB4034; color: #fff; }
.ch-r .opp { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.ch-r .o { display: flex; align-items: center; gap: 5px; font-family: Mono; font-size: 21px; color: var(--text-2); padding: 3px 7px 3px 3px; border-radius: 8px; background: #1d1916; border: 1px solid #3A322C; }
.ch-r .o img { width: 32px; height: 32px; border-radius: 7px; object-fit: cover; }
.ch-r .o.hot { border: 2px solid #F26A1B; color: #120a05; background: #F26A1B; font-weight: 700; }
.ch-r .st { text-align: right; } .ch-r .st b { display: block; font-family: Mono; font-size: 38px; color: #fff; }
.ch-r .st span { font-family: Mono; font-size: 20px; color: var(--text-3); }
.ch-r .pc { text-align: right; font-family: Mono; font-size: 36px; font-weight: 700; }
.ch-r .bar { position: absolute; left: 0; bottom: 0; height: 5px; border-radius: 0 0 0 12px; width: 0; }
.ch-r.zone { background: rgba(60,14,14,.92); border-color: #6a201c; }
.ch-cut { position: relative; height: 0; border-top: 4px dashed var(--c); margin: 4px 0; }
.ch-cut span { position: absolute; right: 12px; top: -14px; background: var(--bg); padding: 0 10px; font-family: Mono; font-size: 20px; letter-spacing: 2px; color: var(--c); }
.ch-cut.red { border-color: #EB4034; } .ch-cut.red span { color: #EB4034; }
.ch-leg { position: absolute; left: 50px; right: 50px; display: flex; flex-direction: column; gap: 18px; }
.ch-leg div { display: flex; align-items: center; gap: 18px; font-weight: 800; font-size: 40px; opacity: 0; }
.ch-leg .need { font-size: 26px; padding: 10px 14px; flex: none; }
.ch-leg .o { font-family: Mono; font-size: 26px; padding: 8px 12px; border-radius: 8px; border: 2px solid #F26A1B; background: #1d1916; color: #fff; flex: none; }
.ch-leg .o.hot { background: #F26A1B; color: #120a05; font-weight: 700; }
.big-n { position: absolute; left: 0; right: 0; text-align: center; font-family: Pixel; font-size: 300px; line-height: 1; text-shadow: 12px 12px 0 #000; }
`;
document.head.appendChild(css);

// ------------------------------------------------------------- cenas
const hud = root => KHC.hud(root, MODO === 'playoffs' ? 'PLAYOFFS' : 'QUEDA', []);
const RIVAL = { playoffs: (tier, a, b) => false, queda: null };

/** Tabela de uma liga: todos os times, % do site, os 3 jogos que faltam e o que precisa. */
function leagueScene(a, D, tier, cfg) {
    KHC.scene(a, a + D, root => {
        const s = root.s = {};
        const L = C[tier], c = LEAGUE[tier].color;
        root.style.setProperty('--c', c);
        hud(root);
        el('div', 'ch-k', root, cfg.kicker);
        el('div', 'ch-t', root, LBL[tier]);
        s.cr = el('img', 'ch-crest', root); s.cr.src = LEAGUE[tier].crest;
        el('div', 'ch-sub', root, cfg.sub);
        el('div', 'ch-h', root, `<span>#</span><span></span><span>TIME · R12 · R13 · R14</span><span style="text-align:right">V–D · PF</span><span style="text-align:right">${MODO === 'playoffs' ? 'PLAYOFFS' : 'QUEDA'}</span>`);
        const box = el('div', 'ch-list', root);
        const teams = cfg.from ? L.teams.slice(cfg.from - 1) : L.teams;
        const n = L.teams.length;
        // rivais diretos: times na mesma briga (dentro da janela mostrada)
        const inFight = new Set(teams.filter(t => (CH[tier][t.name][MODO === 'playoffs' ? 0 : 1] ?? 0) > 0 && (CH[tier][t.name][MODO === 'playoffs' ? 0 : 1] ?? 0) < 100).map(t => t.name));
        s.rows = [];
        teams.forEach((t, i) => {
            const pos = L.teams.indexOf(t) + 1;
            if (MODO === 'playoffs' && pos === L.vagas + 1) el('div', 'ch-cut', box, '<span>PLAYOFFS ▲</span>');
            if (MODO === 'queda' && pos === n - L.caem + 1) el('div', 'ch-cut red', box, '<span>ZONA DE QUEDA ▼</span>');
            const zone = MODO === 'queda' && pos > n - L.caem;
            const r = el('div', 'ch-r' + (zone ? ' zone' : ''), box);
            el('div', 'p', r, pos);
            el('div', 'av', r, `<img src="${AV[tier + '|' + t.name]}">`);
            const need = precisa(MODO === 'playoffs' ? t.playoffs : t.queda, MODO);
            const opp = t.jogos.map(j => `<div class="o${inFight.has(j.vs) && inFight.has(t.name) ? ' hot' : ''}"><img src="${AV[tier + '|' + j.vs]}">${j.w}–${j.l}</div>`).join('');
            el('div', 'mid', r, `<div class="nm"><b>${KHC.esc(t.name)}</b></div><div class="opp">${opp}<span class="need ${need[1]}">${need[0]}</span></div>`);
            el('div', 'st', r, `<b>${t.w}–${t.l}</b><span>${t.pf.toFixed(1)}</span>`);
            const v = CH[tier][t.name][MODO === 'playoffs' ? 0 : 1];
            const pc = el('div', 'pc', r, '0%');
            const good = MODO === 'playoffs' ? v >= 80 : v <= 5, bad = MODO === 'playoffs' ? v < 20 : v >= 50;
            pc.style.color = good ? '#3DD68C' : bad ? '#ff5a4e' : '#fff';
            const bar = el('div', 'bar', r); bar.style.background = MODO === 'playoffs' ? c : '#EB4034';
            r.pc = pc; r.bar = bar; r.v = v;
            s.rows.push(r);
        });
        s.st = KHC.stamp(root, cfg.stamp, { top: cfg.stampTop || 1655, right: 50, rot: -2 }); s.st.style.fontSize = '32px';
        s.cap = KHC.caption(root, cfg.caption[0], cfg.caption[1]);
        s.cap.c.style.top = (cfg.capTop || 1730) + 'px';
        s.cap.a.style.fontSize = s.cap.b.style.fontSize = '48px';
    }, (lt, t, root) => {
        const s = root.s;
        const p = enter(lt, .05, .45, ease.back); set(s.cr, { s: p, r: (1 - p) * -30 });
        s.rows.forEach((r, i) => {
            const e = enter(t, a + .5 + i * .08, .35); set(r, { o: Math.min(1, e * 1.6), x: (1 - e) * (i % 2 ? 700 : -700) });
            const q = ease.out(prog(t, a + 1.4, a + 2.4));
            r.pc.textContent = q >= 1 ? pct(r.v) : Math.round(r.v * q) + '%';
            r.bar.style.width = (Math.min(100, r.v) * q) + '%';
        });
        KHC.drawStamp(s.st, t, a + 2.8);
        KHC.drawCaption(s.cap, t, a + 3.2);
    });
}

/** Abertura: título, "faltam 3" e a legenda dos selos. */
function intro(D, title, color) {
    KHC.scene(0, D, root => {
        const s = root.s = {};
        hud(root);
        s.k = el('div', 'ch-k', root, 'ESPECIAL · FALTAM 3 RODADAS');
        s.k.style.top = '240px';
        s.t = el('div', 'ch-t', root, title); s.t.style.right = '60px'; s.t.style.color = color; s.t.style.fontSize = '120px'; s.t.style.top = '290px';
        s.n = el('div', 'big-n', root, '3'); s.n.style.top = '560px'; s.n.style.color = color;
        const lg = el('div', 'ch-leg', root); lg.style.top = '960px';
        const items = MODO === 'playoffs'
            ? [['<span class="need ok">JÁ ESTÁ DENTRO</span>', 'Garantido com 100%.'],
               ['<span class="need go">VENCE 2 → DENTRO</span>', 'Vencendo 2, entra sem depender de ninguém.'],
               ['<span class="need mid">DEPENDE DOS OUTROS</span>', 'Nem vencendo tudo garante.'],
               ['<span class="need risk">2+ VITÓRIAS E AJUDA</span>', 'Tem que vencer e torcer.'],
               ['<span class="need no">ELIMINADO</span>', 'Já não alcança.'],
               ['<span class="o">7–4</span>', 'Os 3 próximos adversários e o V–D deles.']]
            : [['<span class="need ok">JÁ ESTÁ SALVO</span>', 'Garantido com 100%.'],
               ['<span class="need go">VENCE 2 → SALVO</span>', 'Vencendo 2, escapa sem depender de ninguém.'],
               ['<span class="need risk">2+ VITÓRIAS E AJUDA</span>', 'Tem que vencer e torcer.'],
               ['<span class="o hot">3–8</span>', 'Em laranja: confronto direto na briga.']];
        s.items = items.map(([a, b]) => el('div', '', lg, `${a}<span>${b}</span>`));
        s.foot = el('div', 'ch-sub', root, '100% = vale em todos os resultados possíveis das rodadas 12, 13 e 14. Empate em vitórias não conta: o desempate é por pontos.');
        s.foot.style.top = '1600px'; s.foot.style.lineHeight = '1.4'; s.foot.style.fontSize = '30px'; s.foot.style.whiteSpace = 'normal'; s.foot.style.right = '60px';
    }, (lt, t, root, wall) => {
        const s = root.s;
        set(s.k, { o: lt < .8 ? blink(lt, .12) : 1 });
        const p = enter(lt, .1, .45, ease.back); set(s.t, { o: Math.min(1, p * 2), y: (1 - p) * -60 });
        const n = enter(lt, .4, .4, ease.back); set(s.n, { o: n > 0 ? 1 : 0, s: lerp(2.5, 1, n) * (1 + Math.sin(wall * 6) * .015) });
        s.items.forEach((e, i) => { const q = enter(lt, 1.2 + i * .35, .35); set(e, { o: q, x: (1 - q) * -200 }); });
        set(s.foot, { o: enter(lt, 1.2 + s.items.length * .35, .4) });
    });
}

/** Fim: gancho para a Prévia S12. */
function outro(a, D, l1, l2) {
    KHC.scene(a, a + D, root => {
        const s = root.s = {};
        hud(root);
        s.k = el('div', 'end-k', root, 'PRÉVIA · SEMANA 12');
        s.l1 = el('div', 'end-1', root, l1);
        s.l2 = el('div', 'end-2', root, l2);
        s.logo = el('img', 'end-logo', root); s.logo.src = LEAGUE.khc.crest;
    }, (lt, t, root) => {
        const s = root.s;
        set(s.k, { o: enter(lt, .1, .3) });
        const p = enter(lt, .3, .45, ease.back); set(s.l1, { o: Math.min(1, p * 2), y: (1 - p) * 80 });
        const b = enter(lt, 1.3, .35, ease.back); set(s.l2, { o: b > 0 ? 1 : 0, s: lerp(1.8, 1, b), r: (1 - b) * -8 });
        const l = enter(lt, 2.1, .5, ease.elastic); set(s.logo, { s: l });
    });
}

window.CH_API = { leagueScene, intro, outro, C, CH };
window.dispatchEvent(new Event('chances-ready'));
})();
