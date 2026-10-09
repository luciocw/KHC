// =============================================================================
// UI / EXPORT — Exporta a classificação (Ligas) ou os confrontos (Rodada)
// de uma série como imagem (PNG).
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

/** Avatar 34×34 arredondado: foto ou iniciais. */
function drawAvatar(ctx, x, y, img, name, c) {
    const s = 34;
    ctx.save();
    roundRect(ctx, x, y, s, s, 8);
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
        setFont(ctx, 900, 13, 'condensed');
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
        ...avatarIds.map(id => (typeof id === 'string' && VALIDATION.AVATAR_PATTERN.test(id)
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
 * Deixa o contexto recortado no card; feche com finishExportCard().
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
function startExportCard(H, c, crest, title, subtitle) {
    const PAD = 16;
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_W * EXPORT_SCALE;
    canvas.height = H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.textBaseline = 'middle';

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, EXPORT_W, H);
    ctx.save();
    roundRect(ctx, 0.5, 0.5, EXPORT_W - 1, H - 1, 8);
    ctx.fillStyle = c.surface;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = c.accent;
    ctx.fillRect(0, 0, EXPORT_W, 4);

    const crestH = 56, crestW = Math.round(crestH * 141 / 160);
    if (crest) ctx.drawImage(crest, PAD, 4 + 16, crestW, crestH);
    const tx = PAD + crestW + 14;
    ctx.fillStyle = c.accent;
    setFont(ctx, 900, 20, 'expanded');
    ctx.fillText(fitText(ctx, title.toUpperCase(), EXPORT_W - tx - PAD), tx, 38);
    ctx.fillStyle = c.text2;
    setFont(ctx, 400, 13);
    ctx.fillText(fitText(ctx, subtitle, EXPORT_W - tx - PAD), tx, 64);
    return { canvas, ctx };
}

/** Tira o recorte e desenha a borda do card. */
function finishExportCard(ctx, H, c) {
    ctx.restore();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, EXPORT_W - 1, H - 1, 8);
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
    const LEGEND_H = 46;
    const H = HEAD_H + THEAD_H + n * ROW_H + LEGEND_H;
    const colPC = EXPORT_W - 14, colPF = colPC - 86, colVD = colPF - 84;
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
    ctx.fillText(spaced('PF'), colPF, thY);
    ctx.fillText(spaced('PC'), colPC, thY);
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
        ctx.fillStyle = c.text2;
        setFont(ctx, 400, 14);
        ctx.fillText(fmtPts(t.fpts), colPF, mid);
        ctx.fillText(fmtPts(t.fptsAgainst), colPC, mid);
        ctx.textAlign = 'left';
    });
    y += n * ROW_H;

    // Legenda
    hLine(ctx, 0, EXPORT_W, y, c.border);
    const ly = y + LEGEND_H / 2;
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
 * O que exportar na aba atual: classificação (Ligas) ou confrontos (Rodada).
 * A chave do cache muda quando os dados recarregam.
 * @returns {{key: string, name: string, title: string, draw: function(): Promise<HTMLCanvasElement>}|null}
 */
function exportTarget() {
    const league = appState.leagues.find(l => l.info.tier === appState.series);
    if (!league) return null;
    const tier = league.info.tier;
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
    return {
        key: `ligas|${appState.season}|${tier}|${appState.lastUpdated || ''}`,
        name: `khc-${appState.season}-${tier}.png`,
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
