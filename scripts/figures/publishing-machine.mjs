/** Static, build-time geometry. World dimensions describe this object, not UI tokens. */
import * as k from '../../vendor/anatomy/iso-kit.mjs';
import * as A from '../../vendor/anatomy/audit.mjs';

export function buildMachine({ audit = false } = {}) {
    const width = 760, height = 460;
    const deck = { x: -112, y: -100, w: 224, d: 228, r: 9 };
    const P = k.fitProjection(k.boxCorners(deck, -6, 90), width, height, { pad: 42, azimuth: 46, elevation: 35 });
    const at = point => k.iso(point, P);
    const R = A.recorder(P);
    function slab(name, plan, z, h, { tone = 'mid', lit = false, inner = '', moving = false } = {}) {
        const shape = R.solid(A.slab(plan, z, h, { name, ground: name.startsWith('stand.') }, 5));
        const paths = k.slabOf(plan, z, h, P, 5, Math.min(0.7, h / 3));
        const svg = k.solidSvg(paths, { tone, lit, inner });
        R.put({ name, at: [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, shapes: [shape],
            ...(moving ? { piece: 'release', move: [0, -48, 0] } : {}) });
    }
    const plan = (x, y, w, d, r = 1) => ({ x, y, w, d, r });
    const outline = (p, z, tone = 'lo') => k.lineSvg(k.planOutline(p, z, P, 5), { tone });
    const screws = (p, z) => {
        const points = k.corners(p, Math.min(4, p.w / 4, p.d / 4));
        return k.lineSvg(points.map(([x, y]) => k.ring(x, y, 0.9, z, P, 12)).join(''), { tone: 'lo' }) + k.dotsSvg(points.map(([x, y]) => at([x, y, z])), { size: 0.4, tone: 'hi' });
    };
    for (const [i, [x, y]] of k.corners(deck, 18).entries()) {
        slab(`stand.sole-${i}`, plan(x - 8, y - 8, 16, 16, 3), -6, 1, { tone: 'lo' });
        slab(`foot-${i}`, plan(x - 7, y - 7, 14, 14, 2), -5, 5, { tone: 'lo' });
    }
    slab('deck', deck, 0, 6, { tone: 'lo', inner: outline(k.insetPlan(deck, 4), 6, 'faint') + screws(deck, 6) });
    const plate = plan(-97, 94, 30, 14, 1);
    slab('nameplate', plate, 6, 0.6, { inner: outline(k.insetPlan(plate, 1.3), 6.6, 'faint') + k.faceTextSvg(k.topMatrix([-94, 104], 6.6, P), 'PROOF 01', { size: 3.2 }) });
    slab('bed-plinth', plan(-52, -62, 104, 172, 2), 6, 5, { tone: 'lo' });
    slab('bed-surface', plan(-48, -62, 96, 172, 1), 11, 1, { inner: outline(plan(-42, -55, 84, 158, 1), 12, 'faint') });
    slab('feeder-shelf', plan(-44, -90, 88, 28, 2), 6, 6, { tone: 'lo' });
    for (const x of [-48, 44]) {
        slab(`guide-${x}`, plan(x, -62, 4, 180), 12, 4, { tone: 'mid', inner: screws(plan(x, -62, 4, 180), 16) });
    }
    for (const x of [-44, 40]) slab(`feeder-fence-${x}`, plan(x, -90, 4, 24), 12, 4);
    slab('feeder-stop', plan(-44, -66, 88, 4), 12, 4);
    for (let i = 0; i < 4; i++) slab(`blank-${i}`, plan(-32, -88, 64, 22, 0.4), 12 + i * 0.7, 0.7, { tone: 'hi' });
    for (const x of [-72, 62]) for (const y of [-26, 20]) {
        const pad = plan(x - 4, y - 4, 18, 18, 2);
        slab(`post-pad-${x}-${y}`, pad, 6, 4, { inner: screws(pad, 10) });
        const post = plan(x, y, 10, 10, 1);
        slab(`post-${x}-${y}`, post, 10, 62, { inner: k.lineSvg(k.sideSeam(post, 22, P, 5), { tone: 'faint' }) });
    }
    for (const y of [-30, 16]) slab(`crossbeam-${y}`, plan(-76, y, 152, 18, 2), 72, 12, { inner: outline(plan(-71, y + 4, 142, 10), 84, 'faint') });
    for (const x of [-76, 58]) slab(`bridge-${x}`, plan(x, -12, 18, 28), 72, 12);
    const cap = plan(-76, -30, 152, 64, 3);
    slab('top-cap', cap, 84, 3, { inner: outline(k.insetPlan(cap, 3), 87, 'faint') });
    for (const [i, [x, y]] of k.corners(cap, 8).entries()) slab(`cap-fastener-${i}`, plan(x - 1.3, y - 1.3, 2.6, 2.6, 0.2), 87, 1, { tone: 'hi' });
    const housing = plan(-38, 20, 76, 38, 3);
    slab('inspection-housing', housing, 47, 12, { inner: k.lineSvg(k.sideSeam(housing, 52, P, 5), { tone: 'faint' }) });
    for (const x of [-34, 26]) slab(`inspection-mount-${x}`, plan(x, 20, 8, 12), 59, 13);
    slab('inspection-window', plan(-29, 36, 58, 18, 2), 59, 0.4, { tone: 'hi', inner: outline(plan(-25, 39, 50, 12), 59.4, 'faint') });
    for (const x of [-33, 30]) slab(`window-retainer-${x}`, plan(x, 35, 3, 20, 0.5), 59, 1);
    for (let i = 0; i < 3; i++) slab(`cooling-slot-${i}`, plan(-20 + i * 13, 26, 9, 2, 0.6), 59, 0.25, { tone: 'lo' });
    slab('proof-sheet', plan(-32, -42, 64, 28, 0.4), 12, 0.6, { tone: 'hi' });
    slab('proof-image', plan(-27, -38, 23, 20, 0.3), 12.6, 0.2, { tone: 'lo' });
    slab('delivery-shelf', plan(-52, 110, 104, 8, 1), 6, 6, { tone: 'lo' });
    slab('delivery-end-lip', plan(-48, 118, 96, 3, 0.6), 6, 10);
    for (const x of [-52, 48]) slab(`delivery-side-${x}`, plan(x, 110, 4, 8, 0.6), 12, 4);
    const paper = plan(-32, 64, 64, 38, 0.4);
    const rules = [0, 1, 2].map(i => k.lineSvg(k.lineOnTop([-26, 88 + i * 3], [i === 2 ? 10 : 25, 88 + i * 3], 12.7, P), { tone: 'mid', free: true })).join('');
    const paperImage = outline(plan(-26, 69, 52, 14, 0.5), 12.7, 'lo');
    slab('released-sheet', paper, 12, 0.6, { lit: true, inner: `<g data-paper-image>${paperImage}</g>${rules}`, moving: true });

    // Static depth solution includes the released sheet's entire unobstructed corridor.
    A.settle(R, P, { states: [0, 0.5, 1] });
    if (audit) A.auditOrExit(R, P, { argv: ['--audit'], frames: Array.from({ length: 61 }, (_, i) => i / 60), apart: 1 });
    const solids = [...R.items].sort((a, b) => a.key - b.key).map(item => `<g data-part="${item.name}"${item.name === 'released-sheet' ? ' data-sheet-release' : item.name === 'inspection-window' ? ' data-inspection-window' : ''}>${item.svg}</g>`).join('');
    const vector = [0, -48, 0].map(Number);
    const a = at([0, 0, 0]), b = at(vector);
    const svg = k.figureSvg({ width, height, label: 'A desktop proofing press with a paper feeder, inspection window and delivery tray. A sheet is released only after publishing the example.', body: `<path class="iso-halo" d="${k.haloOf(deck, -6, 6, P)}"/>` + solids, className: 'workbench-machine' }).replace('<svg ', `<svg data-sheet-offset-x="${(b[0] - a[0]).toFixed(3)}" data-sheet-offset-y="${(b[1] - a[1]).toFixed(3)}" `);
    return { svg, parts: R.items.length };
}
