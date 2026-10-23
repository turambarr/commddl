const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'services/admin/public/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'services/admin/public/admin.js'),'utf8');

test('admin review UI loads its maintained application script and exposes object search/filters',()=>{
 assert.match(html,/<script src="\/admin\.js" defer><\/script>/);
 for(const selector of ['data-object-filter','data-kind-filter','data-state-filter','function renderObjectGroups'])assert.ok(app.includes(selector),`missing ${selector}`);
});

test('admin review details are object-scoped and persist each object draft on navigation',()=>{
 assert.match(app,/items\.find\(entry=>entry\.entity\?\.id===selected\)/);
 assert.match(app,/data-save-object/);
 assert.match(app,/draft-decisions/);
 assert.match(app,/if\(active\)await saveObjectDraft\(id,active\.dataset\.entity,container\);await showBatch\(id,b\.dataset\.object\)/);
 assert.doesNotMatch(app,/renderStructuredCandidate\(item/);
});

test('editing remains collapsed until requested and final approval is SHA/diff bound',()=>{
 assert.match(app,/<div class="editor hidden">/);
 assert.match(app,/批准并发布这些更新/);
 assert.match(app,/reviewedDiffDigest: b\.dataset\.diffDigest|reviewedDiffDigest:b\.dataset\.diffDigest/);
 assert.match(app,/finalSha: b\.dataset\.sha|finalSha:b\.dataset\.sha/);
});

test('partial review can be submitted and unselected candidates default to rejection',()=>{
 assert.match(app,/未明确接受的候选默认拒绝/);
 assert.match(app,/提交取舍并自动生成数据 PR/);
 assert.doesNotMatch(app,/data-prepare="\$\{escapeHTML\(id\)\}" \$\{doneCount!==allCount\?['"]disabled/);
});
