const https=require('node:https');
const dns=require('node:dns/promises');
const net=require('node:net');
const {HttpsProxyAgent}=require('https-proxy-agent');
const MAX_BYTES=4*1024*1024,MAX_REDIRECTS=4,TIMEOUT=18000;
function privateAddress(address){
 const family=net.isIP(address);
 if(family===4){const [a,b]=address.split('.').map(Number);return a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19));}
 if(family===6)return address==='::'||address==='::1'||/^f[cd]/i.test(address)||/^fe[89ab]/i.test(address)||address.toLowerCase().startsWith('::ffff:');
 return false;
}
async function checkedURL(raw){
 const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)throw new Error('只允许无账号信息的 HTTPS 官网页面。');
 const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local'))throw new Error('拒绝访问本机或本地域名。');
 const addresses=net.isIP(host)?[{address:host}]:await dns.lookup(host,{all:true});
 if(!addresses.length||addresses.some(({address})=>privateAddress(address)))throw new Error('域名未解析到公开地址。');return url;
}
async function fetchHTML(raw,{etag,lastModified,redirects=0}={}){
 const url=await checkedURL(raw);const proxy=process.env.https_proxy||process.env.HTTPS_PROXY||process.env.all_proxy||process.env.ALL_PROXY;
 return new Promise((resolve,reject)=>{
  const agent=proxy?new HttpsProxyAgent(proxy):undefined;
  const request=https.get(url,{agent,headers:{'user-agent':'CommDDL update collector/1.0 (+https://github.com/turambarr/commddl)','accept':'text/html,application/xhtml+xml','accept-encoding':'identity',...(etag?{'if-none-match':etag}:{}),...(lastModified?{'if-modified-since':lastModified}:{})}},response=>{
   const status=response.statusCode||0;
   if([301,302,303,307,308].includes(status)&&response.headers.location){response.resume();if(redirects>=MAX_REDIRECTS)return reject(new Error('重定向次数超过限制。'));return resolve(fetchHTML(new URL(response.headers.location,url).href,{etag,lastModified,redirects:redirects+1}));}
   if(status===304){response.resume();return resolve({notModified:true,url:url.href,etag:response.headers.etag||etag,lastModified:response.headers['last-modified']||lastModified});}
   if(status===429){const retry=Number(response.headers['retry-after']||0);response.resume();return reject(Object.assign(new Error('官网限流 HTTP 429。'),{retryAfterSeconds:retry||null}));}
   if(status!==200){response.resume();return reject(new Error(`官网返回 HTTP ${status}。`));}
   const type=String(response.headers['content-type']||'').toLowerCase();if(!type.includes('text/html')&&!type.includes('application/xhtml+xml')){response.resume();return reject(new Error(`页面类型不是 HTML：${type||'unknown'}`));}
   let size=0;const chunks=[];response.on('data',chunk=>{size+=chunk.length;if(size>MAX_BYTES){request.destroy(new Error('网页超过 4 MB 采集上限。'));return;}chunks.push(chunk);});
   response.on('end',()=>resolve({html:Buffer.concat(chunks).toString('utf8'),url:url.href,etag:response.headers.etag||null,lastModified:response.headers['last-modified']||null}));response.on('error',reject);
  });request.setTimeout(TIMEOUT,()=>request.destroy(new Error(`读取官网超时（${TIMEOUT/1000} 秒）。`)));request.on('error',reject);
 });
}
module.exports={fetchHTML,checkedURL};
