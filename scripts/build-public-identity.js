/** Publish only the approved identity exports; research and source archives stay private. */
const fs = require('node:fs');
const path = require('node:path');
const { buildKit, directory } = require('./identity-kit');
const { readDesign } = require('./design-system');
const root = path.resolve(__dirname, '..');
async function buildPublicIdentity() {
    const identity = JSON.parse(fs.readFileSync(path.join(root, 'design/identity-concepts.json')));
    if (!identity.integration?.approved) throw Error('Identity integration requires owner selection');
    await buildKit(identity, readDesign().system);
    const destination = path.join(root, 'public/identity');
    fs.mkdirSync(destination, { recursive: true });
    for (const name of ['horizontal-evergreen.svg', 'horizontal-white.svg', 'symbol-evergreen.svg', 'symbol-white.svg', 'favicon-48.png', 'favicon.ico', 'apple-touch-icon.png', 'app-icon-192.png', 'app-icon-512.png']) {
        fs.copyFileSync(path.join(directory, name), path.join(destination, name));
    }
    fs.copyFileSync(path.join(directory, 'favicon.svg'), path.join(root, 'public/favicon.svg'));
    fs.copyFileSync(path.join(directory, 'default-sharing.png'), path.join(root, 'public/images/og-image.png'));
}
module.exports = { buildPublicIdentity };
