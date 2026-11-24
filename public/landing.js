const money=value=>typeof value==='number'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value):'Unavailable';
async function snapshot(){
 try{const response=await fetch('/api/dashboard',{signal:AbortSignal.timeout(24000)});if(!response.ok)throw Error();const data=await response.json();document.querySelector('#landing-cap').textContent=money(data.market?.current);document.querySelector('#landing-liq').textContent=money(data.liquidations?.windows?.['24h']?.total);document.querySelector('#landing-news').textContent=String(data.news?.length||0);document.querySelector('#landing-updated').textContent='Updated '+new Date(data.fetchedAt).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC';}
 catch{for(const id of ['landing-cap','landing-liq','landing-news'])document.getElementById(id).textContent='Unavailable';document.querySelector('#landing-updated').textContent='The snapshot is temporarily unavailable. Open the dashboard to check again.';}
}
snapshot();
document.querySelectorAll('a[href="#demo"]').forEach(link=>link.addEventListener('click',()=>{document.querySelector('video').play().catch(()=>{});}));
