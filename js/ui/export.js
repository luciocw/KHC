// =============================================================================
// UI / EXPORT — Exporta como imagem (PNG): a classificação (Ligas), os
// confrontos (Rodada) ou o chaveamento de uma série, o Power Ranking ou o
// perfil de um jogador.
//
// A tabela é redesenhada num <canvas> com largura fixa (sempre com a coluna
// PC, mesmo no celular), no visual do card da aba Ligas. Cores lidas dos
// tokens CSS (:root), fonte Archivo já carregada pela página.
//
//   - Baixar: khc-<ano>-<série>.png (desktop e celular).
//   - Compartilhar: Web Share com arquivo, só onde o navegador suporta.
//
// Avatares vêm da Sleeper CDN (CORS *); se algum falhar, usa iniciais.
// Depende de: config, sanitize, ui/helpers, tabs/ligas (standingsModel, zoneOf,
// zoneLegendItems), tabs/rodada (currentRound, roundModel), tabs/temporadas (weekLabel)
// =============================================================================

const EXPORT_W = 814;          // largura em px CSS (igual ao card no desktop)
const EXPORT_SCALE = 2;        // PNG em 2× para ficar nítido no celular
const EXPORT_IMG_TIMEOUT = 4000;

/** Valor de um token CSS do :root. */
function cssToken(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Carrega uma imagem para o canvas; resolve null em erro ou timeout.
 * @param {string} src
 * @param {boolean} cors
 * @returns {Promise<HTMLImageElement|null>}
 */
function loadExportImage(src, cors) {
    return new Promise(resolve => {
        const img = new Image();
        if (cors) img.crossOrigin = 'anonymous';
        const timer = setTimeout(() => resolve(null), EXPORT_IMG_TIMEOUT);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = src;
    });
}

/** Define a fonte (com largura variável quando o navegador suporta). */
function setFont(ctx, weight, size, stretch) {
    ctx.font = `${weight} ${size}px Archivo, -apple-system, "Helvetica Neue", Arial, sans-serif`;
    if ('fontStretch' in ctx) ctx.fontStretch = stretch || 'normal';
}

/** Corta o texto com reticências para caber em maxW. */
function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
}

/** Quebra o texto em até `max` linhas que caibam em maxW (a última com …). */
function wrapLines(ctx, text, maxW, max) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    words.forEach(wd => {
        const next = cur ? `${cur} ${wd}` : wd;
        if (ctx.measureText(next).width <= maxW || !cur) cur = next;
        else { lines.push(cur); cur = wd; }
    });
    if (cur) lines.push(cur);
    if (lines.length <= max) return lines;
    const head = lines.slice(0, max - 1);
    return [...head, fitText(ctx, lines.slice(max - 1).join(' '), maxW)];
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function hLine(ctx, x1, x2, y, color, dashed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(dashed ? [4, 3] : []);
    ctx.beginPath();
    ctx.moveTo(x1, y + 0.5);
    ctx.lineTo(x2, y + 0.5);
    ctx.stroke();
    ctx.restore();
}

/** Medalha (círculo com gradiente, número dentro), como .medal--N. */
function drawMedal(ctx, cx, cy, pos, c) {
    const [hi, deep] = c.medals[pos - 1];
    const g = ctx.createRadialGradient(cx - 4, cy - 5, 1, cx, cy, 15);
    g.addColorStop(0, hi);
    g.addColorStop(1, deep);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = c.bg;
    setFont(ctx, 900, 14, 'condensed');
    ctx.textAlign = 'center';
    ctx.fillText(String(pos), cx, cy + 1);
    ctx.textAlign = 'left';
}

/** Avatar arredondado (34px por padrão): foto ou iniciais. */
function drawAvatar(ctx, x, y, img, name, c, size) {
    const s = size || 34;
    ctx.save();
    roundRect(ctx, x, y, s, s, s > 40 ? 12 : 8);
    ctx.fillStyle = c.surface3;
    ctx.fill();
    ctx.clip();
    if (img) {
        const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
        const w = img.naturalWidth * k;
        const h = img.naturalHeight * k;
        ctx.drawImage(img, x + (s - w) / 2, y + (s - h) / 2, w, h);
    } else {
        ctx.fillStyle = c.text2;
        setFont(ctx, 900, Math.round(s * 0.38), 'condensed');
        ctx.textAlign = 'center';
        ctx.fillText(initialsOf(name), x + s / 2, y + s / 2 + 1);
        ctx.textAlign = 'left';
    }
    ctx.restore();
}

/** Cores do card (tokens CSS), com o acento da liga. */
function exportPalette(meta) {
    return {
        bg: cssToken('--bg'), surface: cssToken('--surface'), surface2: cssToken('--surface-2'), surface3: cssToken('--surface-3'),
        border: cssToken('--border'), border2: cssToken('--border-2'),
        text: cssToken('--text'), text2: cssToken('--text-2'), text3: cssToken('--text-3'),
        accent: (meta && cssToken(`--league-${meta.league}`)) || cssToken('--orange'),
        promo: cssToken('--zone-promo'), playoff: cssToken('--zone-playoff'), releg: cssToken('--zone-releg'),
        promoBg: cssToken('--zone-promo-bg'), relegBg: cssToken('--zone-releg-bg'),
        live: cssToken('--live'),
        medals: ['gold', 'silver', 'bronze', 'fourth'].map(k => [cssToken(`--${k}`), cssToken(`--${k}-deep`)])
    };
}

/**
 * Espera a fonte e carrega escudo + avatares (null onde falhar).
 * @param {Object} meta  SERIES_META[tier]
 * @param {Array<string|null>} avatarIds
 * @returns {Promise<{crest: (HTMLImageElement|null), avatars: Array<HTMLImageElement|null>}>}
 */
async function loadExportAssets(meta, avatarIds) {
    if (document.fonts && document.fonts.load) {
        await Promise.all(['400 15px Archivo', '700 15px Archivo', '800 12px Archivo', '900 20px Archivo']
            .map(f => document.fonts.load(f).catch(() => null)));
    }
    const crestFile = meta ? meta.crest : 'escudo-khc.png';
    const [crest, ...avatars] = await Promise.all([
        loadExportImage(`assets/logo/png/${crestFile}`, false),
        ...avatarIds.map(id => (isValidAvatar(id)
            // ?export: URL distinta da <img> da página, cuja cópia em cache veio
            // sem cabeçalho CORS (a CDN só o envia quando há Origin)
            ? loadExportImage(`${sanitizeAvatarUrl(id)}?export`, true)
            : Promise.resolve(null)))
    ]);
    return { crest, avatars };
}

const EXPORT_HEAD_H = 92;

