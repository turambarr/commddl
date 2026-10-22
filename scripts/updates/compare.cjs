const crypto=require('node:crypto');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const signature=section=>({heading:section.heading,headingLevel:section.headingLevel,parentId:section.parentId,order:section.order,category:section.category,blocks:section.blocks||[],content:section.content||'',items:section.items||[]});
const digest=value=>crypto.createHash('sha256').update(canonical(value&&value.sectionId?signature(value):value)).digest('hex');
const semanticText=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('en').replace(/[\s\p{P}\p{S}]+/gu,'');
function sameFact(left,right){
 const leftStructured=left?.structuredValue,rightStructured=right?.structuredValue;
 if(leftStructured!==undefined&&rightStructured!==undefined&&canonical(leftStructured)===canonical(rightStructured))return true;
 const paragraphs=section=>(section?.blocks||[]).flatMap(block=>block.type==='paragraph'?[block.text]:block.type==='list'?(block.items||[]).map(item=>item.text):block.type==='table'?(block.rows||[]).flat():[]).map(semanticText).filter(Boolean);
 const a=paragraphs(left),b=paragraphs(right);if(a.some(value=>b.includes(value)))return true;
 const evidence=section=>(section?.evidence||[]).map(item=>({url:item.sourceUrl,quote:semanticText(item.quote)})).filter(item=>item.quote.length>=24);
 const leftEvidence=evidence(left),rightEvidence=evidence(right);return leftEvidence.some(a=>rightEvidence.some(b=>a.url===b.url&&a.quote===b.quote));
}
const mapSections=sections=>new Map((sections||[]).filter(section=>section.sectionId).map(section=>[section.sectionId,section]));
function compareSections({published=[],lastFetched=[],candidate=[],allowRemovals=true}){
 const live=mapSections(published),previous=mapSections(lastFetched),next=mapSections(candidate),changes=[];
 for(const [sectionId,section] of next){
  const old=previous.get(sectionId),current=live.get(sectionId);
  if(!old&&!current&&(published||[]).some(existing=>sameFact(existing,section)))continue;
  if(!old){if(current&&digest(current)===digest(section))continue;changes.push({sectionId,type:current?'baseline-missing':'added',old:current||null,next:section,conflict:false});continue;}
  if(digest(old)===digest(section))continue;
  const conflicted=Boolean(current&&digest(current)!==digest(old));
  changes.push({sectionId,type:old.heading===section.heading?'content-changed':'heading-changed',old,current:current||null,next:section,conflict:conflicted});
 }
 if(allowRemovals)for(const [sectionId,old] of previous){if(!next.has(sectionId))changes.push({sectionId,type:'possibly-removed',old,current:live.get(sectionId)||null,next:null,conflict:Boolean(live.has(sectionId)&&digest(live.get(sectionId))!==digest(old)),requiresReview:true});}
 return changes;
}
module.exports={compareSections,digest,sameFact,semanticText};
