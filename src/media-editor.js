/** Image placement controls. Position values are content; formats come from shared design data. */
let uploadsInProgress = 0;

export function replaceTokens(root, replacements) {
    root.querySelectorAll('*').forEach(node => {
        for (const attribute of [...node.attributes]) {
            let value = attribute.value;
            for (const [from, to] of Object.entries(replacements)) value = value.replaceAll(from, to);
            if (value !== attribute.value) node.setAttribute(attribute.name, value);
        }
        if (node.tagName === 'TEMPLATE') replaceTokens(node.content, replacements);
    });
}

function allSelects(root) {
    return [...root.querySelectorAll('[data-asset-select]'), ...[...root.querySelectorAll('template')].flatMap(template => allSelects(template.content))];
}

function report(message) {
    const region = document.querySelector('[data-media-status]');
    if (region) region.textContent = message;
}

function enhancePlacement(wrapper, onChange) {
    if (wrapper.dataset.mediaReady) return;
    wrapper.dataset.mediaReady = 'true';
    const select = wrapper.querySelector('[data-asset-select]');
    const preview = wrapper.querySelector('[data-media-preview]');
    const image = wrapper.querySelector('[data-media-preview-image]');
    const alt = wrapper.querySelector('[data-image-alt]');
    const upload = wrapper.querySelector('[data-upload-image]');
    let mode = 'desktop';
    wrapper.querySelector('[data-inline-upload]').hidden = false;
    wrapper.querySelector('[data-preview-buttons]').hidden = wrapper.dataset.singleCrop === 'true';
    const cropSelect = device => wrapper.querySelector(`[data-crop-ratio="${device}"]`);
    const focusValue = name => Number(wrapper.querySelector(`[data-focus="${name}"]`).value);
    const redraw = () => {
        const option = select.selectedOptions[0];
        preview.hidden = !select.value;
        if (!select.value) { image.removeAttribute('src'); return; }
        if (image.getAttribute('src') !== option.dataset.url) image.src = option.dataset.url;
        let crop = cropSelect(mode);
        if (crop.value === 'same') crop = cropSelect('desktop');
        const width = Number(option.dataset.width), height = Number(option.dataset.height);
        const aspect = Number(crop.selectedOptions[0].dataset.aspect) || width / height;
        const cropWidth = Math.min(width, Math.max(1, Math.round(height * aspect)));
        const cropHeight = Math.min(height, Math.max(1, Math.round(width / aspect)));
        const x = focusValue(mode === 'mobile' ? 'mobile_x' : 'x');
        const y = focusValue(mode === 'mobile' ? 'mobile_y' : 'y');
        const left = Math.max(0, Math.min(width - cropWidth, width * x / 100 - cropWidth / 2));
        const top = Math.max(0, Math.min(height - cropHeight, height * y / 100 - cropHeight / 2));
        preview.style.aspectRatio = String(aspect);
        image.style.objectPosition = `${width === cropWidth ? 50 : left / (width - cropWidth) * 100}% ${height === cropHeight ? 50 : top / (height - cropHeight) * 100}%`;
        wrapper.querySelectorAll('[data-focus]').forEach(input => input.parentElement.querySelector('output').textContent = `${input.value}%`);
    };
    select.addEventListener('change', () => {
        if (select.value && !alt.value.trim()) alt.value = select.selectedOptions[0].dataset.alt || '';
        redraw(); onChange();
    });
    wrapper.querySelectorAll('[data-crop-ratio],[data-focus]').forEach(input => input.addEventListener('input', redraw));
    wrapper.querySelectorAll('[data-preview-mode]').forEach(button => button.addEventListener('click', () => {
        mode = button.dataset.previewMode;
        wrapper.querySelectorAll('[data-preview-mode]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
        redraw();
    }));
    upload.addEventListener('change', async () => {
        const file = upload.files[0];
        if (!file) return;
        if (file.size > Number(upload.dataset.maxBytes)) { report(`Choose an image smaller than ${Number(upload.dataset.maxBytes) / 1024 / 1024} MB.`); return; }
        const body = new FormData(); body.set('image',file);
        body.set('alt',alt.value);
        const csrf = wrapper.closest('form').querySelector('[name="csrf_token"]').value;
        uploadsInProgress += 1; upload.disabled = true;
        report('Uploading and preparing image sizes… Keep this page open.');
        try {
            const response = await fetch('/admin/media/upload',{method:'POST',body,headers:{'X-CSRFToken':csrf,'Accept':'application/json'},signal:AbortSignal.timeout(120000)});
            const result = await response.json().catch(()=>({error:'The upload could not finish. Check your sign-in and try again.'}));
            if (!response.ok) throw new Error(result.error || 'The image could not be uploaded.');
            const asset = result.asset;
            for (const target of allSelects(document)) {
                if ([...target.options].some(option => option.value === asset.id)) continue;
                const option = document.createElement('option');
                option.value = asset.id; option.textContent = `${asset.title} (${asset.width} × ${asset.height})`;
                Object.assign(option.dataset,{url:asset.url,width:String(asset.width),height:String(asset.height),alt:asset.alt});
                target.append(option);
            }
            select.value = asset.id; select.dispatchEvent(new Event('change',{bubbles:true}));
            report(result.reused ? 'That image was already in your library. Its existing copy is selected.' : 'Image uploaded and selected. Save a draft or preview your placement.');
            upload.value = '';
        } catch(error) {
            report(error.message === 'Failed to fetch' ? 'The upload could not connect. Your content is still here; try again.' : error.message);
        } finally { uploadsInProgress -= 1; upload.disabled = false; }
    });
    redraw();
}

function enhanceGallery(gallery, onChange) {
    if (gallery.dataset.galleryReady) return;
    gallery.dataset.galleryReady = 'true';
    const items = gallery.querySelector('[data-gallery-items]');
    const update = () => {
        const rows = [...items.children];
        rows.forEach((row,index) => {
            row.querySelector('[data-image-action="up"]').disabled = index === 0;
            row.querySelector('[data-image-action="down"]').disabled = index === rows.length - 1;
        });
    };
    gallery.querySelector('[data-add-image]').addEventListener('click',event => {
        event.preventDefault();
        if (items.children.length >= 24) { report('Use up to 24 images in a gallery.'); return; }
        const fragment = gallery.querySelector('[data-gallery-template]').content.cloneNode(true);
        replaceTokens(fragment,{'__image_id__':crypto.randomUUID().replaceAll('-','')});
        const row = fragment.querySelector('[data-gallery-item]');
        row.open = true; items.append(fragment);
        enhanceMedia(row,onChange); update(); onChange();
        row.querySelector('[data-asset-select]').focus();
        report('Gallery image added. Choose an image or upload one here.');
    });
    items.addEventListener('click',event => {
        const button = event.target.closest('[data-image-action]');
        if (!button) return;
        event.preventDefault();
        const row = button.closest('[data-gallery-item]');
        const direction = button.dataset.imageAction;
        if (direction === 'remove') {
            const next = row.nextElementSibling || row.previousElementSibling;
            row.remove(); (next?.querySelector('summary') || gallery.querySelector('[data-add-image]')).focus();
            report('Image removed from these edits. The library copy is retained.');
        } else {
            const sibling = direction === 'up' ? row.previousElementSibling : row.nextElementSibling;
            if (!sibling) return;
            if (direction === 'up') items.insertBefore(row,sibling); else items.insertBefore(sibling,row);
            button.focus(); report(`Gallery image moved ${direction}.`);
        }
        update(); onChange();
    });
    update();
}

export function enhanceMedia(root,onChange) {
    root.querySelectorAll('[data-placement]').forEach(wrapper => enhancePlacement(wrapper,onChange));
    root.querySelectorAll('[data-gallery]').forEach(gallery => enhanceGallery(gallery,onChange));
}

// Capture before the draft form clears its unsaved marker.
document.addEventListener('submit',event => {
    if (uploadsInProgress && event.target.matches('[data-content-editor], [data-page-editor]')) {
        event.preventDefault(); event.stopImmediatePropagation(); report('Wait for the image upload to finish before saving or previewing.');
    }
},true);
