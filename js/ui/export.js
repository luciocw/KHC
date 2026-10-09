// =============================================================================
// UI / EXPORT — Exporta a classificação de uma série como imagem (PNG).
//
// A tabela é redesenhada num <canvas> com largura fixa (sempre com a coluna
// PC, mesmo no celular), no visual do card da aba Ligas. Cores lidas dos
// tokens CSS (:root), fonte Archivo já carregada pela página.
//
//   - Celular (toque) com Web Share de arquivos → abre o "Compartilhar".
//   - Senão → baixa khc-<ano>-<série>.png.
//
// Avatares vêm da Sleeper CDN (CORS *); se algum falhar, usa iniciais.
// Depende de: config, sanitize, ui/helpers, tabs/ligas (standingsModel, zoneOf,
// zoneLegendItems), tabs/temporadas (weekLabel)
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

/**
 * Desenha a classificação de uma série num canvas.
 * @param {Object} league  item de appState.leagues
 * @returns {Promise<HTMLCanvasElement>}
 */
async function drawStandingsCanvas(league) {
    const m = standingsModel(league);
    const n = m.teams.length;
    const c = {
        bg: cssToken('--bg'), surface: cssToken('--surface'), surface3: cssToken('--surface-3'),
        border: cssToken('--border'), border2: cssToken('--border-2'),
        text: cssToken('--text'), text2: cssToken('--text-2'), text3: cssToken('--text-3'),
        accent: cssToken(`--league-${m.meta.league}`) || cssToken('--orange'),
        promo: cssToken('--zone-promo'), playoff: cssToken('--zone-playoff'), releg: cssToken('--zone-releg'),
        promoBg: cssToken('--zone-promo-bg'), relegBg: cssToken('--zone-releg-bg'),
        medals: ['gold', 'silver', 'bronze', 'fourth'].map(k => [cssToken(`--${k}`), cssToken(`--${k}-deep`)])
    };

    if (document.fonts && document.fonts.load) {
        await Promise.all(['400 15px Archivo', '700 15px Archivo', '800 12px Archivo', '900 20px Archivo']
            .map(f => document.fonts.load(f).catch(() => null)));
    }
    const crestFile = m.meta ? m.meta.crest : 'escudo-khc.png';
    const [crest, ...avatars] = await Promise.all([
        loadExportImage(`assets/logo/png/${crestFile}`, false),
        ...m.teams.map(t => (typeof t.avatar === 'string' && VALIDATION.AVATAR_PATTERN.test(t.avatar)
            // ?export: URL distinta da <img> da página, cuja cópia em cache veio
            // sem cabeçalho CORS (a CDN só o envia quando há Origin)
            ? loadExportImage(`${sanitizeAvatarUrl(t.avatar)}?export`, true)
            : Promise.resolve(null)))
    ]);

    // Layout (px CSS)
    const PAD = 16, HEAD_H = 92, THEAD_H = 34, ROW_H = 57;
    const legend = zoneLegendItems(m.z, m.finalized);
    const LEGEND_H = 46;
    const H = HEAD_H + THEAD_H + n * ROW_H + LEGEND_H;
    const colPC = EXPORT_W - 14, colPF = colPC - 86, colVD = colPF - 84;
    const colTeam = 56;

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_W * EXPORT_SCALE;
    canvas.height = H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.textBaseline = 'middle';

    // Card
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, EXPORT_W, H);
    ctx.save();
    roundRect(ctx, 0.5, 0.5, EXPORT_W - 1, H - 1, 8);
    ctx.fillStyle = c.surface;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = c.accent;
    ctx.fillRect(0, 0, EXPORT_W, 4);

    // Cabeçalho: escudo, nome, subtítulo
    const crestH = 56, crestW = Math.round(crestH * 141 / 160);
    if (crest) ctx.drawImage(crest, PAD, 4 + 16, crestW, crestH);
    const tx = PAD + crestW + 14;
    ctx.fillStyle = c.accent;
    setFont(ctx, 900, 20, 'expanded');
    ctx.fillText(fitText(ctx, m.meta.name.toUpperCase(), EXPORT_W - tx - PAD), tx, 38);
    ctx.fillStyle = c.text2;
    setFont(ctx, 400, 13);
    ctx.fillText(m.subtitle, tx, 64);

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

    ctx.restore();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, EXPORT_W - 1, H - 1, 8);
    ctx.stroke();
    return canvas;
}

/**
 * Exporta a série selecionada na aba Ligas: compartilha (celular) ou baixa.
 * @param {HTMLButtonElement} btn
 */
async function exportStandings(btn) {
    const league = appState.leagues.find(l => l.info.tier === appState.series);
    if (!league || btn.disabled) return;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try {
        const canvas = await drawStandingsCanvas(league);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        if (!blob) throw new Error('canvas vazio');
        const name = `khc-${appState.season}-${league.info.tier}.png`;
        const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
        const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

        if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: `${SERIES_META[league.info.tier].name} · ${appState.season}` });
                return;
            } catch (e) {
                if (e && e.name === 'AbortError') return; // usuário cancelou
            }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
        console.error('Falha ao exportar tabela', e);
        alert('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
    }
}
