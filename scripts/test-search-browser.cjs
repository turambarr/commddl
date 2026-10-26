// Real Chromium interactions, isolated profile, no additional npm dependencies.
// Run with npm run test:browser. Node.js 22+ and Chrome/Chromium are required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const root=path.resolve(__dirname,'..','dist');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const binary=process.env.CHROME_BINARY||[
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'
].find(name=>fs.existsSync(name));
if(!binary||typeof WebSocket==='undefined')throw new Error('浏览器回归需要 Node.js 22+ 和 Chrome/Chromium；可设置 CHROME_BINARY。');
if(!fs.existsSync(path.join(root,'assets/data.js')))throw new Error('请先运行 npm run build。');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-search-browser-'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(file).pipe(res);
});
let chrome,socket,sequence=0;const pending=new Map(),errors=[],results=[];
async function command(method,params={}){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);
    pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const response=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);
  return response.result.value;
}
async function wait(expression){
  const deadline=Date.now()+12000;
  while(Date.now()<deadline){try{if(await evaluate(expression))return;}catch{}await pause(40);}
  throw new Error('Condition timed out: '+expression);
}
const quoted=JSON.stringify;
async function open(hash){
  await command('Page.navigate',{url:base+'/'+hash});
  await wait(`document.readyState==='complete' && typeof COMMDDL_DATA!=='undefined' && location.hash===${quoted(hash)} && document.querySelector('#results article, #results .empty-state, #results .no-exact-match')`);
}
async function click(selector){
  if(await evaluate(`Boolean(document.querySelector(${quoted(selector)})?.matches('.rank-chip') && document.querySelector('#attribute-panel').classList.contains('attributes-folded'))`))await click('[data-attribute-expand]');
  const point=await evaluate(`(async()=>{
    const el=document.querySelector(${quoted(selector)});
    if(!el)throw Error('Missing '+${quoted(selector)});
    el.scrollIntoView({block:'center'});
    let previous;
    for(let i=0;i<40;i++){
      await new Promise(resolve=>setTimeout(resolve,30));
      const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
      const hit=document.elementFromPoint(x,y);
      if(r.width&&r.height&&hit&&el.contains(hit)&&previous&&Math.abs(previous.x-x)<.5&&Math.abs(previous.y-y)<.5)return {x,y};
      previous={x,y};
    }
    throw Error('Control is not visible or is moving: '+${quoted(selector)});
  })()`);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}

