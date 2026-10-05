// Inventory strings in the embedded JavaScript. The scheduled classifier retains the
// historical 200-character candidate set; explicit broad discovery also admits short prose
// and records every exclusion before any external classification is considered.
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as walk from "acorn-walk";
import { parse, source, VERSION, BINARY_SHA256 } from "./lib.mjs";

const root = new URL("../work/", import.meta.url).pathname;
const keyOf = node => node?.key?.name ?? (typeof node?.key?.value === 'string' ? node.key.value : null);

export function candidatesOf(src, file, { broad = false } = {}) {
  const ast=parse(src), out=[],stats={literals:0,selected:0,skipped:{}};
  const skip=reason=>stats.skipped[reason]=(stats.skipped[reason]??0)+1;
  const take=(node,text,parent)=>{
    stats.literals++;
    if(typeof text!=='string') {skip('undecodable');return;}
    const words=text.match(/[A-Za-z][A-Za-z'’-]*/g)??[];
    const legacyWords=text.split(/\s+/).filter(Boolean).length;
    if(broad ? text.length<24 || words.length<3 || !/\s/.test(text) : text.length<200 || legacyWords<30 || !/[a-z]{3,} [a-z]{3,} [a-z]{3,}/.test(text)) {skip('non-prose-or-short');return;}
    const role=parent?.type==='Property'&&parent.value===node ? {kind:keyOf(parent)??'literal'} : {kind:'literal'};
    out.push({file,start:node.start,end:node.end,byte_start:Buffer.byteLength(src.slice(0,node.start)),words:broad?words.length:legacyWords,text,
      ...(broad?{role,source_context:`${src.slice(Math.max(0,node.start-300),node.start)}<candidate literal>${src.slice(node.end,node.end+300)}`}:{})});
  };
  walk.fullAncestor(ast,(node,_state,ancestors)=>{
    const parent=ancestors.at(-2);
    if(node.type==='Literal'&&typeof node.value==='string') take(node,node.value,parent);
    if(node.type==='TemplateLiteral') take(node,node.quasis.map((q,i)=>`${q.value.cooked??q.value.raw}${i<node.expressions.length?`\${${src.slice(node.expressions[i].start,node.expressions[i].end).slice(0,broad?undefined:60)}}`:''}`).join(''),parent);
  });
  stats.selected=out.length;
  return {candidates:out,stats};
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const prepare=process.env.CC_DISCOVERY_PREPARE==='1';
  const broad=prepare||process.env.JEV_BROAD_EXPORT==='1';
  const out=[],stats={scripts:0,parse_failed:0,parse_failed_files:[],literals:0,selected:0,skipped:{}};
  for(const file of readdirSync(`${root}extracted`).filter(f=>/\.(js|mjs)$/.test(f)||f==='cli')) {
    stats.scripts++;
    try {
      const found=candidatesOf(source(file),file,{broad});
      out.push(...found.candidates);
      stats.literals+=found.stats.literals;
      stats.selected+=found.stats.selected;
      for(const [reason,n] of Object.entries(found.stats.skipped)) stats.skipped[reason]=(stats.skipped[reason]??0)+n;
    } catch {stats.parse_failed++;stats.parse_failed_files.push(file);}
  }
  const file=`${root}${prepare?'candidates-broad-prepared.json':'candidates.json'}`;
  writeFileSync(file,JSON.stringify(out));
  writeFileSync(`${root}${prepare?'candidates-broad-prepared.stats.json':'candidates.stats.json'}`,JSON.stringify({source:{mode:broad?'broad':'legacy',version:VERSION,binary_sha256:BINARY_SHA256},stats},null,1)+'\n');
  console.log(JSON.stringify(stats));
}