/**
 * Canvas com o card (fundo, filete da liga, escudo, nome e subtítulo).
 * `logo` opcional ({w, draw(ctx, x, y)}) substitui o escudo (ex.: avatar).
 * `W`: largura em px CSS (padrão EXPORT_W).
 * Deixa o contexto recortado no card; feche com finishExportCard().
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
function startExportCard(H, c, crest, title, subtitle, logo, W = EXPORT_W) {
    const PAD = 16;
    const canvas = document.createElement('canvas');
    canvas.width = W * EXPORT_SCALE;
    canvas.height = H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.textBaseline = 'middle';

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 8);
    ctx.fillStyle = c.surface;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = c.accent;
    ctx.fillRect(0, 0, W, 4);

    const crestH = 56, crestW = logo ? logo.w : Math.round(crestH * 141 / 160);
    if (logo) logo.draw(ctx, PAD, 4 + 16);
    else if (crest) ctx.drawImage(crest, PAD, 4 + 16, crestW, crestH);
    const tx = PAD + crestW + 14;
    ctx.fillStyle = c.accent;
    setFont(ctx, 900, 20, 'expanded');
    ctx.fillText(fitText(ctx, title.toUpperCase(), W - tx - PAD), tx, 38);
    ctx.fillStyle = c.text2;
    setFont(ctx, 400, 13);
    ctx.fillText(fitText(ctx, subtitle, W - tx - PAD), tx, 64);
    return { canvas, ctx };
}

/** Tira o recorte e desenha a borda do card. */
function finishExportCard(ctx, H, c, W = EXPORT_W) {
    ctx.restore();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 8);
    ctx.stroke();
}

