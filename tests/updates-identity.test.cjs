const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assertCandidateIdentity}=require('../scripts/updates/identity.cjs');

const journalA={id:'journal-a',kind:'journal',nameEn:'Journal One',aliases:['J1'],url:'https://publisher.example/journal-a',primaryArea:'cs'};
const journalB={id:'journal-b',kind:'journal',nameEn:'Journal One',aliases:['J1'],url:'https://publisher.example/journal-b',primaryArea:'cs'};
const callA={id:'journal-a-2027-special',kind:'journal',venueId:'journal-a',year:2027,title:'2027 Special Issue'};
const records=new Map([[journalA.id,journalA],[journalB.id,journalB],[callA.id,callA]]);

test('identity update follows stable catalog ID across name and alias variations',()=>{
 assert.equal(assertCandidateIdentity({id:'journal-a',kind:'journal',nameEn:'Localized Journal Name',aliases:['Different alias']},records),journalA);
});

test('same names and shared publisher domains do not merge two catalog records',()=>{
 assert.equal(assertCandidateIdentity({id:'journal-b',kind:'journal',nameEn:'Journal One',url:'https://publisher.example/journal-a'},records),journalB);
 assert.throws(()=>assertCandidateIdentity({id:'new-journal',kind:'journal',nameEn:'Journal One',url:'https://publisher.example/journal-a'},records),/未知维护实体/);
});

test('same meeting or journal name cannot move a call to another parent or year',()=>{
 assert.throws(()=>assertCandidateIdentity({id:callA.id,kind:'journal',recordType:'call',venueId:'journal-b',year:2027},records),/所属载体/);
 assert.throws(()=>assertCandidateIdentity({id:callA.id,kind:'journal',recordType:'call',venueId:'journal-a',year:2026},records),/届次/);
});