async function fill(selector,text){
  await click(selector);
  await evaluate(`document.querySelector(${quoted(selector)}).select()`);
  await command('Input.insertText',{text});
}
async function setValue(selector,value){
  await evaluate(`(()=>{const el=document.querySelector(${quoted(selector)});el.value=${quoted(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
const rowIds=()=>evaluate(`[...document.querySelectorAll('#results [data-venue-card]')].map(el=>el.dataset.venueCard).sort()`);
const count=()=>evaluate(`document.querySelectorAll('#results article').length`);
async function test(name,fn){const start=Date.now();await fn();results.push({name,ms:Date.now()-start});console.log('✓ '+name);}
let base;
(async()=>{
  try{
    server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
    chrome=spawn(binary,['--headless=new','--no-sandbox','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1280,900','about:blank'],{stdio:['ignore','ignore','pipe']});
    let startupLog='';chrome.stderr.on('data',chunk=>{startupLog=(startupLog+chunk).slice(-4000);});
    const portFile=path.join(profile,'DevToolsActivePort');
    for(let i=0;i<200&&!fs.existsSync(portFile);i++){if(chrome.exitCode!==null)throw Error('Chrome exited early');await pause(50);}
    if(!fs.existsSync(portFile))throw new Error('Chrome 未开启调试端口：'+startupLog);
    const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
    const target=await (await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();
    socket=new WebSocket(target.webSocketDebuggerUrl);await once(socket,'open');
    socket.addEventListener('message',event=>{
      const message=JSON.parse(String(event.data));
      if(message.id){const entry=pending.get(message.id);pending.delete(message.id);if(entry)message.error?entry.reject(Error(message.error.message)):entry.resolve(message.result);}
      if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    });
    await command('Page.enable');await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await command('Page.addScriptToEvaluateOnNewDocument',{source:`{const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-23T00:00:00+08:00']));}static now(){return new RealDate('2026-10-23T00:00:00+08:00').getTime();}};}`});
    await test('搜索与属性按钮一致，方向和条件可见',async()=>{
      await open('#journals');await fill('#search','SCI 一区 无线');await wait(`document.querySelector('#results-title').textContent.includes('9 本')`);
      assert((await rowIds()).includes('jsac'));
      assert.equal(await evaluate(`Number(document.querySelector('[data-journal-type="all"] small').textContent)`),9);
      assert.equal(await evaluate(`Number(document.querySelector('[data-area="wireless"] span:last-child').textContent)`),9);
      assert(await evaluate(`document.querySelector('[data-index="SCIE"]').getAttribute('aria-pressed')==='true' && document.querySelector('[data-area="wireless"]').classList.contains('selected')`));
    });
    await test('搜索与按钮同体系多选，取消单个条件不遗留隐藏限制',async()=>{
      await click('[data-rank="cas:2"]');assert((await count())>9);
      await click('[data-filter-kind="grade"][data-filter-value="cas:1"]');
      assert(await evaluate(`!CommCore.parseVenueQuery(document.querySelector('#search').value,COMMDDL_DATA.topics).grades.includes('cas:1') && document.querySelector('[data-rank="cas:2"]').getAttribute('aria-pressed')==='true'`));
      await click('[data-index="SCIE"]');assert(await evaluate(`!CommCore.parseVenueQuery(document.querySelector('#search').value,COMMDDL_DATA.topics).indexes.length`));
      await click('[data-rank-reset="cas"]');assert(await evaluate(`!document.querySelector('[data-filter-kind="grade"]')`));
    });
    await test('索引切换与分面计数不被搜索旧条件锁死',async()=>{
      await open('#journals?q=SCI%20%E4%B8%80%E5%8C%BA');
      const expected=await evaluate(`CommCore.filterVenues(COMMDDL_DATA.venues,{venueKind:'journal',index:'ESCI',grades:['cas:1']}).length`);
      assert.equal(await evaluate(`Number(document.querySelector('[data-index="ESCI"] small').textContent)`),expected);
      await click('[data-index="ESCI"]');assert.equal(await count(),expected);
      assert(await evaluate(`!CommCore.parseVenueQuery(document.querySelector('#search').value).indexes.includes('SCIE')`));
    });
    await test('跨方向主题可选，切换方向和清除方向均保留主题',async()=>{
      await open('#journals?area=wireless&topics=optical-networks&q=JSAC');assert.equal(await count(),1);
      assert(await evaluate(`document.querySelector('[data-topic="optical-networks"]').getAttribute('aria-pressed')==='true'`));
      await click('[data-topic="optical-networks"]');
      assert(await evaluate(`!document.querySelector('[data-filter-value="optical-networks"]')`));
      await click('[data-topic-expand]');await click('[data-topic="optical-networks"]');
      await click('[data-area="optical"]');assert(await evaluate(`location.hash.includes('optical-networks') && !!document.querySelector('[data-filter-value="optical-networks"]')`));
      await click('#reset-area');assert.equal(await count(),1);
    });
    await test('分享地址刷新后保持筛选及显示时区',async()=>{
      await open('#journals?area=wireless&topics=optical-networks&q=JSAC&index=SCIE&ranks=cas%3A1&zone=America%2FLos_Angeles');
      await command('Page.reload');await wait(`document.readyState==='complete' && document.querySelector('#results article')`);
      assert.equal(await count(),1);assert.equal(await evaluate(`document.querySelector('#timezone').value`),'America/Los_Angeles');
      assert(await evaluate(`document.querySelector('[data-filter-value="optical-networks"]')!==null`));
    });
    await test('复制筛选包含最后一次输入，不等待防抖',async()=>{
      await evaluate(`(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__copied=value}});const el=document.querySelector('#search');el.value='SCI 一区 无线';el.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-share-filters]').click();})()`);
      assert.match(await evaluate('window.__copied'),/q=SCI/);
      await setValue('#timezone','Asia/Shanghai');await click('[data-share-filters]');
      assert.equal(await evaluate(`new URLSearchParams(new URL(window.__copied).hash.split('?')[1]).get('zone')`),'Asia/Shanghai');
    });
    await test('清空搜索不清除按钮条件，清除全部则解除全部过滤',async()=>{
      await open('#journals?index=SCIE&q=JSAC');await click('#clear-search');assert.equal(await count(),222);
      await open('#deadlines?past=1&history=1&within=custom&from=40&to=30&primary=1&area=wireless');
      await click('[data-reset="all"]');
      assert(await evaluate(`document.querySelector('#search').value==='' && !document.querySelector('#show-past').checked && !document.querySelector('#historical-only').checked && !document.querySelector('#primary-only').checked && document.querySelector('#days-from').value==='' && document.querySelector('#days-to').value===''`));
    });
    await test('中文输入过程中不重写输入框，输入结束才执行搜索',async()=>{
      await open('#journals');
      await evaluate(`(()=>{const el=document.querySelector('#search');el.focus();el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.value='无线';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'线'}));})()`);
      await pause(220);assert.equal(await evaluate(`document.querySelector('#search').value`),'无线');
      await evaluate(`document.querySelector('#search').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'无线'}))`);
      await wait(`document.querySelector('#results-title').textContent.includes('105 本')`);
      await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
      await wait(`document.querySelector('#search').value===''`);assert.equal(await count(),325);
    });
    await test('ISSN 与历史简称能找到目标期刊',async()=>{
      await open('#journals');await fill('#search','1536-1276');await wait(`document.querySelector('#results-title').textContent.includes('1 本')`);assert.deepEqual(await rowIds(),['twc']);
      await fill('#search','MWCL');await wait(`document.querySelector('[data-venue-card="mwtl"]')`);assert.deepEqual(await rowIds(),['mwtl']);
    });
    await test('日历搜索可转完整目录，保留关键词和方向',async()=>{
      await open('#deadlines?q=SCI%20%E4%B8%80%E5%8C%BA%20%E6%97%A0%E7%BA%BF&within=30');await click('[data-catalog-link="journals"]');
      assert.equal(await count(),9);assert.equal(await evaluate(`document.querySelector('#time-window').value`),'');
      await click('[data-view="conferences"]');assert((await count())>0);
      assert(await evaluate(`document.querySelector('#search').value.includes('无线') && !CommCore.parseVenueQuery(document.querySelector('#search').value).indexes.length`));
    });
    await test('名称搜索切换目录不会被静默清空',async()=>{
      await open('#deadlines?q=MWCL');await click('[data-view="journals"]');assert.equal(await evaluate(`document.querySelector('#search').value`),'MWCL');assert.deepEqual(await rowIds(),['mwtl']);
    });
    await test('30—40 天筛选进入月历后定位到实际结果月份',async()=>{
      await open('#deadlines?within=custom&from=30&to=40');assert(await evaluate(`document.querySelector('[data-call-card="secon-2027-main"]')!==null`));
      await click('#calendar-view');assert(await evaluate(`document.querySelector('.calendar-toolbar h3').textContent.includes('11 月') && document.querySelector('.calendar-event')!==null`));
    });
    await test('搜索内容作为文字显示，不能注入 HTML',async()=>{
      await open('#journals');await fill('#search','<img src=x onerror=alert(1)>');await wait(`document.querySelector('#results .empty-state')`);assert.equal(await evaluate(`document.querySelectorAll('#active-filters img').length`),0);
    });
    await test('快捷筛选保留刊名，并替换同体系旧分区',async()=>{
      await open('#journals?q=MWCL');await click('[data-preset="sci"]');assert.deepEqual(await rowIds(),['mwtl']);
      await open('#journals?q=SCI%20%E4%BA%8C%E5%8C%BA%20TWC');await click('[data-preset="sci1"]');assert.deepEqual(await rowIds(),['twc']);
      assert(await evaluate(`!document.querySelector('[data-filter-value="cas:2"]') && !!document.querySelector('[data-filter-value="cas:1"]')`));
    });
    await test('学校会议搜索与复选框同步，取消后解除该条件',async()=>{
      await open('#conferences?q=BUPT%E9%87%8D%E8%A6%81');assert.equal(await count(),87);
      assert(await evaluate(`document.querySelector('#historical-only').checked`));
      await click('#historical-only');assert.equal(await count(),340);
    });
    await test('搜索主题优先出现在卡片中，日期只关联匹配的专题',async()=>{
      await open('#journals?q=RIS');
      assert(await evaluate(`[...document.querySelectorAll('#results .specific-topics')].every(el=>el.firstElementChild.textContent===COMMDDL_DATA.topics.find(t=>t.id==='ris').label)`));
      await open('#journals?q=SCI%20%E5%85%89%E7%BD%91%E7%BB%9C%E4%B8%8E%E5%85%89%E4%BA%92%E8%BF%9E&within=30');
      assert(!(await rowIds()).includes('jsac'));
    });
    await test('空白自定义日期范围不会隐藏关注的常规期刊',async()=>{
      await open('#journals?q=TWC');await click('[data-favorite="venue:twc"]');
      await open('#favorites?within=custom');assert((await rowIds()).includes('twc'));
    });
    await test('拼写近似结果独立显示，改词按钮保留 SCI 和一区',async()=>{
      await open('#journals?q=SCI%20%E4%B8%80%E5%8C%BA%20wirelss');
      assert.equal(await count(),0);
      assert(await evaluate(`document.querySelector('#approximate-results [data-venue-card="twc"]')!==null && !document.querySelector('#approximate-results').hidden`));
      assert(await evaluate(`document.querySelector('#results-title').textContent.includes('准确匹配 0 项 · 近似 1 项')`));
      assert(await evaluate(`document.querySelector('#search').value==='SCI 一区 wirelss'`));
      await click('[data-search-correction]');assert((await rowIds()).includes('twc'));
      assert(await evaluate(`document.querySelector('#search').value==='SCI 一区 Wireless' && CommCore.parseVenueQuery(document.querySelector('#search').value,COMMDDL_DATA.topics).grades.includes('cas:1') && document.querySelector('#approximate-results').hidden`));
    });
    await test('短简称纠错提供候选，正确简称在分区不符时不被替换',async()=>{
      await open('#journals?q=TCW');assert.equal(await count(),0);
      assert.equal(await evaluate(`document.querySelector('#approximate-results [data-venue-card]').dataset.venueCard`),'twc');
      await open('#journals?q=TWC&ranks=cas%3A4');assert.equal(await count(),0);
      assert(await evaluate(`document.querySelector('#approximate-results').hidden && document.querySelector('#search').value==='TWC'`));
    });
    await test('缩写可对应主题，主题按钮与卡片仅显示原有名称',async()=>{
      await open('#journals?q=SOP');
      assert((await count())>0);const sopIds=await rowIds();
      assert(await evaluate(`!!document.querySelector('[data-filter-value="navigation-pnt"]') && !document.querySelector('[data-term-guide], .topic-acronyms, .topic-chip[title], .topic-tag[title]')`));
      await open('#journals?q=PNT');assert.deepEqual(await rowIds(),sopIds);
      assert(await evaluate(`document.querySelector('#search-hint').textContent==='搜索已识别：定位、导航与授时' && document.querySelector('[data-topic="navigation-pnt"]').textContent.replace(/\\d+$/,'')==='定位、导航与授时'`));
      await click('[data-filter-kind="topic"][data-filter-value="navigation-pnt"]');assert.equal(await count(),325);
    });
    await test('技术缩写和中英文全称与直接选择主题的结果一致',async()=>{
      await open('#journals?topics=navigation-pnt');const expected=await rowIds();assert(expected.length>0);
      for(const query of ['GNSS','Signals of Opportunity','机会信号定位']){
        await open('#journals?q='+encodeURIComponent(query));assert.deepEqual(await rowIds(),expected);
        assert(await evaluate(`!document.querySelector('[data-term-guide], .topic-acronyms')`));
      }
    });
    await test('明确名称优先排序，手选名称或日期排序及分享参数保持有效',async()=>{
      await open('#journals?q=TWC');assert.equal(await evaluate(`document.querySelector('#sort').value`),'auto');
      assert.equal(await evaluate(`document.querySelector('#results [data-venue-card]').dataset.venueCard`),'twc');
      await setValue('#sort','name');assert(await evaluate(`new URLSearchParams(location.hash.split('?')[1]).get('sort')==='name'`));
      await setValue('#sort','deadline');assert(await evaluate(`new URLSearchParams(location.hash.split('?')[1]).get('sort')==='deadline'`));
      await setValue('#sort','auto');assert(await evaluate(`!new URLSearchParams(location.hash.split('?')[1]).has('sort')`));
    });
    await test('近似会议征稿保留截止范围，选择后进入月历显示对应活动',async()=>{
      await open('#deadlines?q=Commnications&within=custom&from=30&to=40');
      assert(await evaluate(`document.querySelector('#approximate-results [data-call-card]')!==null`));
      assert(await evaluate(`(()=>{const allowed=new Set(CommCore.filterCalls(COMMDDL_DATA.calls,COMMDDL_DATA.venues,{window:'custom',daysFrom:'30',daysTo:'40'}).map(c=>c.id));return [...document.querySelectorAll('#approximate-results [data-call-card]')].every(el=>allowed.has(el.dataset.callCard));})()`));
      await click('[data-search-correction]');assert((await count())>0);
      await click('#calendar-view');assert(await evaluate(`document.querySelector('.calendar-event')!==null`));
    });
    await test('手机操作：方向选择后关闭导航，筛选和清除按钮可点击',async()=>{
      await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      await open('#journals?q=SCI');await command('Page.reload');await wait(`document.readyState==='complete' && document.querySelector('#results article')`);
      assert(await evaluate(`document.querySelector('#attribute-panel').classList.contains('attributes-folded') && document.querySelector('#active-filters').getBoundingClientRect().top<document.querySelector('#attribute-panel').getBoundingClientRect().top`));
      await click('#mobile-menu');await click('[data-area="wireless"]');
      assert(await evaluate(`new URLSearchParams(location.hash.split('?')[1]).get('area')==='wireless'`));
      assert(await evaluate(`!document.querySelector('#sidebar').classList.contains('open') && document.documentElement.scrollWidth<=innerWidth`));
      await click('[data-filter-kind="index"][data-filter-value="SCIE"]');
      assert.equal(await count(),105);assert(await evaluate(`!document.querySelector('[data-filter-kind="index"]')`));
    });
    await test('手机缩写检索与近似建议可用，主题保持简洁且无横向溢出',async()=>{
      await open('#journals?q=SCI%20%E4%B8%80%E5%8C%BA%20wirelss');await click('[data-search-correction]');assert((await rowIds()).includes('twc'));
      await open('#journals?q=PNT');assert((await count())>0);
      assert(await evaluate(`!document.querySelector('[data-term-guide], .topic-acronyms') && document.querySelector('[data-topic="navigation-pnt"]').textContent.replace(/\\d+$/,'')==='定位、导航与授时' && document.documentElement.scrollWidth<=innerWidth`));
    });
    await test('出版商筛选、来源详情、分享刷新、清除与手机布局',async()=>{
      await open('#journals?publisher=elsevier');
      assert((await rowIds()).includes('computer-networks'));
      assert(await evaluate(`Array.from(document.querySelectorAll('#results .publisher-tags')).every(el=>el.textContent.includes('Elsevier'))`));
      assert(await evaluate(`document.querySelector('.publisher-tags').textContent.includes('Elsevier')`));
      await command('Page.reload');await wait(`document.querySelector('#results [data-venue-card="computer-networks"]')`);
      await click('[data-detail="venue:computer-networks"]');
      assert(await evaluate(`document.querySelector('dialog[open]').textContent.includes('核验于 2026-10-23')`));
      await evaluate(`document.querySelector('dialog[open]').close()`);
      if(await evaluate(`document.querySelector('#attribute-panel').classList.contains('attributes-folded')`))await click('[data-attribute-expand]');
      await setValue('#publisher-filter','ieee');
      assert((await rowIds()).includes('twc'));
      assert(await evaluate(`Array.from(document.querySelectorAll('#results .publisher-tags')).every(el=>el.textContent.includes('IEEE'))`));
      assert(await evaluate(`location.hash.includes('publisher=ieee') && document.documentElement.scrollWidth<=innerWidth`));
      await click('[data-clear="publisher"]');assert((await count())>1);
      await setValue('#publisher-filter','unknown');
      assert(!(await rowIds()).includes('twc'));
      await click('[data-reset="all"]');assert(await evaluate(`!location.hash.includes('publisher=')`));
      await open('#journals?q='+encodeURIComponent('爱斯维尔'));assert((await rowIds()).includes('computer-networks'));
      await open('#journals?publisher=ieee');await click('#mobile-menu');await click('[data-view="conferences"]');
      assert(await evaluate(`!location.hash.includes('publisher=')`));
    });
    assert.deepEqual(errors,[],'浏览器不应有未处理异常');
    console.log(JSON.stringify({passed:results.length,browserErrors:errors.length,tests:results},null,2));
  }finally{
    if(socket)socket.close();for(const entry of pending.values())entry.reject(Error('Browser closing'));
    if(chrome){chrome.kill();await Promise.race([once(chrome,'exit'),pause(2000)]);}
    await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
