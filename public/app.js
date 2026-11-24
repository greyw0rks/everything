import {api,accountState,accountView,loadAccount,saveCoin,personalSignal,pollNotifications} from './accounts.js';
import {marketUrl} from './navigation.js';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>'<svg class="icon" aria-hidden="true"><use href="#i-'+name+'"/></svg>';
const money=(n,compact=true)=>{if(typeof n!=='number'||!Number.isFinite(n))return 'Unavailable';const small=Math.abs(n)>0&&Math.abs(n)<1;return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:Math.abs(n)>0&&Math.abs(n)<1e-10?'scientific':compact?'compact':'standard',maximumFractionDigits:small?Math.min(12,Math.max(4,Math.ceil(-Math.log10(Math.abs(n)))+2)):2}).format(n);};
const percent=n=>typeof n==='number'&&Number.isFinite(n)?(n>=0?'+':'')+n.toFixed(2)+'%':'—';
const stamp=value=>value&&Number.isFinite(new Date(value).getTime())?new Date(value).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC':'Date unavailable';
const shortDate=value=>value&&Number.isFinite(new Date(value).getTime())?new Date(value).toLocaleDateString('en-GB',{timeZone:'UTC',day:'2-digit',month:'2-digit'}):'—';
const safeLink=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const labels={all:'All signals',market:'Market value',liquidations:'Liquidations',gainers:'Token gains',losers:'Token falls',listings:'Recent listings',news:'News',personal:'My feed'};
let data=null,windowChoice='24h',moverFilter='all',wireFilter='all',newsPublisher='all',query='',opened=null,loading=false,saved=[];
const setText=(selector,value)=>$(selector).textContent=value;
const match=item=>!query||JSON.stringify(item).toLowerCase().includes(query);
const recentListings=()=>[...(data?.newListings??[])].filter(match).sort((a,b)=>(Date.parse(b.dateAdded)||0)-(Date.parse(a.dateAdded)||0));
const movers=()=>(data?.tokens??[]).filter(t=>typeof t.change==='number'&&match(t)&&(moverFilter==='all'||(moverFilter==='gainers'?t.change>0:t.change<0))).sort((a,b)=>moverFilter==='gainers'?b.change-a.change:moverFilter==='losers'?a.change-b.change:Math.abs(b.change)-Math.abs(a.change));
const personal=s=>personalSignal(s,[...(data?.tokens||[]),...(data?.newListings||[])]);
const signals=()=>(data?.signals??[]).filter(s=>match(s)&&(wireFilter==='all'||(wireFilter==='personal'?personal(s):s.kind===wireFilter)));
const articles=()=>(data?.news??[]).filter(n=>match(n)&&(newsPublisher==='all'||n.publisher===newsPublisher)).sort((a,b)=>(Date.parse(b.timestamp)||0)-(Date.parse(a.timestamp)||0));
const button=(label,view)=>'<button class="detail-button" data-open="'+view+'">'+esc(label)+'</button>';
const values=items=>'<div class="summary-values">'+items.map(([n,l])=>'<div><b>'+esc(n)+'</b><span>'+esc(l)+'</span></div>').join('')+'</div>';