/**
 * Desenha a classificação de uma série num canvas.
 * @param {Object} league  item de appState.leagues
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawStandingsCanvas(league) {
    const m = standingsModel(league);
    const n = m.teams.length;
    const c = exportPalette(m.meta);
    const { crest, avatars } = await loadExportAssets(m.meta, m.teams.map(t => t.avatar));

    // Layout (px CSS)
    const HEAD_H = EXPORT_HEAD_H, THEAD_H = 34, ROW_H = 57;
    const legend = zoneLegendItems(m.z, m.finalized);
    const chances = m.view === 'chances' && m.odds.status === 'ready' ? m.odds : null;
    const LEGEND_H = chances ? 88 : 46;
    const H = HEAD_H + THEAD_H + n * ROW_H + LEGEND_H;
    const colPC = EXPORT_W - 14, colPF = colPC - 86, colVD = colPF - 84;
    // Chances: Playoffs (e Queda) no lugar de PF / PC
    const chanceCols = chances ? (m.z.down ? [['Playoffs', colPF, 'playoffs'], ['Queda', colPC, 'releg']] : [['Playoffs', colPC, 'playoffs']]) : [];
    const colTeam = 56;

    const { canvas, ctx } = startExportCard(H, c, crest, m.meta.name, m.subtitle);

    // Cabeçalho da tabela
    let y = HEAD_H;
    hLine(ctx, 0, EXPORT_W, y + THEAD_H - 1, c.border);
    ctx.fillStyle = c.text3;
    setFont(ctx, 800, 12, 'condensed');
    const thY = y + THEAD_H / 2;
    const spaced = s => s.split('').join(' ');
    ctx.fillText('#', 14, thY);
    ctx.fillText(spaced('TIME'), colTeam, thY);
    ctx.textAlign = 'right';
    ctx.fillText(spaced('V–D'), colVD, thY);
    if (chances) {
        chanceCols.forEach(([label, x]) => ctx.fillText(spaced(label.toUpperCase()), x, thY));
    } else {
        ctx.fillText(spaced('PF'), colPF, thY);
        ctx.fillText(spaced('PC'), colPC, thY);
    }
    ctx.textAlign = 'left';
    y += THEAD_H;

    // Linhas
    m.teams.forEach((t, i) => {
        const { zone, cut } = zoneOf(i, n, m.z);
        const top = y + i * ROW_H;
        const mid = top + ROW_H / 2;
        if (zone === 'promo' || zone === 'releg') {
            ctx.fillStyle = zone === 'promo' ? c.promoBg : c.relegBg;
            ctx.fillRect(0, top, EXPORT_W, ROW_H);
        }
        if (zone) {
            ctx.fillStyle = c[zone];
            ctx.fillRect(0, top, 3, ROW_H);
        }
        if (i < n - 1) {
            const lineColor = cut === 'promo' ? c.promo : cut === 'releg' ? c.releg : cut === 'playoff' ? c.border2 : c.border;
            hLine(ctx, 0, EXPORT_W, top + ROW_H - 1, lineColor, !!cut);
        }

        // Posição (medalha na temporada finalizada)
        const pos = i + 1;
        const entry = m.seriesIdx ? m.seriesIdx[t.ownerName] : null;
        if (entry && entry.trophy && pos <= 4) {
            drawMedal(ctx, 14 + 13, mid, pos, c);
        } else {
            ctx.fillStyle = zone === 'promo' ? c.promo : zone === 'releg' ? c.releg : c.text2;
            setFont(ctx, 900, 16, 'condensed');
            ctx.fillText(String(pos), 14, mid);
            if (zone === 'promo' || zone === 'releg') {
                const w = ctx.measureText(String(pos)).width;
                setFont(ctx, 900, 10);
                ctx.fillText(zone === 'promo' ? '▲' : '▼', 14 + w + 3, mid);
            }
        }

        // Time
        drawAvatar(ctx, colTeam, mid - 17, avatars[i], t.teamName || t.ownerName, c);
        const nameX = colTeam + 34 + 10;
        const nameMax = colVD - 60 - nameX;
        ctx.fillStyle = c.text;
        setFont(ctx, 700, 15);
        ctx.fillText(fitText(ctx, t.teamName || '', nameMax), nameX, mid - 8);
        ctx.fillStyle = c.text3;
        setFont(ctx, 400, 12);
        ctx.fillText(fitText(ctx, `${t.ownerName || ''} ›`, nameMax), nameX, mid + 11);

        // Números
        const wins = sanitizeNumber(t.wins, 0, VALIDATION.MAX_WINS);
        const losses = sanitizeNumber(t.losses, 0, VALIDATION.MAX_LOSSES);
        ctx.textAlign = 'right';
        ctx.fillStyle = c.text;
        setFont(ctx, 800, 14);
        ctx.fillText(`${wins}–${losses}`, colVD, mid);
        if (chances) {
            const o = chances.data.byId[t.teamId] || { playoffs: 0, releg: 0 };
            setFont(ctx, 800, 15);
            chanceCols.forEach(([, x, k]) => {
                const hot = k === 'playoffs' ? o.playoffs >= 0.9 : o.releg >= 0.5;
                ctx.fillStyle = hot ? (k === 'playoffs' ? c.promo : c.releg) : c.text;
                ctx.fillText(fmtPct(o[k]), x, mid);
            });
        } else {
            ctx.fillStyle = c.text2;
            setFont(ctx, 400, 14);
            ctx.fillText(fmtPts(t.fpts), colPF, mid);
            ctx.fillText(fmtPts(t.fptsAgainst), colPC, mid);
        }
        ctx.textAlign = 'left';
    });
    y += n * ROW_H;

    // Legenda
    hLine(ctx, 0, EXPORT_W, y, c.border);
    const ly = y + 23;
    if (chances) {
        ctx.fillStyle = c.text3;
        setFont(ctx, 400, 12);
        wrapLines(ctx, chancesNote(m.tier, chances), EXPORT_W - 28, 2)
            .forEach((line, i) => ctx.fillText(line, 14, y + 52 + i * 17));
    }
    let lx = 14;
    setFont(ctx, 400, 12);
    legend.forEach(it => {
        if (it.mark === 'medal') {
            const g = ctx.createRadialGradient(lx + 4, ly - 2, 1, lx + 6, ly, 7);
            g.addColorStop(0, c.medals[0][0]);
            g.addColorStop(1, c.medals[0][1]);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(lx + 6, ly, 6, 0, Math.PI * 2);
            ctx.fill();
            lx += 12 + 8;
        } else if (it.mark) {
            ctx.fillStyle = c[it.mark];
            ctx.fillRect(lx, ly - 7, 3, 14);
            lx += 3 + 8;
        }
        ctx.fillStyle = c.text2;
        ctx.fillText(it.text, lx, ly);
        lx += ctx.measureText(it.text).width + 18;
    });

    finishExportCard(ctx, H, c);
    return canvas;
}

/**
 * Desenha os confrontos da semana (aba Rodada) num canvas: placar lado a
 * lado, vencedor em destaque, rótulo de playoff acima do placar.
 * @param {Object} league
 * @param {Object} round  currentRound(league) já carregado
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawRoundCanvas(league, round) {
    const meta = SERIES_META[league.info.tier];
    const m = roundModel(league, round);
    const c = exportPalette(meta);
    const sides = m.games.flatMap(g => [g.a, g.b]);
    const { crest, avatars } = await loadExportAssets(meta, sides.map(s => s.team.avatar));

    const ROW_H = m.isPlayoff ? 84 : 72;
    const BYES_H = m.byes.length ? 46 : 0;
    const HL_H = m.highlights.length ? 74 : 0;
    const H = EXPORT_HEAD_H + HL_H + m.games.length * ROW_H + BYES_H;
    const { canvas, ctx } = startExportCard(H, c, crest, meta.name, m.subtitle);

    const mid = EXPORT_W / 2;
    const AV = 34, PAD = 16;
    const nameMax = mid - 70 - (PAD + AV + 10);
    let y = EXPORT_HEAD_H;
    hLine(ctx, 0, EXPORT_W, y - 1, c.border);

    // Destaques: uma coluna por item, filete na cor da liga
    if (HL_H) {
        const n = m.highlights.length;
        const colW = (EXPORT_W - PAD * 2 - (n - 1) * 8) / n;
        const live = m.status === 'live';
        m.highlights.forEach((it, i) => {
            const x = PAD + i * (colW + 8);
            const top = y + 12;
            const h = HL_H - 24;
            roundRect(ctx, x, top, colW, h, 8);
            ctx.fillStyle = c.surface2;
            ctx.fill();
            ctx.fillStyle = c.accent;
            ctx.fillRect(x, top, 3, h);
            ctx.fillStyle = c.text3;
            setFont(ctx, 800, 11, 'condensed');
            ctx.fillText((it.label + (live ? ' · parcial' : '')).toUpperCase().split('').join('\u200A'), x + 14, top + 16);
            ctx.textAlign = 'right';
            ctx.fillStyle = c.text;
            setFont(ctx, 900, 20, 'condensed');
            ctx.fillText(it.value, x + colW - 12, top + h / 2);
            const vw = ctx.measureText(it.value).width;
            ctx.textAlign = 'left';
            setFont(ctx, 700, 13);
            ctx.fillText(fitText(ctx, it.who, colW - 14 - vw - 24), x + 14, top + 35);
        });
        y += HL_H;
        hLine(ctx, 0, EXPORT_W, y - 1, c.border);
    }

    m.games.forEach((g, gi) => {
        const top = y + gi * ROW_H;
        if (gi % 2 === 1) {
            ctx.fillStyle = c.surface2;
            ctx.fillRect(0, top, EXPORT_W, ROW_H);
        }
        if (gi < m.games.length - 1) hLine(ctx, 0, EXPORT_W, top + ROW_H - 1, c.border);
        let cy = top + ROW_H / 2;
        if (g.label) {
            ctx.fillStyle = g.label === 'Final' ? c.accent : c.text3;
            setFont(ctx, 800, 11, 'condensed');
            ctx.textAlign = 'center';
            ctx.fillText(g.label.toUpperCase().split('').join('\u200A'), mid, top + 15);
            ctx.textAlign = 'left';
            cy += 8;
        }

        [['a', g.a, avatars[gi * 2]], ['b', g.b, avatars[gi * 2 + 1]]].forEach(([k, sd, img]) => {
            const left = k === 'a';
            const state = g.winner ? (g.winner === k ? 'win' : 'lose') : '';
            const avX = left ? PAD : EXPORT_W - PAD - AV;
            drawAvatar(ctx, avX, cy - AV / 2, img, sd.team.teamName || sd.team.ownerName, c);
            const nx = left ? avX + AV + 10 : avX - 10;
            ctx.textAlign = left ? 'left' : 'right';
            ctx.fillStyle = state === 'lose' ? c.text2 : c.text;
            setFont(ctx, 700, 15);
            ctx.fillText(fitText(ctx, sd.team.teamName || '', nameMax), nx, cy - 8);
            ctx.fillStyle = c.text3;
            setFont(ctx, 400, 12);
            ctx.fillText(fitText(ctx, sd.team.ownerName || '', nameMax), nx, cy + 11);

            // placar
            const pts = m.status === 'upcoming' ? '—' : fmtPts(sd.points);
            ctx.fillStyle = state === 'win' ? c.text : state === 'lose' ? c.text3 : c.text2;
            setFont(ctx, 900, 22, 'condensed');
            ctx.textAlign = left ? 'right' : 'left';
            ctx.fillText(pts, left ? mid - 22 : mid + 22, cy);
            if (state === 'win') {
                ctx.fillStyle = c.accent;
                ctx.fillRect(left ? 0 : EXPORT_W - 3, top, 3, ROW_H);
            }
        });
        ctx.textAlign = 'center';
        ctx.fillStyle = c.text3;
        setFont(ctx, 700, 12);
        ctx.fillText('×', mid, cy);
        ctx.textAlign = 'left';
    });

    if (BYES_H) {
        const by = y + m.games.length * ROW_H;
        hLine(ctx, 0, EXPORT_W, by, c.border);
        setFont(ctx, 700, 12);
        ctx.fillStyle = c.text2;
        const lead = 'Sem confronto: ';
        ctx.fillText(lead, 14, by + BYES_H / 2);
        const lw = ctx.measureText(lead).width;
        setFont(ctx, 400, 12);
        ctx.fillText(fitText(ctx, m.byes.map(s => s.team.teamName).join(' · '), EXPORT_W - 28 - lw), 14 + lw, by + BYES_H / 2);
    }

    finishExportCard(ctx, H, c);
    return canvas;
}

/**
 * Desenha o chaveamento (visão Chaveamento da aba Ligas): pódio, uma seção
 * por semana de playoff e os jogos como na Rodada (semente antes do nome).
 * @param {Object} league
 * @param {Object} data  bracketData(league).data
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawBracketCanvas(league, data) {
    const meta = SERIES_META[league.info.tier];
    const m = bracketModel(league, data);
    const c = exportPalette(meta);
    const games = m.rounds.flatMap(r => r.games);
    const { crest, avatars } = await loadExportAssets(meta, games.flatMap(g => [g.a, g.b]).map(s => (s.team ? s.team.avatar : null)));

    const ROW_H = 76, SEC_H = 36, PODIUM_H = m.podium.length ? 56 : 0, NOTE_H = 46;
    const BYE_H = 46;
    const H = EXPORT_HEAD_H + PODIUM_H + m.rounds.length * SEC_H + games.length * ROW_H
        + m.rounds.filter(r => r.byes.length).length * BYE_H + NOTE_H;
    const { canvas, ctx } = startExportCard(H, c, crest, meta.name, m.subtitle);
    const mid = EXPORT_W / 2;
    const AV = 34, PAD = 16, SEED_W = 28;
    const nameMax = mid - 70 - (PAD + SEED_W + AV + 10);
    let y = EXPORT_HEAD_H;
    hLine(ctx, 0, EXPORT_W, y - 1, c.border);

    if (PODIUM_H) {
        let x = PAD;
        const cy = y + PODIUM_H / 2;
        const colW = (EXPORT_W - PAD * 2) / 3;
        m.podium.forEach(it => {
            drawMedal(ctx, x + 13, cy, it.pos, c);
            ctx.fillStyle = c.text;
            setFont(ctx, 700, 15);
            ctx.fillText(fitText(ctx, it.team.teamName || '', colW - 44), x + 34, cy);
            x += colW;
        });
        y += PODIUM_H;
        hLine(ctx, 0, EXPORT_W, y - 1, c.border);
    }

    let gi = 0;
    m.rounds.forEach(r => {
        ctx.fillStyle = c.surface2;
        ctx.fillRect(0, y, EXPORT_W, SEC_H);
        const st = r.status === 'live' ? ' · ao vivo' : r.status === 'final' ? ' · encerrada' : '';
        drawEyebrow(ctx, `${r.title} · Semana ${r.week}${st}`, 14, y + SEC_H / 2, c);
        y += SEC_H;
        hLine(ctx, 0, EXPORT_W, y - 1, c.border);
        r.games.forEach(g => {
            const top = y;
            hLine(ctx, 0, EXPORT_W, top + ROW_H - 1, c.border);
            if (g.p) {
                ctx.fillStyle = g.p === 1 ? c.accent : c.text3;
                setFont(ctx, 800, 11, 'condensed');
                ctx.textAlign = 'center';
                ctx.fillText(g.label.toUpperCase().split('').join('\u200A'), mid, top + 15);
                ctx.textAlign = 'left';
            }
            const cy = top + ROW_H / 2 + (g.p ? 8 : 0);

            [['a', g.a, avatars[gi * 2]], ['b', g.b, avatars[gi * 2 + 1]]].forEach(([k, sd, img]) => {
                const left = k === 'a';
                ctx.textAlign = left ? 'left' : 'right';
                if (!sd.team) {
                    ctx.fillStyle = c.text3;
                    setFont(ctx, 400, 13);
                    ctx.fillText(fitText(ctx, sd.placeholder, mid - 40 - PAD), left ? PAD : EXPORT_W - PAD, cy);
                    ctx.textAlign = 'left';
                    return;
                }
                const state = g.winner ? (g.winner === k ? 'win' : 'lose') : '';
                ctx.fillStyle = c.text3;
                setFont(ctx, 900, 14, 'condensed');
                ctx.fillText(`${sd.seed}º`, left ? PAD : EXPORT_W - PAD, cy);
                const avX = left ? PAD + SEED_W : EXPORT_W - PAD - SEED_W - AV;
                drawAvatar(ctx, avX, cy - AV / 2, img, sd.team.teamName || sd.team.ownerName, c);
                const nx = left ? avX + AV + 10 : avX - 10;
                ctx.fillStyle = state === 'lose' ? c.text2 : c.text;
                setFont(ctx, 700, 15);
                ctx.fillText(fitText(ctx, sd.team.teamName || '', nameMax), nx, cy - 8);
                ctx.fillStyle = c.text3;
                setFont(ctx, 400, 12);
                ctx.fillText(fitText(ctx, sd.team.ownerName || '', nameMax), nx, cy + 11);
                if (sd.chance !== null && sd.chance !== undefined) {
                    ctx.fillStyle = sd.chance >= 0.9 ? c.promo : c.text2;
                    setFont(ctx, 800, 14);
                    ctx.textAlign = left ? 'right' : 'left';
                    ctx.fillText(fmtPct(sd.chance), left ? mid - 22 : mid + 22, cy);
                } else if (sd.points !== null && g.status !== 'upcoming') {
                    ctx.fillStyle = state === 'win' ? c.text : state === 'lose' ? c.text3 : c.text2;
                    setFont(ctx, 900, 22, 'condensed');
                    ctx.textAlign = left ? 'right' : 'left';
                    ctx.fillText(fmtPts(sd.points), left ? mid - 22 : mid + 22, cy);
                }
                if (state === 'win') {
                    ctx.fillStyle = c.accent;
                    ctx.fillRect(left ? 0 : EXPORT_W - 3, top, 3, ROW_H);
                }
                ctx.textAlign = 'left';
            });
            ctx.textAlign = 'center';
            ctx.fillStyle = c.text3;
            setFont(ctx, 700, 12);
            ctx.fillText('×', mid, cy);
            ctx.textAlign = 'left';
            y += ROW_H;
            gi++;
        });
        if (r.byes.length) {
            setFont(ctx, 700, 12);
            ctx.fillStyle = c.text2;
            const lead = 'Folga (direto às semis): ';
            ctx.fillText(lead, 14, y + BYE_H / 2);
            const lw = ctx.measureText(lead).width;
            setFont(ctx, 400, 12);
            const pct = s => (s.chance !== null && s.chance !== undefined ? ` (${fmtPct(s.chance)})` : '');
            ctx.fillText(fitText(ctx, r.byes.map(s => `${s.seed}º ${s.team.teamName}${pct(s)}`).join(' · '), EXPORT_W - 28 - lw), 14 + lw, y + BYE_H / 2);
            y += BYE_H;
            hLine(ctx, 0, EXPORT_W, y - 1, c.border);
        }
    });

    ctx.fillStyle = c.text3;
    setFont(ctx, 400, 12);
    wrapLines(ctx, m.note, EXPORT_W - 28, 2).forEach((line, i, all) =>
        ctx.fillText(line, 14, y + NOTE_H / 2 + (i - (all.length - 1) / 2) * 16));

    finishExportCard(ctx, H, c);
    return canvas;
}

/** Chip arredondado com texto (ex.: "EM ANDAMENTO", "5º"). Desenha à esquerda de xRight. */
function drawChip(ctx, xRight, cy, text, bg, fg) {
    setFont(ctx, 800, 12, 'condensed');
    const label = text.toUpperCase().split('').join('\u200A');
    const w = ctx.measureText(label).width + 20;
    roundRect(ctx, xRight - w, cy - 12, w, 24, 4);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.fillText(label, xRight - w / 2, cy + 1);
    ctx.textAlign = 'left';
}

