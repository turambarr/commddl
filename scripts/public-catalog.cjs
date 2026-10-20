// Produce the reader's catalog from the complete maintenance record.
const C=require('../assets/core.js');
const {sourcePath}=require('./catalog.cjs');
const contributionURL=(data,item)=>`${data.meta.repository}/blob/main/${sourcePath(item)}`;
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
const positive=e=>e&&['verified','reported'].includes(e.status)&&e.value;
const evidenceKeys=['system','value','status','year','releaseYear','edition','snapshotDate','sourceUrl','sourceFileUrl','sourcePageUrl','sourceTitle','sourceType','sourceAuthority','verifiedAt','reviewedAt','category','categories','minorCategories','appliesToName','issn','eissn','page','sheet','row','top','coverage','officialUrl'];
const sectionKeys=['sectionId','parentId','heading','headingLevel','order','category','sourceUrl','sourceAnchor','content','items','blocks'];
function publicBlock(block){
 if(!block||!['paragraph','list','table','links'].includes(block.type))return null;
 if(block.type==='paragraph')return pick(block,['type','text']);
 if(block.type==='table')return pick(block,['type','rows']);
 if(block.type==='links')return {type:'links',items:(block.items||[]).map(item=>pick(item,['label','href']))};
 const listItems=items=>(items||[]).map(item=>({text:item.text,items:listItems(item.items)}));
 return {type:'list',ordered:Boolean(block.ordered),items:listItems(block.items)};
}
const publicSections=sections=>Array.isArray(sections)?sections.map(section=>({...pick(section,sectionKeys),blocks:Array.isArray(section.blocks)?section.blocks.map(publicBlock).filter(Boolean):undefined})):undefined;
const venueKeys=['id','kind','short','nameZh','nameEn','issn','eissn','aliases','areas','topics','summary','publicationType','articleTypes','submissionMode','url','sourceUrl','sourceType','verifiedAt','identityReviewedAt','authorGuideUrl','cfpUrl','primaryArea','secondaryAreas','urlKind','identitySourceYear','catalogScope','invitationOnly','publicationNote','officialSections'];
const callKeys=['id','venueId','title','titleEn','year','kind','areas','topics','tags','summary','sourceUrl','url','sourceType','verification','verifiedAt','updatedAt','status','location','eventStart','eventEnd','eventDates','sourceTimezone','submissionCategory','inheritsVenueEvaluation','officialSections'];
const nodeKeys=['id','label','type','primary','precision','date','instant','timezone','original','revision','sourceUrl','updatedAt','requires'];
function makePublicCatalog(data){
 const result={...pick(data,['meta','areas','topics','ratingSystems']),sources:[],venues:[],calls:[],callAliases:{},favoriteAliases:{}};
 result.meta=pick(data.meta,['version','updatedAt','siteName','repository','description','homepage','ccfddlReference','adminPortalUrl']);
 result.ratingSystems=data.ratingSystems.map(r=>pick(r,['id','label','year','sourceUrl']));
 result.sources=data.sources.filter(s=>s.url).map(s=>pick(s,['title','url','verifiedAt']));
 for(const v of data.venues){
  const published=pick(v,venueKeys);
  if(published.officialSections)published.officialSections=publicSections(published.officialSections);
  published.contributionUrl=contributionURL(data,v);
  if(v.invitationOnly)published.submissionMode=v.submissionMode||'邀请投稿';
  published.evaluations=(v.evaluations||[]).filter(e=>C.isRankEvidence(e)).map(e=>pick(e,evidenceKeys));
  if(positive(v.indexing))published.indexing=pick(v.indexing,evidenceKeys);
  published.otherIndexes=(v.otherIndexes||[]).filter(positive).map(e=>pick(e,evidenceKeys));
  published.assessments=(v.assessments||[]).filter(a=>a.system==='bupt-ict-2018').map(a=>pick(a,['system','year','value','sourceUrl','page']));
  // Only the archive boundary is public; editorial queue states stay in the source record.
  published.catalogStatus=v.catalogScope==='archive'?'historical-only':'current';
  result.venues.push(published);
 }
 for(const call of data.calls){
  const primary=C.primaryNode(call);
  const publish=call.verification==='verified'&&!['conflict'].includes(call.status)&&(call.status==='rolling'||C.calendarDate(primary,'UTC'));
  const nodes=(call.nodes||[]).filter(n=>C.calendarDate(n,'UTC'));
  // A dated round with an unresolved registration prerequisite stays in maintenance.
  const prerequisitesKnown=nodes.every(n=>(n.requires||[]).every(id=>nodes.some(x=>x.id===id)));
  if(!publish||!prerequisitesKnown){result.favoriteAliases['call:'+call.id]='venue:'+call.venueId;continue;}
  const published=pick(call,callKeys);if(published.officialSections)published.officialSections=publicSections(published.officialSections);published.contributionUrl=contributionURL(data,call);published.nodes=nodes.map(n=>pick(n,nodeKeys));published.history=[];
  result.calls.push(published);
 }
 for(const [oldId,newId] of Object.entries(data.callAliases||{})){
  if(result.calls.some(c=>c.id===newId))result.callAliases[oldId]=newId;
  else if(result.favoriteAliases['call:'+newId])result.favoriteAliases['call:'+oldId]=result.favoriteAliases['call:'+newId];
 }
 return result;
}
module.exports={makePublicCatalog};
