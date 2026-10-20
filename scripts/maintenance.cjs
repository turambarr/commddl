// Generate a structured editorial queue; the build never copies this directory to Pages.
const fs=require('node:fs'),path=require('node:path'),C=require('../assets/core.js');
const root=path.join(__dirname,'..');
function writeMaintenance(data){
 const reviews=[];
 for(const v of data.venues){
  const shown=C.displayEvaluations(v);
  for(const e of [...(v.indexing?[{...v.indexing,system:'indexing'}]:[]),...(v.evaluations||[])]){
   if(['verified','reported'].includes(e.status)&&e.value)continue;
   const reference=shown.find(r=>r.system===e.system);
   reviews.push({venueId:v.id,name:v.nameEn,system:e.system,checkedEdition:e.year||e.edition||null,status:e.status,resolution:reference?'historical-reference':'editorial-review',referenceYear:reference?.year||null,referenceValue:reference?.value||null,evidence:e});
  }
  if(v.catalogStatus==='needs-review')reviews.push({venueId:v.id,name:v.nameEn,system:'identity',status:v.catalogStatus,resolution:'editorial-review',note:v.identityNote||'',sourceUrl:v.sourceUrl});
 }
 for(const call of data.calls){
  for(const node of call.nodes||[])if(node.precision==='unknown')reviews.push({callId:call.id,venueId:call.venueId,system:'date',nodeId:node.id,resolution:'editorial-review',evidence:node});
  if(!C.calendarDate(C.primaryNode(call))&&call.status!=='rolling')reviews.push({callId:call.id,venueId:call.venueId,system:'call',resolution:'editorial-review',note:call.notes||'',sourceUrl:call.sourceUrl});
 }
 fs.mkdirSync(path.join(root,'maintenance'),{recursive:true});
 fs.writeFileSync(path.join(root,'maintenance','review-queue.json'),JSON.stringify({version:data.meta.version,updatedAt:data.meta.updatedAt,records:reviews},null,2)+'\n');
 return reviews;
}
if(require.main===module){const d=require('./validate.cjs').validateCatalog(require('./catalog.cjs').loadCatalog(root));const q=writeMaintenance(d);console.log(`维护队列已生成：${q.length}项，保存在maintenance/，独立于网页发布数据。`);}
module.exports={writeMaintenance};
