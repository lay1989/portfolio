const test = require('node:test');
const assert = require('node:assert/strict');

test('contact requests preserve special characters and submit the form identity', async t => {
    const { submitContactForm } = await import('../src/api.js');
    const fields = new FormData();
    fields.set('form-name', 'contact');
    fields.set('message', 'A&B + a catalog?');
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, './');
        assert.equal(options.method, 'POST');
        assert.equal(new URLSearchParams(options.body).get('message'), 'A&B + a catalog?');
        assert.equal(new URLSearchParams(options.body).get('form-name'), 'contact');
        return { ok: true };
    });
    assert.equal((await submitContactForm(fields)).ok, true);
});

test('a stalled contact request aborts instead of leaving the form sending forever', async t => {
    const { submitContactForm } = await import('../src/api.js');
    t.mock.timers.enable({ apis: ['setTimeout'] });
    t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const pending = assert.rejects(submitContactForm(new FormData()), /aborted/);
    t.mock.timers.tick(15000);
    await pending;
});

test('failed responses are returned to the form handler as failures', async t => {
    const { submitContactForm } = await import('../src/api.js');
    t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 500 }));
    assert.equal((await submitContactForm(new FormData())).ok, false);
});

test('lead analytics includes no contact details', async t => {
    const { trackContactAction } = await import('../src/analytics.js');
    const calls = [];
    const original = globalThis.window;
    globalThis.window = { location: { pathname: '/index.html' }, gtag: (...args) => calls.push(args) };
    t.after(() => { if (original === undefined) delete globalThis.window; else globalThis.window = original; });
    trackContactAction('generate_lead');
    assert.deepEqual(calls, [['event', 'generate_lead', { page_path: '/index.html' }]]);
});

test('the form retains details on failure and allows a successful retry', async t => {
    const { initContactForm } = await import('../src/components.js');
    const button = { disabled: false, textContent: 'Send project details' };
    const status = { hidden: true, dataset: {}, textContent: '' };
    let submit;
    let resets = 0;
    const attributes = new Map();
    const form = {
        dataset: {},
        querySelector: () => button,
        addEventListener: (event, handler) => { submit = handler; },
        reportValidity: () => true,
        setAttribute: (key, value) => attributes.set(key, value),
        removeAttribute: key => attributes.delete(key),
        reset: () => resets++,
    };
    const originals = { document: globalThis.document, window: globalThis.window, FormData: globalThis.FormData };
    globalThis.document = { querySelector: () => form, getElementById: () => status };
    const events = [];
    globalThis.window = { location: { pathname: '/' }, gtag: (...args) => events.push(args) };
    globalThis.FormData = class extends originals.FormData { constructor() { super(); this.set('form-name', 'contact'); } };
    t.after(() => {
        for (const [key, value] of Object.entries(originals)) {
            if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
        }
    });
    const fetch = t.mock.method(globalThis, 'fetch', async () => ({ ok: false }));
    initContactForm();
    await submit({ preventDefault() {} });
    assert.equal(status.dataset.state, 'error');
    assert.equal(resets, 0);
    assert.equal(button.disabled, false);
    assert.equal(attributes.has('aria-busy'), false);
    assert.equal(events.length, 0);
    fetch.mock.mockImplementation(async () => ({ ok: true }));
    await submit({ preventDefault() {} });
    assert.equal(status.dataset.state, 'success');
    assert.equal(resets, 1);
    assert.equal(events[0][1], 'generate_lead');
});
