const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
let building = false;
let pending = false;
function build() {
    if (building) { pending = true; return; }
    building = true;
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
    child.on('exit', () => {
        building = false;
        if (pending) { pending = false; build(); }
    });
    return child;
}
const firstBuild = build();
firstBuild.on('exit', code => {
    if (code) return;
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain' };
    http.createServer((request, response) => {
        if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(501); response.end('Local preview does not process contact forms.'); return; }
        let file;
        try { file = path.resolve(output, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
        catch { response.writeHead(400); response.end(); return; }
        if (!file.startsWith(output + path.sep) && file !== output) { response.writeHead(403); response.end(); return; }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) { response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(fs.readFileSync(path.join(output, '404.html'))); return; }
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        if (request.method === 'HEAD') response.end(); else fs.createReadStream(file).pipe(response);
    }).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
    let timer;
    const rebuild = () => { clearTimeout(timer); timer = setTimeout(build, 150); };
    for (const folder of ['content', 'templates', 'components', 'data', 'src', 'scripts']) fs.watch(path.join(root, folder), { recursive: true }, rebuild);
    for (const file of ['style.css', 'tailwind.config.js', 'script.js', 'pages.json', 'robots.txt', 'public/js/case-study.js']) fs.watch(path.join(root, file), rebuild);
});
