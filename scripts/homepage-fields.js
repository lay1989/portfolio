/** Bind homepage copy to the layout, grouped in the order a visitor reads the page.
 *  This registry holds no visual values; `hint` is shown under the field in the editor. */
const fields=[];
function add(key,group,label,selector,options={}) {
    fields.push({key,group,label,selector,type:'text',limit:240,...options});
}
const ordinal=['first','second','third'];
/** A heading is its plain lines followed by a final line in a span. */
function heading(key,group,selector,lines=1) {
    for(let i=0;i<lines;i++)add(`${key}.line${i+1}`,group,`Heading, ${ordinal[i]} line`,selector,{target:'direct',node:i});
    add(`${key}.accent`,group,`Heading, ${ordinal[lines]} line`,`${selector} > span`);
}

// Opening
heading('hero.heading','Opening','#hero h1');
add('hero.summary','Opening','Introduction','#hero .hero-sub',{multiline:true,limit:1600,hint:'Two or three sentences: what you build and who it is for.'});
add('hero.primary','Opening','Main button','#hero .hero-ctas a',{index:0,target:'direct',hint:'Goes to the contact form.'});
add('hero.secondary','Opening','Second link','#hero .hero-secondary',{target:'direct',hint:'Goes to the Work page.'});
add('hero.note','Opening','Location and who you work with','#hero .hero-note',{multiline:true,limit:500});

// About
heading('about.heading','About','#about h2',2);
for(let i=0;i<2;i++)add(`about.paragraph${i+1}`,'About',`Paragraph ${i+1}`,'#about .home-about__copy > p',{index:i,multiline:true,limit:2400});
add('about.questionLabel','About','Caption above the question','#about .home-approach-question-label');
add('about.question','About','Opening question','#about blockquote',{multiline:true,limit:1000});

// Services
heading('services.heading','Services','#services h2');
// The first line counts the services that are published: {serviceCount} becomes "Six", "Seven"…
fields.find(field=>field.key==='services.heading.line1').defaultOverride='{serviceCount} services.';
add('services.intro','Services','Introduction','#services .home-services-intro',{multiline:true,limit:1600});
add('services.note','Services','Closing prompt','#services .home-services-note',{multiline:true,limit:1000});
add('services.cta','Services','Button','#services .home-services-cta',{target:'direct',hint:'Goes to the contact form.'});
for(let i=0;i<6;i++) {
    add(`service.${i}.title`,'Services',`Service ${i+1}: title`,'#services .home-service-title',{index:i});
    add(`service.${i}.tags`,'Services',`Service ${i+1}: technology tags`,'#services .home-service-tags',{index:i,target:'tags',limit:500});
    add(`service.${i}.description`,'Services',`Service ${i+1}: description`,'#services .home-service-description',{index:i,multiline:true,limit:1600});
}

// How I work
heading('process.heading','How I work','#principles h2');
add('process.intro','How I work','Introduction','#principles .home-process-intro',{multiline:true,limit:1600});
for(let i=0;i<4;i++) {
    add(`process.${i}.title`,'How I work',`Step ${i+1}: title`,'#principles h3',{index:i});
    add(`process.${i}.description`,'How I work',`Step ${i+1}: description`,'#principles .home-process-description',{index:i,multiline:true,limit:1600});
}

// Selected work
heading('work.heading','Selected work','#work h2');
add('work.intro','Selected work','Introduction','#work .home-work-intro',{multiline:true,limit:1000});
add('work.allProjects','Selected work','Link to all projects','#work .home-work-all',{target:'direct'});

// Reviews
heading('reviews.heading','Reviews','#reviews h2');
add('reviews.intro','Reviews','Introduction','#reviews .home-feedback-intro',{multiline:true,limit:1000});
for(let i=0;i<6;i++) {
    add(`review.${i}.quote`,'Reviews',`Review ${i+1}: quotation`,'#reviews-thread blockquote p',{index:i,type:'inline',multiline:true,limit:2400});
    add(`review.${i}.name`,'Reviews',`Review ${i+1}: name`,'#reviews-thread .home-feedback-name',{index:i});
    add(`review.${i}.role`,'Reviews',`Review ${i+1}: role`,'#reviews-thread .home-feedback-role',{index:i});
}

// Writing
heading('posts.heading','Writing','#latest-posts h2');
add('posts.intro','Writing','Introduction','#latest-posts .home-writing-intro',{multiline:true,limit:1000});
add('posts.allArticles','Writing','Link to all articles','#latest-posts .home-writing-all',{target:'direct'});

// Tools (shown only when Tools are selected for the homepage)
add('tools.intro','Tools','Introduction',null,{limit:1000,multiline:true,default:'Software I’ve evaluated, with notes on what each one is good for.'});
add('tools.allTools','Tools','Link to all Tools',null,{default:'All tools'});
add('tools.open','Tools','Button that opens a Tool',null,{default:'Open tool'});
add('tools.about','Tools','Link to a Tool’s notes',null,{default:'About this tool'});

// Contact
heading('contact.heading','Contact','#contact h2');
add('contact.intro','Contact','Introduction','#contact .home-contact-intro',{multiline:true,limit:1600});
add('contact.location','Contact','Location','#contact .home-contact-location');

add('seo.title','Search appearance','Page title',null,{limit:180});
add('seo.description','Search appearance','Page description',null,{limit:500,multiline:true});
module.exports=fields;
