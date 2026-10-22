const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/core.js');
const data=require('../scripts/catalog.cjs').loadCatalog();
const ids=rows=>rows.map(row=>row.id).sort();
const find=filters=>C.filterVenues(data.venues,{taxonomy:data.topics,...filters});

test('direction-aware search and explicit journal filters select identical IDs',()=>{
  const expected=ids(find({venueKind:'journal',index:'SCIE',grades:['cas:1'],area:'wireless'}));
  assert(expected.includes('jsac'));assert(expected.includes('comst'));
  for(const query of ['SCI 一区 无线','SCI一区无线','sci，一区，无线','SCIE 中科院一区 无线通信'])assert.deepEqual(ids(find({venueKind:'journal',query})),expected,query);
});
test('ordinary names, quoted text and ambiguous words do not become guessed directions',()=>{
  const parsed=C.parseVenueQuery('SCI 一区 "无线通信"',data.topics);
  assert.deepEqual(parsed.areas,[]);assert.equal(parsed.text,'"无线通信"');
  for(const query of ['IEEE Transactions on Communications','无线通信学报','通信','网络','AI'])assert.deepEqual(C.parseVenueQuery(query,data.topics).areas,[],query);
  assert.equal(C.parseVenueQuery('"SCI"',data.topics).indexes.length,0);
});
test('topic aliases and explicit topic buttons use the same associations',()=>{
  for(const [query,topic] of [['RIS','ris'],['多天线','mimo'],['相干光通信','fiber']])assert.deepEqual(ids(find({query})),ids(find({topics:[topic]})),query);
  assert.equal(C.parseVenueQuery('RISers',data.topics).text,'RISers');
});
test('conditions from text and buttons use OR within a system and AND between systems',()=>{
  assert.deepEqual(ids(find({query:'SCI 一区 无线',grades:['cas:2']})),ids(find({index:'SCIE',area:'wireless',grades:['cas:1','cas:2']})));
  assert.deepEqual(ids(find({query:'SCI 一区',grades:['jcr:Q1']})),ids(find({index:'SCIE',grades:['cas:1','jcr:Q1']})));
});
test('removing one recognized condition preserves all other conditions and literal words',()=>{
  const q='SCI，中科院一区 RIS "无线通信"';
  const stripped=C.removeQueryTerms(q,'grade','cas',data.topics),parsed=C.parseVenueQuery(stripped,data.topics);
  assert.deepEqual(parsed.grades,[]);assert.deepEqual(parsed.indexes,['SCIE']);assert.deepEqual(parsed.topics,['ris']);assert.match(parsed.text,/"无线通信"/);
  const removed=C.parseVenueQuery(C.removeQueryTerms('SCI SCIE 一区 无线','index','SCIE',data.topics),data.topics);
  assert.deepEqual(removed.indexes,[]);assert.deepEqual(removed.grades,['cas:1']);assert.deepEqual(removed.areas,['wireless']);
});
test('journal ISSNs are searchable without accidental cross-field concatenation',()=>{
  for(const query of ['1536-1276','1558-2248','15361276'])assert.deepEqual(ids(find({query})),['twc'],query);
  assert(!C.searchMatches('abcd','ab','cd'));
  assert(C.searchMatches('ab cd','ab','cd'));
  assert(C.searchMatches('IEEE, TWC','IEEE','TWC'));
});
test('CFP search uses its own direction and topics rather than the mother journal scope',()=>{
  const call=data.calls.find(c=>c.id==='jsac-flexible-2026'),opts={taxonomy:data.topics,showPast:true};
  assert.equal(C.filterCalls([call],data.venues,{...opts,query:'光通信'}).length,0);
  assert.equal(C.filterCalls([call],data.venues,{...opts,query:'无线'}).length,1);
  assert.equal(C.filterCalls([call],data.venues,{...opts,query:'光网络与光互连'}).length,0);
});
test('a directory date window must match the actual CFP topics, not only the parent journal',()=>{
  const journal=data.venues.find(v=>v.id==='jsac'),call=data.calls.find(c=>c.id==='jsac-flexible-2026');
  const now=Date.parse('2026-10-23T00:00:00+08:00');
  const filters={query:'SCI 光网络与光互连',taxonomy:data.topics,window:'30',calls:[call],now,venueKind:'journal'};
  assert(journal.topics.includes('optical-networks'));assert(!call.topics.includes('optical-networks'));
  assert.equal(C.filterVenues([journal],filters).length,0);
  assert.equal(C.venueActivity(journal,[call],now,'Asia/Shanghai',{...filters,window:''}),null);
  assert.equal(C.filterVenues([journal],{...filters,query:'SCI 多天线'}).length,1);
});
