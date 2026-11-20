/** An isolated example. No storage, portfolio records, or publishing endpoints. */
export const layouts = Object.freeze(['image-first', 'text-first']);
export const initialContent = Object.freeze({ title: 'A quieter workday.', layout: 'image-first' });
const copy = content => ({ ...content });
export const sameContent = (a, b) => !!a && !!b && a.title === b.title && a.layout === b.layout;
export const validDraft = draft => typeof draft.title === 'string' && !!draft.title.trim() && draft.title.trim().length <= 64 && layouts.includes(draft.layout);
export const canPublish = state => validDraft(state.draft) && sameContent(state.preview, state.draft) && !sameContent(state.preview, state.public);
export function initialState() {
    return { draft: copy(initialContent), preview: null, public: copy(initialContent), releases: 0, action: 'reset' };
}

/** Every transition returns snapshots; editing can never mutate a released page. */
export function transition(state, action) {
    switch (action.type) {
    case 'edit': {
        const draft = { ...state.draft };
        if (typeof action.title === 'string') draft.title = action.title.slice(0, 64);
        if (layouts.includes(action.layout)) draft.layout = action.layout;
        return { ...state, draft, action: 'edit' };
    }
    case 'preview':
        return validDraft(state.draft) ? { ...state, preview: copy(state.draft), action: 'preview' } : state;
    case 'publish':
        return canPublish(state) ? { ...state, public: copy(state.preview), releases: state.releases + 1, action: 'publish' } : state;
    case 'reset': return initialState();
    default: return state;
    }
}

export function describe(state) {
    if (!validDraft(state.draft)) return 'Add a title before previewing. The public example is unchanged.';
    if (state.action === 'publish') return `Example published. ${state.releases} ${state.releases === 1 ? 'release' : 'releases'} in this session.`;
    if (sameContent(state.public, state.draft)) return state.preview ? 'Draft and public example match. Make another change to try it.' : 'Change the sample title or layout to begin.';
    if (!state.preview) return 'Draft changed. Preview it before publishing.';
    if (!sameContent(state.preview, state.draft)) return 'Preview is out of date. Preview the latest draft before publishing.';
    return 'Preview is ready. The public example changes only when you publish.';
}
