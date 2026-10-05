const modelRoles=new Set(['tool','parameter','instructions','context','user_template']);

export function broadVerdict(record,{allowUnanswered=false}={}) {
  if(record?.status==='withheld'||record?.status==='oversized'||allowUnanswered&&record?.status==='unanswered') return {audience:'unresolved',confidence:null,role:null,model_facing:null,evidence:null,status:record.status};
  if(record?.status!=='classified') throw new Error('Claude Code discovery has an unresolved provider judgment');
  const role=record.role?.choice??'unknown',p=record.model_facing?.noul;
  if(typeof p!=='number'||p<0||p>1) throw new Error('Claude Code discovery has no valid model-facing probability');
  const audience=modelRoles.has(role)&&p>=.5?'model':role==='human'?'human_user':role==='documentation'?'developer_docs':'other';
  return {audience,confidence:audience==='model'?p:record.role?.confidence??1-p,role,model_facing:p,evidence:record.evidence,status:'classified'};
}
