/** Line drawings live in app/templates/drawings so Flask templates and the
 *  static build share one source. `{{DRAWING:name}}` inserts a drawing inline. */
const fs = require('node:fs');
const path = require('node:path');
const folder = path.resolve(__dirname, '../app/templates/drawings');

function drawing(name) {
    const file = path.join(folder, `${name}.svg`);
    if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) throw new Error(`Unknown drawing: ${name}`);
    return fs.readFileSync(file, 'utf8').trim();
}

function withDrawings(html) {
    return html.replace(/\{\{DRAWING:([a-z0-9-]+)\}\}/g, (_, name) => drawing(name));
}

module.exports = { drawing, withDrawings };
