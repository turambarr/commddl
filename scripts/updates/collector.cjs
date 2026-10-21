const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const cheerio=require('cheerio');
const C=require('../../assets/core.js');
const {loadCatalog}=require('../catalog.cjs');
const {fetchHTML}=require('./fetch.cjs');
const {extractDocument}=require('./extract.cjs');
const {compareSections}=require('./compare.cjs');
const ROOT=path.join(__dirname,'../..');
const POLICY=JSON.parse(fs.readFileSync(path.join(__dirname,'policy.json'),'utf8'));
const htmlHash=text=>crypto.createHash('sha256').update(text).digest('hex');
const LINK_RE=/(about|aims|scope|topic|cfp|call.for|submission|author|paper|publication|important.date|guideline|投稿|征稿|主题|范围|作者|日期)/i;
function parseDeadlineDate(value){const text=String(value||'').trim();let match=text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);if(match)return `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;const parsed=Date.parse(`${text} UTC`);if(!Number.isFinite(parsed))return null;const date=new Date(parsed),year=date.getUTCFullYear();return year>=2020&&year<=2100?date.toISOString().slice(0,10):null;}
function normalizeBaselines(value){return value?.baselines&&typeof value.baselines==='object'?value.baselines:value||{};}
function retryDelayHours(retryCount,retryAfterSeconds=0){return Math.max(Math.min(48,2**Math.min(Math.max(0,Number(retryCount)||0),6)),Math.max(0,Number(retryAfterSeconds)||0)/3600);}
function dateChanges(item,sections){
 if(!item.venueId)return [];
 const nodes=item.nodes||[],candidates=new Map(),datePattern=/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b[A-Z][a-z]+\s+\d{1,2},?\s+20\d{2}\b|\b\d{1,2}\s+[A-Z][a-z]+\s+20\d{2}\b/gi;
 for(const section of sections){
  if(!/important.?dates|deadline|timeline|submission|投稿日期|重要日期/i.test(`${section.category} ${section.heading}`))continue;
  const lines=(section.blocks||[]).flatMap(block=>block.type==='paragraph'?[block.text]:block.type==='list'?(block.items||[]).map(entry=>entry.text):block.type==='table'?(block.rows||[]).map(row=>row.join(' ')):[]);
  for(const line of lines){
   if(!/(submission|abstract|full paper|camera.ready|final paper|notification|acceptance|稿件|摘要|终稿|录用通知|投稿|截稿|deadline)/i.test(line))continue;
   const matches=[...String(line).matchAll(new RegExp(datePattern.source,datePattern.flags))];
   // A line with competing dates (often an extension history or an old/new pair)
   // is ambiguous. Do not select the first date and silently publish it.
   if(matches.length!==1)continue;
   // Time-bearing text needs an explicit parser and timezone mapping. This
   // deterministic date-only extractor must not discard that precision.
   if(/\b\d{1,2}:\d{2}\b|\b(?:AM|PM)\b|\b(?:AoE|UTC|GMT|ET|PT|PST|PDT|CET|CEST|JST|AEST)\b/i.test(line))continue;
   const nextDate=parseDeadlineDate(matches[0][0]);if(!nextDate)continue;
   let types=[];
   if(/abstract|摘要|registration|注册/i.test(line))types=['abstract'];
   else if(/camera.?ready|final (paper|version)|终稿/i.test(line))types=['final','camera-ready'];
   else if(/notification|acceptance|录用通知/i.test(line))types=['decision','notification'];
   else if(/full paper|paper submission|submission deadline|稿件|投稿|截稿|deadline/i.test(line))types=['paper'];
   let targets=nodes.filter(node=>types.includes(node.type)||types.includes(node.id));
   if(!targets.length&&types.includes('paper'))targets=nodes.filter(node=>node.primary&&node.type==='paper');
   if(targets.length!==1)continue;
   const node=targets[0],key=node.id,current=candidates.get(key)||{dates:new Set(),evidence:[]};current.dates.add(nextDate);current.evidence.push({section,line,nextDate});candidates.set(key,current);
  }
 }
 const found=[];
 for(const [nodeId,candidate] of candidates){
  if(candidate.dates.size!==1)continue;
  const node=nodes.find(entry=>entry.id===nodeId),evidence=candidate.evidence.at(-1),nextDate=[...candidate.dates][0];if(!node||nextDate===node.date)continue;
  found.push({sectionId:`date:${item.id}:${node.id}`,type:'node-date-changed',nodeId:node.id,sourceUrl:evidence.section.sourceUrl,oldDate:node.date||null,nextDate,heading:evidence.section.heading,excerpt:evidence.line,precision:'date'});
 }
 return found;
}
function parseArgs(args){const out={ids:[],dryRun:false,limit:POLICY.batchLimit};for(let i=0;i<args.length;i++){if(args[i]==='--ids')out.ids=args[++i].split(',').filter(Boolean);else if(args[i]==='--due')out.due=true;else if(args[i]==='--dry-run')out.dryRun=true;else if(args[i]==='--out')out.out=args[++i];else if(args[i]==='--baselines')out.baselines=args[++i];else if(args[i]==='--limit')out.limit=Math.min(POLICY.batchLimit,Math.max(1,Number(args[++i])||POLICY.batchLimit));}return out;}
function seedsFor(item,venue){return [...new Set([item.url,item.sourceUrl,item.authorGuideUrl,item.cfpUrl,...(!item.venueId?[venue.url,venue.sourceUrl,venue.authorGuideUrl,venue.cfpUrl]:[])].filter(value=>typeof value==='string'&&/^https:\/\//i.test(value)))];}
function discoveredLinks(html,baseUrl){
 const $=cheerio.load(html),base=new URL(baseUrl),links=[];
 $('a[href]').each((_,el)=>{const href=$(el).attr('href'),label=$(el).text().replace(/\s+/g,' ').trim();if(!href||!LINK_RE.test(`${label} ${href}`))return;try{const url=new URL(href,base);if(url.protocol==='https:'&&url.hostname===base.hostname&&!/\.(pdf|zip|ics|png|jpe?g|svg|css|js)(?:$|\?)/i.test(url.pathname))links.push({url:url.href,label});}catch{}});
 return [...new Map(links.map(item=>[item.url,item])).values()];
}
async function collectEntity(item,venue,baseline=[],retryCount=0){
 const baselinePages=Array.isArray(baseline)?[]:(baseline.pages||[]),baselineSections=Array.isArray(baseline)?baseline:baselinePages.flatMap(page=>page.sections||[]);
 const entityId=item.id,queue=seedsFor(item,venue).map(url=>({url,depth:0,discoveredBy:null})),seen=new Set(),pages=[],failures=[],unreadLinks=[];
 while(queue.length&&pages.length<POLICY.pageBudget){
  const item=queue.shift();if(seen.has(item.url))continue;seen.add(item.url);
  try{
   const previous=baselinePages.find(page=>page.requestedUrl===item.url||page.url===item.url),response=await fetchHTML(item.url,{etag:previous?.etag,lastModified:previous?.lastModified});if(response.notModified){if(previous)pages.push(previous);continue;}
   const extracted=extractDocument(response.html,response.url);
   const page={url:response.url,requestedUrl:item.url,depth:item.depth,discoveredBy:item.discoveredBy,etag:response.etag,lastModified:response.lastModified,sourceHash:htmlHash(response.html),contentHash:extracted.contentHash,sections:extracted.sections,headings:extracted.headings};
   pages.push(page);
   if(item.depth<POLICY.linkDepth)for(const link of discoveredLinks(response.html,response.url))if(!seen.has(link.url)&&!queue.some(p=>p.url===link.url))queue.push({url:link.url,depth:item.depth+1,discoveredBy:{url:response.url,label:link.label}});
  }catch(error){failures.push({url:item.url,depth:item.depth,message:error.message,retryAfterSeconds:error.retryAfterSeconds||null});}
 }
 for(const pending of queue)unreadLinks.push({url:pending.url,depth:pending.depth,discoveredBy:pending.discoveredBy});
 const fetchedAt=new Date().toISOString(),sections=pages.flatMap(page=>page.sections.map(section=>({...section,sourceUrl:page.url,sourceHash:page.sourceHash,fetchedAt,extractorVersion:POLICY.extractorVersion})));
 const changes=[...compareSections({published:item.officialSections||[],lastFetched:baselineSections,candidate:sections,allowRemovals:pages.length>0&&!failures.length&&!unreadLinks.length}),...dateChanges(item,sections)];
 const primary=item.venueId?C.primaryNode(item):null,deadline=primary?C.calendarDate(primary,'UTC'):null,today=new Date().toISOString().slice(0,10),days=deadline?Math.floor((Date.parse(`${deadline}T00:00:00Z`)-Date.parse(`${today}T00:00:00Z`))/86400000):null;
 const intervalHours=!item.venueId?POLICY.reviewedAgesHours.venueDetails:days===null?POLICY.reviewedAgesHours.activeCalls:days<0?(days>=-7?POLICY.reviewedAgesHours.expiredCallsFirstRetry:POLICY.reviewedAgesHours.expiredCallsLaterRetry):days<=30?POLICY.reviewedAgesHours.urgentDeadlines:POLICY.reviewedAgesHours.activeCalls;
 const priorAttempts=retryCount;
 const retryAfter=Math.max(0,...failures.map(failure=>failure.retryAfterSeconds||0));
 const status=pages.length?(failures.length?'partial':'fetched'):'failed',delayHours=failures.length?retryDelayHours(priorAttempts,retryAfter):intervalHours;
 return {entity:{id:entityId,kind:item.kind,recordType:item.venueId?'call':'venue',venueId:item.venueId||null},fetchedAt,nextCheckAt:new Date(Date.now()+delayHours*3600000).toISOString(),status,sourceHash:htmlHash(pages.map(page=>page.sourceHash).join('\n')),pages,sections,changes,failures,unreadLinks,gaps:pages.length?[]:['no-page-read']};
}
async function main(){
 const args=parseArgs(process.argv.slice(2)),data=loadCatalog(ROOT),entities=new Map([...data.venues,...data.calls].map(item=>[item.id,item]));
 let targets=args.ids.length?args.ids.map(id=>{const entity=entities.get(id);if(!entity)throw new Error(`未知维护实体：${id}`);return entity;}):[];
 if(args.due){
  if(!args.baselines)throw new Error('--due 需要 --baselines <due.json>，其中包含服务端返回的到期 ids 与 baselines。');
  const due=JSON.parse(fs.readFileSync(args.baselines,'utf8'));
  targets=(due.ids||[]).slice(0,args.limit).map(id=>{const entity=entities.get(id);if(!entity)throw new Error(`未知维护实体：${id}`);return entity;});
 }
 if(!args.ids.length&&!args.due)throw new Error('需指定 --ids <venue-id[,id...]> 或 --due。');
 const baselineFile=args.baselines?JSON.parse(fs.readFileSync(args.baselines,'utf8')):{};
 // Both the internal API wrapper ({ids, baselines, snapshots}) and a legacy
 // flat {entityId: baseline} map are accepted for manual and scheduled runs.
 const baselines=normalizeBaselines(baselineFile);
 const output={schemaVersion:1,createdAt:new Date().toISOString(),extractorVersion:POLICY.extractorVersion,baseRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),items:[]};
 const selected=targets.slice(0,args.limit);
 for(let i=0;i<selected.length;i+=POLICY.globalConcurrency){
  const group=selected.slice(i,i+POLICY.globalConcurrency);
  const collected=await Promise.all(group.map(item=>{const venue=item.venueId?data.venues.find(v=>v.id===item.venueId):item,retryCount=baselineFile.snapshots?.find(snapshot=>snapshot.entity_id===item.id)?.retry_count||0;return collectEntity(item,venue,baselines[item.id]||[],retryCount);}));
  output.items.push(...collected);
 }
 if(args.out){const target=path.resolve(args.out);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');}
 process.stdout.write(JSON.stringify(output,null,2)+'\n');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={collectEntity,dateChanges,parseDeadlineDate,normalizeBaselines,retryDelayHours};