/** Rótulo de seção (eyebrow). */
function drawEyebrow(ctx, text, x, y, c) {
    ctx.fillStyle = c.text3;
    setFont(ctx, 800, 12, 'condensed');
    ctx.fillText(text.toUpperCase().split('').join('\u200A'), x, y);
}

/**
 * Desenha o perfil do jogador: avatar, séries atuais, conquistas, carreira
 * e histórico (escudo + ano · série + time · V–D · pts + medalha/posição).
 * @param {string} username
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawProfileCanvas(username) {
    const p = profileModel(username);
    const c = exportPalette(null);
    const tiers = [...new Set(p.history.map(h => seriesIdToTier(h.serie)).filter(t => SERIES_META[t]))];
    const [{ avatars: [avatar] }, ...crests] = await Promise.all([
        loadExportAssets(null, [p.avatarId]),
        ...tiers.map(t => loadExportImage(`assets/logo/png/${SERIES_META[t].crest}`, false))
    ]);
    const crestOf = Object.fromEntries(tiers.map((t, i) => [t, crests[i]]));

    const PAD = 16, GAP = 8, LABEL_H = 36;
    const MEDAL_H = 96, STAT_H = 72, ROW_H = 56;
    const H = EXPORT_HEAD_H + LABEL_H + MEDAL_H + LABEL_H + STAT_H
        + (p.history.length ? LABEL_H + p.history.length * ROW_H : 0) + PAD;

    const logo = { w: 56, draw: (ctx, x, y) => drawAvatar(ctx, x, y, avatar, p.username, c, 56) };
    const { canvas, ctx } = startExportCard(H, c, null, p.username, '', logo);

    // Séries atuais (pílulas na cor da liga), no lugar do subtítulo
    let px = PAD + 56 + 14;
    p.current.forEach(t => {
        const meta = SERIES_META[t];
        const color = cssToken(`--league-${meta.league}`);
        setFont(ctx, 800, 12, 'condensed');
        const label = meta.short.toUpperCase().split('').join('\u200A');
        const w = ctx.measureText(label).width + 16;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        roundRect(ctx, px, 54, w, 22, 4);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(label, px + 8, 65);
        px += w + 6;
    });

    let y = EXPORT_HEAD_H;
    hLine(ctx, 0, EXPORT_W, y - 1, c.border);
    const tileW = n => (EXPORT_W - PAD * 2 - GAP * (n - 1)) / n;
    const tile = (x, top, w, h) => {
        roundRect(ctx, x, top, w, h, 8);
        ctx.fillStyle = c.surface2;
        ctx.fill();
    };

    // Conquistas
    drawEyebrow(ctx, 'Conquistas', PAD, y + LABEL_H / 2 + 2, c);
    y += LABEL_H;
    const mw = tileW(4);
    MEDAL_KEYS.forEach((k, i) => {
        const v = p.trophies[k] || 0;
        const x = PAD + i * (mw + GAP);
        tile(x, y, mw, MEDAL_H - 8);
        const cx = x + mw / 2;
        if (v) {
            drawMedal(ctx, cx, y + 22, i + 1, c);
        } else {
            ctx.fillStyle = c.surface3;
            ctx.beginPath();
            ctx.arc(cx, y + 22, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.text3;
            setFont(ctx, 900, 14, 'condensed');
            ctx.textAlign = 'center';
            ctx.fillText(String(i + 1), cx, y + 23);
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = v ? c.text : c.text3;
        setFont(ctx, 900, 22, 'condensed');
        ctx.fillText(String(v), cx, y + 52);
        setFont(ctx, 400, 12);
        ctx.fillStyle = v ? c.text2 : c.text3;
        ctx.fillText(MEDAL_LABELS[k], cx, y + 73);
        ctx.textAlign = 'left';
    });
    y += MEDAL_H;

    // Carreira
    drawEyebrow(ctx, 'Carreira', PAD, y + LABEL_H / 2 - 2, c);
    y += LABEL_H - 4;
    const sw = tileW(4);
    [['Temporadas', String(p.stats.seasons)], ['V–D', `${p.stats.wins}–${p.stats.losses}`],
     ['Aproveitamento', p.winRate], ['Pontos totais', fmtPts(p.stats.pts)]].forEach(([k, v], i) => {
        const x = PAD + i * (sw + GAP);
        tile(x, y, sw, STAT_H - 8);
        drawEyebrow(ctx, k, x + 14, y + 20, c);
        ctx.fillStyle = c.text;
        setFont(ctx, 900, 24, 'condensed');
        ctx.fillText(v, x + 14, y + 44);
    });
    y += STAT_H;

    // Histórico
    if (p.history.length) {
        drawEyebrow(ctx, 'Histórico', PAD, y + LABEL_H / 2, c);
        y += LABEL_H;
        hLine(ctx, PAD, EXPORT_W - PAD, y - 1, c.border);
        p.history.forEach((h, i) => {
            const top = y + i * ROW_H;
            const cy = top + ROW_H / 2;
            if (i < p.history.length - 1) hLine(ctx, PAD, EXPORT_W - PAD, top + ROW_H - 1, c.border);
            const crest = crestOf[seriesIdToTier(h.serie)];
            if (crest) ctx.drawImage(crest, PAD, cy - 17, 30, 34);
            ctx.fillStyle = c.text;
            setFont(ctx, 700, 15);
            ctx.fillText(`${h.season} · ${seriesNameById(h.serie)}`, PAD + 44, cy - 9);
            ctx.fillStyle = c.text3;
            setFont(ctx, 400, 13);
            ctx.fillText(fitText(ctx, `${h.team} · ${h.guillotine ? '' : `${h.w}–${h.l} · `}${fmtPts(h.pts)} pts`, EXPORT_W - PAD * 2 - 44 - 150), PAD + 44, cy + 11);

            const xr = EXPORT_W - PAD;
            if (h.guillotine) drawChip(ctx, xr, cy, h.alive ? 'Vivo' : 'Cortado', h.alive ? 'rgba(61, 214, 140, .15)' : c.surface3, h.alive ? c.promo : c.text);
            else if (h.active) drawChip(ctx, xr, cy, 'Em andamento', 'rgba(235, 64, 52, .15)', '#FF7A6E');
            else if (h.rank >= 1 && h.rank <= 4) drawMedal(ctx, xr - 13, cy, h.rank, c);
            else if (h.rank) drawChip(ctx, xr, cy, `${h.rank}º`, c.surface3, c.text);
        });
    }

    finishExportCard(ctx, H, c);
    return canvas;
}

/**
 * Desenha o Power Ranking: duas colunas por posição (1–20 | 21–40), com
 * badge do tier, série na cor da liga, V–D, pontos e PWR com barra.
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawPowerCanvas() {
    const rows = powerRows();
    const W = 1080, PAD = 16, GAP = 16, ROW_H = 52, LEGEND_H = 50;
    const c = exportPalette(null);
    const tierColor = Object.fromEntries(['s', 'a', 'b', 'c', 'd'].map(k => [k.toUpperCase(), cssToken(`--tier-${k}`)]));
    const tierText = { S: c.bg, A: c.bg, B: c.text, C: c.text, D: c.text2 };
    const { crest, avatars } = await loadExportAssets(null, rows.map(r => r.team.avatarId));

    const perCol = Math.ceil(rows.length / 2);
    const H = EXPORT_HEAD_H + 8 + perCol * ROW_H + 8 + LEGEND_H;
    const series = [...new Set(rows.map(r => r.team._leagueTier))]
        .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b))
        .map(t => SERIES_META[t].id);
    const subtitle = `Temporada ${appState.season} · ${weekLabel() || (isSeasonFinalized() ? 'Temporada encerrada' : 'Em andamento')} · Séries ${series[0]}–${series[series.length - 1]}`;
    const { canvas, ctx } = startExportCard(H, c, crest, 'Power Ranking', subtitle, null, W);
    hLine(ctx, 0, W, EXPORT_HEAD_H - 1, c.border);

    const colW = (W - PAD * 2 - GAP) / 2;
    rows.forEach((r, i) => {
        const col = i < perCol ? 0 : 1;
        const x = PAD + col * (colW + GAP);
        const top = EXPORT_HEAD_H + 8 + (i % perCol) * ROW_H;
        const cy = top + ROW_H / 2;
        if ((i % perCol) < perCol - 1 && i < rows.length - 1) hLine(ctx, x, x + colW, top + ROW_H - 1, c.border);

        ctx.fillStyle = c.text2;
        setFont(ctx, 900, 16, 'condensed');
        ctx.fillText(`#${r.rank}`, x, cy);

        roundRect(ctx, x + 38, cy - 10, 24, 20, 2);
        ctx.fillStyle = tierColor[r.tier];
        ctx.fill();
        ctx.fillStyle = tierText[r.tier];
        setFont(ctx, 900, 12, 'condensed');
        ctx.textAlign = 'center';
        ctx.fillText(r.tier, x + 50, cy + 1);
        ctx.textAlign = 'left';

        drawAvatar(ctx, x + 72, cy - 17, avatars[i], r.team.team || r.team.user, c);
        const nx = x + 72 + 34 + 10;
        const nameMax = colW - (nx - x) - 76;
        ctx.fillStyle = c.text;
        setFont(ctx, 700, 14);
        ctx.fillText(fitText(ctx, r.team.team || '', nameMax), nx, cy - 8);

        const meta = SERIES_META[r.team._leagueTier];
        const short = meta ? meta.short : '';
        ctx.fillStyle = meta ? cssToken(`--league-${meta.league}`) : c.text3;
        setFont(ctx, 800, 12);
        ctx.fillText(short, nx, cy + 11);
        const sw = ctx.measureText(short).width;
        ctx.fillStyle = c.text3;
        setFont(ctx, 400, 12);
        ctx.fillText(fitText(ctx, ` · ${r.team.w}–${r.team.l} · ${fmtPts(r.team.pts)} pts`, nameMax - sw), nx + sw, cy + 11);

        const xr = x + colW;
        ctx.textAlign = 'right';
        ctx.fillStyle = c.text;
        setFont(ctx, 900, 20, 'condensed');
        ctx.fillText(r.pwr.toFixed(1), xr, cy - 5);
        ctx.textAlign = 'left';
        roundRect(ctx, xr - 56, cy + 10, 56, 5, 2.5);
        ctx.fillStyle = c.surface3;
        ctx.fill();
        const pct = Math.max(0, Math.min(100, r.pwr)) / 100;
        if (pct > 0) {
            roundRect(ctx, xr - 56, cy + 10, Math.max(5, 56 * pct), 5, 2.5);
            ctx.fillStyle = r.tier === 'C' || r.tier === 'D' ? c.border2 : tierColor[r.tier];
            ctx.fill();
        }
    });

    // Legenda dos tiers
    const ly = H - LEGEND_H / 2;
    hLine(ctx, 0, W, H - LEGEND_H, c.border);
    let lx = PAD;
    Object.keys(TIER_CONFIG).forEach(k => {
        roundRect(ctx, lx, ly - 10, 24, 20, 2);
        ctx.fillStyle = tierColor[k];
        ctx.fill();
        ctx.fillStyle = tierText[k];
        setFont(ctx, 900, 12, 'condensed');
        ctx.textAlign = 'center';
        ctx.fillText(k, lx + 12, ly + 1);
        ctx.textAlign = 'left';
        ctx.fillStyle = c.text2;
        setFont(ctx, 400, 12);
        ctx.fillText(TIER_CONFIG[k].name, lx + 32, ly);
        lx += 32 + ctx.measureText(TIER_CONFIG[k].name).width + 20;
    });
    ctx.textAlign = 'right';
    ctx.fillStyle = c.text3;
    setFont(ctx, 400, 12);
    ctx.fillText(PWR_FORMULA_SHORT, W - PAD, ly);
    ctx.textAlign = 'left';

    finishExportCard(ctx, H, c, W);
    return canvas;
}

/**
 * Desenha a guilhotina: vivos (zona de corte em vermelho) e cortados com a
 * rodada do corte.
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawGuillotineCanvas(league, data) {
    const meta = SERIES_META[league.info.tier];
    const m = guillotineModel(league, data);
    const c = exportPalette(meta);
    const all = [...m.alive.map(r => r.team), ...m.cut.map(x => x.team)];
    const { crest, avatars } = await loadExportAssets(meta, all.map(t => t.avatar));
    const ROW_H = 50, CUT_H = 44, THEAD_H = 34, LABEL_H = 40, LEGEND_H = 40;
    const H = EXPORT_HEAD_H + THEAD_H + m.alive.length * ROW_H + LEGEND_H
        + (m.cut.length ? LABEL_H + m.cut.length * CUT_H + 8 : 0);
    const { canvas, ctx } = startExportCard(H, c, crest, meta.name, m.subtitle);
    const colPF = EXPORT_W - 14, colWk = colPF - 110;
    const spaced = s => s.toUpperCase().split('').join('\u200A');

    let y = EXPORT_HEAD_H;
    hLine(ctx, 0, EXPORT_W, y + THEAD_H - 1, c.border);
    ctx.fillStyle = c.text3;
    setFont(ctx, 800, 12, 'condensed');
    ctx.fillText('#', 14, y + THEAD_H / 2);
    ctx.fillText(spaced('Vivos'), 56, y + THEAD_H / 2);
    ctx.textAlign = 'right';
    ctx.fillText(spaced(`Sem ${m.week}`), colWk, y + THEAD_H / 2);
    ctx.fillText('PF', colPF, y + THEAD_H / 2);
    ctx.textAlign = 'left';
    y += THEAD_H;

    const n = m.alive.length;
    const nameRow = (t, img, x, mid, maxW) => {
        drawAvatar(ctx, x, mid - 17, img, t.teamName || t.ownerName, c);
        ctx.fillStyle = c.text;
        setFont(ctx, 700, 15);
        ctx.fillText(fitText(ctx, t.teamName || '', maxW), x + 44, mid - 8);
        ctx.fillStyle = c.text3;
        setFont(ctx, 400, 12);
        ctx.fillText(fitText(ctx, t.ownerName || '', maxW), x + 44, mid + 11);
    };
    m.alive.forEach((r, i) => {
        const top = y + i * ROW_H, mid = top + ROW_H / 2;
        const danger = i >= n - m.danger;
        if (danger) { ctx.fillStyle = c.relegBg; ctx.fillRect(0, top, EXPORT_W, ROW_H); }
        ctx.fillStyle = danger ? c.releg : c.playoff;
        ctx.fillRect(0, top, 3, ROW_H);
        if (i < n - 1) hLine(ctx, 0, EXPORT_W, top + ROW_H - 1, m.danger && i === n - m.danger - 1 ? c.releg : c.border, m.danger && i === n - m.danger - 1);
        ctx.fillStyle = danger ? c.releg : c.text2;
        setFont(ctx, 900, 16, 'condensed');
        ctx.fillText(String(i + 1), 14, mid);
        nameRow(r.team, avatars[i], 56, mid, colWk - 90 - 100);
        ctx.textAlign = 'right';
        ctx.fillStyle = c.text;
        setFont(ctx, 800, 15);
        ctx.fillText(m.isLive && !m.started ? '—' : fmtPts(r.week), colWk, mid);
        ctx.fillStyle = c.text2;
        setFont(ctx, 400, 14);
        ctx.fillText(fmtPts(r.pf), colPF, mid);
        ctx.textAlign = 'left';
    });
    y += n * ROW_H;

    hLine(ctx, 0, EXPORT_W, y, c.border);
    ctx.fillStyle = c.text2;
    setFont(ctx, 400, 12);
    const legend = (m.danger ? 'Zona de corte: menor pontuação da semana · ' : '') + 'Cortado: o elenco vai para o waiver';
    ctx.fillText(legend, 14, y + LEGEND_H / 2);
    y += LEGEND_H;

    if (m.cut.length) {
        hLine(ctx, 0, EXPORT_W, y, c.border);
        drawEyebrow(ctx, `Cortados · ${m.cut.length}`, 14, y + LABEL_H / 2 + 2, c);
        y += LABEL_H;
        m.cut.forEach((x, i) => {
            const top = y + i * CUT_H, mid = top + CUT_H / 2;
            hLine(ctx, 0, EXPORT_W, top, c.border);
            roundRect(ctx, 14, mid - 11, 36, 22, 4);
            ctx.fillStyle = c.relegBg;
            ctx.fill();
            ctx.fillStyle = c.releg;
            setFont(ctx, 900, 12, 'condensed');
            ctx.textAlign = 'center';
            ctx.fillText(`R${x.week}`, 32, mid + 1);
            ctx.textAlign = 'left';
            ctx.globalAlpha = 0.85;
            nameRow(x.team, avatars[n + i], 62, mid, colWk - 90 - 100);
            ctx.globalAlpha = 1;
            ctx.textAlign = 'right';
            ctx.fillStyle = c.text3;
            setFont(ctx, 800, 14);
            ctx.fillText(`${fmtPts(x.pts)} pts`, colPF, mid);
            ctx.textAlign = 'left';
        });
    }

    finishExportCard(ctx, H, c);
    return canvas;
}

/**
 * Desenha a tabela de uma liga de "Também na KHC" (V–(E)–D, PF, PC, eficiência).
 * @param {Object} cfg  item de ALSO_LEAGUES
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawAlsoCanvas(cfg, data) {
    const meta = { league: cfg.league, crest: cfg.crest };
    const c = exportPalette(meta);
    const { crest, avatars } = await loadExportAssets(meta, data.teams.map(t => t.avatar));
    const THEAD_H = 34, ROW_H = 57, NOTE_H = 44;
    const n = data.teams.length;
    const H = EXPORT_HEAD_H + THEAD_H + n * ROW_H + NOTE_H;
    // logo redondo: 56×56 no lugar do escudo (141:160)
    const logo = cfg.round ? { w: 56, draw: (cx, x, y) => { if (crest) cx.drawImage(crest, x, y, 56, 56); } } : null;
    const { canvas, ctx } = startExportCard(H, c, crest, cfg.name, alsoSubtitle(cfg, data), logo);
    const colEf = EXPORT_W - 14, colPC = colEf - 80, colPF = colPC - 86, colRec = colPF - 90;
    const spaced = s => s.toUpperCase().split('').join('\u200A');

    let y = EXPORT_HEAD_H;
    hLine(ctx, 0, EXPORT_W, y + THEAD_H - 1, c.border);
    ctx.fillStyle = c.text3;
    setFont(ctx, 800, 12, 'condensed');
    ctx.fillText('#', 14, y + THEAD_H / 2);
    ctx.fillText(spaced('Time'), 56, y + THEAD_H / 2);
    ctx.textAlign = 'right';
    [[cfg.ties ? 'V–E–D' : 'V–D', colRec], ['PF', colPF], ['PC', colPC], ['Efic.', colEf]].forEach(([t, x]) => ctx.fillText(spaced(t), x, y + THEAD_H / 2));
    ctx.textAlign = 'left';
    y += THEAD_H;

    data.teams.forEach((t, i) => {
        const top = y + i * ROW_H, mid = top + ROW_H / 2;
        if (i < n - 1) hLine(ctx, 0, EXPORT_W, top + ROW_H - 1, c.border);
        ctx.fillStyle = c.text2;
        setFont(ctx, 900, 16, 'condensed');
        ctx.fillText(String(i + 1), 14, mid);
        drawAvatar(ctx, 56, mid - 17, avatars[i], t.teamName || t.ownerName, c);
        const maxW = colRec - 70 - 100;
        ctx.fillStyle = c.text;
        setFont(ctx, 700, 15);
        ctx.fillText(fitText(ctx, t.teamName || '', maxW), 100, mid - 8);
        ctx.fillStyle = c.text3;
        setFont(ctx, 400, 12);
        ctx.fillText(fitText(ctx, t.ownerName || '', maxW), 100, mid + 11);
        ctx.textAlign = 'right';
        ctx.fillStyle = c.text;
        setFont(ctx, 800, 14);
        ctx.fillText(alsoRecord(cfg, t), colRec, mid);
        ctx.fillStyle = c.text2;
        setFont(ctx, 400, 14);
        ctx.fillText(fmtPts(t.fpts), colPF, mid);
        ctx.fillText(fmtPts(t.fptsAgainst), colPC, mid);
        ctx.fillStyle = c.text;
        setFont(ctx, 800, 14);
        ctx.fillText(fmtEff(t.efficiency), colEf, mid);
        ctx.textAlign = 'left';
    });
    y += n * ROW_H;
    hLine(ctx, 0, EXPORT_W, y, c.border);
    ctx.fillStyle = c.text3;
    setFont(ctx, 400, 12);
    const note = isAlsoPreseason(data)
        ? 'Antes do draft: só os times que já entraram na liga. A tabela começa a contar na 1ª rodada.'
        : 'Efic. = pontos feitos ÷ máximo possível com a melhor escalação de cada rodada (cálculo do Sleeper)';
    ctx.fillText(fitText(ctx, note, EXPORT_W - 28), 14, y + NOTE_H / 2);

    finishExportCard(ctx, H, c);
    return canvas;
}

let _exportCache = null;   // { key, blob } da última imagem gerada

/**
 * O navegador compartilha arquivos (Web Share nível 2)? Decide se o botão
 * Compartilhar aparece.
 * @returns {boolean}
 */
