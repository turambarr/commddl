const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
test('offline build preserves UTF-8 text and embeds complete executable scripts literally',()=>{
 const root=path.resolve(__dirname,'..');
 execFileSync(process.execPath,['scripts/build.cjs'],{cwd:root});
 const html=new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(path.join(root,'release/CommDDL.html')));
 assert.match(html,/<meta charset="utf-8">/);
 assert.match(html,/通信科研投稿日历/);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.equal(scripts.length,3);
 for(const [i,name] of ['data','core','app'].entries()){
  const source=fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8').replace(/<\/script/gi,'<\\/script');
  assert.equal(scripts[i].trim(),source.trim(),name+' must survive replacement without dollar expansion');
  assert.doesNotThrow(()=>new vm.Script(scripts[i]),name+' must parse');
 }
 assert(!/<script src="assets\//.test(html));
});
