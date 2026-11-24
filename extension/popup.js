document.querySelector('#extension-options').addEventListener('click',()=>chrome.runtime.openOptionsPage());
document.querySelector('#extension-board').addEventListener('click',async()=>{const {backend='http://127.0.0.1:3074'}=await chrome.storage.local.get('backend');chrome.tabs.create({url:backend+'/app'});});
