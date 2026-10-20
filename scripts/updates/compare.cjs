const crypto=require('node:crypto');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const signature=section=>({heading:section.heading,headingLevel:section.headingLevel,parentId:section.parentId,order:section.order,category:section.category,blocks:section.blocks||[],content:section.content||'',items:section.items||[]});
const digest=value=>crypto.createHash('sha256').update(canonical(value&&value.sectionId?signature(value):value)).digest('hex');
const mapSections=sections=>new Map((sections||[]).filter(section=>section.sectionId).map(section=>[section.sectionId,section]));
function compareSections({published=[],lastFetched=[],candidate=[],allowRemovals=true}){
 const live=mapSections(published),previous=mapSections(lastFetched),next=mapSections(candidate),changes=[];
 for(const [sectionId,section] of next){
  const old=previous.get(sectionId),current=live.get(sectionId);
  if(!old){if(current&&digest(current)===digest(section))continue;changes.push({sectionId,type:current?'baseline-missing':'added',old:current||null,next:section,conflict:false});continue;}
  if(digest(old)===digest(section))continue;
  const conflicted=Boolean(current&&digest(current)!==digest(old));
  changes.push({sectionId,type:old.heading===section.heading?'content-changed':'heading-changed',old,current:current||null,next:section,conflict:conflicted});
 }
 if(allowRemovals)for(const [sectionId,old] of previous){if(!next.has(sectionId))changes.push({sectionId,type:'possibly-removed',old,current:live.get(sectionId)||null,next:null,conflict:Boolean(live.has(sectionId)&&digest(live.get(sectionId))!==digest(old)),requiresReview:true});}
 return changes;
}
module.exports={compareSections,digest};
