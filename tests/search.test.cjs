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

test('curated Chinese equivalents and incomplete English names find the same venues',()=>{
  assert.deepEqual(ids(find({query:'无线通讯'})),ids(find({query:'无线通信'})));
  assert.deepEqual(ids(find({query:'波束赋形'})),ids(find({topics:['mimo']})));
  assert(find({query:'Wireless Commun'}).some(v=>v.id==='twc'));
});
test('technical abbreviations, full names and Chinese phrases map to explicit topics',()=>{
  for(const [topic,queries] of [
    ['navigation-pnt',['PNT','GNSS','SOP','SoOP','机会信号定位','机会信号定位导航授时','Signals of Opportunity','Positioning, Navigation and Timing']],
    ['isac',['ISAC','Integrated Sensing and Communication']],
    ['ris',['RIS','IRS','智能反射面','Reconfigurable Intelligent Surface']],
    ['edge-cloud',['MEC','Multi-access Edge Computing','移动边缘计算']],
    ['distributed-learning',['FL','Federated Learning']]
  ])for(const query of queries){
    assert.deepEqual(C.parseVenueQuery(query,data.topics).topics,[topic],query);
    assert.deepEqual(ids(find({query})),ids(find({topics:[topic]})),query);
  }
  assert.equal(data.topics.find(t=>t.id==='navigation-pnt').terms.find(t=>t.short==='PNT').label,'定位、导航与授时');
  assert.equal(C.parseVenueQuery('GNSSion SOPers',data.topics).topics.length,0);
});
test('English spelling mistakes and letter swaps produce separate correctable suggestions',()=>{
  for(const query of ['wirelesss','wirelss','wrieless','commmunications']){
    const rows=C.suggestVenues(data.venues,{query,venueKind:'journal',taxonomy:data.topics});
    assert(rows.length>0,query);assert(rows.length<=6);
    for(const {item,match}of rows){
      let corrected=query;for(const change of match.changes)corrected=C.replaceSearchWord(corrected,change.from,change.to,data.topics);
      assert(find({query:corrected}).some(v=>v.id===item.id),item.id+' '+corrected);
      assert(!find({query}).some(v=>v.id===item.id));
    }
  }
  assert.equal(C.suggestVenues(data.venues,{query:'TCW',venueKind:'journal',taxonomy:data.topics})[0].item.id,'twc');
  assert.equal(C.suggestVenues(data.venues,{query:'TWC',taxonomy:data.topics}).length,0);
});
test('near matches preserve indexing, ranks, topics, venue kind and archive scope',()=>{
  const filters={query:'SCI 一区 wirelss',venueKind:'journal',taxonomy:data.topics,topics:['mimo']};
  const allowed=new Set(ids(find({...filters,query:'SCI 一区'})));
  const suggestions=C.suggestVenues(data.venues,filters);assert(suggestions.length);
  assert(suggestions.every(row=>allowed.has(row.item.id)));
  assert.equal(C.suggestVenues(data.venues,{...filters,topics:['cryptography']}).length,0);
  assert.equal(C.suggestVenues(data.venues,{query:'1536-1277',taxonomy:data.topics}).length,0);
  assert.equal(C.suggestVenues(data.venues,{query:'"wireles"',taxonomy:data.topics}).length,0);
  assert.equal(C.suggestVenues(data.venues,{query:'无线通迅',taxonomy:data.topics}).length,0);
});
test('correcting a typo preserves structured conditions, quoted literals and surrounding text',()=>{
  const query='SCI，中科院一区 wireles "wireles" RIS';
  const corrected=C.replaceSearchWord(query,'wireles','Wireless',data.topics);
  assert.equal(corrected,'SCI，中科院一区 Wireless "wireles" RIS');
  assert.deepEqual(C.parseVenueQuery(corrected,data.topics).grades,['cas:1']);
  assert.deepEqual(C.parseVenueQuery(corrected,data.topics).topics,['ris']);
  assert.equal(C.replaceSearchWord('SCI PNT','PNT','GPS',data.topics),'SCI PNT');
});
test('exact venue names precede summary-only matches while explicit sorts are respected',()=>{
  const base={kind:'journal',areas:['wireless'],topics:['mimo'],catalogStatus:'current'};
  const rows=[{...base,id:'summary',short:'AAA',nameEn:'Another Journal',summary:'TWC related work'},
    {...base,id:'twc',short:'TWC',nameEn:'Wireless Communications',summary:''}];
  assert.deepEqual(C.filterVenues(rows,{query:'TWC',sort:'auto'}).map(v=>v.id),['twc','summary']);
  assert.deepEqual(C.filterVenues(rows,{query:'TWC',sort:'name'}).map(v=>v.id),['summary','twc']);
  assert.equal(find({query:'MWCL'})[0].id,'mwtl');
});
test('suggestions respect concrete deadline windows and a CFP own topic selection',()=>{
  const now=Date.parse('2026-10-23T00:00:00+08:00');
  const call={...data.calls.find(c=>c.id==='jsac-flexible-2026'),topics:['mimo'],nodes:[{id:'paper',type:'paper',primary:true,precision:'date',date:'2026-11-27'}]};
  const dated={query:'SCI Commnications',taxonomy:data.topics,window:'custom',daysFrom:'30',daysTo:'40',calls:[call],now};
  assert.equal(C.suggestCalls([call],data.venues,{...dated,topics:['mimo']},now).length,1);
  assert.equal(C.suggestCalls([call],data.venues,{...dated,topics:['optical-networks']},now).length,0);
  const matches=C.suggestVenues(data.venues,dated);assert.deepEqual(matches.map(row=>row.item.id),['jsac']);
  assert.equal(C.suggestVenues(data.venues,{...dated,topics:['optical-networks']}).length,0);
  assert.equal(C.suggestVenues(data.venues,{...dated,daysFrom:'40',daysTo:'30'}).length,0);
});
test('a known short name filtered out by a grade is never changed into another venue',()=>{
  assert.equal(find({query:'TWC',grades:['cas:4']}).length,0);
  assert.equal(C.suggestVenues(data.venues,{query:'TWC',grades:['cas:4'],taxonomy:data.topics}).length,0);
  assert.equal(C.suggestVenues(data.venues,{query:'TCW',favoriteOnly:true,favorites:['venue:twc'],taxonomy:data.topics}).length,1);
  assert.equal(C.suggestVenues(data.venues,{query:'TCW',favoriteOnly:true,favorites:[],taxonomy:data.topics}).length,0);
});
test('long or quoted queries do not enable unbounded spelling comparisons',()=>{
  for(const query of ['x'.repeat(1000),Array(20).fill('wirelss').join(' '),'"wirelss"','SCI Q5 1536-1277'])assert.equal(C.suggestVenues(data.venues,{query,taxonomy:data.topics}).length,0);
});
