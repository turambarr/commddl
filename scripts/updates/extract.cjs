const crypto = require('node:crypto');
const cheerio = require('cheerio');

const LABELS = new Map([
  ['general information','general-information'],['about','about'],['about the journal','about'],['about the conference','about'],
  ['aims and scope','aims-and-scope'],['aims & scope','aims-and-scope'],['scope','aims-and-scope'],['related topics','related-topics'],
  ['topics of interest','topics-of-interest'],['areas of interest','topics-of-interest'],['call for papers','call-for-papers'],['important dates','important-dates'],
  ['submission guidelines','submission-guidelines'],['submission','submission-guidelines'],['paper categories','paper-categories'],['publication','publication'],
  ['投稿指南','submission-guidelines'],['征稿范围','aims-and-scope'],['征稿主题','topics-of-interest'],['相关主题','related-topics'],['投稿须知','submission-guidelines'],['重要日期','important-dates']
]);
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u00a0\s]+/g,' ').trim();
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const slug=s=>norm(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,72)||'section';
const textOf=($,el)=>norm($(el).text());
const headingLevel=el=>/^h[1-6]$/.test(el.tagName||'')?Number(el.tagName.slice(1)):el.attribs?.role==='heading'?Number(el.attribs['aria-level']||2):0;

function sectionCategory(heading){return LABELS.get(norm(heading).replace(/[：:]$/,'').toLowerCase())||LABELS.get(norm(heading).replace(/[：:]$/,''))||'other';}
function cleanHTML(html){
  const $=cheerio.load(html);
  $('header').each((_,el)=>{if($(el).find('nav,[role="navigation"]').length||/(^|\s)(site-header|masthead|global-header)(\s|$)/i.test($(el).attr('class')||''))$(el).remove();});
  $('script,style,template,noscript,nav,footer,form,iframe,svg,canvas,[role="navigation"],[role="banner"],[role="contentinfo"],[aria-hidden="true"],.breadcrumb,.breadcrumbs,.cookie,.cookie-banner,.advertisement,.ad,.sponsor').remove();
  const roots=$('main,[role="main"],article,#content,#main,.main-content,.article-content,.page-content');
  let root=roots.filter((_,el)=>$(el).find('h1,h2,h3,h4,h5,h6,[role="heading"]').length>0).first();
  if(!root.length)root=$('body');
  return {$,root};
}
function sectionBlocks($,heading,nextBoundary,ordered,sourceUrl){
  const blocks=[];let started=false;const seenLinks=new Set();
  const nestedItems=list=>$(list).children('li').toArray().map(li=>{const label=$(li).clone();label.children('ul,ol').remove();return {text:norm(label.text()),items:$(li).children('ul,ol').toArray().flatMap(nestedItems)};}).filter(item=>item.text);
  for(const el of ordered){
    if(el===heading){started=true;continue;}
    if(!started)continue;
    if(nextBoundary&&el===nextBoundary)break;
    const tag=(el.tagName||'').toLowerCase();
    if(['p','blockquote','dd'].includes(tag)&&!$(el).parents('li,td,th').length){const text=textOf($,el);if(text)blocks.push({type:'paragraph',text});}
    if(tag==='ul'||tag==='ol'){
      if($(el).parents('ul,ol').length)continue;
      const items=nestedItems(el);
      if(items.length)blocks.push({type:'list',ordered:tag==='ol',items});
    }
    if(tag==='table'&&!$(el).parents('table').length){
      const rows=$(el).find('tr').toArray().map(tr=>$(tr).children('th,td').toArray().map(cell=>textOf($,cell))).filter(row=>row.some(Boolean));
      if(rows.length)blocks.push({type:'table',rows});
    }
    if(tag==='a'){const label=textOf($,el),href=$(el).attr('href');if(label&&href){try{const absolute=new URL(href,sourceUrl).href,key=`${label}\n${absolute}`;if(!seenLinks.has(key)){seenLinks.add(key);blocks.push({type:'links',items:[{label,href:absolute}]});}}catch{}}}
  }
  return blocks;
}
function extractDocument(html,sourceUrl){
  const {$,root}=cleanHTML(html);
  const elements=root.find('*').toArray();
  const headings=elements.filter(el=>headingLevel(el)>0&&textOf($,el));
  const stack=[],occurrences=new Map(),sections=[];
  for(let i=0;i<headings.length;i++){
    const el=headings[i],level=headingLevel(el),heading=textOf($,el);
    while(stack.length&&stack.at(-1).headingLevel>=level)stack.pop();
    const key=`${level}:${stack.at(-1)?.sectionId||'root'}`;
    const ordinal=(occurrences.get(key)||0)+1;occurrences.set(key,ordinal);
    // A heading starts a distinct section even when nested. Keeping the parent
    // block bounded here prevents every parent from copying all child text.
    const next=headings[i+1]||null;
    const blocks=sectionBlocks($,el,next,elements,sourceUrl);
    if(!blocks.length)continue;
    const url=new URL(sourceUrl),anchor=el.attribs?.id||`h${level}-section-${ordinal}`;
    const stable=`${url.origin}${url.pathname}#${anchor}:${level}:${ordinal}`;
    const section={sectionId:hash(stable).slice(0,20),parentId:stack.at(-1)?.sectionId||null,heading,headingLevel:level,order:sections.length,category:sectionCategory(heading),sourceUrl:url.href,sourceAnchor:anchor,blocks};
    sections.push(section);stack.push(section);
  }
  const contentHash=hash(JSON.stringify(sections));
  return {sections,headings:headings.map(el=>({heading:textOf($,el),level:headingLevel(el)})),contentHash};
}

module.exports={extractDocument,sectionCategory,cleanHTML};
