import dns from 'node:dns/promises';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import {load} from 'cheerio';
export function publicAddress(ip){try{let a=ipaddr.parse(ip);if(a.kind()==='ipv6'&&a.isIPv4MappedAddress())a=a.toIPv4Address();return a.range()==='unicast'}catch{return false}}
export function safeUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.hostname.endsWith('.')||u.hostname.length>253)throw Error('Use a public HTTPS URL without credentials or a custom port.');return u}
export async function retrieve(value,depth=0){
 const u=safeUrl(value);const addresses=await dns.lookup(u.hostname,{all:true});if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw Error('This address is not a public website. Paste source text instead.');
 const chosen=addresses[0];
 const result=await new Promise((resolve,reject)=>{const r=https.get(u,{lookup:(_h,o,cb)=>o.all?cb(null,[chosen]):cb(null,chosen.address,chosen.family),timeout:8000,headers:{'User-Agent':'AccountBriefDemo/1.0','Accept':'text/html,text/plain'}},res=>{if(res.statusCode>=300&&res.statusCode<400){res.resume();return resolve({redirect:res.headers.location})}if(res.statusCode!==200){res.resume();return reject(Error('Website returned '+res.statusCode+'. Paste source text instead.'))}if(!/text\/(html|plain)/i.test(res.headers['content-type']||'')){res.resume();return reject(Error('Only public HTML or plain text is supported.'))}let chunks=[],size=0;res.on('data',c=>{size+=c.length;if(size>500000){r.destroy(Error('Page is too large. Paste the relevant text instead.'));return}chunks.push(c)});res.on('end',()=>resolve({body:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject)});r.on('timeout',()=>r.destroy(Error('Website timed out. Paste source text instead.')));r.on('error',reject)});
 if(result.redirect){if(depth>=3)throw Error('Too many redirects. Paste source text instead.');return retrieve(new URL(result.redirect,u).href,depth+1)}
 const $=load(result.body);$('script,style,noscript,nav,footer,iframe,svg,form').remove();const text=$('body').text().replace(/\s+/g,' ').trim().slice(0,8000);if(text.length<80)throw Error('Not enough readable text. Paste website text instead.');return {id:'S1',url:u.href,text,retrieved_at:new Date().toISOString()};
}
