import { initialState, transition, describe, validDraft, sameContent, canPublish } from './model.js';
import { initMotion, motion, motionAllowed, onMotionCleanup } from '../motion/index.js';

/** Mount one disposable, in-memory demonstration with native HTML controls. */
export function mountWorkbench(root) {
    const title = root.querySelector('[data-draft-title]');
    const layout = root.querySelector('[data-draft-layout]');
    const previewButton = root.querySelector('[data-action="preview"]');
    const publishButton = root.querySelector('[data-action="publish"]');
    const resetButton = root.querySelector('[data-action="reset"]');
    const status = root.querySelector('[data-workbench-status]');
    const previewPage = root.querySelector('[data-preview-page]');
    const machine = root.querySelector('svg');
    let state = initialState();
    let visible = false;
    const animations = new Set();
    const controller = new AbortController();
    const listen = (node, event, handler) => node.addEventListener(event, handler, { signal: controller.signal });
    const cancelMotion = () => {
        animations.forEach(animation => animation.cancel());
        animations.clear();
    };
    const disposeMotion = initMotion(() => onMotionCleanup(cancelMotion));
    const observer = new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting;
        if (!visible) cancelMotion();
    });
    observer.observe(machine);
    listen(document, 'visibilitychange', () => { if (document.hidden) cancelMotion(); });
    listen(window, 'pagehide', cancelMotion);

    function animate(action) {
        cancelMotion();
        if (!visible || document.hidden || !motionAllowed()) return;
        const target = root.querySelector(action === 'publish' ? '[data-sheet-release]' : '[data-inspection-window]');
        const frames = action === 'publish' ? [
            { transform: `translate(${machine.dataset.sheetOffsetX}px,${machine.dataset.sheetOffsetY}px)` },
            { transform: 'translate(0,0)' },
        ] : [{ opacity: 0.4 }, { opacity: 1 }];
        const animation = target.animate?.(frames, { duration: motion.durations.reveal, easing: motion.easing.css });
        if (animation) {
            animations.add(animation);
            const release = () => animations.delete(animation);
            animation.addEventListener('finish', release, { once: true });
            animation.addEventListener('cancel', release, { once: true });
        }
    }

    function render() {
        const current = sameContent(state.preview, state.draft);
        const previewState = !state.preview ? 'none' : current ? 'current' : 'stale';
        root.dataset.preview = previewState;
        root.dataset.layout = state.public.layout;
        title.setAttribute('aria-invalid', String(!validDraft(state.draft)));
        previewButton.disabled = !validDraft(state.draft);
        publishButton.disabled = !canPublish(state);
        root.querySelector('[data-preview-state]').textContent = { none: 'No preview yet', current: 'Current draft', stale: 'Out of date' }[previewState];
        previewPage.hidden = !state.preview;
        root.querySelector('[data-preview-empty]').hidden = !!state.preview;
        if (state.preview) {
            root.querySelector('[data-preview-title]').textContent = state.preview.title;
            previewPage.dataset.layout = state.preview.layout;
        }
        root.querySelector('[data-public-title]').textContent = state.public.title;
        root.querySelector('[data-public-page]').dataset.layout = state.public.layout;
        root.querySelector('[data-release-count]').textContent = `${state.releases} ${state.releases === 1 ? 'release' : 'releases'}`;
        const message = describe(state);
        if (status.textContent !== message) status.textContent = message;
        root.querySelector('[data-action-status]').textContent = message;
        root.querySelector('[data-result-link]').hidden = state.releases === 0;
    }
    function dispatch(action) {
        const previous = state;
        state = transition(state, action);
        render();
        if (state !== previous && ['preview', 'publish'].includes(action.type)) animate(action.type);
        if (action.type === 'reset') {
            cancelMotion();
            title.value = state.draft.title;
            layout.value = state.draft.layout;
        }
    }
    listen(title, 'input', () => dispatch({ type: 'edit', title: title.value }));
    listen(layout, 'change', () => dispatch({ type: 'edit', layout: layout.value }));
    listen(previewButton, 'click', () => dispatch({ type: 'preview' }));
    listen(publishButton, 'click', () => dispatch({ type: 'publish' }));
    listen(resetButton, 'click', () => dispatch({ type: 'reset' }));
    render();
    root.querySelector('[data-workbench-controls]').hidden = false;
    return () => { controller.abort(); observer.disconnect(); disposeMotion(); cancelMotion(); };
}

document.querySelectorAll('[data-workbench]').forEach(mountWorkbench);