function canShareFiles() {
    try {
        return !!(navigator.canShare && typeof File === 'function' &&
            navigator.canShare({ files: [new File([''], 'khc.png', { type: 'image/png' })] }));
    } catch (e) {
        return false;
    }
}

/**
 * O que exportar: perfil aberto, Power Ranking, classificação (Ligas) ou
 * confrontos (Rodada).
 * A chave do cache muda quando os dados recarregam.
 * @returns {{key: string, name: string, title: string, draw: function(): Promise<HTMLCanvasElement>}|null}
 */
function exportTarget() {
    const user = typeof currentDrawerUser === 'function' ? currentDrawerUser() : null;
    if (user) {
        const slug = user.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jogador';
        return {
            key: `perfil|${user}|${appState.lastUpdated || ''}`,
            name: `khc-perfil-${slug}.png`,
            title: `${user} · Ultimate League KHC`,
            draw: () => drawProfileCanvas(user)
        };
    }
    if (appState.tab === 'power') {
        return {
            key: `power|${appState.season}|${appState.lastUpdated || ''}`,
            name: `khc-${appState.season}-power-ranking.png`,
            title: `Power Ranking · ${appState.season}`,
            draw: () => drawPowerCanvas()
        };
    }
    if (ALSO_LEAGUES[appState.tab]) {
        const cfg = ALSO_LEAGUES[appState.tab];
        const p = alsoData(cfg.key);
        if (p.status !== 'ready') return null;
        return {
            key: `${cfg.key}|${p.fetchedAt}`,
            name: cfg.key === 'premier' ? 'khc-premier-league.png' : `khc-${cfg.key}.png`,
            title: cfg.name,
            draw: () => drawAlsoCanvas(cfg, p.data)
        };
    }
    const league = appState.leagues.find(l => l.info.tier === appState.series);
    if (!league) return null;
    const tier = league.info.tier;
    if (appState.tab === 'ligas' && isGuillotine(tier)) {
        const g = guillotineData(league);
        if (g.status !== 'ready') return null;
        return {
            key: `guil|${appState.season}|${g.data.fetchedAt}`,
            name: `khc-${appState.season}-guilhotina.png`,
            title: `KHC Guilhotina · ${appState.season}`,
            draw: () => drawGuillotineCanvas(league, g.data)
        };
    }
    const seriesName = SERIES_META[tier].name;
    if (appState.tab === 'rodada') {
        const round = currentRound(league);
        if (!round || !round.data) return null;
        return {
            key: `rodada|${appState.season}|${tier}|${round.week}|${round.data.fetchedAt}`,
            name: `khc-${appState.season}-${tier}-semana-${round.week}.png`,
            title: `${seriesName} · Semana ${round.week} · ${appState.season}`,
            draw: () => drawRoundCanvas(league, round)
        };
    }
    if (appState.ligasView === 'chaveamento') {
        const b = bracketData(league);
        if (b.status !== 'ready') return null;
        return {
            key: `chave|${appState.season}|${tier}|${b.data.fetchedAt}|${leagueOdds(league).status}`,
            name: `khc-${appState.season}-${tier}-chaveamento.png`,
            title: `${seriesName} · Chaveamento · ${appState.season}`,
            draw: () => drawBracketCanvas(league, b.data)
        };
    }
    return {
        key: `ligas|${appState.season}|${tier}|${appState.lastUpdated || ''}|${appState.ligasView}|${leagueOdds(league).status}`,
        name: `khc-${appState.season}-${tier}${appState.ligasView === 'chances' && !isSeasonFinalized() ? '-chances' : ''}.png`,
        title: `${seriesName} · ${appState.season}`,
        draw: () => drawStandingsCanvas(league)
    };
}

