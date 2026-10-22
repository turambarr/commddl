/* CommDDL domain logic: shared by the build, browser, and business-rule tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CommCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = 86400000;
  const SUBMISSION_TYPES = new Set(['abstract', 'paper', 'registration', 'proposal', 'results']);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  function validDate(value) {
    if (!datePattern.test(value || '')) return false;
    const d = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function dateInZone(value, zone = 'Asia/Shanghai') {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  }
  function parseInstant(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value || '')) return null;
    if (!validDate(value.slice(0, 10))) return null;
    const [, h, m, s] = value.match(/T(\d{2}):(\d{2}):(\d{2})/);
    if (+h > 23 || +m > 59 || +s > 59) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function countdown(instant, now = Date.now()) {
    const ms = parseInstant(instant);
    if (ms === null) return null;
    if (ms <= now) return '已截止';
    let seconds = Math.floor((ms - now) / 1000);
    const days = Math.floor(seconds / 86400); seconds %= 86400;
    const hours = Math.floor(seconds / 3600); seconds %= 3600;
    const minutes = Math.floor(seconds / 60); seconds %= 60;
    return (days ? days + '天 ' : '') + [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':');
  }
  function primaryNode(call) {
    return (call.nodes || []).find(n => n.primary) || (call.nodes || []).find(n => SUBMISSION_TYPES.has(n.type)) || null;
  }
  function calendarDate(node, zone = 'Asia/Shanghai') {
    if (!node) return null;
    if (node.precision === 'instant') {
      const ms = parseInstant(node.instant);
      return ms === null ? null : dateInZone(ms, zone);
    }
    return node.precision === 'date' && validDate(node.date) ? node.date : null;
  }
  function stateOf(call, now = Date.now(), zone = 'Asia/Shanghai') {
    if (['cancelled', 'conflict', 'closed'].includes(call.status)) return { code: call.status, days: null };
    if (call.verification === 'pending') return { code: 'pending', days: null };
    if (call.status === 'rolling') return { code: 'rolling', days: null };
    const node = primaryNode(call);
    if (!node) return { code: 'pending', days: null };
    const date = calendarDate(node, zone);
    if (!date) return { code: 'pending', days: null };
    const today = dateInZone(now, zone);
    const days = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY);
    if (node.precision === 'instant' && parseInstant(node.instant) < now) return { code: 'closed', days };
    if (node.precision === 'date' && days < 0) return { code: 'past-date', days };
    for (const prerequisiteId of node.requires || []) {
      const prerequisite = call.nodes.find(n => n.id === prerequisiteId);
      if (!prerequisite) return { code: 'conflict', days };
      const prerequisiteDate = calendarDate(prerequisite, zone);
      if ((prerequisite.precision === 'instant' && parseInstant(prerequisite.instant) < now) ||
          (prerequisite.precision === 'date' && prerequisiteDate < today)) return { code: 'restricted', days };
    }
    return { code: node.precision === 'instant' ? 'upcoming' : 'date', days };
  }
  const normal = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\-–_]/g, '');
  function searchMatches(query, ...fields) {
    const words = [...String(query || '').matchAll(/"([^"]+)"|'([^']+)'|([^\s,，;；]+)/g)].map(m => m[1] || m[2] || m[3]);
    const texts = fields.flat(Infinity).filter(Boolean).map(normal);
    return words.every(word => texts.some(text => text.includes(normal(word))));
  }
  function cleanTopics(ids, topics, area = '') {
    // Parent areas organize the picker; they must not invalidate a cross-area selection.
    const allowed = new Set((topics || []).map(t => t.id));
    return [...new Set((Array.isArray(ids) ? ids : []).filter(id => allowed.has(id)))];
  }
  function topicMatches(ids, selected) {
    return !selected?.length || selected.some(id => (ids || []).includes(id));
  }
  function topicSearch(ids, taxonomy = []) {
    return taxonomy.filter(t => (ids || []).includes(t.id)).flatMap(t => [t.label, t.aliases]);
  }
  function deadlineRange(filters = {}) {
    if (filters.window === 'custom') {
      const from=String(filters.daysFrom??''),to=String(filters.daysTo??'');
      const valid=[from,to].every(x=>x===''||/^\d{1,5}$/.test(x)&&+x<=36500);
      const min=from===''?0:+from,max=to===''?Infinity:+to;
      return {active:from!==''||to!=='',valid:valid&&min<=max,min,max};
    }
    const active=['7','30','90','180'].includes(String(filters.window));
    return {active,valid:true,min:0,max:active?+filters.window:Infinity};
  }
  function deadlineMatches(call, filters = {}, now = Date.now(), zone = 'Asia/Shanghai') {
    const range=deadlineRange(filters);
    if(!range.valid)return false;
    if(!range.active)return true;
    const st=stateOf(call,now,zone);
    return ['upcoming','date','restricted'].includes(st.code)&&st.days>=range.min&&st.days<=range.max;
  }
  function isBuptImportant(venue) {
    return venue?.kind==='conference'&&(venue.assessments||[]).some(a=>a.system==='bupt-ict-2018');
  }
  function inheritsConferenceList(call) {
    return call.kind==='conference'&&call.inheritsVenueEvaluation!==false&&!['demo','poster','short'].includes(call.submissionCategory);
  }
  function venueActivity(venue, calls, now = Date.now(), zone = 'Asia/Shanghai', filters = {}) {
    filters=filters.parsed?filters:resolveFilters(filters);
    const rows=(calls||[]).filter(c=>c.venueId===venue.id&&(venue.kind==='journal'?['special','series'].includes(c.kind):c.kind==='conference'&&!['demo','poster','short'].includes(c.submissionCategory))&&deadlineMatches(c,filters,now,zone)&&directionMatches(c.areas||venue.areas,c.primaryArea||(c.areas||venue.areas||[])[0],filters)&&topicMatches(c.topics||venue.topics,filters.topics));
    const dated=rows.map(call=>({call,date:calendarDate(primaryNode(call),zone),state:stateOf(call,now,zone)})).filter(x=>x.date&&x.call.verification==='verified');
    for(const codes of [['upcoming','date'],['restricted']]) {
      const future=dated.filter(x=>codes.includes(x.state.code)).sort((a,b)=>a.date.localeCompare(b.date));
      if(future.length)return future[0].call;
    }
    const rolling=rows.find(c=>c.verification==='verified'&&c.status==='rolling');if(rolling)return rolling;
    const announced=rows.filter(c=>c.verification==='verified'&&!calendarDate(primaryNode(c),zone)&&!['cancelled','conflict','closed'].includes(c.status)&&validDate((c.eventStart||c.eventDates||'').slice(0,10))&&(c.eventStart||c.eventDates).slice(0,10)>=dateInZone(now,zone)).sort((a,b)=>(a.eventStart||a.eventDates).localeCompare(b.eventStart||b.eventDates));
    if(announced.length)return announced[0];
    const past=dated.filter(x=>['closed','past-date'].includes(x.state.code)).sort((a,b)=>b.date.localeCompare(a.date));if(past.length)return past[0].call;
    return rows.sort((a,b)=>(b.eventStart||b.eventDates||b.id).localeCompare(a.eventStart||a.eventDates||a.id))[0]||null;
  }
  function venueDeadlineOrder(venue,calls,now,zone,filters) {
    const call=venueActivity(venue,calls,now,zone,filters);if(!call)return [3,'9999'];
    const state=stateOf(call,now,zone),date=calendarDate(primaryNode(call),zone)||'9999';
    return [['upcoming','date','restricted'].includes(state.code)?0:state.code==='rolling'?1:['closed','past-date'].includes(state.code)?2:3,date];
  }
  function indexingStatus(venue) {
    if (venue.kind !== 'journal') return 'not-applicable';
    const ix = venue.indexing;
    if (['verified','reported'].includes(ix?.status) && ['SCIE','ESCI','SSCI','AHCI'].includes(ix.value)) return ix.value;
    return ix?.status === 'unlisted' ? 'unlisted' : 'pending';
  }
  function indexMatches(venue, index = '') {
    if (!index) return true;
    if (['EI','CSCD','Scopus','北大核心','CSTPCD'].includes(index)) return venue.kind==='journal'&&(venue.otherIndexes||[]).some(e=>e.value===index&&['verified','reported'].includes(e.status));
    return indexingStatus(venue)===index;
  }
  const areaSearch = {
    wireless:['无线通信','无线'], signal:['信号处理、感知与控制','信号处理'],
    theory:['信息论与编码','信息论'], network:['网络与移动系统','计算机网络'],
    optical:['光通信与光子学','光通信'], rf:['电磁、射频与电子技术','射频','电磁'],
    space:['空天地通信与导航','空天地通信','卫星通信'], iot:['物联网与车联网','物联网','车联网'],
    ai:['人工智能与信息处理','人工智能']
  };
  const areaNames = Object.fromEntries(Object.entries(areaSearch).map(([id, names]) => [id, names[0]]));
  function parseVenueQuery(query = '', taxonomy = []) {
    const indexes=[],grades=[],labels=[];
    let text=String(query).normalize('NFKC');
    const normalized=text, tokens=[], literals=[];
    if(!text.trim())return {text:'',indexes,grades,labels,buptImportant:false,areas:[],topics:[],tokens,normalized};
    text=text.replace(/"[^"]*"|'[^']*'/g,(value,start)=>{literals.push({value,start});return ' '.repeat(value.length);});
    function take(pattern,kind,convert,label) {
      text=text.replace(pattern,(...args)=>{
        const start=args.at(-2), raw=args[0], value=convert(...args);
        tokens.push({kind,value,start,end:start+raw.length});
        labels.push(label(value));
        if(kind==='index')indexes.push(value);else if(kind==='grade')grades.push(value);
        return ' '.repeat(raw.length);
      });
    }
    let buptImportant=false;
    take(/(?:BUPT|北邮)\s*重要(?:会议)?/gi,'historical',()=>{buptImportant=true;return 'bupt';},()=> 'BUPT重要');
    take(/\b(SCIE|SCI|ESCI|EI|CSCD|SCOPUS)\b(?:收录)?(?:期刊|论文)?/gi,'index',(_,value)=>({SCI:'SCIE',SCOPUS:'Scopus'}[value.toUpperCase()]||value.toUpperCase()),value=>value==='SCIE'?'SCI / SCIE':value);
    take(/北大核心|中文核心|中国科技核心|科技核心|\bCSTPCD\b/gi,'index',token=>/科技|cstpcd/i.test(token)?'CSTPCD':'北大核心',value=>value==='CSTPCD'?'科技核心':value);
    const numbers={'一':'1','二':'2','三':'3','四':'4'};
    take(/新锐(?:分区)?\s*([一二三四1-4])\s*区/g,'grade',(_,v)=>'xinrui:'+(numbers[v]||v),v=>'新锐 '+v.split(':')[1]+'区');
    take(/(?:中科院(?:大类)?\s*)?([一二三四1-4])\s*区/g,'grade',(_,v)=>'cas:'+(numbers[v]||v),v=>'中科院大类 '+v.split(':')[1]+'区');
    take(/(?:\bJCR\s*)?\bQ([1-4])\b/gi,'grade',(_,v)=>'jcr:Q'+v,v=>'JCR '+v.split(':')[1]);
    take(/\b(CCF|ICORE|CORE)\s*[:：]?\s*(A\*|[ABC])(?=\s|$|[，,;；])/gi,'grade',(_,sys,v)=>(sys.toUpperCase()==='CCF'?'ccf':'core')+':'+v.toUpperCase(),v=>v.replace('ccf:','CCF ').replace('core:','ICORE '));
    take(/(?:\bCIC|中国通信学会|通信学会)\s*[:：]?\s*T([1-3])\b/gi,'grade',(_,v)=>'cic:T'+v,v=>'通信学会 '+v.split(':')[1]);
    take(/(?:\bCIE|中国电子学会|电子学会)\s*[:：]?\s*T([1-3])\b/gi,'grade',(_,v)=>'cie:T'+v,v=>'电子学会 '+v.split(':')[1]);
    const phrases=new Map();
    const add=(phrase,kind,value,label)=>{const key=phrase.normalize('NFKC').toLowerCase();const previous=phrases.get(key);if(!previous)phrases.set(key,{phrase,kind,value,label});else if(previous.kind!=='area'&&(previous.kind!==kind||previous.value!==value))phrases.set(key,{...previous,ambiguous:true});};
    for(const [id,names] of Object.entries(areaSearch))for(const name of names)add(name,'area',id,areaNames[id]);
    const broad=new Set(['通信','网络','信息','理论','信号','控制','感知','安全','学习','编码','估计','同步','AI','ML','SP','IT','RF']);
    for(const topic of taxonomy){
      add(topic.label,'topic',topic.id,topic.label);
      for(const alias of topic.aliases||[])for(const word of alias.split(/\s+/))if(!broad.has(word)&&(/^[\u3400-\u9fff]{2,}$/.test(word)||/^[A-Z][A-Z0-9-]{1,}$/.test(word)))add(word,'topic',topic.id,topic.label);
    }
    const selectedAreas=[],selectedTopics=[];
    for(const item of [...phrases.values()].filter(x=>!x.ambiguous).sort((a,b)=>b.phrase.length-a.phrase.length)){
      const escaped=item.phrase.normalize('NFKC').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const pattern=new RegExp('(?<![^\\s,，;；])'+escaped+'(?![^\\s,，;；])','gi');
      take(pattern,item.kind,()=>item.value,()=>item.label);
    }
    for(const token of tokens){if(token.kind==='area')selectedAreas.push(token.value);if(token.kind==='topic')selectedTopics.push(token.value);}
    if(indexes.length||grades.length)text=text.replace(/(?:期刊|论文)/g,value=>' '.repeat(value.length));
    for(const literal of literals)text=text.slice(0,literal.start)+literal.value+text.slice(literal.start+literal.value.length);
    return {text:text.replace(/^[\s,，;；]+|[\s,，;；]+$/g,'').trim(),indexes:[...new Set(indexes)],grades:[...new Set(grades)],labels:[...new Set(labels)],buptImportant,areas:[...new Set(selectedAreas)],topics:[...new Set(selectedTopics)],tokens,normalized};
  }
  function removeQueryTerms(query, kind, value, taxonomy = []) {
    const parsed=parseVenueQuery(query,taxonomy);
    const matches=parsed.tokens.filter(t=>t.kind===kind&&(value===undefined||t.value===value||(kind==='grade'&&t.value.startsWith(value+':')))).sort((a,b)=>b.start-a.start);
    let text=parsed.normalized;
    for(const match of matches)text=text.slice(0,match.start)+' '+text.slice(match.end);
    return text.replace(/\s+/g,' ').replace(/^[\s,，;；]+|[\s,，;；]+$/g,'').trim();
  }
  function resolveFilters(filters = {}) {
    const parsed=parseVenueQuery(filters.query,filters.taxonomy);
    return {...filters,parsed,areas:[...new Set([filters.area,...parsed.areas].filter(Boolean))],topics:[...new Set([...(filters.topics||[]),...parsed.topics])],indexes:[...new Set([filters.index,...parsed.indexes].filter(Boolean))],grades:[...new Set([...(filters.grades?.length?filters.grades:filters.grade?[filters.grade]:[]),...parsed.grades])],historical:filters.historical||parsed.buptImportant};
  }
  function directionMatches(areas, primary, filters) {
    return !filters.areas.length||filters.areas.some(area=>filters.primaryOnly?primary===area:(areas||[]).includes(area));
  }
  function indexesMatch(venue, filters) {
    return !filters.indexes.length||filters.indexes.some(index=>indexMatches(venue,index));
  }
  function venueIdentifiers(venue) {
    const records=[venue.indexing,...(venue.evaluations||[])].filter(e=>['verified','reported'].includes(e?.status));
    return [venue.issn,venue.eissn,...records.flatMap(e=>[e.issn,e.eissn])];
  }
  function cleanGrades(values, kind) {
    const choices={jcr:['Q1','Q2','Q3','Q4','N'],cas:['1','2','3','4','N'],xinrui:['1','2','3','4'],ccf:['A','B','C','N'],core:['A*','A','B','C','N'],cie:['T1','T2','T3'],cic:['T1','T2','T3']};
    return [...new Set(values)].filter(value=>{const [sys,rank]=String(value).split(':');return value===sys+':'+rank&&choices[sys]?.includes(rank)&&!(kind==='conference'&&['jcr','cas','xinrui','cie','cic'].includes(sys))&&!(kind==='journal'&&sys==='core');});
  }
  function isRankEvidence(e) {
    const values={jcr:['Q1','Q2','Q3','Q4'],cas:['1','2','3','4'],xinrui:['1','2','3','4'],ccf:['A','B','C'],core:['A*','A','B','C'],cie:['T1','T2','T3'],cic:['T1','T2','T3']};
    return !!e&&['verified','reported'].includes(e.status)&&values[e.system]?.includes(String(e.value));
  }
  function displayEvaluations(venue) {
    const latest=new Map();
    for(const e of venue.evaluations||[])if(isRankEvidence(e)&&(!latest.has(e.system)||(e.year||0)>(latest.get(e.system).year||0)))latest.set(e.system,e);
    return [...latest.values()];
  }
  function evaluationMatches(venue, grade = '') {
    if (!grade || (Array.isArray(grade) && !grade.length)) return true;
    const records = venue.evaluations || [], displayed=displayEvaluations(venue);
    const selected = Array.isArray(grade) ? grade : [grade];
    const groups = new Map();
    for (const item of selected) {
      if (item === 'pending') {
        if (!records.some(e => ['pending','scope-review','unresolved','not-matched'].includes(e.status))) return false;
        continue;
      }
      const [system, value] = item.split(':');
      if (!groups.has(system)) groups.set(system, []);
      groups.get(system).push(value);
    }
    return [...groups].every(([system, values]) => displayed.some(e=>e.system===system&&values.includes(String(e.value))) || values.includes('N')&&records.some(e=>e.system===system&&e.status==='unlisted'));
  }
  function filterVenues(venues, filters = {}) {
    filters=resolveFilters(filters);
    const favorites = new Set(filters.favorites || []), parsed=filters.parsed,range=deadlineRange(filters),now=filters.now??Date.now();
    return venues.filter(v =>
      (v.catalogScope !== 'archive' || filters.includeArchived || (filters.historical||parsed.buptImportant)&&isBuptImportant(v) || (filters.favoriteOnly && favorites.has('venue:' + v.id))) &&
      (!filters.venueKind || v.kind === filters.venueKind) && evaluationMatches(v, filters.grades?.length ? filters.grades : filters.grade) &&
      (!filters.catalogStatus || v.catalogStatus === filters.catalogStatus) &&
      indexesMatch(v,filters) &&
      (range.valid&&(!range.active||!!venueActivity(v,filters.calls,now,filters.zone,filters))) &&
      directionMatches(v.areas,v.primaryArea||v.areas[0],filters) && topicMatches(v.topics, filters.topics) &&
      (!filters.historical || isBuptImportant(v)) &&
      (!filters.favoriteOnly || favorites.has('venue:' + v.id)) &&
      (!filters.journalType || filters.journalType === 'all' || v.publicationType === filters.journalType) &&
      searchMatches(parsed.text, v.short, v.nameEn, v.nameZh, v.aliases, venueIdentifiers(v), v.summary, topicSearch(v.topics, filters.taxonomy))
    ).sort((a,b) => {if(filters.calls&&filters.sort!=='name'){const x=venueDeadlineOrder(a,filters.calls,now,filters.zone,filters),y=venueDeadlineOrder(b,filters.calls,now,filters.zone,filters);const order=x[0]-y[0]||(x[0]===2?y[1].localeCompare(x[1]):x[1].localeCompare(y[1]));if(order)return order;}return (filters.sort === 'name' ? 0 : ({current:0,'needs-review':1,'historical-only':2}[a.catalogStatus] - {current:0,'needs-review':1,'historical-only':2}[b.catalogStatus])) || a.short.localeCompare(b.short);});
  }
  function filterCalls(calls, venues, filters, now = Date.now()) {
    filters=resolveFilters(filters);
    const byId = new Map(venues.map(v => [v.id, v])), parsed=filters.parsed;
    const favorites = new Set(filters.favorites || []);
    return calls.filter(call => {
      const v = byId.get(call.venueId);
      if (!v || (v.catalogScope === 'archive' && !filters.includeArchived && !((filters.historical||parsed.buptImportant)&&isBuptImportant(v)) && !(filters.favoriteOnly && (favorites.has('venue:' + v.id) || favorites.has('call:' + call.id))))) return false;
      const selectedGrades=filters.grades?.length?filters.grades:filters.grade;
      const noInheritedGrade=call.kind==='workshop'||call.inheritsVenueEvaluation===false||['demo','poster','short'].includes(call.submissionCategory);
      if(!indexesMatch(v,filters)||!evaluationMatches(v,selectedGrades))return false;
      if(noInheritedGrade&&(parsed.grades.length||selectedGrades?.length))return false;
      const st = stateOf(call, now, filters.zone);
      if(filters.showUndated===false&&!filters.favoriteOnly&&st.code==='pending')return false;
      if (!filters.showPast && ['closed', 'past-date', 'cancelled'].includes(st.code)) return false;
      if (filters.kind && filters.kind !== 'all' && call.kind !== filters.kind) return false;
      if (!directionMatches(call.areas||v.areas,call.primaryArea||(call.areas||v.areas||[])[0],filters)) return false;
      const topics = call.topics || v.topics || [];
      if (!topicMatches(topics, filters.topics)) return false;
      if ((filters.historical||parsed.buptImportant) && (!inheritsConferenceList(call) || !isBuptImportant(v))) return false;
      if (filters.favoriteOnly && !favorites.has('call:' + call.id) && !favorites.has('venue:' + v.id)) return false;
      if (!deadlineMatches(call,filters,now,filters.zone)) return false;
      return searchMatches(parsed.text, call.title, call.titleEn, call.tags, call.summary, v.short, v.nameEn, v.nameZh, v.aliases, venueIdentifiers(v), topicSearch(topics, filters.taxonomy));
    }).sort((a, b) => {
      const aDate = calendarDate(primaryNode(a), filters.zone) || '9999';
      const bDate = calendarDate(primaryNode(b), filters.zone) || '9999';
      if (filters.sort === 'name') return byId.get(a.venueId).short.localeCompare(byId.get(b.venueId).short);
      return aDate.localeCompare(bDate) || a.id.localeCompare(b.id);
    });
  }
  function escapeICS(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }
  function foldLine(line) {
    const encoder = new TextEncoder();
    const lines = []; let current = ''; let size = 0;
    for (const char of line) {
      const bytes = encoder.encode(char).length;
      if (size + bytes > 75) { lines.push(current); current = ' '; size = 1; }
      current += char; size += bytes;
    }
    lines.push(current); return lines.join('\r\n');
  }
  const icsUTC = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  function eligibleNodes(calls, includeDateOnly) {
    const result = [];
    for (const call of calls) {
      if (call.verification !== 'verified' || call.status === 'conflict') continue;
      for (const node of call.nodes || []) {
        if (!SUBMISSION_TYPES.has(node.type)) continue;
        if (node.precision === 'instant' && parseInstant(node.instant) !== null) result.push({ call, node });
        else if (includeDateOnly && node.precision === 'date' && validDate(node.date)) result.push({ call, node });
      }
    }
    return result;
  }
  function createICS(calls, venues, options = {}) {
    const map = new Map(venues.map(v => [v.id, v]));
    const generated = options.generatedAt || new Date().toISOString();
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CommDDL//Communications Calendar//ZH', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + escapeICS(options.name || 'CommDDL 通信投稿日历')];
    for (const {call, node} of eligibleNodes(calls, options.includeDateOnly === true)) {
      const v = map.get(call.venueId);
      const dateOnly = node.precision === 'date';
      const note = dateOnly ? '日期提示：官网未明确具体钟点或时区，请在投稿前核对官方系统关闭时间。' : '请同时核对官方投稿入口。';
      const prerequisite = (node.requires || []).length ? '\n需先完成摘要或注册等前置步骤。' : '';
      lines.push('BEGIN:VEVENT', 'UID:' + call.id + '-' + node.id + '@commddl', 'DTSTAMP:' + icsUTC(generated), 'LAST-MODIFIED:' + icsUTC(call.updatedAt || generated), 'SEQUENCE:' + (node.revision || 0));
      if (dateOnly) {
        lines.push('DTSTART;VALUE=DATE:' + node.date.replace(/-/g, ''));
        const next = new Date(Date.parse(node.date + 'T00:00:00Z') + DAY).toISOString().slice(0, 10);
        lines.push('DTEND;VALUE=DATE:' + next.replace(/-/g, ''));
      } else { lines.push('DTSTART:' + icsUTC(node.instant)); }
      if (call.status === 'cancelled') lines.push('STATUS:CANCELLED');
      lines.push('SUMMARY:' + escapeICS((v ? v.short + ' · ' : '') + call.title + ' · ' + node.label + (dateOnly ? '（日期提示）' : '')),
        'DESCRIPTION:' + escapeICS(note + prerequisite + '\n' + (call.notes || '') + '\n来源：' + (node.sourceUrl || call.sourceUrl)),
        'URL:' + (node.sourceUrl || call.sourceUrl), 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR'); return lines.map(foldLine).join('\r\n') + '\r\n';
  }
  function cleanFavorites(value, data) {
    if (!value || value.version !== 1 || !Array.isArray(value.items) || value.items.length > 1000) throw new Error('请选择 CommDDL 导出的收藏备份文件。');
    const allowed = new Set([...data.calls.map(c => 'call:' + c.id), ...data.venues.map(v => 'venue:' + v.id)]);
    return [...new Set(value.items.filter(x=>typeof x==='string').map(x=>{if(Object.hasOwn(data.favoriteAliases||{},x))return data.favoriteAliases[x];if(x.startsWith('call:')&&Object.hasOwn(data.callAliases||{},x.slice(5)))return 'call:'+data.callAliases[x.slice(5)];return x;}).filter(x=>allowed.has(x)))];
  }
  return { validDate, dateInZone, parseInstant, countdown, primaryNode, calendarDate, stateOf, deadlineRange, deadlineMatches, isBuptImportant, inheritsConferenceList, venueActivity, indexMatches, parseVenueQuery, removeQueryTerms, resolveFilters, searchMatches, cleanTopics, topicMatches, indexingStatus, cleanGrades, isRankEvidence, displayEvaluations, evaluationMatches, filterVenues, filterCalls, escapeICS, foldLine, eligibleNodes, createICS, cleanFavorites };
});
