// =============================================================================
// Motor dos vídeos curtos da KHC (9:16, 1080×1920).
//
// A página é uma "timeline": window.seek(t) desenha o quadro do instante t
// (em segundos), sem depender de relógio. O render.cjs chama seek() quadro a
// quadro e grava com o ffmpeg; no navegador, ?play toca em tempo real.
//
// Cada vídeo define cenas: KHC.scene(início, fim, montar, desenhar). `montar`
// cria o DOM uma vez; `desenhar(lt, t, root)` recebe o tempo local da cena.
// =============================================================================
(function () {
    const W = 1080, H = 1920;
    const LEAGUE = {
        elite: { color: '#F2B705', crest: '../../assets/logo/png/escudo-elite.png' },
        'serie-a': { color: '#F26A1B', crest: '../../assets/logo/png/escudo-serie-a.png' },
        'serie-b': { color: '#E5383B', crest: '../../assets/logo/png/escudo-serie-b.png' },
        'serie-c': { color: '#3B82F6', crest: '../../assets/logo/png/escudo-serie-c.png' },
        'serie-d': { color: '#22C55E', crest: '../../assets/logo/png/escudo-serie-d.png' },
        khc: { color: '#F26A1B', crest: '../../assets/logo/png/escudo-khc.png' },
    };

    // ---------------------------------------------------------------- tempo
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const prog = (t, a, b) => clamp((t - a) / (b - a));
    const lerp = (a, b, p) => a + (b - a) * p;
    const ease = {
        out: p => 1 - Math.pow(1 - p, 3),
        inOut: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
        back: p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
        elastic: p => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - .75) * 2.094) + 1),
    };
    /** Entra em [a, a+d] com a curva dada; 0 antes, 1 depois. */
    const enter = (t, a, d = .35, curve = ease.out) => curve(prog(t, a, a + d));
    /** Pisca: 1/0 alternando a cada `period` segundos. */
    const blink = (t, period = .25) => (Math.floor(t / period) % 2 === 0 ? 1 : 0);
    /** Tremida determinística (sem Math.random, para o render ser estável). */
    const shake = (t, a, d, amp) => {
        const p = prog(t, a, a + d);
        if (p <= 0 || p >= 1) return [0, 0];
        const k = amp * (1 - p);
        return [Math.sin(t * 97) * k, Math.cos(t * 83) * k];
    };

    // ------------------------------------------------------------------ DOM
    const el = (tag, cls, parent, html) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        if (parent) parent.appendChild(e);
        return e;
    };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    /** Aplica transformação/opacidade de uma vez. */
    const set = (e, { o, x = 0, y = 0, s = 1, sx, sy, r = 0, f } = {}) => {
        if (o !== undefined) e.style.opacity = o;
        e.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sx ?? s}, ${sy ?? s})`;
        if (f !== undefined) e.style.filter = f;
    };
    const fmt = v => (Math.round(v * 10) / 10).toFixed(1);

    // ------------------------------------------------------------- cenas
    const scenes = [];
    let stage;
    function scene(a, b, build, draw) { scenes.push({ a, b, build, draw, root: null }); }

    function mount() {
        stage = document.getElementById('stage');
        for (const s of scenes) {
            s.root = el('div', 'scene', stage);
            s.build(s.root);
        }
    }

    const overlays = [];  // desenhados por cima de tudo (transições, HUD…)
    function overlay(draw) { overlays.push(draw); }

    function seek(t) {
        for (const s of scenes) {
            const on = t >= s.a && t < s.b;
            s.root.style.display = on ? 'block' : 'none';
            if (on) s.draw(t - s.a, t, s.root);
        }
        for (const d of overlays) d(t);
    }

    // --------------------------------------------------------- componentes
    /** HUD de jogo: logo, "SEMANA 5 · TNF" e barra de fases coloridas. */
    function hud(parent, label, phases) {
        const h = el('div', 'hud', parent);
        el('img', 'hud-logo', h).src = LEAGUE.khc.crest;
        el('div', 'hud-brand', h, 'ULTIMATE LEAGUE<br><b>KHC</b>');
        el('div', 'hud-pill', h, esc(label));
        const bar = el('div', 'hud-phases', parent);
        const segs = phases.map(p => {
            const sg = el('div', 'hud-seg', bar);
            sg.style.setProperty('--c', LEAGUE[p].color);
            return sg;
        });
        return { h, bar, segs };
    }

    /** Card de confronto com dois times. Times: {name, record, points, avatar}. */
    function matchCard(parent, pair, color) {
        const card = el('div', 'card', parent);
        card.style.setProperty('--c', color);
        const rows = pair.map(tm => {
            const row = el('div', 'row', card);
            const av = el('div', 'av', row);
            if (tm.avatar) el('img', '', av).src = tm.avatar;
            else av.textContent = tm.name.slice(0, 1);
            const who = el('div', 'who', row);
            const name = el('div', 'name', who, esc(tm.name));
            const rec = el('div', 'rec', who, esc(tm.record.replace('-', '–')));
            const pts = el('div', 'pts', row, '0.0');
            return { row, av, name, rec, pts, team: tm };
        });
        const best = Math.max(...pair.map(x => x.points));
        rows.forEach(r => { r.leader = r.team.points === best && best > 0; });
        return { card, rows };
    }

    /** Atualiza os pontos contando de 0 até o valor em [a, b]. */
    function countPoints(card, t, a, b) {
        const p = ease.out(prog(t, a, b));
        for (const r of card.rows) {
            r.pts.textContent = fmt(r.team.points * p);
            r.pts.classList.toggle('lead', p >= 1 && r.leader);
            r.pts.classList.toggle('zero', p >= 1 && r.team.points === 0);
        }
    }

    /** Selo de zoeira que "carimba" em `a`. */
    function stamp(parent, text, { rot = -4, top = 0, right = 24 } = {}) {
        const s = el('div', 'stamp', parent, esc(text));
        s.style.top = top + 'px';
        s.style.right = right + 'px';
        s.dataset.rot = rot;
        return s;
    }
    function drawStamp(s, t, a) {
        if (t < a) { s.style.opacity = 0; return; }
        const p = prog(t, a, a + .22);
        const sc = lerp(2.4, 1, ease.out(p)) + Math.sin(prog(t, a + .22, a + .5) * Math.PI) * .06;
        set(s, { o: Math.min(1, p * 3), s: sc, r: +s.dataset.rot });
    }

    /** Legenda de baixo em duas linhas (branca + laranja). */
    function caption(parent, l1, l2) {
        const c = el('div', 'caption', parent);
        const a = el('div', 'cap1', c, esc(l1));
        const b = el('div', 'cap2', c, esc(l2 || ''));
        return { c, a, b };
    }
    function drawCaption(cap, t, a, gap = .45) {
        const p1 = enter(t, a, .4), p2 = enter(t, a + gap, .4);
        set(cap.a, { o: p1, y: (1 - p1) * 40 });
        set(cap.b, { o: p2, y: (1 - p2) * 40 });
    }

    /** Transição: faixa diagonal na cor da fase, com o escudo, pico em `peak`. */
    function wipe(peak, league) {
        const w = el('div', 'wipe', document.getElementById('fx'));
        w.style.setProperty('--c', LEAGUE[league].color);
        const crest = el('img', 'wipe-crest', w);
        crest.src = LEAGUE[league].crest;
        overlay(t => {
            const p = prog(t, peak - .35, peak + .35);
            if (p <= 0 || p >= 1) { w.style.display = 'none'; return; }
            w.style.display = 'block';
            // entra pela direita, cobre a tela no pico e sai pela esquerda
            const x = lerp(1.25, -1.25, ease.inOut(p)) * W;
            set(w, { x });
            set(crest, { s: .9 + Math.sin(p * Math.PI) * .25, r: lerp(-15, 15, p) });
        });
    }

    /** Fade para preto no fim. */
    function fadeOut(a, b) {
        const f = el('div', 'fade', document.getElementById('fx'));
        overlay(t => { f.style.opacity = prog(t, a, b); });
    }

    async function ready() {
        await document.fonts.ready;
        await Promise.all([...document.images].map(img => img.complete ? null :
            new Promise(r => { img.onload = img.onerror = r; })));
    }

    function start(duration) {
        mount();
        window.seek = seek;
        window.duration = duration;
        window.ready = ready;
        const q = new URLSearchParams(location.search);
        if (q.has('t')) seek(parseFloat(q.get('t')));
        else if (q.has('play')) {
            const t0 = performance.now();
            const loop = () => { const t = (performance.now() - t0) / 1000; seek(t % duration); requestAnimationFrame(loop); };
            loop();
        } else seek(0);
    }

    window.KHC = { W, H, LEAGUE, clamp, prog, lerp, ease, enter, blink, shake, el, esc, set, fmt,
        scene, overlay, hud, matchCard, countPoints, stamp, drawStamp, caption, drawCaption,
        wipe, fadeOut, start };
})();
