/** Shared visual formatting for structured entry and page editors. */
export function createRichTextEnhancer(markDirty, announce) {
/** Apply a bounded inline format to the saved selection, using DOM nodes only. */
function wrapSelection(range, tag, canvas, url) {
    if (!range || range.collapsed || !canvas.contains(range.commonAncestorContainer)) {
        announce('Select the text you want to format first.');
        return false;
    }
    const wrapper = document.createElement(tag);
    if (url) wrapper.setAttribute('href', url);
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
    const selection = window.getSelection();
    selection.removeAllRanges();
    range.selectNodeContents(wrapper);
    selection.addRange(range);
    return true;
}

function enhanceRichText(section) {
    const source = section.querySelector('[data-rich-source]');
    if (!source) return;
    const canvas = section.querySelector('[data-rich-canvas]');
    const toolbar = section.querySelector('[data-toolbar]');
    // Initial HTML is rendered and sanitized by the server, never built from pasted HTML.
    section.querySelector('[data-html-source]').hidden = true;
    canvas.hidden = false;
    toolbar.hidden = false;
    let savedRange;
    const sync = () => { source.value = canvas.innerHTML; markDirty(); };
    const remember = () => {
        const selection = window.getSelection();
        if (selection.rangeCount && canvas.contains(selection.getRangeAt(0).commonAncestorContainer)) {
            savedRange = selection.getRangeAt(0).cloneRange();
        }
    };
    canvas.addEventListener('keyup', remember);
    canvas.addEventListener('pointerup', remember);
    canvas.addEventListener('input', () => { remember(); sync(); });
    canvas.addEventListener('paste', event => {
        event.preventDefault();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!canvas.contains(range.commonAncestorContainer)) return;
        range.deleteContents();
        const fragment = document.createDocumentFragment();
        const lines = event.clipboardData.getData('text/plain').split(/\r?\n/);
        lines.forEach((line, index) => {
            if (index) fragment.append(document.createElement('br'));
            fragment.append(document.createTextNode(line));
        });
        const last = fragment.lastChild;
        if (last) { range.insertNode(fragment); range.setStartAfter(last); range.collapse(true); }
        selection.removeAllRanges(); selection.addRange(range);
        remember(); sync();
    });
    // A drop must not introduce external images, files, or arbitrary HTML.
    canvas.addEventListener('drop', event => event.preventDefault());
    toolbar.addEventListener('mousedown', event => event.preventDefault());
    toolbar.addEventListener('click', event => {
        const button = event.target.closest('[data-format]');
        if (!button) return;
        const format = button.dataset.format;
        if (!savedRange || savedRange.collapsed || !canvas.contains(savedRange.commonAncestorContainer)) {
            announce('Select the text you want to format first.'); return;
        }
        if (format === 'link') {
            const dialog = document.querySelector('[data-link-dialog]');
            const input = dialog.querySelector('[data-link-url]');
            input.value = '';
            dialog.returnValue = '';
            dialog.showModal();
            dialog.addEventListener('close', () => {
                if (dialog.returnValue !== 'apply') return;
                let url;
                try { url = new URL(input.value.trim()); } catch { announce('Use a complete HTTPS or HTTP URL.'); return; }
                if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
                    announce('Use a complete HTTPS or HTTP URL without login details.'); return;
                }
                if (wrapSelection(savedRange, 'a', canvas, url.href)) { sync(); remember(); }
            }, {once:true});
        } else if (format === 'unlink') {
            let node = savedRange.commonAncestorContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            const link = node.closest('a');
            if (link && canvas.contains(link)) { link.replaceWith(...link.childNodes); sync(); }
            else announce('Select text inside one link to remove its destination.');
        } else if (['strong','em'].includes(format)) {
            if (wrapSelection(savedRange, format, canvas)) { sync(); remember(); }
        }
    });
}

return enhanceRichText;
}
