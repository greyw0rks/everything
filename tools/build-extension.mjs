import {readFile,writeFile,cp,mkdir} from 'node:fs/promises';
const out=process.env.EC_EXTENSION_OUTPUT||'extension',origin=process.env.EC_PUBLIC_URL||'http://127.0.0.1:3074';
await mkdir(out+'/fonts',{recursive:true});
if(out!=='extension')for(const file of ['background.js','manifest.json','options.html','options.js','options.css','popup.css','popup.js','icon.png'])await cp('extension/'+file,out+'/'+file);
for(const file of ['styles.css','interaction.css','accounts.css','accounts.js','markets.css','navigation.js','favicon.svg'])await cp('public/'+file,out+'/'+file);
await cp('public/fonts',out+'/fonts',{recursive:true});
const shim="const extensionFetch=globalThis.fetch;globalThis.fetch=async function(input,options={}){if(typeof input==='string'&&input.startsWith('/api/')){const result=await chrome.runtime.sendMessage({type:'everything-crypto-api',path:input,method:options.method||'GET',body:options.body?JSON.parse(options.body):undefined});return {ok:result.ok,status:result.status||503,json:async()=>result.data||{error:result.error||'Connection unavailable.'}};}return extensionFetch(input,options);};\n";
await writeFile(out+'/app.js',shim+await readFile('public/app.js','utf8'));
await writeFile(out+'/rwa.js',shim+await readFile('public/rwa.js','utf8'));
let html=await readFile('public/dashboard.html','utf8');
html=html.replaceAll('href="/crypto"','href="popup.html"').replaceAll('href="/rwa"','href="rwa.html"').replace('href="/"','href="'+origin+'/" target="_blank" rel="noopener"');
html=html.replaceAll('href="/','href="').replace('src="/app.js"','src="app.js"');
html=html.replace('</head>','<link rel="stylesheet" href="popup.css"><script src="popup.js" defer></script></head>');
html=html.replace('</body>','<div class="extension-links"><button id="extension-options">Extension preferences</button><button id="extension-board">Open dashboard</button></div></body>');
await writeFile(out+'/popup.html',html);
let rwa=await readFile('public/rwa.html','utf8');rwa=rwa.replaceAll('href="/styles.css"','href="styles.css"').replaceAll('href="/interaction.css"','href="interaction.css"').replaceAll('href="/accounts.css"','href="accounts.css"').replaceAll('href="/markets.css"','href="markets.css"').replaceAll('href="/favicon.svg"','href="favicon.svg"').replace('src="/rwa.js"','src="rwa.js"');
rwa=rwa.replace('</head>','<link rel="stylesheet" href="popup.css"><script src="popup.js" defer></script></head>').replace('</body>','<div class="extension-links"><button id="extension-options">Extension preferences</button><button id="extension-board">Open dashboard</button></div></body>');
rwa=rwa.replace('href="/"','href="'+origin+'/" target="_blank" rel="noopener"');await writeFile(out+'/rwa.html',rwa);
if(origin!=='http://127.0.0.1:3074'){
 const background=await readFile(out+'/background.js','utf8');await writeFile(out+'/background.js',background.replace("const DEFAULT='http://127.0.0.1:3074'",'const DEFAULT='+JSON.stringify(origin)));
 const manifest=JSON.parse(await readFile(out+'/manifest.json','utf8'));manifest.host_permissions=[origin+'/*'];await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2));
}
console.log('Built extension at '+out+' for '+origin);
