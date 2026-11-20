const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const { withDrawings } = require('./drawings');
const folder = path.resolve('.cache/flask-templates');
fs.mkdirSync(folder, { recursive:true });
const manifest = JSON.parse(fs.readFileSync('.cache/image-manifest.json','utf8'));
function annotate(source) {
    // Parse only ordinary HTML. Jinja control tags are added after this pass.
    const $ = cheerio.load(source, null, false);
    $('main').attr('id','main-content').attr('tabindex','-1');
    $('h1,h2,h3,h4,h5,h6').addClass('site-heading');
    $('a[href]').each((_,el)=>{
        const href=$(el).attr('href');
        if(href && !/^(?:[a-z][a-z0-9+.-]*:|\/|#|\{\{)/i.test(href))$(el).attr('href','/'+href.replace(/^\.\//,''));
    });
    $('img').each((_,el)=>{
        const key = ($(el).attr('src') || '').replace(/^\.\//,'');
        if(manifest[key]) $(el).attr('width',manifest[key].width).attr('height',manifest[key].height);
    });
    return $.html();
}
function homepage(source) {
    const $=cheerio.load(source,null,false);
    const tagRecipe=$('#services-list .home-service-tags > li').first().clone().text('{{ tag }}').toString();
    const fields=require('./homepage-fields');
    const metadata=JSON.parse(fs.readFileSync('pages.json','utf8'))['index.html'];
    const schema=fields.map(field=>{
        if(!field.selector)return {...field,default:field.default??(field.key==='seo.title'?metadata.title:metadata.description)};
        const nodes=field.indices || [field.index || 0];
        let initial;
        for(const index of nodes){
            const element=$(field.selector).eq(index);
            if(!element.length)throw new Error(`Homepage field missing: ${field.key}`);
            const target=field.target==='direct'?element.contents().filter((_,n)=>n.type==='text' && n.data.trim()).eq(field.node || 0):element;
            if(!target.length)throw new Error(`Homepage text missing: ${field.key}`);
            const value=(field.target==='tags'?target.children().map((_,el)=>$(el).text().trim()).get().join(', '):field.type==='inline'?target.html():target.text()).trim().replace(/\s+/g,' ').replaceAll('{{CALL_MINUTES}}','{callMinutes}');
            if(initial!==undefined && initial!==value)throw new Error(`Inconsistent repeated homepage field: ${field.key}`);
            initial=value;
            const expression=`{{ home_copy('${field.key}')${field.type==='inline'?'|home_inline':''} }}`;
            if(field.target==='direct'){
                const original=target.text();
                target.replaceWith((original.match(/^\s*/)?.[0]||'')+expression+(original.match(/\s*$/)?.[0]||''));
            }
            else target.html(expression);
        }
        const {defaultOverride,...rest}=field;
        return {...rest,default:defaultOverride??initial};
    });
    function rowCopy(html,prefix,index,fields){
        for(const field of fields)html=html.replaceAll(`home_copy('${prefix}.${index}.${field}')`,field==='quote'?'row.quote':`section_text(row.${field})`);
        return html;
    }
    const service=$('#services-list > .home-service-row').first().clone();
    const serviceTitle=service.find('.home-service-title');
    serviceTitle.replaceWith($('<h3>').attr('class',serviceTitle.attr('class')).html(serviceTitle.html()));
    service.attr('data-home-item','{{ row.id }}');
    service.find('.home-service-number').text("{{ '%02d'|format(loop.index) }}");
    // Each row keeps a drawing in the same order as the original six services.
    service.find('.home-service-glyph').html("{% include 'drawings/' ~ ['glyph-website','glyph-app','glyph-store','glyph-cms','glyph-chart','glyph-automation'][loop.index0 % 6] ~ '.svg' %}");
    service.find('.home-service-tags').html('{% for tag in row.tags %}'+tagRecipe+'{% endfor %}');
    service.find('.home-service-tags').before('{% if row.tags %}').after('{% endif %}');
    $('#services-list').html('{% for row in home_sections.services %}'+rowCopy(service.toString(),'service',0,['title','description'])+'{% endfor %}');
    const process=$('#process-container > .home-process-step').first().clone().attr('data-home-item','{{ row.id }}');
    process.find('.home-process-number').text("{{ '%02d'|format(loop.index) }}");
    process.find('.home-process-glyph').html("{% include 'drawings/' ~ ['step-talk','step-plan','step-build','step-launch'][loop.index0 % 4] ~ '.svg' %}");
    $('#process-container').html('{% for row in home_sections.process %}'+rowCopy(process.toString(),'process',0,['title','description'])+'{% endfor %}');
    const review=$('#reviews-thread > .home-feedback-item').first().clone().attr('data-home-item','{{ row.id }}');
    review.find('.home-feedback-role').before('{% if row.role %}').after('{% endif %}');
    $('#reviews-thread').html('{% for row in home_sections.reviews %}'+rowCopy(review.toString(),'review',0,['quote','name','role'])+'{% endfor %}');
    for(const [id,kind] of [['services','services'],['principles','process'],['reviews','reviews']])$('#'+id).before(`{% if home_sections.${kind} %}`).after('{% endif %}');
    $('#contact').before('{% include "public/home-tools.html" %}');
    $('#work').before('{% if projects %}').after('{% endif %}');
    $('#latest-posts').before('{% if posts %}').after('{% endif %}');
    const filename=path.join(folder,'homepage-fields.json');
    const data=JSON.stringify(schema,null,2)+'\n';
    if(!fs.existsSync(filename)||fs.readFileSync(filename,'utf8')!==data){fs.writeFileSync(filename+'.tmp',data);fs.renameSync(filename+'.tmp',filename);}
    $('main').prepend('{% include "components/page-preview-notice.html" %}');
    return $.html();
}
// Bind shell text and navigation once, retaining the static HTML as the defaults.
const withIdentity=require('./identity-component');
const shellSource=withIdentity(fs.readFileSync('templates/base.html','utf8')); 
const headerSource=withIdentity(fs.readFileSync('components/header.html','utf8'));
// Metadata placeholders are text to an HTML parser and would prematurely close <head>.
// Keep that authored block intact while binding the body shell.
const headSource=shellSource.match(/<head>[\s\S]*?<\/head>/)[0];
const headDOM=cheerio.load(headSource);
const shellDOM=cheerio.load(shellSource.replace(headSource,'<head></head>'));
const header=cheerio.load(headerSource,null,false);
const brandingFields=require('./branding-fields');

for(const field of brandingFields){
    if(field.key==='ownerName'){field.default=headDOM('meta[name="author"]').attr('content');continue;}
    const selector=`[data-branding="${field.key}"]`;
    const nodes=[...shellDOM(selector).toArray().map(el=>({$:shellDOM,el})),...header(selector).toArray().map(el=>({$:header,el}))];
    if(!nodes.length)throw new Error(`Missing branding field: ${field.key}`);
    const values=nodes.map(({ $,el })=>$(el).text().trim().replace(/\s+/g,' '));
    if(values.some(value=>value!==values[0]))throw new Error(`Inconsistent branding: ${field.key}`);
    field.default=values[0];
    for(const {$,el} of nodes)$(el).text(`{{ branding.${field.key} }}`);
}
const navigation=header('.nav-links-desktop > a').slice(0,-1).map((i,el)=>{
    const href=header(el).attr('href').replace('{{BASE_PATH}}','/');
    const id=href.includes('#')?href.split('#')[1]:href.split('/').pop().replace('.html','');
    return {id,href,label:header(el).text().trim(),section:{services:'services',principles:'process',reviews:'reviews'}[id]||null};
}).get();
const identityDefault=withIdentity('{{IDENTITY}}').replaceAll('{{BASE_PATH}}','/').replace('>LAY SHAH</span>','>{{ branding.displayName }}</span>');
const identityComponent='{% if brand_images.logo %}<span class="site-identity site-identity--uploaded"><img class="site-identity__upload" src="{{ brand_images.logo.url }}" alt="" width="{{ brand_images.logo.width }}" height="{{ brand_images.logo.height }}"><span data-branding="displayName">{{ branding.displayName }}</span></span>{% else %}'+identityDefault+'{% endif %}';
fs.writeFileSync(path.join(folder,'identity.html'),identityComponent);
for(const $ of [header,shellDOM]) $('[data-site-identity]').replaceWith('{% include "identity.html" %}');
const navRecipe=header('.nav-links-desktop > a').first().clone().attr('href','{{ link.href }}').text('{{ link.label }}').toString();
const mobileRecipe=header('#mobile-menu > a').first().clone().attr('href','{{ link.href }}').text('{{ link.label }}').toString();
const footerRecipe=shellDOM('footer ul').first().find('li').eq(1).clone();
footerRecipe.find('a').attr('href','{{ link.href }}').text('{{ link.label }}');
function loop(recipe,expression='navigation'){return `{% for link in ${expression} %}`+recipe+'{% endfor %}';}
header('.nav-links-desktop > a').slice(0,-1).remove();
header('.nav-links-desktop').prepend(loop(navRecipe));
header('#mobile-menu > a').slice(0,-1).remove();
header('#mobile-menu').prepend(loop(mobileRecipe));
shellDOM('footer ul').first().find('li').slice(1).remove();
shellDOM('footer ul').first().append(loop(footerRecipe.toString(),'footer_navigation'));
let shell=shellDOM.html().replace('<head></head>',headSource);
shell = shell.replace(/<title>[\s\S]*?(?=    <!-- Favicon -->)/, '{% include "components/seo.html" %}\n');
shell = shell.replace('{{NAV_CONTENT}}','{% include "header.html" %}').replace('{{BODY_CONTENT}}','{% block content %}{% endblock %}').replace('{{PAGE_SCRIPTS}}','');
shell = shell.replace(/    <!-- Google tag[\s\S]*?<\/script>\s*<\/head>/,'</head>');
shell = shell.replace(/    <!-- Lenis smooth scroll -->[\s\S]*?<\/script>/,'');
shell = shell.replace(/<!-- IDENTITY_ICONS_START -->[\s\S]*?<!-- IDENTITY_ICONS_END -->/, '{% include "components/site-icons.html" %}');
fs.writeFileSync(path.join(folder,'base.html'),shell);
fs.writeFileSync(path.join(folder,'header.html'),header.html());
const brandingSchema=JSON.stringify({fields:brandingFields,navigation},null,2)+'\n';
const brandingPath=path.join(folder,'branding-fields.json');
if(!fs.existsSync(brandingPath)||fs.readFileSync(brandingPath,'utf8')!==brandingSchema){fs.writeFileSync(brandingPath+'.tmp',brandingSchema);fs.renameSync(brandingPath+'.tmp',brandingPath);}
const collectionFields={};
for(const name of ['projects','blog','tools']){
    const $=cheerio.load(fs.readFileSync(`content/${name}.html`,'utf8'),null,false);
    const h1=$('h1').first();
    const metadata=JSON.parse(fs.readFileSync('pages.json','utf8'))[`${name}.html`];
    const value=target=>target.text().trim().replace(/\s+/g,' ');
    collectionFields[name]=[
        ...(name==='tools'?[]:[{key:'heading',label:'Heading',group:'Introduction',limit:180,type:'text',default:value(h1.contents().filter((_,n)=>n.type==='text'&&n.data.trim()).first())},{key:'accent',label:'Accent line',group:'Introduction',limit:180,type:'text',default:value(h1.find('span').first())}]),
        {key:'intro',label:'Introduction',group:'Introduction',type:'text',limit:1000,multiline:true,default:value(h1.parent().find('>p').first())},
        {key:'seo_title',label:'Search title',group:'Search appearance',type:'text',limit:200,default:metadata.title},
        {key:'seo_description',label:'Search description',group:'Search appearance',type:'text',limit:500,multiline:true,default:metadata.description},
    ];
}
const collectionPath=path.join(folder,'collection-fields.json');
const collectionSchema=JSON.stringify(collectionFields,null,2)+'\n';
if(!fs.existsSync(collectionPath)||fs.readFileSync(collectionPath,'utf8')!==collectionSchema){fs.writeFileSync(collectionPath+'.tmp',collectionSchema);fs.renameSync(collectionPath+'.tmp',collectionPath);}
for (const name of ['index','projects','blog']) {
    let source = annotate(withDrawings(fs.readFileSync(`content/${name}.html`,'utf8')));
    if(name==='index')source=homepage(source);
    else {
        const $=cheerio.load(source,null,false);
        const h1=$('h1').first();
        h1.contents().filter((_,n)=>n.type==='text'&&n.data.trim()).first().replaceWith('{{ collection_content.heading }}');
        h1.find('span').first().text('{{ collection_content.accent }}');
        h1.parent().find('>p').first().text('{{ collection_content.intro }}');
        $('main').prepend('{% include "components/page-preview-notice.html" %}');
        source=$.html();
    }
    const slots={HOMEPAGE_PROJECTS:'home-projects',HOMEPAGE_BLOG_POSTS:'home-posts',WORK_STACK:'project-list',BLOG_POST_ROWS:'post-list'};
    for(const [slot,partial] of Object.entries(slots)) source=source.replace(`{{${slot}}}`,`{% include "public/${partial}.html" %}`);
    source=source.replace(/data-netlify="true" data-netlify-honeypot="bot-field"/,'action="/contact"');
    source=source.replace('<input type="hidden" name="form-name" value="contact">','<input type="hidden" name="csrf_token" value="{{ csrf_token() }}">');
    if(name==='index'){
        source=source.replace(/<form id="contact-form"[^>]*>/,'$&{% if is_preview %}<p class="ui-notice">The contact form is inactive in this preview.</p><fieldset disabled>{% endif %}');
        source=source.replace('</form>','{% if is_preview %}</fieldset>{% endif %}</form>');
    }
    fs.writeFileSync(path.join(folder,name==='index'?'home.html':`${name}.html`),`{# Generated from content/${name}.html. Do not edit. #}\n{% extends "base.html" %}\n{% block content %}\n${source}\n{% endblock %}`);
}
console.log('Shared Flask shells prepared from existing source templates.');
