const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const projectRoot = 'c:\\Users\\SHREE\\Desktop\\portfolio';
const contentIndexPath = path.join(projectRoot, 'content', 'index.html');
const indexPath = path.join(projectRoot, 'index.html');

console.log('--- Homepage Verification ---');

function verifyFile(filePath, isBuildResult) {
    console.log(`\nVerifying: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File does not exist!`);
        return false;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    let ok = true;

    // 1. Absence of banned words ("seamless", "empower", "streamline")
    const banned = ['seamless', 'empower', 'streamline'];
    banned.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        // Let's test if the text content of the body/main contains it
        const text = isBuildResult ? $('body').text() : $('main').text();
        if (regex.test(text)) {
            console.error(`[-] Fail: Found banned word "${word}" in text content.`);
            ok = false;
        } else {
            console.log(`[+] Pass: Banned word "${word}" is absent.`);
        }
    });

    // 2. Number of bento cells is exactly 3
    const bentoGrid = $('div.grid.grid-cols-1.md\\:grid-cols-3.gap-6');
    if (bentoGrid.length === 0) {
        console.error(`[-] Fail: Bento grid container not found.`);
        ok = false;
    } else {
        const cells = bentoGrid.children('div');
        console.log(`[i] Found ${cells.length} cells in the grid.`);
        if (cells.length === 3) {
            console.log(`[+] Pass: Exactly 3 bento cells found.`);
        } else {
            console.error(`[-] Fail: Found ${cells.length} bento cells instead of 3.`);
            ok = false;
        }
    }

    // 3. Engineering Philosophy left-hand column uses sticky and top-* utility classes
    const leftColumn = $('#principles div.md\\:col-span-4');
    if (leftColumn.length === 0) {
        console.error(`[-] Fail: Engineering Philosophy left-hand column not found.`);
        ok = false;
    } else {
        const classes = leftColumn.attr('class') || '';
        const hasSticky = classes.includes('sticky') || classes.includes('md:sticky');
        const hasTop = /top-\d+|md:top-\d+/.test(classes);
        if (hasSticky && hasTop) {
            console.log(`[+] Pass: Left column uses sticky and top-* classes (classes: "${classes}").`);
        } else {
            console.error(`[-] Fail: Left column does not use sticky or top-* classes (classes: "${classes}").`);
            ok = false;
        }
    }

    // 4. Form attributes (id="submit-btn", id="contact-status", no onsubmit="submit")
    const form = $('#contact-form');
    if (form.length === 0) {
        console.error(`[-] Fail: Contact form not found.`);
        ok = false;
    } else {
        const onsubmit = form.attr('onsubmit');
        if (onsubmit) {
            console.error(`[-] Fail: Contact form has onsubmit attribute: "${onsubmit}".`);
            ok = false;
        } else {
            console.log(`[+] Pass: Contact form has no onsubmit attribute.`);
        }

        const submitBtn = form.find('#submit-btn');
        if (submitBtn.length === 1) {
            console.log(`[+] Pass: Found button with id="submit-btn".`);
        } else {
            console.error(`[-] Fail: Button with id="submit-btn" not found or multiple found.`);
            ok = false;
        }

        const contactStatus = form.find('#contact-status');
        if (contactStatus.length === 1) {
            console.log(`[+] Pass: Found status div with id="contact-status".`);
        } else {
            console.error(`[-] Fail: Status div with id="contact-status" not found or multiple found.`);
            ok = false;
        }

        // Check if name attributes exist on inputs and textarea
        const inputs = form.find('input, textarea');
        console.log(`[i] Form has ${inputs.length} input/textarea elements.`);
        let nameMissing = false;
        inputs.each((i, el) => {
            const type = $(el).attr('type');
            if (type === 'hidden' && $(el).attr('name') === 'form-name') {
                return; // form-name is hidden
            }
            const name = $(el).attr('name');
            const placeholder = $(el).attr('placeholder') || '';
            const tagName = el.tagName;
            if (!name) {
                console.warn(`[!] Warning: ${tagName} (placeholder: "${placeholder}") has NO name attribute! FormData will ignore this field!`);
                nameMissing = true;
            } else {
                console.log(`[+] Info: ${tagName} has name="${name}".`);
            }
        });
        if (nameMissing) {
            console.error(`[-] Fail: Inputs in contact-form are missing 'name' attributes, rendering form submissions empty in JavaScript FormData payload.`);
            ok = false;
        }
    }

    return ok;
}

const contentOk = verifyFile(contentIndexPath, false);
const indexOk = verifyFile(indexPath, true);

if (contentOk && indexOk) {
    console.log('\n>>> ALL BASIC CHECKS PASSED SUCCESSFULLY! <<<');
} else {
    console.log('\n>>> SOME CHECKS FAILED! <<<');
}