function newsCard(n){
 const url=safeLink(n.url);if(!url)return '';
 return '<article class="news-card"><div class="news-meta"><span>'+esc(n.publisher||'News publisher')+'</span><time datetime="'+esc(n.timestamp)+'">'+esc(stamp(n.timestamp))+'</time></div><a class="news-title" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(n.title)+'</a><p>'+esc(n.text)+'</p><a class="news-read" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Read original story '+icon('up')+'</a></article>';
}
function render(){
 if(!data)return;
 const live=!!data.market||data.tokens.length>0||(data.news??[]).length>0;
 $('.mode-avatar').style.background=accountState.user?'#9be29d':'#e2a67e';
 setText('#market-value',money(data.market?.current));
 setText('#market-summary',data.market?'Global market valuation. A change in value is not cash entering or leaving crypto.':'Market data is temporarily unavailable.');
 setText('#market-pill',data.market?.change!=null?(data.market.change>=0?'+':'−')+money(Math.abs(data.market.change))+' · 24h':'Unavailable');
 $('#market-pill').classList.toggle('d',typeof data.market?.change==='number'&&data.market.change>=0);
 $('#market-pill').classList.toggle('loss',typeof data.market?.change==='number'&&data.market.change<0);
 const liq=data.liquidations?.windows[windowChoice];
 setText('#liq-total',liq?money(liq.total):'Unavailable');
 setText('#liq-summary',liq?money(liq.longs)+' longs. '+money(liq.shorts)+' shorts.':'Liquidation data is temporarily unavailable.');
 document.querySelectorAll('[data-window]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.window===windowChoice));
 setText('#btc-stat',data.market?.btcDominance!=null?data.market.btcDominance.toFixed(1)+'%':'—');
 setText('#eth-stat',data.market?.ethDominance!=null?data.market.ethDominance.toFixed(1)+'%':'—');
 setText('#assets-stat',data.tokens.length||'—');
 setText('#pulse-value',data.sentiment?data.sentiment.value+'/100':'Unavailable');
 setText('#pulse-summary',data.sentiment?data.sentiment.label+' · 24h trading volume '+money(data.market?.volume)+'.':'Sentiment data is temporarily unavailable.');
 setText('#pulse-pill',data.sentiment?data.sentiment.label:'Unavailable');
 const rows=movers();
 $('#movers-preview').innerHTML=rows.length?rows.slice(0,5).map(t=>'<button class="preview-row" data-token="'+t.id+'" aria-label="View '+esc(t.name)+'"><span class="token-mark" aria-hidden="true">'+esc(t.symbol.slice(0,2))+'</span><span class="token-copy"><strong>'+esc(t.name)+'</strong><small>'+esc(t.symbol)+'</small></span><span class="token-number '+(t.change>=0?'positive':'negative')+'">'+percent(t.change)+'<small>'+money(t.price)+'</small></span></button>').join(''):'<p>'+(query?'No matching tokens.':'No available movers.')+'</p>';
 setText('#movers-pill',moverFilter==='all'?'24h · Major tokens':moverFilter==='gainers'?'24h · Gainers':'24h · Losers');
 const fresh=recentListings();
 $('#listings-preview').innerHTML=fresh.length?fresh.slice(0,3).map(t=>'<button class="preview-row" data-token="'+t.id+'" aria-label="View '+esc(t.name)+'"><span class="token-mark" aria-hidden="true">'+esc(t.symbol.slice(0,2))+'</span><span class="token-copy"><strong>'+esc(t.name)+'</strong><small>'+esc(t.symbol)+'</small></span><span class="token-number">'+money(t.price)+'<small>'+shortDate(t.dateAdded)+'</small></span></button>').join(''):'<p>'+(query?'No matching listings.':'No recent listings available.')+'</p>';
 setText('#signal-count',accountState.user?accountState.notifications.filter(n=>!n.read).length:0);
 const wire=signals();
 $('#wire-events').innerHTML=wire.length?wire.slice(0,4).map((s,i)=>{
  const ico=s.kind==='liquidations'?'flame':s.kind==='losers'?'down':s.kind==='listings'?'plus':s.kind==='news'?'wire':'up';
  const title=s.kind==='market'?money(s.amount)+(s.change>=0?' added to market value':' wiped from market value'):s.kind==='liquidations'?money(s.amount)+' in 24h liquidations':s.title;
  const copy=s.kind==='market'?'Global crypto valuation changed '+percent(s.change)+' over the 24h comparison.':s.text;
  return '<button class="'+(i%4===3?'fl':'ev '+['wire-first','wire-second','wire-third'][i%4])+'" data-signal="'+esc(s.id)+'" aria-label="'+esc(title)+'"><span class="h"><b>'+icon(ico)+esc(labels[s.kind])+'</b><span>'+shortDate(s.timestamp)+'</span></span><span class="t"><strong class="event-title">'+esc(title)+'</strong><span class="event-copy">'+esc(copy)+'</span></span><span class="wire-time">'+icon('clock')+esc(stamp(s.timestamp))+'</span></button>';
 }).join(''):'<div class="ev empty-wire"><div class="h"><b>No signals</b></div><div class="t">No matching signals. Try another filter or clear Search.</div></div>';
 $('#floating-event').innerHTML='';
 $('.wire-more').innerHTML='View all '+wire.length+' signals <span aria-hidden="true">↗</span>';
 $('#board-status').dataset.mode='live';
 setText('#board-status',live?'Live updates · Updated '+stamp(data.fetchedAt)+'.':'Updates are temporarily unavailable. Use Refresh to try again.');
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filter===wireFilter));
 document.querySelectorAll('[data-movers]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.movers===moverFilter));
 const publishers=[...new Set((data.news??[]).map(n=>n.publisher).filter(Boolean))];
 $('#news-publishers').innerHTML=['all',...publishers].map(p=>'<button data-news-publisher="'+esc(p)+'" aria-pressed="'+(p===newsPublisher)+'">'+esc(p==='all'?'All publishers':p)+'</button>').join('');
 const news=articles();
 $('#news-grid').innerHTML=news.length?news.slice(0,12).map(newsCard).join(''):'<p class="news-empty">'+(query?'No news matches your search.':'News is temporarily unavailable. Please check again shortly.')+'</p>';
 setText('#news-preview-label',(data.news??[]).length?(data.news.length+' headlines from independent publishers.'):'Reporting from independent publishers.');
}
async function load(){
 if(loading)return;loading=true;setText('#board-status','Updating markets and news…');
 document.querySelectorAll('[data-action="refresh"]').forEach(b=>b.disabled=true);
 try{data=await api('/api/dashboard');render();if(opened)show(opened);}
 catch{setText('#board-status','Could not update right now. Use Refresh to try again.');}
 finally{loading=false;document.querySelectorAll('[data-action="refresh"]').forEach(b=>b.disabled=false);}
}
function tokenTable(tokens,newList=false){
 if(!tokens.length)return '<p class="empty-state">No matching tokens available.</p>';
 return '<div class="table-scroll"><table class="detail-table"><thead><tr><th>Token</th><th>Price</th><th>'+(newList?'Listing date':'24h change')+'</th><th>Track</th></tr></thead><tbody>'+tokens.map(t=>'<tr><td><button data-token="'+t.id+'">'+esc(t.name)+'<small>'+esc(t.symbol)+'</small></button></td><td>'+money(t.price,false)+'</td><td class="'+(!newList?(t.change>=0?'positive':'negative'):'')+'">'+(newList?esc(stamp(t.dateAdded)):percent(t.change))+'</td><td><button class="save-button '+(saved.includes(t.id)?'saved':'')+'" data-save="'+t.id+'" aria-label="'+(saved.includes(t.id)?'Untrack ':'Track ')+esc(t.symbol)+'" aria-pressed="'+saved.includes(t.id)+'">'+icon('star')+'</button></td></tr>').join('')+'</tbody></table></div>';
}
function signalView(s){
 const url=safeLink(s.url);
 return '<article class="signal-detail"><h3>'+esc(s.title)+'</h3><p>'+esc(s.text)+'</p><time>'+esc(stamp(s.timestamp))+'</time>'+(s.caveat?'<p class="filter-note">'+esc(s.caveat)+'</p>':'')+(url?'<p><a class="detail-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Read at '+esc(s.publisher||'the original publisher')+'</a></p>':'')+'</article>';
}
function show(view){
 if(view==='rwa-watchlist'){location.href=marketUrl('/rwa?watchlist=1');return;}
 if(!data&&!['account','register','login','preferences','notifications','paid'].includes(view))return;opened=view;let title='',content='';
 if(['account','register','login','preferences','notifications','paid'].includes(view)){({title,content}=accountView(view,data));}
 else if(view==='market'){
  title='Market capitalization';const m=data.market;
  if(m){content+=values([[money(m.current),'Current global valuation'],[money(m.change),'24h valuation change']])+'<p>'+esc(m.explanation)+'</p>';
   if(m.previous!=null)content+='<div class="calculation">'+money(m.current,false)+' current<br>− '+money(m.previous,false)+' previous valuation<strong>= '+money(m.change,false)+' ('+percent(m.percent)+')</strong></div><p class="filter-note">'+(m.previousInferred?'The previous value is inferred from the reported percentage change.':'The comparison uses the current and previous market valuations.')+' Updated '+esc(stamp(m.timestamp))+'.</p>';
  }else content+='<p>Market data is temporarily unavailable.</p>';
 }else if(view==='liquidations'){
  title='Liquidations';content+='<div class="detail-actions">'+['1h','4h','24h'].map(w=>'<button data-detail-window="'+w+'" class="'+(w===windowChoice?'active':'')+'">'+w+'</button>').join('')+'</div>';
  const l=data.liquidations?.windows[windowChoice];if(l)content+=values([[money(l.total),windowChoice+' total notional'],[money(l.longs),'Longs closed'],[money(l.shorts),'Shorts closed']])+'<div class="bar-chart" aria-label="Long and short liquidation proportions"><div class="longs" style="width:'+(l.total?l.longs/l.total*100:0)+'%"></div><div class="shorts" style="flex:1"></div></div><p>'+esc(data.liquidations.explanation)+'</p>';else content+='<p>Liquidation data is temporarily unavailable.</p>';
 }else if(view==='movers'){
  title='Biggest movers';content+='<p class="filter-note">'+esc(data.coverage)+'</p><div class="detail-actions">'+['all','gainers','losers'].map(f=>'<button data-detail-movers="'+f+'" class="'+(moverFilter===f?'active':'')+'">'+esc(f)+'</button>').join('')+'</div>'+tokenTable(movers());
 }else if(view==='listings'){
  title='Recent listings';content+='<p>A market listing date does not establish a project launch date or endorsement.</p>'+tokenTable(recentListings(),true);
 }else if(view==='pulse'){
  title='Market pulse';if(data.sentiment)content+=values([[data.sentiment.value+'/100',data.sentiment.label],[money(data.market?.volume),'24h trading volume']])+'<p>The sentiment index summarizes the market’s mood. Trading volume measures activity, not net capital inflow.</p>';else content+='<p>Sentiment data is temporarily unavailable.</p>';
 }else if(view==='signals'){
  title='Signal Wire';content+='<div class="detail-actions">'+Object.entries(labels).map(([f,l])=>'<button data-detail-filter="'+f+'" class="'+(wireFilter===f?'active':'')+'">'+esc(l)+'</button>').join('')+'</div>'+(signals().length?signals().map(signalView).join(''):'<p>No signals match this view.</p>');
 }else if(view==='news'){
  title='Crypto news';content+='<p>Headlines and short summaries from independent publishers. Open a story to read the original reporting.</p>'+(articles().length?articles().map(newsCard).join(''):'<p>No news matches this view.</p>');
 }else if(view==='watchlist'){
  title='Tracked coins';content+=accountState.user?'<p>Your tracked coins are saved to your account and shared across your devices.</p>'+tokenTable([...data.tokens,...data.newListings].filter(t=>saved.includes(t.id)))+'<div class="detail-actions">'+button('Add coins','movers')+button('My signal feed','personal')+'</div>':'<p>Create an account to track your coins across devices.</p>'+button('Create account','register')+button('Sign in','login');
 }else if(view==='personal'){
  title='My signal feed';content+=accountState.user?(data.signals.filter(personal).length?data.signals.filter(personal).map(signalView).join(''):'<p>No signals for your tracked coins yet.</p>'):'<p>Sign in to see signals for your tracked coins.</p>'+button('Sign in','login');
 }else if(view==='overview'||view==='about'){
  title='Everything Crypto';content+='<p>Major market moves, liquidation totals, recent listings and crypto news in one place.</p><p>Market capitalization measures valuation, not money entering or leaving crypto. Liquidations measure the notional value of forcibly closed leveraged positions.</p><p>News remains credited to the original publishers. Market signals are data summaries, not reported articles.</p>';
 }else if(view.startsWith('signal:')){
  title='Signal details';const item=data.signals.find(s=>s.id===view.slice(7));content+=item?signalView(item):'<p>This signal is no longer available.</p>';
 }else if(view.startsWith('token:')){
  const t=[...data.tokens,...data.newListings].find(t=>t.id===Number(view.slice(6)));title=t?.name||'Token';if(t)content+=values([[money(t.price,false),t.symbol+' price'],[percent(t.change),'24h price change']])+'<p>'+esc(t.platform||'Native chain')+'</p><button class="detail-button" data-save="'+t.id+'">'+(saved.includes(t.id)?'Untrack ':'Track ')+esc(t.symbol)+'</button>';
 }else{opened=null;return;}
 $('#detail-title').textContent=title;$('#detail-content').innerHTML=content;if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.open)show(b.dataset.open);
 else if(b.dataset.signal)show('signal:'+b.dataset.signal);
 else if(b.dataset.token)show('token:'+b.dataset.token);
 else if(b.dataset.window){windowChoice=b.dataset.window;render();}
 else if(b.dataset.detailWindow){windowChoice=b.dataset.detailWindow;render();show('liquidations');}
 else if(b.dataset.movers||b.dataset.detailMovers){moverFilter=b.dataset.movers||b.dataset.detailMovers;render();if(b.dataset.detailMovers)show('movers');}
 else if(b.dataset.filter||b.dataset.detailFilter){wireFilter=b.dataset.filter||b.dataset.detailFilter;render();if(b.dataset.detailFilter)show('signals');}
 else if(b.dataset.newsPublisher){newsPublisher=b.dataset.newsPublisher;render();}
 else if(b.dataset.save){saveCoin(Number(b.dataset.save)).catch(error=>{setText('#board-status',error.message);});}
 else if(b.dataset.action==='refresh')load();
});
$('#search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render();});
$('#close-dialog').addEventListener('click',()=>$('#detail-dialog').close());
$('#detail-dialog').addEventListener('close',()=>{opened=null;});
$('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!$('#detail-dialog').open){e.preventDefault();$('#search').focus();}});
document.addEventListener('account:change',e=>{
 saved=accountState.user?.watchlist||[];
 $('#account-name').innerHTML=esc(accountState.user?.name||'My account')+'<small id="mode-label">'+esc(accountState.user?accountState.user.focus+' · Free':'Sign in')+'</small>';
 render();if(e.detail?.view)show(e.detail.view);else if($('#detail-dialog').open&&(['watchlist','notifications','personal','movers','listings'].includes(opened)||opened?.startsWith('token:')))show(opened);
});
async function start(){await Promise.allSettled([loadAccount(),load()]);void pollNotifications();const params=new URLSearchParams(location.search);if(params.has('signup'))show('register');else if(params.has('notifications'))show('notifications');else if(params.has('account'))show('account');else if(params.has('watchlist'))show('watchlist');}
start();setInterval(()=>{if(!document.hidden&&!opened)load();},300000);
