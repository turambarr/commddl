const {sourcePath}=require('../catalog.cjs');

function assertCandidateIdentity(candidate,entities){
 const id=candidate?.id,entity=entities.get(id);if(!entity)throw new Error(`未知维护实体：${id}`);
 if(candidate.kind&&candidate.kind!==entity.kind)throw new Error(`${id}: 候选载体类型与目录不符。`);
 const isCall=Object.hasOwn(entity,'venueId');
 if(candidate.recordType&&candidate.recordType!==(isCall?'call':'venue'))throw new Error(`${id}: 候选实体类别与目录不符。`);
 if(isCall&&candidate.venueId!==entity.venueId)throw new Error(`${id}: 候选所属载体与正式目录不符。`);
 if(!isCall&&candidate.venueId)throw new Error(`${id}: 载体候选不能声明征稿父载体。`);
 if(candidate.year&&Number(candidate.year)!==Number(entity.year))throw new Error(`${id}: 候选届次与正式目录不符。`);
 const expectedFile=sourcePath(entity);if(candidate.sourceFile&&candidate.sourceFile!==expectedFile)throw new Error(`${id}: 候选声明的数据文件与稳定实体 ID 不匹配。`);
 return entity;
}

module.exports={assertCandidateIdentity};
