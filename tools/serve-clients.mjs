import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';

const port=Number(process.env.PORT||3074);
const backend=new URL(process.env.EC_PUBLIC_URL||'https://everything-cmc.vercel.app');
if(backend.protocol!=='https:'||backend.username||backend.password||backend.pathname!=='/')throw Error('EC_PUBLIC_URL must be an HTTPS application origin.');
const root=fileURLToPath(new URL('../public/',import.meta.url));
const hosts=new Set(['localhost:'+port,'127.0.0.1:'+port]);
const origins=new Set([...hosts].map(host=>'http://'+host));
const routes={
 '/api/dashboard':['GET'],'/api/health':['GET'],'/api/rwa':['GET'],
 '/api/account':['GET','PATCH'],'/api/auth/login':['POST'],'/api/auth/register':['POST'],'/api/auth/logout':['POST'],
 '/api/notifications':['GET'],'/api/notifications/read':['POST']
};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.vtt':'text/vtt; charset=utf-8'};
const send=(res,status,message)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));};

const server=createServer(async(req,res)=>{
 try{
  // Bind and validate loopback hosts so another website cannot use this proxy.
  if(!hosts.has(req.headers.host))return send(res,403,'Unsupported local host.');
  const url=new URL(req.url,'http://'+req.headers.host);
  res.setHeader('X-Content-Type-Options','nosniff');
  if(url.pathname.startsWith('/api/')){
   if(!routes[url.pathname]?.includes(req.method))return send(res,404,'Unsupported application route.');
   const mutation=!['GET','HEAD'].includes(req.method);
   if(mutation&&req.headers.origin&&!origins.has(req.headers.origin))return send(res,403,'Unsupported request origin.');
   const headers={Accept:'application/json'};
   for(const name of ['content-type','cookie','authorization'])if(req.headers[name])headers[name]=req.headers[name];
   let body;
   if(mutation){
    if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,'Use a JSON request.');
    headers.Origin=backend.origin;
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>16384)return send(res,413,'Request is too large.');chunks.push(chunk);}
    body=Buffer.concat(chunks);
   }
   const upstream=await fetch(new URL(url.pathname+url.search,backend),{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(60000)});
   res.statusCode=upstream.status;
   res.setHeader('Content-Type',upstream.headers.get('content-type')||'application/json');
   res.setHeader('Cache-Control','no-store');
   // Production remains HTTPS. The development cookie is restricted to loopback.
   const cookies=upstream.headers.getSetCookie().map(value=>value.replace(/;\s*Secure\b/gi,''));
   if(cookies.length)res.setHeader('Set-Cookie',cookies);
   if(upstream.body)Readable.fromWeb(upstream.body).pipe(res);else res.end();
   return;
  }
  if(!['GET','HEAD'].includes(req.method))return send(res,405,'Use GET.');
  if(url.pathname.startsWith('/downloads/')||url.pathname.endsWith('.mp4')){
   res.writeHead(302,{Location:new URL(url.pathname,backend).href});res.end();return;
  }
  const pages={'/':'/landing.html','/app':'/dashboard.html','/crypto':'/dashboard.html','/rwa':'/rwa.html'};
  const filename=resolve(root,'.'+decodeURIComponent(pages[url.pathname]||url.pathname));
  if(!filename.startsWith(root.endsWith(sep)?root:root+sep))return send(res,404,'File not found.');
  const info=await stat(filename).catch(()=>null);
  if(!info?.isFile())return send(res,404,'File not found.');
  res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});
  if(req.method==='HEAD')res.end();else createReadStream(filename).pipe(res);
 }catch{
  if(!res.headersSent)send(res,502,'The application service is temporarily unavailable.');else res.end();
 }
});
server.listen(port,'127.0.0.1',()=>console.log('Everything clients: http://localhost:'+port));
