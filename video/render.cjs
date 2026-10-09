#!/usr/bin/env node
// Renderiza um vídeo da KHC quadro a quadro: serve a pasta do repositório,
// abre a página no Chromium (Playwright), chama window.seek(t) para cada
// quadro e manda as capturas para o ffmpeg.
//
// Uso:
//   node video/render.cjs video/semana5/index.html saida.mp4 [--fps 30] [--from 0 --to 35.5]
//   node video/render.cjs video/semana5/index.html quadros/ --stills 3.5,10,20   (PNG de conferência)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); } catch {
    ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')));
}

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function serve() {
    const srv = http.createServer((req, res) => {
        const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404); return res.end();
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

function arg(name, def) {
    const i = process.argv.indexOf('--' + name);
    return i > 0 ? process.argv[i + 1] : def;
}

(async () => {
    const [page_, out] = process.argv.slice(2);
    const fps = +arg('fps', 30);
    const srv = await serve();
    const url = `http://127.0.0.1:${srv.address().port}/${path.relative(ROOT, path.resolve(page_))}`;
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.error('erro na página:', e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.loaded === true, null, { timeout: 30000 });
    const dur = await page.evaluate(() => window.duration);

    const stills = arg('stills');
    if (stills) {
        fs.mkdirSync(out, { recursive: true });
        for (const t of stills.split(',').map(Number)) {
            await page.evaluate(x => window.seek(x), t);
            await page.screenshot({ path: path.join(out, `t${t.toFixed(2)}.png`) });
        }
        await browser.close(); srv.close();
        return;
    }

    const from = +arg('from', 0), to = +arg('to', dur);
    const n = Math.round((to - from) * fps);
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps),
        '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
        await page.evaluate(x => window.seek(x), from + i / fps);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (i % 150 === 0) console.log(`quadro ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    await browser.close(); srv.close();
    console.log(`${out}: ${n} quadros em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})().catch(e => { console.error(e); process.exit(1); });
