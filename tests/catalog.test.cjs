const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),YAML=require('yaml');
const {CONFIG_FILES,loadCatalog,readYAML,writeCatalog,callYear}=require('../scripts/catalog.cjs');
const {validateCatalog}=require('../scripts/validate.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-yaml-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'data/venues/wireless'),{recursive:true});fs.mkdirSync(path.join(root,'data/calls/2027'),{recursive:true});
 const base={meta:{version:'test',updatedAt:'2026-10-19'},areas:[{id:'wireless'}],topics:[],sources:[],legacyMappings:[],policy:{},ratingSystems:[],callAliases:{}};
 const write=(name,value)=>fs.writeFileSync(path.join(root,'data',name),typeof value==='string'?value:YAML.stringify(value,{lineWidth:0}));
 for(const [key,name] of Object.entries(CONFIG_FILES))write(name,base[key]);
 write('venues/wireless/demo.yml',{id:'demo',kind:'conference',primaryArea:'wireless',areas:['wireless'],aliases:['No','MWCL'],evaluations:[{system:'cas',value:'1'}]});
 write('calls/2027/demo-2027.yml',{id:'demo-2027',venueId:'demo',kind:'conference',year:2027,verifiedAt:'2026-10-19',nodes:[{id:'paper',precision:'date',date:'2026-10-30',instant:null,revision:0}]});
 return {root,write};
}
test('compilation preserves string grades, date-only strings, nulls, arrays and stable IDs',t=>{
 const {root}=fixture(t),d=loadCatalog(root);
 assert.equal(d.venues[0].evaluations[0].value,'1');assert.deepEqual(d.venues[0].aliases,['No','MWCL']);
 assert.equal(d.calls[0].nodes[0].date,'2026-10-30');assert.equal(d.calls[0].nodes[0].instant,null);
 assert.equal(callYear({id:'jsac-flexible-2026',kind:'special'}),'2026');
 assert.equal(callYear({id:'series',kind:'series',status:'rolling'}),'rolling');
});
test('files compile in deterministic ID order and comments do not change the result',t=>{
 const {root,write}=fixture(t);write('venues/wireless/aaa.yml',{id:'aaa',kind:'journal',primaryArea:'wireless'});
 write('venues/wireless/zzz.yml','# Agent note\nid: zzz\nkind: conference\nprimaryArea: wireless\n');
 const d=loadCatalog(root);assert.deepEqual(d.venues.map(v=>v.id),['aaa','demo','zzz']);
 const file=writeCatalog(d,root),first=fs.readFileSync(file,'utf8');writeCatalog(loadCatalog(root),root);assert.equal(fs.readFileSync(file,'utf8'),first);
});
test('duplicate YAML keys fail with a source filename instead of silently overwriting',t=>{
 const {root,write}=fixture(t);write('venues/wireless/demo.yml','id: demo\nid: replaced\nprimaryArea: wireless\n');
 assert.throws(()=>loadCatalog(root),/demo\.yml:.*Map keys must be unique/s);
});
test('malformed YAML, aliases, merge keys and non-JSON numbers are rejected',t=>{
 const {root,write}=fixture(t),file=path.join(root,'data/venues/wireless/demo.yml');
 for(const bad of ['id: [broken','id: demo\nx: &x [1]\ny: *x','id: demo\n<<: { x: 1 }','id: demo\nx: .inf','id: demo\nx: !!set {a: null}','id: demo\n---\nid: second']){
  write('venues/wireless/demo.yml',bad);assert.throws(()=>readYAML(file),/demo\.yml:/);
 }
});
test('filename and primary direction must agree with the record',t=>{
 const {root,write}=fixture(t);
 write('venues/wireless/demo.yml',{id:'different',primaryArea:'wireless'});assert.throws(()=>loadCatalog(root),/filename must match/);
 write('venues/wireless/demo.yml',{id:'demo',primaryArea:'signal'});assert.throws(()=>loadCatalog(root),/expected group signal/);
});
test('duplicate IDs in separate files are reported before generation',t=>{
 const {root,write}=fixture(t);write('areas.yml',[{id:'wireless'},{id:'signal'}]);fs.mkdirSync(path.join(root,'data/venues/signal'));
 write('venues/signal/demo.yml',{id:'demo',primaryArea:'signal'});assert.throws(()=>loadCatalog(root),/duplicate id demo/);
});
test('call year, directory and parent references are checked',t=>{
 const {root,write}=fixture(t);
 write('calls/2027/demo-2027.yml',{id:'demo-2027',venueId:'missing',kind:'conference',year:2027});assert.throws(()=>loadCatalog(root),/unknown venueId missing/);
 write('calls/2027/demo-2027.yml',{id:'demo-2027',venueId:'demo',kind:'conference',year:2026});assert.throws(()=>loadCatalog(root),/expected group 2026/);
 write('calls/2027/demo-2027.yml',{id:'demo-2027',venueId:'demo',kind:'conference',year:'2027'});assert.throws(()=>loadCatalog(root),/year must be an integer/);
});
test('source changes update the catalog date without modifying shared release metadata',t=>{
 const {root,write}=fixture(t);write('calls/2027/demo-2027.yml',{id:'demo-2027',venueId:'demo',kind:'conference',year:2027,updatedAt:'2026-10-22T08:00:00Z'});
 assert.equal(loadCatalog(root).meta.updatedAt,'2026-10-22');assert.equal(readYAML(path.join(root,'data/meta.yml')).updatedAt,'2026-10-19');
});
test('semantic date errors identify the individual source file',()=>{
 const d=loadCatalog();const c=d.calls.find(c=>c.id==='icc-2027-main');c.nodes.find(n=>n.primary).date='2027-02-30';
 assert.throws(()=>validateCatalog(d),/data\/calls\/2027\/icc-2027-main\.yml:.*date-only node/s);
});
test('independent contributor edits need no shared manifest or generated-file edit',t=>{
 const {root,write}=fixture(t),first=loadCatalog(root);
 write('venues/wireless/new.yml',{id:'new',kind:'conference',primaryArea:'wireless'});
 write('calls/2027/new-2027.yml',{id:'new-2027',venueId:'new',kind:'conference',year:2027});
 const next=loadCatalog(root);assert.equal(next.venues.length,first.venues.length+1);assert.equal(next.calls.length,first.calls.length+1);
 assert(!fs.existsSync(path.join(root,'data/catalog.json')));
});