/**
 * PNG da aba atual (do cache quando possível).
 * @returns {Promise<Blob>}
 */
async function exportBlob(target) {
    if (_exportCache && _exportCache.key === target.key) return _exportCache.blob;
    const canvas = await target.draw();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('canvas vazio');
    _exportCache = { key: target.key, blob };
    return blob;
}

/** Baixa o arquivo (desktop e celular). */
function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Baixar ou compartilhar a imagem da aba atual (Ligas ou Rodada).
 *
 * Compartilhar precisa do toque "recente": alguns navegadores (Safari)
 * recusam se a imagem demorou a ficar pronta. Nesse caso a imagem fica em
 * cache e o botão pede um segundo toque, que compartilha na hora.
 *
 * @param {HTMLButtonElement} btn
 * @param {'download'|'share'} mode
 */
async function exportStandings(btn, mode) {
    const target = exportTarget();
    if (!target || btn.disabled) return;
    const cached = _exportCache && _exportCache.key === target.key;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try {
        const blob = cached ? _exportCache.blob : await exportBlob(target);
        if (mode === 'download') {
            downloadBlob(blob, target.name);
            return;
        }
        const file = new File([blob], target.name, { type: 'image/png' });
        try {
            await navigator.share({ files: [file], title: target.title });
            btn.classList.remove('is-ready');
            btn.querySelector('.export-btn__label').textContent = 'Compartilhar';
        } catch (e) {
            if (e && e.name === 'AbortError') return; // usuário cancelou
            if (e && e.name === 'NotAllowedError' && !cached) {
                btn.classList.add('is-ready');
                btn.querySelector('.export-btn__label').textContent = 'Toque para compartilhar';
                return;
            }
            throw e;
        }
    } catch (e) {
        console.error('Falha ao exportar tabela', e);
        alert('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
    }
}

/**
 * Começa a gerar a imagem já no toque (pointerdown), antes do click, para
 * o Compartilhar caber na janela do gesto do usuário.
 */
function prefetchExport() {
    const target = exportTarget();
    if (target) exportBlob(target).catch(() => null);
}
