const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {verify}=require('../scripts/updates/verify-data-pr-paths.cjs');

function repository(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'commddl-data-boundary-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'ignore'});
 git('init','-q');git('config','user.email','test@example.org');git('config','user.name','Test');
 fs.mkdirSync(path.join(root,'data/calls/2027'),{recursive:true});fs.mkdirSync(path.join(root,'services/admin'),{recursive:true});
 fs.writeFileSync(path.join(root,'data/calls/2027/call.yml'),'id: call\n');fs.writeFileSync(path.join(root,'services/admin/wrangler.toml'),'name = "worker"\n');
 git('add','.');git('commit','-qm','baseline');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,git};
}

test('data PR path boundary permits only modified existing venue/call YAML records',t=>{
 const {root}=repository(t);fs.writeFileSync(path.join(root,'data/calls/2027/call.yml'),'id: call\nsummary: updated\n');assert.deepEqual(verify(root),['data/calls/2027/call.yml']);
});

test('data PR path boundary rejects source, config, and workflow paths',t=>{
 const {root}=repository(t);fs.writeFileSync(path.join(root,'services/admin/wrangler.toml'),'name = "changed"\n');assert.throws(()=>verify(root),/白名单外/);
});

test('data PR path boundary rejects added or deleted YAML and renames',t=>{
 const {root}=repository(t);fs.unlinkSync(path.join(root,'data/calls/2027/call.yml'));assert.throws(()=>verify(root),/白名单外/);
});

test('data PR path boundary rejects symlinks',t=>{
 const {root}=repository(t);fs.unlinkSync(path.join(root,'data/calls/2027/call.yml'));fs.symlinkSync('call-copy.yml',path.join(root,'data/calls/2027/call.yml'));assert.throws(()=>verify(root),/白名单外|普通 YAML/);
});

test('data PR path boundary rejects untracked files',t=>{
 const {root}=repository(t);fs.writeFileSync(path.join(root,'data/calls/2027/extra.yml'),'id: extra\n');assert.throws(()=>verify(root),/未跟踪文件/);
});
