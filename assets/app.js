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
  let topicsExpanded = false;
  const kindLabels = {all:'全部',conference:'会议主会',special:'期刊专题',workshop:'附属研讨会',series:'持续栏目',journal:'期刊'};
  const pageNames = {deadlines:'截稿日历',conferences:'会议目录',journals:'期刊目录',favorites:'我的关注',about:'来源与维护说明'};
  const headings = {
    deadlines:['把握下一次投稿机会','会议、期刊与专题征稿，按你的研究方向聚合。'],
    conferences:['通信会议目录','按主题、CCF 与 ICORE 等级查找会议系列。'],
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
  const state = {view:'deadlines',area:'',topics:[],kind:'all',query:'',window:'',sort:'deadline',showPast:false,historical:false,includeArchived:false,grades:[],grade:'',catalogStatus:'',index:'',layout:'list',zone:zones.includes(prefs.zone)?prefs.zone:'Asia/Shanghai',journalType:'all',month:C.dateInZone(Date.now()).slice(0,7)};
  let currentCalls = [], currentVenues = [], exportCalls = [], toastTimer;
  function readHash() {
    const [view, query = ''] = location.hash.slice(1).split('?');
    const p = new URLSearchParams(query);
    state.view = Object.hasOwn(pageNames, view) ? view : 'deadlines';
    state.area = areaLabels.has(p.get('area')) ? p.get('area') : '';
    state.topics = C.cleanTopics((p.get('topics') || '').split(','), D.topics, state.area);
    state.query = p.get('q') || '';
    state.index = ['SCIE','ESCI','unlisted','pending'].includes(p.get('index')) ? p.get('index') : '';
    state.grade = Array.from($('grade-filter').options).some(o=>o.value===p.get('grade')) ? p.get('grade') : '';
    state.catalogStatus = ['', 'current','needs-review','historical-only'].includes(p.get('status')) ? p.get('status') : '';

    state.kind = Object.hasOwn(kindLabels, p.get('kind')) ? p.get('kind') : 'all';
    state.grades=C.cleanGrades((p.get('ranks')||state.grade).split(','),directoryKind());
    state.grade='';
    state.window = ['7','30','90','180'].includes(p.get('within')) ? p.get('within') : '';
    state.includeArchived = p.get('archive') === '1';
    state.showPast = p.get('past') === '1'; state.historical = p.get('history') === '1';
    state.layout = p.get('layout') === 'calendar' ? 'calendar' : 'list';
    state.sort = p.get('sort') === 'name' ? 'name' : 'deadline';
    state.journalType = p.get('type') || 'all';
    if((directoryKind()==='conference'&&/^(jcr|cas):/.test(state.grade))||(directoryKind()==='journal'&&state.grade.startsWith('core:')))state.grade='';
    if(!isVenueView()){state.grades=[];state.grade='';state.catalogStatus='';state.index='';}
    if(!isVenueView()||directoryKind()!=='journal')state.index='';
    state.month = /^\d{4}-(0[1-9]|1[0-2])$/.test(p.get('month') || '') ? p.get('month') : C.dateInZone(Date.now(), state.zone).slice(0,7);
  }
  function syncHash() {
    const p = new URLSearchParams();
    if (state.includeArchived) p.set('archive','1');
    if (state.index) p.set('index',state.index);
    if (state.grades.length) p.set('ranks',state.grades.join(','));
    if (state.catalogStatus) p.set('status',state.catalogStatus);
    if (state.area) p.set('area',state.area);
    if (state.topics.length) p.set('topics',state.topics.join(','));
    if (state.query) p.set('q',state.query);
    if (state.kind !== 'all') p.set('kind',state.kind);
    if (state.window) p.set('within',state.window);
    if (state.showPast) p.set('past','1');
    if (state.historical) p.set('history','1');
    if (state.layout === 'calendar') {p.set('layout','calendar');p.set('month',state.month);}
    if (state.sort === 'name') p.set('sort','name');
    if (state.journalType !== 'all') p.set('type',state.journalType);
    history.replaceState(null,'','#' + state.view + (p.size ? '?' + p : ''));
  }
  function notify(text) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'),3200); }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('sidebar-backdrop').classList.remove('visible'); $('mobile-menu').setAttribute('aria-expanded','false'); }
  function navigate(view) { state.view=view;state.kind='all';state.query='';state.window='';state.historical=false;state.includeArchived=false;state.grades=[];state.grade='';state.catalogStatus='';state.index='';state.journalType='all';state.layout='list';closeSidebar();syncHash();render();window.scrollTo({top:0,behavior:'instant'}); }
  function toggleFavorite(key) {
    favorites.has(key) ? favorites.delete(key) : favorites.add(key);
    save('commddl.favorites.v1',{version:1,items:[...favorites]}); render();
    if ($('detail-dialog').open && $('detail-content').dataset.item) openDetail($('detail-content').dataset.item, false);
    notify(storageWorks ? (favorites.has(key) ? '已加入关注' : '已取消关注') : '当前浏览器不允许保存，收藏仅在本次打开期间保留。');
  }
  function favoriteButton(key, name) { return `<button class="bookmark-button ${favorites.has(key)?'saved':''}" data-favorite="${esc(key)}" aria-label="${favorites.has(key)?'取消关注':'关注'} ${esc(name)}" aria-pressed="${favorites.has(key)}">${icon('bookmark')}</button>`; }
  const areaTags = ids => [...new Set(ids)].slice(0,3).map(id=>`<span class="tag">${esc(areaLabels.get(id)||id)}</span>`).join('');
  const topicTags = (ids, limit = 3) => [...state.topics.filter(id=>(ids||[]).includes(id)),...(ids||[]).filter(id=>!state.topics.includes(id))].slice(0,limit).map(id => `<span class="tag topic-tag">${esc(topicLabels.get(id)||id)}</span>`).join('');
  const historicalTags = v => (v.assessments||[]).some(a=>a.system==='bupt-ict-2018') ? '<span class="tag historical" title="2018 年历史文件，不代表现行通用认定">2018 重要会议表</span>' : '';
  const evaluationLabels={jcr:'JCR',cas:'中科院',ccf:'CCF',core:'ICORE'};
  const statusLabels={verified:'已核验',reported:'转录，待原库复核',pending:'待核验','not-matched':'证据不足','unlisted':'未列入','unresolved':'证据不足','not-applicable':'不适用','scope-review':'更名／合并对应未明确','non-ranked':'原库非等级状态'};
  function evaluationText(e) {const nonRank={'Unranked':'未评级','Multiconference':'综合会议状态','National: USA':'区域状态（美国）','National/Regional':'国家／区域状态','journal published':'期刊发表模式（未给等级）','unranked: merged':'已合并，未评级','National: France':'区域状态（法国）','National:India':'区域状态（印度）'};return evaluationLabels[e.system]+' '+e.year+' '+(e.value ? e.system==='cas'?['','一区','二区','三区','四区'][+e.value]:(nonRank[e.value]||e.value):statusLabels[e.status]);}
  function indexingBadge(v) {
    if(v.kind!=='journal')return '';
    const status=C.indexingStatus(v),ix=v.indexing;
    const text=status==='pending'?'索引 · 证据不足':status==='unlisted'?'所查索引未列入':status;
    return `<span class="tag rating-tag" title="${esc(ix?.note||'收录证据不足')}">${esc(text)}${ix?.status==='reported'?' · '+esc(ix.year||ix.snapshotDate?.slice(0,4)||'来源')+'转录':''}</span>`;
  }
  function evaluationTags(v) {
    const tags=[...(v.evaluations||[])].sort((a,b)=>['jcr','cas','ccf','core'].indexOf(a.system)-['jcr','cas','ccf','core'].indexOf(b.system)).filter(e=>e.status!=='not-applicable').map(e=>`<span class="tag rating-tag ${['pending','not-matched','scope-review','unresolved'].includes(e.status)?'evidence-gap':''}" title="${esc((e.sourceTitle||'')+'；'+e.note)}">${esc(evaluationText(e))}${e.sourceType==='document-copy'?' · 副本':e.sourceType==='secondary'&&['verified','reported','unlisted'].includes(e.status)?' · 转录':''}</span>`).join('');
    return `<div class="tags rating-tags" aria-label="收录与评级属性">${indexingBadge(v)}${(v.otherIndexes||[]).map(e=>`<span class="tag rating-tag" title="${esc(e.note)}">${esc(e.value)}</span>`).join('')}${tags}</div>`;
  }
  function evidenceRecord(e, label) {
    return `<div class="evaluation-record"><div><strong>${esc(label)}</strong><span>${esc(statusLabels[e.status]||e.status)}</span></div>${e.category?`<p>学科 / 口径：${esc(e.category)}</p>`:''}${e.categories?.length?`<p>各学科分区：${e.categories.map(c=>esc(c.category)+' '+esc(c.value)).join('；')}</p>`:''}${e.minorCategories?.length?'<p>小类：'+e.minorCategories.map(m=>esc(m.category)+' '+m.quartile+'区').join('；')+'</p>':''}${e.appliesToName?`<p>原记录名称：${esc(e.appliesToName)}</p>`:''}${e.sheet?`<p>表内位置：${esc(e.sheet)} · 第 ${esc(e.row||'—')} 行</p>`:''}<p>${esc(e.note)}</p>${e.sourceUrl?`<a href="${safeURL(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(e.sourceTitle||'核验来源')}${e.page?' · 第 '+e.page+' 页':''} ↗</a>`:''}<small>复查 ${esc(e.reviewedAt||e.verifiedAt||'日期未记录')}${e.snapshotDate?' · 来源快照 '+esc(e.snapshotDate):''}</small>${e.attempts?.length?`<details><summary>查看核验记录</summary>${e.attempts.map(a=>`<p>${esc(typeof a==='string'?a:a.note||a.result||JSON.stringify(a))}</p>`).join('')}</details>`:''}${e.officialUrl?`<a href="${safeURL(e.officialUrl)}" target="_blank" rel="noopener noreferrer">原库入口 ↗</a>`:''}</div>`;
  }
  function evaluationDetails(v) {
    return '<h3>收录与评级属性</h3><p class="muted">JCR（期刊引证报告）、中科院分区、CCF（中国计算机学会）与 ICORE（国际合作会议评级）各自独立。SCIE（科学引文索引扩展版）与 ESCI（新兴来源引文索引）分别记录。</p>'+(v.kind==='journal'?evidenceRecord(v.indexing,'索引 · '+(v.indexing.value||statusLabels[v.indexing.status]))+(v.otherIndexes||[]).map(e=>evidenceRecord(e,'索引 · '+e.value)).join(''):'')+[...(v.evaluations||[])].sort((a,b)=>['jcr','cas','ccf','core'].indexOf(a.system)-['jcr','cas','ccf','core'].indexOf(b.system)).map(e=>evidenceRecord(e,evaluationText(e))).join('');
  }
  function catalogTag(v) {return v.catalogStatus==='historical-only'?'<span class="tag historical">仅历史记录</span>':v.catalogStatus==='needs-review'?'<span class="tag rating-pending">当前信息待核验</span>':'';}
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
    const labels={date:s.days===0?'今日日期 · 时刻待确认':`${s.days} 个日历日后`,upcoming:s.days===0?'今日截止':`${s.days} 天后截止`,closed:'已截止','past-date':'公布日期已过',pending:'投稿时间待核验',rolling:'持续征稿',restricted:'仅限已完成前置步骤者',conflict:'来源冲突',cancelled:'已取消'};
    const css=['closed','past-date','pending','cancelled'].includes(s.code)?'pending':['conflict','restricted'].includes(s.code)?'warning':s.days!==null&&s.days<=30?'soon':'';
    return {...s,label:labels[s.code],css};
  }
  function nodeDateText(node) {
    if (!node) return '待公布';
    if(node.precision==='instant'&&C.parseInstant(node.instant)!==null) return new Intl.DateTimeFormat('zh-CN',{timeZone:state.zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(node.instant));
    if(node.precision==='date') return node.date;
    return '待确认';
  }
  function deadlineBox(call) {
    const n=C.primaryNode(call), st=stateDisplay(call);
    let date='<span class="deadline-date" style="font-size:17px">待核验</span>',label='投稿日期',note='保留官方入口';
    if(n&&n.precision==='date') {const [y,m,d]=n.date.split('-');date=`<span class="deadline-date">${m}.${d}<small>${y}</small></span>`;label=n.label+' · 仅日期';note='具体钟点 / 时区待确认';}
    if(n&&n.precision==='instant') {date=`<span class="deadline-date" style="font-size:16px">${esc(nodeDateText(n))}</span>`;label=n.label;note=state.zone==='Asia/Shanghai'?'北京时间':'所选显示时区';}
    if(st.code==='rolling') {date='<span class="deadline-date" style="font-size:17px">持续接收</span>';label='征稿方式';note='以官方栏目要求为准';}
    const live = n?.precision==='instant' && st.code==='upcoming' ? ` data-countdown="${esc(n.instant)}"` : '';
    return `<div class="deadline-box"><div><div class="deadline-label">${icon('calendar')}${esc(label)}</div>${date}</div><div class="deadline-status"><span class="status-pill ${st.css}"${live}>${esc(live?C.countdown(n.instant):st.label)}</span><small>${note}</small></div></div>`;
  }
  function callCard(call) {
    const v=venues.get(call.venueId);
    const history='';
    return `<article class="opportunity-card" data-call-card="${call.id}"><div class="card-top"><span class="venue-mark">${esc(v.short)}</span><span class="type-tag ${call.kind}">${kindLabels[call.kind]}</span>${favoriteButton('call:'+call.id,call.title)}</div><h3 class="card-title"><button data-detail="call:${call.id}">${esc(call.title)}</button></h3><p class="card-title-en">${esc(call.titleEn)}</p><div class="tags">${areaTags(call.areas||v.areas)}${history}</div>${deadlineBox(call)}<div class="metadata-row"><span>${icon(call.location?'pin':'book')}${esc(call.location||v.nameZh)}</span><span>${icon('shield')}${call.verification==='verified'?'核验 '+esc(call.verifiedAt):'具体届次待核验'}</span></div><div class="card-footer"><button class="detail-button" data-detail="call:${call.id}">征稿详情 <span>→</span></button><a href="${safeURL(call.sourceUrl)}" target="_blank" rel="noopener noreferrer">官方来源 ${icon('external')}</a></div></article>`;
  }
  function venueCard(v) {
    return `<article class="opportunity-card journal-card" data-venue-card="${v.id}"><div class="card-top"><span class="venue-mark">${esc(v.short)}</span><span class="type-tag">${esc(v.publicationType)}</span>${favoriteButton('venue:'+v.id,v.nameZh)}</div><h3 class="card-title"><button data-detail="venue:${v.id}">${esc(v.nameZh)}</button></h3><p class="card-title-en">${esc(v.nameEn)}</p><div class="tags">${areaTags(v.areas)}${v.catalogScope==='archive'?'<span class="tag historical">历史参考库</span>':''}${catalogTag(v)}</div><div class="tags specific-topics">${topicTags(v.topics)}</div>${evaluationTags(v)}<div class="card-footer"><button class="detail-button" data-detail="venue:${v.id}">属性与来源 <span>→</span></button><a href="${safeURL(v.url)}" target="_blank" rel="noopener noreferrer">${v.urlLabel||(v.verification==='pending'?'来源入口':'官方入口')} ${icon('external')}</a></div></article>`;
  }

  function directoryKind() {
    if(state.view==='favorites'&&state.kind==='all')return undefined;
    return state.view==='conferences'||(state.view==='favorites'&&state.kind==='conference')?'conference':'journal';
  }
  function includeFollowedVenues() {return state.view==='favorites'&&['all','conference'].includes(state.kind)&&!state.window;}
  function filterVenues() {
    return C.filterVenues(D.venues,{...state,taxonomy:D.topics,venueKind:directoryKind(),favoriteOnly:state.view==='favorites',favorites:[...favorites]});
  }
  function renderTopics() {
    const available=D.topics.filter(t=>!state.area||t.areas.includes(state.area));
    const featured=['physical','mimo','channel-coding','estimation-sync','isac','fiber','satellite-ntn','navigation-pnt','iot-sensing','ai-communications'];
    const visible=topicsExpanded||state.area?available:available.filter(t=>featured.includes(t.id)||state.topics.includes(t.id));
    const vv=isVenueView(), mixed=includeFollowedVenues();
    const context={...state,topics:[],taxonomy:D.topics,favoriteOnly:state.view==='favorites',favorites:[...favorites]};
    const calls=vv?[]:C.filterCalls(D.calls,D.venues,context);
    const list=vv||mixed?C.filterVenues(D.venues,{...context,venueKind:directoryKind()}):[];
    $('topic-panel').innerHTML=`<div class="topic-heading"><div><strong>研究主题</strong><span>${state.area?esc(areaLabels.get(state.area))+' · ':''}${available.length} 个主题 · 多选匹配任一项</span></div><div>${state.topics.length?'<button data-clear="topics" class="topic-text-button">清除主题</button>':''}${!state.area?`<button data-topic-expand="toggle" class="topic-text-button" aria-expanded="${topicsExpanded}">${topicsExpanded?'收起主题':'展开全部主题'} ${topicsExpanded?'↑':'↓'}</button>`:''}</div></div><div class="topic-chips" role="group" aria-label="具体研究主题，多选匹配任一项">${visible.map(t=>{const count=calls.filter(c=>(c.topics||venues.get(c.venueId).topics).includes(t.id)).length+list.filter(v=>v.topics.includes(t.id)).length;return `<button class="topic-chip ${state.topics.includes(t.id)?'selected':''}" data-topic="${t.id}" aria-pressed="${state.topics.includes(t.id)}">${esc(t.label)}<span>${count}</span></button>`;}).join('')}</div>`;
    if(state.topics.length)$('topic-panel').querySelector('.topic-heading>div:last-child').insertAdjacentHTML('afterbegin','<button data-share-filters="copy" class="topic-text-button">分享筛选</button>');
  }
  function renderAttributes() {
    const kind=directoryKind(),systems=kind==='conference'?['ccf','core']:['jcr','cas','ccf'];
    const values={jcr:['Q1','Q2','Q3','Q4','N'],cas:['1','2','3','4','N'],ccf:['A','B','C','N'],core:['A*','A','B','C','N']};
    $('attribute-panel').innerHTML=`<div class="attribute-heading"><strong>评级属性</strong><span>同体系多选 · 不同体系组合</span>${state.grades.length?'<button class="topic-text-button" data-clear="grades">清除评级</button>':''}</div>`+systems.map(sys=>`<div class="attribute-row" role="group" aria-label="${evaluationLabels[sys]} 等级"><span>${evaluationLabels[sys]}</span><button class="rank-chip ${!state.grades.some(r=>r.startsWith(sys+':'))?'selected':''}" data-rank-reset="${sys}" aria-pressed="${!state.grades.some(r=>r.startsWith(sys+':'))}">全部</button>${values[sys].map(value=>{const key=sys+':'+value;const label=value==='N'?'未列入':sys==='cas'?value+'区':value;return `<button class="rank-chip ${state.grades.includes(key)?'selected':''}" data-rank="${key}" aria-pressed="${state.grades.includes(key)}">${esc(label)}</button>`;}).join('')}</div>`).join('');
  }
  function renderActiveFilters() {
    const items=[];
    if(state.area)items.push(['area',areaLabels.get(state.area)]);
    if(state.topics.length)items.push(['topics','主题：'+state.topics.map(id=>topicLabels.get(id)).join(' / ')]);
    if(state.index)items.push(['index',$('index-filter').selectedOptions[0]?.textContent||state.index]);
    if(state.query)items.push(['query','搜索：'+state.query]);
    if(isVenueView()&&state.grades.length)items.push(['grades',state.grades.map(r=>{const [sys,val]=r.split(':');return evaluationLabels[sys]+' '+(val==='N'?'未列入':val);}).join(' / ')]);
    if(isVenueView()&&state.catalogStatus)items.push(['catalogStatus',$('catalog-status').selectedOptions[0]?.textContent||state.catalogStatus]);
    if(state.window&&!isVenueView())items.push(['window','未来 '+state.window+' 天']);
    if(state.includeArchived)items.push(['includeArchived','包含历史参考库']);
    if(state.historical)items.push(['historical','2018 历史目录']);
    $('active-filters').innerHTML=items.map(([key,label])=>`<span class="active-filter">${esc(label)}<button data-clear="${key}" aria-label="清除 ${esc(label)}">×</button></span>`).join('');
  }
  function emptyHTML(venueView) {return `<div class="empty-state"><div class="empty-symbol">${icon(state.view==='favorites'?'bookmark':'search')}</div><h3>${state.view==='favorites'?'这里还没有符合条件的关注':'没有找到符合条件的结果'}</h3><p>${state.view==='favorites'?'点击活动或期刊右上角的书签，建立自己的投稿清单。':'可以清除筛选，或到官方入口继续查找。'}</p><button class="button button-subtle" data-reset="all">清除筛选</button></div>`;}
  function render() {
    renderSidebar();renderStats();
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
    $('evaluation-filters').hidden=!vv; $('attribute-panel').hidden=!vv;
    Array.from($('grade-filter').querySelectorAll('optgroup')).forEach(g=>{const sys=g.querySelector('option').value.split(':')[0];g.disabled=(directoryKind()==='conference'&&['jcr','cas'].includes(sys))||(directoryKind()==='journal'&&sys==='core');g.hidden=g.disabled;});
    $('index-filter-label').hidden=!vv||directoryKind()!=='journal'; $('index-filter').value=state.index;
    $('grade-filter').value=state.grade; $('catalog-status').value=state.catalogStatus;
    $('search').value=state.query;$('time-window').value=state.window;$('sort').value=state.sort;$('show-past').checked=state.showPast;$('historical-only').checked=state.historical;$('timezone').value=state.zone;
    $('time-window').hidden=vv;$('view-switch').hidden=vv;$('past-filter-label').hidden=vv;$('timezone').parentElement.hidden=vv;
    $('history-filter-label').hidden=true; $('archive-filter-label').hidden=!vv; $('include-archived').checked=state.includeArchived;
    $('date-note').hidden=vv;
    $('favorites-tools').hidden=state.view!=='favorites';
    $('sort').options[0].textContent=vv?'默认顺序':'按截止日期';
    $('list-view').classList.toggle('selected',state.layout==='list');$('calendar-view').classList.toggle('selected',state.layout==='calendar');
    $('list-view').setAttribute('aria-pressed',state.layout==='list');$('calendar-view').setAttribute('aria-pressed',state.layout==='calendar');
    renderActiveFilters();
    currentCalls=C.filterCalls(D.calls,D.venues,{...state,taxonomy:D.topics,favoriteOnly:state.view==='favorites',favorites:[...favorites]});
    const mixedFavorites=includeFollowedVenues();
    currentVenues=vv||mixedFavorites?filterVenues():[];
    const count=vv?currentVenues.length:currentCalls.length+(mixedFavorites?currentVenues.length:0);
    $('results-title').innerHTML=esc(vv?(state.view==='conferences'?'会议系列':'期刊目录'):(state.area?areaLabels.get(state.area):state.view==='favorites'?'关注清单':'全部投稿机会'))+` <span>${count} ${vv?(state.view==='conferences'?'个系列':'本期刊'):'项'}</span>`;
    $('result-caption').textContent=vv?'主题分类 × 收录与评级属性':'具体时间与要求以官方征稿页为准';
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
  function sourceBox(item) {return `<div class="source-box"><p><strong>${item.sourceType==='historical-document'?'历史文件记录':item.sourceType==='community'?'社区线索，官方待核验':item.verification==='verified'?'载体身份来源已读取':'待核验记录'}</strong> · ${item.verifiedAt?'最近核验 '+esc(item.verifiedAt):'具体投稿信息尚未确认'}</p><a href="${safeURL(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceUrl)} ↗</a></div>`;}
  function showDialog(id) {const dialog=$(id);if(!dialog.open)dialog.showModal();}
  function openDetail(key, show=true) {
    const [type,id]=key.split(':');const item=type==='call'?D.calls.find(c=>c.id===id):venues.get(id);if(!item)return;
    const isCall=type==='call',v=isCall?venues.get(item.venueId):item;
    const st=isCall?stateDisplay(item):null;
    let content=`<div class="dialog-top"><span class="eyebrow">${isCall?'CALL FOR PAPERS · 征稿详情':'VENUE DIRECTORY · 发表载体'}</span><button class="icon-button" data-close="detail-dialog" aria-label="关闭详情">${icon('close')}</button></div><div class="card-top"><span class="venue-mark">${esc(v.short)}</span><span class="type-tag ${isCall?item.kind:''}">${esc(isCall?kindLabels[item.kind]:item.publicationType)}</span>${favoriteButton(key,isCall?item.title:item.nameZh)}</div><h2 id="detail-heading">${esc(isCall?item.title:item.nameZh)}</h2><div class="detail-en">${esc(isCall?item.titleEn:item.nameEn)}</div><div class="tags">${areaTags(item.areas||v.areas)}</div>${isCall?`<p class="detail-summary">${esc(item.summary)}</p>`:""}<h3>研究主题</h3><div class="tags">${topicTags(item.topics||v.topics,99)}</div>`;
    if(isCall) {
      content+=`<div class="detail-meta">${item.location?'<span>'+esc(item.location)+'</span>':''}${item.eventDates?'<span>召开日期：'+esc(item.eventDates)+'</span>':''}${item.publication?'<span>预计出版：'+esc(item.publication)+'</span>':''}<span>${esc(st.label)}</span></div>`;
      if(item.nodes.length)content+='<h3>投稿时间线</h3><div class="timeline">'+item.nodes.map(n=>`<div class="timeline-row ${n.primary?'primary':''}"><div><strong>${esc(n.label)}</strong><small>${esc(n.original)}${(n.requires||[]).length?' · 有前置步骤':''}</small></div><div class="timeline-time">${esc(nodeDateText(n))}<small>${n.precision==='date'?'仅日期 · 钟点 / 时区待确认':n.precision==='instant'?esc(n.timezone||'明确时刻'):'待公布'}</small></div></div>`).join('')+'</div>';
      else content+=`<div class="notice dialog-notice">${icon('info')}<p>${item.status==='rolling'?'这是持续征稿栏目，按官方栏目要求提交。':'本版尚未确认具体投稿截止，请进入官方入口核对最新公告。'}</p></div>`;
      if(item.notes)content+=`<h3>投稿说明</h3><p>${esc(item.notes)}</p>`;
      if(item.history.length)content+='<h3>变更记录</h3>'+item.history.map(h=>`<p>${esc(h.date)} · ${esc(h.note)}</p>`).join('');
    } else {
      content+=`<div class="detail-meta"><span>${esc(v.publicationType)}</span><span>稿件类型：${esc(v.articleTypes.join(' / '))}</span>${v.kind==='journal'?'<span>投稿方式：'+esc(v.submissionMode)+'</span>':''}</div>`;
      if(v.identityNote)content+='<h3>系列记录</h3><p>'+esc(v.identityNote)+'</p>';
      if(v.aliases?.length)content+='<h3>别名与旧名称</h3><p>'+esc(v.aliases.join(' / '))+'</p>';
      if(v.authorGuideUrl||v.cfpUrl)content+='<h3>投稿与征稿入口</h3><div class="resource-links">'+(v.authorGuideUrl?`<a href="${safeURL(v.authorGuideUrl)}" target="_blank" rel="noopener noreferrer">作者指南 ↗</a>`:'')+(v.cfpUrl?`<a href="${safeURL(v.cfpUrl)}" target="_blank" rel="noopener noreferrer">专题征稿 / 公告 ↗</a>`:'')+'</div>';
      const related=D.calls.filter(c=>c.venueId===v.id);
      if(related.length)content+='<h3>关联征稿与届次</h3>'+related.map(c=>`<div class="feed-row"><div><strong>${esc(c.title)}</strong><small>${esc(stateDisplay(c).label)}</small></div><button data-detail="call:${c.id}">查看 →</button></div>`).join('');
      content+=evaluationDetails(v);
    }
    content+='<h3>来源与核验</h3>'+sourceBox(item)+`<div class="dialog-actions"><a class="button button-primary" href="${safeURL(item.url)}" target="_blank" rel="noopener noreferrer">${icon('external')}${item.sourceType==='historical-document'||item.verification==='pending'?'打开来源页面':'打开官方页面'}</a>${isCall&&C.eligibleNodes([item],true).length?`<button class="button button-subtle" data-export-call="${item.id}">${icon('download')}导出日期</button>`:''}<button class="button button-subtle" data-copy-detail="${esc(key)}">复制分享链接</button></div>`;
    $('detail-content').innerHTML=content;$('detail-content').dataset.item=key;if(show)showDialog('detail-dialog');
  }
  function renderAbout() {
    const active=activeVenues(),archives=D.venues.length-active.length;
    $('about-content').innerHTML=`<div class="about-grid"><section class="about-panel"><h2>通信发表载体目录</h2><p>${active.filter(v=>v.kind==='journal').length} 本期刊、${active.filter(v=>v.kind==='conference').length} 个会议系列，${D.areas.length} 个研究方向、${D.topics.length} 个主题。另保留 ${archives} 个历史参考条目。</p><p>目录、会议届次和期刊专题分别维护，常规期刊不会自动生成截稿时间。</p></section><section class="about-panel"><h2>主题与属性</h2><p>参考 CCFDDL（计算机会议截稿日历），将主题分类与评级属性分开。先选方向，再选细分主题；多个主题匹配任一项，可继续叠加评级和搜索条件。</p><p>SCIE（科学引文索引扩展版）、ESCI（新兴来源引文索引）、JCR（期刊引证报告）、中科院分区、CCF（中国计算机学会）和 ICORE（国际合作会议评级）各自独立，不能互相替代。EI（工程索引）、CSCD（中国科学引文数据库）及 Scopus（摘要与引文数据库）也作为独立索引属性。</p></section><section class="about-panel wide"><h2>评级版本与核验</h2><p>${D.ratingSystems.map(r=>esc(r.label)+' '+r.year+'：'+esc(r.note)).join('<br>')}</p><p>“未列入”表示已核对所列版本的完整目录；“证据不足”表示已检查，但公开来源仍无法确定。转录记录注明原始年份和来源。非等级状态按评级库原文保留。</p><div class="resource-links">${D.ratingSystems.map(r=>`<a href="${safeURL(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.label)} 来源 ↗</a>`).join('')}</div></section><section class="about-panel"><h2>日期与日历</h2><p>明确时刻才换算时区并倒计时。仅公布日期的活动保留为全天提示，不补造钟点和时区。往届日期不会平移到下一届。</p><p>导出为一次性快照；订阅可接收发布后的变化，刷新频率由日历客户端决定。</p></section><section class="about-panel"><h2>收藏与历史参考</h2><p>收藏保存在当前浏览器，可备份导入。已有收藏保留稳定编号；历史参考库中的收藏仍可在“我的关注”找到。</p><p>早期学校目录的 89 条对应关系保存在项目文档中，用于追溯更名、重复与原始记录。</p></section><section class="about-panel wide"><h2>信息来源</h2><div class="source-list">${D.sources.map(s=>`<div class="source-item"><a href="${safeURL(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><small>读取 ${esc(s.verifiedAt)}</small></div>`).join('')}</div></section><section class="about-panel wide"><h2>维护与贡献</h2><p>欢迎补充通信相关期刊、会议和日期，纠错时请附官方来源。CommDDL 参考 CCFDDL 的分类和日历思路，页面与数据独立实现。</p><a href="${safeURL(D.meta.repository)}" target="_blank" rel="noopener noreferrer">项目与贡献说明 ↗</a> · <a href="https://github.com/ccfddl/ccf-deadlines" target="_blank" rel="noopener noreferrer">CCFDDL 原项目 ↗</a></section></div>`;
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
    const b=event.target.closest('button, a');if(!b)return;
    if(b.dataset.view){event.preventDefault();navigate(b.dataset.view);}
    else if(b.dataset.area){state.area=state.area===b.dataset.area?'':b.dataset.area;state.topics=C.cleanTopics(state.topics,D.topics,state.area);syncHash();render();}
    else if(b.dataset.topic){const id=b.dataset.topic;state.topics=state.topics.includes(id)?state.topics.filter(t=>t!==id):[...state.topics,id];syncHash();render();document.querySelector(`[data-topic="${id}"]`)?.focus();}
    else if(b.dataset.topicExpand){topicsExpanded=!topicsExpanded;renderTopics();document.querySelector('[data-topic-expand]')?.focus();}
    else if(b.dataset.rank){state.grade='';state.grades=state.grades.includes(b.dataset.rank)?state.grades.filter(r=>r!==b.dataset.rank):[...state.grades,b.dataset.rank];syncHash();render();}
    else if(b.dataset.rankReset){state.grade='';state.grades=state.grades.filter(r=>!r.startsWith(b.dataset.rankReset+':'));syncHash();render();}
    else if(b.dataset.kind){state.kind=b.dataset.kind;state.grades=[];state.grade='';state.catalogStatus='';state.index='';syncHash();render();}
    else if(b.dataset.journalType){state.journalType=b.dataset.journalType;syncHash();render();}
    else if(b.dataset.favorite)toggleFavorite(b.dataset.favorite);
    else if(b.dataset.detail)openDetail(b.dataset.detail);
    else if(b.dataset.close)$(b.dataset.close).close();
    else if(b.dataset.exportCall)beginExport([D.calls.find(c=>c.id===b.dataset.exportCall)]);
    else if(b.dataset.copyFeed)copyText(b.dataset.copyFeed);
    else if(b.dataset.shareFilters){const url=new URL(D.meta.homepage);url.hash=location.hash;copyText(url.href);}
    else if(b.dataset.copyDetail){const url=new URL(D.meta.homepage||location.href);url.hash=state.view+'?'+new URLSearchParams({item:b.dataset.copyDetail});copyText(url.href);}
    else if(b.dataset.clear){state[b.dataset.clear]=['historical','includeArchived'].includes(b.dataset.clear)?false:['topics','grades'].includes(b.dataset.clear)?[]:'';syncHash();render();}
    else if(b.dataset.reset){state.query='';state.area='';state.topics=[];state.window='';state.historical=false;state.includeArchived=false;state.grades=[];state.grade='';state.catalogStatus='';state.index='';state.kind='all';state.journalType='all';syncHash();render();}
    else if(b.dataset.month){if(b.dataset.month==='today')state.month=C.dateInZone(Date.now(),state.zone).slice(0,7);else{const[y,m]=state.month.split('-').map(Number);state.month=new Date(Date.UTC(y,m-1+Number(b.dataset.month),1)).toISOString().slice(0,7);}syncHash();renderCalendar();}
  });
  $('search').addEventListener('input',e=>{state.query=e.target.value;syncHash();render();$('search').focus();});
  [['time-window','window'],['sort','sort'],['timezone','zone'],['grade-filter','grade'],['catalog-status','catalogStatus'],['index-filter','index']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.value;if(key==='zone'){save('commddl.preferences.v1',{zone:state.zone});updateClock();}syncHash();render();}));
  [['show-past','showPast'],['historical-only','historical'],['include-archived','includeArchived']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.checked;syncHash();render();}));
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
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();if(state.view==='about')navigate('deadlines');$('search').focus();}if(e.key==='Escape')closeSidebar();});
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
  window.addEventListener('hashchange',()=>{readHash();render();const item=new URLSearchParams(location.hash.split('?')[1]||'').get('item');if(item)openDetail(item);});
  readHash();hydrateIcons();render();updateClock();setInterval(updateClock,60000);
  setInterval(()=>document.querySelectorAll('[data-countdown]').forEach(el=>{el.textContent=C.countdown(el.dataset.countdown)||'时刻待确认';}),1000);
  const item=new URLSearchParams(location.hash.split('?')[1]||'').get('item');if(item)openDetail(item);
})();
