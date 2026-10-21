(function () {
  'use strict';
  const D = window.COMMDDL_DATA, C = window.CommCore;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL = value => /^https?:\/\//i.test(value || '') ? esc(value) : '#';
  const icons = {
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    globe:'<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="4" ry="8.5"/><path d="M3.5 12h17M5 7.5h14M5 16.5h14"/>',
    book:'<path d="M12 5.5C8 2.5 3 4 3 4v15s5-1.5 9 1.5c4-3 9-1.5 9-1.5V4s-5-1.5-9 1.5ZM12 5.5v15"/>',
    bookmark:'<path d="M6 4h12v17l-6-4-6 4Z"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
    upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
    rss:'<circle cx="5" cy="19" r="1"/><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/>',
    github:'<path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1 .5-2 1-2 4-.5 6-2 6-6 0-1.5-.5-2.5-1-3 .5-1.5 0-3 0-3s-2-.5-4 1a13 13 0 0 0-8 0C7 3.5 5 4 5 4s-.5 1.5 0 3c-.5.5-1 1.5-1 3 0 4 2 5.5 6 6-1 .5-1 2-1 2v4" transform="translate(-1,-1) scale(.95)"/>',
    external:'<path d="M14 3h7v7M21 3l-11 11M10 4H4v16h16v-6"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6ZM8 12l3 3 5-6"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M17 14h1M7 18h2M12 18h2"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
  function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); }); }
  const activeVenues = () => D.venues.filter(v=>v.catalogScope!=='archive');
  const venues = new Map(D.venues.map(v => [v.id, v]));
  const areaLabels = new Map(D.areas.map(a => [a.id, a.label]));
  const topicLabels = new Map(D.topics.map(t => [t.id, t.label]));
  let topicsExpanded = false, attributesExpanded = false;
  const callLabel = call => call.submissionCategory==='demo'?'演示论文':call.inheritsVenueEvaluation===false&&call.kind==='conference'?'独立分会':kindLabels[call.kind];
  const kindLabels = {all:'全部',conference:'会议主会',special:'期刊专题',workshop:'附属研讨会',series:'持续栏目',journal:'期刊'};
  const pageNames = {deadlines:'截稿日历',conferences:'会议目录',journals:'期刊目录',favorites:'我的关注',about:'来源与维护说明'};
  const headings = {
    deadlines:['通信投稿截止日历','按截止日期查看会议与期刊专题，跟踪下一次投稿机会。'],
    conferences:['通信会议目录','最新届次、投稿截止与举办时间，按主题和等级筛选。'],
    journals:['通信期刊目录','按主题、索引收录与分区查找期刊。'],
    favorites:['给下一篇论文，留一个位置','关注的会议、期刊与专题，汇成自己的投稿清单。'],
    about:['每一条信息，都有来处','查看分类、评价版本与核验来源。']
  };
  let storageWorks = true;
  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { storageWorks = false; return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageWorks = false; } }
  let favorites;
  try { favorites = new Set(C.cleanFavorites(load('commddl.favorites.v1', {version:1,items:[]}), D)); } catch { favorites = new Set(); }
  const prefs = load('commddl.preferences.v1', {});
  const zones = ['Asia/Shanghai','UTC','America/Los_Angeles','Europe/London'];
  const state = {view:'deadlines',area:'',primaryOnly:false,topics:[],kind:'all',query:'',window:'',daysFrom:'',daysTo:'',sort:'deadline',showUndated:false,showPast:false,historical:false,includeArchived:false,grades:[],grade:'',catalogStatus:'',index:'',layout:'list',zone:zones.includes(prefs.zone)?prefs.zone:'Asia/Shanghai',journalType:'all',month:C.dateInZone(Date.now()).slice(0,7)};
  let currentCalls = [], currentVenues = [], exportCalls = [], toastTimer;
  function readHash() {
    const [view, query = ''] = location.hash.slice(1).split('?');
    const p = new URLSearchParams(query);
    state.view = Object.hasOwn(pageNames, view) ? view : 'deadlines';
    if(zones.includes(p.get('zone')))state.zone=p.get('zone');
    state.area = areaLabels.has(p.get('area')) ? p.get('area') : '';
    state.primaryOnly=p.get('primary')==='1';
    state.topics = C.cleanTopics((p.get('topics') || '').split(','), D.topics, state.area);
    state.query = p.get('q') || '';
    state.index = ['SCIE','ESCI','EI','CSCD','Scopus','北大核心','CSTPCD'].includes(p.get('index')) ? p.get('index') : '';
    state.grade = Array.from($('grade-filter').options).some(o=>o.value===p.get('grade')) ? p.get('grade') : '';
    state.catalogStatus = ['', 'current','historical-only'].includes(p.get('status')) ? p.get('status') : '';

    state.kind = Object.hasOwn(kindLabels, p.get('kind')) ? p.get('kind') : 'all';
    state.grades=C.cleanGrades((p.get('ranks')||state.grade).split(','),directoryKind()).filter(r=>!r.endsWith(':N'));
    state.grade='';
    state.window = ['7','30','90','180','custom'].includes(p.get('within')) ? p.get('within') : '';
    state.daysFrom=state.window==='custom'?(p.get('from')||''):'';
    state.daysTo=state.window==='custom'?(p.get('to')||''):'';
    state.includeArchived = p.get('archive') === '1';
    state.showUndated=false;
    state.showPast = p.get('past') === '1'; state.historical = p.get('history') === '1';
    state.layout = p.get('layout') === 'calendar' ? 'calendar' : 'list';
    state.sort = p.get('sort') === 'name' ? 'name' : 'deadline';
    state.journalType = p.get('type') || 'all';
    if((directoryKind()==='conference'&&/^(jcr|cas):/.test(state.grade))||(directoryKind()==='journal'&&state.grade.startsWith('core:')))state.grade='';
    if(!isVenueView())state.catalogStatus='';
    if(directoryKind()==='conference')state.index='';
    if(state.index||state.grades.length)attributesExpanded=true;
    state.month = /^\d{4}-(0[1-9]|1[0-2])$/.test(p.get('month') || '') ? p.get('month') : C.dateInZone(Date.now(), state.zone).slice(0,7);
  }
  function syncHash() {
    const p = new URLSearchParams();
    if (state.includeArchived) p.set('archive','1');
    if (state.index) p.set('index',state.index);
    if (state.grades.length) p.set('ranks',state.grades.join(','));
    if (state.catalogStatus) p.set('status',state.catalogStatus);
    if (state.area) p.set('area',state.area);
    if (state.primaryOnly) p.set('primary','1');
    if (state.topics.length) p.set('topics',state.topics.join(','));
    if (state.query) p.set('q',state.query);
    if (state.kind !== 'all') p.set('kind',state.kind);
    if (state.window) {p.set('within',state.window);p.set('zone',state.zone);}
    if(state.window==='custom'){if(state.daysFrom)p.set('from',state.daysFrom);if(state.daysTo)p.set('to',state.daysTo);}
    if (state.showUndated) p.set('undated','1');
    if (state.showPast) p.set('past','1');
    if (state.historical) p.set('history','1');
    if (state.layout === 'calendar') {p.set('layout','calendar');p.set('month',state.month);}
    if (state.sort === 'name') p.set('sort','name');
    if (state.journalType !== 'all') p.set('type',state.journalType);
    history.replaceState(null,'','#' + state.view + (p.size ? '?' + p : ''));
  }
  function notify(text) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'),3200); }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('sidebar-backdrop').classList.remove('visible'); $('mobile-menu').setAttribute('aria-expanded','false'); }
  function navigate(view) { state.view=view;state.kind='all';state.query='';state.window='';state.daysFrom='';state.daysTo='';state.showUndated=false;state.historical=false;state.includeArchived=false;state.grades=[];state.grade='';state.catalogStatus='';state.index='';state.journalType='all';state.layout='list';closeSidebar();syncHash();render();window.scrollTo({top:0,behavior:'instant'}); }
  function toggleFavorite(key) {
    favorites.has(key) ? favorites.delete(key) : favorites.add(key);
    save('commddl.favorites.v1',{version:1,items:[...favorites]}); render();
    if ($('detail-dialog').open && $('detail-content').dataset.item) openDetail($('detail-content').dataset.item, false);
    notify(storageWorks ? (favorites.has(key) ? '已加入关注' : '已取消关注') : '当前浏览器不允许保存，收藏仅在本次打开期间保留。');
  }
  function favoriteButton(key, name) { return `<button class="bookmark-button ${favorites.has(key)?'saved':''}" data-favorite="${esc(key)}" aria-label="${favorites.has(key)?'取消关注':'关注'} ${esc(name)}" aria-pressed="${favorites.has(key)}">${icon('bookmark')}</button>`; }
  const areaTags = ids => [...new Set(ids)].slice(0,3).map(id=>`<span class="tag">${esc(areaLabels.get(id)||id)}</span>`).join('');
  const topicTags = (ids, limit = 3) => [...state.topics.filter(id=>(ids||[]).includes(id)),...(ids||[]).filter(id=>!state.topics.includes(id))].slice(0,limit).map(id => `<span class="tag topic-tag">${esc(topicLabels.get(id)||id)}</span>`).join('');
  const historicalTags = v => C.isBuptImportant(v) ? '<span class="tag bupt-tag" title="北邮2018年信息与通信工程学科重要会议表；详情可查原始文件">BUPT重要</span>' : '';
  const evaluationLabels={jcr:'JCR',cas:'中科院',xinrui:'新锐分区',ccf:'CCF',core:'CORE / ICORE',cie:'电子学会',cic:'通信学会'};
  const statusLabels={verified:'已核验',reported:'转录／副本'};
  function evaluationText(e) {const nonRank={'Unranked':'未评级','Multiconference':'综合会议状态','National: USA':'区域状态（美国）','National/Regional':'国家／区域状态','journal published':'期刊发表模式（未给等级）','unranked: merged':'已合并，未评级','National: France':'区域状态（法国）','National:India':'区域状态（印度）'};return evaluationLabels[e.system]+' '+e.year+' '+(e.value ? ['cas','xinrui'].includes(e.system)?['','一区','二区','三区','四区'][+e.value]:(nonRank[e.value]||e.value):statusLabels[e.status]);}
  function indexingBadge(v) {
    const ix=v.indexing;
    if(v.kind!=='journal'||!ix||!['verified','reported'].includes(ix.status)||!ix.value)return '';
    const text=ix.value==='SCIE'?'SCI / SCIE':ix.value;
    return `<span class="tag rating-tag" title="${esc(ix.sourceTitle||text)}">${esc(text)}${ix.status==='reported'?' · '+esc(ix.year||ix.snapshotDate?.slice(0,4)||'来源')+'转录':''}</span>`;
  }
  function evaluationTags(v) {
    const tags=C.displayEvaluations(v).sort((a,b)=>['jcr','cas','xinrui','ccf','core','cie','cic'].indexOf(a.system)-['jcr','cas','xinrui','ccf','core','cie','cic'].indexOf(b.system)).map(e=>`<span class="tag rating-tag" title="${esc(e.sourceTitle||'')}">${esc(evaluationText(e))}${e.sourceType==='document-copy'?' · 副本':e.sourceType==='secondary'?' · 转录':''}</span>`).join('');
    const indexes=(v.otherIndexes||[]).filter(e=>['verified','reported'].includes(e.status)&&e.value).map(e=>`<span class="tag rating-tag" title="${esc(e.sourceTitle||'')}">${esc((e.value==='CSTPCD'?'科技核心':e.value)+(e.edition||e.year?' · '+(e.value==='CSCD'?e.edition||e.year:e.year||e.edition):'')+(e.value==='CSCD'&&e.coverage?' · '+e.coverage:''))}</span>`).join('');
    return `<div class="tags rating-tags" aria-label="收录与评级属性">${historicalTags(v)}${indexingBadge(v)}${indexes}${tags}</div>`;
  }
  function evidenceRecord(e, label) {
    return `<div class="evaluation-record"><div><strong>${esc(label)}</strong><span>${esc(statusLabels[e.status]||e.status)}</span></div>${e.category?`<p>学科 / 口径：${esc(e.category)}</p>`:''}${e.categories?.length?`<p>各学科分区：${e.categories.map(c=>esc(c.category)+' '+esc(c.value)).join('；')}</p>`:''}${e.minorCategories?.length?'<p>小类：'+e.minorCategories.map(m=>esc(m.category)+' '+m.quartile+'区').join('；')+'</p>':''}${e.appliesToName?`<p>原记录名称：${esc(e.appliesToName)}</p>`:''}${e.sheet?`<p>表内位置：${esc(e.sheet)} · 第 ${esc(e.row||'—')} 行</p>`:''}${e.edition||e.year?`<p>来源版本：${esc(e.edition||e.year)}</p>`:''}${e.note?`<p>${esc(e.note)}</p>`:''}${e.sourceUrl?`<a href="${safeURL(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(e.sourceTitle||'核验来源')}${e.page?' · 第 '+e.page+' 页':''} ↗</a>`:''}<small>复查 ${esc(e.reviewedAt||e.verifiedAt||'日期未记录')}${e.snapshotDate?' · 来源快照 '+esc(e.snapshotDate):''}</small>${e.officialUrl?`<a href="${safeURL(e.officialUrl)}" target="_blank" rel="noopener noreferrer">原库入口 ↗</a>`:''}</div>`;
  }
  function evaluationDetails(v) {
    const indexes=[v.indexing,...(v.otherIndexes||[])].filter(e=>e&&['verified','reported'].includes(e.status)&&e.value);
    const ratings=(v.evaluations||[]).filter(C.isRankEvidence).sort((a,b)=>['jcr','cas','xinrui','ccf','core','cie','cic'].indexOf(a.system)-['jcr','cas','xinrui','ccf','core','cie','cic'].indexOf(b.system)||b.year-a.year);
    if(!indexes.length&&!ratings.length)return '';
    return '<h3>收录与评级属性</h3><p class="muted">属性附适用年份与来源；历年记录按体系分别列出。</p>'+indexes.map(e=>evidenceRecord(e,'索引 · '+(e.value==='CSTPCD'?'科技核心':e.value)+(e.coverage?' · '+e.coverage:''))).join('')+ratings.map(e=>evidenceRecord(e,evaluationText(e))).join('');
  }
  function catalogTag(v) {return v.catalogScope==='archive'?'<span class="tag historical">历史参考</span>':'';}
  function renderStats() {
    const soon = D.calls.filter(c=>{const s=C.stateOf(c,Date.now(),state.zone);return ['date','upcoming'].includes(s.code)&&s.days>=0&&s.days<=30;}).length;
    const stats=[['clock','30 天内日期',soon,'项活动'],['globe','会议目录',activeVenues().filter(v=>v.kind==='conference').length,'个'],['book','期刊目录',activeVenues().filter(v=>v.kind==='journal').length,'本'],['shield','已核验具体活动',D.calls.filter(c=>c.verification==='verified').length,'项']];
    $('stats').innerHTML=stats.map(([i,label,value,unit])=>`<div class="stat"><div class="stat-top">${icon(i)}${label}</div><div class="stat-bottom"><span class="stat-value">${String(value).padStart(2,'0')}</span><span class="stat-unit">${unit}</span></div></div>`).join('');
  }
  function renderSidebar() {
    $('nav-call-count').textContent=D.calls.length;
    $('nav-conf-count').textContent=activeVenues().filter(v=>v.kind==='conference').length;
    $('nav-journal-count').textContent=activeVenues().filter(v=>v.kind==='journal').length;
    $('nav-favorite-count').textContent=favorites.size;
    document.querySelectorAll('.nav-item[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-current',b.dataset.view===state.view?'page':'false');});
    $('area-nav').innerHTML=D.areas.map(a=>`<button class="area-button ${state.area===a.id?'selected':''}" data-area="${a.id}" aria-pressed="${state.area===a.id}"><b class="area-code">${esc(a.code)}</b><span class="area-name">${esc(a.label)}</span><span>${activeVenues().filter(v=>v.areas.includes(a.id)).length}</span></button>`).join('');
  }
  function isVenueView() { return ['journals','conferences'].includes(state.view)||(state.view==='favorites'&&state.kind==='journal'); }
  function renderTabs() {
    let tabs;
    if(state.view==='journals') {
      tabs=['all','研究型期刊','快报期刊','专题期刊','综述期刊','学术杂志'].map(type=>[type,type==='all'?'全部期刊':type,activeVenues().filter(v=>v.kind==='journal'&&(type==='all'||v.publicationType===type)).length]);
      $('content-tabs').innerHTML=tabs.map(([t,label,n])=>`<button class="content-tab ${state.journalType===t?'active':''}" data-journal-type="${t}" aria-pressed="${state.journalType===t}">${label}<small>${n}</small></button>`).join('');
    } else if(state.view==='conferences') {
      $('content-tabs').innerHTML='<button class="content-tab active" aria-pressed="true">会议系列<small>'+activeVenues().filter(v=>v.kind==='conference').length+'</small></button>';
    } else {
      const kinds=state.view==='favorites'?['all','conference','special','workshop','series','journal']:['all','conference','special','workshop','series'];
      $('content-tabs').innerHTML=kinds.map(k=>`<button class="content-tab ${state.kind===k?'active':''}" data-kind="${k}" aria-pressed="${state.kind===k}">${kindLabels[k]}${state.view!=='favorites'?`<small>${D.calls.filter(c=>k==='all'||c.kind===k).length}</small>`:''}</button>`).join('');
    }
  }
  function stateDisplay(call) {
    const s=C.stateOf(call,Date.now(),state.zone);
    const labels={date:s.days===0?'截止日期为今天':`${s.days} 个日历日后`,upcoming:s.days===0?'今日截止':`${s.days} 天后截止`,closed:'已截止','past-date':'公布日期已过',pending:'官方征稿',rolling:'持续征稿',restricted:'仅限已完成前置步骤者',conflict:'官方征稿',cancelled:'已取消'};
    const css=['closed','past-date','pending','cancelled'].includes(s.code)?'pending':['conflict','restricted'].includes(s.code)?'warning':s.days!==null&&s.days<=30?'soon':'';
    return {...s,label:labels[s.code],css};
  }
  function nodeDateText(node) {
    if (!node) return '';
    if(node.precision==='instant'&&C.parseInstant(node.instant)!==null) return new Intl.DateTimeFormat('zh-CN',{timeZone:state.zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(node.instant));
    if(node.precision==='date') return node.date;
    return '';
  }
  function deadlineBox(call) {
    const n=C.primaryNode(call),st=stateDisplay(call);
    let date='',label='投稿截止',note='',counter=st.label,live='';
    if(n?.precision==='date'){date=n.date;label=n.label+' · 日期已公布';counter=st.days===null?st.label:st.days>0?'剩余 '+st.days+' 天':st.days===0?'截止日期为今天':st.label;note=call.sourceTimezone?'官网仅日期 · 原时区 '+call.sourceTimezone+(call.sourceTimezone==='AoE'?'（全球最晚时区）':''):'日期提示 · 全天';}
    if(n?.precision==='instant'){date=nodeDateText(n);label=n.label;note=(state.zone==='Asia/Shanghai'?'北京时间 · ':'显示时区 · ')+state.zone;if(st.code==='upcoming'){counter=C.countdown(n.instant);live=` data-countdown="${esc(n.instant)}"`;}else counter=st.label;}
    if(st.code==='rolling'){date='持续征稿';label='栏目方式';counter='无统一截止';note='按官方栏目时间提交';}
    if(st.code==='restricted')counter='前置注册已截止';
    if(st.code==='cancelled'||st.code==='conflict')counter=st.label;
    return `<div class="deadline-box deadline-prominent"><div><div class="deadline-label">${icon('calendar')}${esc(label)}</div><time class="deadline-date"${n?.instant||n?.date?` datetime="${esc(n.instant||n.date)}"`:''}>${esc(date)}</time><small class="deadline-precision">${esc(note)}</small></div><div class="deadline-status"><span class="deadline-counter ${st.css}"${live}>${esc(counter)}</span>${st.code==='restricted'?'<small>需已完成摘要 / 注册</small>':''}</div></div>`;
  }
  function activityMeta(call) {
    return `<div class="metadata-row">${call.eventDates||call.eventStart?`<span>${icon('calendar')}召开：${esc(call.eventDates||(call.eventStart+' / '+(call.eventEnd||call.eventStart)))}</span>`:''}${call.location?`<span>${icon('pin')}${esc(call.location)}</span>`:''}<span>${icon('shield')}${call.verification==='verified'?'核验 '+esc(call.verifiedAt):'时间尚未核验'}</span></div>`;
  }
  function callCard(call) {
    const v=venues.get(call.venueId);
    return `<article class="opportunity-card deadline-card" data-call-card="${call.id}" tabindex="0" aria-label="查看 ${esc(call.title)} 详情"><div class="card-top"><span class="venue-mark">${esc(v.short)}${call.year?' '+esc(call.year):''}</span><span class="type-tag ${call.kind}">${callLabel(call)}</span>${favoriteButton('call:'+call.id,call.title)}</div><h3 class="card-title"><button data-detail="call:${call.id}">${esc(call.title)}</button></h3><p class="card-title-en">${esc(call.titleEn)}</p>${deadlineBox(call)}<div class="tags">${areaTags(call.areas||v.areas)}${topicTags(call.topics||v.topics,2)}</div>${call.kind==='workshop'||call.inheritsVenueEvaluation===false||['demo','poster','short'].includes(call.submissionCategory)?'':evaluationTags(v)}${activityMeta(call)}<div class="card-footer"><button class="detail-button" data-detail="call:${call.id}">完整时间线 →</button>${C.eligibleNodes([call],true).length?`<button class="detail-button" data-export-call="${call.id}">${icon('download')}加入日历</button>`:''}<a href="${safeURL(call.sourceUrl)}" target="_blank" rel="noopener noreferrer">官方征稿 ${icon('external')}</a></div></article>`;
  }
  function venueCard(v) {
    const activity=C.venueActivity(v,D.calls,Date.now(),state.zone,state),journal=v.kind==='journal';
    const timing=activity?`<div class="venue-activity"><button class="edition-link" data-detail="call:${activity.id}">${esc(activity.title)} →</button>${activity.inheritsVenueEvaluation===false?'<p class="track-note">独立分会，不沿用旧系列评级</p>':''}${deadlineBox(activity)}${activityMeta(activity)}</div>`:journal?(v.catalogScope==='archive'?`<div class="regular-submission"><strong>出版档案</strong><span>${esc(v.publicationNote||'历年期刊与出版记录')}</span></div>`:v.invitationOnly?`<div class="regular-submission"><strong>邀请投稿</strong><span>${esc(v.submissionMode)}</span></div>`:v.urlKind==='registry'?'<div class="regular-submission"><strong>期刊目录</strong><span>刊名、ISSN 与出版机构信息</span></div>':'<div class="regular-submission"><strong>常规投稿</strong><span>作者指南与专题征稿见官方入口</span></div>'):'<div class="regular-submission"><strong>会议征稿</strong><span>查看当届官方征稿入口</span></div>';
    return `<article class="opportunity-card journal-card" data-venue-card="${v.id}" tabindex="0" aria-label="查看 ${esc(v.nameZh)} 详情"><div class="card-top"><span class="venue-mark">${esc(v.short)}</span><span class="type-tag">${esc(v.publicationType)}</span>${favoriteButton('venue:'+v.id,v.nameZh)}</div><h3 class="card-title"><button data-detail="venue:${v.id}">${esc(v.nameZh)}</button></h3><p class="card-title-en">${esc(v.nameEn)}</p><div class="tags">${areaTags(v.areas)}${v.catalogScope==='archive'?'<span class="tag historical">历史参考库</span>':''}${catalogTag(v)}</div><div class="tags specific-topics">${topicTags(v.topics)}</div>${evaluationTags(v)}${timing}<div class="card-footer"><button class="detail-button" data-detail="${activity?'call:'+activity.id:'venue:'+v.id}">${activity?'完整时间线':'属性与来源'} →</button>${activity&&C.eligibleNodes([activity],true).length?`<button class="detail-button" data-export-call="${activity.id}">加入日历</button>`:''}<a href="${safeURL(activity?.url||v.url)}" target="_blank" rel="noopener noreferrer">${activity?'当届官网':v.urlKind==='registry'?'刊物信息':'官方入口'} ${icon('external')}</a></div></article>`;
  }

  function directoryKind() {
    if(state.view==='journals'||state.kind==='journal'||['special','series'].includes(state.kind))return 'journal';
    if(state.view==='conferences'||['conference','workshop'].includes(state.kind))return 'conference';
    return undefined;
  }
  function includeFollowedVenues() {return state.view==='favorites'&&['all','conference'].includes(state.kind)&&!state.window;}
  function filterVenues() {
    return C.filterVenues(D.venues,{...state,taxonomy:D.topics,calls:D.calls,venueKind:directoryKind(),favoriteOnly:state.view==='favorites',favorites:[...favorites]});
  }
  function renderTopics() {
    $('topic-panel').classList.toggle('topics-folded',!topicsExpanded&&!state.area&&!state.topics.length);
    const available=D.topics.filter(t=>!state.area||t.areas.includes(state.area));
    const featured=['physical','mimo','channel-coding','estimation-sync','isac','fiber','satellite-ntn','navigation-pnt','iot-sensing','ai-communications'];
    const visible=topicsExpanded||state.area?available:available.filter(t=>featured.includes(t.id)||state.topics.includes(t.id));
    const vv=isVenueView(), mixed=includeFollowedVenues();
    const context={...state,topics:[],taxonomy:D.topics,calls:D.calls,favoriteOnly:state.view==='favorites',favorites:[...favorites]};
    const calls=vv?[]:C.filterCalls(D.calls,D.venues,context);
    const list=vv||mixed?C.filterVenues(D.venues,{...context,venueKind:directoryKind()}):[];
    $('topic-panel').innerHTML=`<div class="topic-heading"><div><strong>研究主题</strong><span>${state.area?esc(areaLabels.get(state.area))+' · ':''}${available.length} 个主题 · 多选匹配任一项</span></div><div>${state.topics.length?'<button data-clear="topics" class="topic-text-button">清除主题</button>':''}${!state.area?`<button data-topic-expand="toggle" class="topic-text-button" aria-expanded="${topicsExpanded}">${topicsExpanded?'收起主题':'展开全部主题'} ${topicsExpanded?'↑':'↓'}</button>`:''}</div></div><div class="topic-chips" role="group" aria-label="具体研究主题，多选匹配任一项">${visible.map(t=>{const count=calls.filter(c=>(c.topics||venues.get(c.venueId).topics).includes(t.id)).length+list.filter(v=>v.topics.includes(t.id)).length;return `<button class="topic-chip ${state.topics.includes(t.id)?'selected':''}" data-topic="${t.id}" aria-pressed="${state.topics.includes(t.id)}">${esc(t.label)}<span>${count}</span></button>`;}).join('')}</div>`;
    if(state.topics.length)$('topic-panel').querySelector('.topic-heading>div:last-child').insertAdjacentHTML('afterbegin','<button data-share-filters="copy" class="topic-text-button">分享筛选</button>');
  }
  const indexLabels={'':'全部',SCIE:'SCI / SCIE',ESCI:'ESCI',EI:'EI',CSCD:'CSCD',Scopus:'Scopus','北大核心':'北大核心',CSTPCD:'科技核心'};
  function facetCount(overrides) {
    const filters={...state,...overrides,taxonomy:D.topics,calls:D.calls,venueKind:directoryKind(),favoriteOnly:state.view==='favorites',favorites:[...favorites]};
    if(isVenueView())return C.filterVenues(D.venues,filters).length;
    return C.filterCalls(D.calls,D.venues,filters).length+(includeFollowedVenues()?C.filterVenues(D.venues,filters).length:0);
  }
  function renderAttributes() {
    $('attribute-panel').classList.toggle('attributes-folded',!isVenueView()&&!attributesExpanded);
    const kind=directoryKind(),systems=kind==='conference'?['ccf','core']:kind==='journal'?['cas','xinrui','jcr','ccf','cie','cic']:['cas','xinrui','jcr','ccf','core','cie','cic'];
    const values={jcr:['Q1','Q2','Q3','Q4'],cas:['1','2','3','4'],xinrui:['1','2','3','4'],ccf:['A','B','C'],core:['A*','A','B','C'],cie:['T1','T2','T3'],cic:['T1','T2','T3']};
    const labels={...evaluationLabels,cas:'中科院大类'};
    const indexes=kind==='conference'?'':`<div class="attribute-row index-row" role="group" aria-label="期刊收录筛选"><span>期刊收录</span>${['','SCIE','ESCI','EI','CSCD','Scopus','北大核心','CSTPCD'].map(index=>`<button class="rank-chip ${state.index===index?'selected':''}" data-index="${index}" aria-pressed="${state.index===index}" title="${index==='SCIE'?'SCI 对应 SCIE（科学引文索引扩展版）；ESCI 单列':({EI:'EI（工程索引）',CSCD:'CSCD（中国科学引文数据库）',Scopus:'Scopus（摘要与引文数据库）',ESCI:'ESCI（新兴来源引文索引）','北大核心':'北京大学《中文核心期刊要目总览》',CSTPCD:'中国科技论文与引文数据库（科技核心）'}[index]||indexLabels[index])}">${indexLabels[index]}<small>${facetCount({index})}</small></button>`).join('')}</div>`;
    $('attribute-panel').innerHTML=`<div class="attribute-heading"><strong>收录与分区筛选</strong>${!isVenueView()?`<button class="topic-text-button" data-attribute-expand="toggle" aria-expanded="${attributesExpanded}">${attributesExpanded?'收起筛选 ↑':'展开筛选 ↓'}</button>`:''}<span>同一体系多选匹配任一项，不同条件同时满足</span><button class="topic-text-button" data-reset="all">清除全部</button><button class="topic-text-button" data-share-filters="copy">分享筛选</button></div>`+indexes+systems.map(sys=>{const other=state.grades.filter(r=>!r.startsWith(sys+':'));return `<div class="attribute-row" role="group" aria-label="${labels[sys]} 等级"><span>${labels[sys]}</span><button class="rank-chip ${!state.grades.some(r=>r.startsWith(sys+':'))?'selected':''}" data-rank-reset="${sys}" aria-pressed="${!state.grades.some(r=>r.startsWith(sys+':'))}">全部</button>${values[sys].map(value=>{const key=sys+':'+value,label=['cas','xinrui'].includes(sys)?value+'区':value;return `<button class="rank-chip ${state.grades.includes(key)?'selected':''}" data-rank="${key}" aria-pressed="${state.grades.includes(key)}">${esc(label)}<small>${facetCount({grades:[...other,key]})}</small></button>`;}).join('')}</div>`;}).join('')+`<p class="filter-explainer">SCI 对应 SCIE（科学引文索引扩展版），ESCI（新兴来源引文索引）单列；未指定体系的一区指中科院大类；新锐分区单列，Q1 指 JCR（期刊引证报告）分区。索引可重叠，数量按已录入证据统计；版本与来源见详情。${isVenueView()?'':' 此页筛选有截止记录的活动；完整期刊请点“SCI 期刊”。'}</p>`;
    $('quick-filters').hidden=kind==='conference';
    const parsed=C.parseVenueQuery(state.query);
    $('search-hint').textContent=parsed.labels.length?'搜索已识别：'+parsed.labels.join(' + ')+(parsed.text?'；关键词：'+parsed.text:''):'可搜索简称、中文主题，也可输入 SCI 一区、新锐一区、SCI Q1、中文核心、CCF A、BUPT重要。';
  }
  function renderActiveFilters() {
    const items=[];
    if(state.area)items.push(['area',areaLabels.get(state.area)]);
    if(state.primaryOnly)items.push(['primaryOnly','仅主方向']);
    if(state.topics.length)items.push(['topics','主题：'+state.topics.map(id=>topicLabels.get(id)).join(' / ')]);
    if(state.index)items.push(['index',indexLabels[state.index]||state.index]);
    if(state.query)items.push(['query','搜索：'+state.query]);
    if(state.grades.length)items.push(['grades',state.grades.map(r=>{const [sys,val]=r.split(':');return (sys==='cas'?'中科院大类':evaluationLabels[sys])+' '+(['cas','xinrui'].includes(sys)?val+'区':val);}).join(' / ')]);
    if(isVenueView()&&state.catalogStatus)items.push(['catalogStatus',$('catalog-status').selectedOptions[0]?.textContent||state.catalogStatus]);
    const range=C.deadlineRange(state);
    if(state.window&&range.valid&&range.active)items.push(['window',state.window==='custom'?(Number.isFinite(range.max)?'截稿剩余 '+range.min+'—'+range.max+' 天':'截稿至少剩余 '+range.min+' 天'):'未来 '+state.window+' 天']);
    if(state.includeArchived)items.push(['includeArchived','包含历史参考库']);
    if(state.historical)items.push(['historical','BUPT重要']);
    $('active-filters').innerHTML=items.map(([key,label])=>`<span class="active-filter">${esc(label)}<button data-clear="${key}" aria-label="清除 ${esc(label)}">×</button></span>`).join('');
  }
  function emptyHTML(venueView) {return `<div class="empty-state"><div class="empty-symbol">${icon(state.view==='favorites'?'bookmark':'search')}</div><h3>${state.view==='favorites'?'这里还没有符合条件的关注':'没有找到符合条件的结果'}</h3><p>${state.view==='favorites'?'点击活动或期刊右上角的书签，建立自己的投稿清单。':'可以清除筛选，或到官方入口继续查找。'}</p><button class="button button-subtle" data-reset="all">清除筛选</button></div>`;}
  function render() {
    renderSidebar();renderStats();$('stats').classList.add('deadline-stats');
    const [title,description]=headings[state.view];
    $('breadcrumb-title').textContent=pageNames[state.view];
    $('page-title').innerHTML=esc(title)+'<span class="heading-period">。</span>';
    $('page-description').textContent=description;
    document.title=pageNames[state.view]+' · CommDDL 通信科研投稿日历';
    $('data-stamp').textContent='目录更新 '+D.meta.updatedAt;
    $('about-content').hidden=state.view!=='about';$('workspace-content').hidden=state.view==='about';
    $('export-button').hidden=state.view==='about'||isVenueView();
    if(state.view==='about'){renderAbout();return;}
    renderTabs();renderTopics();renderAttributes();
    const vv=isVenueView();
    $('evaluation-filters').hidden=true; $('attribute-panel').hidden=false;
    Array.from($('grade-filter').querySelectorAll('optgroup')).forEach(g=>{const sys=g.querySelector('option').value.split(':')[0];g.disabled=(directoryKind()==='conference'&&['jcr','cas','xinrui','cie','cic'].includes(sys))||(directoryKind()==='journal'&&sys==='core');g.hidden=g.disabled;});
    $('index-filter-label').hidden=!vv||directoryKind()!=='journal'; $('index-filter').value=state.index;
    $('grade-filter').value=state.grade; $('catalog-status').value=state.catalogStatus;
    $('search').value=state.query;$('time-window').value=state.window;$('sort').value=state.sort;$('show-past').checked=state.showPast;$('show-undated').checked=state.showUndated;$('historical-only').checked=state.historical;$('timezone').value=state.zone;
    $('undated-filter-label').hidden=true; $('time-window').hidden=false;
    $('deadline-range').hidden=state.window!=='custom';$('days-from').value=state.daysFrom;$('days-to').value=state.daysTo;
    const range=C.deadlineRange(state);$('range-error').textContent=range.valid?'':'请输入 0—36500 的整数，起始天数不能大于结束天数。';
    for(const id of ['days-from','days-to'])$(id).setAttribute('aria-invalid',String(!range.valid));
    $('deadline-range-hint').hidden=!range.valid||!range.active;
    $('deadline-range-hint').textContent='按所选时区的日历天计算，包含起止两天；只显示有对应投稿截止的会议或期刊专题。';$('view-switch').hidden=vv;$('past-filter-label').hidden=vv;$('timezone').parentElement.hidden=false;
    $('history-filter-label').hidden=directoryKind()==='journal'; $('primary-only').checked=state.primaryOnly; $('primary-filter-label').hidden=!state.area; $('archive-filter-label').hidden=!vv; $('include-archived').checked=state.includeArchived;
    $('date-note').hidden=vv;
    $('favorites-tools').hidden=state.view!=='favorites';
    $('sort').options[0].textContent=vv?'按最近截稿':'按截止日期';
    $('list-view').classList.toggle('selected',state.layout==='list');$('calendar-view').classList.toggle('selected',state.layout==='calendar');
    $('list-view').setAttribute('aria-pressed',state.layout==='list');$('calendar-view').setAttribute('aria-pressed',state.layout==='calendar');
    renderActiveFilters();
    currentCalls=C.filterCalls(D.calls,D.venues,{...state,taxonomy:D.topics,favoriteOnly:state.view==='favorites',favorites:[...favorites]});
    const mixedFavorites=includeFollowedVenues();
    currentVenues=vv||mixedFavorites?filterVenues():[];
    const count=vv?currentVenues.length:currentCalls.length+(mixedFavorites?currentVenues.length:0);
    $('results-title').innerHTML=esc(vv?(state.view==='conferences'?'会议系列':'期刊目录'):(state.area?areaLabels.get(state.area):state.view==='favorites'?'关注清单':'全部投稿机会'))+` <span>${count} ${vv?(state.view==='conferences'?'个系列':'本期刊'):'项'}</span>`;
    $('result-caption').textContent=state.view==='journals'?'筛选期刊载体 · 收录与分区独立':vv?'优先显示未过截止的届次 · 含当届时间线':'按截止排序 · 明确时刻实时倒计时';
    const calendar=!vv&&state.layout==='calendar';
    $('calendar-container').hidden=!calendar;$('results').hidden=calendar;
    if(calendar)renderCalendar();else $('results').innerHTML=count?(vv?currentVenues.map(venueCard):[...currentCalls.map(callCard),...(mixedFavorites?currentVenues.map(venueCard):[])]).join(''):emptyHTML(vv);
  }
  function renderCalendar() {
    const [year,month]=state.month.split('-').map(Number);
    const first=new Date(Date.UTC(year,month-1,1));const start=new Date(first.getTime()-((first.getUTCDay()+6)%7)*86400000);
    const today=C.dateInZone(Date.now(),state.zone),items=[];
    const entries=currentCalls.map(c=>({call:c,date:C.calendarDate(C.primaryNode(c),state.zone)})).filter(x=>x.date);
    for(let i=0;i<42;i++) {
      const d=new Date(start.getTime()+i*86400000),ds=d.toISOString().slice(0,10),calls=entries.filter(x=>x.date===ds);
      items.push(`<div class="calendar-cell ${d.getUTCMonth()!==month-1?'other-month':''}"><span class="calendar-day ${ds===today?'today':''}">${d.getUTCDate()}</span>${calls.map(({call})=>`<button class="calendar-event ${call.kind}" data-detail="call:${call.id}" title="${esc(call.title)}">${esc(venues.get(call.venueId).short)} · ${esc(call.title.replace(/^.* · /,''))}</button>`).join('')}</div>`);
    }
    const undated=currentCalls.length-entries.length;
    const followedNote=currentVenues.length?' 另有 '+currentVenues.length+' 个关注载体不对应独立截止，请在列表查看。':'';
    $('calendar-container').innerHTML=`<div class="calendar-shell"><div class="calendar-toolbar"><h3>${year} 年 ${String(month).padStart(2,'0')} 月</h3><div><button class="button button-subtle" data-month="today">本月</button><button class="icon-button" data-month="-1" aria-label="上个月">‹</button><button class="icon-button" data-month="1" aria-label="下个月">›</button></div></div><div class="calendar-weekdays">${['一','二','三','四','五','六','日'].map(x=>'<span>周'+x+'</span>').join('')}</div><div class="calendar-grid">${items.join('')}</div><div class="calendar-empty">仅日期的节点按官方原日期展示。${undated?'另有 '+undated+' 项没有明确截止，保留在列表中。':'点击活动查看完整来源。'}${esc(followedNote)}</div></div>`;
  }
  function sourceBox(item) {return `<div class="source-box"><p><strong>${item.sourceType==='historical-document'?'历史文献来源':'官方与出版来源'}</strong>${item.verifiedAt?' · 核对 '+esc(item.verifiedAt):''}</p><a href="${safeURL(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceUrl)} ↗</a></div>`;}
  function officialBlockHTML(block) {
    if(block.type==='paragraph')return `<p>${esc(block.text)}</p>`;
    if(block.type==='list'){const tag=block.ordered?'ol':'ul';return `<${tag}>${(block.items||[]).map(item=>`<li>${esc(item.text)}${item.items?.length?`<ul>${item.items.map(child=>`<li>${esc(child.text)}</li>`).join('')}</ul>`:''}</li>`).join('')}</${tag}>`;}
    if(block.type==='table')return `<div class="official-table-wrap"><table class="official-table"><tbody>${(block.rows||[]).map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if(block.type==='links')return `<ul class="official-links">${(block.items||[]).map(link=>`<li><a href="${safeURL(link.href)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a></li>`).join('')}</ul>`;
    return '';
  }
  function officialSectionsHTML(sections,label) {return (sections||[]).filter(section=>section&&section.heading).map(section=>`<section class="official-section" data-section-id="${esc(section.sectionId||'')}"><h3>${esc(section.heading)}</h3>${section.blocks?.length?section.blocks.map(officialBlockHTML).join(''):`${section.content?`<p>${esc(section.content)}</p>`:''}${section.items?.length?`<ul>${section.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}`}${section.structuredValue!==undefined?`<pre class="official-structured-value">${esc(JSON.stringify(section.structuredValue,null,2))}</pre>`:''}${section.evidence?.length?`<ul class="official-evidence">${section.evidence.map(e=>`<li><q>${esc(e.quote)}</q>${e.heading?` · h${esc(e.headingLevel||'?')} ${esc((e.sourceHeadingPath||[]).join(' › '))}`:''} · <a href="${safeURL(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">证据来源 ↗</a></li>`).join('')}</ul>`:''}${section.uncertainty?`<p class="official-uncertainty">不确定性：${esc(section.uncertainty.level)} · ${esc(section.uncertainty.reason)}</p>`:''}${section.sourceUrl?`<a href="${safeURL(section.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:''}${section.verifiedAt?`<small class="official-verified">核对 ${esc(section.verifiedAt)}</small>`:''}</section>`).join('');}
  function showDialog(id, origin=null) {const dialog=$(id);if(!dialog.open)dialog.showModal();if(origin&&dialog.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const box=origin.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2,dx=cx-innerWidth/2,dy=cy-innerHeight/2;dialog.animate([{transform:`translate(${dx}px,${dy}px) scale(.9)`,opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:320,easing:'cubic-bezier(.2,.75,.25,1)'});}}
  function openDetail(key, show=true, origin=null) {
    const [type,rawId]=key.split(':');const id=type==='call'?(D.callAliases?.[rawId]||rawId):rawId;const item=type==='call'?D.calls.find(c=>c.id===id):venues.get(id);if(!item)return;
    const isCall=type==='call',v=isCall?venues.get(item.venueId):item;
    const st=isCall?stateDisplay(item):null;
    let content=`<div class="dialog-top"><span class="eyebrow">${isCall?'CALL FOR PAPERS · 征稿详情':'VENUE DIRECTORY · 发表载体'}</span></div><div class="card-top"><span class="venue-mark">${esc(v.short)}</span><span class="type-tag ${isCall?item.kind:''}">${esc(isCall?callLabel(item):item.publicationType)}</span>${favoriteButton(key,isCall?item.title:item.nameZh)}</div><h2 id="detail-heading">${esc(isCall?item.title:item.nameZh)}</h2><div class="detail-en">${esc(isCall?item.titleEn:item.nameEn)}</div><div class="tags">${areaTags(item.areas||v.areas)}${!isCall||C.inheritsConferenceList(item)?historicalTags(v):''}</div>${isCall?`${item.summary?`<h3>征稿简介 · CommDDL 记录</h3><p class="detail-summary">${esc(item.summary)}</p>`:''}${v.summary?`<h3>系列简介 · CommDDL 记录</h3><p class="detail-summary">${esc(v.summary)}</p>`:''}`:`${v.summary?`<h3>简介 · CommDDL 记录</h3><p class="detail-summary">${esc(v.summary)}</p>`:''}`}<h3>CommDDL 研究主题标签</h3><div class="tags">${topicTags(item.topics||v.topics,99)}</div>`;
    content+=isCall?officialSectionsHTML(item.officialSections,'查看该部分来源')+officialSectionsHTML(v.officialSections,'查看系列来源'):officialSectionsHTML(v.officialSections,'查看官网来源');
    if(C.isBuptImportant(v)&&(!isCall||C.inheritsConferenceList(item))){const record=v.assessments.find(a=>a.system==='bupt-ict-2018');content+=`<h3>BUPT重要会议</h3><p>来源：北邮 2018 年信息与通信工程学科重要会议表。</p><a class="school-source" href="${safeURL(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看学校原始文件 ↗</a>`;}
    if(isCall) {
      content+=`<div class="detail-meta">${item.location?'<span>'+esc(item.location)+'</span>':''}${item.eventDates?'<span>召开日期：'+esc(item.eventDates)+'</span>':''}${item.publication?'<span>预计出版：'+esc(item.publication)+'</span>':''}<span>${esc(st.label)}</span></div>`;
      if(item.nodes.length)content+='<h3>投稿时间线</h3><div class="timeline">'+item.nodes.map(n=>`<div class="timeline-row ${n.primary?'primary':''}"><div><strong>${esc(n.label)}</strong><small>${esc(n.original)}${(n.requires||[]).length?' · 有前置步骤':''}</small></div><div class="timeline-time">${esc(nodeDateText(n))}<small>${n.precision==='date'?(item.sourceTimezone?'仅日期 · '+esc(item.sourceTimezone)+' · 日期提示':'日期提示 · 全天'):n.precision==='instant'?esc(n.timezone||'明确时刻'):''}</small></div></div>`).join('')+'</div>';
      else content+=`<div class="notice dialog-notice">${icon('info')}<p>${item.status==='rolling'?'这是持续征稿栏目，按官方栏目要求提交。':'查看官方征稿。'}</p></div>`;
      if(item.notes)content+=`<h3>投稿说明</h3><p>${esc(item.notes)}</p>`;
      if(item.history.length)content+='<h3>变更记录</h3>'+item.history.map(h=>`<p>${esc(h.date)} · ${esc(h.note)}</p>`).join('');
    } else {
      content+=`<div class="detail-meta"><span>${esc(v.publicationType)}</span><span>稿件类型：${esc(v.articleTypes.join(' / '))}</span>${v.issn?'<span>ISSN：'+esc(v.issn)+'</span>':''}${v.eissn?'<span>eISSN：'+esc(v.eissn)+'</span>':''}${v.kind==='journal'?'<span>投稿方式：'+esc(v.submissionMode||'官方作者指南')+'</span>':''}</div>`;
      if(v.publicationNote)content+='<h3>系列记录</h3><p>'+esc(v.publicationNote)+'</p>';
      if(v.aliases?.length)content+='<h3>别名与旧名称</h3><p>'+esc(v.aliases.join(' / '))+'</p>';
      if(v.authorGuideUrl||v.cfpUrl)content+='<h3>投稿与征稿入口</h3><div class="resource-links">'+(v.authorGuideUrl?`<a href="${safeURL(v.authorGuideUrl)}" target="_blank" rel="noopener noreferrer">作者指南 ↗</a>`:'')+(v.cfpUrl?`<a href="${safeURL(v.cfpUrl)}" target="_blank" rel="noopener noreferrer">专题征稿 / 公告 ↗</a>`:'')+'</div>';
      const related=D.calls.filter(c=>c.venueId===v.id);
      if(related.length)content+='<h3>关联征稿与届次</h3>'+related.map(c=>`<div class="feed-row"><div><strong>${esc(c.title)}</strong><small>${esc(stateDisplay(c).label)}</small></div><button data-detail="call:${c.id}">查看 →</button></div>`).join('');
      content+=evaluationDetails(v);
    }
    content+='<h3>来源与核验</h3>'+sourceBox(item)+`<div class="dialog-actions"><a class="button button-primary" href="${safeURL(item.url)}" target="_blank" rel="noopener noreferrer">${icon('external')}${item.urlKind==='registry'?'查看刊物信息':item.sourceType==='historical-document'||item.verification==='pending'?'打开来源页面':'打开官方页面'}</a>${isCall&&C.eligibleNodes([item],true).length?`<button class="button button-subtle" data-export-call="${item.id}">${icon('download')}导出日期</button>`:''}${item.contributionUrl?`<a class="button button-subtle" href="${safeURL(item.contributionUrl)}" target="_blank" rel="noopener noreferrer">GitHub 提交修改 ↗</a>`:''}<button class="button button-subtle" data-copy-detail="${esc(key)}">复制分享链接</button></div>`;
    $('detail-content').innerHTML=content;$('detail-content').dataset.item=key;if(show)showDialog('detail-dialog',origin);
  }
  function renderAbout() {
    const active=activeVenues(),archives=D.venues.length-active.length;
    $('about-content').innerHTML=`<div class="about-grid"><section class="about-panel"><h2>通信发表载体目录</h2><p>${active.filter(v=>v.kind==='journal').length} 本期刊、${active.filter(v=>v.kind==='conference').length} 个会议系列，${D.areas.length} 个研究方向、${D.topics.length} 个主题。另保留 ${archives} 个历史参考条目。</p><p>期刊按载体建目录，会议按届次、期刊专题按具体征稿记录截止。</p></section><section class="about-panel"><h2>主题与属性</h2><p>参考 CCFDDL（计算机会议截稿日历），将主题分类与评级属性分开。先选方向，再选细分主题；多个主题匹配任一项，可继续叠加评级和搜索条件。</p><p>SCIE（科学引文索引扩展版）、ESCI（新兴来源引文索引）、JCR（期刊引证报告）、中科院分区、新锐分区、CCF（中国计算机学会）和 ICORE（国际合作会议评级）按各自体系记录。EI（工程索引）、CSCD（中国科学引文数据库）及 Scopus（摘要与引文数据库）也作为独立索引属性。</p></section><section class="about-panel wide"><h2>评级参考与年份</h2><p>${D.ratingSystems.map(r=>esc(r.label)+'：按条目所列年份展示已确认属性').join('<br>')}</p><p>同一体系的卡片属性采用最近有明确记录的年份，详情保留历年等级与来源。</p><p>会议等级适用于对应正式长文；短文、演示及附属研讨会按各自记录查询。</p><div class="resource-links">${D.ratingSystems.map(r=>`<a href="${safeURL(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.label)} 来源 ↗</a>`).join('')}</div></section><section class="about-panel"><h2>日期与日历</h2><p>明确时刻支持时区换算与倒计时；仅日期显示全天提示。每届活动使用当届已核实日期。可自定义剩余天数区间，例如30—40天；期刊按专题征稿的截止日期筛选。</p><p>导出为一次性快照；订阅可接收发布后的变化，刷新频率由日历客户端决定。</p></section><section class="about-panel"><h2>收藏与历史参考</h2><p>收藏保存在当前浏览器，可备份导入。已有收藏保留稳定编号；历史参考库中的收藏仍可在“我的关注”找到。</p><p>北邮2018年信通学科重要会议表的89条记录合并对应87个会议系列，标注为“BUPT重要”。筛选该名单时一并显示其中的历史参考条目。</p></section><section class="about-panel wide"><h2>信息来源</h2><div class="source-list">${D.sources.map(s=>`<div class="source-item"><a href="${safeURL(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><small>读取 ${esc(s.verifiedAt)}</small></div>`).join('')}</div></section><section class="about-panel wide"><h2>维护与贡献</h2><p>欢迎到 GitHub 提交期刊、会议和日期修改，附上官方来源。每个条目独立维护 YAML 文件，合并请求通过检查与维护者审核后发布。CommDDL 参考 CCFDDL 的分类和日历思路，页面与数据独立实现。</p><a href="${safeURL(D.meta.repository)}" target="_blank" rel="noopener noreferrer">项目与贡献说明 ↗</a> · <a href="https://github.com/ccfddl/ccf-deadlines" target="_blank" rel="noopener noreferrer">CCFDDL 原项目 ↗</a></section></div>`;
  }
  function download(text, name, type) {const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function beginExport(calls) {
    exportCalls=calls;$('include-date-only').checked=false;$('export-message').textContent='';
    const precise=C.eligibleNodes(calls,false).length,all=C.eligibleNodes(calls,true).length;
    $('export-description').textContent=`当前选择包含 ${precise} 个已确认时刻节点、${all-precise} 个仅日期节点。只有投稿相关节点进入导出。`;
    showDialog('export-dialog');
  }
  async function copyText(text) {
    try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);notify('已复制');}
    catch {const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.opacity='0';const host=document.querySelector('dialog[open]')||document.body;host.appendChild(input);input.select();const copied=document.execCommand('copy');input.remove();notify(copied?'已复制':'请手动复制地址');}
  }
  function openSubscriptions() {
    const base=(location.protocol==='file:'||document.querySelector('meta[name="commddl-mode"]'))?(D.meta.homepage||'https://turambarr.github.io/commddl/'):new URL('.',location.href).href;
    const feeds=[['all','全部投稿日期',D.calls],...D.areas.map(a=>[a.id,a.label,D.calls.filter(c=>c.areas.includes(a.id))])].map(([id,label,calls])=>({id,label,count:C.eligibleNodes(calls,true).length})).filter(f=>f.count);
    $('feed-list').innerHTML=feeds.map(f=>{const url=new URL('calendars/'+f.id+'-dates.ics',base).href;return `<div class="feed-row"><div><strong>${esc(f.label)}</strong><small>${f.count} 个投稿节点 · 全天日期提示</small></div><button data-copy-feed="${esc(url)}">复制订阅地址</button><a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${esc(f.label)} 日历文件">↗</a></div>`;}).join('');
    $('subscribe-local-note').textContent=location.protocol==='file:'?'你正在打开本地文件。在线订阅地址需要 GitHub Pages 发布成功后才能访问；本地可使用日历导出。':'客户端可能需要数小时刷新。网站信息更新以维护者发布的数据版本为准。';
    showDialog('subscribe-dialog');
  }
  function updateClock() {$('local-clock').textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:state.zone,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+(state.zone==='Asia/Shanghai'?' · 北京':'');}
  document.addEventListener('click',event=>{
    const card=event.target.closest('[data-venue-card],[data-call-card]');
    if(card&&!event.target.closest('button,a,input,select')){const key=card.dataset.venueCard?'venue:'+card.dataset.venueCard:'call:'+card.dataset.callCard;openDetail(key,true,card);return;}
    const b=event.target.closest('button, a');if(!b)return;
    if(b.dataset.view){event.preventDefault();navigate(b.dataset.view);}
    else if(b.dataset.area){state.area=state.area===b.dataset.area?'':b.dataset.area;state.topics=C.cleanTopics(state.topics,D.topics,state.area);syncHash();render();}
    else if(b.dataset.topic){const id=b.dataset.topic;state.topics=state.topics.includes(id)?state.topics.filter(t=>t!==id):[...state.topics,id];syncHash();render();document.querySelector(`[data-topic="${id}"]`)?.focus();}
    else if(b.dataset.topicExpand){topicsExpanded=!topicsExpanded;renderTopics();document.querySelector('[data-topic-expand]')?.focus();}
    else if(b.dataset.attributeExpand){attributesExpanded=!attributesExpanded;renderAttributes();}
    else if(b.hasAttribute('data-index')){state.index=b.dataset.index;attributesExpanded=true;syncHash();render();}
    else if(b.dataset.deadlinePreset){state.window='custom';state.daysFrom='30';state.daysTo='40';syncHash();render();}
    else if(b.dataset.preset){state.view='journals';state.kind='all';state.query='';state.window='';state.daysFrom='';state.daysTo='';state.historical=false;state.index='SCIE';state.grades=b.dataset.preset==='sci1'?['cas:1']:b.dataset.preset==='sci2'?['cas:2']:b.dataset.preset==='sciq1'?['jcr:Q1']:[];state.journalType='all';state.layout='list';closeSidebar();syncHash();render();window.scrollTo({top:0,behavior:'instant'});}
    else if(b.dataset.rank){attributesExpanded=true;state.grade='';state.grades=state.grades.includes(b.dataset.rank)?state.grades.filter(r=>r!==b.dataset.rank):[...state.grades,b.dataset.rank];syncHash();render();}
    else if(b.dataset.rankReset){state.grade='';state.grades=state.grades.filter(r=>!r.startsWith(b.dataset.rankReset+':'));syncHash();render();}
    else if(b.dataset.kind){state.kind=b.dataset.kind;state.grades=C.cleanGrades(state.grades,directoryKind());state.grade='';state.catalogStatus='';if(directoryKind()==='conference')state.index='';syncHash();render();}
    else if(b.dataset.journalType){state.journalType=b.dataset.journalType;syncHash();render();}
    else if(b.dataset.favorite)toggleFavorite(b.dataset.favorite);
    else if(b.dataset.detail)openDetail(b.dataset.detail,true,b.closest('[data-venue-card],[data-call-card]'));
    else if(b.dataset.close)$(b.dataset.close).close();
    else if(b.dataset.exportCall)beginExport([D.calls.find(c=>c.id===b.dataset.exportCall)]);
    else if(b.dataset.copyFeed)copyText(b.dataset.copyFeed);
    else if(b.dataset.shareFilters){const url=new URL(D.meta.homepage);url.hash=location.hash;copyText(url.href);}
    else if(b.dataset.copyDetail){const url=new URL(D.meta.homepage||location.href);url.hash=state.view+'?'+new URLSearchParams({item:b.dataset.copyDetail});copyText(url.href);}
    else if(b.dataset.clear){state[b.dataset.clear]=['historical','includeArchived','showUndated','primaryOnly'].includes(b.dataset.clear)?false:['topics','grades'].includes(b.dataset.clear)?[]:'';syncHash();render();}
    else if(b.dataset.reset){state.query='';state.area='';state.primaryOnly=false;state.topics=[];state.window='';state.daysFrom='';state.daysTo='';state.showUndated=false;state.historical=false;state.includeArchived=false;state.grades=[];state.grade='';state.catalogStatus='';state.index='';state.kind='all';state.journalType='all';syncHash();render();}
    else if(b.dataset.month){if(b.dataset.month==='today')state.month=C.dateInZone(Date.now(),state.zone).slice(0,7);else{const[y,m]=state.month.split('-').map(Number);state.month=new Date(Date.UTC(y,m-1+Number(b.dataset.month),1)).toISOString().slice(0,7);}syncHash();renderCalendar();}
  });
  $('search').addEventListener('input',e=>{state.query=e.target.value;syncHash();render();$('search').focus();});
  [['time-window','window'],['sort','sort'],['timezone','zone'],['grade-filter','grade'],['catalog-status','catalogStatus'],['index-filter','index']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.value;if(key==='zone'){save('commddl.preferences.v1',{zone:state.zone});updateClock();}syncHash();render();}));
  [['show-undated','showUndated'],['show-past','showPast'],['historical-only','historical'],['include-archived','includeArchived']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.checked;syncHash();render();}));
  for(const [id,key] of [['days-from','daysFrom'],['days-to','daysTo']])$(id).addEventListener('input',e=>{state[key]=e.target.value;syncHash();render();});
  $('primary-only').addEventListener('change',e=>{state.primaryOnly=e.target.checked;syncHash();render();});
  $('reset-area').addEventListener('click',()=>{state.area='';syncHash();render();});
  $('list-view').addEventListener('click',()=>{state.layout='list';syncHash();render();});
  $('calendar-view').addEventListener('click',()=>{state.layout='calendar';syncHash();render();});
  $('mobile-menu').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('sidebar-backdrop').classList.toggle('visible',open);$('mobile-menu').setAttribute('aria-expanded',open);});
  $('sidebar-backdrop').addEventListener('click',closeSidebar);
  $('export-button').addEventListener('click',()=>beginExport(currentCalls));
  $('subscribe-button').addEventListener('click',openSubscriptions);
  $('confirm-export').addEventListener('click',()=>{const include=$('include-date-only').checked;if(!C.eligibleNodes(exportCalls,include).length){$('export-message').textContent='没有可导出的已确认时刻；需要日期提示时，请勾选上方选项。';return;}download(C.createICS(exportCalls,D.venues,{includeDateOnly:include}),'CommDDL-'+D.meta.updatedAt+'.ics','text/calendar;charset=utf-8');$('export-dialog').close();notify('日历文件已生成；导入后为一次性快照。');});
  $('backup-favorites').addEventListener('click',()=>download(JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:[...favorites]},null,2),'CommDDL-收藏备份.json','application/json;charset=utf-8'));
  $('import-favorites').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>256000)throw new Error('文件过大，请选择 CommDDL 收藏备份。');const items=C.cleanFavorites(JSON.parse(await file.text()),D);items.forEach(x=>favorites.add(x));save('commddl.favorites.v1',{version:1,items:[...favorites]});render();notify('已合并导入 '+items.length+' 项收藏。');}catch(err){notify(err.message||'备份文件无法读取。');}e.target.value='';});
  document.addEventListener('keydown',event=>{const card=event.target.closest?.('[data-venue-card],[data-call-card]');if(!card||event.target!==card||!['Enter',' '].includes(event.key))return;event.preventDefault();const key=card.dataset.venueCard?'venue:'+card.dataset.venueCard:'call:'+card.dataset.callCard;openDetail(key,true,card);});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();if(state.view==='about')navigate('deadlines');$('search').focus();}if(e.key==='Escape')closeSidebar();});
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
  window.addEventListener('hashchange',()=>{readHash();render();const item=new URLSearchParams(location.hash.split('?')[1]||'').get('item');if(item)openDetail(item);});
  const adminLink=$('admin-settings-link'),adminDot=$('admin-settings-dot');if(adminLink&&/^https:\/\//i.test(D.meta.adminPortalUrl||'')){adminLink.href=D.meta.adminPortalUrl;adminLink.hidden=false;adminDot.hidden=false;}
  readHash();hydrateIcons();render();updateClock();setInterval(()=>{updateClock();render();},60000);
  setInterval(()=>document.querySelectorAll('[data-countdown]').forEach(el=>{el.textContent=C.countdown(el.dataset.countdown)||'截止日期';}),1000);
  const item=new URLSearchParams(location.hash.split('?')[1]||'').get('item');if(item)openDetail(item);
})();
