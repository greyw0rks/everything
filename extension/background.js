const DEFAULT='http://127.0.0.1:3074';
const routes={
 '/api/dashboard':['GET'],'/api/dashboard?mode=live':['GET'],'/api/health':['GET'],
 '/api/rwa':['GET'],
 '/api/account':['GET','PATCH'],'/api/auth/login':['POST'],'/api/auth/register':['POST'],'/api/auth/logout':['POST'],
 '/api/notifications':['GET'],'/api/notifications/read':['POST']
};
async function request(path,method='GET',body){
 if(!routes[path]?.includes(method))return {ok:false,error:'Unsupported API path.'};
 const {backend=DEFAULT,sessionToken}=await chrome.storage.local.get(['backend','sessionToken']);
 try{
  const base=new URL(backend);
  if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw Error('Use HTTPS, or localhost for development.');
  if(['/api/auth/login','/api/auth/register'].includes(path))body={...body,client:'extension'};
  const headers={};if(body)headers['Content-Type']='application/json';if(sessionToken)headers.Authorization='Bearer '+sessionToken;
  const response=await fetch(base.origin+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(24000),credentials:'omit'});
  const data=await response.json();
  if(data.token){await chrome.storage.local.set({sessionToken:data.token});delete data.token;}
  if(path==='/api/auth/logout'&&response.ok){await chrome.storage.local.remove(['sessionToken','seenNotifications','notificationUser']);if(chrome.notifications){const active=await chrome.notifications.getAll();for(const id of Object.keys(active))await chrome.notifications.clear(id);}await chrome.action.setBadgeText({text:''});}
  return {ok:response.ok,status:response.status,data};
 }catch{return {ok:false,error:'Could not reach Everything Crypto. Check extension options.'};}
}
let notificationPoll;
async function pollAlerts(){
 if(notificationPoll)return notificationPoll;
 notificationPoll=deliverAlerts().finally(()=>{notificationPoll=null;});return notificationPoll;
}
async function deliverAlerts(){
 const {desktopEnabled,badgeEnabled,seenNotifications,notificationUser,sessionToken}=await chrome.storage.local.get(['desktopEnabled','badgeEnabled','seenNotifications','notificationUser','sessionToken']);
 if(!desktopEnabled&&!badgeEnabled)return;
 const account=await request('/api/account');if(!account.ok||!account.data.user){await chrome.action.setBadgeText({text:''});return;}
 const result=await request('/api/notifications');if(!result.ok)return;
 const user=account.data.user,list=result.data.notifications,unread=list.filter(n=>!n.read);
 if(badgeEnabled){await chrome.action.setBadgeBackgroundColor({color:'#c9f3c6'});await chrome.action.setBadgeText({text:unread.length?String(Math.min(unread.length,99)):''});}
 const permission=await chrome.permissions.contains({permissions:['notifications']});
 const seen=new Set(seenNotifications||[]);
 const current=await chrome.storage.local.get('sessionToken');
 if(current.sessionToken===sessionToken&&notificationUser===user.id&&seenNotifications&&desktopEnabled&&permission&&user.preferences.enabled&&user.preferences.extension){
  const links={};for(const item of unread.filter(n=>!seen.has(n.id)).slice(0,3)){
   await chrome.notifications.create(item.id,{type:'basic',iconUrl:'icon.png',title:item.title.slice(0,150),message:item.body.slice(0,350)});
   links[item.id]=item.url;
  }
  const previous=await chrome.storage.session.get('notificationLinks');await chrome.storage.session.set({notificationLinks:{...previous.notificationLinks,...links}});
 }
 await chrome.storage.local.set({seenNotifications:list.map(n=>n.id),notificationUser:user.id});
}
async function syncAlarm(){
 attachNotificationClicks();
 const {desktopEnabled,badgeEnabled}=await chrome.storage.local.get(['desktopEnabled','badgeEnabled']);
 await chrome.alarms.clear('crypto-alerts');
 if(desktopEnabled||badgeEnabled)chrome.alarms.create('crypto-alerts',{periodInMinutes:5});
 if(!badgeEnabled)await chrome.action.setBadgeText({text:''});
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id)return false;
 if(message?.type==='everything-crypto-api'){request(message.path,message.method||'GET',message.body).then(respond);return true;}
 if(message?.type==='everything-crypto-check-alerts'){pollAlerts().then(()=>respond({ok:true})).catch(()=>respond({ok:false}));return true;}
 return false;
});
chrome.runtime.onInstalled.addListener(async()=>{const {backend}=await chrome.storage.local.get('backend');if(!backend)await chrome.storage.local.set({backend:DEFAULT,badgeEnabled:false,desktopEnabled:false});await syncAlarm();});
chrome.runtime.onStartup.addListener(syncAlarm);
chrome.storage.onChanged.addListener(async(changes,area)=>{
 if(area!=='local')return;
 if(changes.backend){await chrome.storage.local.remove(['sessionToken','seenNotifications','notificationUser']);}
 if(changes.desktopEnabled||changes.badgeEnabled)await syncAlarm();
});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='crypto-alerts')void pollAlerts();});
function attachNotificationClicks(){
 if(!chrome.notifications?.onClicked||globalThis.notificationClicksAttached)return;
 globalThis.notificationClicksAttached=true;
 chrome.notifications.onClicked.addListener(async id=>{
 const {notificationLinks}=await chrome.storage.session.get('notificationLinks'),{backend=DEFAULT}=await chrome.storage.local.get('backend');
 const link=notificationLinks?.[id];await chrome.tabs.create({url:link&&/^https?:\/\//.test(link)?link:backend+'/app?notifications=1'});
 await request('/api/notifications/read','POST',{ids:[id]});await chrome.notifications.clear(id);
 });
}
attachNotificationClicks();
chrome.permissions.onAdded.addListener(attachNotificationClicks);
