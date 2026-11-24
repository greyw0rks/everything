const form=document.querySelector('#settings'),status=document.querySelector('#status');
chrome.storage.local.get(['badgeEnabled','desktopEnabled']).then(s=>{document.querySelector('#badge').checked=!!s.badgeEnabled;document.querySelector('#desktop').checked=!!s.desktopEnabled;});
form.addEventListener('submit',async event=>{
 event.preventDefault();
 try{
  const desktop=document.querySelector('#desktop').checked;
  if(desktop){
   if(!await chrome.permissions.request({permissions:['notifications']}))throw Error('Notification permission was not granted.');
   const result=await chrome.runtime.sendMessage({type:'everything-crypto-api',path:'/api/account',method:'PATCH',body:{preferences:{extension:true,enabled:true}}});
   if(!result.ok)throw Error('Sign in through the extension popup before enabling alerts.');
  }
  await chrome.storage.local.set({badgeEnabled:document.querySelector('#badge').checked,desktopEnabled:desktop});
  await chrome.runtime.sendMessage({type:'everything-crypto-check-alerts'});status.textContent='Preferences saved.';
 }catch(e){status.textContent=e.message;}
});
document.querySelector('#open-board').addEventListener('click',async()=>{const {backend='http://127.0.0.1:3074'}=await chrome.storage.local.get('backend');chrome.tabs.create({url:backend+'/app'});});
document.querySelector('#check-alerts').addEventListener('click',async()=>{const result=await chrome.runtime.sendMessage({type:'everything-crypto-check-alerts'});status.textContent=result.ok?'Alerts checked.':'Could not check alerts. Check your connection and sign in again if needed.';});
