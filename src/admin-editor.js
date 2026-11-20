import { createRichTextEnhancer } from './rich-text.js';
import { enhanceMedia, replaceTokens } from './media-editor.js';
/** Progressive editor controls. Content remains ordinary form data on submission. */
const form = document.querySelector('[data-content-editor], [data-page-editor]');
const state = document.querySelector('[data-save-state]');
let dirty = form?.dataset.unsaved === 'true';
const markDirty = () => {
    dirty = true;
    if (state) state.textContent = 'Unsaved changes. Save a draft or preview before publishing.';
};

function announce(message) {
    const region = document.querySelector('[data-section-status]');
    if (region) region.textContent = message;
}

const enhanceRichText = createRichTextEnhancer(markDirty, announce);

if (form?.matches('[data-content-editor]')) {
    const sections = form.querySelector('[data-sections]');
    const empty = form.querySelector('[data-empty-sections]');
    const updateSections = () => {
        const rows = [...sections.querySelectorAll('[data-section]')];
        empty.hidden = rows.length > 0;
        rows.forEach((row, index) => {
            row.querySelector('[data-section-action="up"]').disabled = index === 0;
            row.querySelector('[data-section-action="down"]').disabled = index === rows.length - 1;
        });
    };
    sections.querySelectorAll('[data-section]').forEach(enhanceRichText);
    enhanceMedia(form,markDirty);
    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    form.querySelector('[data-add-section]').addEventListener('click', event => {
        event.preventDefault();
        if (sections.children.length >= 64) { announce('Use at most 64 sections.'); return; }
        const kind = form.querySelector('[name="block_kind"]').value;
        const template = document.querySelector(`[data-section-template="${kind}"]`);
        const fragment = template.content.cloneNode(true);
        const identity = crypto.randomUUID().replaceAll('-', '');
        replaceTokens(fragment,{'__id__':identity});
        const row = fragment.querySelector('[data-section]');
        sections.append(fragment); enhanceRichText(row); enhanceMedia(row,markDirty); updateSections(); markDirty();
        row.querySelector('input:not([type="hidden"]),textarea:not([hidden]),[contenteditable],select')?.focus();
        announce(`${row.querySelector('[data-section-label]').textContent} section added.`);
    });
    sections.addEventListener('click', event => {
        const button = event.target.closest('[data-section-action]');
        if (!button) return;
        event.preventDefault();
        const row = button.closest('[data-section]');
        const direction = button.dataset.sectionAction;
        if (direction === 'remove') {
            const next = row.nextElementSibling || row.previousElementSibling;
            row.remove(); next?.querySelector('button')?.focus();
            announce('Section removed from these edits. Save your draft to keep the change.');
        } else {
            const sibling = direction === 'up' ? row.previousElementSibling : row.nextElementSibling;
            if (!sibling) return;
            if (direction === 'up') sections.insertBefore(row, sibling);
            else sections.insertBefore(sibling, row);
            announce(`Section moved ${direction}.`);
            button.focus();
        }
        updateSections(); markDirty();
    });
    form.addEventListener('submit', event => {
        sections.querySelectorAll('[data-rich-text]').forEach(wrapper => {
            wrapper.querySelector('[data-rich-source]').value = wrapper.querySelector('[data-rich-canvas]').innerHTML;
        });
        if (event.submitter?.value !== 'preview') dirty = false;
    });
    window.addEventListener('beforeunload', event => {
        if (dirty) { event.preventDefault(); event.returnValue = ''; }
    });
    updateSections();
}

const newEntry = document.querySelector('[data-new-entry]');
if (newEntry) {
    const title = newEntry.querySelector('[data-new-title]');
    const slug = newEntry.querySelector('[data-new-slug]');
    const preview = newEntry.querySelector('[data-slug-preview]');
    let customized = Boolean(slug.value);
    slug.addEventListener('input', () => { customized = Boolean(slug.value); preview.textContent = slug.value || 'your-title'; });
    title.addEventListener('input', () => {
        if (!customized) {
            slug.value = title.value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');
            preview.textContent = slug.value || 'your-title';
        }
    });
}

if (form?.matches('[data-page-editor]')) {
    enhanceMedia(form,markDirty);
    form.querySelectorAll('[data-rich-text]').forEach(enhanceRichText);
    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    form.addEventListener('submit', event => {
        form.querySelectorAll('[data-rich-text]').forEach(wrapper => {
            const canvas=wrapper.querySelector('[data-rich-canvas]');
            if(!canvas.hidden) wrapper.querySelector('[data-rich-source]').value=canvas.innerHTML;
        });
        // Keep the warning until navigation really follows a valid non-preview save.
        if(event.submitter?.value !== 'preview') dirty=false;
    });
    window.addEventListener('beforeunload', event => {
        if(dirty){event.preventDefault();event.returnValue='';}
    });
}

/** Repeatable rows share the form, formatter, and unsaved-change state. */
if (form) {
    form.querySelectorAll('[data-repeat-group]').forEach(group => {
        const rows=group.querySelector('[data-repeat-rows]');
        const add=group.querySelector('[data-repeat-add]');
        const singular=group.dataset.singular;
        const update=()=>{
            const items=[...rows.children];
            group.querySelector('[data-repeat-empty]').hidden=items.length>0;
            add.disabled=items.length>=Number(group.dataset.max);
            items.forEach((row,index)=>{
                row.querySelector('[data-repeat-row-label]').textContent=`${singular} ${index+1}`;
                for(const action of ['up','down','remove']){
                    const button=row.querySelector(`[data-repeat-action="${action}"]`);
                    button.setAttribute('aria-label',`${action==='remove'?'Remove':'Move'} ${singular.toLowerCase()} ${index+1}${action==='remove'?'':` ${action}`}`);
                    button.disabled=action==='up'&&index===0 || action==='down'&&index===items.length-1;
                }
            });
        };
        add.addEventListener('click',event=>{
            event.preventDefault();
            if(rows.children.length>=Number(group.dataset.max))return;
            const fragment=group.querySelector('[data-repeat-template]').content.cloneNode(true);
            replaceTokens(fragment,{'__id__':crypto.randomUUID().replaceAll('-',''),'__index__':String(rows.children.length+1)});
            const row=fragment.querySelector('[data-repeat-row]');
            rows.append(fragment);
            row.querySelectorAll('[data-rich-text]').forEach(enhanceRichText);
            update();markDirty();
            row.querySelector('input:not([type="hidden"]),textarea:not([hidden]),[contenteditable]')?.focus();
            announce(`${singular} added. Save a draft to keep the change.`);
        });
        rows.addEventListener('click',event=>{
            const button=event.target.closest('[data-repeat-action]');
            if(!button)return;
            event.preventDefault();
            const row=button.closest('[data-repeat-row]');
            const action=button.dataset.repeatAction;
            if(action==='remove'){
                const next=row.nextElementSibling||row.previousElementSibling;
                row.remove();
                (next?.querySelector('input:not([type="hidden"]),[contenteditable]')||add).focus();
            } else {
                const sibling=action==='up'?row.previousElementSibling:row.nextElementSibling;
                if(!sibling)return;
                if(action==='up')rows.insertBefore(row,sibling);else rows.insertBefore(sibling,row);
                button.focus();
            }
            update();markDirty();announce(`${singular} ${action==='remove'?'removed':'moved'}. Save a draft to keep the change.`);
        });
        update();
    });
}
