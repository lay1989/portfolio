const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const python = path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
if(!fs.existsSync(python)) { console.error('Run npm run setup first.');process.exit(1); }
const npm = process.platform==='win32'?'npm.cmd':'npm';
for(const [command,args] of [[npm,['run','build']],[python,['-m','flask','--app','app','db','upgrade']],[python,['-m','flask','--app','app','import-content']],[python,['-m','flask','--app','app','import-media']]]) {
    const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
    if(result.status!==0)process.exit(result.status||1);
}
const server=spawn(python,['-m','flask','--app','app','run','--host','127.0.0.1','--port','5001','--reload','--no-debugger','--extra-files',['design/system.json','data/site.json','pages.json','.cache/image-manifest.json','.cache/flask-templates/homepage-fields.json','.cache/flask-templates/branding-fields.json','.cache/flask-templates/collection-fields.json'].join(path.delimiter)],{cwd:root,stdio:'inherit'});
let building=false,pending=false,timer;
function build(){
    if(building){pending=true;return;}
    building=true;
    const child=spawn(npm,['run','build'],{cwd:root,stdio:'inherit'});
    child.on('exit',code=>{
        if(code===0){
            const media=spawn(python,['-m','flask','--app','app','import-media'],{cwd:root,stdio:'inherit'});
            media.on('exit',()=>{building=false;if(pending){pending=false;build();}});
        } else {building=false;if(pending){pending=false;build();}}
    });
}
const rebuild=()=>{clearTimeout(timer);timer=setTimeout(build,250);};
// Poll the small authoring surface. Recursive OS watchers can exhaust macOS
// file handles when several development projects are open at once.
const folders=['content','templates','components','data','design','styles','src','scripts','app/templates'];
function signature(){
    const records=[];
    function visit(folder){
        for(const item of fs.readdirSync(folder,{withFileTypes:true})){
            const file=path.join(folder,item.name);
            if(item.isDirectory()){if(!item.name.startsWith('.') && item.name!=='__pycache__')visit(file);}
            else if(!item.name.includes('.generated.') && /\.(html|css|json|js|mjs)$/.test(item.name)){
                const stat=fs.statSync(file);records.push(`${file}:${stat.mtimeMs}:${stat.size}`);
            }
        }
    }
    for(const folder of folders)visit(path.join(root,folder));
    for(const file of ['style.css','tailwind.config.js','script.js','pages.json']){
        const stat=fs.statSync(file);records.push(`${file}:${stat.mtimeMs}:${stat.size}`);
    }
    return records.sort().join('\n');
}
let previous=signature();
const polling=setInterval(()=>{const next=signature();if(next!==previous){previous=next;rebuild();}},1000);
function stop(){clearInterval(polling);server.kill('SIGTERM');process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
server.on('error',error=>{console.error(error.message);clearInterval(polling);process.exit(1);});
server.on('exit',code=>{clearInterval(polling);process.exit(code||0);});
