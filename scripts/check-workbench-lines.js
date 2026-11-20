/** Exact segment checks for the generated polygonal SVG; no browser is launched. */
const fs = require('node:fs');
const cheerio = require('cheerio');
const source = fs.readFileSync('.cache/flask-templates/publishing-machine.html', 'utf8');
const $ = cheerio.load(source, { xmlMode: true });
function segments(d) {
    if (/[^MLZ\d\s.,+-]/.test(d)) throw new Error('Unsupported SVG path command in line check');
    const parts = d.match(/[MLZ]|[-+]?\d*\.?\d+/g) || [];
    const result = [];
    let point, start;
    for (let i = 0; i < parts.length;) {
        const command = parts[i++];
        if (command === 'Z') { result.push([point, start]); point = start; }
        else {
            const next = [Number(parts[i++]), Number(parts[i++])];
            if (command === 'M') start = next;
            else if (command === 'L') result.push([point, next]);
            else throw new Error('Unexpected path format');
            point = next;
        }
    }
    return result;
}
function distance(p, [a, b]) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
let checked = 0;
const failures = [];
for (const line of $('path.iso-line').toArray()) {
    const node = $(line), d = node.attr('d') || '';
    if (node.is('.iso-edge,.iso-crease,.iso-bevel') || node.attr('data-free') !== undefined || /Z\s*$/.test(d)) continue;
    const paths = segments(d);
    const parent = node.closest('[data-part]');
    const anchors = parent.find('path.iso-line').toArray().filter(other => other !== line).flatMap(other => segments($(other).attr('d') || ''));
    for (const endpoint of [paths[0][0], paths.at(-1)[1]]) {
        checked++;
        const nearest = Math.min(...anchors.map(segment => distance(endpoint, segment)));
        if (nearest > 1) failures.push({ part: parent.attr('data-part'), distance: nearest });
    }
}
console.log(JSON.stringify({ scope: 'Exact generated M/L/Z paths; open seams must meet a stroke on their own part. Printed text rules are exempt. Theme-independent; no browser visibility or screenshot audit.', endpoints_checked: checked, failures }, null, 2));
if (failures.length) process.exitCode = 1;
