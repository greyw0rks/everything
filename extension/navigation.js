export function marketUrl(path){
 if(!globalThis.chrome?.runtime?.id)return path;
 const url=new URL(path,'https://everything.invalid');const file=url.pathname==='/rwa'?'rwa.html':['/crypto','/app'].includes(url.pathname)?'popup.html':null;
 return file?chrome.runtime.getURL(file)+url.search+url.hash:path;
}
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||!globalThis.chrome?.runtime?.id)return;const href=a.getAttribute('href');if(href&&/^\/(rwa|crypto|app)(\?|#|$)/.test(href)){e.preventDefault();location.href=marketUrl(href);}});
