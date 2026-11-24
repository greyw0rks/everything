const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const accountState={user:null,notifications:[],ready:false,extensionAlerts:false};
export async function api(path,{method='GET',body}={}){
 const response=await fetch(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(24000)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not complete this request.');return result;
}
const changed=view=>document.dispatchEvent(new CustomEvent('account:change',{detail:{view}}));
export async function loadAccount(){try{accountState.user=(await api('/api/account')).user;if(globalThis.chrome?.runtime?.id){const s=await chrome.storage.local.get('desktopEnabled');accountState.extensionAlerts=!!s.desktopEnabled&&!!accountState.user?.preferences.extension&&await chrome.permissions.contains({permissions:['notifications']});}}catch{accountState.user=null;}finally{accountState.ready=true;}changed();}
export async function saveCoin(id){
 if(!accountState.user){changed('register');return;}
 const watched=accountState.user.watchlist,next=watched.includes(id)?watched.filter(n=>n!==id):[...watched,id];
 accountState.user=(await api('/api/account',{method:'PATCH',body:{watchlist:next}})).user;changed();
}
export function personalSignal(signal,tokens=[]){
 const user=accountState.user;if(!user)return false;
 if(signal.token)return user.watchlist.includes(signal.token.id);
 if(['market','liquidations'].includes(signal.kind))return user.preferences.global;
 if(signal.kind==='news')return user.preferences.news&&(user.watchlist.length?tokens.filter(t=>user.watchlist.includes(t.id)).some(t=>[t.name,t.symbol].some(term=>new RegExp('\\b'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(signal.title+' '+signal.text))):user.preferences.global);
 return false;
}
const action=(label,view)=>'<button class="detail-button" data-open="'+view+'">'+esc(label)+'</button>';
const check=(key,label,checked)=>'<label class="account-check"><input type="checkbox" name="'+key+'" '+(checked?'checked':'')+'>'+esc(label)+'</label>';
export function accountView(view,data){
 const u=accountState.user;
 if(view==='paid')return {title:'X tracking',content:'<div class="coming-soon"><span class="plan-state">Coming soon</span><h3>Crypto reports from X</h3><p>Follow major crypto reports alongside your tracked coins. X tracking will be a paid feature.</p><p>Pricing and subscriptions are not available yet.</p></div>'};
 if(['account','register','login'].includes(view)&&!u){
  const signup=view==='register';return {title:signup?'Create your account':'Welcome back',content:'<p>Track crypto coins and real-world assets. Keep your watchlists and preferences across the website, app and extension.</p><form class="account-form" id="auth-form" data-auth="'+(signup?'register':'login')+'">'+(signup?'<label>Name<input name="name" autocomplete="name" required minlength="2" maxlength="60"></label>':'')+'<label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Password<input name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" required minlength="10" maxlength="128"></label>'+(signup?'<p class="filter-note">Use at least 10 characters for your password.</p>':'')+'<p id="account-error" role="alert"></p><button class="detail-button primary" type="submit">'+(signup?'Create account':'Sign in')+'</button></form><div class="detail-actions">'+action(signup?'Already have an account? Sign in':'Create an account',signup?'login':'register')+'</div>'};
 }
 if(!u)return {title:'Your account',content:'<p>Create an account to track coins and manage notifications.</p>'+action('Create account','register')+action('Sign in','login')};
 if(view==='notifications')return {title:'Notifications',content:'<div class="detail-actions">'+action('Notification preferences','preferences')+'<button class="detail-button" data-account-action="read-all">Mark all read</button></div>'+(accountState.notifications.length?accountState.notifications.map(n=>'<article class="notification-row '+(n.read?'is-read':'')+'"><div><strong>'+esc(n.title)+'</strong><time>'+esc(new Date(n.createdAt).toLocaleString('en-GB',{timeZone:'UTC'}))+' UTC</time></div><p>'+esc(n.body)+'</p>'+(n.url?'<a href="'+esc(n.url)+'" target="_blank" rel="noopener noreferrer">Read original article</a>':'')+'</article>').join(''):'<p>No notifications yet. Track coins and choose your alert thresholds.</p>')};
 if(view==='preferences'){
  const p=u.preferences;return {title:'Notification preferences',content:'<p>News alerts follow tracked crypto coins and RWA assets. Global crypto market alerts are optional. Updates are checked every five minutes, with a six-hour cooldown for repeated market alerts.</p><form class="account-form" id="preferences-form">'+check('enabled','Enable account notifications',p.enabled)+check('global','Include global market cap and liquidations',p.global)+check('news','Include news about tracked coins and RWA assets',p.news)+check('browser','Desktop browser notifications while the website is open',p.browser)+check('extension','Extension notifications when the browser is running',p.extension)+'<label>Coin price change threshold (%)<input name="priceChange" type="number" min="1" max="100" step="1" value="'+p.priceChange+'" required></label><label>Market cap change threshold (billions USD)<input name="marketChange" type="number" min="0.1" max="10000" step="0.1" value="'+p.marketChange/1e9+'" required></label><label>Liquidation threshold (millions USD)<input name="liquidationTotal" type="number" min="1" max="1000000" value="'+p.liquidationTotal/1e6+'" required></label><p class="filter-note">Enable notifications in extension options too. News stories are delivered once. X tracking is coming soon.</p><p id="account-error" role="alert"></p><button class="detail-button primary" type="submit">Save preferences</button></form>'};
 }
 return {title:'Your account',content:'<div class="account-summary"><strong>'+esc(u.name)+'</strong><span>'+esc(u.email)+'</span><span class="plan-state">Free account · '+u.watchlist.length+' coins tracked</span></div>'+(globalThis.chrome?.runtime?.id?'<div class="detail-actions"><button class="detail-button primary" data-account-action="enable-extension-alerts">'+(accountState.extensionAlerts?'Extension notifications on':'Enable extension notifications')+'</button></div><p class="filter-note">New account alerts arrive while your browser is running. You can close this popup.</p>':'')+'<div class="detail-actions">'+action('Tracked coins','watchlist')+action('Tracked RWA assets','rwa-watchlist')+action('My signal feed','personal')+action('Notifications','notifications')+action('Notification preferences','preferences')+action('X tracking · Coming soon','paid')+'</div><form class="account-form" id="profile-form"><label>Name<input name="name" value="'+esc(u.name)+'" minlength="2" maxlength="60" required></label><label>Account focus<select name="focus">'+[['reader','Crypto reader'],['trader','Trader'],['researcher','Researcher'],['builder','Project builder']].map(([value,label])=>'<option value="'+value+'" '+(u.focus===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><p id="account-error" role="alert"></p><button class="detail-button" type="submit">Save profile</button></form><button class="detail-button" data-account-action="logout">Sign out</button>'};
}
let polling=false;
export async function pollNotifications(){
 const u=accountState.user;if(!u||polling)return;polling=true;
 try{
  const list=(await api('/api/notifications')).notifications;accountState.notifications=list;
  const key='ec-notifications:'+u.id,stored=localStorage.getItem(key),seen=new Set(JSON.parse(stored||'[]'));
  // First connection establishes a baseline, without replaying old desktop alerts.
  if(stored&&u.preferences.enabled&&u.preferences.browser&&'Notification' in globalThis&&Notification.permission==='granted'&&!globalThis.chrome?.runtime?.id){for(const n of list.filter(n=>!seen.has(n.id)&&!n.read).slice(0,3))new Notification(n.title,{body:n.body,tag:n.id});}
  localStorage.setItem(key,JSON.stringify(list.map(n=>n.id)));changed();
 }catch{}finally{polling=false;}
}
document.addEventListener('submit',async e=>{
 const form=e.target;if(!['auth-form','profile-form','preferences-form'].includes(form.id))return;e.preventDefault();
 const submit=form.querySelector('[type="submit"]');submit.disabled=true;const values=new FormData(form);
 try{
  if(form.id==='auth-form')accountState.user=(await api('/api/auth/'+form.dataset.auth,{method:'POST',body:Object.fromEntries(values)})).user;
  else if(form.id==='profile-form')accountState.user=(await api('/api/account',{method:'PATCH',body:Object.fromEntries(values)})).user;
  else{
   const preferences={};for(const key of ['enabled','browser','extension','global','news'])preferences[key]=values.has(key);
   if(preferences.browser){if(!('Notification' in globalThis)||globalThis.chrome?.runtime?.id)throw new Error('Use extension options for system notifications in the extension.');if(await Notification.requestPermission()!=='granted')throw new Error('Browser permission was not granted. Disable desktop notifications or allow them in browser settings.');}
   preferences.priceChange=Number(values.get('priceChange'));preferences.marketChange=Number(values.get('marketChange'))*1e9;preferences.liquidationTotal=Number(values.get('liquidationTotal'))*1e6;
   accountState.user=(await api('/api/account',{method:'PATCH',body:{preferences}})).user;
  }
  changed('account');void pollNotifications();
 }catch(error){form.querySelector('#account-error').textContent=error.message;submit.disabled=false;}
});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-account-action]');if(!button)return;
 try{
  if(button.dataset.accountAction==='enable-extension-alerts'){
   if(!await chrome.permissions.request({permissions:['notifications']}))throw new Error('Notification permission was not granted.');
   accountState.user=(await api('/api/account',{method:'PATCH',body:{preferences:{extension:true,enabled:true}}})).user;
   await chrome.storage.local.set({desktopEnabled:true,badgeEnabled:true});await chrome.runtime.sendMessage({type:'everything-crypto-check-alerts'});accountState.extensionAlerts=true;changed('account');
  }
  if(button.dataset.accountAction==='logout'){await api('/api/auth/logout',{method:'POST',body:{}});accountState.user=null;accountState.notifications=[];changed('login');}
  if(button.dataset.accountAction==='read-all'){await api('/api/notifications/read',{method:'POST',body:{ids:accountState.notifications.filter(n=>!n.read).map(n=>n.id)}});await pollNotifications();changed('notifications');}
 }catch(error){button.textContent=error.message;}
});
setInterval(()=>{if(!document.hidden)void pollNotifications();},60000);
