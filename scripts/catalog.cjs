// YAML files are the source; JSON and browser assets are generated locally or in CI.
const fs=require('node:fs');
const path=require('node:path');
const YAML=require('yaml');
const ROOT=path.join(__dirname,'..');
const CONFIG_FILES={meta:'meta.yml',areas:'areas.yml',topics:'topics.yml',sources:'sources.yml',legacyMappings:'legacy-mappings.yml',policy:'policy.yml',ratingSystems:'rating-systems.yml',callAliases:'call-aliases.yml'};
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function readYAML(file){
  try{
    const doc=YAML.parseDocument(fs.readFileSync(file,'utf8'),{version:'1.2',schema:'core',uniqueKeys:true,stringKeys:true,merge:false});
    if(doc.errors.length||doc.warnings.length)throw new Error([...doc.errors,...doc.warnings].map(e=>e.message).join('\n'));
    if(doc.directives.yaml.version!=='1.2')throw new Error('Use YAML 1.2.');
    YAML.visit(doc,{Alias(){throw new Error('YAML aliases are not supported; keep each record self-contained.');}});
    const value=doc.toJS({maxAliasCount:0});
    function check(item){
      if(typeof item==='number'&&!Number.isFinite(item))throw new Error('Non-finite numbers cannot be represented in JSON.');
      if(item&&typeof item==='object'){
        if(!Array.isArray(item)&&![Object.prototype,null].includes(Object.getPrototypeOf(item)))throw new Error('Use JSON-compatible YAML objects, arrays and scalar values.');
        if(Object.hasOwn(item,'<<'))throw new Error('YAML merge keys are not supported.');
        Object.values(item).forEach(check);
      }
    }
    check(value);return value;
  }catch(error){throw new Error(`${file}: ${error.message}`);}
}
function callYear(call){
  if(call.kind==='series'&&call.status==='rolling')return 'rolling';
  if(Number.isInteger(call.year)&&call.year>=2000&&call.year<=2199)return String(call.year);
  if(Object.hasOwn(call,'year'))throw new Error(`${call.id||'call'}: year must be an integer between 2000 and 2199.`);
  // Existing special issues encode the submission cycle in their stable ID.
  const cycle=String(call.id||'').match(/(?:^|-)(20\d{2})(?:-|$)/);
  if(cycle)return cycle[1];
  throw new Error(`${call.id||'call'}: specify an integer year, or use a dated stable ID for a special issue.`);
}
function sourcePath(item){
  return !Object.hasOwn(item,'venueId')
    ? `data/venues/${item.primaryArea}/${item.id}.yml`
    : `data/calls/${callYear(item)}/${item.id}.yml`;
}
function readCollection(root,kind,areas){
  const dir=path.join(root,'data',kind),records=[],seen=new Map();
  for(const group of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    if(['README.md','.gitkeep','.DS_Store'].includes(group.name))continue;
    if(!group.isDirectory())throw new Error(`${dir}/${group.name}: records must be placed in a group directory.`);
    if(kind==='venues'&&!areas.has(group.name))throw new Error(`${dir}/${group.name}: unknown primary direction.`);
    if(kind==='calls'&&!/^(20\d{2}|21\d{2}|rolling)$/.test(group.name))throw new Error(`${dir}/${group.name}: use a year directory or rolling.`);
    for(const entry of fs.readdirSync(path.join(dir,group.name),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      if(['README.md','.gitkeep','.DS_Store'].includes(entry.name))continue;
      const file=path.join(dir,group.name,entry.name);
      if(!entry.isFile()||!entry.name.endsWith('.yml'))throw new Error(`${file}: use one regular .yml file per record.`);
      const item=readYAML(file);
      if(!plain(item)||!ID.test(item.id))throw new Error(`${file}: record needs a stable lowercase id.`);
      if(entry.name!==item.id+'.yml')throw new Error(`${file}: filename must match id ${item.id}.`);
      if(seen.has(item.id))throw new Error(`${file}: duplicate id ${item.id}; also in ${seen.get(item.id)}.`);
      const expected=kind==='venues'?item.primaryArea:callYear(item);
      if(group.name!==expected)throw new Error(`${file}: expected group ${expected}.`);
      seen.set(item.id,file);records.push(item);
    }
  }
  return records.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
function loadCatalog(root=ROOT){
  const data={};
  for(const [key,name] of Object.entries(CONFIG_FILES)){
    const file=path.join(root,'data',name),value=readYAML(file);
    const object=['meta','policy','callAliases'].includes(key);
    if(object?!plain(value):!Array.isArray(value))throw new Error(`${file}: expected ${object?'an object':'an array'}.`);
    data[key]=value;
  }
  const areas=new Set(data.areas.map(a=>a.id));
  data.venues=readCollection(root,'venues',areas);data.calls=readCollection(root,'calls',areas);
  const venues=new Set(data.venues.map(v=>v.id));
  for(const call of data.calls){
    if(venues.has(call.id))throw new Error(`${sourcePath(call)}: id also belongs to a venue.`);
    if(!venues.has(call.venueId))throw new Error(`${sourcePath(call)}: unknown venueId ${call.venueId}.`);
  }
  // Contributors update their own record dates; no shared release file edit is needed.
  const dates=[data.meta.updatedAt];
  function collect(value){
    if(!value||typeof value!=='object')return;
    for(const [key,item] of Object.entries(value)){
      if(/^(verifiedAt|reviewedAt|updatedAt|identityReviewedAt|topicReviewedAt|scopeReviewedAt|ratingReviewedAt|deadlineReviewedAt)$/.test(key)&&typeof item==='string'&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(item))dates.push(item.slice(0,10));
      else if(item&&typeof item==='object')collect(item);
    }
  }
  collect(data.venues);collect(data.calls);data.meta.updatedAt=dates.filter(Boolean).sort().at(-1);
  return data;
}
function writeCatalog(data,root=ROOT){
  const target=path.join(root,'data/catalog.json');
  fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');
  return target;
}
if(require.main===module){
  try{const data=loadCatalog();require('./validate.cjs').validateCatalog(data);writeCatalog(data);console.log(`已合并 ${data.venues.length} 个载体和 ${data.calls.length} 项征稿，生成 data/catalog.json。`);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={CONFIG_FILES,readYAML,callYear,sourcePath,loadCatalog,writeCatalog};
